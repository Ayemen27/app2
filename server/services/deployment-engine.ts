import { db } from "../db.js";
import { buildDeployments, deploymentEvents } from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { exec, spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, accessSync, unlinkSync, constants as fsConstants } from "fs";
import { dirname } from "path";
import { createHmac } from "crypto";
import type { Response } from "express";
import { DeploymentNotificationPublisher } from "./deployment-notifications/DeploymentNotificationPublisher.js";
import { DeploymentPayloadBuilder } from "./deployment-notifications/builders/deploymentPayloadBuilder.js";
import { TelegramDeploymentProvider } from "./deployment-notifications/providers/TelegramDeploymentProvider.js";
import { DeploymentLogger } from "./deployment-logger.js";
import {
  type Pipeline, type BuildTarget,
  getPipelineSteps, getStepTimeout, getStepRetryPolicy,
  resolvePipeline, validatePipeline, isPipelineSupported, listAvailablePipelines,
  PIPELINE_ALIASES
} from "../config/pipeline-definitions.js";

const execAsync = promisify(exec);

type LogEntry = { timestamp: string; message: string; type: "info" | "error" | "success" | "warn" | "step" };
type StepEntry = { name: string; status: "pending" | "running" | "success" | "failed" | "cancelled"; duration?: number; startedAt?: string; subProgress?: number; subMessage?: string };

class CancellationError extends Error {
  constructor(message = "Deployment cancelled by user") {
    super(message);
    this.name = "CancellationError";
  }
}

interface DeploymentConfig {
  pipeline: Pipeline;
  appType: "web" | "android";
  environment: "production" | "staging";
  branch?: string;
  commitMessage?: string;
  triggeredBy?: string;
  version?: string;
  buildTarget?: "server" | "local";
  originalPipeline?: string;
  deployerToken?: string;
  releaseNotes?: string;
}

export { Pipeline, BuildTarget, isPipelineSupported, listAvailablePipelines };

const activeSSEClients = new Map<string, Response[]>();
const globalSSEClients = new Set<Response>();

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

function broadcastGlobalEvent(event: { type: string; deploymentId: string; data: any }) {
  const dead: Response[] = [];
  globalSSEClients.forEach(res => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      dead.push(res);
    }
  });
  dead.forEach(r => globalSSEClients.delete(r));
}

function registerGlobalSSEClient(res: Response) {
  globalSSEClients.add(res);
  res.on("close", () => globalSSEClients.delete(res));
}


export class DeploymentEngine {
  private cancelFlags = new Map<string, boolean>();
  private activeProcesses = new Map<string, Set<ChildProcess>>();
  private logBuffers = new Map<string, LogEntry[]>();
  private logFlushTimers = new Map<string, NodeJS.Timeout>();
  private static LOG_FLUSH_INTERVAL = 2000;
  private notificationPublisher: DeploymentNotificationPublisher;
  private providersRegistered = false;
  private deploymentLoggers = new Map<string, DeploymentLogger>();
  private remoteMonitors = new Map<string, NodeJS.Timeout>();
  private recoverySupervisorTimer: NodeJS.Timeout | null = null;
  private static RECOVERY_INTERVAL = 30000;
  private healthCheckResults = new Map<string, Record<string, any>>();
  private cleanupResults = new Map<string, { totalReclaimedBytes: number; steps: { name: string; reclaimedBytes: number; detail: string }[]; errors: string[] }>();
  private heartbeats = new Map<string, number>();
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();
  private static HEARTBEAT_INTERVAL = 8000;
  private static HEARTBEAT_STALE_THRESHOLD = 45000;

  constructor() {
    this.notificationPublisher = DeploymentNotificationPublisher.getInstance();
  }

  startRecoverySupervisor() {
    if (this.recoverySupervisorTimer) return;
    this.recoverySupervisorTimer = setInterval(async () => {
      try {
        const orphaned = await db.select().from(buildDeployments)
          .where(eq(buildDeployments.status, "running"));
        if (orphaned.length === 0) return;

        for (const d of orphaned) {
          if (this.remoteMonitors.has(d.id)) continue;
          if (this.isDeploymentLocallyActive(d.id)) continue;
          if (this.isHeartbeatAlive(d.id)) continue;

          const steps = Array.isArray(d.steps) ? d.steps as StepEntry[] : [];
          const runningStep = steps.find(s => s.status === "running");
          const stepStartedAt = runningStep?.startedAt ? new Date(runningStep.startedAt).getTime() : 0;
          const stepAge = stepStartedAt > 0 ? Date.now() - stepStartedAt : 0;
          const deploymentAge = Date.now() - new Date(d.created_at!).getTime();
          const isRemote = this.isRemoteStep(d.currentStep || '');

          if (isRemote) {
            console.log(`[RecoverySupervisor] Found orphaned deployment #${d.buildNumber} without monitor — starting one`);
            this.startRemoteMonitor(d);
          } else {
            const effectiveAge = stepAge > 0 ? stepAge : deploymentAge;
            const maxAge = 120000;
            if (effectiveAge > maxAge) {
              const recoveredSteps = steps.map(s => {
                if (s.status === "running") return { ...s, status: "failed" as const };
                return s;
              });
              const casDone = await this.casUpdateStatus(d.id, "running", {
                status: "failed",
                errorMessage: "توقفت العملية بعد إعادة تشغيل الخادم (خطوة محلية)",
                endTime: new Date(),
                duration: deploymentAge,
                steps: recoveredSteps,
              });
              if (casDone) {
                broadcastGlobalEvent({ type: "deployment_completed", deploymentId: d.id, data: { status: "failed" } });
                console.log(`[RecoverySupervisor] ❌ Marked local-step deployment #${d.buildNumber} as failed (step age: ${Math.round(effectiveAge / 1000)}s)`);
              }
            }
          }
        }
      } catch (err) {
        console.error("[RecoverySupervisor] Error:", err);
      }
    }, DeploymentEngine.RECOVERY_INTERVAL);
    console.log("[DeploymentEngine] 🔄 Recovery supervisor started (every 30s)");
  }

  private getLogger(deploymentId: string): DeploymentLogger {
    if (!this.deploymentLoggers.has(deploymentId)) {
      this.deploymentLoggers.set(deploymentId, new DeploymentLogger(deploymentId));
    }
    return this.deploymentLoggers.get(deploymentId)!;
  }

  private cleanupLogger(deploymentId: string) {
    this.deploymentLoggers.delete(deploymentId);
  }

  private resolveBaseUrl(config?: DeploymentConfig): string {
    if (config?.environment === "staging") {
      return process.env.STAGING_URL || process.env.PRODUCTION_URL || "https://app2.binarjoinanelytic.info";
    }
    return process.env.PRODUCTION_URL || "https://app2.binarjoinanelytic.info";
  }

