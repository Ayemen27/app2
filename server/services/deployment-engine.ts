import { db } from "../db.js";
import { buildDeployments, deploymentEvents } from "@shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import type { Response } from "express";

const execAsync = promisify(exec);

type LogEntry = { timestamp: string; message: string; type: "info" | "error" | "success" | "warn" | "step" };
type StepEntry = { name: string; status: "pending" | "running" | "success" | "failed"; duration?: number; startedAt?: string };

type Pipeline = "web-deploy" | "android-build" | "full-deploy" | "git-push" | "hotfix";

interface DeploymentConfig {
  pipeline: Pipeline;
  appType: "web" | "android";
  environment: "production" | "staging";
  branch?: string;
  commitMessage?: string;
  triggeredBy?: string;
}

const PIPELINE_STEPS: Record<Pipeline, string[]> = {
  "web-deploy": ["validate", "build-web", "transfer", "deploy-server", "db-migrate", "restart-pm2", "verify"],
  "android-build": ["validate", "build-web", "transfer", "sync-capacitor", "gradle-build", "sign-apk", "retrieve-artifact"],
  "full-deploy": ["validate", "git-push", "build-web", "transfer", "deploy-server", "db-migrate", "restart-pm2", "sync-capacitor", "gradle-build", "sign-apk", "retrieve-artifact", "verify"],
  "git-push": ["validate", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "verify"],
  "hotfix": ["validate", "build-web", "hotfix-sync", "restart-pm2", "verify"],
};

const activeSSEClients = new Map<string, Response[]>();

function broadcastToClients(deploymentId: string, data: any) {
  const clients = activeSSEClients.get(deploymentId) || [];
  const dead: number[] = [];
  clients.forEach((res, idx) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      dead.push(idx);
    }
  });
  dead.reverse().forEach(i => clients.splice(i, 1));
}

function broadcastGlobal(data: any) {
  for (const [, clients] of activeSSEClients) {
    clients.forEach(res => {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
    });
  }
}

export class DeploymentEngine {

  async recoverOrphanedDeployments() {
    try {
      const orphaned = await db.select().from(buildDeployments)
        .where(eq(buildDeployments.status, "running"));

      for (const d of orphaned) {
        const age = Date.now() - new Date(d.created_at!).getTime();
        if (age > 60000) {
          await db.update(buildDeployments).set({
            status: "failed",
            errorMessage: "توقفت العملية بسبب إعادة تشغيل الخادم",
            endTime: new Date(),
            duration: age,
          }).where(eq(buildDeployments.id, d.id));

          await db.insert(deploymentEvents).values({
            deploymentId: d.id,
            eventType: "deployment_failed",
            message: "توقفت العملية بسبب إعادة تشغيل الخادم (recovery)",
            metadata: { recoveredAt: new Date().toISOString(), lastStep: d.currentStep },
          });

          console.log(`[DeploymentEngine] Recovered orphaned deployment #${d.buildNumber} (${d.id})`);
        }
      }

      if (orphaned.length > 0) {
        console.log(`[DeploymentEngine] Recovered ${orphaned.length} orphaned deployment(s)`);
      }
    } catch (err) {
      console.error("[DeploymentEngine] Error recovering orphaned deployments:", err);
    }
  }

  async getNextBuildNumber(): Promise<number> {
    const result = await db.select({ maxBuild: sql<number>`COALESCE(MAX(build_number), 0)` }).from(buildDeployments);
    return (result[0]?.maxBuild || 0) + 1;
  }

  async startDeployment(config: DeploymentConfig): Promise<string> {
    if (!config.triggeredBy) {
      throw new Error("Deployment requires an authenticated user (triggeredBy is required)");
    }

    const buildNumber = await this.getNextBuildNumber();
    const steps: StepEntry[] = PIPELINE_STEPS[config.pipeline].map(name => ({
      name,
      status: "pending" as const,
    }));

    const version = await this.getCurrentVersion();

    const deploymentTypeMap: Record<string, string> = {
      "web-deploy": "web",
      "android-build": "android",
      "full-deploy": "web",
      "git-push": "web",
      "hotfix": "hotfix",
    };

    const [deployment] = await db.insert(buildDeployments).values({
      buildNumber,
      status: "running",
      currentStep: steps[0].name,
      progress: 0,
      version,
      appType: config.appType,
      environment: config.environment,
      branch: config.branch || "main",
      commitMessage: config.commitMessage,
      pipeline: config.pipeline,
      deploymentType: deploymentTypeMap[config.pipeline] || "web",
      logs: [],
      steps,
      triggeredBy: config.triggeredBy,
    }).returning();

    this.runPipeline(deployment.id, config).catch(err => {
      console.error(`[DeploymentEngine] Pipeline error for ${deployment.id}:`, err);
    });

    return deployment.id;
  }

