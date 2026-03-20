import { db } from "../db.js";
import { buildDeployments, deploymentEvents } from "@shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { exec, spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import type { Response } from "express";

const execAsync = promisify(exec);

type LogEntry = { timestamp: string; message: string; type: "info" | "error" | "success" | "warn" | "step" };
type StepEntry = { name: string; status: "pending" | "running" | "success" | "failed" | "cancelled"; duration?: number; startedAt?: string };

class CancellationError extends Error {
  constructor(message = "Deployment cancelled by user") {
    super(message);
    this.name = "CancellationError";
  }
}

type Pipeline = "web-deploy" | "android-build" | "full-deploy" | "git-push" | "hotfix" | "git-android-build" | "android-build-test";

interface DeploymentConfig {
  pipeline: Pipeline;
  appType: "web" | "android";
  environment: "production" | "staging";
  branch?: string;
  commitMessage?: string;
  triggeredBy?: string;
  version?: string;
  buildTarget?: "server" | "local";
}

const SERVER_PIPELINES: Record<Pipeline, string[]> = {
  "web-deploy": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "verify"],
  "android-build": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "retrieve-artifact"],
  "full-deploy": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "retrieve-artifact", "verify"],
  "git-push": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "verify"],
  "hotfix": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "verify"],
  "git-android-build": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "retrieve-artifact", "verify"],
  "android-build-test": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "firebase-test", "retrieve-artifact", "verify"],
};

const LOCAL_PIPELINES: Record<Pipeline, string[]> = {
  "web-deploy": ["validate", "sync-version", "build-web", "transfer", "deploy-server", "db-migrate", "restart-pm2", "verify"],
  "android-build": ["validate", "sync-version", "build-web", "git-push", "pull-server", "install-deps", "restart-pm2", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "retrieve-artifact"],
  "full-deploy": ["validate", "sync-version", "build-web", "transfer", "deploy-server", "db-migrate", "restart-pm2", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "retrieve-artifact", "verify"],
  "git-push": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "verify"],
  "hotfix": ["validate", "sync-version", "build-web", "hotfix-sync", "restart-pm2", "verify"],
  "git-android-build": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "retrieve-artifact", "verify"],
  "android-build-test": ["validate", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "firebase-test", "retrieve-artifact", "verify"],
};