  private async waitForServerReady(deploymentId: string, baseUrl: string, maxWaitMs = 90000, intervalMs = 5000): Promise<boolean> {
    await this.addLog(deploymentId, `⏳ انتظار جاهزية السيرفر (${baseUrl})...`, "info");
    const start = Date.now();
    let attempt = 0;

    while (Date.now() - start < maxWaitMs) {
      attempt++;
      try {
        const { stdout } = await execAsync(
          `curl -s -o /dev/null -w '%{http_code}' --max-time 10 ${baseUrl}/api/health`,
          { timeout: 15000 }
        );
        const status = stdout.trim().replace(/'/g, "");
        if (status === "200") {
          await this.addLog(deploymentId, `✅ السيرفر جاهز (محاولة ${attempt}, ${((Date.now() - start) / 1000).toFixed(1)}ث)`, "success");
          return true;
        }
        const infraCodes = ["502", "503", "504"];
        if (infraCodes.includes(status)) {
          await this.addLog(deploymentId, `⏳ السيرفر يبدأ... HTTP ${status} (محاولة ${attempt})`, "info");
        } else {
          await this.addLog(deploymentId, `⚠️ السيرفر أرجع HTTP ${status} (محاولة ${attempt})`, "warn");
        }
      } catch {
        await this.addLog(deploymentId, `⏳ السيرفر لا يستجيب بعد (محاولة ${attempt})`, "info");
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }

    await this.addLog(deploymentId, `⚠️ السيرفر لم يصبح جاهزاً خلال ${maxWaitMs / 1000}ث`, "warn");
    return false;
  }

  private ensureProvidersRegistered() {
    if (this.providersRegistered) return;
    this.providersRegistered = true;
    this.notificationPublisher.registerProvider(new TelegramDeploymentProvider());
  }

  private isCancelled(deploymentId: string): boolean {
    return this.cancelFlags.get(deploymentId) === true;
  }

  private async markRemainingStepsCancelled(deploymentId: string, currentStepIndex: number, pipelineSteps: string[]) {
    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    if (!deployment) return;

    const steps = (Array.isArray(deployment.steps) ? deployment.steps as StepEntry[] : []).map((s, idx) => {
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
    this.flushLogs(deploymentId).catch(() => {});
    const timer = this.logFlushTimers.get(deploymentId);
    if (timer) clearTimeout(timer);
    this.logFlushTimers.delete(deploymentId);
    this.logBuffers.delete(deploymentId);
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

  private static LOCAL_ONLY_STEPS = new Set<string>([
    'validate', 'preflight-check', 'sync-version', 'git-push', 'build-web',
    'verify', 'prebuild-gate', 'android-readiness', 'apk-integrity', 'post-deploy-smoke',
    'hc-evaluate', 'cl-summary'
  ]);

  private isRemoteStep(stepName: string): boolean {
    return !DeploymentEngine.LOCAL_ONLY_STEPS.has(stepName);
  }

  private isDeploymentLocallyActive(deploymentId: string): boolean {
    const procs = this.activeProcesses.get(deploymentId);
    return !!procs && procs.size > 0;
  }

  async recoverOrphanedDeployments() {
    try {
      const orphaned = await db.select().from(buildDeployments)
        .where(eq(buildDeployments.status, "running"));

      if (orphaned.length === 0) return;

      console.log(`[DeploymentEngine] وُجدت ${orphaned.length} عملية نشر بحالة "running" — بدء التحقق الذكي...`);

      for (const d of orphaned) {
        if (this.isDeploymentLocallyActive(d.id)) {
          console.log(`[DeploymentEngine] ⏭️ Deployment #${d.buildNumber} has active local processes — skipping recovery`);
          continue;
        }

        const deploymentAge = Date.now() - new Date(d.created_at!).getTime();
        const steps = Array.isArray(d.steps) ? d.steps as StepEntry[] : [];
        const runningStep = steps.find(s => s.status === "running");
        const stepStartedAt = runningStep?.startedAt ? new Date(runningStep.startedAt).getTime() : 0;
        const effectiveAge = stepStartedAt > 0 ? Date.now() - stepStartedAt : deploymentAge;
        const isRemote = this.isRemoteStep(d.currentStep || '');
        let verified: "success" | "still_running" | "unknown" = "unknown";

        if (isRemote) {
          verified = await this.verifyRemoteDeploymentStatus(d);

          if (verified === "success") {
            await this.handleRecoveredSuccess(d, deploymentAge);
            console.log(`[DeploymentEngine] ✅ Deployment #${d.buildNumber} verified SUCCESS on remote server`);
            continue;
          }

          if (verified === "still_running" || verified === "unknown") {
            const label = verified === "still_running" ? "لا يزال يعمل" : "حالة غير مؤكدة";
            console.log(`[DeploymentEngine] ⏳ Deployment #${d.buildNumber} ${verified} — starting background monitor`);
            await this.addLog(d.id, `⚠️ أُعيد تشغيل الخادم — يُراقَب النشر عن بُعد تلقائياً (${label})...`, "warn");
            this.startRemoteMonitor(d);
            continue;
          }
        }

        const maxAge = isRemote ? 1800000 : 120000;
        if (effectiveAge > maxAge) {
          const recoveredSteps = (Array.isArray(d.steps) ? d.steps as StepEntry[] : []).map(s => {
            if (s.status === "running") return { ...s, status: "failed" as const };
            return s;
          });
          const casDone = await this.casUpdateStatus(d.id, "running", {
            status: "failed",
            errorMessage: "توقفت العملية بسبب انتهاء المهلة الزمنية",
            endTime: new Date(),
            duration: deploymentAge,
            steps: recoveredSteps,
          });

          if (casDone) {
            await db.insert(deploymentEvents).values({
              deploymentId: d.id,
              eventType: "deployment_failed",
              message: "توقفت العملية بسبب انتهاء المهلة الزمنية (recovery)",
              metadata: { recoveredAt: new Date().toISOString(), lastStep: d.currentStep, stepAge: effectiveAge, deploymentAge },
            });

            broadcastGlobalEvent({ type: "deployment_completed", deploymentId: d.id, data: { status: "failed" } });
            console.log(`[DeploymentEngine] ❌ Deployment #${d.buildNumber} timed out (step age: ${Math.round(effectiveAge / 1000)}s, deployment age: ${Math.round(deploymentAge / 60000)}min)`);
          }
        } else {
          console.log(`[DeploymentEngine] ⏳ Deployment #${d.buildNumber} effectiveAge=${Math.round(effectiveAge / 1000)}s — starting background monitor`);
          this.startRemoteMonitor(d);
        }
      }
    } catch (err) {
      console.error("[DeploymentEngine] Error recovering orphaned deployments:", err);
    }
  }

  private async handleRecoveredSuccess(d: any, age: number) {
    const steps = Array.isArray(d.steps) ? d.steps as StepEntry[] : [];
    const currentStepIdx = steps.findIndex(s => s.name === d.currentStep);

    if (currentStepIdx === -1) {
      console.log(`[DeploymentEngine] handleRecoveredSuccess: currentStep "${d.currentStep}" not found in steps — marking all as success`);
    }

    const hasRemainingSteps = currentStepIdx >= 0 && steps.some((s, idx) => idx > currentStepIdx && s.status === "pending");

    if (hasRemainingSteps && currentStepIdx >= 0) {
      const updatedSteps = steps.map((s, idx) => {
        if (idx <= currentStepIdx && (s.status === "running" || s.status === "pending")) {
          return { ...s, status: "success" as const };
        }
        return s;
      });
      await db.update(buildDeployments).set({
        steps: updatedSteps,
        currentStep: steps[currentStepIdx].name,
      }).where(eq(buildDeployments.id, d.id));

      await this.addLog(d.id, "✅ تم التحقق من نجاح الخطوة الحالية — استئناف الخطوات المتبقية...", "info");

      const config: DeploymentConfig = {
        pipeline: d.pipeline as Pipeline,
        appType: d.appType as "web" | "android",
        environment: (d.environment as "production" | "staging") || "production",
        branch: d.branch || "main",
        version: d.version || undefined,
        triggeredBy: d.triggeredBy || undefined,
        buildTarget: ((d as any).buildTarget as "server" | "local") || "server",
        deployerToken: (d as any).deployerToken || undefined,
      };

      this.runPipelineFromStep(d.id, config, currentStepIdx + 1).catch(err => {
        console.error(`[DeploymentEngine] Recovery resume error for ${d.id}:`, err);
      });
    } else {
      const recoveredSteps = steps.map(s => {
        if (s.status === "running" || s.status === "pending") return { ...s, status: "success" as const };
        return s;
      });
      const casDone = await this.casUpdateStatus(d.id, "running", {
        status: "success",
        errorMessage: null,
        endTime: new Date(),
        duration: age,
        steps: recoveredSteps,
        currentStep: "done",
      });

      if (!casDone) {
        console.log(`[DeploymentEngine] handleRecoveredSuccess CAS failed for ${d.id} — already transitioned`);
        return;
      }

      await db.insert(deploymentEvents).values({
        deploymentId: d.id,
        eventType: "deployment_success",
        message: "✅ تم التحقق: النشر اكتمل بنجاح على الخادم البعيد (استرداد تلقائي)",
        metadata: { recoveredAt: new Date().toISOString(), lastStep: d.currentStep, verifiedRemotely: true },
      });

      broadcastGlobalEvent({ type: "deployment_completed", deploymentId: d.id, data: { status: "success" } });
    }
  }

  private startRemoteMonitor(deployment: any) {
    const id = deployment.id;
    if (this.remoteMonitors.has(id)) return;

    const checkInterval = 30000;
    let checkCount = 0;
    const maxChecks = 60;
    let checkInFlight = false;

    const check = async () => {
      if (checkInFlight) return;
      checkInFlight = true;
      checkCount++;
      try {
        const [freshDeployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, id));
        if (!freshDeployment || freshDeployment.status !== "running") {
          console.log(`[DeploymentEngine] 🔍 Remote monitor: Deployment ${id} no longer running (${freshDeployment?.status}) — stopping`);
          if (freshDeployment?.status === "cancelled") {
            this.killRemoteBuildProcess(id).catch(() => {});
          }
          this.stopRemoteMonitor(id);
          return;
        }

        const verified = await this.verifyRemoteDeploymentStatus(freshDeployment);
        const age = Date.now() - new Date(freshDeployment.created_at!).getTime();

        if (verified === "success") {
          await this.handleRecoveredSuccess(freshDeployment, age);
          await this.addLog(id, "✅ اكتمل النشر بنجاح على الخادم البعيد (تم الكشف تلقائياً)", "success");
          await this.flushLogs(id);
          console.log(`[DeploymentEngine] ✅ Remote monitor: Deployment #${freshDeployment.buildNumber} completed successfully`);
          this.stopRemoteMonitor(id);
          return;
        }

        if (verified === "still_running") {
          const buildProgress = await this.getRemoteBuildProgress(id);
          if (buildProgress) {
            await this.addLog(id, buildProgress, "info");

            const steps = (freshDeployment.steps as StepEntry[]) || [];
            const currentRunning = steps.find(s => s.status === "running");
            if (currentRunning) {
              const progressPct = Math.min(90, 10 + checkCount * 3);
              this.updateStepProgress(id, currentRunning.name, progressPct, buildProgress.split("\n")[0]);
            }

            if (buildProgress.includes("اكتمل البناء") && buildProgress.includes("موجود")) {
              if (currentRunning?.name === "build-server") {
                const updatedSteps = steps.map(s =>
                  s.name === "build-server" ? { ...s, status: "success" as const, duration: age } : s
                );
                await db.update(buildDeployments).set({ steps: updatedSteps }).where(eq(buildDeployments.id, id));
                broadcastToClients(id, { type: "step_update", data: { stepName: "build-server", status: "success", duration: age } });
                await this.addLog(id, "🔄 المراقب اكتشف اكتمال البناء — سيتم التحقق من النشر الكامل", "success");
              }
            }
            await this.flushLogs(id);
          } else if (checkCount % 2 === 0) {
            await this.addLog(id, `🔄 النشر لا يزال يعمل على الخادم البعيد... (فحص #${checkCount})`, "info");
            await this.flushLogs(id);
          }
          if (checkCount >= maxChecks) {
            const casDone = await this.casUpdateStatus(id, "running", {
              status: "failed",
              errorMessage: "انتهت مهلة المراقبة — النشر لا يزال يعمل لكن تجاوز الحد الزمني",
              endTime: new Date(),
              duration: age,
            });
            if (casDone) {
              await this.addLog(id, "❌ انتهت مهلة المراقبة بعد " + Math.round(age / 60000) + " دقيقة (لا يزال يعمل)", "error");
              await this.flushLogs(id);
              broadcastGlobalEvent({ type: "deployment_completed", deploymentId: id, data: { status: "failed" } });
              console.log(`[DeploymentEngine] ❌ Remote monitor: Deployment #${freshDeployment.buildNumber} still_running but timed out`);
            }
            this.stopRemoteMonitor(id);
            return;
          }
        } else {
          if (checkCount >= maxChecks) {
            const casDone = await this.casUpdateStatus(id, "running", {
              status: "failed",
              errorMessage: "انتهت مهلة المراقبة — لم يُستكمل النشر",
              endTime: new Date(),
              duration: age,
            });
            if (casDone) {
              await this.addLog(id, "❌ انتهت مهلة المراقبة بعد " + Math.round(age / 60000) + " دقيقة", "error");
              await this.flushLogs(id);
              broadcastGlobalEvent({ type: "deployment_completed", deploymentId: id, data: { status: "failed" } });
              console.log(`[DeploymentEngine] ❌ Remote monitor: Deployment #${freshDeployment.buildNumber} timed out`);
            }
            this.stopRemoteMonitor(id);
            return;
          }
        }
      } catch (err) {
        console.error(`[DeploymentEngine] Remote monitor error for ${id}:`, err);
      } finally {
        checkInFlight = false;
      }
    };

    check();
    const timer = setInterval(check, checkInterval);
    this.remoteMonitors.set(id, timer);
    console.log(`[DeploymentEngine] 🔍 Started remote monitor for deployment #${deployment.buildNumber} (check every ${checkInterval / 1000}s, max ${maxChecks} checks)`);
  }

  private async getRemoteBuildProgress(deploymentId: string): Promise<string | null> {
    try {
      await this.ensureSSHKeyProvisioned();
      const sshCmd = this.buildSSHCommand();
      const buildId = deploymentId.substring(0, 8);
      const pidFile = `/tmp/axion_build_${buildId}.pid`;
      const exitFile = `/tmp/axion_build_${buildId}.exit`;
      const logFile = `/tmp/axion_build_${buildId}.log`;
      const remoteDir = "/home/administrator/app2";

      const { stdout } = await execAsync(
        `${sshCmd} "` +
        `BUILD_STATUS='idle'; ` +
        `if [ -f ${exitFile} ]; then ` +
        `  EC=\\$(cat ${exitFile}); ` +
        `  if [ \\$EC -eq 0 ]; then BUILD_STATUS='done'; else BUILD_STATUS=\\"failed:\\$EC\\"; fi; ` +
        `elif [ -f ${pidFile} ] && kill -0 \\$(cat ${pidFile}) 2>/dev/null; then ` +
        `  BUILD_STATUS='building'; ` +
        `fi; ` +
        `LINES=\\$(wc -l < ${logFile} 2>/dev/null || echo 0); ` +
        `LAST=\\$(tail -1 ${logFile} 2>/dev/null || echo ''); ` +
        `PM2=\\$(pm2 jlist 2>/dev/null | python3 -c \\"import sys,json; apps=json.load(sys.stdin); print(','.join([a['name']+':'+a['pm2_env']['status'] for a in apps]))\\" 2>/dev/null || echo 'unknown'); ` +
        `DIST=\\$(test -f ${remoteDir}/dist/public/index.html && echo 'yes' || echo 'no'); ` +
        `echo \\"STATUS:\\$BUILD_STATUS|LINES:\\$LINES|PM2:\\$PM2|DIST:\\$DIST|LAST:\\$LAST\\"` +
        `"`,
        { timeout: 15000, env: { ...process.env, SSHPASS: process.env.SSH_PASSWORD || process.env.SSHPASS || '' } }
      );

      const raw = stdout.trim();
      if (!raw || !raw.includes("STATUS:")) return null;

      const statusMatch = raw.match(/STATUS:([^|]+)/);
      const linesMatch = raw.match(/LINES:(\d+)/);
      const pm2Match = raw.match(/PM2:([^|]+)/);
      const distMatch = raw.match(/DIST:([^|]+)/);
      const lastMatch = raw.match(/LAST:(.+)$/);

      const status = statusMatch?.[1]?.trim() || "unknown";
      const lines = parseInt(linesMatch?.[1] || "0");
      const pm2 = pm2Match?.[1]?.trim() || "unknown";
      const dist = distMatch?.[1]?.trim() === "yes";
      const lastLine = lastMatch?.[1]?.trim()?.substring(0, 150) || "";

      const parts2: string[] = [];

      if (status === "building") {
        parts2.push(`🔨 البناء جارٍ (${lines} سطر في السجل)`);
        if (lastLine) parts2.push(`📄 ${lastLine}`);
      } else if (status === "done") {
        parts2.push(`✅ اكتمل البناء — dist: ${dist ? "موجود" : "مفقود"}`);
      } else if (status.startsWith("failed:")) {
        parts2.push(`❌ فشل البناء (exit ${status.replace("failed:", "")})`);
        if (lastLine) parts2.push(`📄 ${lastLine}`);
      } else {
        parts2.push(`📊 PM2: ${pm2} | dist: ${dist ? "✅" : "❌"}`);
      }

      if (pm2 !== "unknown" && status !== "building") {
        parts2.push(`🔧 PM2: ${pm2}`);
      }

      return parts2.join("\n");
    } catch {
      return null;
    }
  }

  private startHeartbeat(deploymentId: string) {
    this.stopHeartbeat(deploymentId);
    this.heartbeats.set(deploymentId, Date.now());
    const timer = setInterval(() => {
      this.heartbeats.set(deploymentId, Date.now());
    }, DeploymentEngine.HEARTBEAT_INTERVAL);
    this.heartbeatTimers.set(deploymentId, timer);
  }

  private stopHeartbeat(deploymentId: string) {
    const timer = this.heartbeatTimers.get(deploymentId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(deploymentId);
    }
    this.heartbeats.delete(deploymentId);
  }

  private isHeartbeatAlive(deploymentId: string): boolean {
    const lastBeat = this.heartbeats.get(deploymentId);
    if (!lastBeat) return false;
    return (Date.now() - lastBeat) < DeploymentEngine.HEARTBEAT_STALE_THRESHOLD;
  }

  private async casUpdateStatus(
    deploymentId: string,
    expectedStatus: string,
    updates: Record<string, any>
  ): Promise<boolean> {
    const result = await db.update(buildDeployments)
      .set(updates)
      .where(and(eq(buildDeployments.id, deploymentId), eq(buildDeployments.status, expectedStatus)))
      .returning({ id: buildDeployments.id });
    return result.length > 0;
  }

  private stopRemoteMonitor(deploymentId: string) {
    const timer = this.remoteMonitors.get(deploymentId);
    if (timer) {
      clearInterval(timer);
      this.remoteMonitors.delete(deploymentId);
    }
  }

  private async verifyRemoteDeploymentStatus(deployment: any): Promise<"success" | "still_running" | "unknown"> {
    try {
      await this.ensureSSHKeyProvisioned();
      const sshCmd = this.buildSSHCommand();
      const remoteDir = "/home/administrator/app2";
      const version = deployment.version || deployment.versionName || "";
      const buildNum = deployment.buildNumber || deployment.build_number || 0;
      const pipelineType = deployment.pipeline || deployment.pipelineType || "";

      const PIPELINE_WEB_TYPES = new Set(["web-deploy", "full-deploy", "hotfix", "git-push"]);
      const PIPELINE_ANDROID_TYPES = new Set(["android-build", "full-deploy", "git-android-build", "android-build-test"]);
      const PIPELINE_ROLLBACK_TYPE = "rollback";
      const isRollback = pipelineType === PIPELINE_ROLLBACK_TYPE;
      const includesWeb = isRollback ? true : PIPELINE_WEB_TYPES.has(pipelineType);
      const includesAndroid = isRollback ? false : PIPELINE_ANDROID_TYPES.has(pipelineType);

      console.log(`[DeploymentEngine] verifyRemote: v=${version} build=${buildNum} pipeline=${pipelineType} web=${includesWeb} android=${includesAndroid}`);

      let webOk = !includesWeb;
      let androidOk = !includesAndroid;

      if (includesWeb) {
        try {
          const { stdout } = await execAsync(
            `${sshCmd} "pm2 jlist 2>/dev/null | head -1"`,
            { timeout: 15000, env: { ...process.env, SSHPASS: process.env.SSH_PASSWORD || process.env.SSHPASS || '' } }
          );
          const apps = JSON.parse(stdout.trim() || "[]");
          webOk = apps.some((a: any) => a.pm2_env?.status === "online");
        } catch {
          try {
            const { stdout } = await execAsync(
              `${sshCmd} "test -f ${remoteDir}/dist/index.js && echo WEB_OK || echo WEB_MISSING"`,
              { timeout: 10000, env: { ...process.env, SSHPASS: process.env.SSH_PASSWORD || process.env.SSHPASS || '' } }
            );
            webOk = stdout.trim().includes("WEB_OK");
          } catch { /* ignore */ }
        }
      }

      if (includesAndroid) {
        if (!version) {
          console.log(`[DeploymentEngine] verifyRemote: no version — cannot verify Android APK`);
          androidOk = false;
        } else {
          try {
            const exactPattern = buildNum
              ? `AXION_v${version}_build${buildNum}.apk`
              : `AXION_v${version}*.apk`;
            const searchPaths = [
              `${remoteDir}/releases/v${version}/${exactPattern}`,
              `${remoteDir}/releases/${exactPattern}`,
            ].join(" ");
            const { stdout } = await execAsync(
              `${sshCmd} "ls -1t ${searchPaths} 2>/dev/null | head -1 || echo NONE"`,
              { timeout: 10000, env: { ...process.env, SSHPASS: process.env.SSH_PASSWORD || process.env.SSHPASS || '' } }
            );
            const found = stdout.trim();
            androidOk = found !== "NONE" && found !== "";
            console.log(`[DeploymentEngine] verifyRemote APK check: pattern=${exactPattern} found=${found} ok=${androidOk}`);
          } catch { /* ignore */ }
        }
      }

      if (webOk && androidOk) return "success";

      if (includesAndroid && !androidOk) {
        try {
          const { stdout } = await execAsync(
            `${sshCmd} "pgrep -f 'gradle' >/dev/null 2>&1 && echo GRADLE_RUNNING || echo GRADLE_DONE"`,
            { timeout: 10000, env: { ...process.env, SSHPASS: process.env.SSH_PASSWORD || process.env.SSHPASS || '' } }
          );
          if (stdout.trim().includes("GRADLE_RUNNING")) return "still_running";
        } catch { /* ignore */ }
      }

      if (includesWeb && !webOk) {
        try {
          const { stdout } = await execAsync(
            `${sshCmd} "pgrep -f 'node.*dist' >/dev/null 2>&1 || pgrep -f 'npm.*start' >/dev/null 2>&1 && echo BUILD_RUNNING || echo BUILD_DONE"`,
            { timeout: 10000, env: { ...process.env, SSHPASS: process.env.SSH_PASSWORD || process.env.SSHPASS || '' } }
          );
          if (stdout.trim().includes("BUILD_RUNNING")) return "still_running";
        } catch { /* ignore */ }
      }

      return "unknown";
    } catch (err) {
      console.log(`[DeploymentEngine] SSH verification failed: ${(err as Error).message} — treating as unknown`);
      return "unknown";
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

      const maxResult = await db.select({ maxBuild: sql<number>`COALESCE(MAX(build_number), 0)` }).from(buildDeployments);
      const currentMax = maxResult[0]?.maxBuild || 0;

      await db.execute(sql`
        INSERT INTO deployment_build_counter (id, next_build_number)
        VALUES (1, ${currentMax + 2})
        ON CONFLICT (id)
        DO UPDATE SET next_build_number = GREATEST(deployment_build_counter.next_build_number, ${currentMax + 1})
      `);
      
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

      return currentMax + 1;
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

    this.sshKeyProvisioned = false;
    this.knownHostsReady = false;
    this.resolvedAuthMethod = null;
    await this.ensureSSHKeyProvisioned();

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
      "health-check": "health-check",
      "server-cleanup": "server-cleanup",
    };

    const resolvedPipeline = resolvePipeline(config.pipeline);
    const isNonBlockingPipeline = config.pipeline === "health-check" || config.pipeline === "server-cleanup";
    const MAX_BUILD_NUMBER_RETRIES = 3;
    let deployment: any;
    for (let attempt = 0; attempt < MAX_BUILD_NUMBER_RETRIES; attempt++) {
      try {
        const [row] = await db.transaction(async (tx: any) => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(7777001)`);

          if (!isNonBlockingPipeline) {
            const running = await tx.select({ id: buildDeployments.id, buildNumber: buildDeployments.buildNumber })
              .from(buildDeployments)
              .where(sql`${buildDeployments.status} = 'running' AND ${buildDeployments.pipeline} NOT IN ('health-check', 'server-cleanup')`)
              .limit(1);

            if (running.length > 0) {
              throw new Error(`عملية نشر أخرى (#${running[0].buildNumber}) قيد التنفيذ حالياً. انتظر انتهاءها أو ألغها أولاً.`);
            }
          }

          const buildNumber = await this.getNextBuildNumber();

          let commitHash: string | undefined;
          try {
            const { stdout } = await execAsync("git rev-parse HEAD", { cwd: "/home/runner/workspace", timeout: 5000 });
            commitHash = stdout.trim();
          } catch {}

          return tx.insert(buildDeployments).values({
            buildNumber,
            buildTarget: bt,
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
            commitHash,
            releaseNotes: config.releaseNotes || null,
          }).returning();
        });
        deployment = row;
        break;
      } catch (err: any) {
        const isDuplicate = err?.cause?.code === "23505" || err?.message?.includes("build_deployments_build_number_unique");
        if (isDuplicate && attempt < MAX_BUILD_NUMBER_RETRIES - 1) {
          console.warn(`[DeploymentEngine] Build number conflict (attempt ${attempt + 1}/${MAX_BUILD_NUMBER_RETRIES}), retrying...`);
          this.buildCounterInitialized = false;
          continue;
        }
        throw err;
      }
    }
    if (!deployment) {
      throw new Error("فشل في تخصيص رقم بناء فريد بعد عدة محاولات");
    }

    broadcastGlobalEvent({ type: "deployment_started", deploymentId: deployment.id, data: { id: deployment.id, status: "running", buildNumber: deployment.buildNumber, pipeline: config.pipeline, version } });

    const resolvedConfig = { ...config, version };
    this.runPipeline(deployment.id, resolvedConfig).catch(err => {
      console.error(`[DeploymentEngine] Pipeline error for ${deployment.id}:`, err);
    });

    return deployment.id;
  }

  private async sendDeploymentNotification(
    status: "started" | "success" | "failed" | "cancelled" | "prebuild_gate_failed",
    config: DeploymentConfig,
    deploymentId: string,
    duration?: number,
    errorMsg?: string,
    prebuildReport?: any
  ) {
    try {
      this.ensureProvidersRegistered();
      let payload;
      switch (status) {
        case "started": {
          const bt = config.buildTarget || "server";
          const pipelineSteps = getPipelineSteps(config.pipeline, bt);
          let commitHash: string | undefined;
          try {
            const { stdout } = await execAsync("git rev-parse HEAD", { cwd: "/home/runner/workspace", timeout: 5000 });
            commitHash = stdout.trim();
          } catch {}
          payload = await DeploymentPayloadBuilder.buildStartedPayload(
            deploymentId, config, pipelineSteps, commitHash, config.branch
          );
          break;
        }
        case "success":
          payload = await DeploymentPayloadBuilder.buildSuccessPayload(deploymentId, config, duration || 0);
          break;
        case "failed":
          payload = await DeploymentPayloadBuilder.buildFailedPayload(deploymentId, config, duration || 0, errorMsg || "خطأ غير محدد");
          break;
        case "cancelled":
          payload = await DeploymentPayloadBuilder.buildCancelledPayload(deploymentId, config, duration || 0);
          break;
        case "prebuild_gate_failed":
          payload = await DeploymentPayloadBuilder.buildPrebuildGateFailedPayload(deploymentId, config, prebuildReport);
          break;
      }
      if (payload) {
        await this.notificationPublisher.publish(payload);
      }

      if (status === "success" && (config.pipeline.includes("android") || config.pipeline === "full-deploy")) {
        try {
          const { FcmService } = await import("./FcmService");
          await FcmService.sendNotification({
            title: "تحديث جديد متاح",
            message: `الإصدار ${config.version || "جديد"} متاح الآن. قم بتحديث التطبيق للحصول على أحدث الميزات والإصلاحات.`,
            type: "app_update",
            priority: 5,
            targetPlatform: "android",
            recipients: "all",
          });
          console.log("[DeploymentEngine] تم إرسال إشعار التحديث لجميع مستخدمي أندرويد");
        } catch (fcmErr) {
          console.error("[DeploymentEngine] فشل إرسال إشعار التحديث:", fcmErr);
        }
      }
    } catch (err) {
      console.error("[DeploymentEngine] Notification error:", err);
    }
  }

  private async sendPrebuildGateNotification(deploymentId: string, report: any) {
    try {
      const [dep] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      if (!dep) return;
      const config: DeploymentConfig = {
        pipeline: (dep.pipeline || "web-deploy") as Pipeline,
        appType: (dep.deploymentType === "android" ? "android" : "web") as "web" | "android",
        environment: (dep.environment || "production") as "production" | "staging",
        branch: dep.branch || "main",
        triggeredBy: dep.triggeredBy || undefined,
        version: dep.version || undefined,
      };
      const payload = await DeploymentPayloadBuilder.buildPrebuildGateFailedPayload(deploymentId, config, report);
      await this.notificationPublisher.publish(payload);
    } catch (err) {
      console.error("[DeploymentEngine] Prebuild gate notification error:", err);
    }
  }

  private async runPipeline(deploymentId: string, config: DeploymentConfig) {
    const bt = config.buildTarget || "server";
    const pipelineSteps = getPipelineSteps(config.pipeline, bt);
    const startTime = Date.now();
    const logger = this.getLogger(deploymentId);

    this.startHeartbeat(deploymentId);
    try {
      logger.info("pipeline", `Pipeline started: ${config.pipeline}`, {
        pipeline: config.pipeline,
        buildTarget: bt,
        environment: config.environment,
        triggeredBy: config.triggeredBy,
        steps: pipelineSteps,
      });

      const validation = validatePipeline(config.pipeline, bt as BuildTarget);
      if (!validation.valid) {
        const errMsg = `Pipeline validation failed: ${validation.errors.join(", ")}`;
        logger.error("pipeline", errMsg);
        await this.addLog(deploymentId, `❌ ${errMsg}`, "error");
        throw new Error(errMsg);
      }
      if (validation.warnings.length > 0) {
        for (const warn of validation.warnings) {
          logger.warn("pipeline", `Pipeline warning: ${warn}`);
        }
      }

      await this.sendDeploymentNotification("started", config, deploymentId);
      const targetLabel = bt === "local" ? "محلي (Replit)" : "على السيرفر (VPS)";
      await this.addLog(deploymentId, `مكان البناء: ${targetLabel} | الخطوات: ${pipelineSteps.join(" → ")}`, "info");
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
        logger.stepStart(stepName);

        const stepStart = Date.now();

        const retryPolicy = getStepRetryPolicy(stepName);
        const maxAttempts = (retryPolicy?.maxRetries || 0) + 1;
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            if (attempt > 1) {
              await this.addLog(deploymentId, `🔄 إعادة محاولة ${stepName} (${attempt}/${maxAttempts})...`, "warn");
              await new Promise(r => setTimeout(r, retryPolicy!.delayMs));
              if (this.isCancelled(deploymentId)) throw new CancellationError();
            }
            const timeoutMs = getStepTimeout(stepName);
            await Promise.race([
              this.executeStep(deploymentId, stepName, config),
              new Promise<never>((_, reject) => setTimeout(() => {
                this.terminateActiveProcesses(deploymentId);
                reject(new Error(`⏱️ الخطوة ${stepName} تجاوزت الحد الزمني (${timeoutMs/1000}ث)`));
              }, timeoutMs)),
            ]);
            const stepDuration = Date.now() - stepStart;
            await this.updateStepStatus(deploymentId, stepName, "success", stepDuration);
            logger.stepEnd(stepName, "success");
            await this.addLog(deploymentId, `Step ${stepName} completed (${(stepDuration / 1000).toFixed(1)}s)${attempt > 1 ? ` [retry ${attempt}/${maxAttempts}]` : ""}`, "success");
            await this.addEvent(deploymentId, "step_complete", `Step ${stepName} completed`, { duration: stepDuration, attempt });
            lastError = null;
            break;
          } catch (stepError: any) {
            if (stepError instanceof CancellationError || this.isCancelled(deploymentId)) {
              const stepDuration = Date.now() - stepStart;
              await this.updateStepStatus(deploymentId, stepName, "cancelled", stepDuration);
              await this.markRemainingStepsCancelled(deploymentId, i, pipelineSteps);
              throw new CancellationError();
            }
            lastError = stepError;
            if (attempt < maxAttempts) {
              await this.addLog(deploymentId, `⚠️ ${stepName} فشل (محاولة ${attempt}/${maxAttempts}): ${stepError.message}`, "warn");
            }
          }
        }

        if (lastError) {
          const stepDuration = Date.now() - stepStart;
          await this.updateStepStatus(deploymentId, stepName, "failed", stepDuration);
          logger.stepEnd(stepName, "failed");
          await this.markRemainingStepsCancelled(deploymentId, i, pipelineSteps);
          await this.addLog(deploymentId, `Step ${stepName} failed after ${maxAttempts} attempt(s): ${lastError.message}`, "error");
          await this.addEvent(deploymentId, "step_failed", `Step ${stepName} failed: ${lastError.message}`);
          throw lastError;
        }
      }

      const totalDuration = Date.now() - startTime;

      if (this.isCancelled(deploymentId)) {
        throw new CancellationError();
      }

      const [successResult] = await db.update(buildDeployments).set({
        status: "success",
        progress: 100,
        currentStep: "complete",
        duration: totalDuration,
        endTime: new Date(),
      }).where(sql`${buildDeployments.id} = ${deploymentId} AND ${buildDeployments.status} = 'running'`).returning({ id: buildDeployments.id });

      if (!successResult) {
        await this.addLog(deploymentId, "⚠️ تم إلغاء العملية أثناء الاكتمال — لن يتم تسجيل النجاح", "warn");
        return;
      }

      const summary = logger.generateSummaryWithContext("success", {
        pipeline: config.pipeline,
        environment: config.environment,
        triggeredBy: config.triggeredBy || "unknown",
        version: config.version,
      });
      logger.info("pipeline", `Pipeline completed: ${config.pipeline}`, {
        totalDuration,
        stepTimings: summary.stepTimings,
        logCounts: summary.logCounts,
      });
      await logger.persistSummary(summary).catch(() => {});
      await logger.persistStructuredLogs().catch(() => {});
      this.cleanupLogger(deploymentId);

      await this.addLog(deploymentId, `Deployment completed successfully in ${(totalDuration / 1000).toFixed(1)}s`, "success");
      await this.addEvent(deploymentId, "deployment_success", "Deployment completed successfully", { duration: totalDuration });
      await this.sendDeploymentNotification("success", config, deploymentId, totalDuration);

    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      const isCancelled = error instanceof CancellationError || this.isCancelled(deploymentId);

      try {
        const [dep] = await db.select({ steps: buildDeployments.steps, currentStep: buildDeployments.currentStep })
          .from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
        if (dep?.steps) {
          const failStatus = isCancelled ? "cancelled" as const : "failed" as const;
          const fixedSteps = (dep.steps as StepEntry[]).map(s => {
            if (s.status === "running") return { ...s, status: failStatus };
            return s;
          });
          await db.update(buildDeployments).set({ steps: fixedSteps }).where(eq(buildDeployments.id, deploymentId));
        }
      } catch {}

      const failStatus = isCancelled ? "cancelled" : "failed";
      const failMsg = isCancelled ? "Cancelled by user" : error.message;
      const [casResult] = await db.update(buildDeployments).set({
        status: failStatus,
        duration: totalDuration,
        endTime: new Date(),
        errorMessage: failMsg,
      }).where(and(eq(buildDeployments.id, deploymentId), eq(buildDeployments.status, "running"))).returning({ id: buildDeployments.id });

      if (!casResult) {
        logger.warn("pipeline", `CAS fail: deployment ${deploymentId} already transitioned — skipping fail update & notification`);
      } else {
        await this.addEvent(deploymentId, isCancelled ? "deployment_cancelled" : "deployment_failed", failMsg);
        await this.sendDeploymentNotification(
          failStatus,
          config,
          deploymentId,
          totalDuration,
          isCancelled ? undefined : error.message
        );
      }
      logger.error("pipeline", isCancelled ? "Pipeline cancelled" : `Pipeline failed: ${error.message}`);
      const failSummary = logger.generateSummaryWithContext(
        isCancelled ? "cancelled" : "failed",
        { pipeline: config.pipeline, environment: config.environment, triggeredBy: config.triggeredBy || "unknown", version: config.version },
        isCancelled ? "Cancelled by user" : error.message
      );
      await logger.persistSummary(failSummary).catch(() => {});
      await logger.persistStructuredLogs().catch(() => {});
      this.cleanupLogger(deploymentId);
    } finally {
      this.stopHeartbeat(deploymentId);
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
        await this.stepRestartPM2(deploymentId, sshCmd, config);
        break;
      case "prebuild-gate":
        await this.stepPrebuildGate(deploymentId, config);
        break;
      case "android-readiness":
        await this.stepAndroidReadiness(deploymentId, sshCmd);
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
        await this.stepVerify(deploymentId, config);
        break;
      case "git-push":
        await this.stepGitPush(deploymentId, config);
        break;
      case "pull-server":
        await this.stepPullServer(deploymentId, sshCmd, config);
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
      case "preflight-check":
        await this.stepPreflightCheck(deploymentId);
        break;
      case "hotfix-guard":
        await this.stepHotfixGuard(deploymentId);
        break;
      case "post-deploy-smoke":
        await this.stepPostDeploySmoke(deploymentId, config);
        break;
      case "apk-integrity":
        await this.stepApkIntegrity(deploymentId, sshCmd);
        break;
      case "hc-http":
        await this.stepHcHttp(deploymentId);
        break;
      case "hc-pm2":
        await this.stepHcPm2(deploymentId, sshCmd);
        break;
      case "hc-disk":
        await this.stepHcDisk(deploymentId, sshCmd);
        break;
      case "hc-memory":
        await this.stepHcMemory(deploymentId, sshCmd);
        break;
      case "hc-cpu":
        await this.stepHcCpu(deploymentId, sshCmd);
        break;
      case "hc-db":
        await this.stepHcDb(deploymentId, sshCmd);
        break;
      case "hc-ssl":
        await this.stepHcSsl(deploymentId);
        break;
      case "hc-runtime":
        await this.stepHcRuntime(deploymentId, sshCmd);
        break;
      case "hc-nginx":
        await this.stepHcNginx(deploymentId, sshCmd);
        break;
      case "hc-network":
        await this.stepHcNetwork(deploymentId, sshCmd);
        break;
      case "hc-fd":
        await this.stepHcFd(deploymentId, sshCmd);
        break;
      case "hc-connections":
        await this.stepHcConnections(deploymentId, sshCmd);
        break;
      case "hc-latency":
        await this.stepHcLatency(deploymentId);
        break;
      case "hc-log-errors":
        await this.stepHcLogErrors(deploymentId, sshCmd);
        break;
      case "hc-evaluate":
        await this.stepHcEvaluate(deploymentId);
        break;
      case "cl-android":
        await this.stepClAndroid(deploymentId, sshCmd);
        break;
      case "cl-tmp":
        await this.stepClTmp(deploymentId, sshCmd);
        break;
      case "cl-pm2-logs":
        await this.stepClPm2Logs(deploymentId, sshCmd);
        break;
      case "cl-old-apk":
        await this.stepClOldApk(deploymentId, sshCmd);
        break;
      case "cl-docker":
        await this.stepClDocker(deploymentId, sshCmd);
        break;
      case "cl-npm-cache":
        await this.stepClNpmCache(deploymentId, sshCmd);
        break;
      case "cl-journal":
        await this.stepClJournal(deploymentId, sshCmd);
        break;
      case "cl-old-logs":
        await this.stepClOldLogs(deploymentId, sshCmd);
        break;
      case "cl-git-gc":
        await this.stepClGitGc(deploymentId, sshCmd);
        break;
      case "cl-orphans":
        await this.stepClOrphans(deploymentId, sshCmd);
        break;
      case "cl-apt-cache":
        await this.stepClAptCache(deploymentId, sshCmd);
        break;
      case "cl-summary":
        await this.stepClSummary(deploymentId);
        break;
      default:
        await this.addLog(deploymentId, `Unknown step: ${stepName}`, "warn");
    }
  }

  private validateSSHParam(param: string, type: 'host' | 'user' | 'port' | 'path'): string {
    switch (type) {
      case 'host':
        if (!/^[a-zA-Z0-9][a-zA-Z0-9.\-]+$/.test(param)) {
          throw new Error(`SSH host contains invalid characters: ${param}`);
        }
        return param;
      case 'user':
        if (!/^[a-zA-Z_][a-zA-Z0-9_\-]*$/.test(param)) {
          throw new Error(`SSH user contains invalid characters: ${param}`);
        }
        return param;
      case 'port': {
        const portNum = Number(param);
        if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
          throw new Error(`SSH port must be numeric 1-65535, got: ${param}`);
        }
        return String(portNum);
      }
      case 'path':
        if (!/^[a-zA-Z0-9/_.\-]+$/.test(param)) {
          throw new Error(`SSH path contains invalid characters: ${param}`);
        }
        return param;
    }
  }

  private sanitizeShellArg(value: string): string {
    return value.replace(/[^a-zA-Z0-9._\-@\/]/g, '').replace(/\.\./g, '');
  }

  private validatePath(value: string, label: string): string {
    const cleaned = value.replace(/\.\./g, '');
    if (/[`$;|&(){}\[\]!~<>'"\\#\n\r\0]/.test(cleaned)) {
      throw new Error(`${label} يحتوي على محارف غير آمنة: ${cleaned}`);
    }
    if (cleaned.length === 0 || cleaned.length > 256) {
      throw new Error(`${label} غير صالح (طول ${cleaned.length})`);
    }
    return cleaned;
  }

  private sshKeyProvisioned = false;
  private resolvedAuthMethod: "key" | "password" | null = null;
  private knownHostsReady = false;

  private async ensureKnownHosts(knownHostsPath?: string): Promise<void> {
    const khPath = knownHostsPath || process.env.SSH_KNOWN_HOSTS_PATH || "/home/runner/.ssh/known_hosts";
    const host = this.sanitizeShellArg(process.env.SSH_HOST || "93.127.142.144");
    const port = this.sanitizeShellArg(process.env.SSH_PORT || "22");
    if (existsSync(khPath)) {
      try {
        const content = readFileSync(khPath, "utf-8").trim();
        if (content.length > 0) {
          const { stdout: lookupResult } = await execAsync(
            `ssh-keygen -F "[${host}]:${port}" -f ${khPath} 2>/dev/null || ssh-keygen -F "${host}" -f ${khPath} 2>/dev/null`,
            { timeout: 5000 }
          );
          if (lookupResult.trim().length > 0) {
            this.knownHostsReady = true;
            return;
          }
        }
      } catch (_e) {
      }
    }
    const sshDir = dirname(khPath);
    if (!existsSync(sshDir)) {
      mkdirSync(sshDir, { recursive: true, mode: 0o700 });
    }
    if (process.env.SSH_KNOWN_HOSTS_B64) {
      const khData = Buffer.from(process.env.SSH_KNOWN_HOSTS_B64, "base64").toString("utf-8");
      writeFileSync(khPath, khData, { mode: 0o600 });
      try {
        const { stdout: verifyB64 } = await execAsync(
          `ssh-keygen -F "[${host}]:${port}" -f ${khPath} 2>/dev/null || ssh-keygen -F "${host}" -f ${khPath} 2>/dev/null`,
          { timeout: 5000 }
        );
        this.knownHostsReady = verifyB64.trim().length > 0;
      } catch {
        this.knownHostsReady = false;
      }
      if (!this.knownHostsReady) {
        console.warn("[DeploymentEngine] SSH_KNOWN_HOSTS_B64 does not contain entry for target host — falling back to accept-new");
      }
    } else {
      try {
        const { stdout } = await execAsync(`ssh-keyscan -p ${port} -H ${host} 2>/dev/null`, { timeout: 15000 });
        if (stdout.trim()) {
          writeFileSync(khPath, stdout, { mode: 0o600 });
          this.knownHostsReady = true;
        } else {
          console.warn("[DeploymentEngine] ssh-keyscan returned empty output — falling back to StrictHostKeyChecking=accept-new");
          this.knownHostsReady = false;
        }
      } catch (_e) {
        console.warn("[DeploymentEngine] ssh-keyscan failed — falling back to StrictHostKeyChecking=accept-new");
        this.knownHostsReady = false;
      }
    }
  }

  private async ensureSSHKeyProvisioned(): Promise<void> {
    if (this.sshKeyProvisioned) return;

    const keyPath = process.env.SSH_KEY_PATH || "/home/runner/.ssh/axion_deploy_key";
    const knownHostsPath = process.env.SSH_KNOWN_HOSTS_PATH || "/home/runner/.ssh/known_hosts";

    const sshDir = dirname(keyPath);
    if (!existsSync(sshDir)) {
      mkdirSync(sshDir, { recursive: true, mode: 0o700 });
    }

    if (!existsSync(keyPath) && process.env.SSH_PRIVATE_KEY_B64) {
      const keyData = Buffer.from(process.env.SSH_PRIVATE_KEY_B64, "base64").toString("utf-8");
      writeFileSync(keyPath, keyData, { mode: 0o600 });
    }

    await this.ensureKnownHosts(knownHostsPath);

    let keyFileReady = false;
    if (existsSync(keyPath)) {
      try {
        accessSync(keyPath, fsConstants.R_OK);
        keyFileReady = true;
      } catch (_e) {
      }
    }

    const explicit = process.env.SSH_AUTH_METHOD;
    const hasPassword = !!(process.env.SSH_PASSWORD || process.env.SSHPASS);
    const isProduction = process.env.NODE_ENV === "production";
    const allowSSHPassword = process.env.ALLOW_SSH_PASSWORD === "true";

    if (keyFileReady) {
      this.resolvedAuthMethod = "key";
    } else if (isProduction && !allowSSHPassword) {
      throw new Error(
        `🔒 [أمان] بيئة الإنتاج تتطلب مصادقة SSH بالمفتاح فقط.\n` +
        `المفتاح غير متوفر في ${keyPath}\n` +
        `الحلول:\n` +
        `  1. اضبط SSH_PRIVATE_KEY_B64 في Secrets (base64 للمفتاح الخاص)\n` +
        `  2. أو ضع ملف المفتاح يدوياً في ${keyPath}\n` +
        `  3. للسماح بكلمة المرور مؤقتاً: اضبط ALLOW_SSH_PASSWORD=true`
      );
    } else if (explicit === "password" && hasPassword) {
      this.resolvedAuthMethod = "password";
    } else if (explicit === "password" && !hasPassword) {
      throw new Error(
        `SSH_AUTH_METHOD=password لكن لا توجد كلمة مرور.\n` +
        `اضبط SSH_PASSWORD في Secrets`
      );
    } else if (hasPassword && allowSSHPassword) {
      this.resolvedAuthMethod = "password";
    } else if (hasPassword) {
      this.resolvedAuthMethod = "password";
    } else {
      throw new Error(
        `لا يوجد أي وسيلة اتصال SSH مُعدّة في هذه البيئة.\n` +
        `الحلول:\n` +
        `  1. مفتاح SSH: اضبط SSH_PRIVATE_KEY_B64 في Secrets (موصى به)\n` +
        `  2. كلمة مرور: اضبط SSH_PASSWORD + ALLOW_SSH_PASSWORD=true في Secrets`
      );
    }

    if (this.resolvedAuthMethod === "password") {
      try {
        await execAsync("which sshpass", { timeout: 5000 });
      } catch (_e) {
      }
    }

    if (this.resolvedAuthMethod === "key") {
      try {
        const { stdout: perms } = await execAsync(`stat -c '%a' ${keyPath}`, { timeout: 5000 });
        const perm = perms.trim();
        if (perm !== "600" && perm !== "400") {
          await execAsync(`chmod 600 ${keyPath}`, { timeout: 5000 });
        }
      } catch (_e) {
      }
    }

    this.sshKeyProvisioned = true;
  }

  private getSSHAuthMethod(): "key" | "password" {
    if (this.resolvedAuthMethod) return this.resolvedAuthMethod;

    const keyPath = process.env.SSH_KEY_PATH || "/home/runner/.ssh/axion_deploy_key";

    const explicit = process.env.SSH_AUTH_METHOD;
    if (explicit === "password") return "password";

    let keyReadable = false;
    try {
      accessSync(keyPath, fsConstants.R_OK);
      keyReadable = true;
    } catch {}

    if (keyReadable) return "key";

    if (explicit === "key" && (process.env.SSH_PASSWORD || process.env.SSHPASS)) {
      return "password";
    }

    if (process.env.SSH_PASSWORD || process.env.SSHPASS) return "password";

    return "password";
  }

  private buildSSHCommand(): string {
    const host = this.sanitizeShellArg(process.env.SSH_HOST || "93.127.142.144");
    const user = this.sanitizeShellArg(process.env.SSH_USER || "administrator");
    const port = this.sanitizeShellArg(process.env.SSH_PORT || "22");

    this.validateSSHParam(host, 'host');
    this.validateSSHParam(user, 'user');
    this.validateSSHParam(port, 'port');

    const authMethod = this.getSSHAuthMethod();

    if (authMethod === "key") {
      const keyPath = this.validatePath(process.env.SSH_KEY_PATH || "/home/runner/.ssh/axion_deploy_key", "SSH_KEY_PATH");
      const knownHostsPath = this.validatePath(process.env.SSH_KNOWN_HOSTS_PATH || "/home/runner/.ssh/known_hosts", "SSH_KNOWN_HOSTS_PATH");
      return `ssh -i ${keyPath} -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${knownHostsPath} -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=20 -p ${port} ${user}@${host}`;
    }

    const knownHostsPath = this.validatePath(process.env.SSH_KNOWN_HOSTS_PATH || "/home/runner/.ssh/known_hosts", "SSH_KNOWN_HOSTS_PATH");
    if (this.knownHostsReady) {
      return `sshpass -e ssh -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${knownHostsPath} -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=20 -p ${port} ${user}@${host}`;
    }
    return `sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=20 -p ${port} ${user}@${host}`;
  }

  private buildSCPCommand(src: string, dest: string): string {
    const host = this.sanitizeShellArg(process.env.SSH_HOST || "93.127.142.144");
    const user = this.sanitizeShellArg(process.env.SSH_USER || "administrator");
    const port = this.sanitizeShellArg(process.env.SSH_PORT || "22");

    this.validateSSHParam(host, 'host');
    this.validateSSHParam(user, 'user');
    this.validateSSHParam(port, 'port');

    const authMethod = this.getSSHAuthMethod();

    if (authMethod === "key") {
      const keyPath = this.validatePath(process.env.SSH_KEY_PATH || "/home/runner/.ssh/axion_deploy_key", "SSH_KEY_PATH");
      const knownHostsPath = this.validatePath(process.env.SSH_KNOWN_HOSTS_PATH || "/home/runner/.ssh/known_hosts", "SSH_KNOWN_HOSTS_PATH");
      return `scp -i ${keyPath} -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${knownHostsPath} -o ConnectTimeout=30 -P ${port} ${src} ${user}@${host}:${dest}`;
    }

    const knownHostsPath = this.validatePath(process.env.SSH_KNOWN_HOSTS_PATH || "/home/runner/.ssh/known_hosts", "SSH_KNOWN_HOSTS_PATH");
    if (this.knownHostsReady) {
      return `sshpass -e scp -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${knownHostsPath} -o ConnectTimeout=30 -P ${port} ${src} ${user}@${host}:${dest}`;
    }
    return `sshpass -e scp -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -P ${port} ${src} ${user}@${host}:${dest}`;
  }

  getSSHCommandForDownload(): string {
    return this.buildSSHCommand();
  }

  private maskSecrets(text: string): string {
    const explicitKeys = [
      "SSH_PASSWORD", "SSHPASS", "GITHUB_TOKEN", "GH_TOKEN",
      "KEYSTORE_PASSWORD", "KEYSTORE_KEY_PASSWORD", "TELEGRAM_BOT_TOKEN",
    ];
    const explicit = explicitKeys.map(k => process.env[k]).filter(Boolean) as string[];
    const dynamic = Object.entries(process.env)
      .filter(([k, v]) => v && /(SECRET|TOKEN|PASSWORD|KEY_PASS)/i.test(k) && !explicitKeys.includes(k))
      .map(([, v]) => v!);
    const secrets = [...new Set([...explicit, ...dynamic])]
      .filter(s => s.length >= 4)
      .sort((a, b) => b.length - a.length);
    let masked = text;
    for (const secret of secrets) {
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
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        this.addLog(deploymentId, `[${label}] ⏱️ تجاوز المهلة (${timeoutMs / 1000}s) — جاري إيقاف العملية...`, "warn").catch(() => {});
        const isSSHCommand = command.includes("ssh ") || command.includes("sshpass ");
        if (isSSHCommand) {
          try {
            const killCmd = this.buildSSHCommand();
            const cleanupEnv = { ...process.env };
            if (process.env.SSH_PASSWORD && !cleanupEnv.SSHPASS) {
              cleanupEnv.SSHPASS = process.env.SSH_PASSWORD;
            }
            const remoteKillTargets = ["gradlew", "gradle", "npm", "npx", "cap", "node dist/index.js"].filter(t => command.includes(t));
            if (remoteKillTargets.length === 0) { /* no known targets — skip remote cleanup to avoid killing unrelated processes */ }
            const remoteProjectDir = "/home/administrator/app2";
            const killPattern = remoteKillTargets.length > 0 ? remoteKillTargets.map(t => `pkill -f '${remoteProjectDir}.*${t}' 2>/dev/null`).join("; ") : "echo NO_REMOTE_KILL_TARGET";
            exec(`${killCmd} "${killPattern}; echo REMOTE_CLEANUP_DONE"`, { timeout: 10000, env: cleanupEnv }, () => {});
          } catch {}
        }
        try { process.kill(-child.pid!, "SIGTERM"); } catch {}
        setTimeout(() => {
          try { process.kill(-child.pid!, "SIGKILL"); } catch {}
          try { child.kill("SIGKILL"); } catch {}
          setTimeout(() => {
            reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`));
          }, 1000);
        }, 5000);
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

      child.on("close", (code, signal) => {
        clearTimeout(timer);
        if (lineBuffer.trim()) processLine(lineBuffer);

        if (timedOut) return;

        if (this.isCancelled(deploymentId)) {
          reject(new CancellationError());
          return;
        }

        if (signal) {
          this.addLog(deploymentId, `[${label}] killed by signal ${signal}`, "error").catch(() => {});
          reject(new Error(`${label} killed by signal ${signal}`));
          return;
        }

        if (code === 0) {
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

  private async stepPreflightCheck(deploymentId: string) {
    await this.addLog(deploymentId, "🔍 فحص أولي — التحقق من صحة الكود قبل النشر...", "info");
    this.updateStepProgress(deploymentId, "preflight-check", 0, "بدء الفحص الأولي...");
    let criticalFailures: string[] = [];

    this.updateStepProgress(deploymentId, "preflight-check", 10, "فحص تعارضات Git...");
    try {
      const { stdout: conflictCheck } = await execAsync(
        "grep -rn '<<<<<<< ' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.json' /home/runner/workspace/server /home/runner/workspace/client /home/runner/workspace/shared 2>/dev/null | head -5 || echo 'NO_CONFLICTS'",
        { cwd: "/home/runner/workspace", timeout: 15000 }
      );
      if (!conflictCheck.includes("NO_CONFLICTS") && conflictCheck.trim().length > 0) {
        const conflictFiles = conflictCheck.trim().split("\n").length;
        criticalFailures.push(`${conflictFiles} ملفات بها تعارضات Git غير محلولة`);
        await this.addLog(deploymentId, `🚫 تعارضات Git: ${conflictFiles} ملفات`, "error");
      }
    } catch {}

    this.updateStepProgress(deploymentId, "preflight-check", 30, "فحص TypeScript...");
    try {
      const { stdout: tscResult } = await execAsync(
        "npx tsc --noEmit --pretty false 2>&1 | tail -20 || true",
        { cwd: "/home/runner/workspace", timeout: 120000 }
      );

      const errorLines = tscResult.split("\n").filter(l => l.includes("error TS"));
      if (errorLines.length > 0) {
        await this.addLog(deploymentId, `⚠️ TypeScript: ${errorLines.length} أخطاء تجميع`, "warn");
        for (const err of errorLines.slice(0, 5)) {
          await this.addLog(deploymentId, `  ${err.trim()}`, "warn");
        }
        if (errorLines.length > 5) {
          await this.addLog(deploymentId, `  ... و ${errorLines.length - 5} أخطاء أخرى`, "warn");
        }
        if (errorLines.length > 20) {
          criticalFailures.push(`${errorLines.length} أخطاء TypeScript حرجة (> 20 خطأ)`);
        } else {
          await this.addLog(deploymentId, "⚠️ أخطاء TypeScript غير حرجة — متابعة النشر مع تحذير", "warn");
        }
      } else {
        await this.addLog(deploymentId, "✅ TypeScript: لا أخطاء تجميع", "success");
      }
    } catch (err: any) {
      await this.addLog(deploymentId, `⚠️ تعذر تشغيل فحص TypeScript: ${err.message}`, "warn");
    }

    this.updateStepProgress(deploymentId, "preflight-check", 75, "فحص حالة Git...");
    try {
      const { stdout: gitStatus } = await execAsync(
        "git status --porcelain 2>/dev/null | wc -l",
        { cwd: "/home/runner/workspace", timeout: 10000 }
      );
      const uncommitted = parseInt(gitStatus.trim()) || 0;
      if (uncommitted > 0) {
        await this.addLog(deploymentId, `⚠️ ${uncommitted} ملفات غير مُرحّلة في Git`, "warn");
      } else {
        await this.addLog(deploymentId, "✅ Git: كل الملفات مُرحّلة", "success");
      }
    } catch {
      await this.addLog(deploymentId, "⚠️ تعذر فحص حالة Git", "warn");
    }

    this.updateStepProgress(deploymentId, "preflight-check", 80, "فحص متغيرات البيئة...");
    const missingEnvVars: string[] = [];
    const authMethod = this.getSSHAuthMethod();
    if (authMethod === "password") {
      if (!process.env.SSH_PASSWORD && !process.env.SSHPASS) {
        missingEnvVars.push("SSH credentials (SSH_PASSWORD أو SSHPASS)");
      }
    } else if (authMethod === "key") {
      const keyPath = process.env.SSH_KEY_PATH || "/home/runner/.ssh/axion_deploy_key";
      if (!existsSync(keyPath) && !process.env.SSH_PRIVATE_KEY_B64) {
        missingEnvVars.push("SSH key (SSH_PRIVATE_KEY_B64 أو ملف المفتاح)");
      }
    }
    if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
      missingEnvVars.push("GITHUB_TOKEN");
    }
    if (missingEnvVars.length > 0) {
      for (const v of missingEnvVars) {
        criticalFailures.push(`متغير بيئة مفقود: ${v}`);
      }
      await this.addLog(deploymentId, `🚫 متغيرات بيئة حرجة مفقودة: ${missingEnvVars.join(", ")}`, "error");
    } else {
      await this.addLog(deploymentId, "✅ متغيرات البيئة الحرجة متوفرة", "success");
    }

    this.updateStepProgress(deploymentId, "preflight-check", 85, "فحص مساحة القرص...");
    try {
      const { stdout: diskInfo } = await execAsync("df -BM /home/runner/workspace | tail -1 | awk '{print $4}'", { timeout: 5000 });
      const availMB = parseInt(diskInfo.replace("M", ""));
      if (availMB < 500) {
        criticalFailures.push(`مساحة القرص المحلي منخفضة جداً: ${availMB}MB متاح`);
        await this.addLog(deploymentId, `🚫 مساحة القرص: ${availMB}MB — أقل من الحد الأدنى (500MB)`, "error");
      } else {
        await this.addLog(deploymentId, `✅ مساحة القرص: ${availMB}MB متاح`, "success");
      }
    } catch {
      await this.addLog(deploymentId, "⚠️ تعذر فحص مساحة القرص", "warn");
    }

    this.updateStepProgress(deploymentId, "preflight-check", 88, "فحص مساحة القرص البعيد...");
    try {
      const sshCmd = this.buildSSHCommand();
      const { stdout: remoteDisk } = await execAsync(
        `${sshCmd} "df -BM /home/administrator/app2 | tail -1 | awk '{print \\$4}'"`,
        { timeout: 15000, env: { ...process.env, SSHPASS: process.env.SSH_PASSWORD || process.env.SSHPASS || "" } }
      );
      const remoteAvailMB = parseInt(remoteDisk.replace(/[^0-9]/g, ""));
      if (!Number.isFinite(remoteAvailMB)) {
        await this.addLog(deploymentId, `⚠️ تعذر تحليل مساحة القرص البعيد: "${remoteDisk.trim()}"`, "warn");
      } else if (remoteAvailMB < 1000) {
        criticalFailures.push(`مساحة القرص البعيد منخفضة جداً: ${remoteAvailMB}MB متاح (الحد الأدنى 1GB)`);
        await this.addLog(deploymentId, `🚫 مساحة القرص البعيد: ${remoteAvailMB}MB — أقل من الحد الأدنى (1GB) لبناء Gradle`, "error");
      } else if (remoteAvailMB < 2000) {
        await this.addLog(deploymentId, `⚠️ مساحة القرص البعيد منخفضة: ${remoteAvailMB}MB — قد يفشل بناء Gradle`, "warn");
      } else {
        await this.addLog(deploymentId, `✅ مساحة القرص البعيد: ${remoteAvailMB}MB متاح`, "success");
      }
    } catch {
      await this.addLog(deploymentId, "⚠️ تعذر فحص مساحة القرص البعيد", "warn");
    }

    this.updateStepProgress(deploymentId, "preflight-check", 90, "فحص ملف القفل...");
    try {
      const { stdout: lockCheck } = await execAsync(
        "if [ -f package-lock.json ]; then PKG_TIME=$(stat -c %Y package.json); LOCK_TIME=$(stat -c %Y package-lock.json); if [ $PKG_TIME -gt $LOCK_TIME ]; then echo 'LOCK_STALE'; else echo 'LOCK_OK'; fi; else echo 'LOCK_MISSING'; fi",
        { cwd: "/home/runner/workspace", timeout: 5000 }
      );
      if (lockCheck.includes("LOCK_MISSING") || lockCheck.includes("LOCK_STALE")) {
        const reason = lockCheck.includes("LOCK_MISSING") ? "غير موجود" : "أقدم من package.json";
        await this.addLog(deploymentId, `🔄 package-lock.json ${reason} — جارٍ المزامنة تلقائياً...`, "info");
        try {
          await execAsync("npm install --package-lock-only --ignore-scripts 2>&1 | tail -3", { cwd: "/home/runner/workspace", timeout: 60000 });
          await this.addLog(deploymentId, "✅ تم مزامنة package-lock.json تلقائياً", "success");
        } catch (syncErr: any) {
          await this.addLog(deploymentId, `⚠️ فشلت المزامنة التلقائية: ${syncErr?.message?.slice(0, 100) || "خطأ غير معروف"}`, "warn");
        }
      } else {
        await this.addLog(deploymentId, "✅ package-lock.json محدّث ومتزامن", "success");
      }
    } catch {
      await this.addLog(deploymentId, "⚠️ تعذر فحص package-lock.json", "warn");
    }

    if (criticalFailures.length > 0) {
      const msg = `🚫 فحص أولي فشل: ${criticalFailures.join(" | ")}`;
      await this.addLog(deploymentId, msg, "error");
      throw new Error(msg);
    }

    await this.addLog(deploymentId, "✅ الفحص الأولي مكتمل", "success");
  }

  private async stepHotfixGuard(deploymentId: string) {
    await this.addLog(deploymentId, "🛡️ فحص حماية الإصلاح السريع...", "info");

    try {
      const { stdout } = await execAsync(
        "git diff HEAD~1 --name-only 2>/dev/null | grep -E '(migration|migrate|drizzle)' || echo 'NO_SCHEMA_CHANGES'",
        { cwd: "/home/runner/workspace", timeout: 15000 }
      );

      if (!stdout.includes("NO_SCHEMA_CHANGES")) {
        const changedFiles = stdout.trim().split("\n").filter(f => f.length > 0);
        for (const file of changedFiles) {
          await this.addLog(deploymentId, `⚠️ ملف schema/migration تم تعديله: ${file}`, "warn");
        }
        await this.addLog(deploymentId, "⚠️ الإصلاح السريع يتضمن تغييرات قاعدة بيانات — يُنصح باستخدام web-deploy أو full-deploy بدلاً منه", "warn");
        await this.addLog(deploymentId, "⚠️ متابعة الإصلاح السريع بدون تهجير قاعدة البيانات — تأكد يدوياً", "warn");
      } else {
        await this.addLog(deploymentId, "✅ لا تغييرات في schema/migrations — إصلاح سريع آمن", "success");
      }
    } catch {
      await this.addLog(deploymentId, "⚠️ تعذر فحص تغييرات Schema", "warn");
    }
  }

  private async stepPostDeploySmoke(deploymentId: string, config?: DeploymentConfig) {
    await this.addLog(deploymentId, "🔥 اختبار دخان ما بعد النشر — فحص المسارات الحرجة...", "info");
    const baseUrl = this.resolveBaseUrl(config);
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          await this.addLog(deploymentId, `🔄 محاولة ${attempt}/${maxAttempts} — انتظار 10 ثوانٍ قبل إعادة الفحص...`, "info");
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

        const { runPrebuildChecks } = await import("./prebuild-route-checker");
        const report = await runPrebuildChecks(baseUrl, {
          deployerToken: config?.deployerToken,
        });

        const failedRoutes = report.routeChecks.filter(r => !r.passed);
        const passedRoutes = report.routeChecks.filter(r => r.passed);

        if (report.authTokenObtained) {
          await this.addLog(deploymentId, `✅ المصادقة: تم الحصول على توكن — فحص كامل للمسارات`, "success");
        } else {
          await this.addLog(deploymentId, `⚠️ المصادقة: بدون توكن — فحص المسارات العامة فقط`, "warn");
        }

        await this.addLog(deploymentId,
          `📊 دخان ما بعد النشر (محاولة ${attempt}): مسارات ${passedRoutes.length}/${report.routeChecks.length} | CORS ${report.summary.passedCors}/${report.summary.totalCors} | SSL ${report.summary.sslValid ? "✅" : "❌"} | CSP ${report.summary.cspValid ? "✅" : "❌"}`,
          report.summary.overallPass ? "success" : "warn"
        );

        if (failedRoutes.length > 0) {
          for (const f of failedRoutes.slice(0, 5)) {
            await this.addLog(deploymentId, `  ⚠️ [${f.method}] ${f.path}: ${f.error}`, "warn");
          }
        }

        const criticalFailed = failedRoutes.filter(r => {
          if (r.error?.includes("AUTH_REQUIRED") || r.error?.includes("no auth token")) return false;
          return r.group === "auth" || r.group === "public";
        });
        if (criticalFailed.length > 0 || !report.summary.sslValid) {
          if (attempt < maxAttempts) {
            await this.addLog(deploymentId, `⚠️ مسارات حرجة فاشلة (${criticalFailed.length}) — إعادة المحاولة...`, "warn");
            continue;
          }
          const reasons: string[] = [];
          if (criticalFailed.length > 0) reasons.push(`${criticalFailed.length} مسار حرج فشل`);
          if (!report.summary.sslValid) reasons.push("SSL غير صالح");
          await this.addEvent(deploymentId, "smoke_test_failed", "Post-deploy smoke test detected critical failures", {
            failedRoutes: criticalFailed.map(r => r.path),
          });
          await this.addLog(deploymentId, `🚫 فشل اختبار الدخان: ${reasons.join(" | ")} — النشر مرفوض لحماية الإنتاج`, "error");
          throw new Error("🚫 فشل اختبار الدخان: " + reasons.join(" | ") + " — النشر مرفوض لحماية الإنتاج");
        } else {
          await this.addLog(deploymentId, "✅ اختبار الدخان ناجح — النشر يعمل بشكل صحيح", "success");
          return;
        }
      } catch (err: any) {
        if (attempt < maxAttempts) {
          await this.addLog(deploymentId, `⚠️ خطأ في اختبار الدخان (محاولة ${attempt}): ${err.message} — إعادة المحاولة...`, "warn");
          continue;
        }
        await this.addLog(deploymentId, `🚫 فشل اختبار الدخان بعد ${maxAttempts} محاولات: ${err.message} — النشر مرفوض`, "error");
        throw new Error("🚫 فشل اختبار الدخان بعد " + maxAttempts + " محاولات: " + err.message + " — النشر مرفوض");
      }
    }
  }

  private async stepValidate(deploymentId: string) {
    await this.addLog(deploymentId, "التحقق من البيئة...", "info");

    await this.ensureKnownHosts();

    const host = process.env.SSH_HOST || "93.127.142.144";
    const user = process.env.SSH_USER || "administrator";
    const authMethod = this.getSSHAuthMethod();

    await this.addLog(deploymentId, `الخادم: ${user}@${host} (${authMethod === "key" ? "مفتاح SSH 🔑" : "كلمة مرور 🔒"})`, "info");

    if (authMethod === "password" && !process.env.SSH_PASSWORD && !process.env.SSHPASS) {
      throw new Error(
        "لا يوجد أي وسيلة اتصال SSH مُعدّة.\n" +
        "الحلول:\n" +
        "  1. اضبط SSH_PRIVATE_KEY_B64 في Secrets (base64 للمفتاح الخاص)\n" +
        "  2. اضبط SSH_PASSWORD في Secrets\n" +
        "اذهب إلى: Secrets → أضف المتغير المطلوب"
      );
    }

    if (authMethod === "key") {
      const keyPath = process.env.SSH_KEY_PATH || "/home/runner/.ssh/axion_deploy_key";
      if (!existsSync(keyPath)) {
        throw new Error(
          `ملف مفتاح SSH غير موجود: ${keyPath}\n` +
          `الحلول:\n` +
          `  1. اضبط SSH_PRIVATE_KEY_B64 في Secrets (سيتم إنشاء الملف تلقائياً)\n` +
          `  2. أو اضبط SSH_AUTH_METHOD=password مع SSH_PASSWORD`
        );
      }
      try {
        accessSync(keyPath, fsConstants.R_OK);
      } catch {
        throw new Error(
          `ملف مفتاح SSH موجود لكن غير قابل للقراءة: ${keyPath}\n` +
          `جرّب: chmod 600 ${keyPath}`
        );
      }
    }

    await this.addLog(deploymentId, "اختبار اتصال SSH...", "info");
    try {
      const sshCmd = this.buildSSHCommand();
      const { stdout } = await execAsync(`${sshCmd} "echo SSH_OK && hostname && uptime"`, { timeout: 30000 });
      await this.addLog(deploymentId, `اتصال SSH ناجح: ${stdout.trim()}`, "success");
    } catch (sshErr: any) {
      const masked = this.maskSecrets(sshErr.message);
      await this.addLog(deploymentId, `فشل اتصال SSH: ${masked}`, "error");

      let hint = "";
      if (masked.includes("Identity file") && masked.includes("not accessible")) {
        hint = "\n💡 ملف المفتاح غير موجود — اضبط SSH_PRIVATE_KEY_B64 في Secrets";
      } else if (masked.includes("Permission denied")) {
        hint = authMethod === "key"
          ? "\n💡 المفتاح مرفوض من الخادم — تحقق أن المفتاح العام مُضاف في authorized_keys على الخادم"
          : "\n💡 كلمة المرور خاطئة — تحقق من SSH_PASSWORD في Secrets";
      } else if (masked.includes("Connection refused") || masked.includes("Connection timed out")) {
        hint = "\n💡 الخادم لا يستجيب — تحقق أن الخادم يعمل والمنفذ 22 مفتوح";
      } else if (masked.includes("Host key verification failed")) {
        hint = "\n💡 مفتاح الخادم تغيّر — اضبط SSH_KNOWN_HOSTS_B64 أو احذف known_hosts";
      }

      throw new Error(`فشل الاتصال بالخادم عبر SSH: ${masked}${hint}`);
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

  private async stepRestartPM2(deploymentId: string, sshCmd: string, config?: DeploymentConfig) {
    const remoteDir = "/home/administrator/app2";
    const appBase = "AXION";
    const legacyNames = ["construction-app"];

    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    const version = deployment?.version || config?.version || "unknown";
    const buildNumber = deployment?.buildNumber || 0;
    const appName = `${appBase}-v${version}`;

    const isOurProcess = (name: string) =>
      name.startsWith(appBase) || legacyNames.includes(name);

    await this.addLog(deploymentId, `🗑️ البحث عن عمليات التطبيق القديمة وحذفها (AXION-* + أسماء قديمة)...`, "info");
    try {
      const { stdout: listOutput } = await execAsync(
        `${sshCmd} "pm2 jlist 2>/dev/null || echo '[]'"`,
        { timeout: 10000 }
      );
      const currentProcs = JSON.parse(listOutput.trim() || "[]");
      const ourProcs = Array.isArray(currentProcs)
        ? currentProcs.filter((p: { name?: string }) => p.name && isOurProcess(p.name))
        : [];

      if (ourProcs.length > 0) {
        const oldNames = [...new Set(ourProcs.map((p: { name?: string }) => p.name))];
        await this.addLog(deploymentId, `🔍 عمليات التطبيق الموجودة: ${oldNames.join(", ")} (${ourProcs.length} عمليات)`, "info");
        for (const oldName of oldNames) {
          await this.execWithLog(
            deploymentId,
            `${sshCmd} "pm2 delete '${oldName}' 2>/dev/null && echo 'DELETED_${oldName}' || echo 'NOT_FOUND_${oldName}'"`,
            `PM2 Delete ${oldName}`,
            15000
          );
        }
        await this.addLog(deploymentId, `✅ تم حذف ${oldNames.length} نسخة قديمة: ${oldNames.join(", ")}`, "success");
      } else {
        await this.addLog(deploymentId, `✅ لا توجد عمليات قديمة للتطبيق`, "success");
      }
    } catch {
      await this.addLog(deploymentId, `✅ لا توجد عمليات PM2 — جاهز للتشغيل`, "success");
    }

    await this.addLog(deploymentId, `🔍 التحقق من إزالة جميع النسخ القديمة...`, "info");
    try {
      const { stdout: verifyDelete } = await execAsync(
        `${sshCmd} "pm2 jlist 2>/dev/null || echo '[]'"`,
        { timeout: 10000 }
      );
      const afterDelete = JSON.parse(verifyDelete.trim() || "[]");
      const stillRunning = Array.isArray(afterDelete)
        ? afterDelete.filter((p: { name?: string }) => p.name && isOurProcess(p.name))
        : [];
      if (stillRunning.length > 0) {
        const names = stillRunning.map((p: { name?: string }) => p.name).join(", ");
        await this.addLog(deploymentId, `⚠️ لا تزال موجودة: ${names} — إعادة الحذف...`, "warn");
        for (const p of stillRunning) {
          await execAsync(`${sshCmd} "pm2 delete '${(p as { name: string }).name}' 2>/dev/null"`, { timeout: 10000 }).catch(() => {});
        }
      }
      const otherApps = Array.isArray(afterDelete)
        ? afterDelete.filter((p: { name?: string }) => p.name && !isOurProcess(p.name)).map((p: { name?: string }) => p.name)
        : [];
      if (otherApps.length > 0) {
        await this.addLog(deploymentId, `ℹ️ تطبيقات أخرى لم تتأثر: ${otherApps.join(", ")}`, "info");
      }
    } catch {
    }

    await this.addLog(deploymentId, `🚀 تشغيل جديد: ${appName} (build #${buildNumber})...`, "info");
    const ecosystemContent = `module.exports = {
  apps: [{
    name: '${appName}',
    script: 'dist/index.js',
    cwd: '${remoteDir}',
    exec_mode: 'fork',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 6000
    },
    node_args: '--max-old-space-size=512',
    max_memory_restart: '600M',
    max_restarts: 15,
    min_uptime: '10s',
    restart_delay: 3000,
    listen_timeout: 15000,
    kill_timeout: 8000,
    wait_ready: false,
    autorestart: true,
    watch: false,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/home/administrator/.pm2/logs/construction-app-error.log',
    out_file: '/home/administrator/.pm2/logs/construction-app-out.log',
    log_file: '/home/administrator/.pm2/logs/construction-app-combined.log'
  }]
};`;
    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && cat > ecosystem.config.cjs << 'EOFECO'\n${ecosystemContent}\nEOFECO\npm2 start ecosystem.config.cjs --env production --update-env && pm2 save && echo 'PM2_STARTED'"`,
      "PM2 Fresh Start",
      45000
    );

    await this.addLog(deploymentId, `🔍 التحقق من تشغيل ${appName}...`, "info");
    try {
      const { stdout: verifyOutput } = await execAsync(
        `${sshCmd} "pm2 jlist 2>/dev/null || echo '[]'"`,
        { timeout: 10000 }
      );
      const runningProcs = JSON.parse(verifyOutput.trim() || "[]");
      const appProcs = Array.isArray(runningProcs)
        ? runningProcs.filter((p: { name?: string; pm2_env?: { status?: string } }) => p.name === appName && p.pm2_env?.status === "online")
        : [];
      if (appProcs.length === 0) {
        await this.addLog(deploymentId, `❌ ${appName} لم يبدأ — لا توجد عمليات online`, "error");
        throw new Error(`PM2: ${appName} فشل في البدء — تحقق من dist/index.js`);
      }
      await this.addLog(deploymentId, `✅ ${appName} يعمل (${appProcs.length} instances online)`, "success");
    } catch (err: any) {
      if (err.message?.includes("فشل في البدء")) throw err;
      await this.addLog(deploymentId, `⚠️ تعذر التحقق من حالة PM2: ${err.message}`, "warn");
    }

    const baseUrl = this.resolveBaseUrl(config);
    const ready = await this.waitForServerReady(deploymentId, baseUrl, 90000, 5000);
    if (!ready) {
      await this.addLog(deploymentId, "⚠️ السيرفر لم يصل لحالة الجاهزية — متابعة مع تحذير", "warn");
    }

    try {
      const authCheckCmd = `${sshCmd} "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:6000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test\",\"password\":\"test\"}' 2>/dev/null"`;
      const { stdout: httpCode } = await execAsync(authCheckCmd, { timeout: 15000 });
      const code = httpCode.trim();
      if (code === "404") {
        await this.addLog(deploymentId, "❌ مسار /api/auth/login يعيد 404 — الكود الجديد لم يُحمّل!", "error");
        throw new Error(`PM2: ${appName} بدأ لكن /api/auth/login يعيد 404 — dist/index.js غير محدّث`);
      }
      await this.addLog(deploymentId, `✅ فحص مسار المصادقة: HTTP ${code} — ${appName} محمّل بنجاح`, "success");
    } catch (err: any) {
      if (err.message?.includes("404")) throw err;
      await this.addLog(deploymentId, `⚠️ تعذر التحقق من مسار المصادقة: ${err.message}`, "warn");
    }
  }

  private async cleanupOldBackups(deploymentId: string, sshCmd: string, remoteDir: string, maxAgeDays = 7) {
    try {
      const result = await this.execWithLog(
        deploymentId,
        `${sshCmd} "CNT=\\$(find ${remoteDir}/android -type f -name '*.bak.*' -mtime +${maxAgeDays} 2>/dev/null | wc -l); find ${remoteDir}/android -type f -name '*.bak.*' -mtime +${maxAgeDays} -delete 2>/dev/null; echo BAK_CLEANED=\\$CNT"`,
        "Cleanup old backups",
        15000
      );
      const countMatch = result.match(/BAK_CLEANED=(\d+)/);
      const count = countMatch ? parseInt(countMatch[1]) : 0;
      if (count > 0) {
        await this.addLog(deploymentId, `تم حذف ${count} ملف نسخ احتياطي قديم (أكثر من ${maxAgeDays} أيام)`, "info");
      }
    } catch {
    }
  }

  private async stepSyncCapacitor(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "مزامنة Capacitor للأندرويد...", "info");
    const remoteDir = "/home/administrator/app2";

    await this.cleanupOldBackups(deploymentId, sshCmd, remoteDir);

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
      `${sshCmd} "cd ${remoteDir} && if which npx >/dev/null 2>&1; then set -o pipefail; timeout 90 npx cap sync android 2>&1 | tail -20; EC=\\$?; if [ \\$EC -eq 0 ]; then echo 'CAP_SYNC_OK'; elif [ \\$EC -eq 124 ]; then echo 'CAP_SYNC_TIMEOUT'; else echo 'CAP_SYNC_FAIL_CODE='\\$EC; fi; else echo 'CAP_SYNC_SKIP_NO_NPX'; fi"`,
      "Capacitor Plugin Sync",
      120000
    );

    if (capSyncResult.includes("CAP_SYNC_OK")) {
      await this.addLog(deploymentId, "✅ تم مزامنة Capacitor plugins (PushNotifications, NativeBiometric, ...)", "success");
    } else if (capSyncResult.includes("CAP_SYNC_TIMEOUT")) {
      await this.addLog(deploymentId, "⚠️ cap sync تجاوز المهلة (90 ثانية) — مزامنة يدوية للأصول", "warn");
      await this.execWithLog(
        deploymentId,
        `${sshCmd} "cd ${remoteDir} && rm -rf android/app/src/main/assets/public && mkdir -p android/app/src/main/assets/public && cp -r www/* android/app/src/main/assets/public/ && cp capacitor.config.json android/app/src/main/assets/capacitor.config.json 2>/dev/null; echo 'SYNC_OK'"`,
        "Manual Asset Sync (timeout fallback)",
        60000
      );
    } else if (capSyncResult.includes("CAP_SYNC_FAIL_CODE")) {
      const codeMatch = capSyncResult.match(/CAP_SYNC_FAIL_CODE=(\d+)/);
      await this.addLog(deploymentId, `⚠️ cap sync فشل (exit code: ${codeMatch?.[1] || '?'}) — مزامنة يدوية للأصول`, "warn");
      await this.execWithLog(
        deploymentId,
        `${sshCmd} "cd ${remoteDir} && rm -rf android/app/src/main/assets/public && mkdir -p android/app/src/main/assets/public && cp -r www/* android/app/src/main/assets/public/ && cp capacitor.config.json android/app/src/main/assets/capacitor.config.json 2>/dev/null; echo 'SYNC_OK'"`,
        "Manual Asset Sync (error fallback)",
        60000
      );
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

    await this.addLog(deploymentId, "فحص علامات الكود المطلوبة في البناء...", "info");
    const codeMarkersResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir}/android/app/src/main/assets/public/assets && MARKERS='MODULE_LOAD LOGIN_SUBMIT AUTH_INIT_START DETECT_PLATFORM LOGIN_FN_START LOGIN_RESPONSE'; PASS=0; FAIL=0; for M in \\$MARKERS; do if grep -rlq \\"\\$M\\" *.js 2>/dev/null; then echo \\"MARKER_OK:\\$M\\"; PASS=\\$((PASS+1)); else echo \\"MARKER_MISSING:\\$M\\"; FAIL=\\$((FAIL+1)); fi; done; echo \\"MARKERS_RESULT:\\$PASS/\\$((PASS+FAIL))\\"; if [ \\$FAIL -gt 0 ]; then echo 'CODE_MARKERS_INCOMPLETE'; else echo 'CODE_MARKERS_OK'; fi"`,
      "Code Markers Verification",
      30000
    );

    if (codeMarkersResult.includes("CODE_MARKERS_INCOMPLETE")) {
      const missingMarkers = codeMarkersResult.split('\n')
        .filter(l => l.includes("MARKER_MISSING:"))
        .map(l => l.replace("MARKER_MISSING:", "").trim());
      await this.addLog(deploymentId, `⚠️ علامات كود مفقودة: ${missingMarkers.join(", ")} — قد يكون البناء من نسخة قديمة!`, "warn");
    } else if (codeMarkersResult.includes("CODE_MARKERS_OK")) {
      const countMatch = codeMarkersResult.match(/MARKERS_RESULT:(\d+\/\d+)/);
      await this.addLog(deploymentId, `✅ جميع علامات الكود موجودة (${countMatch?.[1] || "OK"}) — البناء من أحدث نسخة`, "success");
    }

    await this.addLog(deploymentId, "🔍 فحص وإصلاح ما بعد المزامنة (post-sync validation)...", "info");

    const postSyncScript = [
      `#!/bin/bash`,
      `set -e`,
      `DIR="${remoteDir}"`,
      `MANIFEST="$DIR/android/app/src/main/AndroidManifest.xml"`,
      `VARS="$DIR/android/variables.gradle"`,
      `BUILD_GRADLE="$DIR/android/app/build.gradle"`,
      `MAIN_ACT="$DIR/android/app/src/main/java/com/axion/app/MainActivity.java"`,
      `FIXES=0`,
      ``,
      `echo "=== POST_SYNC_VARIABLES ==="`,
      `if [ -f "$VARS" ]; then`,
      `  CUR_MIN=$(grep -oP 'minSdkVersion\\s*=\\s*\\K[0-9]+' "$VARS" 2>/dev/null || echo 0)`,
      `  CUR_TARGET=$(grep -oP 'targetSdkVersion\\s*=\\s*\\K[0-9]+' "$VARS" 2>/dev/null || echo 0)`,
      `  CUR_COMPILE=$(grep -oP 'compileSdkVersion\\s*=\\s*\\K[0-9]+' "$VARS" 2>/dev/null || echo 0)`,
      `  echo "BEFORE: minSdk=$CUR_MIN targetSdk=$CUR_TARGET compileSdk=$CUR_COMPILE"`,
      `  if [ "$CUR_MIN" -lt 26 ]; then`,
      `    sed -i "s/minSdkVersion = $CUR_MIN/minSdkVersion = 26/" "$VARS"`,
      `    echo "FIXED_MINSDK: $CUR_MIN -> 26"`,
      `    FIXES=$((FIXES+1))`,
      `  fi`,
      `  if [ "$CUR_TARGET" -lt 34 ]; then`,
      `    sed -i "s/targetSdkVersion = $CUR_TARGET/targetSdkVersion = 35/" "$VARS"`,
      `    echo "FIXED_TARGETSDK: $CUR_TARGET -> 35"`,
      `    FIXES=$((FIXES+1))`,
      `  fi`,
      `  if [ "$CUR_COMPILE" -lt 35 ]; then`,
      `    sed -i "s/compileSdkVersion = $CUR_COMPILE/compileSdkVersion = 35/" "$VARS"`,
      `    echo "FIXED_COMPILESDK: $CUR_COMPILE -> 35"`,
      `    FIXES=$((FIXES+1))`,
      `  fi`,
      `  echo "AFTER: $(grep -E 'minSdk|targetSdk|compileSdk' "$VARS" | tr '\\n' ' ')"`,
      `fi`,
      ``,
      `echo "=== POST_SYNC_MANIFEST ==="`,
      `if [ -f "$MANIFEST" ]; then`,
      `  cp "$MANIFEST" "$MANIFEST.bak.$(date +%s)" 2>/dev/null || true`,
      `  REQUIRED_PERMS="INTERNET ACCESS_NETWORK_STATE POST_NOTIFICATIONS VIBRATE RECEIVE_BOOT_COMPLETED WAKE_LOCK SCHEDULE_EXACT_ALARM USE_EXACT_ALARM USE_BIOMETRIC USE_FINGERPRINT"`,
      `  for P in $REQUIRED_PERMS; do`,
      `    if ! grep -q "$P" "$MANIFEST"; then`,
      `      sed -i "/<\\/manifest>/i\\    <uses-permission android:name=\\"android.permission.$P\\"/>" "$MANIFEST"`,
      `      echo "PERM_ADDED: $P"`,
      `      FIXES=$((FIXES+1))`,
      `    fi`,
      `  done`,
      `  STORAGE_PERMS='<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>'`,
      `  grep -q "READ_EXTERNAL_STORAGE" "$MANIFEST" || { sed -i "/<\\/manifest>/i\\    $STORAGE_PERMS" "$MANIFEST"; echo "PERM_ADDED: READ_EXTERNAL_STORAGE"; FIXES=$((FIXES+1)); }`,
      `  WRITE_PERM='<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29"/>'`,
      `  grep -q "WRITE_EXTERNAL_STORAGE" "$MANIFEST" || { sed -i "/<\\/manifest>/i\\    $WRITE_PERM" "$MANIFEST"; echo "PERM_ADDED: WRITE_EXTERNAL_STORAGE"; FIXES=$((FIXES+1)); }`,
      `  PERM_COUNT=$(grep -c "uses-permission" "$MANIFEST")`,
      `  echo "MANIFEST_PERMS: $PERM_COUNT"`,
      `else`,
      `  echo "MANIFEST_MISSING"`,
      `fi`,
      ``,
      `echo "=== POST_SYNC_MAINACTIVITY ==="`,
      `mkdir -p "$(dirname "$MAIN_ACT")"`,
      `if [ ! -f "$MAIN_ACT" ] || ! grep -q "onSaveInstanceState" "$MAIN_ACT"; then`,
      `  cp "$MAIN_ACT" "$MAIN_ACT.bak.$(date +%s)" 2>/dev/null || true`,
      `  cat > "$MAIN_ACT" << 'JAVAEOF'`,
      `package com.axion.app;`,
      ``,
      `import android.os.Bundle;`,
      `import com.getcapacitor.BridgeActivity;`,
      ``,
      `public class MainActivity extends BridgeActivity {`,
      `    @Override`,
      `    public void onSaveInstanceState(Bundle outState) {`,
      `        super.onSaveInstanceState(outState);`,
      `        outState.clear();`,
      `    }`,
      `}`,
      `JAVAEOF`,
      `  echo "MAINACTIVITY_FIXED"`,
      `  FIXES=$((FIXES+1))`,
      `else`,
      `  echo "MAINACTIVITY_OK"`,
      `fi`,
      ``,
      `echo "=== POST_SYNC_KEYSTORE ==="`,
      `KS_DEST="$DIR/android/app/axion-release.keystore"`,
      `if [ ! -f "$KS_DEST" ]; then`,
      `  for KS_SRC in /home/administrator/.axion-keystore/axion-release.keystore /home/administrator/axion-release.keystore "$DIR/administrator/.axion-keystore/axion-release.keystore"; do`,
      `    if [ -f "$KS_SRC" ]; then cp "$KS_SRC" "$KS_DEST" && echo "KEYSTORE_RESTORED" && FIXES=$((FIXES+1)) && break; fi`,
      `  done`,
      `  [ -f "$KS_DEST" ] || echo "KEYSTORE_STILL_MISSING"`,
      `else`,
      `  echo "KEYSTORE_OK"`,
      `fi`,
      ``,
      `echo "=== POST_SYNC_GOOGLE_SERVICES ==="`,
      `GS="$DIR/android/app/google-services.json"`,
      `if [ -f "$GS" ]; then echo "GOOGLE_SERVICES_OK"; elif [ -f "$DIR/google-services.json" ]; then cp "$DIR/google-services.json" "$GS" && echo "GOOGLE_SERVICES_COPIED" && FIXES=$((FIXES+1)); else echo "GOOGLE_SERVICES_MISSING"; fi`,
      ``,
      `echo "=== POST_SYNC_FILE_PATHS ==="`,
      `FP="$DIR/android/app/src/main/res/xml/file_paths.xml"`,
      `mkdir -p "$(dirname "$FP")"`,
      `if [ ! -f "$FP" ] || ! grep -q "external-cache-path" "$FP"; then`,
      `  cat > "$FP" << 'FPEOF'`,
      `<?xml version="1.0" encoding="utf-8"?>`,
      `<paths xmlns:android="http://schemas.android.com/apk/res/android">`,
      `    <cache-path name="my_cache_images" path="." />`,
      `    <files-path name="my_internal_files" path="." />`,
      `    <external-cache-path name="my_external_cache" path="." />`,
      `</paths>`,
      `FPEOF`,
      `  echo "FILE_PATHS_FIXED"`,
      `  FIXES=$((FIXES+1))`,
      `else`,
      `  echo "FILE_PATHS_OK"`,
      `fi`,
      ``,
      `echo "POST_SYNC_TOTAL_FIXES=$FIXES"`,
    ].join('\n');

    const scriptB64 = Buffer.from(postSyncScript).toString('base64');
    const checksResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "echo '${scriptB64}' | base64 -d | bash"`,
      "Post-Sync Validation & Auto-fix",
      30000
    );

    const fixCountMatch = checksResult.match(/POST_SYNC_TOTAL_FIXES=(\d+)/);
    const totalFixes = fixCountMatch ? parseInt(fixCountMatch[1]) : 0;

    if (checksResult.includes("FIXED_MINSDK")) {
      const m = checksResult.match(/FIXED_MINSDK: (\d+) -> (\d+)/);
      await this.addLog(deploymentId, `🔧 تم إصلاح minSdk: ${m?.[1]} → ${m?.[2]} (cap sync أعاده للافتراضي)`, "success");
    }
    if (checksResult.includes("FIXED_TARGETSDK")) {
      await this.addLog(deploymentId, "🔧 تم إصلاح targetSdk → 35", "success");
    }
    if (checksResult.includes("FIXED_COMPILESDK")) {
      await this.addLog(deploymentId, "🔧 تم إصلاح compileSdk → 35", "success");
    }

    const addedPerms = checksResult.split('\n').filter(l => l.includes("PERM_ADDED:"));
    if (addedPerms.length > 0) {
      await this.addLog(deploymentId, `🔧 تمت إضافة ${addedPerms.length} صلاحية مفقودة: ${addedPerms.map(l => l.split(":")[1]?.trim()).join(", ")}`, "success");
    }

    const permCountMatch = checksResult.match(/MANIFEST_PERMS: (\d+)/);
    if (permCountMatch) {
      await this.addLog(deploymentId, `✅ إجمالي الصلاحيات في AndroidManifest: ${permCountMatch[1]}`, "info");
    }

    if (checksResult.includes("MAINACTIVITY_FIXED")) {
      await this.addLog(deploymentId, "🔧 تم إصلاح MainActivity (onSaveInstanceState لـ FileSharer)", "success");
    }
    if (checksResult.includes("KEYSTORE_RESTORED")) {
      await this.addLog(deploymentId, "🔧 تم استعادة Keystore تلقائياً", "success");
    }
    if (checksResult.includes("KEYSTORE_STILL_MISSING")) {
      await this.addLog(deploymentId, "⚠️ Keystore لا يزال مفقوداً — سيتم التحقق في خطوة gradle-build", "warn");
    }

    if (checksResult.includes("GOOGLE_SERVICES_OK")) {
      await this.addLog(deploymentId, "✅ google-services.json موجود", "info");
    } else if (checksResult.includes("GOOGLE_SERVICES_COPIED")) {
      await this.addLog(deploymentId, "🔧 تم نسخ google-services.json تلقائياً", "success");
    } else if (checksResult.includes("GOOGLE_SERVICES_MISSING")) {
      await this.addLog(deploymentId, "⚠️ google-services.json مفقود — Push لن تعمل بدون Firebase", "warn");
    }

    if (checksResult.includes("FILE_PATHS_FIXED")) {
      await this.addLog(deploymentId, "🔧 تم إصلاح file_paths.xml للمشاركة", "success");
    }

    if (checksResult.includes("MANIFEST_MISSING")) {
      await this.addLog(deploymentId, "⚠️ AndroidManifest.xml مفقود — تأكد من وجود مشروع Android صحيح", "warn");
    }

    if (totalFixes > 0) {
      await this.addLog(deploymentId, `✅ تم تطبيق ${totalFixes} إصلاح تلقائي بعد المزامنة`, "success");
    } else {
      await this.addLog(deploymentId, "✅ لا حاجة لإصلاحات — جميع الإعدادات صحيحة بعد المزامنة", "success");
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
        `${sshCmd} 'cd ${remoteDir} && mkdir -p /tmp/android_app_bak && cp -r android/app /tmp/android_app_bak/ 2>/dev/null; rm -rf android && timeout 60 npx cap add android 2>&1 | tail -5 && cp -r /tmp/android_app_bak/app/* android/app/ 2>/dev/null; timeout 90 npx cap sync android 2>&1 | tail -5 && rm -rf /tmp/android_app_bak && echo CAP_READD_DONE'`,
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
    await this.addLog(deploymentId, "توليد أيقونات التطبيق (Adaptive Icons) [v2-base64]...", "info");
    const R = "/home/administrator/app2";
    const D = `${R}/android/app/src/main/res`;
    const iconSource = `${R}/client/public/assets/app_icon_light.png`;
    const fallbackSource = `${R}/client/src/assets/images/app_icon_light.png`;
    const bgColor = "#1e293b";

    const scriptContent = [
      `#!/bin/bash`,
      `set -e`,
      `echo "[stepGenerateIcons v2-base64] starting..."`,
      `cd ${R}`,
      `SOURCE='${iconSource}'`,
      `[ ! -f "$SOURCE" ] && SOURCE='${fallbackSource}'`,
      `[ ! -f "$SOURCE" ] && echo 'ICON_SOURCE_MISSING' && exit 0`,
      `echo "Icon source: $SOURCE"`,
      `which magick >/dev/null 2>&1 && CONVERT='magick' || { which convert >/dev/null 2>&1 && CONVERT='convert'; } || { echo 'ImageMagick not installed' && exit 0; }`,
      `mkdir -p ${D}/mipmap-mdpi ${D}/mipmap-hdpi ${D}/mipmap-xhdpi ${D}/mipmap-xxhdpi ${D}/mipmap-xxxhdpi ${D}/mipmap-anydpi-v26 ${D}/values`,
      `echo "Dirs created OK"`,
      `$CONVERT "$SOURCE" -resize 1024x1024 -gravity center -background none -extent 1024x1024 /tmp/axion_src.png`,
      `$CONVERT -size 1024x1024 xc:none /tmp/axion_src.png -gravity center -geometry 682x682+0+0 -composite /tmp/axion_fg.png`,
      `$CONVERT /tmp/axion_fg.png -resize 108x108 ${D}/mipmap-mdpi/ic_launcher_foreground.png`,
      `$CONVERT /tmp/axion_fg.png -resize 162x162 ${D}/mipmap-hdpi/ic_launcher_foreground.png`,
      `$CONVERT /tmp/axion_fg.png -resize 216x216 ${D}/mipmap-xhdpi/ic_launcher_foreground.png`,
      `$CONVERT /tmp/axion_fg.png -resize 324x324 ${D}/mipmap-xxhdpi/ic_launcher_foreground.png`,
      `$CONVERT /tmp/axion_fg.png -resize 432x432 ${D}/mipmap-xxxhdpi/ic_launcher_foreground.png`,
      `$CONVERT -size 1024x1024 "xc:${bgColor}" /tmp/axion_bg.png`,
      `$CONVERT /tmp/axion_bg.png /tmp/axion_fg.png -gravity center -composite /tmp/axion_legacy.png`,
      `$CONVERT /tmp/axion_legacy.png -resize 48x48 ${D}/mipmap-mdpi/ic_launcher.png`,
      `$CONVERT /tmp/axion_legacy.png -resize 72x72 ${D}/mipmap-hdpi/ic_launcher.png`,
      `$CONVERT /tmp/axion_legacy.png -resize 96x96 ${D}/mipmap-xhdpi/ic_launcher.png`,
      `$CONVERT /tmp/axion_legacy.png -resize 144x144 ${D}/mipmap-xxhdpi/ic_launcher.png`,
      `$CONVERT /tmp/axion_legacy.png -resize 192x192 ${D}/mipmap-xxxhdpi/ic_launcher.png`,
      `for DPI in mdpi hdpi xhdpi xxhdpi xxxhdpi; do cp ${D}/mipmap-$DPI/ic_launcher.png ${D}/mipmap-$DPI/ic_launcher_round.png 2>/dev/null || true; done`,
      `cat > ${D}/values/ic_launcher_background.xml << 'XMLEOF'`,
      `<?xml version="1.0" encoding="utf-8"?>`,
      `<resources>`,
      `    <color name="ic_launcher_background">${bgColor}</color>`,
      `</resources>`,
      `XMLEOF`,
      `cat > ${D}/mipmap-anydpi-v26/ic_launcher.xml << 'XMLEOF'`,
      `<?xml version="1.0" encoding="utf-8"?>`,
      `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">`,
      `    <background android:drawable="@color/ic_launcher_background"/>`,
      `    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>`,
      `</adaptive-icon>`,
      `XMLEOF`,
      `cp ${D}/mipmap-anydpi-v26/ic_launcher.xml ${D}/mipmap-anydpi-v26/ic_launcher_round.xml`,
      `rm -f /tmp/axion_src.png /tmp/axion_fg.png /tmp/axion_bg.png /tmp/axion_legacy.png`,
      `echo 'ICONS_GENERATED_OK'`,
    ].join("\n");

    const b64 = Buffer.from(scriptContent).toString("base64");

    await this.execWithLog(
      deploymentId,
      `${sshCmd} 'echo ${b64} | base64 -d > /tmp/axion_icons_${deploymentId.substring(0,8)}.sh && chmod +x /tmp/axion_icons_${deploymentId.substring(0,8)}.sh && bash /tmp/axion_icons_${deploymentId.substring(0,8)}.sh && rm -f /tmp/axion_icons_${deploymentId.substring(0,8)}.sh'`,
      "Generate Adaptive Icons",
      60000
    );

    await this.addLog(deploymentId, "✅ تم توليد أيقونات Android Adaptive (foreground + background + XML)", "success");
  }

  private async stepGradleBuild(deploymentId: string, sshCmd: string, config: DeploymentConfig) {
    await this.addLog(deploymentId, "بدء بناء Gradle (قد يستغرق 2-3 دقائق)...", "info");
    this.updateStepProgress(deploymentId, "gradle-build", 5, "فحص Gradle Wrapper...");
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
    if (!canSignRelease) {
      const reason = !hasKeystore ? "Keystore غير موجود" : "KEYSTORE_PASSWORD غير مُعدّ";
      throw new Error(`❌ لا يمكن بناء Release APK: ${reason}. لن يتم بناء Debug APK — استخدم android-readiness لتشخيص المشكلة.`);
    }

    const buildType = "assembleRelease";
    await this.addLog(deploymentId, "✅ Keystore + كلمة المرور جاهزان — بناء Release APK", "info");

    if (canSignRelease) {
      const localPassFile = `/tmp/.ks_pass_${deploymentId}`;
      const localKeyPassFile = `/tmp/.ks_key_pass_${deploymentId}`;
      try {
        writeFileSync(localPassFile, keystorePassword, { mode: 0o600 });
        writeFileSync(localKeyPassFile, keystoreKeyPassword, { mode: 0o600 });

        const scpPassCmd = this.buildSCPCommand(localPassFile, "/tmp/.ks_pass");
        const scpKeyCmd = this.buildSCPCommand(localKeyPassFile, "/tmp/.ks_key_pass");
        await this.execWithLog(
          deploymentId,
          `${scpPassCmd} && ${scpKeyCmd} && ${sshCmd} "chmod 600 /tmp/.ks_pass /tmp/.ks_key_pass && echo 'SECRETS_WRITTEN'"`,
          "Write Signing Secrets",
          30000
        );
      } finally {
        try { unlinkSync(localPassFile); } catch {}
        try { unlinkSync(localKeyPassFile); } catch {}
      }
    }

    const envExports = canSignRelease
      ? `export KEYSTORE_PASSWORD=\\$(cat /tmp/.ks_pass) && export KEYSTORE_ALIAS='${keystoreAlias}' && export KEYSTORE_KEY_PASSWORD=\\$(cat /tmp/.ks_key_pass) && `
      : "";

    const trapCleanup = canSignRelease ? "trap 'rm -f /tmp/.ks_pass /tmp/.ks_key_pass' EXIT; " : "";

    this.updateStepProgress(deploymentId, "gradle-build", 10, "إصلاح تلقائي قبل البناء...");
    try {
      await this.execWithLog(
        deploymentId,
        `${sshCmd} "cd ${remoteDir}/android && ` +
          `sed -i 's/minSdkVersion = [0-9]*/minSdkVersion = 26/' variables.gradle 2>/dev/null; ` +
          `sed -i 's/minSdk [0-9]*/minSdk 26/' app/build.gradle 2>/dev/null; ` +
          `grep -q 'onSaveInstanceState' app/src/main/java/com/axion/app/MainActivity.java 2>/dev/null || ` +
          `{ cp app/src/main/java/com/axion/app/MainActivity.java app/src/main/java/com/axion/app/MainActivity.java.bak.\\$(date +%s) 2>/dev/null; ` +
          `printf 'package com.axion.app;\\nimport android.os.Bundle;\\nimport com.getcapacitor.BridgeActivity;\\npublic class MainActivity extends BridgeActivity {\\n    @Override\\n    public void onSaveInstanceState(Bundle outState) {\\n        super.onSaveInstanceState(outState);\\n        outState.clear();\\n    }\\n}\\n' > app/src/main/java/com/axion/app/MainActivity.java; }; ` +
          `for KS in /home/administrator/.axion-keystore/axion-release.keystore /home/administrator/axion-release.keystore; do ` +
            `if [ ! -f app/axion-release.keystore ] && [ -f \\$KS ]; then cp \\$KS app/axion-release.keystore; fi; done; ` +
          `echo 'PRE_BUILD_FIX_OK'"`,
        "Pre-build Auto-fix",
        15000
      );
      await this.addLog(deploymentId, "✅ إصلاحات تلقائية قبل البناء: minSdk=26, MainActivity, Keystore", "success");
    } catch {
      await this.addLog(deploymentId, "⚠️ تعذر تطبيق بعض الإصلاحات التلقائية", "warn");
    }

    this.updateStepProgress(deploymentId, "gradle-build", 25, "بناء Gradle (قد يستغرق 2-3 دقائق)...");

    const gradleCmd = `${sshCmd} "${trapCleanup}set -o pipefail && cd ${remoteDir}/android && export JAVA_HOME=\\$([ -d /usr/lib/jvm/java-21-openjdk-amd64 ] && echo /usr/lib/jvm/java-21-openjdk-amd64 || echo /usr/lib/jvm/java-17-openjdk-amd64) && export PATH=\\$JAVA_HOME/bin:\\$PATH && export ANDROID_HOME=/opt/android-sdk && ${envExports}chmod +x gradlew && ./gradlew ${buildType} --no-daemon --warning-mode=none --stacktrace 2>&1 && echo 'GRADLE_OK'"`;

    try {
      await this.execWithLog(deploymentId, gradleCmd, "Gradle Build", 1200000);
    } catch (gradleErr: any) {
      const errMsg = gradleErr.message || "";

      if (errMsg.includes("minSdkVersion") && errMsg.includes("cannot be smaller")) {
        await this.addLog(deploymentId, "🔧 خطأ minSdk — جاري الإصلاح التلقائي وإعادة المحاولة...", "warn");
        const minSdkMatch = errMsg.match(/version (\d+) declared in library/);
        const requiredMin = minSdkMatch ? parseInt(minSdkMatch[1]) : 26;
        await this.execWithLog(
          deploymentId,
          `${sshCmd} "cd ${remoteDir}/android && sed -i 's/minSdkVersion = [0-9]*/minSdkVersion = ${requiredMin}/' variables.gradle 2>/dev/null; sed -i 's/minSdk [0-9]*/minSdk ${requiredMin}/' app/build.gradle 2>/dev/null; echo 'MINSDK_FIXED_TO_${requiredMin}'"`,
          "Auto-fix minSdk retry",
          10000
        );
        await this.addLog(deploymentId, `✅ تم رفع minSdk إلى ${requiredMin} — إعادة المحاولة...`, "success");
        this.updateStepProgress(deploymentId, "gradle-build", 30, "إعادة بناء Gradle بعد الإصلاح...");
        await this.execWithLog(deploymentId, gradleCmd, "Gradle Build Retry", 1200000);
      } else if (errMsg.includes("invalid source release") || errMsg.includes("invalid target release")) {
        await this.addLog(deploymentId, "🔧 خطأ إصدار Java — جاري تبديل JAVA_HOME وإعادة المحاولة...", "warn");
        const retryCmd = gradleCmd.replace(
          "export JAVA_HOME=\\$([ -d /usr/lib/jvm/java-21-openjdk-amd64 ] && echo /usr/lib/jvm/java-21-openjdk-amd64 || echo /usr/lib/jvm/java-17-openjdk-amd64)",
          "export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
        );
        await this.execWithLog(deploymentId, retryCmd, "Gradle Build Retry (Java 21)", 1200000);
      } else if (errMsg.includes("No such file or directory") && errMsg.includes("android")) {
        await this.addLog(deploymentId, "🔧 مجلد Android مفقود — جاري إعادة إنشائه...", "warn");
        await this.execWithLog(
          deploymentId,
          `${sshCmd} "cd ${remoteDir} && timeout 60 npx cap add android 2>&1 | tail -5 && timeout 90 npx cap sync android 2>&1 | tail -5 && echo 'ANDROID_RECREATED'"`,
          "Auto-fix Android Dir",
          120000
        );
        await this.execWithLog(deploymentId, gradleCmd, "Gradle Build Retry (recreated)", 1200000);
      } else {
        throw gradleErr;
      }
    }
    this.updateStepProgress(deploymentId, "gradle-build", 95, "اكتمل بناء Gradle");
  }

  // NOTE: هذه الخطوة تنسخ APK من مخرجات Gradle إلى مجلد releases — التوقيع الفعلي يتم عبر Gradle signing config
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

  private async stepApkIntegrity(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🔐 فحص سلامة APK — التحقق من checksum والتوقيع...", "info");
    const remoteDir = "/home/administrator/app2";

    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
    if (!deployment) throw new Error("Deployment not found");

    const version = deployment.version || "0.0.0";
    const buildNum = deployment.buildNumber || 0;
    const apkFileName = `AXION_v${version}_build${buildNum}.apk`;
    const releasesDir = `${remoteDir}/releases/v${version}`;
    const apkPath = `${releasesDir}/${apkFileName}`;

    const checksumOutput = await this.execWithLog(
      deploymentId,
      `${sshCmd} "if [ -f ${apkPath} ]; then sha256sum ${apkPath} | awk '{print \\$1}' && echo 'CHECKSUM_OK'; else echo 'APK_NOT_FOUND'; fi"`,
      "APK Checksum",
      30000
    );

    if (checksumOutput.includes("APK_NOT_FOUND")) {
      throw new Error("❌ APK غير موجود لفحص السلامة — تحقق من خطوة sign-apk");
    }

    const checksumLines = checksumOutput.trim().split("\n");
    const sha256 = checksumLines.find(l => /^[a-f0-9]{64}$/.test(l.trim()));

    if (!sha256) {
      throw new Error("🚫 تعذر استخراج SHA-256 checksum — فحص السلامة فشل");
    } else {
      await this.addLog(deploymentId, `✅ SHA-256: ${sha256.trim().substring(0, 16)}...`, "success");
    }

    let signatureValid = false;
    const sigVerify = await this.execWithLog(
      deploymentId,
      `${sshCmd} "APKSIGNER_BIN=\\$(command -v apksigner 2>/dev/null || find /opt/android-sdk/build-tools -name apksigner 2>/dev/null | sort -V | tail -1); if [ -n \\"\\$APKSIGNER_BIN\\" ] && [ -x \\"\\$APKSIGNER_BIN\\" ]; then echo \\"[TOOL] Using: \\$APKSIGNER_BIN\\"; \\$APKSIGNER_BIN verify --verbose --print-certs ${apkPath} 2>&1; if [ \\$? -eq 0 ]; then echo 'APKSIGNER_VERIFIED'; else echo 'APKSIGNER_FAILED'; fi; elif command -v jarsigner >/dev/null 2>&1; then echo '[TOOL] Using: jarsigner (fallback)'; JARSIGNER_OUT=\\$(jarsigner -verify ${apkPath} 2>&1); echo \\"\\$JARSIGNER_OUT\\"; if echo \\"\\$JARSIGNER_OUT\\" | grep -qi 'verified'; then echo 'JARSIGNER_VERIFIED'; elif echo \\"\\$JARSIGNER_OUT\\" | grep -qi 'no manifest'; then echo 'JARSIGNER_V2_LIKELY'; else echo 'JARSIGNER_FAILED'; fi; else echo 'NO_SIGNER_TOOL'; fi"`,
      "APK Signature Verify",
      30000
    );

    if (sigVerify.includes("APKSIGNER_VERIFIED")) {
      signatureValid = true;
      const v2 = sigVerify.includes("v2 scheme (APK Signature Scheme v2): true");
      const v3 = sigVerify.includes("v3 scheme (APK Signature Scheme v3): true");
      const scheme = v3 ? "v3" : v2 ? "v2" : "v2/v3";
      await this.addLog(deploymentId, `✅ التوقيع الرقمي صالح (apksigner — ${scheme})`, "success");
      const dnMatch = sigVerify.match(/certificate DN: (.+)/);
      if (dnMatch) {
        await this.addLog(deploymentId, `📜 الشهادة: ${dnMatch[1]}`, "info");
      }
    } else if (sigVerify.includes("APKSIGNER_FAILED")) {
      await this.addLog(deploymentId, "❌ فشل التحقق من التوقيع عبر apksigner", "error");
      throw new Error("🚫 فشل فحص سلامة APK: التوقيع الرقمي غير صالح (apksigner)");
    } else if (sigVerify.includes("JARSIGNER_VERIFIED")) {
      signatureValid = true;
      await this.addLog(deploymentId, "✅ التوقيع الرقمي صالح (jarsigner — v1)", "success");
    } else if (sigVerify.includes("JARSIGNER_V2_LIKELY")) {
      signatureValid = true;
      await this.addLog(deploymentId, "✅ APK موقّع بـ v2/v3 (jarsigner لا يرى v1 manifest — طبيعي)", "success");
      await this.addLog(deploymentId, "💡 يُنصح بتثبيت apksigner في PATH للتحقق الكامل", "info");
    } else if (sigVerify.includes("JARSIGNER_FAILED")) {
      await this.addLog(deploymentId, "❌ فشل التحقق من التوقيع عبر jarsigner", "error");
      throw new Error("🚫 فشل فحص سلامة APK: التوقيع الرقمي غير صالح (jarsigner)");
    } else if (sigVerify.includes("NO_SIGNER_TOOL")) {
      throw new Error("🚫 لا توجد أداة تحقق من التوقيع (apksigner/jarsigner) — APK مرفوض. ثبّت build-tools أو أضف apksigner إلى PATH");
    } else {
      throw new Error("🚫 فشل التعرف على مخرجات أداة التحقق — APK integrity غير مؤكد");
    }

    const integrityMeta = {
      sha256: sha256?.trim() || null,
      signatureValid,
      verifiedAt: new Date().toISOString(),
    };

    await this.updateDeployment(deploymentId, {
      environmentSnapshot: integrityMeta,
    });

    await this.addLog(deploymentId, "✅ فحص سلامة APK مكتمل", "success");
  }

  private async stepRetrieveArtifact(deploymentId: string) {
    await this.addLog(deploymentId, "تسجيل مسار APK على السيرفر...", "info");
    const remoteDir = "/home/administrator/app2";
    const sshCmd = this.buildSSHCommand();

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

      const downloadUrl = `/api/deployment/download/${deploymentId}`;
      await this.updateDeployment(deploymentId, {
        artifactUrl: remotePath,
        artifactSize,
      });

      await this.addLog(deploymentId, `✅ APK جاهز — رابط التحميل: ${downloadUrl} (${artifactSize})`, "success");

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

  private async stepAndroidReadiness(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🔧 فحص جاهزية بيئة Android على السيرفر (مع إصلاح تلقائي)...", "info");
    const remoteDir = "/home/administrator/app2";
    const errors: string[] = [];
    const autoFixes: string[] = [];

    const keystorePassword = process.env.KEYSTORE_PASSWORD || "";
    const keystoreAlias = process.env.KEYSTORE_ALIAS || "axion-key";
    const keystoreKeyPassword = process.env.KEYSTORE_KEY_PASSWORD || keystorePassword;

    if (!keystorePassword) {
      errors.push("KEYSTORE_PASSWORD غير معرّف");
    }
    if (!keystoreAlias) {
      errors.push("KEYSTORE_ALIAS غير معرّف");
    }
    if (!keystoreKeyPassword) {
      errors.push("KEYSTORE_KEY_PASSWORD غير معرّف");
    }

    if (keystorePassword && keystoreAlias && keystoreKeyPassword) {
      await this.addLog(deploymentId, "✅ متغيرات التوقيع: KEYSTORE_PASSWORD + KEYSTORE_ALIAS + KEYSTORE_KEY_PASSWORD", "success");
    }

    const readinessChecks = [
      `echo '=== KEYSTORE_CHECK ==='`,
      `if [ -f ${remoteDir}/android/app/axion-release.keystore ]; then echo KEYSTORE_FILE=OK; else echo KEYSTORE_FILE=MISSING; fi`,
      `echo '=== JDK_CHECK ==='`,
      `if [ -d /usr/lib/jvm/java-21-openjdk-amd64 ]; then /usr/lib/jvm/java-21-openjdk-amd64/bin/java -version 2>&1 | head -1; elif [ -d /usr/lib/jvm/java-17-openjdk-amd64 ]; then /usr/lib/jvm/java-17-openjdk-amd64/bin/java -version 2>&1 | head -1; else echo JDK_MISSING; fi`,
      `echo '=== SDK_CHECK ==='`,
      `if [ -d /opt/android-sdk ]; then echo SDK_DIR=OK; if [ -d /opt/android-sdk/platform-tools ]; then echo PLATFORM_TOOLS=OK; else echo PLATFORM_TOOLS=MISSING; fi; if ls /opt/android-sdk/build-tools/ 2>/dev/null | head -1; then echo BUILD_TOOLS=OK; else echo BUILD_TOOLS=MISSING; fi; else echo SDK_DIR=MISSING; fi`,
      `echo '=== GRADLEW_CHECK ==='`,
      `if [ -f ${remoteDir}/android/gradlew ]; then echo GRADLEW=OK; else echo GRADLEW=MISSING; fi`,
      `echo '=== DISK_CHECK ==='`,
      `DISKINFO=$(df -h ${remoteDir} | tail -1); echo "DISK_AVAIL=$(echo $DISKINFO | awk '{print $4}') DISK_USE=$(echo $DISKINFO | awk '{print $5}')"`,
      `echo '=== MINSDK_CHECK ==='`,
      `grep -E 'minSdk|minSdkVersion' ${remoteDir}/android/variables.gradle ${remoteDir}/android/app/build.gradle 2>/dev/null || echo 'MINSDK_NOTFOUND'`,
      `echo '=== MANIFEST_PERMISSIONS ==='`,
      `grep 'uses-permission' ${remoteDir}/android/app/src/main/AndroidManifest.xml 2>/dev/null | wc -l`,
      `echo '=== MAINACTIVITY_CHECK ==='`,
      `grep -c 'onSaveInstanceState' ${remoteDir}/android/app/src/main/java/com/axion/app/MainActivity.java 2>/dev/null || echo '0'`,
    ].join(" && ");

    try {
      const output = await this.execWithLog(
        deploymentId,
        `${sshCmd} "${readinessChecks}"`,
        "Android Readiness Check",
        30000
      );

      if (output.includes("KEYSTORE_FILE=MISSING")) {
        await this.addLog(deploymentId, "🔧 Keystore مفقود — جاري البحث والنسخ التلقائي...", "warn");
        try {
          const fixKs = await this.execWithLog(
            deploymentId,
            `${sshCmd} "for KS in /home/administrator/.axion-keystore/axion-release.keystore /home/administrator/axion-release.keystore /home/administrator/app2/administrator/.axion-keystore/axion-release.keystore; do if [ -f \\$KS ]; then cp \\$KS ${remoteDir}/android/app/axion-release.keystore && echo 'KEYSTORE_AUTO_FIXED' && break; fi; done; [ -f ${remoteDir}/android/app/axion-release.keystore ] && echo 'KEYSTORE_EXISTS_NOW' || echo 'KEYSTORE_STILL_MISSING'"`,
            "Auto-fix Keystore",
            15000
          );
          if (fixKs.includes("KEYSTORE_EXISTS_NOW")) {
            await this.addLog(deploymentId, "✅ تم نسخ Keystore تلقائياً", "success");
            autoFixes.push("keystore-copy");
          } else {
            errors.push("ملف keystore غير موجود ولم يُعثر على نسخة بديلة");
          }
        } catch {
          errors.push("ملف keystore غير موجود: android/app/axion-release.keystore");
        }
      } else {
        await this.addLog(deploymentId, "✅ ملف Keystore موجود", "success");
      }

      if (output.includes("JDK_MISSING")) {
        errors.push("JDK 17/21 غير مثبت على السيرفر");
      } else {
        const jdkMatch = output.match(/openjdk version "([^"]+)"/);
        const jdkVersion = jdkMatch?.[1] || "متوفر";
        await this.addLog(deploymentId, `✅ JDK: ${jdkVersion}`, "success");
        if (jdkVersion.startsWith("17") || jdkVersion.startsWith("1.8")) {
          await this.addLog(deploymentId, "🔧 JDK قديم — Capacitor 7 يحتاج Java 21. سيتم استخدام Java 21 إن وُجد أثناء البناء.", "warn");
        }
      }

      if (output.includes("SDK_DIR=MISSING")) {
        errors.push("Android SDK غير موجود في /opt/android-sdk");
      } else {
        await this.addLog(deploymentId, "✅ Android SDK موجود", "success");
        if (output.includes("PLATFORM_TOOLS=MISSING")) {
          await this.addLog(deploymentId, "⚠️ platform-tools مفقود", "warn");
        }
        if (output.includes("BUILD_TOOLS=MISSING")) {
          errors.push("build-tools مفقود في Android SDK");
        }
      }

      if (output.includes("GRADLEW=MISSING")) {
        await this.addLog(deploymentId, "⚠️ gradlew مفقود — سيتم إنشاؤه أثناء البناء", "warn");
      } else {
        await this.addLog(deploymentId, "✅ Gradle wrapper موجود", "success");
      }

      const diskMatch = output.match(/DISK_AVAIL=(\S+)\s+DISK_USE=(\S+)/);
      if (diskMatch) {
        const usePercent = parseInt(diskMatch[2]);
        if (usePercent > 95) {
          errors.push(`مساحة القرص منخفضة جداً: ${diskMatch[2]} مستخدم، ${diskMatch[1]} متاح`);
        } else if (usePercent > 90) {
          await this.addLog(deploymentId, `⚠️ مساحة القرص منخفضة: ${diskMatch[1]} متاح (${diskMatch[2]} مستخدم) — جاري تنظيف الملفات المؤقتة...`, "warn");
          try {
            await this.execWithLog(
              deploymentId,
              `${sshCmd} "cd ${remoteDir}/android && rm -rf .gradle/caches/transforms-* build/intermediates/*/debug 2>/dev/null; echo 'CLEANUP_OK'"`,
              "Auto-fix Disk Space",
              15000
            );
            autoFixes.push("disk-cleanup");
            await this.addLog(deploymentId, "✅ تم تنظيف ملفات البناء المؤقتة", "success");
          } catch {}
        } else {
          await this.addLog(deploymentId, `✅ مساحة القرص: ${diskMatch[1]} متاح (${diskMatch[2]} مستخدم)`, "success");
        }
      }

      const minSdkLow = output.match(/minSdk(?:Version)?\s*=?\s*(\d+)/);
      if (minSdkLow && parseInt(minSdkLow[1]) < 26) {
        await this.addLog(deploymentId, `🔧 minSdk=${minSdkLow[1]} أقل من 26 — جاري الإصلاح التلقائي...`, "warn");
        try {
          await this.execWithLog(
            deploymentId,
            `${sshCmd} "sed -i 's/minSdkVersion = ${minSdkLow[1]}/minSdkVersion = 26/' ${remoteDir}/android/variables.gradle 2>/dev/null; sed -i 's/minSdk ${minSdkLow[1]}/minSdk 26/' ${remoteDir}/android/app/build.gradle 2>/dev/null; grep -E 'minSdk|minSdkVersion' ${remoteDir}/android/variables.gradle ${remoteDir}/android/app/build.gradle 2>/dev/null && echo 'MINSDK_FIXED'"`,
            "Auto-fix minSdk",
            10000
          );
          autoFixes.push("minSdk-upgrade");
          await this.addLog(deploymentId, "✅ تم رفع minSdk إلى 26 (Android 8+) تلقائياً", "success");
        } catch (e: any) {
          await this.addLog(deploymentId, `⚠️ تعذر إصلاح minSdk تلقائياً: ${e.message}`, "warn");
        }
      }

      const permCount = output.match(/MANIFEST_PERMISSIONS[\s\S]*?(\d+)/);
      if (permCount && parseInt(permCount[1]) < 8) {
        await this.addLog(deploymentId, `🔧 عدد الصلاحيات (${permCount[1]}) أقل من المطلوب — جاري إضافة الصلاحيات المفقودة...`, "warn");
        try {
          const requiredPerms = [
            "android.permission.INTERNET",
            "android.permission.ACCESS_NETWORK_STATE",
            "android.permission.POST_NOTIFICATIONS",
            "android.permission.VIBRATE",
            "android.permission.RECEIVE_BOOT_COMPLETED",
            "android.permission.WAKE_LOCK",
            "android.permission.SCHEDULE_EXACT_ALARM",
            "android.permission.USE_EXACT_ALARM",
            "android.permission.USE_BIOMETRIC",
            "android.permission.USE_FINGERPRINT",
          ];
          const permLines = requiredPerms.map(p => `<uses-permission android:name=\\"${p}\\"/>`).join("\\n    ");
          await this.execWithLog(
            deploymentId,
            `${sshCmd} "MANIFEST=${remoteDir}/android/app/src/main/AndroidManifest.xml; cp \\$MANIFEST \\$MANIFEST.bak.\\$(date +%s) 2>/dev/null; for PERM in ${requiredPerms.map(p => p.split('.').pop()).join(' ')}; do grep -q \\$PERM \\$MANIFEST 2>/dev/null || echo 'NEED_FIX'; done | head -1 | grep -q NEED_FIX && sed -i '/<\\/manifest>/i\\    ${permLines}' \\$MANIFEST 2>/dev/null; echo 'PERMS_CHECKED'; grep 'uses-permission' \\$MANIFEST | wc -l"`,
            "Auto-fix Permissions",
            10000
          );
          autoFixes.push("manifest-permissions");
          await this.addLog(deploymentId, "✅ تم التحقق من الصلاحيات في AndroidManifest.xml", "success");
        } catch {
          await this.addLog(deploymentId, "⚠️ تعذر إصلاح الصلاحيات تلقائياً", "warn");
        }
      } else {
        await this.addLog(deploymentId, `✅ الصلاحيات في AndroidManifest: ${permCount?.[1] || '?'} صلاحية`, "success");
      }

      if (output.includes("MAINACTIVITY_CHECK") && output.includes("\n0")) {
        await this.addLog(deploymentId, "🔧 MainActivity بحاجة لإصلاح onSaveInstanceState لـ FileSharer...", "warn");
        try {
          await this.execWithLog(
            deploymentId,
            `${sshCmd} "cp ${remoteDir}/android/app/src/main/java/com/axion/app/MainActivity.java ${remoteDir}/android/app/src/main/java/com/axion/app/MainActivity.java.bak.\\$(date +%s) 2>/dev/null; cat > ${remoteDir}/android/app/src/main/java/com/axion/app/MainActivity.java << 'MAINEOF'
package com.axion.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.clear();
    }
}
MAINEOF
echo 'MAINACTIVITY_FIXED'"`,
            "Auto-fix MainActivity",
            10000
          );
          autoFixes.push("mainactivity-fix");
          await this.addLog(deploymentId, "✅ تم إصلاح MainActivity (onSaveInstanceState) تلقائياً", "success");
        } catch {
          await this.addLog(deploymentId, "⚠️ تعذر إصلاح MainActivity تلقائياً", "warn");
        }
      }

      if (keystorePassword && !errors.some(e => e.includes("keystore"))) {
        try {
          const tmpPassFile = `/tmp/.ks_check_${deploymentId}`;
          writeFileSync(tmpPassFile, keystorePassword, { mode: 0o600 });
          const scpCmd = this.buildSCPCommand(tmpPassFile, "/tmp/.ks_check_pass");

          const keytoolOutput = await this.execWithLog(
            deploymentId,
            `${scpCmd} && ${sshCmd} "export JAVA_HOME=\\$([ -d /usr/lib/jvm/java-21-openjdk-amd64 ] && echo /usr/lib/jvm/java-21-openjdk-amd64 || echo /usr/lib/jvm/java-17-openjdk-amd64) && export PATH=\\$JAVA_HOME/bin:\\$PATH && keytool -list -keystore ${remoteDir}/android/app/axion-release.keystore -storepass \\$(cat /tmp/.ks_check_pass) 2>&1; rm -f /tmp/.ks_check_pass"`,
            "Keystore Integrity",
            20000
          );

          try { unlinkSync(tmpPassFile); } catch {}

          if (keytoolOutput.includes("keytool error") || keytoolOutput.includes("password was incorrect")) {
            errors.push("كلمة مرور Keystore خاطئة أو الملف تالف");
          } else {
            await this.addLog(deploymentId, "✅ سلامة Keystore: كلمة المرور صحيحة", "success");

            if (keytoolOutput.includes(keystoreAlias)) {
              await this.addLog(deploymentId, `✅ Alias "${keystoreAlias}" مطابق`, "success");
            } else {
              errors.push(`Alias "${keystoreAlias}" غير موجود في Keystore — تحقق من KEYSTORE_ALIAS`);
            }
          }
        } catch (keytoolErr: any) {
          await this.addLog(deploymentId, `⚠️ تعذر التحقق من سلامة Keystore: ${keytoolErr.message}`, "warn");
        }
      }

    } catch (err: any) {
      errors.push(`فشل فحص السيرفر: ${err.message}`);
    }

    await this.addEvent(deploymentId, "android_readiness", "Android readiness check", {
      errorsCount: errors.length,
      errors,
      autoFixes,
    });

    if (autoFixes.length > 0) {
      await this.addLog(deploymentId, `🔧 تم تطبيق ${autoFixes.length} إصلاح تلقائي: ${autoFixes.join(", ")}`, "success");
    }

    if (errors.length > 0) {
      for (const err of errors) {
        await this.addLog(deploymentId, `❌ ${err}`, "error");
      }
      throw new Error(`🚫 فشل فحص جاهزية Android: ${errors.length} مشكلة — ${errors.join(" | ")}`);
    }

    await this.addLog(deploymentId, "✅ بيئة Android جاهزة للبناء", "success");
  }

  private async stepPrebuildGate(deploymentId: string, config?: DeploymentConfig) {
    await this.addLog(deploymentId, "🔍 بوابة ما قبل البناء — فحص المسارات + CORS + SSL + محاكاة أندرويد...", "info");

    const { runPrebuildChecks } = await import("./prebuild-route-checker");
    const baseUrl = this.resolveBaseUrl(config);

    try {
      const report = await runPrebuildChecks(baseUrl, {
        deployerToken: config?.deployerToken,
      });

      if (report.authTokenObtained) {
        await this.addLog(deploymentId, "✅ المصادقة: تم الحصول على توكن — فحص المسارات المحمية ممكن", "success");
      } else {
        await this.addLog(deploymentId, `🚫 المصادقة: فشل الحصول على توكن — ${report.summary.authWarning}`, "error");
      }

      if (report.sslCheck.passed) {
        await this.addLog(deploymentId, `✅ SSL: صالحة (تنتهي بعد ${report.sslCheck.daysUntilExpiry} يوم)`, "success");
      } else {
        await this.addLog(deploymentId, `❌ SSL: ${report.sslCheck.error}`, "error");
      }

      if (report.cspCheck.passed) {
        await this.addLog(deploymentId, "✅ CSP: connect-src يشمل capacitor://localhost + https://localhost", "success");
      } else {
        await this.addLog(deploymentId, `❌ CSP: ${report.cspCheck.error || "فحص CSP فشل"}`, "error");
      }

      const infraFailed = report.routeChecks.filter(r => r.isInfraFailure);
      const appFailed = report.routeChecks.filter(r => !r.passed && !r.isInfraFailure);
      const unauthFailed = report.routeChecks.filter(r => r.error?.includes("AUTH_REQUIRED"));
      const failedRoutes = report.routeChecks.filter(r => !r.passed);
      const passedRoutes = report.routeChecks.filter(r => r.passed);

      if (infraFailed.length > 0) {
        await this.addLog(deploymentId, `🔧 ${infraFailed.length} مسار — فشل بنية تحتية (السيرفر لا يستجيب/يعيد التشغيل)`, "warn");
        for (const f of infraFailed.slice(0, 3)) {
          await this.addLog(deploymentId, `  🔧 [${f.method}] ${f.path}: ${f.error}`, "warn");
        }
      }

      if (unauthFailed.length > 0) {
        await this.addLog(deploymentId, `🔒 ${unauthFailed.length} مسار لم يُختبر — بحاجة لتوكن مصادقة`, "error");
      }

      if (passedRoutes.length > 0) {
        await this.addLog(deploymentId, `✅ مسارات ناجحة: ${passedRoutes.length}/${report.routeChecks.length}`, "success");
      }

      for (const failed of appFailed.filter(r => !r.error?.includes("AUTH_REQUIRED"))) {
        await this.addLog(deploymentId, `❌ [${failed.method}] ${failed.path}: ${failed.error} (${failed.description})`, "error");
      }

      if (report.summary.avgLatencyMs != null) {
        const latencyStatus = report.summary.avgLatencyMs > 3000 ? "warn" : "success";
        await this.addLog(deploymentId, `⏱️ متوسط زمن الاستجابة: ${report.summary.avgLatencyMs}ms`, latencyStatus);
      }
      if (report.summary.slowRoutes && report.summary.slowRoutes.length > 0) {
        await this.addLog(deploymentId, `🐌 مسارات بطيئة (>3s): ${report.summary.slowRoutes.join(", ")}`, "warn");
      }

      const failedCors = report.corsChecks.filter(c => !c.passed);
      const passedCors = report.corsChecks.filter(c => c.passed);
      const isCorsCspSkipped = failedCors.some(c => c.error?.includes("Skipped"));

      if (isCorsCspSkipped) {
        await this.addLog(deploymentId, `⏭️ CORS/CSP تم تخطيه — السيرفر غير متاح (لا فائدة من فحصها)`, "warn");
      } else {
        if (passedCors.length > 0) {
          await this.addLog(deploymentId, `✅ CORS ناجح: ${passedCors.length}/${report.corsChecks.length} (Origin + Headers + Methods)`, "success");
        }
        for (const failed of failedCors) {
          await this.addLog(deploymentId, `❌ CORS [${failed.origin}] ${failed.path}: ${failed.error}`, "error");
        }
      }

      await this.addLog(deploymentId,
        `📊 ملخص البوابة: مسارات ${report.summary.passedRoutes}/${report.summary.totalRoutes} | CORS ${report.summary.passedCors}/${report.summary.totalCors} | SSL ${report.summary.sslValid ? "✅" : "❌"} | CSP ${report.summary.cspValid ? "✅" : "❌"} | Auth ${report.authTokenObtained ? "✅" : "❌"}${infraFailed.length > 0 ? ` | 🔧 بنية تحتية: ${infraFailed.length}` : ""}`,
        report.summary.overallPass ? "success" : "warn"
      );

      await this.addEvent(deploymentId, "prebuild_gate", "Pre-build gate completed", {
        overallPass: report.summary.overallPass,
        routesPassed: report.summary.passedRoutes,
        routesFailed: report.summary.failedRoutes,
        infraFailed: infraFailed.length,
        unauthRoutes: unauthFailed.length,
        corsPassed: report.summary.passedCors,
        corsFailed: report.summary.failedCors,
        sslValid: report.summary.sslValid,
        cspValid: report.summary.cspValid,
        authTokenObtained: report.authTokenObtained,
        avgLatencyMs: report.summary.avgLatencyMs,
      });

      const allRouteFailuresAreInfra = failedRoutes.length > 0 && appFailed.length === 0 && infraFailed.length === failedRoutes.length;
      const publicInfraFailed = infraFailed.filter(r => r.group === "public" || r.group === "auth");
      const infraRatio = infraFailed.length / report.routeChecks.length;
      const isFullInfraOutage = allRouteFailuresAreInfra && publicInfraFailed.length > 0 && infraRatio >= 0.5;

      if (isFullInfraOutage && report.sslCheck.passed) {
        await this.addLog(deploymentId, `⚠️ السيرفر غير متاح (${infraFailed.length}/${report.routeChecks.length} مسار 502/503/504) — بنية تحتية. SSL صالحة. متابعة البناء مع تحذير.`, "warn");
      } else {
        const reasons: string[] = [];

        if (!report.authTokenObtained && unauthFailed.length > 0) {
          reasons.push(`فشل المصادقة — ${unauthFailed.length} مسار محمي لم يُختبر`);
        }

        const criticalAppFailed = appFailed.filter(r => (r.critical || r.group === "auth" || r.group === "public") && !r.error?.includes("AUTH_REQUIRED"));
        if (criticalAppFailed.length > 0) reasons.push(`${criticalAppFailed.length} مسار حرج فشل`);

        const corsBlockers = isCorsCspSkipped ? [] : failedCors.filter(c => c.origin === "capacitor://localhost");
        if (corsBlockers.length > 0) reasons.push(`CORS محظور لـ capacitor://localhost`);
        if (!report.sslCheck.passed) reasons.push("شهادة SSL غير صالحة");
        if (!isCorsCspSkipped && !report.cspCheck.passed) reasons.push(`CSP: ${report.cspCheck.error}`);

        if (reasons.length > 0) {
          await this.sendPrebuildGateNotification(deploymentId, report);
          throw new Error(`🚫 بوابة ما قبل البناء فشلت: ${reasons.join(" | ")}. لا يمكن بناء APK.`);
        }

        if (failedRoutes.length > 0) {
          await this.addLog(deploymentId, `⚠️ ${failedRoutes.length} مسار غير حرج فشل — متابعة البناء مع تحذير`, "warn");
        }
      }

    } catch (err: any) {
      if (err.message?.includes("بوابة ما قبل البناء فشلت")) {
        throw err;
      }
      await this.addLog(deploymentId, `❌ فشل تنفيذ فحوصات ما قبل البناء: ${err.message}`, "error");
      throw new Error(`🚫 بوابة ما قبل البناء فشلت: خطأ غير متوقع أثناء الفحص — ${err.message}`);
    }
  }

  private async stepVerify(deploymentId: string, config?: DeploymentConfig) {
    await this.addLog(deploymentId, "التحقق النهائي من النشر...", "info");
    const baseUrl = this.resolveBaseUrl(config);
    let healthPassed = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) {
          await this.addLog(deploymentId, `🔄 إعادة فحص الصحة (محاولة ${attempt}/3)...`, "info");
          await new Promise(r => setTimeout(r, 5000));
        }
        const { stdout } = await execAsync(`curl -s -o /dev/null -w '%{http_code}' ${baseUrl}/api/health`, { timeout: 15000 });
        const statusCode = stdout.trim().replace(/'/g, "");
        if (statusCode === "200") {
          await this.addLog(deploymentId, "✅ Health check (HTTP 200)", "success");
          healthPassed = true;
          break;
        } else {
          await this.addLog(deploymentId, `⚠️ Health check: HTTP ${statusCode} (محاولة ${attempt}/3)`, "warn");
        }
      } catch {
        await this.addLog(deploymentId, `⚠️ Health check فشل (محاولة ${attempt}/3)`, "warn");
      }
    }

    if (!healthPassed) {
      const msg = "🚫 التحقق النهائي فشل: Health check لم ينجح بعد 3 محاولات — السيرفر لا يستجيب";
      await this.addLog(deploymentId, msg, "error");
      throw new Error(msg);
    }

    let corsWarnings: string[] = [];
    try {
      const corsCheck = await execAsync(
        `curl -s -o /dev/null -w '%{http_code}' -H 'Origin: capacitor://localhost' -H 'Access-Control-Request-Method: POST' -X OPTIONS ${baseUrl}/api/auth/login`,
        { timeout: 10000 }
      );
      const corsStatus = corsCheck.stdout.trim().replace(/'/g, "");
      if (corsStatus === "204" || corsStatus === "200") {
        await this.addLog(deploymentId, "✅ CORS بعد النشر: capacitor://localhost مسموح", "success");
      } else {
        corsWarnings.push(`CORS HTTP ${corsStatus}`);
        await this.addLog(deploymentId, `⚠️ CORS بعد النشر: HTTP ${corsStatus}`, "warn");
      }
    } catch {
      await this.addLog(deploymentId, "⚠️ تعذر التحقق من CORS بعد النشر", "warn");
    }

    try {
      const cspCheck = await execAsync(
        `curl -s -I ${baseUrl}/api/health 2>/dev/null | grep -i 'content-security-policy' | head -1`,
        { timeout: 10000 }
      );
      const cspHeader = cspCheck.stdout.trim();
      if (cspHeader.includes("capacitor://localhost")) {
        await this.addLog(deploymentId, "✅ CSP بعد النشر: يشمل capacitor://localhost", "success");
      } else if (cspHeader) {
        await this.addLog(deploymentId, "⚠️ CSP بعد النشر: لا يشمل capacitor://localhost", "warn");
      }
    } catch {
      await this.addLog(deploymentId, "⚠️ تعذر التحقق من CSP بعد النشر", "warn");
    }

    if (corsWarnings.length > 0) {
      await this.addLog(deploymentId, `⚠️ التحقق النهائي مكتمل مع تحذيرات: ${corsWarnings.join(", ")}`, "warn");
    } else {
      await this.addLog(deploymentId, "✅ التحقق النهائي مكتمل بنجاح", "success");
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

    const branch = this.sanitizeShellArg(config.branch || "main");

    await this.execWithLog(
      deploymentId,
      `cd /home/runner/workspace && git config user.email "${ghUser}@users.noreply.github.com" && git config user.name "${ghUser}" && git config credential.helper '!f() { echo "username=${ghUser}"; echo "password=$GH_TOKEN"; }; f' && git add -A && (git diff --cached --quiet && echo "NO_CHANGES" || git commit -m "${safeMessage}") && git remote set-url origin https://github.com/${ghUser}/app2.git && git push origin ${branch} 2>&1 && PUSH_OK=1 || PUSH_OK=0; if [ "$PUSH_OK" = "1" ]; then echo "GIT_PUSH_OK"; else echo "GIT_PUSH_FAILED" && exit 1; fi`,
      "Git Push",
      60000
    );

    try {
      await execAsync(`git fetch origin ${branch}`, { cwd: "/home/runner/workspace", timeout: 15000 });
    } catch {}

    try {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: "/home/runner/workspace" });
      const commitHash = stdout.trim();
      await this.updateDeployment(deploymentId, { commitHash });
      await this.addLog(deploymentId, `Commit: ${commitHash.substring(0, 8)}`, "info");
    } catch {}
  }

  private async stepPullServer(deploymentId: string, sshCmd: string, config?: DeploymentConfig) {
    const branch = this.sanitizeShellArg(config?.branch || "main");
    await this.addLog(deploymentId, `Pulling latest from GitHub on server (branch: ${branch})...`, "info");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && git fetch origin ${branch} && git reset --hard origin/${branch} && echo 'PULL_OK'"`,
      "Server Pull",
      60000
    );
  }

  private async stepInstallDeps(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "Installing dependencies on server...", "info");
    this.updateStepProgress(deploymentId, "install-deps", 10, "تثبيت الحزم على السيرفر...");
    const remoteDir = "/home/administrator/app2";

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "set -o pipefail && cd ${remoteDir} && npm install --loglevel=error --legacy-peer-deps 2>&1 | tail -5 && echo 'DEPS_OK'"`,
      "Install Deps",
      120000
    );
    this.updateStepProgress(deploymentId, "install-deps", 95, "اكتمل تثبيت التبعيات");
  }

  private async stepBuildServer(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "تنظيف مخرجات البناء السابقة...", "info");
    this.updateStepProgress(deploymentId, "build-server", 5, "تنظيف المخرجات السابقة...");
    const remoteDir = "/home/administrator/app2";
    const buildId = deploymentId.substring(0, 8);
    const pidFile = `/tmp/axion_build_${buildId}.pid`;
    const exitFile = `/tmp/axion_build_${buildId}.exit`;
    const logFile = `/tmp/axion_build_${buildId}.log`;

    await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && rm -rf dist www android/app/src/main/assets/public android/app/build/outputs && rm -f ${pidFile} ${exitFile} ${logFile} && echo 'CLEAN_OK'"`,
      "Clean Previous Build",
      30000
    );

    try {
      const { stdout: diagOut } = await execAsync(
        `${sshCmd} "free -m | awk '/^Mem/{printf \\"RAM: %sMB/%sMB (used: %s%%)\\\\n\\", \\$3, \\$2, int(\\$3/\\$2*100)}'; df -h ${remoteDir} | tail -1 | awk '{printf \\"Disk: %s used of %s (%s)\\\\n\\", \\$3, \\$2, \\$5}'"`,
        { timeout: 10000 }
      );
      await this.addLog(deploymentId, `📊 موارد السيرفر قبل البناء: ${diagOut.trim()}`, "info");
    } catch { /* non-critical */ }

    this.updateStepProgress(deploymentId, "build-server", 10, "بدء البناء في الخلفية...");
    await this.addLog(deploymentId, "🚀 بدء البناء في الخلفية على السيرفر (SSH-resilient)...", "info");

    await execAsync(
      `${sshCmd} "cd ${remoteDir} && nohup bash -c 'export VITE_API_BASE_URL=https://app2.binarjoinanelytic.info && export NODE_ENV=production && npm run build > ${logFile} 2>&1; echo \\$? > ${exitFile}' & echo \\$! > ${pidFile} && cat ${pidFile}"`,
      { timeout: 30000 }
    );

    await this.addLog(deploymentId, "⏳ بناء التطبيق جارٍ... مراقبة دورية كل 15 ثانية", "info");

    const maxWaitMs = 600000;
    const pollInterval = 15000;
    const startTime = Date.now();
    let lastLogLine = 0;

    while (Date.now() - startTime < maxWaitMs) {
      if (this.isCancelled(deploymentId)) {
        try {
          await execAsync(`${sshCmd} "kill \\$(cat ${pidFile}) 2>/dev/null; rm -f ${pidFile} ${exitFile}"`, { timeout: 10000 });
        } catch { /* best-effort */ }
        throw new (class extends Error { constructor() { super("Cancelled by user"); this.name = "CancellationError"; } })();
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const progress = Math.min(85, 15 + Math.round((elapsed / (maxWaitMs / 1000)) * 70));

      try {
        const { stdout: status } = await execAsync(
          `${sshCmd} "if [ -f ${exitFile} ]; then echo \\"EXIT:\\$(cat ${exitFile})\\"; elif [ -f ${pidFile} ] && kill -0 \\$(cat ${pidFile}) 2>/dev/null; then WC=\\$(wc -l < ${logFile} 2>/dev/null || echo 0); echo \\"RUNNING:\\$WC\\"; else echo 'LOST'; fi"`,
          { timeout: 15000 }
        );

        const trimmed = status.trim();

        if (trimmed.startsWith("EXIT:")) {
          const exitCode = parseInt(trimmed.replace("EXIT:", "").trim());
          if (exitCode === 0) {
            await this.addLog(deploymentId, `✅ اكتمل البناء بنجاح (${elapsed}s)`, "success");
            break;
          } else {
            const { stdout: errLog } = await execAsync(`${sshCmd} "tail -40 ${logFile} 2>/dev/null"`, { timeout: 10000 }).catch(() => ({ stdout: "" }));
            const errorLines = errLog.split("\n").filter((l: string) => /error|fail|killed|cannot|oom/i.test(l)).slice(-10);
            if (errorLines.length > 0) {
              await this.addLog(deploymentId, `📋 أسطر الخطأ:\n${errorLines.join("\n")}`, "error");
            }
            throw new Error(`فشل البناء على السيرفر (exit code: ${exitCode})`);
          }
        } else if (trimmed.startsWith("RUNNING:")) {
          const lines = parseInt(trimmed.replace("RUNNING:", "").trim()) || 0;
          if (lines > lastLogLine) {
            const newLines = lines - lastLogLine;
            this.updateStepProgress(deploymentId, "build-server", progress, `جارٍ البناء... ${elapsed}s (${lines} سطر)`);
            lastLogLine = lines;
            try {
              const { stdout: tailOut } = await execAsync(`${sshCmd} "tail -3 ${logFile} 2>/dev/null"`, { timeout: 10000 });
              const lastLine = tailOut.trim().split("\n").pop()?.trim();
              if (lastLine && lastLine.length > 5) {
                await this.addLog(deploymentId, `📄 [${elapsed}s] ${lastLine.substring(0, 200)}`, "info");
              }
            } catch { /* non-critical */ }
          } else {
            this.updateStepProgress(deploymentId, "build-server", progress, `جارٍ البناء... ${elapsed}s`);
          }
        } else if (trimmed === "LOST") {
          const { stdout: errLog } = await execAsync(`${sshCmd} "tail -30 ${logFile} 2>/dev/null"`, { timeout: 10000 }).catch(() => ({ stdout: "" }));
          await this.addLog(deploymentId, `❌ عملية البناء توقفت بشكل غير متوقع\n${errLog.trim().split("\n").slice(-5).join("\n")}`, "error");
          throw new Error("عملية البناء توقفت — قد يكون السبب نفاد الذاكرة (OOM killed)");
        }
      } catch (pollErr: any) {
        if (pollErr.message?.includes("exit 255") || pollErr.message?.includes("Exit code: 255")) {
          await this.addLog(deploymentId, `⚠️ انقطاع SSH مؤقت (${elapsed}s) — إعادة المحاولة...`, "warn");
          continue;
        }
        throw pollErr;
      }
    }

    if (Date.now() - startTime >= maxWaitMs) {
      try {
        await execAsync(`${sshCmd} "kill \\$(cat ${pidFile}) 2>/dev/null"`, { timeout: 10000 });
      } catch { /* best-effort */ }
      throw new Error(`تجاوز وقت البناء الأقصى (${maxWaitMs / 1000}s)`);
    }

    this.updateStepProgress(deploymentId, "build-server", 90, "التحقق من المخرجات...");

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

    try {
      await execAsync(`${sshCmd} "rm -f ${pidFile} ${exitFile}"`, { timeout: 10000 });
    } catch { /* cleanup */ }
  }

  private async stepDbMigrate(deploymentId: string, sshCmd: string) {
    const autoMigrate = process.env.AUTO_DB_MIGRATE === "true";
    const remoteDir = "/home/administrator/app2";

    if (!autoMigrate) {
      await this.addLog(deploymentId, "⚠️ ترحيل قاعدة البيانات التلقائي معطّل (AUTO_DB_MIGRATE !== true)", "warn");
      await this.addLog(deploymentId, "💡 لتفعيله: اضبط AUTO_DB_MIGRATE=true في متغيرات البيئة", "info");
      return;
    }

    await this.addLog(deploymentId, "🔄 بدء ترحيل قاعدة البيانات الآمن...", "info");

    await this.addLog(deploymentId, "📦 إنشاء نسخة احتياطية لقاعدة البيانات قبل الترحيل...", "info");
    const backupResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && BACKUP_FILE=/tmp/db_backup_pre_migrate_\$(date +%Y%m%d_%H%M%S).sql && if command -v pg_dump >/dev/null 2>&1; then pg_dump \$DATABASE_URL -f \$BACKUP_FILE --no-owner --no-privileges 2>&1 && chmod 600 \$BACKUP_FILE && echo \"BACKUP_OK: \$BACKUP_FILE\" || echo 'BACKUP_FAILED'; else echo 'PG_DUMP_MISSING'; fi"`,
      "Database Backup",
      120000
    );

    if (backupResult.includes("PG_DUMP_MISSING")) {
      await this.addLog(deploymentId, "❌ pg_dump غير متوفر — إلغاء الترحيل لعدم القدرة على أخذ نسخة احتياطية", "error");
      throw new Error("pg_dump غير متوفر على الخادم — الترحيل يتطلب نسخة احتياطية أولاً");
    } else if (backupResult.includes("BACKUP_FAILED")) {
      await this.addLog(deploymentId, "❌ فشل إنشاء النسخة الاحتياطية — إلغاء الترحيل", "error");
      throw new Error("فشل إنشاء النسخة الاحتياطية — الترحيل ملغي لحماية البيانات");
    } else {
      const backupPath = backupResult.match(/BACKUP_OK: (.+)/)?.[1]?.trim();
      await this.addLog(deploymentId, `✅ نسخة احتياطية: ${backupPath || "تمت"}`, "success");
    }

    await this.addLog(deploymentId, "🔍 فحص الترحيل (dry-run) — بدون تعديل فعلي...", "info");
    const dryRunResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && npx drizzle-kit push --dry-run 2>&1 && echo 'DRYRUN_DONE'"`,
      "Migration Dry Run",
      60000
    );

    if (!dryRunResult.includes("DRYRUN_DONE")) {
      throw new Error("❌ فشل فحص الترحيل (dry-run) — لن يتم تنفيذ الترحيل");
    }

    const hasDangerousOps = /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i.test(dryRunResult);
    if (hasDangerousOps) {
      await this.addLog(deploymentId, "🚫 تم اكتشاف عمليات خطيرة (DROP/TRUNCATE/DELETE) — إيقاف الترحيل التلقائي", "error");
      await this.addLog(deploymentId, "💡 راجع التغييرات يدوياً وطبّقها بعناية", "warn");
      throw new Error("🚫 ترحيل يحتوي عمليات خطيرة (حذف جداول/أعمدة) — يتطلب مراجعة يدوية");
    }

    const noChanges = dryRunResult.includes("No changes") || dryRunResult.includes("nothing to push") || dryRunResult.includes("Already up to date");
    if (noChanges) {
      await this.addLog(deploymentId, "✅ قاعدة البيانات متوافقة — لا حاجة لترحيل", "success");
      return;
    }

    await this.addLog(deploymentId, "📋 توجد تغييرات — جاري تطبيق الترحيل...", "info");

    const migrateResult = await this.execWithLog(
      deploymentId,
      `${sshCmd} "cd ${remoteDir} && npx drizzle-kit push --force 2>&1 | tail -20 && echo 'MIGRATE_DONE'"`,
      "Database Migration",
      120000
    );

    if (!migrateResult.includes("MIGRATE_DONE")) {
      await this.addLog(deploymentId, "❌ فشل تطبيق الترحيل — النسخة الاحتياطية متاحة للاستعادة", "error");
      throw new Error("❌ فشل ترحيل قاعدة البيانات — استعد النسخة الاحتياطية يدوياً إن لزم");
    }

    await this.addLog(deploymentId, "✅ تم ترحيل قاعدة البيانات بنجاح", "success");
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

  async getLatestAndroidRelease(): Promise<{ versionName: string; versionCode: number; downloadUrl: string | null; releasedAt: string; releaseNotes: string | null } | null> {
    try {
      const [latest] = await db.select()
        .from(buildDeployments)
        .where(
          sql`${buildDeployments.status} = 'success' AND ${buildDeployments.pipeline} IN ('android-build', 'full-deploy', 'git-android-build', 'android-build-test') AND ${buildDeployments.artifactUrl} IS NOT NULL`
        )
        .orderBy(desc(buildDeployments.buildNumber))
        .limit(1);

      if (!latest) return null;

      let downloadUrl: string | null = null;
      if (latest.id) {
        const baseUrl = process.env.PRODUCTION_URL || "https://app2.binarjoinanelytic.info";
        const token = this.generateDownloadToken(latest.id);
        downloadUrl = `${baseUrl}/api/deployment/app/download/${latest.id}?token=${token}`;
      }

      return {
        versionName: latest.version,
        versionCode: latest.buildNumber,
        downloadUrl,
        releasedAt: latest.created_at.toISOString(),
        releaseNotes: (latest as any).releaseNotes || null,
      };
    } catch (err: any) {
      console.error("[getLatestAndroidRelease] خطأ:", err?.message);
      return null;
    }
  }

  private async addLog(deploymentId: string, message: string, type: LogEntry["type"]) {
    const entry: LogEntry = { timestamp: new Date().toISOString(), message, type };

    broadcastToClients(deploymentId, { type: "log", data: entry });

    if (!this.logBuffers.has(deploymentId)) {
      this.logBuffers.set(deploymentId, []);
    }
    this.logBuffers.get(deploymentId)!.push(entry);

    if (!this.logFlushTimers.has(deploymentId)) {
      const timer = setTimeout(() => {
        this.flushLogs(deploymentId).catch(err => {
          console.error(`[DeploymentEngine] Log flush failed for ${deploymentId}:`, err);
        });
      }, DeploymentEngine.LOG_FLUSH_INTERVAL);
      this.logFlushTimers.set(deploymentId, timer);
    }
  }

  private async flushLogs(deploymentId: string) {
    const timer = this.logFlushTimers.get(deploymentId);
    if (timer) {
      clearTimeout(timer);
      this.logFlushTimers.delete(deploymentId);
    }

    const buffered = this.logBuffers.get(deploymentId);
    if (!buffered || buffered.length === 0) return;

    const toFlush = [...buffered];
    buffered.length = 0;

    try {
      const [current] = await db.select({ logs: buildDeployments.logs }).from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      const existingLogs = Array.isArray(current?.logs) ? current.logs : [];
      const maxLogs = 500;
      const combined = [...existingLogs, ...toFlush];
      const trimmed = combined.length > maxLogs ? combined.slice(-maxLogs) : combined;
      await db.update(buildDeployments).set({ logs: trimmed }).where(eq(buildDeployments.id, deploymentId));
    } catch (err) {
      console.error(`[DeploymentEngine] Failed to flush ${toFlush.length} logs for ${deploymentId}:`, err);
      buffered.unshift(...toFlush);
    }
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
    if (status === "success" || status === "failed" || status === "cancelled") {
      await this.flushLogs(deploymentId);
    }

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

  private updateStepProgress(deploymentId: string, stepName: string, subProgress: number, subMessage?: string) {
    broadcastToClients(deploymentId, {
      type: "step_progress",
      data: { stepName, subProgress: Math.min(100, Math.max(0, Math.round(subProgress))), subMessage }
    });
  }

  private async updateDeployment(deploymentId: string, updates: Partial<Record<string, any>>) {
    await db.update(buildDeployments).set(updates).where(eq(buildDeployments.id, deploymentId));

    broadcastToClients(deploymentId, { type: "deployment_update", data: updates });

    const status = updates.status as string | undefined;
    if (status === "success" || status === "failed") {
      broadcastGlobalEvent({ type: `deployment_${status}`, deploymentId, data: { id: deploymentId, status } });
    }
  }

  async getStepAverages(pipeline?: string): Promise<Record<string, { avgDuration: number; count: number }>> {
    try {
      const conditions = [
        sql`${buildDeployments.status} = 'success'`,
      ];
      if (pipeline) {
        conditions.push(sql`${buildDeployments.pipeline} = ${pipeline}`);
      }

      const recent = await db.select({ steps: buildDeployments.steps })
        .from(buildDeployments)
        .where(sql`${conditions.map(c => sql`(${c})`).reduce((a, b) => sql`${a} AND ${b}`)}`)
        .orderBy(desc(buildDeployments.buildNumber))
        .limit(20);

      const stepTotals: Record<string, { total: number; count: number }> = {};

      for (const row of recent) {
        const steps = row.steps as StepEntry[];
        if (!Array.isArray(steps)) continue;
        for (const step of steps) {
          if (step.status === "success" && step.duration && step.duration > 0) {
            if (!stepTotals[step.name]) stepTotals[step.name] = { total: 0, count: 0 };
            stepTotals[step.name].total += step.duration;
            stepTotals[step.name].count += 1;
          }
        }
      }

      const result: Record<string, { avgDuration: number; count: number }> = {};
      for (const [name, data] of Object.entries(stepTotals)) {
        result[name] = { avgDuration: Math.round(data.total / data.count), count: data.count };
      }
      return result;
    } catch (err: any) {
      console.error("[getStepAverages] Error:", err.message);
      return {};
    }
  }

  private async stepHcHttp(deploymentId: string) {
    await this.addLog(deploymentId, "🌐 فحص HTTP — الاستجابة وحالة السيرفر...", "info");
    const baseUrl = this.resolveBaseUrl();
    try {
      const start = Date.now();
      const { stdout } = await execAsync(`curl -s -o /dev/null -w '%{http_code}|%{time_total}' ${baseUrl}/api/health`, { timeout: 15000 });
      const [statusCode, timeStr] = stdout.trim().replace(/'/g, "").split("|");
      const responseMs = Math.round(parseFloat(timeStr || "0") * 1000);
      const ok = statusCode === "200";
      if (!this.healthCheckResults.has(deploymentId)) this.healthCheckResults.set(deploymentId, {});
      this.healthCheckResults.get(deploymentId)!.http = { statusCode, responseMs, healthy: ok };
      await this.addLog(deploymentId, `${ok ? "✅" : "❌"} HTTP: ${statusCode} — زمن الاستجابة: ${responseMs}ms`, ok ? "success" : "error");
      if (!ok) throw new Error(`HTTP health failed: ${statusCode}`);
    } catch (err: any) {
      if (!this.healthCheckResults.has(deploymentId)) this.healthCheckResults.set(deploymentId, {});
      this.healthCheckResults.get(deploymentId)!.http = { statusCode: "unreachable", responseMs: 0, healthy: false };
      await this.addLog(deploymentId, `❌ HTTP: السيرفر لا يستجيب — ${err.message}`, "error");
    }
  }

  private async stepHcPm2(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "⚙️ فحص عمليات PM2...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "pm2 jlist 2>/dev/null | head -500"`, { timeout: 15000 });
      const processes = JSON.parse(stdout || "[]");
      const pm2Data = processes.map((p: any) => ({
        name: p.name,
        status: p.pm2_env?.status,
        uptime: p.pm2_env?.pm_uptime ? Math.round((Date.now() - p.pm2_env.pm_uptime) / 1000) : 0,
        restarts: p.pm2_env?.restart_time || 0,
        memoryMB: p.monit?.memory ? Math.round(p.monit.memory / 1024 / 1024) : 0,
        cpu: p.monit?.cpu || 0,
      }));
      const onlineCount = pm2Data.filter((p: any) => p.status === "online").length;
      const totalRestarts = pm2Data.reduce((s: number, p: any) => s + p.restarts, 0);
      const totalMemory = pm2Data.reduce((s: number, p: any) => s + p.memoryMB, 0);
      this.healthCheckResults.get(deploymentId)!.pm2 = { processes: pm2Data, onlineCount, totalCount: pm2Data.length, totalRestarts, totalMemoryMB: totalMemory };
      for (const p of pm2Data) {
        const icon = p.status === "online" ? "✅" : "❌";
        await this.addLog(deploymentId, `  ${icon} ${p.name}: ${p.status} | RAM: ${p.memoryMB}MB | CPU: ${p.cpu}% | Restarts: ${p.restarts} | Uptime: ${Math.round(p.uptime / 3600)}h`, p.status === "online" ? "info" : "warn");
      }
      await this.addLog(deploymentId, `📊 PM2: ${onlineCount}/${pm2Data.length} عمليات نشطة | إجمالي RAM: ${totalMemory}MB | إجمالي إعادة التشغيل: ${totalRestarts}`, onlineCount === pm2Data.length ? "success" : "warn");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.pm2 = { processes: [], onlineCount: 0, totalCount: 0, totalRestarts: 0, totalMemoryMB: 0 };
      await this.addLog(deploymentId, `❌ PM2: تعذر الوصول — ${err.message}`, "error");
    }
  }

  private async stepHcDisk(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "💾 فحص مساحة القرص...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "df -BM / /home/administrator 2>/dev/null | tail -n +2"`, { timeout: 10000 });
      const lines = stdout.trim().split("\n");
      const disks: any[] = [];
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          const usedPct = parseInt(parts[4].replace("%", ""));
          const totalMB = parseInt(parts[1].replace("M", ""));
          const usedMB = parseInt(parts[2].replace("M", ""));
          const availMB = parseInt(parts[3].replace("M", ""));
          const mount = parts[5];
          const level = usedPct >= 90 ? "critical" : usedPct >= 80 ? "warning" : "ok";
          disks.push({ mount, totalMB, usedMB, availMB, usedPct, level });
          const icon = level === "ok" ? "✅" : level === "warning" ? "⚠️" : "🚨";
          await this.addLog(deploymentId, `  ${icon} ${mount}: ${usedPct}% مستخدم (${Math.round(availMB / 1024)}GB متاح من ${Math.round(totalMB / 1024)}GB)`, level === "ok" ? "success" : "warn");
        }
      }
      this.healthCheckResults.get(deploymentId)!.disk = { disks, hasCritical: disks.some((d: any) => d.level === "critical") };
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.disk = { disks: [], hasCritical: false };
      await this.addLog(deploymentId, `❌ Disk: تعذر الفحص — ${err.message}`, "error");
    }
  }

  private async stepHcMemory(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🧠 فحص الذاكرة...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "free -m | head -3"`, { timeout: 10000 });
      const lines = stdout.trim().split("\n");
      let totalMB = 0, usedMB = 0, availMB = 0, swapTotalMB = 0, swapUsedMB = 0;
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts[0]?.toLowerCase().startsWith("mem")) {
          totalMB = parseInt(parts[1]) || 0;
          usedMB = parseInt(parts[2]) || 0;
          availMB = parseInt(parts[6] || parts[3]) || 0;
        } else if (parts[0]?.toLowerCase().startsWith("swap")) {
          swapTotalMB = parseInt(parts[1]) || 0;
          swapUsedMB = parseInt(parts[2]) || 0;
        }
      }
      const usedPct = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;
      const level = usedPct >= 90 ? "critical" : usedPct >= 80 ? "warning" : "ok";
      this.healthCheckResults.get(deploymentId)!.memory = { totalMB, usedMB, availMB, usedPct, swapTotalMB, swapUsedMB, level };
      const icon = level === "ok" ? "✅" : level === "warning" ? "⚠️" : "🚨";
      await this.addLog(deploymentId, `${icon} RAM: ${usedPct}% مستخدم (${usedMB}MB/${totalMB}MB) | متاح: ${availMB}MB | Swap: ${swapUsedMB}MB/${swapTotalMB}MB`, level === "ok" ? "success" : "warn");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.memory = { totalMB: 0, usedMB: 0, availMB: 0, usedPct: 0, swapTotalMB: 0, swapUsedMB: 0, level: "unknown" };
      await this.addLog(deploymentId, `❌ Memory: تعذر الفحص — ${err.message}`, "error");
    }
  }

  private async stepHcCpu(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "⚡ فحص حمل المعالج...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "cat /proc/loadavg && nproc"`, { timeout: 10000 });
      const lines = stdout.trim().split("\n");
      const loadParts = (lines[0] || "").split(/\s+/);
      const cores = parseInt(lines[1]) || 1;
      const load1 = parseFloat(loadParts[0]) || 0;
      const load5 = parseFloat(loadParts[1]) || 0;
      const load15 = parseFloat(loadParts[2]) || 0;
      const loadPct = Math.round((load1 / cores) * 100);
      const level = loadPct >= 90 ? "critical" : loadPct >= 70 ? "warning" : "ok";
      this.healthCheckResults.get(deploymentId)!.cpu = { load1, load5, load15, cores, loadPct, level };
      const icon = level === "ok" ? "✅" : level === "warning" ? "⚠️" : "🚨";
      await this.addLog(deploymentId, `${icon} CPU: Load ${load1}/${load5}/${load15} (1/5/15 min) | ${cores} أنوية | حمل: ${loadPct}%`, level === "ok" ? "success" : "warn");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.cpu = { load1: 0, load5: 0, load15: 0, cores: 0, loadPct: 0, level: "unknown" };
      await this.addLog(deploymentId, `❌ CPU: تعذر الفحص — ${err.message}`, "error");
    }
  }

  private async stepHcDb(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🗄️ فحص قاعدة البيانات...", "info");
    try {
      const start = Date.now();
      const { stdout } = await execAsync(`${sshCmd} "pg_isready -h localhost -p 5432 2>&1 && psql \\$DATABASE_URL -c 'SELECT 1' -t 2>&1 | head -5"`, { timeout: 15000 });
      const latencyMs = Date.now() - start;
      const isReady = stdout.includes("accepting connections");
      const queryOk = stdout.includes("1");
      this.healthCheckResults.get(deploymentId)!.database = { isReady, queryOk, latencyMs, level: isReady && queryOk ? "ok" : "critical" };
      const icon = isReady && queryOk ? "✅" : "❌";
      await this.addLog(deploymentId, `${icon} DB: ${isReady ? "متصل" : "غير متصل"} | استعلام: ${queryOk ? "نجح" : "فشل"} | زمن: ${latencyMs}ms`, isReady && queryOk ? "success" : "error");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.database = { isReady: false, queryOk: false, latencyMs: 0, level: "critical" };
      await this.addLog(deploymentId, `❌ DB: تعذر الاتصال — ${err.message}`, "error");
    }
  }

  private async stepHcSsl(deploymentId: string) {
    await this.addLog(deploymentId, "🔒 فحص شهادة SSL...", "info");
    const host = process.env.PRODUCTION_DOMAIN || "app2.binarjoinanelytic.info";
    try {
      const { stdout } = await execAsync(`echo | openssl s_client -servername ${host} -connect ${host}:443 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null`, { timeout: 15000 });
      const afterMatch = stdout.match(/notAfter=(.+)/);
      const beforeMatch = stdout.match(/notBefore=(.+)/);
      let daysRemaining = 0;
      let expiryDate = "";
      if (afterMatch) {
        const expiry = new Date(afterMatch[1].trim());
        expiryDate = expiry.toISOString().split("T")[0];
        daysRemaining = Math.round((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      }
      const level = daysRemaining <= 7 ? "critical" : daysRemaining <= 30 ? "warning" : "ok";
      this.healthCheckResults.get(deploymentId)!.ssl = { daysRemaining, expiryDate, valid: daysRemaining > 0, level, issuedAt: beforeMatch?.[1]?.trim() || "" };
      const icon = level === "ok" ? "✅" : level === "warning" ? "⚠️" : "🚨";
      await this.addLog(deploymentId, `${icon} SSL: ${daysRemaining} يوم متبقي | انتهاء: ${expiryDate}`, level === "ok" ? "success" : "warn");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.ssl = { daysRemaining: 0, expiryDate: "", valid: false, level: "unknown" };
      await this.addLog(deploymentId, `⚠️ SSL: تعذر الفحص — ${err.message}`, "warn");
    }
  }

  private async stepHcRuntime(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🔧 فحص بيئة التشغيل...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "node -v && npm -v && uptime -s 2>/dev/null"`, { timeout: 10000 });
      const lines = stdout.trim().split("\n");
      const nodeVersion = lines[0]?.trim() || "unknown";
      const npmVersion = lines[1]?.trim() || "unknown";
      const uptimeSince = lines[2]?.trim() || "";
      this.healthCheckResults.get(deploymentId)!.runtime = { nodeVersion, npmVersion, uptimeSince };
      await this.addLog(deploymentId, `✅ Node: ${nodeVersion} | npm: ${npmVersion} | تشغيل منذ: ${uptimeSince}`, "success");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.runtime = { nodeVersion: "unknown", npmVersion: "unknown", uptimeSince: "" };
      await this.addLog(deploymentId, `⚠️ Runtime: تعذر الفحص — ${err.message}`, "warn");
    }
  }

  private async stepHcNginx(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🌍 فحص Nginx...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "systemctl is-active nginx 2>/dev/null && nginx -v 2>&1 | head -1"`, { timeout: 10000 });
      const lines = stdout.trim().split("\n");
      const isActive = lines[0]?.trim() === "active";
      const version = lines[1]?.trim() || "";
      this.healthCheckResults.get(deploymentId)!.nginx = { isActive, version, level: isActive ? "ok" : "critical" };
      await this.addLog(deploymentId, `${isActive ? "✅" : "❌"} Nginx: ${isActive ? "نشط" : "متوقف"} | ${version}`, isActive ? "success" : "error");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.nginx = { isActive: false, version: "", level: "unknown" };
      await this.addLog(deploymentId, `⚠️ Nginx: تعذر الفحص — ${err.message}`, "warn");
    }
  }

  private async stepHcNetwork(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "📡 فحص الشبكة و DNS...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "dig +short google.com 2>/dev/null | head -1 && curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://google.com 2>/dev/null"`, { timeout: 15000 });
      const lines = stdout.trim().split("\n");
      const dnsResolve = lines[0]?.trim() || "";
      const externalHttp = lines[1]?.trim()?.replace(/'/g, "") || "";
      const dnsOk = dnsResolve.length > 0;
      const externalOk = externalHttp === "200" || externalHttp === "301";
      this.healthCheckResults.get(deploymentId)!.network = { dnsOk, dnsResolve, externalReachable: externalOk, externalHttp, level: dnsOk && externalOk ? "ok" : "warning" };
      await this.addLog(deploymentId, `${dnsOk ? "✅" : "❌"} DNS: ${dnsOk ? dnsResolve : "فشل"} | External: ${externalOk ? "متاح" : "غير متاح"} (${externalHttp})`, dnsOk && externalOk ? "success" : "warn");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.network = { dnsOk: false, dnsResolve: "", externalReachable: false, externalHttp: "", level: "unknown" };
      await this.addLog(deploymentId, `⚠️ Network: تعذر الفحص — ${err.message}`, "warn");
    }
  }

  private async stepHcFd(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "📂 فحص واصفات الملفات المفتوحة...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "cat /proc/sys/fs/file-nr 2>/dev/null"`, { timeout: 10000 });
      const parts = stdout.trim().split(/\s+/);
      const openFd = parseInt(parts[0]) || 0;
      const maxFd = parseInt(parts[2]) || 1;
      const usedPct = Math.round((openFd / maxFd) * 100);
      const level = usedPct >= 80 ? "critical" : usedPct >= 60 ? "warning" : "ok";
      this.healthCheckResults.get(deploymentId)!.fileDescriptors = { openFd, maxFd, usedPct, level };
      const icon = level === "ok" ? "✅" : "⚠️";
      await this.addLog(deploymentId, `${icon} FD: ${openFd}/${maxFd} (${usedPct}%)`, level === "ok" ? "success" : "warn");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.fileDescriptors = { openFd: 0, maxFd: 0, usedPct: 0, level: "unknown" };
      await this.addLog(deploymentId, `⚠️ FD: تعذر الفحص — ${err.message}`, "warn");
    }
  }

  private async stepHcConnections(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🔗 فحص الاتصالات النشطة...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "ss -s 2>/dev/null"`, { timeout: 10000 });
      const tcpMatch = stdout.match(/TCP:\s+(\d+)/);
      const estabMatch = stdout.match(/estab\s+(\d+)/);
      const totalTcp = parseInt(tcpMatch?.[1] || "0");
      const established = parseInt(estabMatch?.[1] || "0");
      this.healthCheckResults.get(deploymentId)!.connections = { totalTcp, established };
      await this.addLog(deploymentId, `✅ اتصالات TCP: ${totalTcp} إجمالي | ${established} نشط`, "success");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.connections = { totalTcp: 0, established: 0 };
      await this.addLog(deploymentId, `⚠️ Connections: تعذر الفحص — ${err.message}`, "warn");
    }
  }

  private async stepHcLatency(deploymentId: string) {
    await this.addLog(deploymentId, "⏱️ فحص زمن الاستجابة المتقدم (p50/p95/p99)...", "info");
    const baseUrl = this.resolveBaseUrl();
    const latencies: number[] = [];
    const sampleCount = 10;
    for (let i = 0; i < sampleCount; i++) {
      try {
        const start = Date.now();
        await execAsync(`curl -s -o /dev/null ${baseUrl}/api/health`, { timeout: 10000 });
        latencies.push(Date.now() - start);
      } catch { latencies.push(10000); }
    }
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(sampleCount * 0.5)] || 0;
    const p95 = latencies[Math.floor(sampleCount * 0.95)] || 0;
    const p99 = latencies[Math.floor(sampleCount * 0.99)] || 0;
    const avg = Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length);
    const level = p95 > 5000 ? "critical" : p95 > 2000 ? "warning" : "ok";
    this.healthCheckResults.get(deploymentId)!.latency = { samples: sampleCount, avg, p50, p95, p99, level };
    const icon = level === "ok" ? "✅" : "⚠️";
    await this.addLog(deploymentId, `${icon} زمن الاستجابة: avg=${avg}ms | p50=${p50}ms | p95=${p95}ms | p99=${p99}ms (${sampleCount} عينة)`, level === "ok" ? "success" : "warn");
  }

  private async stepHcLogErrors(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "📋 فحص أخطاء السجلات (آخر ساعة)...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "pm2 logs --nostream --lines 500 2>/dev/null | grep -ic 'error\\|exception\\|fatal\\|ECONNREFUSED\\|ENOTFOUND' 2>/dev/null || echo 0"`, { timeout: 15000 });
      const errorCount = parseInt(stdout.trim()) || 0;
      const level = errorCount >= 50 ? "critical" : errorCount >= 10 ? "warning" : "ok";
      this.healthCheckResults.get(deploymentId)!.logErrors = { count: errorCount, period: "1h", level };
      const icon = level === "ok" ? "✅" : level === "warning" ? "⚠️" : "🚨";
      await this.addLog(deploymentId, `${icon} أخطاء السجلات: ${errorCount} خطأ في آخر 500 سطر`, level === "ok" ? "success" : "warn");
    } catch (err: any) {
      this.healthCheckResults.get(deploymentId)!.logErrors = { count: 0, period: "1h", level: "unknown" };
      await this.addLog(deploymentId, `⚠️ Log Errors: تعذر الفحص — ${err.message}`, "warn");
    }
  }

  private async stepHcEvaluate(deploymentId: string) {
    await this.addLog(deploymentId, "📊 التقييم النهائي والدرجة...", "info");
    const results = this.healthCheckResults.get(deploymentId) || {};
    let score = 100;
    const issues: string[] = [];

    if (results.http?.statusCode !== "200") { score -= 25; issues.push("HTTP غير مستجيب"); }
    if (results.pm2?.onlineCount === 0) { score -= 20; issues.push("لا توجد عمليات PM2 نشطة"); }
    if (results.disk?.hasCritical) { score -= 15; issues.push("مساحة قرص حرجة"); }
    if (results.memory?.level === "critical") { score -= 15; issues.push("ذاكرة حرجة"); }
    if (results.cpu?.level === "critical") { score -= 10; issues.push("حمل معالج حرج"); }
    if (results.database?.level === "critical") { score -= 20; issues.push("قاعدة البيانات معطلة"); }
    if (results.ssl?.daysRemaining !== undefined && results.ssl.daysRemaining <= 7) { score -= 10; issues.push("شهادة SSL تنتهي قريباً"); }
    if (results.nginx?.level === "critical") { score -= 15; issues.push("Nginx متوقف"); }
    if (results.latency?.level === "critical") { score -= 10; issues.push("زمن استجابة مرتفع جداً"); }
    if (results.logErrors?.level === "critical") { score -= 5; issues.push("أخطاء كثيرة في السجلات"); }
    if (results.memory?.level === "warning") score -= 5;
    if (results.cpu?.level === "warning") score -= 5;
    if (results.disk?.disks?.some((d: any) => d.level === "warning")) score -= 5;
    if (results.ssl?.level === "warning") score -= 5;
    if (results.latency?.level === "warning") score -= 5;

    score = Math.max(0, score);
    const overallStatus = score >= 80 ? "healthy" : score >= 50 ? "degraded" : "down";

    const report = {
      score,
      overallStatus,
      issues,
      timestamp: new Date().toISOString(),
      checks: results,
    };

    await db.update(buildDeployments).set({ serverHealthResult: report }).where(eq(buildDeployments.id, deploymentId));

    const statusIcon = overallStatus === "healthy" ? "✅" : overallStatus === "degraded" ? "⚠️" : "🚨";
    await this.addLog(deploymentId, `\n${"═".repeat(50)}`, "info");
    await this.addLog(deploymentId, `${statusIcon} النتيجة النهائية: ${score}/100 — ${overallStatus === "healthy" ? "سليم" : overallStatus === "degraded" ? "متدهور" : "معطل"}`, score >= 80 ? "success" : score >= 50 ? "warn" : "error");
    if (issues.length > 0) {
      await this.addLog(deploymentId, `⚠️ مشاكل مكتشفة (${issues.length}): ${issues.join(" | ")}`, "warn");
    }
    await this.addLog(deploymentId, `${"═".repeat(50)}`, "info");

    this.healthCheckResults.delete(deploymentId);

    if (overallStatus === "down") {
      throw new Error(`فحص الصحة فشل: الدرجة ${score}/100 — السيرفر معطل`);
    }
  }

  private ensureCleanupResults(deploymentId: string) {
    if (!this.cleanupResults.has(deploymentId)) {
      this.cleanupResults.set(deploymentId, { totalReclaimedBytes: 0, steps: [], errors: [] });
    }
    return this.cleanupResults.get(deploymentId)!;
  }

  private addCleanupStep(deploymentId: string, name: string, reclaimedMB: number, detail: string) {
    const r = this.ensureCleanupResults(deploymentId);
    const bytes = reclaimedMB * 1024 * 1024;
    r.totalReclaimedBytes += bytes;
    r.steps.push({ name, reclaimedBytes: bytes, detail });
  }

  private async stepClAndroid(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "📱 تنظيف مخلفات بناء Android...", "info");
    const remoteDir = "/home/administrator/app2";
    try {
      const { stdout } = await execAsync(`${sshCmd} "du -sm ${remoteDir}/android/app/build ${remoteDir}/android/.gradle ${remoteDir}/android/build 2>/dev/null | awk '{s+=\\$1} END{print s}'"`, { timeout: 15000 });
      const sizeMB = parseInt(stdout.trim()) || 0;
      await execAsync(`${sshCmd} "cd ${remoteDir} && rm -rf android/app/build android/.gradle android/build 2>/dev/null && echo 'DONE'"`, { timeout: 30000 });
      this.addCleanupStep(deploymentId, "cl-android", sizeMB, `Android build artifacts (${sizeMB}MB)`);
      await this.addLog(deploymentId, `✅ تم تنظيف مخلفات Android: ${sizeMB}MB`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`Android: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ Android cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClTmp(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🗑️ تنظيف الملفات المؤقتة...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "du -sm /tmp/deploy-*.tar.gz /tmp/app-build-*.tar.gz /tmp/www_assets.tar.gz /tmp/android_project.tar.gz 2>/dev/null | awk '{s+=\\$1} END{print s+0}'"`, { timeout: 10000 });
      const sizeMB = parseInt(stdout.trim()) || 0;
      await execAsync(`${sshCmd} "rm -f /tmp/deploy-*.tar.gz /tmp/app-build-*.tar.gz /tmp/www_assets.tar.gz /tmp/android_project.tar.gz 2>/dev/null && echo 'DONE'"`, { timeout: 15000 });
      this.addCleanupStep(deploymentId, "cl-tmp", sizeMB, `Temp archives (${sizeMB}MB)`);
      await this.addLog(deploymentId, `✅ تم تنظيف ملفات مؤقتة: ${sizeMB}MB`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`Tmp: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ Tmp cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClPm2Logs(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "📄 تنظيف سجلات PM2...", "info");
    try {
      const { stdout: beforeSize } = await execAsync(`${sshCmd} "du -sm ~/.pm2/logs/ 2>/dev/null | awk '{print \\$1}'"`, { timeout: 10000 });
      const sizeMB = parseInt(beforeSize.trim()) || 0;
      await execAsync(`${sshCmd} "cd /home/administrator/app2 && pm2 flush 2>/dev/null && echo 'DONE'"`, { timeout: 15000 });
      this.addCleanupStep(deploymentId, "cl-pm2-logs", sizeMB, `PM2 logs (${sizeMB}MB)`);
      await this.addLog(deploymentId, `✅ تم تنظيف سجلات PM2: ${sizeMB}MB`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`PM2 logs: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ PM2 logs cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClOldApk(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "📦 تنظيف APK القديمة (الاحتفاظ بآخر 5)...", "info");
    const releasesDir = "/home/administrator/app2/android-releases";
    try {
      const { stdout: listOut } = await execAsync(`${sshCmd} "ls -1t ${releasesDir}/*.apk 2>/dev/null"`, { timeout: 10000 });
      const files = listOut.trim().split("\n").filter(Boolean);
      if (files.length <= 5) {
        await this.addLog(deploymentId, `✅ APK: ${files.length} ملفات فقط — لا حاجة للتنظيف`, "success");
        return;
      }
      const toDelete = files.slice(5);
      const { stdout: sizeOut } = await execAsync(`${sshCmd} "du -sm ${toDelete.join(" ")} 2>/dev/null | awk '{s+=\\$1} END{print s+0}'"`, { timeout: 10000 });
      const sizeMB = parseInt(sizeOut.trim()) || 0;
      await execAsync(`${sshCmd} "rm -f ${toDelete.join(" ")} 2>/dev/null && echo 'DONE'"`, { timeout: 15000 });
      this.addCleanupStep(deploymentId, "cl-old-apk", sizeMB, `Old APKs: ${toDelete.length} ملف (${sizeMB}MB)`);
      await this.addLog(deploymentId, `✅ تم حذف ${toDelete.length} APK قديمة (${sizeMB}MB) — الاحتفاظ بآخر 5`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`Old APK: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ Old APK cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClDocker(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🐳 تنظيف Docker...", "info");
    try {
      const { stdout: check } = await execAsync(`${sshCmd} "which docker 2>/dev/null && echo 'EXISTS' || echo 'NONE'"`, { timeout: 5000 });
      if (!check.includes("EXISTS")) {
        await this.addLog(deploymentId, `ℹ️ Docker غير مثبت — تخطي`, "info");
        return;
      }
      const { stdout: sizeOut } = await execAsync(`${sshCmd} "docker system df --format '{{.Reclaimable}}' 2>/dev/null | head -1"`, { timeout: 10000 });
      await execAsync(`${sshCmd} "docker system prune -f 2>/dev/null"`, { timeout: 30000 });
      this.addCleanupStep(deploymentId, "cl-docker", 0, `Docker dangling (${sizeOut.trim()})`);
      await this.addLog(deploymentId, `✅ تم تنظيف Docker: ${sizeOut.trim()} قابل للاسترداد`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`Docker: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ Docker cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClNpmCache(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "📦 تنظيف ذاكرة npm...", "info");
    try {
      const { stdout: sizeOut } = await execAsync(`${sshCmd} "du -sm ~/.npm 2>/dev/null | awk '{print \\$1}'"`, { timeout: 10000 });
      const sizeMB = parseInt(sizeOut.trim()) || 0;
      await execAsync(`${sshCmd} "npm cache clean --force 2>/dev/null"`, { timeout: 30000 });
      this.addCleanupStep(deploymentId, "cl-npm-cache", sizeMB, `npm cache (${sizeMB}MB)`);
      await this.addLog(deploymentId, `✅ تم تنظيف ذاكرة npm: ${sizeMB}MB`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`npm cache: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ npm cache cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClJournal(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "📓 تنظيف سجل النظام (journalctl)...", "info");
    try {
      const { stdout: sizeOut } = await execAsync(`${sshCmd} "journalctl --disk-usage 2>/dev/null | grep -oP '\\d+\\.?\\d*[MGK]' | head -1"`, { timeout: 10000 });
      await execAsync(`${sshCmd} "sudo journalctl --vacuum-time=3d 2>/dev/null || journalctl --vacuum-time=3d 2>/dev/null"`, { timeout: 20000 });
      this.addCleanupStep(deploymentId, "cl-journal", 0, `System journal (was: ${sizeOut.trim() || "unknown"})`);
      await this.addLog(deploymentId, `✅ تم تنظيف سجل النظام (كان: ${sizeOut.trim() || "غير معروف"})`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`Journal: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ Journal cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClOldLogs(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🗂️ تنظيف ملفات السجلات القديمة (> 7 أيام)...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "find /var/log -name '*.log' -mtime +7 -type f 2>/dev/null | head -20"`, { timeout: 10000 });
      const files = stdout.trim().split("\n").filter(Boolean);
      if (files.length === 0) {
        await this.addLog(deploymentId, `✅ لا توجد سجلات قديمة`, "success");
        return;
      }
      const { stdout: sizeOut } = await execAsync(`${sshCmd} "find /var/log -name '*.log' -mtime +7 -type f -exec du -sm {} + 2>/dev/null | awk '{s+=\\$1} END{print s+0}'"`, { timeout: 10000 });
      const sizeMB = parseInt(sizeOut.trim()) || 0;
      await execAsync(`${sshCmd} "find /var/log -name '*.log' -mtime +7 -type f -delete 2>/dev/null; find /var/log -name '*.gz' -mtime +7 -type f -delete 2>/dev/null"`, { timeout: 15000 });
      this.addCleanupStep(deploymentId, "cl-old-logs", sizeMB, `Old logs: ${files.length} ملف (${sizeMB}MB)`);
      await this.addLog(deploymentId, `✅ تم حذف ${files.length} ملف سجلات قديمة (${sizeMB}MB)`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`Old logs: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ Old logs cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClGitGc(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🔀 تنظيف Git (garbage collection)...", "info");
    const remoteDir = "/home/administrator/app2";
    try {
      const { stdout: beforeSize } = await execAsync(`${sshCmd} "du -sm ${remoteDir}/.git 2>/dev/null | awk '{print \\$1}'"`, { timeout: 10000 });
      const beforeMB = parseInt(beforeSize.trim()) || 0;
      await execAsync(`${sshCmd} "cd ${remoteDir} && git gc --aggressive --prune=now 2>&1 | tail -3"`, { timeout: 60000 });
      const { stdout: afterSize } = await execAsync(`${sshCmd} "du -sm ${remoteDir}/.git 2>/dev/null | awk '{print \\$1}'"`, { timeout: 10000 });
      const afterMB = parseInt(afterSize.trim()) || 0;
      const saved = Math.max(0, beforeMB - afterMB);
      this.addCleanupStep(deploymentId, "cl-git-gc", saved, `Git GC (${beforeMB}MB → ${afterMB}MB, saved ${saved}MB)`);
      await this.addLog(deploymentId, `✅ Git GC: ${beforeMB}MB → ${afterMB}MB (وُفّر ${saved}MB)`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`Git GC: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ Git GC: ${err.message}`, "warn");
    }
  }

  private async stepClOrphans(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "👻 فحص العمليات اليتيمة...", "info");
    try {
      const { stdout } = await execAsync(`${sshCmd} "ps aux --sort=-%mem | awk 'NR>1 && \\$3>50{print \\$2,\\$3,\\$4,\\$11}' | head -5"`, { timeout: 10000 });
      if (stdout.trim()) {
        await this.addLog(deploymentId, `⚠️ عمليات عالية الاستهلاك:\n${stdout.trim()}`, "warn");
        this.addCleanupStep(deploymentId, "cl-orphans", 0, "Orphan check (found high-resource processes)");
      } else {
        await this.addLog(deploymentId, `✅ لا توجد عمليات يتيمة عالية الاستهلاك`, "success");
      }
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`Orphans: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ Orphan check: ${err.message}`, "warn");
    }
  }

  private async stepClAptCache(deploymentId: string, sshCmd: string) {
    await this.addLog(deploymentId, "🗃️ تنظيف ذاكرة APT...", "info");
    try {
      const { stdout: sizeOut } = await execAsync(`${sshCmd} "du -sm /var/cache/apt/archives 2>/dev/null | awk '{print \\$1}'"`, { timeout: 10000 });
      const sizeMB = parseInt(sizeOut.trim()) || 0;
      await execAsync(`${sshCmd} "sudo apt-get clean 2>/dev/null || apt-get clean 2>/dev/null"`, { timeout: 30000 });
      this.addCleanupStep(deploymentId, "cl-apt-cache", sizeMB, `APT cache (${sizeMB}MB)`);
      await this.addLog(deploymentId, `✅ تم تنظيف ذاكرة APT: ${sizeMB}MB`, "success");
    } catch (err: any) {
      this.ensureCleanupResults(deploymentId).errors.push(`APT cache: ${err.message}`);
      await this.addLog(deploymentId, `⚠️ APT cache cleanup: ${err.message}`, "warn");
    }
  }

  private async stepClSummary(deploymentId: string) {
    await this.addLog(deploymentId, "📊 ملخص التنظيف...", "info");
    const results = this.cleanupResults.get(deploymentId) || { totalReclaimedBytes: 0, steps: [], errors: [] };

    const totalMB = Math.round(results.totalReclaimedBytes / (1024 * 1024) * 100) / 100;
    const report = {
      totalReclaimedBytes: results.totalReclaimedBytes,
      totalReclaimedMB: totalMB,
      steps: results.steps.map(s => ({
        name: s.name,
        reclaimedBytes: s.reclaimedBytes,
        reclaimedMB: Math.round(s.reclaimedBytes / (1024 * 1024) * 100) / 100,
        detail: s.detail,
      })),
      errors: results.errors,
      timestamp: new Date().toISOString(),
    };

    await db.update(buildDeployments).set({ serverHealthResult: report as any }).where(eq(buildDeployments.id, deploymentId));

    await this.addLog(deploymentId, `\n${"═".repeat(50)}`, "info");
    await this.addLog(deploymentId, `🧹 ملخص التنظيف:`, "info");
    await this.addLog(deploymentId, `  💾 إجمالي المساحة المستردة: ${totalMB}MB (${results.totalReclaimedBytes} bytes)`, "success");
    await this.addLog(deploymentId, `  ✅ عمليات ناجحة: ${results.steps.length}`, "success");
    if (results.errors.length > 0) {
      await this.addLog(deploymentId, `  ⚠️ أخطاء: ${results.errors.length}`, "warn");
      for (const err of results.errors) {
        await this.addLog(deploymentId, `    ❌ ${err}`, "warn");
      }
    }
    for (const s of results.steps) {
      const mb = Math.round(s.reclaimedBytes / (1024 * 1024) * 100) / 100;
      await this.addLog(deploymentId, `    ✓ ${s.detail}${mb > 0 ? ` [${mb}MB]` : ""}`, "info");
    }
    await this.addLog(deploymentId, `${"═".repeat(50)}`, "info");

    this.cleanupResults.delete(deploymentId);
  }

  async checkServerHealth(): Promise<{ status: string; checks: Record<string, any> }> {
    const sshCmd = this.buildSSHCommand();
    const checks: Record<string, any> = {};

    try {
      const healthUrl = this.resolveBaseUrl();
      const { stdout: httpCheck } = await execAsync(`curl -s -o /dev/null -w '%{http_code}' ${healthUrl}/api/health`, { timeout: 15000 });
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

  async rollbackDeployment(deploymentId: string, targetBuildNumber?: number, targetCommitHash?: string, triggeredBy?: string): Promise<string> {
    this.sshKeyProvisioned = false;
    this.knownHostsReady = false;
    this.resolvedAuthMethod = null;
    await this.ensureSSHKeyProvisioned();
    let targetDeployment: any;

    if (targetBuildNumber) {
      const [found] = await db.select().from(buildDeployments)
        .where(sql`${buildDeployments.buildNumber} = ${targetBuildNumber} AND ${buildDeployments.status} = 'success'`)
        .limit(1);
      if (!found) throw new Error(`Build #${targetBuildNumber} غير موجود أو لم ينجح`);
      targetDeployment = found;
    } else if (targetCommitHash) {
      const [found] = await db.select().from(buildDeployments)
        .where(sql`${buildDeployments.commitHash} = ${targetCommitHash} AND ${buildDeployments.status} = 'success'`)
        .limit(1);
      if (!found) throw new Error(`Commit ${targetCommitHash.substring(0, 8)} غير موجود أو لم ينجح`);
      targetDeployment = found;
    } else {
      const deployment = await this.getDeployment(deploymentId);
      if (!deployment) throw new Error("Deployment not found");
      if (deployment.status !== "success") throw new Error("Can only rollback successful deployments");
      targetDeployment = deployment;
    }

    const steps: StepEntry[] = [
      { name: "validate", status: "pending" },
      { name: "rollback-server", status: "pending" },
      { name: "restart-pm2", status: "pending" },
      { name: "verify", status: "pending" },
    ];

    const [rollbackDep] = await db.transaction(async (tx: any) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(7777001)`);

      const running = await tx.select({ id: buildDeployments.id, buildNumber: buildDeployments.buildNumber })
        .from(buildDeployments)
        .where(eq(buildDeployments.status, "running"))
        .limit(1);

      if (running.length > 0) {
        throw new Error(`عملية نشر أخرى (#${running[0].buildNumber}) قيد التنفيذ حالياً. انتظر انتهاءها أو ألغها أولاً.`);
      }

      const rollbackBuildNumber = await this.getNextBuildNumber();

      return tx.insert(buildDeployments).values({
        buildNumber: rollbackBuildNumber,
        status: "running",
        currentStep: "validate",
        progress: 0,
        version: targetDeployment.version,
        appType: targetDeployment.appType,
        environment: targetDeployment.environment,
        branch: targetDeployment.branch || "main",
        commitMessage: `Rollback to build #${targetDeployment.buildNumber} (${targetDeployment.commitHash?.substring(0, 8) || "N/A"})`,
        pipeline: "rollback",
        deploymentType: "rollback",
        triggeredBy: triggeredBy || "system",
        rollbackInfo: {
          originalDeploymentId: targetDeployment.id,
          originalBuildNumber: targetDeployment.buildNumber,
          targetCommitHash: targetDeployment.commitHash,
        },
        logs: [],
        steps,
      }).returning();
    });

    this.executeRollback(rollbackDep.id, targetDeployment).catch(err => {
      console.error(`[DeploymentEngine] Rollback error:`, err);
    });

    return rollbackDep.id;
  }

  private async executeRollback(rollbackId: string, targetDeployment: any) {
    const sshCmd = this.buildSSHCommand();
    const startTime = Date.now();
    const remoteDir = "/home/administrator/app2";
    const targetCommit = targetDeployment.commitHash;

    try {
      await this.updateStepStatus(rollbackId, "validate", "running");
      await this.addLog(rollbackId, `Rolling back to build #${targetDeployment.buildNumber} (v${targetDeployment.version})${targetCommit ? ` [${targetCommit.substring(0, 8)}]` : ""}`, "step");
      await this.updateStepStatus(rollbackId, "validate", "success", Date.now() - startTime);

      await this.updateStepStatus(rollbackId, "rollback-server", "running");
      await this.updateDeployment(rollbackId, { currentStep: "rollback-server", progress: 25 });
      await this.execWithLog(rollbackId, `${sshCmd} "cd ${remoteDir} && git log --oneline -3 2>/dev/null || echo 'git-log-unavailable'"`, "Git Log (before)", 15000);

      const rollbackCmd = targetCommit
        ? `git stash 2>/dev/null; git checkout ${targetCommit} -- . 2>/dev/null && echo 'CHECKOUT_OK' || (git fetch origin && git checkout ${targetCommit} -- . && echo 'CHECKOUT_OK')`
        : `git stash 2>/dev/null; git checkout HEAD~1 -- . 2>/dev/null && echo 'CHECKOUT_OK'`;

      await this.execWithLog(rollbackId, `${sshCmd} "set -o pipefail && cd ${remoteDir} && ${rollbackCmd} && npm install --legacy-peer-deps --loglevel=error 2>&1 | tail -3 && npm run build 2>&1 | tail -5 && echo 'ROLLBACK_CODE_OK'"`, "Rollback Code", 180000);
      await this.updateStepStatus(rollbackId, "rollback-server", "success", Date.now() - startTime);

      await this.updateStepStatus(rollbackId, "restart-pm2", "running");
      await this.updateDeployment(rollbackId, { currentStep: "restart-pm2", progress: 60 });
      const rollbackVersion = targetDeployment?.version || "rollback";
      const rollbackAppName = `AXION-v${rollbackVersion}`;
      const rollbackEcosystem = `module.exports = {
  apps: [{
    name: '${rollbackAppName}',
    script: 'dist/index.js',
    cwd: '${remoteDir}',
    exec_mode: 'fork',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 6000
    },
    node_args: '--max-old-space-size=512',
    max_memory_restart: '600M',
    max_restarts: 15,
    min_uptime: '10s',
    restart_delay: 3000,
    listen_timeout: 15000,
    kill_timeout: 8000,
    wait_ready: false,
    autorestart: true,
    watch: false,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/home/administrator/.pm2/logs/construction-app-error.log',
    out_file: '/home/administrator/.pm2/logs/construction-app-out.log',
    log_file: '/home/administrator/.pm2/logs/construction-app-combined.log'
  }]
};`;
      await this.execWithLog(rollbackId, `${sshCmd} "pm2 jlist 2>/dev/null | node -e \\"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const legacy=['construction-app'];d.filter(p=>p.name&&(p.name.startsWith('AXION')||legacy.includes(p.name))).forEach(p=>{try{require('child_process').execSync('pm2 delete '+p.name)}catch(e){}})\\" 2>/dev/null; cd ${remoteDir} && cat > ecosystem.config.cjs << 'EOFECO'\n${rollbackEcosystem}\nEOFECO\npm2 start ecosystem.config.cjs --env production --update-env && pm2 save && echo 'RESTART_OK'"`, "PM2 Fresh Start (Rollback)", 45000);
      await this.updateStepStatus(rollbackId, "restart-pm2", "success", Date.now() - startTime);

      await this.updateStepStatus(rollbackId, "verify", "running");
      await this.updateDeployment(rollbackId, { currentStep: "verify", progress: 85 });
      await new Promise(r => setTimeout(r, 5000));
      const health = await this.checkServerHealth();
      await this.updateDeployment(rollbackId, { serverHealthResult: health, commitHash: targetCommit });
      await this.addLog(rollbackId, `Health check: ${health.status}`, health.status === "healthy" ? "success" : "warn");

      if (health.status === "down" || health.status === "error") {
        await this.updateStepStatus(rollbackId, "verify", "failed", Date.now() - startTime);
        throw new Error(`فشل فحص الصحة بعد التراجع: الخادم ${health.status}`);
      }

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

  async resumeDeployment(deploymentId: string): Promise<string> {
    this.sshKeyProvisioned = false;
    this.knownHostsReady = false;
    this.resolvedAuthMethod = null;
    await this.ensureSSHKeyProvisioned();

    return await db.transaction(async (tx: any) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(7777001)`);

      const [deployment] = await tx.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      if (!deployment) throw new Error("Deployment not found");
      if (deployment.status !== "failed" && deployment.status !== "running") throw new Error("يمكن استئناف عمليات النشر الفاشلة أو المعلقة فقط");

      if (deployment.status === "running") {
        if (this.isDeploymentLocallyActive(deploymentId)) {
          throw new Error("هذه العملية لا تزال نشطة محلياً — لا يمكن استئنافها. انتظر حتى تنتهي أو قم بإلغائها أولاً.");
        }
        this.stopRemoteMonitor(deploymentId);
      }

      if (deployment.pipeline === "rollback") {
        throw new Error("لا يمكن استئناف عمليات التراجع — أعد تنفيذ الـ rollback");
      }

      const running = await tx.select({ id: buildDeployments.id, buildNumber: buildDeployments.buildNumber })
        .from(buildDeployments)
        .where(sql`${buildDeployments.status} = 'running' AND ${buildDeployments.id} != ${deploymentId}`)
        .limit(1);

      if (running.length > 0) {
        throw new Error(`عملية نشر أخرى (#${running[0].buildNumber}) قيد التنفيذ حالياً. انتظر انتهاءها أولاً.`);
      }

      const IDEMPOTENT_STEPS = new Set(["validate", "preflight-check", "verify", "prebuild-gate", "android-readiness", "apk-integrity", "post-deploy-smoke"]);

      const steps = deployment.steps as StepEntry[];
      let resumeFromIdx: number;
      const failedIdx = steps.findIndex(s => s.status === "failed" || s.status === "cancelled");
      if (failedIdx !== -1) {
        const prevStep = steps[failedIdx - 1];
        resumeFromIdx = (failedIdx > 0 && prevStep && IDEMPOTENT_STEPS.has(prevStep.name))
          ? failedIdx
          : Math.max(0, failedIdx - 1);
      } else {
        const runningIdx = steps.findIndex(s => s.status === "running");
        if (runningIdx !== -1) {
          const prevStep = steps[runningIdx - 1];
          resumeFromIdx = (runningIdx > 0 && prevStep && IDEMPOTENT_STEPS.has(prevStep.name))
            ? runningIdx
            : Math.max(0, runningIdx - 1);
        } else {
          const lastSuccessIdx = steps.map((s, i) => s.status === "success" ? i : -1).filter(i => i >= 0).pop();
          resumeFromIdx = lastSuccessIdx !== undefined ? Math.max(0, lastSuccessIdx - 1) : 0;
          if (resumeFromIdx >= steps.length) {
            throw new Error("لا توجد خطوة فاشلة للاستئناف منها");
          }
        }
      }
      const firstFailedIdx = resumeFromIdx;

      const updatedSteps = steps.map((s, idx) => {
        if (idx >= firstFailedIdx) {
          return { ...s, status: "pending" as const, duration: undefined };
        }
        return s;
      });

      await tx.update(buildDeployments).set({
        status: "running",
        currentStep: steps[firstFailedIdx].name,
        progress: Math.round((firstFailedIdx / steps.length) * 100),
        steps: updatedSteps,
        errorMessage: null,
        endTime: null,
      }).where(eq(buildDeployments.id, deploymentId));

      await this.addLog(deploymentId, `🔄 استئناف النشر من الخطوة: ${steps[firstFailedIdx].name}`, "info");
      await this.addEvent(deploymentId, "deployment_resumed", `Resumed from step: ${steps[firstFailedIdx].name}`, { resumedFromStep: firstFailedIdx });

      broadcastToClients(deploymentId, { type: "deployment_update", data: { status: "running", currentStep: steps[firstFailedIdx].name, steps: updatedSteps } });
      broadcastGlobalEvent({ type: "deployment_resumed", deploymentId, data: { id: deploymentId, status: "running" } });

      const config: DeploymentConfig = {
        pipeline: deployment.pipeline as Pipeline,
        appType: deployment.appType as "web" | "android",
        environment: (deployment.environment as "production" | "staging") || "production",
        branch: deployment.branch || "main",
        version: deployment.version || undefined,
        triggeredBy: deployment.triggeredBy || undefined,
        buildTarget: ((deployment as any).buildTarget as "server" | "local") || "server",
        deployerToken: (deployment as any).deployerToken || undefined,
      };

      this.runPipelineFromStep(deploymentId, config, firstFailedIdx).catch(err => {
        console.error(`[DeploymentEngine] Resume error for ${deploymentId}:`, err);
      });

      return deploymentId;
    });
  }

  private async runPipelineFromStep(deploymentId: string, config: DeploymentConfig, startFromIdx: number) {
    const bt = config.buildTarget || "server";
    const pipelineSteps = getPipelineSteps(config.pipeline, bt);
    const startTime = Date.now();

    this.startHeartbeat(deploymentId);
    await this.sendDeploymentNotification("started", config, deploymentId);
    await this.addLog(deploymentId, `استئناف من الخطوة ${startFromIdx + 1}/${pipelineSteps.length}: ${pipelineSteps[startFromIdx]}`, "info");

    try {
      for (let i = startFromIdx; i < pipelineSteps.length; i++) {
        if (this.isCancelled(deploymentId)) {
          await this.markRemainingStepsCancelled(deploymentId, i - 1, pipelineSteps);
          throw new CancellationError();
        }

        const stepName = pipelineSteps[i];
        const progress = Math.round(((i) / pipelineSteps.length) * 100);

        await this.updateDeployment(deploymentId, { currentStep: stepName, progress });
        await this.updateStepStatus(deploymentId, stepName, "running");
        await this.addLog(deploymentId, `Starting step: ${stepName}`, "step");

        const stepStart = Date.now();
        const retryPolicy = getStepRetryPolicy(stepName);
        const maxAttempts = (retryPolicy?.maxRetries || 0) + 1;
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            if (attempt > 1) {
              await this.addLog(deploymentId, `🔄 إعادة محاولة ${stepName} (${attempt}/${maxAttempts})...`, "warn");
              await new Promise(r => setTimeout(r, retryPolicy!.delayMs));
              if (this.isCancelled(deploymentId)) throw new CancellationError();
            }
            const timeoutMs = getStepTimeout(stepName);
            await Promise.race([
              this.executeStep(deploymentId, stepName, config),
              new Promise<never>((_, reject) => setTimeout(() => {
                this.terminateActiveProcesses(deploymentId);
                reject(new Error(`⏱️ الخطوة ${stepName} تجاوزت الحد الزمني (${timeoutMs/1000}ث)`));
              }, timeoutMs)),
            ]);
            const stepDuration = Date.now() - stepStart;
            await this.updateStepStatus(deploymentId, stepName, "success", stepDuration);
            await this.addLog(deploymentId, `Step ${stepName} completed (${(stepDuration / 1000).toFixed(1)}s)`, "success");
            lastError = null;
            break;
          } catch (stepError: any) {
            if (stepError instanceof CancellationError || this.isCancelled(deploymentId)) {
              await this.updateStepStatus(deploymentId, stepName, "cancelled", Date.now() - stepStart);
              await this.markRemainingStepsCancelled(deploymentId, i, pipelineSteps);
              throw new CancellationError();
            }
            lastError = stepError;
            if (attempt < maxAttempts) {
              await this.addLog(deploymentId, `⚠️ ${stepName} فشل (محاولة ${attempt}/${maxAttempts}): ${stepError.message}`, "warn");
            }
          }
        }

        if (lastError) {
          const stepDuration = Date.now() - stepStart;
          await this.updateStepStatus(deploymentId, stepName, "failed", stepDuration);
          await this.markRemainingStepsCancelled(deploymentId, i, pipelineSteps);
          await this.addLog(deploymentId, `Step ${stepName} failed: ${lastError.message}`, "error");
          throw lastError;
        }
      }

      const totalDuration = Date.now() - startTime;

      if (this.isCancelled(deploymentId)) {
        throw new CancellationError();
      }

      const [resumeSuccess] = await db.update(buildDeployments).set({
        status: "success",
        progress: 100,
        currentStep: "complete",
        duration: totalDuration,
        endTime: new Date(),
      }).where(sql`${buildDeployments.id} = ${deploymentId} AND ${buildDeployments.status} = 'running'`).returning({ id: buildDeployments.id });

      if (!resumeSuccess) {
        await this.addLog(deploymentId, "⚠️ تم إلغاء العملية أثناء الاكتمال — لن يتم تسجيل النجاح", "warn");
        return;
      }

      await this.addLog(deploymentId, `Deployment resumed and completed successfully in ${(totalDuration / 1000).toFixed(1)}s`, "success");
      await this.sendDeploymentNotification("success", config, deploymentId, totalDuration);
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      const isCancelled = error instanceof CancellationError;
      const failStatus = isCancelled ? "cancelled" : "failed";
      const [casResult] = await db.update(buildDeployments).set({
        status: failStatus,
        duration: totalDuration,
        endTime: new Date(),
        errorMessage: isCancelled ? "Cancelled by user" : error.message,
      }).where(and(eq(buildDeployments.id, deploymentId), eq(buildDeployments.status, "running"))).returning({ id: buildDeployments.id });

      if (casResult) {
        await this.sendDeploymentNotification(failStatus, config, deploymentId, totalDuration, error.message);
      }
    } finally {
      this.stopHeartbeat(deploymentId);
      this.cleanupDeploymentState(deploymentId);
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
    if (!deployment) return null;

    const buffered = this.logBuffers.get(id);
    if (buffered && buffered.length > 0) {
      const dbLogs = Array.isArray(deployment.logs) ? deployment.logs as LogEntry[] : [];
      const maxLogs = 500;
      const combined = [...dbLogs, ...buffered];
      (deployment as any).logs = combined.length > maxLogs ? combined.slice(-maxLogs) : combined;
    }

    return deployment;
  }

  async deleteDeployment(id: string) {
    const [deployment] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, id));
    if (!deployment) throw new Error("العملية غير موجودة");
    if (deployment.status === "running") throw new Error("لا يمكن حذف عملية قيد التنفيذ");
    await db.delete(buildDeployments).where(eq(buildDeployments.id, id));
    broadcastGlobalEvent({ type: "deployment_deleted", deploymentId: id, data: { id } });
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

    this.killRemoteBuildProcess(deploymentId).catch(err => {
      console.error(`[DeploymentEngine] killRemoteBuildProcess error:`, err?.message);
    });

    const steps = deployment.steps as StepEntry[];
    const updatedSteps = steps.map(s => {
      if (s.status === "pending" || s.status === "running") {
        return { ...s, status: "cancelled" as const };
      }
      return s;
    });

    const [updated] = await db.update(buildDeployments).set({
      steps: updatedSteps,
      status: "cancelled",
      errorMessage: "تم الإلغاء بواسطة المستخدم",
      endTime: new Date(),
    }).where(sql`${buildDeployments.id} = ${deploymentId} AND ${buildDeployments.status} = 'running'`).returning({ id: buildDeployments.id });

    if (!updated) {
      console.log(`[DeploymentEngine] cancelDeployment: deployment ${deploymentId} already transitioned — skipping broadcast`);
      return;
    }

    this.stopRemoteMonitor(deploymentId);
    this.stopHeartbeat(deploymentId);

    await this.addLog(deploymentId, "تم إلغاء النشر بواسطة المستخدم", "warn");
    await this.addEvent(deploymentId, "deployment_cancelled", "Deployment cancelled by user");
    await this.flushLogs(deploymentId);

    broadcastToClients(deploymentId, { type: "deployment_update", data: { status: "cancelled", steps: updatedSteps, errorMessage: "تم الإلغاء بواسطة المستخدم" } });
    broadcastGlobalEvent({ type: "deployment_cancelled", deploymentId, data: { id: deploymentId, status: "cancelled" } });
  }

  private async killRemoteBuildProcess(deploymentId: string): Promise<void> {
    try {
      await this.ensureSSHKeyProvisioned();
      const sshCmd = this.buildSSHCommand();
      const buildId = deploymentId.substring(0, 8);
      const pidFile = `/tmp/axion_build_${buildId}.pid`;
      const exitFile = `/tmp/axion_build_${buildId}.exit`;
      const logFile = `/tmp/axion_build_${buildId}.log`;

      const { stdout } = await execAsync(
        `${sshCmd} "if [ -f ${pidFile} ]; then PID=\\$(cat ${pidFile}); kill \\$PID 2>/dev/null && echo KILLED:\\$PID || echo ALREADY_DEAD; rm -f ${pidFile} ${exitFile}; else echo NO_PID_FILE; fi"`,
        { timeout: 15000, env: { ...process.env, SSHPASS: process.env.SSH_PASSWORD || process.env.SSHPASS || '' } }
      );
      const result = stdout.trim();
      console.log(`[DeploymentEngine] killRemoteBuildProcess(${buildId}): ${result}`);

      if (result.startsWith("KILLED:")) {
        await this.addLog(deploymentId, `🛑 تم إيقاف عملية البناء على السيرفر البعيد (PID: ${result.replace("KILLED:", "")})`, "warn");
      }
    } catch (err: any) {
      console.error(`[DeploymentEngine] killRemoteBuildProcess failed:`, err?.message);
    }
  }

  private static DOWNLOAD_TOKEN_EXPIRY_MS = 3600000;

  generateDownloadToken(deploymentId: string): string {
    const secret = process.env.APP_SECRET || process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error("APP_SECRET أو SESSION_SECRET مطلوب لتوليد رمز التحميل");
    }
    const expiresAt = (Date.now() + DeploymentEngine.DOWNLOAD_TOKEN_EXPIRY_MS).toString();
    const hash = createHmac("sha256", secret)
      .update(`${deploymentId}:${expiresAt}`)
      .digest("hex")
      .substring(0, 32);
    return `${expiresAt}.${hash}`;
  }

  verifyDownloadToken(deploymentId: string, token: string): boolean {
    const secret = process.env.APP_SECRET || process.env.SESSION_SECRET;
    if (!secret) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [expiresAt, hash] = parts;
    const expiry = parseInt(expiresAt, 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;
    const expectedHash = createHmac("sha256", secret)
      .update(`${deploymentId}:${expiresAt}`)
      .digest("hex")
      .substring(0, 32);
    return hash === expectedHash;
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
export { registerGlobalSSEClient };