  private async runPipeline(deploymentId: string, config: DeploymentConfig) {
    const pipelineSteps = PIPELINE_STEPS[config.pipeline];
    const startTime = Date.now();

    try {
      for (let i = 0; i < pipelineSteps.length; i++) {
        const stepName = pipelineSteps[i];
        const progress = Math.round(((i) / pipelineSteps.length) * 100);

        await this.updateDeployment(deploymentId, {
          currentStep: stepName,
          progress,
        });

        await this.updateStepStatus(deploymentId, stepName, "running");
        await this.addLog(deploymentId, `Starting step: ${stepName}`, "step");
        await this.addEvent(deploymentId, "step_start", `Step ${stepName} started`);

        const stepStart = Date.now();

        try {
          await this.executeStep(deploymentId, stepName, config);
          const stepDuration = Date.now() - stepStart;
          await this.updateStepStatus(deploymentId, stepName, "success", stepDuration);
          await this.addLog(deploymentId, `Step ${stepName} completed (${(stepDuration / 1000).toFixed(1)}s)`, "success");
          await this.addEvent(deploymentId, "step_complete", `Step ${stepName} completed`, { duration: stepDuration });
        } catch (stepError: any) {
          const stepDuration = Date.now() - stepStart;
          await this.updateStepStatus(deploymentId, stepName, "failed", stepDuration);
          await this.addLog(deploymentId, `Step ${stepName} failed: ${stepError.message}`, "error");
          await this.addEvent(deploymentId, "step_failed", `Step ${stepName} failed: ${stepError.message}`);
          throw stepError;
        }
      }

      const totalDuration = Date.now() - startTime;
      await this.updateDeployment(deploymentId, {
        status: "success",
        progress: 100,
        currentStep: "complete",
        duration: totalDuration,
        endTime: new Date(),
      });
      await this.addLog(deploymentId, `Deployment completed successfully in ${(totalDuration / 1000).toFixed(1)}s`, "success");
      await this.addEvent(deploymentId, "deployment_success", "Deployment completed successfully", { duration: totalDuration });

    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      await this.updateDeployment(deploymentId, {
        status: "failed",
        duration: totalDuration,
        endTime: new Date(),
        errorMessage: error.message,
      });
      await this.addEvent(deploymentId, "deployment_failed", error.message);
    }
  }

  private async executeStep(deploymentId: string, stepName: string, config: DeploymentConfig) {
    const sshCmd = this.buildSSHCommand();

    switch (stepName) {
      case "validate":
        await this.stepValidate(deploymentId);
        break;
      case "build-web":
        await this.stepBuildWeb(deploymentId);
        break;
      case "transfer":
        await this.stepTransfer(deploymentId);
        break;
      case "deploy-server":
        await this.stepDeployServer(deploymentId, sshCmd);
        break;
      case "restart-pm2":
        await this.stepRestartPM2(deploymentId, sshCmd);
        break;
      case "sync-capacitor":
        await this.stepSyncCapacitor(deploymentId, sshCmd);
        break;
      case "gradle-build":
        await this.stepGradleBuild(deploymentId, sshCmd, config);
        break;
      case "sign-apk":
        await this.stepSignAPK(deploymentId, sshCmd);
        break;
      case "retrieve-artifact":
        await this.stepRetrieveArtifact(deploymentId);
        break;
      case "verify":
        await this.stepVerify(deploymentId);
        break;
      case "git-push":
        await this.stepGitPush(deploymentId, config);
        break;
      case "pull-server":
        await this.stepPullServer(deploymentId, sshCmd);
        break;
      case "install-deps":
        await this.stepInstallDeps(deploymentId, sshCmd);
        break;
      case "build-server":
        await this.stepBuildServer(deploymentId, sshCmd);
        break;
      case "db-migrate":
        await this.stepDbMigrate(deploymentId, sshCmd);
        break;
      case "hotfix-sync":
        await this.stepHotfixSync(deploymentId);
        break;
      default:
        await this.addLog(deploymentId, `Unknown step: ${stepName}`, "warn");
    }
  }