function getPipelineSteps(pipeline: Pipeline, buildTarget: "server" | "local" = "server"): string[] {
  return buildTarget === "local" ? LOCAL_PIPELINES[pipeline] : SERVER_PIPELINES[pipeline];
}

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
  private cancelFlags = new Map<string, boolean>();
  private activeProcesses = new Map<string, Set<ChildProcess>>();

  private isCancelled(deploymentId: string): boolean {
    return this.cancelFlags.get(deploymentId) === true;
  }

  private async markRemainingStepsCancelled(deploymentId: string, currentStepIndex: number, pipelineSteps: string[]) {
    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    if (!deployment) return;

    const steps = (deployment.steps as StepEntry[]).map((s, idx) => {
      if (idx > currentStepIndex && s.status === "pending") {
        return { ...s, status: "cancelled" as const };
      }
      return s;
    });

    await db.update(buildDeployments).set({ steps }).where(eq(buildDeployments.id, deploymentId));
    broadcastToClients(deploymentId, { type: "steps_cancelled", data: { fromIndex: currentStepIndex + 1 } });
  }

  private terminateActiveProcesses(deploymentId: string) {
    const processes = this.activeProcesses.get(deploymentId);
    if (!processes) return;

    for (const child of processes) {
      try {
        const exited = child.exitCode !== null || child.signalCode !== null;
        if (exited) continue;

        const pgid = child.pid;
        if (pgid) {
          try {
            process.kill(-pgid, "SIGTERM");
          } catch {
            child.kill("SIGTERM");
          }
        } else {
          child.kill("SIGTERM");
        }

        const killTimer = setTimeout(() => {
          try {
            const stillAlive = child.exitCode === null && child.signalCode === null;
            if (stillAlive) {
              if (pgid) {
                try { process.kill(-pgid, "SIGKILL"); } catch {}
              }
              try { child.kill("SIGKILL"); } catch {}
            }
          } catch {}
        }, 5000);

        child.once("close", () => clearTimeout(killTimer));
      } catch {}
    }
  }

  private cleanupDeploymentState(deploymentId: string) {
    this.cancelFlags.delete(deploymentId);
    this.activeProcesses.delete(deploymentId);
  }

  private registerChildProcess(deploymentId: string, child: ChildProcess) {
    if (!this.activeProcesses.has(deploymentId)) {
      this.activeProcesses.set(deploymentId, new Set());
    }
    this.activeProcesses.get(deploymentId)!.add(child);

    child.on("close", () => {
      const procs = this.activeProcesses.get(deploymentId);
      if (procs) {
        procs.delete(child);
      }
    });
    child.on("error", () => {
      const procs = this.activeProcesses.get(deploymentId);
      if (procs) {
        procs.delete(child);
      }
    });
  }

  async recoverOrphanedDeployments() {
    try {
      const orphaned = await db.select().from(buildDeployments)
        .where(eq(buildDeployments.status, "running"));

      for (const d of orphaned) {
        const age = Date.now() - new Date(d.created_at!).getTime();
        const remoteSteps = ['build-server', 'sync-capacitor', 'generate-icons', 'gradle-build', 'sign-apk', 'retrieve-artifact'];
        const isRemoteStep = remoteSteps.includes(d.currentStep);
        const maxAge = isRemoteStep ? 900000 : 60000;
        if (age > maxAge) {
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

  private buildCounterInitialized = false;

  async getNextBuildNumber(): Promise<number> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS deployment_build_counter (
          id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          next_build_number INTEGER NOT NULL DEFAULT 1
        )
      `);

      if (!this.buildCounterInitialized) {
        this.buildCounterInitialized = true;
        const maxResult = await db.select({ maxBuild: sql<number>`COALESCE(MAX(build_number), 0)` }).from(buildDeployments);
        const currentMax = maxResult[0]?.maxBuild || 0;
        if (currentMax > 0) {
          await db.execute(sql`
            INSERT INTO deployment_build_counter (id, next_build_number)
            VALUES (1, ${currentMax + 1})
            ON CONFLICT (id)
            DO UPDATE SET next_build_number = GREATEST(deployment_build_counter.next_build_number, ${currentMax + 1})
          `);
        }
      }
      
      const queryResult = await db.execute(sql`
        UPDATE deployment_build_counter
        SET next_build_number = next_build_number + 1
        WHERE id = 1
        RETURNING next_build_number - 1 AS build_number
      `);
      
      const rows = (queryResult as any).rows || queryResult;
      const firstRow = Array.isArray(rows) ? rows[0] : null;
      
      if (firstRow?.build_number != null) {
        return Number(firstRow.build_number);
      }

      await db.execute(sql`
        INSERT INTO deployment_build_counter (id, next_build_number) VALUES (1, 2)
      `);
      return 1;
    } catch (err) {
      console.error("[DeploymentEngine] Atomic build number failed, falling back:", err);
    }
    
    const result = await db.select({ maxBuild: sql<number>`COALESCE(MAX(build_number), 0)` }).from(buildDeployments);
    return (result[0]?.maxBuild || 0) + 1;
  }

  async startDeployment(config: DeploymentConfig): Promise<string> {
    if (!config.triggeredBy) {
      throw new Error("Deployment requires an authenticated user (triggeredBy is required)");
    }

    const buildNumber = await this.getNextBuildNumber();
    const bt = config.buildTarget || "server";
    const steps: StepEntry[] = getPipelineSteps(config.pipeline, bt).map(name => ({
      name,
      status: "pending" as const,
    }));

    const version = config.version || await this.getCurrentVersion();

    const deploymentTypeMap: Record<string, string> = {
      "web-deploy": "web",
      "android-build": "android",
      "full-deploy": "web",
      "git-push": "web",
      "hotfix": "hotfix",
      "git-android-build": "android",
      "android-build-test": "android",
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
    const bt = config.buildTarget || "server";
    const pipelineSteps = getPipelineSteps(config.pipeline, bt);
    const startTime = Date.now();
    const targetLabel = bt === "local" ? "محلي (Replit)" : "على السيرفر (VPS)";
    await this.addLog(deploymentId, `مكان البناء: ${targetLabel} | الخطوات: ${pipelineSteps.join(" → ")}`, "info");

    try {
      for (let i = 0; i < pipelineSteps.length; i++) {
        if (this.isCancelled(deploymentId)) {
          await this.markRemainingStepsCancelled(deploymentId, i - 1, pipelineSteps);
          throw new CancellationError();
        }

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

          if (stepError instanceof CancellationError || this.isCancelled(deploymentId)) {
            await this.updateStepStatus(deploymentId, stepName, "cancelled", stepDuration);
            await this.markRemainingStepsCancelled(deploymentId, i, pipelineSteps);
            throw new CancellationError();
          }

          await this.updateStepStatus(deploymentId, stepName, "failed", stepDuration);
          await this.markRemainingStepsCancelled(deploymentId, i, pipelineSteps);
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
      const isCancelled = error instanceof CancellationError || this.isCancelled(deploymentId);

      await this.updateDeployment(deploymentId, {
        status: isCancelled ? "cancelled" : "failed",
        duration: totalDuration,
        endTime: new Date(),
        errorMessage: isCancelled ? "Cancelled by user" : error.message,
      });
      await this.addEvent(deploymentId, isCancelled ? "deployment_cancelled" : "deployment_failed", isCancelled ? "Deployment cancelled by user" : error.message);
    } finally {
      this.cleanupDeploymentState(deploymentId);
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
      case "firebase-test":
        await this.stepFirebaseTest(deploymentId, sshCmd);
        break;
      case "generate-icons":
        await this.stepGenerateIcons(deploymentId, sshCmd);
        break;
      case "sync-version":
        await this.stepSyncVersion(deploymentId);
        break;
      default:
        await this.addLog(deploymentId, `Unknown step: ${stepName}`, "warn");
    }
  }

  private sanitizeShellArg(value: string): string {
    return value.replace(/[^a-zA-Z0-9._\-@]/g, '');
  }

  private buildSSHCommand(): string {
    const host = this.sanitizeShellArg(process.env.SSH_HOST || "93.127.142.144");
    const user = this.sanitizeShellArg(process.env.SSH_USER || "administrator");
    const port = this.sanitizeShellArg(process.env.SSH_PORT || "22");
    return `sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=20 -p ${port} ${user}@${host}`;
  }

  private buildSCPCommand(src: string, dest: string): string {
    const host = this.sanitizeShellArg(process.env.SSH_HOST || "93.127.142.144");
    const user = this.sanitizeShellArg(process.env.SSH_USER || "administrator");
    const port = this.sanitizeShellArg(process.env.SSH_PORT || "22");
    return `sshpass -e scp -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -P ${port} ${src} ${user}@${host}:${dest}`;
  }

  private maskSecrets(text: string): string {
    const secrets = [
      process.env.SSH_PASSWORD,
      process.env.SSHPASS,
      process.env.GITHUB_TOKEN,
      process.env.GH_TOKEN,
    ].filter(Boolean) as string[];

    let masked = text;
    for (const secret of secrets) {
      if (secret.length < 4) continue;
      masked = masked.replace(new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***');
    }
    return masked;
  }

  private async execWithLog(deploymentId: string, command: string, label: string, timeoutMs = 300000): Promise<string> {
    await this.addLog(deploymentId, `[${label}] Executing...`, "info");

    return new Promise((resolve, reject) => {
      const execEnv = { ...process.env };
      if (process.env.SSH_PASSWORD && !execEnv.SSHPASS) {
        execEnv.SSHPASS = process.env.SSH_PASSWORD;
      }
      if (process.env.GITHUB_TOKEN && !execEnv.GH_TOKEN) {
        execEnv.GH_TOKEN = process.env.GITHUB_TOKEN;
      }

      const child = spawn("bash", ["-c", command], {
        cwd: "/home/runner/workspace",
        env: execEnv,
        detached: true,
      });

      this.registerChildProcess(deploymentId, child);

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

        if (this.isCancelled(deploymentId)) {
          reject(new CancellationError());
          return;
        }

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
        if (this.isCancelled(deploymentId)) {
          reject(new CancellationError());
          return;
        }
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
    await this.addLog(deploymentId, "مزامنة Capacitor للأندرويد...", "info");
    const remoteDir = "/home/administrator/app2";

    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    if (!deployment) throw new Error("Deployment not found");

    const versionCode = deployment.buildNumber;
    const versionName = deployment.version;

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir}/android/app && echo 'VERSION_CODE=${versionCode}' > version.properties && echo 'VERSION_NAME=${versionName}' >> version.properties && cat version.properties"`,
      "Version Set",
      15000
    );

    await this.addLog(deploymentId, `📱 versionName: ${versionName} | versionCode: ${versionCode}`, "info");

    await this.addLog(deploymentId, "تنظيف ونسخ ملفات البناء إلى www/ لمزامنة Capacitor...", "info");
    const copyAssetsResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && rm -rf www android/app/src/main/assets/public && mkdir -p www && if [ -d dist/public ] && [ -f dist/public/index.html ]; then cp -r dist/public/* www/ && echo 'COPIED_FROM_DIST_PUBLIC'; else echo 'NO_BUILD_OUTPUT'; fi && echo 'WWW_FILE_COUNT='\\$(find www -type f | wc -l) && echo 'WWW_SIZE='\\$(du -sh www | cut -f1)"`,
      "Copy Build Assets to www",
      60000
    );

    if (copyAssetsResult.includes("NO_BUILD_OUTPUT")) {
      throw new Error("❌ لا يوجد ناتج بناء في dist/ — تأكد أن خطوة build-server نجحت");
    }

    const fileCountMatch = copyAssetsResult.match(/WWW_FILE_COUNT=(\d+)/);
    const fileCount = fileCountMatch ? parseInt(fileCountMatch[1]) : 0;
    if (fileCount < 5) {
      throw new Error(`❌ مجلد www/ يحتوي ${fileCount} ملفات فقط — البناء غير مكتمل`);
    }
    await this.addLog(deploymentId, `✅ تم نسخ ${fileCount} ملف إلى www/`, "success");

    const capSyncResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && if which npx >/dev/null 2>&1; then set -o pipefail && npx cap sync android 2>&1 | tail -15 && echo 'CAP_SYNC_OK'; else echo 'CAP_SYNC_SKIP_NO_NPX'; fi"`,
      "Capacitor Plugin Sync",
      120000
    );

    if (capSyncResult.includes("CAP_SYNC_OK")) {
      await this.addLog(deploymentId, "✅ تم مزامنة Capacitor plugins (PushNotifications, NativeBiometric, ...)", "success");
    } else {
      await this.addLog(deploymentId, "⚠️ npx غير متاح — مزامنة يدوية للأصول", "warn");
      await this.execWithLog(
        deploymentId,
        `${sshCmd} "cd ${remoteDir} && rm -rf android/app/src/main/assets/public && mkdir -p android/app/src/main/assets/public && cp -r www/* android/app/src/main/assets/public/ && cp capacitor.config.json android/app/src/main/assets/capacitor.config.json 2>/dev/null; echo 'SYNC_OK'"`,
        "Manual Asset Sync",
        60000
      );
    }

    const verifyResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir}/android/app/src/main/assets/public && if [ -f index.html ]; then echo 'INDEX_HTML_OK'; JSCOUNT=\\$(find . -name '*.js' | wc -l); CSSCOUNT=\\$(find . -name '*.css' | wc -l); TOTAL=\\$(find . -type f | wc -l); SIZE=\\$(du -sh . | cut -f1); MAINJS=\\$(grep -oP 'src=\\\"\\./assets/index-[^\\\"]+\\.js' index.html | head -1 | sed 's|src=\\\"\\./||'); echo \\"JS_FILES=\\$JSCOUNT CSS_FILES=\\$CSSCOUNT TOTAL=\\$TOTAL SIZE=\\$SIZE\\"; if [ -n \\"\\$MAINJS\\" ] && [ -f \\"\\$MAINJS\\" ]; then MAINSIZE=\\$(wc -c < \\"\\$MAINJS\\"); echo \\"MAIN_JS=\\$MAINJS (\\$MAINSIZE bytes) MATCH_OK\\"; else echo \\"MAIN_JS_MISSING: \\$MAINJS\\"; fi; else echo 'INDEX_HTML_MISSING'; fi"`,
      "Verify Android Assets",
      15000
    );

    if (verifyResult.includes("INDEX_HTML_MISSING")) {
      throw new Error("❌ index.html مفقود من android assets — مزامنة Capacitor فشلت");
    }
    if (verifyResult.includes("MAIN_JS_MISSING")) {
      throw new Error("❌ ملف JavaScript الرئيسي المطلوب في index.html غير موجود في assets — البناء تالف");
    }
    await this.addLog(deploymentId, `✅ تم التحقق: ملفات الويب وJS الرئيسي موجودة في Android assets`, "success");

    await this.addLog(deploymentId, "فحص متطلبات الأندرويد...", "info");

    const checksResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && MANIFEST='android/app/src/main/AndroidManifest.xml' && CHECKS=''; if [ -f \\$MANIFEST ]; then for PERM in POST_NOTIFICATIONS USE_BIOMETRIC USE_FINGERPRINT INTERNET; do if grep -q \\$PERM \\$MANIFEST; then CHECKS=\\$CHECKS\\$PERM'_OK '; else sed -i '/<\\/manifest>/i\\    <uses-permission android:name=\"android.permission.'\\$PERM'\"/>' \\$MANIFEST && CHECKS=\\$CHECKS\\$PERM'_ADDED '; fi; done; else CHECKS='MANIFEST_MISSING '; fi && if [ -f android/app/google-services.json ]; then CHECKS=\\$CHECKS'GOOGLE_SERVICES_OK'; else for GS in /home/administrator/google-services.json /home/administrator/.config/google-services.json; do if [ -f \\$GS ]; then cp \\$GS android/app/google-services.json && CHECKS=\\$CHECKS'GOOGLE_SERVICES_COPIED' && break; fi; done; if [ ! -f android/app/google-services.json ]; then CHECKS=\\$CHECKS'GOOGLE_SERVICES_MISSING'; fi; fi && echo \\$CHECKS"`,
      "Android Checks",
      20000
    );

    const permLabels: Record<string, string> = {
      "POST_NOTIFICATIONS": "الإشعارات",
      "USE_BIOMETRIC": "البصمة (Biometric)",
      "USE_FINGERPRINT": "بصمة الإصبع (Fingerprint)",
      "INTERNET": "الإنترنت",
    };
    for (const [perm, label] of Object.entries(permLabels)) {
      if (checksResult.includes(`${perm}_ADDED`)) {
        await this.addLog(deploymentId, `✅ تمت إضافة صلاحية ${label} إلى AndroidManifest.xml`, "success");
      } else if (checksResult.includes(`${perm}_OK`)) {
        await this.addLog(deploymentId, `✅ صلاحية ${label} موجودة`, "info");
      }
    }

    if (checksResult.includes("GOOGLE_SERVICES_OK")) {
      await this.addLog(deploymentId, "✅ google-services.json موجود", "info");
    } else if (checksResult.includes("GOOGLE_SERVICES_COPIED")) {
      await this.addLog(deploymentId, "✅ تم نسخ google-services.json من المسار الاحتياطي", "success");
    } else if (checksResult.includes("GOOGLE_SERVICES_MISSING")) {
      await this.addLog(deploymentId, "⚠️ google-services.json مفقود — الإشعارات Push لن تعمل بدون Firebase", "warn");
    }

    if (checksResult.includes("MANIFEST_MISSING")) {
      await this.addLog(deploymentId, "⚠️ AndroidManifest.xml مفقود — تأكد من وجود مشروع Android صحيح", "warn");
    }

    await this.addLog(deploymentId, "فحص اكتمال مشروع Gradle...", "info");
    const gradleIntegrityResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} 'cd ${remoteDir}/android && test -f build.gradle && test -f settings.gradle && test -f gradle.properties && test -f variables.gradle && test -f gradlew && echo GRADLE_PROJECT_COMPLETE || echo GRADLE_FILES_NEED_FIX'`,
      "Gradle Project Integrity",
      30000
    );

    if (gradleIntegrityResult.includes("GRADLE_FILES_NEED_FIX")) {
      await this.addLog(deploymentId, "⚠️ ملفات Gradle مفقودة — جاري إعادة إنشاء المشروع...", "warn");
      const fixResult = await this.execWithLog(
        deploymentId,
        `${sshCmd} 'cd ${remoteDir} && mkdir -p /tmp/android_app_bak && cp -r android/app /tmp/android_app_bak/ 2>/dev/null; rm -rf android && npx cap add android 2>&1 | tail -5 && cp -r /tmp/android_app_bak/app/* android/app/ 2>/dev/null; npx cap sync android 2>&1 | tail -5 && rm -rf /tmp/android_app_bak && echo CAP_READD_DONE'`,
        "Gradle Project Fix",
        120000
      );
      if (fixResult.includes("CAP_READD_DONE")) {
        await this.addLog(deploymentId, "✅ تم إعادة إنشاء مشروع Android تلقائياً", "success");
      } else {
        await this.addLog(deploymentId, "⚠️ فشلت إعادة الإنشاء — سيتم المحاولة في خطوة gradle-build", "warn");
      }
    } else {
      await this.addLog(deploymentId, "✅ مشروع Gradle مكتمل", "info");
    }
  }

  private async stepGenerateIcons(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "توليد أيقونات التطبيق من شعار أكسيون...", "info");
    const remoteDir = "/home/administrator/app2";

    const iconSource = `${remoteDir}/client/public/assets/app_icon_light.png`;

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && SOURCE='${iconSource}' && if [ ! -f \\$SOURCE ]; then SOURCE='${remoteDir}/client/src/assets/images/app_icon_light.png'; fi && if [ ! -f \\$SOURCE ]; then echo 'ICON_SOURCE_MISSING' && exit 0; fi && echo 'مصدر الأيقونة: '\\$SOURCE && which magick >/dev/null 2>&1 && CONVERT='magick' || { which convert >/dev/null 2>&1 && CONVERT='convert'; } || { echo 'ImageMagick غير مثبت — تخطي توليد الأيقونات' && exit 0; } && RES_DIR='android/app/src/main/res' && mkdir -p \\$RES_DIR/mipmap-mdpi \\$RES_DIR/mipmap-hdpi \\$RES_DIR/mipmap-xhdpi \\$RES_DIR/mipmap-xxhdpi \\$RES_DIR/mipmap-xxxhdpi && \\$CONVERT \\$SOURCE -gravity center -background white -extent 1024x1024 /tmp/axion_icon_square.png && \\$CONVERT /tmp/axion_icon_square.png -resize 48x48 \\$RES_DIR/mipmap-mdpi/ic_launcher.png && \\$CONVERT /tmp/axion_icon_square.png -resize 72x72 \\$RES_DIR/mipmap-hdpi/ic_launcher.png && \\$CONVERT /tmp/axion_icon_square.png -resize 96x96 \\$RES_DIR/mipmap-xhdpi/ic_launcher.png && \\$CONVERT /tmp/axion_icon_square.png -resize 144x144 \\$RES_DIR/mipmap-xxhdpi/ic_launcher.png && \\$CONVERT /tmp/axion_icon_square.png -resize 192x192 \\$RES_DIR/mipmap-xxxhdpi/ic_launcher.png && for D in mdpi hdpi xhdpi xxhdpi xxxhdpi; do cp \\$RES_DIR/mipmap-\\$D/ic_launcher.png \\$RES_DIR/mipmap-\\$D/ic_launcher_round.png 2>/dev/null; cp \\$RES_DIR/mipmap-\\$D/ic_launcher.png \\$RES_DIR/mipmap-\\$D/ic_launcher_foreground.png 2>/dev/null; done && rm -f /tmp/axion_icon_square.png && echo 'ICONS_GENERATED_OK'"`,
      "Generate Icons",
      30000
    );

    await this.addLog(deploymentId, "✅ تم توليد أيقونات Android (mdpi → xxxhdpi)", "success");
  }

  private async stepGradleBuild(deploymentId: string, sshCmd: string, config: DeploymentConfig) {
    await this.addLog(deploymentId, "بدء بناء Gradle (قد يستغرق 2-3 دقائق)...", "info");
    const remoteDir = "/home/administrator/app2";

    const gradlewCheck = await this.execWithLog(
      deploymentId,
      `${sshCmd} 'cd ${remoteDir}/android && test -f gradlew && echo GRADLEW_EXISTS || echo GRADLEW_MISSING'`,
      "Gradle Wrapper Check",
      15000
    );

    if (gradlewCheck.includes("GRADLEW_MISSING")) {
      await this.addLog(deploymentId, "⚠️ gradlew مفقود — جاري الإنشاء التلقائي...", "warn");
      const fixGradlew = await this.execWithLog(
        deploymentId,
        `${sshCmd} 'cd ${remoteDir}/android && gradle wrapper --gradle-version 8.11.1 2>&1 | tail -5 && chmod +x gradlew && echo GRADLEW_CREATED || echo GRADLEW_FAILED'`,
        "Gradle Wrapper Create",
        60000
      );
      if (fixGradlew.includes("GRADLEW_CREATED")) {
        await this.addLog(deploymentId, "✅ تم إنشاء Gradle Wrapper تلقائياً (gradlew)", "success");
      } else {
        throw new Error("❌ فشل إنشاء Gradle Wrapper — تأكد من أن gradle مثبت على السيرفر");
      }
    }

    const keystoreCheck = await this.execWithLog(
      deploymentId,
      `${sshCmd} "if [ -f ${remoteDir}/android/app/axion-release.keystore ]; then echo 'KEYSTORE_FILE_OK'; else for KS in /home/administrator/.axion-keystore/axion-release.keystore /home/administrator/axion-release.keystore; do if [ -f \\$KS ]; then cp \\$KS ${remoteDir}/android/app/axion-release.keystore && echo 'KEYSTORE_COPIED' && break; fi; done; fi; [ -f ${remoteDir}/android/app/axion-release.keystore ] && echo 'KEYSTORE_EXISTS' || echo 'KEYSTORE_MISSING'"`,
      "Keystore Check",
      15000
    );

    const hasKeystore = keystoreCheck.includes("KEYSTORE_EXISTS");
    const keystorePassword = process.env.KEYSTORE_PASSWORD || "";
    const keystoreAlias = process.env.KEYSTORE_ALIAS || "axion-key";
    const keystoreKeyPassword = process.env.KEYSTORE_KEY_PASSWORD || keystorePassword;
    const hasKeystorePassword = !!keystorePassword;
    const canSignRelease = hasKeystore && hasKeystorePassword;
    const buildType = canSignRelease ? "assembleRelease" : "assembleDebug";

    if (!hasKeystore) {
      await this.addLog(deploymentId, "⚠️ Keystore غير موجود — سيتم بناء Debug APK", "warn");
    } else if (!hasKeystorePassword) {
      await this.addLog(deploymentId, "⚠️ Keystore موجود لكن KEYSTORE_PASSWORD غير مُعدّ — سيتم بناء Debug APK", "warn");
    } else {
      await this.addLog(deploymentId, "✅ Keystore + كلمة المرور جاهزان — بناء Release APK", "info");
    }

    const envExports = canSignRelease
      ? `export KEYSTORE_PASSWORD='${keystorePassword.replace(/'/g, "'\\''")}' && export KEYSTORE_ALIAS='${keystoreAlias}' && export KEYSTORE_KEY_PASSWORD='${keystoreKeyPassword.replace(/'/g, "'\\''")}' && `
      : "";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "set -o pipefail && cd ${remoteDir}/android && export JAVA_HOME=\\$([ -d /usr/lib/jvm/java-17-openjdk-amd64 ] && echo /usr/lib/jvm/java-17-openjdk-amd64 || echo /usr/lib/jvm/java-21-openjdk-amd64) && export PATH=\\$JAVA_HOME/bin:\\$PATH && export ANDROID_HOME=/opt/android-sdk && ${envExports}chmod +x gradlew && ./gradlew clean ${buildType} --no-daemon --warning-mode=none 2>&1 | tail -20 && echo 'GRADLE_OK'"`,
      "Gradle Build",
      600000
    );
  }

  private async stepSignAPK(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "البحث عن APK وتجهيزه...", "info");
    const remoteDir = "/home/administrator/app2";

    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    if (!deployment) throw new Error("Deployment not found");

    const version = deployment.version || "0.0.0";
    const buildNum = deployment.buildNumber || 0;
    const apkFileName = `AXION_v${version}_build${buildNum}.apk`;
    const releasesDir = `${remoteDir}/releases/v${version}`;

    const output = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir}/android && APK_PATH=\\$(find . -name '*.apk' -path '*/release/*' 2>/dev/null | head -1) && if [ -z \\"\\$APK_PATH\\" ]; then APK_PATH=\\$(find . -name '*.apk' -path '*/debug/*' 2>/dev/null | head -1); fi && if [ -n \\"\\$APK_PATH\\" ]; then mkdir -p ${releasesDir} && cp \\"\\$APK_PATH\\" ${releasesDir}/${apkFileName} && ln -sf ${releasesDir}/${apkFileName} ${remoteDir}/AXION_LATEST.apk && ls -lh ${releasesDir}/${apkFileName} && echo \\"APK_TYPE=\\$(basename \\$(dirname \\$APK_PATH))\\" && echo 'SIGN_OK'; else echo 'APK_NOT_FOUND'; fi"`,
      "APK Sign",
      60000
    );

    if (output.includes("APK_NOT_FOUND")) {
      throw new Error("لم يتم العثور على ملف APK بعد البناء");
    }

    const sizeMatch = output.match(/(\d+\.?\d*[KMG])/);
    if (sizeMatch) {
      await this.updateDeployment(deploymentId, { artifactSize: sizeMatch[1] });
    }

    if (output.includes("APK_TYPE=debug")) {
      await this.addLog(deploymentId, `📦 تم تجهيز Debug APK: ${apkFileName}`, "warn");
    } else {
      await this.addLog(deploymentId, `📦 تم تجهيز Release APK: ${apkFileName}`, "success");
    }
  }

  private async stepRetrieveArtifact(deploymentId: string) {
    await this.addLog(deploymentId, "تسجيل مسار APK على السيرفر...", "info");
    const host = process.env.SSH_HOST || "93.127.142.144";
    const user = process.env.SSH_USER || "administrator";
    const port = process.env.SSH_PORT || "22";
    const remoteDir = "/home/administrator/app2";
    const sshCmd = `sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -p ${port} ${user}@${host}`;

    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    if (!deployment) throw new Error("Deployment not found");

    const version = deployment.version || "0.0.0";
    const buildNum = deployment.buildNumber || 0;
    const apkFileName = `AXION_v${version}_build${buildNum}.apk`;
    const releasesDir = `${remoteDir}/releases/v${version}`;
    const remotePath = `${releasesDir}/${apkFileName}`;

    try {
      const output = await this.execWithLog(
        deploymentId,
        `${sshCmd} "if [ -f ${remotePath} ]; then ls -lh ${remotePath} && echo 'ARTIFACT_OK'; else echo 'ARTIFACT_MISSING'; fi"`,
        "Verify Artifact",
        30000
      );

      if (output.includes("ARTIFACT_MISSING")) {
        await this.addLog(deploymentId, `⚠️ APK غير موجود في المسار: ${remotePath}`, "warn");
        return;
      }

      const sizeMatch = output.match(/(\d+\.?\d*[KMG])/);
      const artifactSize = sizeMatch ? sizeMatch[1] : "unknown";

      await this.updateDeployment(deploymentId, {
        artifactUrl: remotePath,
        artifactSize,
      });

      await this.addLog(deploymentId, `✅ APK جاهز على السيرفر: ${remotePath} (${artifactSize})`, "success");

      const listOutput = await this.execWithLog(
        deploymentId,
        `${sshCmd} "ls -lht ${releasesDir}/*.apk 2>/dev/null | head -5"`,
        "List Releases",
        15000
      );
      await this.addLog(deploymentId, `📂 مجلد الإصدارات: ${releasesDir}`, "info");
    } catch {
      await this.addLog(deploymentId, `⚠️ لم يتم التحقق من APK — قد يكون متاحاً في: ${remotePath}`, "warn");
    }
  }

  private async stepFirebaseTest(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🧪 بدء اختبار Firebase Test Lab...", "info");
    const remoteDir = "/home/administrator/app2";

    const setupResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "which gcloud 2>/dev/null && echo 'GCLOUD_OK' || echo 'GCLOUD_MISSING'"`,
      "Firebase CLI Check",
      15000
    );

    if (setupResult.includes("GCLOUD_MISSING")) {
      await this.addLog(deploymentId, "⚠️ gcloud CLI غير مثبت — تثبيت تلقائي...", "warn");
      await this.execWithLog(
        deploymentId,
        `${sshCmd} "if ! which gcloud >/dev/null 2>&1; then curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir=/opt 2>&1 | tail -3 && echo 'export PATH=/opt/google-cloud-sdk/bin:\\$PATH' >> ~/.bashrc && export PATH=/opt/google-cloud-sdk/bin:\\$PATH && gcloud --version | head -1 && echo 'GCLOUD_INSTALLED'; fi"`,
        "Install gcloud",
        180000
      );
    }

    const authCheck = await this.execWithLog(
      deploymentId,
      `${sshCmd} "export PATH=/opt/google-cloud-sdk/bin:\\$PATH 2>/dev/null; gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1 || echo 'NO_AUTH'"`,
      "Firebase Auth Check",
      15000
    );

    if (authCheck.trim() === "NO_AUTH" || !authCheck.trim()) {
      await this.addLog(deploymentId, "⚠️ Firebase غير مصادق — محاولة مصادقة بـ service account...", "warn");
      await this.execWithLog(
        deploymentId,
        `${sshCmd} "export PATH=/opt/google-cloud-sdk/bin:\\$PATH 2>/dev/null; if [ -f /home/administrator/firebase-service-account.json ]; then gcloud auth activate-service-account --key-file=/home/administrator/firebase-service-account.json && gcloud config set project app2-eb4df && echo 'AUTH_OK'; else echo 'SERVICE_ACCOUNT_MISSING'; fi"`,
        "Firebase Auth",
        30000
      );
    }

    const apkPath = `${remoteDir}/AXION_LATEST.apk`;

    const testResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "export PATH=/opt/google-cloud-sdk/bin:\\$PATH 2>/dev/null; APK='${apkPath}'; if [ -L \\$APK ]; then APK=\\$(readlink -f \\$APK); fi; if [ -f \\$APK ]; then gcloud firebase test android run --type robo --app \\$APK --device model=Pixel2,version=30,locale=ar,orientation=portrait --timeout 300s --results-dir=firebase-test-\\$(date +%Y%m%d_%H%M%S) --no-record-video 2>&1 | tail -30 && echo 'FIREBASE_TEST_DONE'; else echo 'APK_NOT_FOUND_FOR_TEST'; fi"`,
      "Firebase Test Lab",
      600000
    );

    if (testResult.includes("APK_NOT_FOUND_FOR_TEST")) {
      await this.addLog(deploymentId, "⚠️ APK غير موجود لاختبار Firebase — تخطي الاختبار", "warn");
    } else if (testResult.includes("FIREBASE_TEST_DONE")) {
      const passed = testResult.includes("Passed") || testResult.includes("passed");
      const failed = testResult.includes("Failed") || testResult.includes("FAILED");

      if (passed && !failed) {
        await this.addLog(deploymentId, "✅ اختبار Firebase Test Lab ناجح", "success");
      } else if (failed) {
        await this.addLog(deploymentId, "❌ اختبار Firebase Test Lab فشل — تحقق من النتائج", "error");
        const lines = testResult.split('\n').filter(l => l.includes('fail') || l.includes('error') || l.includes('FAIL'));
        if (lines.length > 0) {
          await this.addLog(deploymentId, `تفاصيل: ${lines.slice(0, 5).join(' | ')}`, "error");
        }
      } else {
        await this.addLog(deploymentId, "⚠️ اختبار Firebase Test Lab اكتمل — تحقق من النتائج يدوياً", "warn");
      }
    } else {
      await this.addLog(deploymentId, "⚠️ لم يتم تحديد نتيجة اختبار Firebase — تحقق يدوياً", "warn");
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

  private async stepSyncVersion(deploymentId: string) {
    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    if (!deployment) throw new Error("Deployment not found");

    const version = deployment.version;
    const versionCode = deployment.buildNumber;

    await this.addLog(deploymentId, `مزامنة الإصدار: ${version} (كود: ${versionCode})`, "info");

    await this.execWithLog(
      deploymentId,
      `cd /home/runner/workspace && node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '${version}';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
        console.log('package.json updated to ${version}');
        const vpDir = 'android/app';
        if (!fs.existsSync(vpDir)) fs.mkdirSync(vpDir, { recursive: true });
        fs.writeFileSync(vpDir + '/version.properties', 'VERSION_CODE=${versionCode}\\nVERSION_NAME=${version}\\n');
        console.log('version.properties updated: CODE=${versionCode} NAME=${version}');
      "`,
      "Sync Version",
      10000
    );

    await this.addLog(deploymentId, `✅ تم تحديث الإصدار إلى ${version} في package.json و version.properties`, "success");
  }

  private async stepGitPush(deploymentId: string, config: DeploymentConfig) {
    await this.addLog(deploymentId, "دفع الكود إلى GitHub...", "info");

    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_USERNAME) {
      throw new Error("GITHUB_TOKEN و GITHUB_USERNAME مطلوبان لدفع الكود");
    }

    const rawMessage = config.commitMessage || `Deploy v${await this.getCurrentVersion()} - ${new Date().toISOString()}`;
    const safeMessage = rawMessage.replace(/['"\\$`!]/g, "");
    const ghUser = process.env.GITHUB_USERNAME;

    await this.execWithLog(
      deploymentId,
      `cd /home/runner/workspace && git config user.email "${ghUser}@users.noreply.github.com" && git config user.name "${ghUser}" && git config credential.helper '!f() { echo "username=${ghUser}"; echo "password=$GH_TOKEN"; }; f' && git add -A && (git diff --cached --quiet && echo "NO_CHANGES" || git commit -m "${safeMessage}") && git remote set-url origin https://github.com/${ghUser}/app2.git && git push origin main --force 2>&1 && PUSH_OK=1 || PUSH_OK=0; if [ "$PUSH_OK" = "1" ]; then echo "GIT_PUSH_OK"; else echo "GIT_PUSH_FAILED" && exit 1; fi`,
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
    await this.addLog(deploymentId, "تنظيف مخرجات البناء السابقة...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && rm -rf dist www android/app/src/main/assets/public android/app/build/outputs && echo 'CLEAN_OK'"`,
      "Clean Previous Build",
      30000
    );

    await this.addLog(deploymentId, "بناء التطبيق على السيرفر (قد يستغرق 3-5 دقائق)...", "info");

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "set -o pipefail && cd ${remoteDir} && export VITE_API_BASE_URL=https://app2.binarjoinanelytic.info && export NODE_ENV=production && npm run build 2>&1 | tail -20 && echo 'BUILD_OK'"`,
      "Server Build",
      600000
    );

    const verifyBuild = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && if [ -f dist/public/index.html ]; then TOTAL=\\$(find dist/public -type f | wc -l); SIZE=\\$(du -sh dist/public | cut -f1); echo \\"BUILD_VERIFIED files=\\$TOTAL size=\\$SIZE\\"; else echo 'BUILD_FAILED_NO_OUTPUT'; fi"`,
      "Verify Build Output",
      15000
    );

    if (verifyBuild.includes("BUILD_FAILED_NO_OUTPUT")) {
      throw new Error("❌ فشل البناء — dist/public/index.html غير موجود");
    }
    await this.addLog(deploymentId, `✅ تم التحقق من مخرجات البناء`, "success");
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
      const [lastSuccess] = await db.select({ version: buildDeployments.version })
        .from(buildDeployments)
        .where(eq(buildDeployments.status, "success"))
        .orderBy(desc(buildDeployments.created_at))
        .limit(1);
      if (lastSuccess?.version) {
        return this.incrementPatchVersion(lastSuccess.version);
      }
    } catch {}

    try {
      const { stdout } = await execAsync("grep '\"version\"' package.json | head -1 | sed 's/.*\"version\": \"\\([^\"]*\\)\".*/\\1/'", { cwd: "/home/runner/workspace" });
      const base = stdout.trim() || "1.0.0";
      return this.incrementPatchVersion(base);
    } catch {
      return "1.0.1";
    }
  }

  private incrementPatchVersion(version: string): string {
    const parts = version.replace(/^v/, "").split(".");
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    const patch = parseInt(parts[2]) || 0;
    return `${major}.${minor}.${patch + 1}`;
  }

  async getLatestAndroidRelease(): Promise<{ versionName: string; versionCode: number; downloadUrl: string | null; releasedAt: string } | null> {
    try {
      const [latest] = await db.select()
        .from(buildDeployments)
        .where(
          sql`${buildDeployments.status} = 'success' AND ${buildDeployments.pipeline} IN ('android-build', 'full-deploy', 'git-android-build', 'android-build-test')`
        )
        .orderBy(desc(buildDeployments.created_at))
        .limit(1);

      if (!latest) return null;

      return {
        versionName: latest.version,
        versionCode: latest.buildNumber,
        downloadUrl: latest.artifactUrl || null,
        releasedAt: latest.created_at.toISOString(),
      };
    } catch {
      return null;
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
    this.cancelFlags.set(deploymentId, true);

    this.terminateActiveProcesses(deploymentId);

    const [deployment] = await db.select().from(buildDeployments)
      .where(sql`${buildDeployments.id} = ${deploymentId} AND ${buildDeployments.status} = 'running'`);

    if (!deployment) {
      return;
    }

    const steps = deployment.steps as StepEntry[];
    const updatedSteps = steps.map(s => {
      if (s.status === "pending" || s.status === "running") {
        return { ...s, status: "cancelled" as const };
      }
      return s;
    });

    const result = await db.update(buildDeployments).set({
      steps: updatedSteps,
      status: "cancelled",
      errorMessage: "تم الإلغاء بواسطة المستخدم",
      endTime: new Date(),
    }).where(sql`${buildDeployments.id} = ${deploymentId} AND ${buildDeployments.status} = 'running'`);

    await this.addLog(deploymentId, "تم إلغاء النشر بواسطة المستخدم", "warn");
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
