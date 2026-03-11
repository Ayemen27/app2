import { db } from "../db.js";
import { buildDeployments, deploymentEvents } from "@shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import type { Response } from "express";

const execAsync = promisify(exec);

type LogEntry = { timestamp: string; message: string; type: "info" | "error" | "success" | "warn" | "step" };
type StepEntry = { name: string; status: "pending" | "running" | "success" | "failed"; duration?: number; startedAt?: string };

type Pipeline = "web-deploy" | "android-build" | "full-deploy" | "git-push";

interface DeploymentConfig {
  pipeline: Pipeline;
  appType: "web" | "android";
  environment: "production" | "staging";
  branch?: string;
  commitMessage?: string;
  triggeredBy?: string;
}

const PIPELINE_STEPS: Record<Pipeline, string[]> = {
  "web-deploy": ["validate", "build-web", "transfer", "deploy-server", "restart-pm2", "verify"],
  "android-build": ["validate", "build-web", "transfer", "sync-capacitor", "gradle-build", "sign-apk", "retrieve-artifact"],
  "full-deploy": ["validate", "git-push", "build-web", "transfer", "deploy-server", "restart-pm2", "sync-capacitor", "gradle-build", "sign-apk", "retrieve-artifact", "verify"],
  "git-push": ["validate", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "verify"],
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

  async getNextBuildNumber(): Promise<number> {
    const result = await db.select({ maxBuild: sql<number>`COALESCE(MAX(build_number), 0)` }).from(buildDeployments);
    return (result[0]?.maxBuild || 0) + 1;
  }

  async startDeployment(config: DeploymentConfig): Promise<string> {
    const buildNumber = await this.getNextBuildNumber();
    const steps: StepEntry[] = PIPELINE_STEPS[config.pipeline].map(name => ({
      name,
      status: "pending" as const,
    }));

    const version = await this.getCurrentVersion();

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
      default:
        await this.addLog(deploymentId, `Unknown step: ${stepName}`, "warn");
    }
  }

  private buildSSHCommand(): string {
    const host = process.env.SSH_HOST || "93.127.142.144";
    const user = process.env.SSH_USER || "administrator";
    const port = process.env.SSH_PORT || "22";
    return `sshpass -p "${process.env.SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -p ${port} ${user}@${host}`;
  }

  private buildSCPCommand(src: string, dest: string): string {
    const host = process.env.SSH_HOST || "93.127.142.144";
    const user = process.env.SSH_USER || "administrator";
    const port = process.env.SSH_PORT || "22";
    return `sshpass -p "${process.env.SSH_PASSWORD}" scp -o StrictHostKeyChecking=no -P ${port} ${src} ${user}@${host}:${dest}`;
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
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        cwd: "/home/runner/workspace",
      });

      const output = stdout || stderr || "";
      const lines = output.split("\n").filter(l => l.trim());
      for (const line of lines.slice(-10)) {
        await this.addLog(deploymentId, `[${label}] ${this.maskSecrets(line)}`, "info");
      }
      return output;
    } catch (error: any) {
      const errorOutput = this.maskSecrets(error.stderr || error.stdout || error.message);
      await this.addLog(deploymentId, `[${label}] Error: ${errorOutput}`, "error");
      throw new Error(`${label} failed: ${errorOutput.substring(0, 500)}`);
    }
  }

  private async stepValidate(deploymentId: string) {
    await this.addLog(deploymentId, "Validating environment...", "info");

    const checks = [
      { name: "SSH_PASSWORD", ok: !!process.env.SSH_PASSWORD },
      { name: "SSH_HOST", ok: !!process.env.SSH_HOST },
      { name: "package.json", ok: true },
    ];

    const failed = checks.filter(c => !c.ok);
    if (failed.length > 0) {
      throw new Error(`Validation failed: missing ${failed.map(c => c.name).join(", ")}`);
    }

    try {
      const sshCmd = this.buildSSHCommand();
      await execAsync(`${sshCmd} "echo SSH_OK"`, { timeout: 15000 });
      await this.addLog(deploymentId, "SSH connection verified", "success");
    } catch {
      throw new Error("Cannot connect to remote server via SSH");
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
    await this.addLog(deploymentId, "Creating deployment archive...", "info");

    const version = await this.getCurrentVersion();
    const archivePath = `/tmp/deploy-${version}-${Date.now()}.tar.gz`;

    await this.execWithLog(
      deploymentId,
      `tar --exclude='node_modules' --exclude='dist' --exclude='android/build' --exclude='android/app/build' --exclude='android/.gradle' --exclude='.git' --exclude='.gradle' --exclude='output_apks' -czf ${archivePath} .`,
      "Archive",
      60000
    );

    const { stdout: sizeOut } = await execAsync(`du -h ${archivePath} | cut -f1`);
    await this.addLog(deploymentId, `Archive size: ${sizeOut.trim()}`, "info");

    await this.addLog(deploymentId, "Uploading to server...", "info");
    await this.execWithLog(
      deploymentId,
      this.buildSCPCommand(archivePath, "/tmp/deploy-package.tar.gz"),
      "Upload",
      120000
    );

    await execAsync(`rm -f ${archivePath}`);
    await this.addLog(deploymentId, "Transfer complete", "success");
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
      `${sshCmd} "cd ${remoteDir} && npm install --loglevel=error --legacy-peer-deps 2>&1 | tail -5 && echo 'INSTALL_OK'"`,
      "Install Dependencies",
      120000
    );

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && export VITE_API_BASE_URL=https://app2.binarjoinanelytic.info && export NODE_ENV=production && npm run build 2>&1 | tail -10 && echo 'BUILD_OK'"`,
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
      `${sshCmd} "cd ${remoteDir}/android && export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 && export PATH=\\$JAVA_HOME/bin:\\$PATH && export ANDROID_HOME=/opt/android-sdk && chmod +x gradlew && rm -rf app/build .gradle build && ./gradlew clean assembleRelease --no-daemon --warning-mode=none 2>&1 | tail -20 && echo 'GRADLE_OK'"`,
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
      await this.execWithLog(
        deploymentId,
        `sshpass -p "${process.env.SSH_PASSWORD}" scp -o StrictHostKeyChecking=no -P ${port} ${user}@${host}:${remoteDir}/AXION_LATEST.apk ${localPath}`,
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
    await this.addLog(deploymentId, "Pushing to GitHub...", "info");

    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_USERNAME) {
      throw new Error("GITHUB_TOKEN and GITHUB_USERNAME are required for git push");
    }

    const rawMessage = config.commitMessage || `Deploy v${await this.getCurrentVersion()} - ${new Date().toISOString()}`;
    const safeMessage = rawMessage.replace(/['"\\$`!]/g, "");

    await this.execWithLog(
      deploymentId,
      `bash /home/runner/workspace/scripts/push_repo.sh "${safeMessage}"`,
      "Git Push",
      60000
    );
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
      `${sshCmd} "cd ${remoteDir} && npm install --loglevel=error --legacy-peer-deps 2>&1 | tail -5 && echo 'DEPS_OK'"`,
      "Install Deps",
      120000
    );
  }

  private async stepBuildServer(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "Building application on server...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && export VITE_API_BASE_URL=https://app2.binarjoinanelytic.info && export NODE_ENV=production && npm run build 2>&1 | tail -10 && echo 'BUILD_OK'"`,
      "Server Build",
      120000
    );
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

    await db.execute(sql`
      UPDATE build_deployments 
      SET logs = logs || ${JSON.stringify([entry])}::jsonb 
      WHERE id = ${deploymentId}
    `);

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

  async getDeployment(id: string) {
    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, id));
    return deployment || null;
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
      ? Math.round(recentDeployments.reduce((sum, d) => sum + (d.duration || 0), 0) / recentDeployments.length)
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