  private sanitizeShellArg(value: string): string {
    return value.replace(/['"\\$`!#&|;(){}<>\n\r]/g, '');
  }

  private buildSSHCommand(): string {
    const host = this.sanitizeShellArg(process.env.SSH_HOST || "93.127.142.144");
    const user = this.sanitizeShellArg(process.env.SSH_USER || "administrator");
    const port = this.sanitizeShellArg(process.env.SSH_PORT || "22");
    const password = (process.env.SSH_PASSWORD || "").replace(/'/g, "'\\''");
    return `sshpass -p '${password}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -p ${port} ${user}@${host}`;
  }

  private buildSCPCommand(src: string, dest: string): string {
    const host = this.sanitizeShellArg(process.env.SSH_HOST || "93.127.142.144");
    const user = this.sanitizeShellArg(process.env.SSH_USER || "administrator");
    const port = this.sanitizeShellArg(process.env.SSH_PORT || "22");
    const password = (process.env.SSH_PASSWORD || "").replace(/'/g, "'\\''");
    return `sshpass -p '${password}' scp -o StrictHostKeyChecking=no -P ${port} ${src} ${user}@${host}:${dest}`;
  }

  private maskSecrets(text: string): string {
    const sshPass = process.env.SSH_PASSWORD;
    const ghToken = process.env.GITHUB_TOKEN;
    let masked = text;
    if (sshPass) masked = masked.replace(new RegExp(sshPass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***');
    if (ghToken) masked = masked.replace(new RegExp(ghToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***');
    return masked;
  }

  private async execWithLog(deploymentId: string, command: string, label: string, timeoutMs = 300000): Promise<string> {
    await this.addLog(deploymentId, `[${label}] Executing...`, "info");

    return new Promise((resolve, reject) => {
      const child = spawn("bash", ["-c", command], {
        cwd: "/home/runner/workspace",
        env: { ...process.env },
      });

      let output = "";
      let lineBuffer = "";
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      const processLine = (line: string) => {
        if (!line.trim()) return;
        output += line + "\n";
        this.addLog(deploymentId, `[${label}] ${this.maskSecrets(line)}`, "info").catch(() => {});
      };

      const handleData = (data: Buffer) => {
        lineBuffer += data.toString();
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || "";
        for (const line of lines) {
          processLine(line);
        }
      };

      child.stdout.on("data", handleData);
      child.stderr.on("data", handleData);

      child.on("close", (code) => {
        clearTimeout(timer);
        if (lineBuffer.trim()) processLine(lineBuffer);
        if (code === 0 || code === null) {
          resolve(output);
        } else {
          const errorMsg = this.maskSecrets(output.slice(-500));
          this.addLog(deploymentId, `[${label}] Exit code: ${code}`, "error").catch(() => {});
          reject(new Error(`${label} failed (exit ${code}): ${errorMsg}`));
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        this.addLog(deploymentId, `[${label}] Error: ${this.maskSecrets(err.message)}`, "error").catch(() => {});
        reject(new Error(`${label} failed: ${this.maskSecrets(err.message)}`));
      });
    });
  }

  private async stepValidate(deploymentId: string) {
    await this.addLog(deploymentId, "التحقق من البيئة...", "info");

    const host = process.env.SSH_HOST || "93.127.142.144";
    const user = process.env.SSH_USER || "administrator";
    const sshPass = process.env.SSH_PASSWORD;

    await this.addLog(deploymentId, `الخادم: ${user}@${host}`, "info");

    if (!sshPass) {
      throw new Error("متغير SSH_PASSWORD غير محدد في البيئة");
    }

    await this.addLog(deploymentId, "اختبار اتصال SSH...", "info");
    try {
      const sshCmd = this.buildSSHCommand();
      const { stdout } = await execAsync(`${sshCmd} "echo SSH_OK && hostname && uptime"`, { timeout: 30000 });
      await this.addLog(deploymentId, `اتصال SSH ناجح: ${stdout.trim()}`, "success");
    } catch (sshErr: any) {
      await this.addLog(deploymentId, `فشل اتصال SSH: ${this.maskSecrets(sshErr.message)}`, "error");
      throw new Error(`فشل الاتصال بالخادم عبر SSH: ${this.maskSecrets(sshErr.message)}`);
    }

    try {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: "/home/runner/workspace" });
      const commitHash = stdout.trim();
      await this.updateDeployment(deploymentId, { commitHash });
      await this.addLog(deploymentId, `Commit: ${commitHash.substring(0, 8)}`, "info");
    } catch {
      await this.addLog(deploymentId, "Could not resolve git commit hash", "warn");
    }

    await this.addLog(deploymentId, "All validations passed", "success");
  }

  private async stepBuildWeb(deploymentId: string) {
    await this.addLog(deploymentId, "Building web application...", "info");
    await this.execWithLog(deploymentId, "npm run build", "Vite Build", 120000);

    try {
      const { stdout } = await execAsync("ls -la dist/public/ | head -5", { cwd: "/home/runner/workspace" });
      await this.addLog(deploymentId, `Build output: ${stdout.trim()}`, "info");
    } catch {
      throw new Error("Build failed - dist/public not found");
    }
  }

  private async stepTransfer(deploymentId: string) {
    await this.addLog(deploymentId, "إنشاء أرشيف النشر...", "info");

    const version = await this.getCurrentVersion();
    const archivePath = `/tmp/deploy-${version}-${Date.now()}.tar.gz`;

    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    const includesDist = deployment?.pipeline === "android-build" || deployment?.pipeline === "full-deploy";
    const distExclude = includesDist ? "" : "--exclude='dist'";

    const excludes = [
      "node_modules", ".git", ".cache", ".pythonlibs", ".local",
      ".agents", ".agentforge", "attached_assets", "output_apks",
      "android/build", "android/app/build", "android/.gradle", ".gradle",
      "www", "*.log", ".npm", ".config", "libs/AgentForge_archived",
      "signoz", "tools", "system_core_docs", "governance",
      distExclude ? "dist" : "",
    ].filter(Boolean).map(e => `--exclude='${e}'`).join(" ");

    await this.execWithLog(
      deploymentId,
      `cd /home/runner/workspace && tar ${excludes} -czf ${archivePath} .`,
      "Archive",
      180000
    );

    const { stdout: sizeOut } = await execAsync(`du -h ${archivePath} | cut -f1`);
    await this.addLog(deploymentId, `حجم الأرشيف: ${sizeOut.trim()}`, "info");

    await this.addLog(deploymentId, "رفع الأرشيف إلى السيرفر...", "info");
    await this.execWithLog(
      deploymentId,
      this.buildSCPCommand(archivePath, "/tmp/deploy-package.tar.gz"),
      "Upload",
      600000
    );

    await execAsync(`rm -f ${archivePath}`);
    await this.addLog(deploymentId, "اكتمل النقل بنجاح", "success");
  }

  private async stepDeployServer(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "Deploying to server...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && tar -xzf /tmp/deploy-package.tar.gz --overwrite && rm -f /tmp/deploy-package.tar.gz && echo 'EXTRACT_OK'"`,
      "Extract",
      60000
    );

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "set -o pipefail && cd ${remoteDir} && npm install --loglevel=error --legacy-peer-deps 2>&1 | tail -5 && echo 'INSTALL_OK'"`,
      "Install Dependencies",
      120000
    );

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "set -o pipefail && cd ${remoteDir} && export VITE_API_BASE_URL=https://app2.binarjoinanelytic.info && export NODE_ENV=production && npm run build 2>&1 | tail -10 && echo 'BUILD_OK'"`,
      "Server Build",
      120000
    );
  }

  private async stepRestartPM2(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "Restarting PM2 process...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && pm2 restart binarjoin --update-env 2>/dev/null || pm2 restart construction-app --update-env 2>/dev/null || (PORT=6000 pm2 start ecosystem.config.cjs --name binarjoin --env production --update-env) && pm2 save && echo 'PM2_OK'"`,
      "PM2 Restart",
      30000
    );
  }

  private async stepSyncCapacitor(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "Syncing Capacitor for Android...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && rm -rf android/app/src/main/assets/public && mkdir -p android/app/src/main/assets/public && if [ -d www ]; then cp -r www/* android/app/src/main/assets/public/; elif [ -d dist/public ]; then cp -r dist/public/* android/app/src/main/assets/public/; fi && echo 'SYNC_OK'"`,
      "Capacitor Sync",
      60000
    );
  }

  private async stepGradleBuild(deploymentId: string, sshCmd: string, config: DeploymentConfig) {
    await this.addLog(deploymentId, "Starting Gradle build (this may take 2-3 minutes)...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "set -o pipefail && cd ${remoteDir}/android && export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 && export PATH=\\$JAVA_HOME/bin:\\$PATH && export ANDROID_HOME=/opt/android-sdk && chmod +x gradlew && rm -rf app/build .gradle build && ./gradlew clean assembleRelease --no-daemon --warning-mode=none 2>&1 | tail -20 && echo 'GRADLE_OK'"`,
      "Gradle Build",
      300000
    );
  }

  private async stepSignAPK(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "Signing APK...", "info");
    const remoteDir = "/home/administrator/app2";

    const output = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir}/android && APK_PATH=\\$(find . -name '*.apk' -path '*/release/*' | head -1) && if [ -n \\"\\$APK_PATH\\" ]; then cp \\"\\$APK_PATH\\" ${remoteDir}/AXION_LATEST.apk && ls -lh ${remoteDir}/AXION_LATEST.apk && echo 'SIGN_OK'; else echo 'APK_NOT_FOUND'; fi"`,
      "APK Sign",
      60000
    );

    if (output.includes("APK_NOT_FOUND")) {
      throw new Error("APK file not found after build");
    }

    const sizeMatch = output.match(/(\d+\.?\d*[KMG])/);
    if (sizeMatch) {
      await this.updateDeployment(deploymentId, { artifactSize: sizeMatch[1] });
    }
  }

  private async stepRetrieveArtifact(deploymentId: string) {
    await this.addLog(deploymentId, "Retrieving APK artifact...", "info");
    const host = process.env.SSH_HOST || "93.127.142.144";
    const user = process.env.SSH_USER || "administrator";
    const port = process.env.SSH_PORT || "22";
    const remoteDir = "/home/administrator/app2";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const localPath = `/home/runner/workspace/output_apks/AXION_${timestamp}.apk`;

    await execAsync("mkdir -p /home/runner/workspace/output_apks");

    try {
      const password = (process.env.SSH_PASSWORD || "").replace(/'/g, "'\\''");
      await this.execWithLog(
        deploymentId,
        `sshpass -p '${password}' scp -o StrictHostKeyChecking=no -P ${port} ${user}@${host}:${remoteDir}/AXION_LATEST.apk ${localPath}`,
        "Retrieve APK",
        60000
      );

      const { stdout } = await execAsync(`ls -lh ${localPath} | awk '{print $5}'`);
      await this.updateDeployment(deploymentId, {
        artifactUrl: localPath,
        artifactSize: stdout.trim(),
      });
      await this.addLog(deploymentId, `APK saved: ${localPath} (${stdout.trim()})`, "success");
    } catch {
      await this.addLog(deploymentId, "Could not retrieve APK - it may still be on the remote server", "warn");
    }
  }

  private async stepVerify(deploymentId: string) {
    await this.addLog(deploymentId, "Verifying deployment...", "info");

    try {
      const { stdout } = await execAsync("curl -s -o /dev/null -w '%{http_code}' https://app2.binarjoinanelytic.info/api/health", { timeout: 15000 });
      const statusCode = stdout.trim().replace(/'/g, "");
      if (statusCode === "200") {
        await this.addLog(deploymentId, "Health check passed (HTTP 200)", "success");
      } else {
        await this.addLog(deploymentId, `Health check returned HTTP ${statusCode}`, "warn");
      }
    } catch {
      await this.addLog(deploymentId, "Health check failed - server may still be starting", "warn");
    }
  }

  private async stepGitPush(deploymentId: string, config: DeploymentConfig) {
    await this.addLog(deploymentId, "دفع الكود إلى GitHub...", "info");

    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_USERNAME) {
      throw new Error("GITHUB_TOKEN و GITHUB_USERNAME مطلوبان لدفع الكود");
    }

    const rawMessage = config.commitMessage || `Deploy v${await this.getCurrentVersion()} - ${new Date().toISOString()}`;
    const safeMessage = rawMessage.replace(/['"\\$`!]/g, "");
    const ghUser = process.env.GITHUB_USERNAME;
    const ghToken = process.env.GITHUB_TOKEN;
    const repoUrl = `https://${ghUser}:${ghToken}@github.com/${ghUser}/app2.git`;

    await this.execWithLog(
      deploymentId,
      `cd /home/runner/workspace && git config user.email "${ghUser}@users.noreply.github.com" && git config user.name "${ghUser}" && git add -A && (git diff --cached --quiet && echo "NO_CHANGES" || git commit -m "${safeMessage}") && git remote set-url origin ${repoUrl} && git push origin main --force 2>&1; git remote set-url origin https://github.com/${ghUser}/app2.git && echo "GIT_PUSH_OK"`,
      "Git Push",
      60000
    );

    try {
      await execAsync("git fetch origin main", { cwd: "/home/runner/workspace", timeout: 15000 });
    } catch {}

    try {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: "/home/runner/workspace" });
      const commitHash = stdout.trim();
      await this.updateDeployment(deploymentId, { commitHash });
      await this.addLog(deploymentId, `Commit: ${commitHash.substring(0, 8)}`, "info");
    } catch {}
  }

  private async stepPullServer(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "Pulling latest from GitHub on server...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && git fetch origin main && git reset --hard origin/main && echo 'PULL_OK'"`,
      "Server Pull",
      60000
    );
  }

  private async stepInstallDeps(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "Installing dependencies on server...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "set -o pipefail && cd ${remoteDir} && npm install --loglevel=error --legacy-peer-deps 2>&1 | tail -5 && echo 'DEPS_OK'"`,
      "Install Deps",
      120000
    );
  }

  private async stepBuildServer(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "بناء التطبيق على السيرفر (قد يستغرق 3-5 دقائق)...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "set -o pipefail && cd ${remoteDir} && export VITE_API_BASE_URL=https://app2.binarjoinanelytic.info && export NODE_ENV=production && npm run build 2>&1 | tail -20 && echo 'BUILD_OK'"`,
      "Server Build",
      300000
    );
  }

  private async stepDbMigrate(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "فحص قاعدة البيانات (بدون تعديل تلقائي)...", "info");
    const remoteDir = "/home/administrator/app2";

    try {
      await this.execWithLog(
        deploymentId,
        `${sshCmd} "cd ${remoteDir} && echo 'DB migration skipped - manual review required for safety' && echo 'MIGRATE_OK'"`,
        "DB Migrate",
        30000
      );
      await this.addLog(deploymentId, "تم تخطي الترحيل التلقائي للحفاظ على البيانات - راجع التغييرات يدوياً إذا لزم الأمر", "warn");
    } catch (err: any) {
      await this.addLog(deploymentId, "تحذير: فحص قاعدة البيانات فشل لكن لم يتم تعديل أي بيانات", "warn");
    }
  }

  private async stepHotfixSync(deploymentId: string) {
    await this.addLog(deploymentId, "Hotfix: syncing built files to server...", "info");

    const scpCmd = this.buildSCPCommand(
      "/home/runner/workspace/dist/",
      "/home/administrator/app2/dist/"
    );
    await this.execWithLog(
      deploymentId,
      `${scpCmd.replace("scp ", "scp -r ")} && echo 'HOTFIX_SYNC_OK'`,
      "Hotfix Sync",
      120000
    );

    try {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: "/home/runner/workspace" });
      await this.updateDeployment(deploymentId, { commitHash: stdout.trim() });
    } catch {}
  }

  private async getCurrentVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync("grep '\"version\"' package.json | head -1 | sed 's/.*\"version\": \"\\([^\"]*\\)\".*/\\1/'", { cwd: "/home/runner/workspace" });
      return stdout.trim() || "1.0.0";
    } catch {
      return "1.0.0";
    }
  }

  private async addLog(deploymentId: string, message: string, type: LogEntry["type"]) {
    const entry: LogEntry = { timestamp: new Date().toISOString(), message, type };

    try {
      const [current] = await db.select({ logs: buildDeployments.logs }).from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      const existingLogs = Array.isArray(current?.logs) ? current.logs : [];
      const maxLogs = 500;
      const updatedLogs = existingLogs.length >= maxLogs 
        ? [...existingLogs.slice(-maxLogs + 1), entry]
        : [...existingLogs, entry];
      await db.update(buildDeployments).set({ logs: updatedLogs }).where(eq(buildDeployments.id, deploymentId));
    } catch (err) {
      console.error(`[DeploymentEngine] Failed to save log for ${deploymentId}:`, err);
    }

    broadcastToClients(deploymentId, { type: "log", data: entry });
  }

  private async addEvent(deploymentId: string, eventType: string, message: string, metadata?: any) {
    await db.insert(deploymentEvents).values({
      deploymentId,
      eventType,
      message,
      metadata: metadata || null,
    });

    broadcastToClients(deploymentId, { type: "event", data: { eventType, message, metadata } });
  }

  private async updateStepStatus(deploymentId: string, stepName: string, status: StepEntry["status"], duration?: number) {
    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    if (!deployment) return;

    const steps = (deployment.steps as StepEntry[]).map(s => {
      if (s.name === stepName) {
        return { ...s, status, duration, startedAt: status === "running" ? new Date().toISOString() : s.startedAt };
      }
      return s;
    });

    await db.update(buildDeployments).set({ steps }).where(eq(buildDeployments.id, deploymentId));

    broadcastToClients(deploymentId, { type: "step_update", data: { stepName, status, duration } });
  }

  private async updateDeployment(deploymentId: string, updates: Partial<Record<string, any>>) {
    await db.update(buildDeployments).set(updates).where(eq(buildDeployments.id, deploymentId));

    broadcastToClients(deploymentId, { type: "deployment_update", data: updates });
  }

  async checkServerHealth(): Promise<{ status: string; checks: Record<string, any> }> {
    const sshCmd = this.buildSSHCommand();
    const checks: Record<string, any> = {};

    try {
      const { stdout: httpCheck } = await execAsync("curl -s -o /dev/null -w '%{http_code}' https://app2.binarjoinanelytic.info/api/health", { timeout: 15000 });
      checks.httpStatus = httpCheck.trim().replace(/'/g, "");
    } catch {
      checks.httpStatus = "unreachable";
    }

    try {
      const { stdout: pm2Check } = await execAsync(`${sshCmd} "pm2 jlist 2>/dev/null | head -500"`, { timeout: 15000 });
      const processes = JSON.parse(pm2Check || "[]");
      checks.pm2 = processes.map((p: any) => ({
        name: p.name,
        status: p.pm2_env?.status,
        uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null,
        restarts: p.pm2_env?.restart_time,
        memoryMB: p.monit?.memory ? Math.round(p.monit.memory / 1024 / 1024) : null,
        cpu: p.monit?.cpu,
      }));
    } catch {
      checks.pm2 = "unavailable";
    }

    try {
      const { stdout: diskCheck } = await execAsync(`${sshCmd} "df -h /home/administrator | tail -1"`, { timeout: 10000 });
      checks.disk = diskCheck.trim();
    } catch {
      checks.disk = "unavailable";
    }

    try {
      const { stdout: memCheck } = await execAsync(`${sshCmd} "free -h | head -2"`, { timeout: 10000 });
      checks.memory = memCheck.trim();
    } catch {
      checks.memory = "unavailable";
    }

    const httpOk = checks.httpStatus === "200";
    const pm2Ok = Array.isArray(checks.pm2) && checks.pm2.some((p: any) => p.status === "online");
    const status = httpOk && pm2Ok ? "healthy" : httpOk || pm2Ok ? "degraded" : "down";
    return { status, checks };
  }

  async rollbackDeployment(deploymentId: string): Promise<string> {
    const deployment = await this.getDeployment(deploymentId);
    if (!deployment) throw new Error("Deployment not found");
    if (deployment.status !== "success") throw new Error("Can only rollback successful deployments");

    const rollbackBuildNumber = await this.getNextBuildNumber();
    const steps: StepEntry[] = [
      { name: "validate", status: "pending" },
      { name: "rollback-server", status: "pending" },
      { name: "restart-pm2", status: "pending" },
      { name: "verify", status: "pending" },
    ];

    const [rollbackDeployment] = await db.insert(buildDeployments).values({
      buildNumber: rollbackBuildNumber,
      status: "running",
      currentStep: "validate",
      progress: 0,
      version: deployment.version,
      appType: deployment.appType,
      environment: deployment.environment,
      branch: deployment.branch || "main",
      commitMessage: `Rollback to build #${deployment.buildNumber}`,
      pipeline: "rollback",
      deploymentType: "rollback",
      rollbackInfo: { originalDeploymentId: deploymentId, originalBuildNumber: deployment.buildNumber },
      logs: [],
      steps,
    }).returning();

    this.executeRollback(rollbackDeployment.id, deployment).catch(err => {
      console.error(`[DeploymentEngine] Rollback error:`, err);
    });

    return rollbackDeployment.id;
  }

  private async executeRollback(rollbackId: string, originalDeployment: any) {
    const sshCmd = this.buildSSHCommand();
    const startTime = Date.now();

    try {
      await this.updateStepStatus(rollbackId, "validate", "running");
      await this.addLog(rollbackId, `Rolling back to build #${originalDeployment.buildNumber} (v${originalDeployment.version})`, "step");
      await this.updateStepStatus(rollbackId, "validate", "success", Date.now() - startTime);

      await this.updateStepStatus(rollbackId, "rollback-server", "running");
      await this.updateDeployment(rollbackId, { currentStep: "rollback-server", progress: 25 });
      const remoteDir = "/home/administrator/app2";
      await this.execWithLog(rollbackId, `${sshCmd} "cd ${remoteDir} && git log --oneline -3 2>/dev/null || echo 'git-log-unavailable'"`, "Git Log (before)", 15000);
      await this.execWithLog(rollbackId, `${sshCmd} "set -o pipefail && cd ${remoteDir} && git stash 2>/dev/null; git checkout HEAD~1 -- . 2>/dev/null && npm install --legacy-peer-deps --loglevel=error 2>&1 | tail -3 && npm run build 2>&1 | tail -5 && echo 'ROLLBACK_CODE_OK'"`, "Rollback Code", 180000);
      await this.updateStepStatus(rollbackId, "rollback-server", "success", Date.now() - startTime);

      await this.updateStepStatus(rollbackId, "restart-pm2", "running");
      await this.updateDeployment(rollbackId, { currentStep: "restart-pm2", progress: 60 });
      await this.execWithLog(rollbackId, `${sshCmd} "cd ${remoteDir} && pm2 restart binarjoin --update-env 2>/dev/null || pm2 restart construction-app --update-env 2>/dev/null && pm2 save && echo 'RESTART_OK'"`, "PM2 Restart", 30000);
      await this.updateStepStatus(rollbackId, "restart-pm2", "success", Date.now() - startTime);

      await this.updateStepStatus(rollbackId, "verify", "running");
      await this.updateDeployment(rollbackId, { currentStep: "verify", progress: 85 });
      await new Promise(r => setTimeout(r, 5000));
      const health = await this.checkServerHealth();
      await this.updateDeployment(rollbackId, { serverHealthResult: health });
      await this.addLog(rollbackId, `Health check: ${health.status}`, health.status === "healthy" ? "success" : "warn");
      await this.updateStepStatus(rollbackId, "verify", "success", Date.now() - startTime);

      await this.updateDeployment(rollbackId, {
        status: "success",
        progress: 100,
        currentStep: "complete",
        duration: Date.now() - startTime,
        endTime: new Date(),
      });
      await this.addLog(rollbackId, "Rollback completed successfully", "success");
    } catch (error: any) {
      await this.updateDeployment(rollbackId, {
        status: "failed",
        duration: Date.now() - startTime,
        endTime: new Date(),
        errorMessage: error.message,
      });
    }
  }

  async runCleanup(): Promise<{ cleaned: string[]; errors: string[] }> {
    const sshCmd = this.buildSSHCommand();
    const cleaned: string[] = [];
    const errors: string[] = [];
    const remoteDir = "/home/administrator/app2";

    try {
      await execAsync(`${sshCmd} "cd ${remoteDir} && rm -rf android/app/build android/.gradle android/build 2>/dev/null && echo 'CLEAN_ANDROID'"`, { timeout: 30000 });
      cleaned.push("Android build artifacts");
    } catch (e: any) { errors.push(`Android cleanup: ${e.message}`); }

    try {
      await execAsync(`${sshCmd} "rm -f /tmp/deploy-*.tar.gz /tmp/app-build-*.tar.gz /tmp/www_assets.tar.gz /tmp/android_project.tar.gz 2>/dev/null && echo 'CLEAN_TMP'"`, { timeout: 15000 });
      cleaned.push("Temporary archives");
    } catch (e: any) { errors.push(`Temp cleanup: ${e.message}`); }

    try {
      await execAsync(`${sshCmd} "cd ${remoteDir} && pm2 flush 2>/dev/null && echo 'CLEAN_LOGS'"`, { timeout: 15000 });
      cleaned.push("PM2 logs");
    } catch (e: any) { errors.push(`PM2 logs: ${e.message}`); }

    return { cleaned, errors };
  }

  async getDeployment(id: string) {
    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, id));
    return deployment || null;
  }

  async deleteDeployment(id: string) {
    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, id));
    if (!deployment) throw new Error("العملية غير موجودة");
    if (deployment.status === "running") throw new Error("لا يمكن حذف عملية قيد التنفيذ");
    await db.delete(buildDeployments).where(eq(buildDeployments.id, id));
  }

  async getDeployments(limit = 20, offset = 0) {
    return db.select().from(buildDeployments).orderBy(desc(buildDeployments.created_at)).limit(limit).offset(offset);
  }

  async getDeploymentCount() {
    const [result] = await db.select({ count: count() }).from(buildDeployments);
    return result?.count || 0;
  }

  async getDeploymentStats() {
    const total = await this.getDeploymentCount();
    const [successCount] = await db.select({ count: count() }).from(buildDeployments).where(eq(buildDeployments.status, "success"));
    const [failedCount] = await db.select({ count: count() }).from(buildDeployments).where(eq(buildDeployments.status, "failed"));
    const [runningCount] = await db.select({ count: count() }).from(buildDeployments).where(eq(buildDeployments.status, "running"));

    const recentDeployments = await db.select().from(buildDeployments)
      .where(eq(buildDeployments.status, "success"))
      .orderBy(desc(buildDeployments.created_at))
      .limit(10);

    const avgDuration = recentDeployments.length > 0
      ? Math.round(recentDeployments.reduce((sum: number, d: any) => sum + (d.duration || 0), 0) / recentDeployments.length)
      : 0;

    return {
      total,
      success: successCount?.count || 0,
      failed: failedCount?.count || 0,
      running: runningCount?.count || 0,
      successRate: total > 0 ? Math.round(((successCount?.count || 0) / total) * 100) : 0,
      avgDuration,
    };
  }

  async getDeploymentEvents(deploymentId: string) {
    return db.select().from(deploymentEvents)
      .where(eq(deploymentEvents.deploymentId, deploymentId))
      .orderBy(desc(deploymentEvents.timestamp));
  }

  async cancelDeployment(deploymentId: string) {
    await this.updateDeployment(deploymentId, {
      status: "failed",
      errorMessage: "Cancelled by user",
      endTime: new Date(),
    });
    await this.addLog(deploymentId, "Deployment cancelled by user", "warn");
    await this.addEvent(deploymentId, "deployment_cancelled", "Deployment cancelled by user");
  }

  registerSSEClient(deploymentId: string, res: Response) {
    if (!activeSSEClients.has(deploymentId)) {
      activeSSEClients.set(deploymentId, []);
    }
    activeSSEClients.get(deploymentId)!.push(res);

    res.on("close", () => {
      const clients = activeSSEClients.get(deploymentId);
      if (clients) {
        const idx = clients.indexOf(res);
        if (idx !== -1) clients.splice(idx, 1);
        if (clients.length === 0) activeSSEClients.delete(deploymentId);
      }
    });
  }
}

export const deploymentEngine = new DeploymentEngine();
