import { Router, Request, Response } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { deploymentEngine, registerGlobalSSEClient } from "../../services/deployment-engine.js";
import { getAuthUser } from "../../internal/auth-user.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { checkDeployPermission } from "../../middleware/deployment-auth.js";
import { DeploymentLogger } from "../../services/deployment-logger.js";
import { listAvailablePipelines, isPipelineSupported } from "../../config/pipeline-definitions.js";

const router = Router();
const publicRouter = Router();

function setApkDownloadHeaders(res: Response, fileName: string, fileSize: number): void {
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", String(fileSize));
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
}

deploymentEngine.recoverOrphanedDeployments().catch(err => {
  console.error("[DeploymentRoutes] Failed to recover orphaned deployments:", err);
});
deploymentEngine.startRecoverySupervisor();

function sanitizeShellArg(input: string): string {
  return input.replace(/[^\w\s\u0600-\u06FF.,!?@#$%^&*()\-=+\[\]{}|:;<>\/~`'"]/g, "").substring(0, 200);
}

const updateCheckLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

const downloadLimiter = new Map<string, { count: number; resetAt: number }>();
const DOWNLOAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DOWNLOAD_RATE_LIMIT_MAX = 10;

const ANDROID_PIPELINES = new Set(["android-build", "full-deploy", "git-android-build", "android-build-test"]);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = updateCheckLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    updateCheckLimiter.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function isDownloadRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = downloadLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    downloadLimiter.set(ip, { count: 1, resetAt: now + DOWNLOAD_RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > DOWNLOAD_RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of updateCheckLimiter) {
    if (now > entry.resetAt) updateCheckLimiter.delete(ip);
  }
  for (const [ip, entry] of downloadLimiter) {
    if (now > entry.resetAt) downloadLimiter.delete(ip);
  }
}, 5 * 60 * 1000);

publicRouter.get("/app/check-update", async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(clientIp)) {
    res.status(429).json({ error: "طلبات كثيرة، حاول لاحقاً" });
    return;
  }

  try {
    const clientVersionCode = parseInt(req.query.versionCode as string) || 0;
    const clientVersionName = (req.query.versionName as string || "0.0.0").replace(/[^0-9.]/g, "").substring(0, 20);

    const latest = await deploymentEngine.getLatestAndroidRelease();

    if (!latest) {
      console.log(`[check-update] لا يوجد إصدار أندرويد. client=${clientVersionName}(${clientVersionCode})`);
      res.json({ updateAvailable: false });
      return;
    }

    const clientVersionUnknown = clientVersionName === "0.0.0" && clientVersionCode === 0;

    const byVersionName = compareVersions(latest.versionName, clientVersionName) > 0;
    const byVersionCode = clientVersionCode > 0 && latest.versionCode > clientVersionCode;
    const updateAvailable = clientVersionUnknown ? true : (byVersionName || byVersionCode);

    const FORCE_UPDATE_MIN_VERSION = process.env.FORCE_UPDATE_MIN_VERSION || "1.0.28";
    const FORCE_UPDATE_EXEMPT_VERSIONS = new Set(
      (process.env.FORCE_UPDATE_EXEMPT_VERSIONS || "").split(",").map(v => v.trim()).filter(Boolean)
    );

    let forceUpdate = false;
    if (updateAvailable && !clientVersionUnknown) {
      const isExempt = FORCE_UPDATE_EXEMPT_VERSIONS.has(clientVersionName);
      const isAtOrAboveMinForce = compareVersions(clientVersionName, FORCE_UPDATE_MIN_VERSION) >= 0;
      forceUpdate = !isExempt && isAtOrAboveMinForce;
    }

    console.log(`[check-update] client=${clientVersionName}(${clientVersionCode}) latest=${latest.versionName}(${latest.versionCode}) byName=${byVersionName} byCode=${byVersionCode} update=${updateAvailable} force=${forceUpdate} unknown=${clientVersionUnknown} minForce=${FORCE_UPDATE_MIN_VERSION}`);

    res.json({
      updateAvailable,
      forceUpdate,
      latest: {
        versionName: latest.versionName,
        versionCode: latest.versionCode,
        downloadUrl: latest.downloadUrl,
        releasedAt: latest.releasedAt,
        releaseNotes: latest.releaseNotes || null,
      },
      current: {
        versionName: clientVersionName,
        versionCode: clientVersionCode,
      },
    });
  } catch (err: any) {
    console.error("[check-update] Error:", err.message);
    res.status(500).json({ error: "فشل فحص التحديث" });
  }
});

router.use(requireAuth);

router.post("/start", requireAdmin, checkDeployPermission, asyncHandler(async (req: Request, res: Response) => {
  const { pipeline = "web-deploy", appType = "web", environment = "production", branch = "main", commitMessage, version, buildTarget = "server", releaseNotes } = req.body;

  if (!isPipelineSupported(pipeline)) {
    const available = listAvailablePipelines().map(p => p.name);
    res.status(400).json({ error: `Invalid pipeline. Valid: ${available.join(", ")}` });
    return;
  }

  const validEnvs = ["production", "staging"];
  if (!validEnvs.includes(environment)) {
    res.status(400).json({ error: "Invalid environment" });
    return;
  }

  const validTargets = ["server", "local"];
  const safeBuildTarget = validTargets.includes(buildTarget) ? buildTarget : "server";

  const androidPipelines = ["android-build", "full-deploy", "git-android-build", "android-build-test"];
  const safeBranch = typeof branch === "string" ? branch.replace(/[^a-zA-Z0-9_\-\/\.]/g, "").substring(0, 100) : "main";
  const safeMessage = typeof commitMessage === "string" ? sanitizeShellArg(commitMessage) : undefined;
  const safeVersion = typeof version === "string" ? version.replace(/[^0-9.\-a-zA-Z]/g, "").substring(0, 20) : undefined;
  const safeReleaseNotes = typeof releaseNotes === "string" ? releaseNotes.substring(0, 2000) : undefined;

  const authUser = getAuthUser(req);
  const { getUserDisplayName } = await import('../../internal/auth-user');
  const triggeredByDisplay = getUserDisplayName(authUser);
  const authHeader = req.headers.authorization;
  const deployerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  try {
    const deploymentId = await deploymentEngine.startDeployment({
      pipeline,
      appType: androidPipelines.includes(pipeline) ? "android" : appType,
      environment,
      branch: safeBranch,
      commitMessage: safeMessage,
      triggeredBy: triggeredByDisplay,
      version: safeVersion,
      buildTarget: safeBuildTarget,
      deployerToken,
      releaseNotes: safeReleaseNotes,
    });

    res.json({ id: deploymentId, message: "Deployment started" });
  } catch (err: any) {
    if (err.message?.includes("قيد التنفيذ")) {
      res.status(409).json({ error: err.message });
    } else {
      throw err;
    }
  }
}));

router.get("/list", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const deployments = await deploymentEngine.getDeployments(limit, offset);
  const total = await deploymentEngine.getDeploymentCount();
  res.json({ deployments, total, limit, offset });
}));

router.get("/stats", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const stats = await deploymentEngine.getDeploymentStats();
  res.json(stats);
}));

router.get("/step-averages", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const pipeline = (req.query.pipeline as string) || undefined;
  const averages = await deploymentEngine.getStepAverages(pipeline);
  res.json(averages);
}));

router.get("/health", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const health = await deploymentEngine.checkServerHealth();
  res.json(health);
}));

router.post("/health-check", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const deploymentId = await deploymentEngine.startDeployment({
    pipeline: "health-check" as any,
    appType: "web",
    environment: "production",
    branch: "main",
    triggeredBy: user?.username || user?.email || "admin",
    version: "health-check",
    commitMessage: "فحص صحة السيرفر الشامل",
  });
  res.json({ id: deploymentId, message: "بدأ فحص صحة السيرفر الشامل" });
}));

router.post("/cleanup", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const result = await deploymentEngine.runCleanup();
  res.json(result);
}));

router.post("/server-cleanup", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const deploymentId = await deploymentEngine.startDeployment({
    pipeline: "server-cleanup" as any,
    appType: "web",
    environment: "production",
    branch: "main",
    triggeredBy: user?.username || user?.email || "admin",
    version: "server-cleanup",
    commitMessage: "تنظيف السيرفر العميق",
  });
  res.json({ id: deploymentId, message: "بدأ تنظيف السيرفر العميق" });
}));

router.get("/:id/events", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const events = await deploymentEngine.getDeploymentEvents(req.params.id);
  res.json(events);
}));

router.get("/global-stream", requireAdmin, async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`data: ${JSON.stringify({ type: "connected", message: "Global SSE stream connected" })}\n\n`);

  registerGlobalSSEClient(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 8000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

router.get("/:id/stream", requireAdmin, async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`data: ${JSON.stringify({ type: "connected", message: "SSE stream connected" })}\n\n`);

  deploymentEngine.registerSSEClient(req.params.id, res);

  const sendInitialState = async () => {
    try {
      const deployment = await deploymentEngine.getDeployment(req.params.id);
      if (deployment) {
        res.write(`data: ${JSON.stringify({ type: "initial_state", data: deployment })}\n\n`);
      }
    } catch (e) {
      console.error("[SSE] Failed to send initial state:", e);
    }
  };
  
  await sendInitialState();

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 8000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

router.post("/:id/cancel", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deployment = await deploymentEngine.getDeployment(req.params.id);
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }
  if (deployment.status !== "running") {
    res.status(400).json({ error: "Can only cancel running deployments" });
    return;
  }

  await deploymentEngine.cancelDeployment(req.params.id);
  res.json({ message: "Deployment cancelled" });
}));

router.post("/:id/rollback", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const targetBuildNumber = req.body.targetBuildNumber ? parseInt(req.body.targetBuildNumber) : undefined;
  const targetCommitHash = typeof req.body.targetCommitHash === "string"
    ? req.body.targetCommitHash.replace(/[^a-f0-9]/gi, "").substring(0, 40)
    : undefined;
  const authUser = getAuthUser(req);
  const { getUserDisplayName: getDisplayName } = await import('../../internal/auth-user');
  const triggeredBy = getDisplayName(authUser);
  const rollbackId = await deploymentEngine.rollbackDeployment(req.params.id, targetBuildNumber, targetCommitHash, triggeredBy);
  res.json({ id: rollbackId, message: "Rollback started" });
}));

router.post("/:id/resume", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deployment = await deploymentEngine.getDeployment(req.params.id);
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }
  if (deployment.status !== "failed" && deployment.status !== "running") {
    res.status(400).json({ error: "يمكن استئناف عمليات النشر الفاشلة أو المعلقة فقط" });
    return;
  }
  const resumedId = await deploymentEngine.resumeDeployment(req.params.id);
  res.json({ id: resumedId, message: "Deployment resumed" });
}));

router.get("/download/:id", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deployment = await deploymentEngine.getDeployment(req.params.id);
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }
  if (!deployment.artifactUrl) {
    res.status(404).json({ error: "No artifact available for this deployment" });
    return;
  }

  const remotePath = deployment.artifactUrl;
  if (/[`$;|&(){}\[\]!~<>'"\\#\n\r\0]/.test(remotePath) || remotePath.includes("..")) {
    res.status(400).json({ error: "مسار الملف غير صالح" });
    return;
  }

  const sshCmd = deploymentEngine.getSSHCommandForDownload();
  const fileName = `AXION_v${deployment.version}_build${deployment.buildNumber}.apk`;

  const execEnv = { ...process.env };
  if (process.env.SSH_PASSWORD && !execEnv.SSHPASS) {
    execEnv.SSHPASS = process.env.SSH_PASSWORD;
  }

  const host = (process.env.SSH_HOST || "93.127.142.144").replace(/[^a-zA-Z0-9.\-]/g, "");
  const { spawn } = await import("child_process");

  const sizeChild = spawn("bash", ["-c",
    `${sshCmd} "stat -c%s '${remotePath}' 2>/dev/null || echo MISSING"`
  ], { env: execEnv });

  let sizeOutput = "";
  sizeChild.stdout.on("data", (d: Buffer) => { sizeOutput += d.toString(); });
  await new Promise<void>((resolve) => sizeChild.on("close", resolve));

  if (sizeOutput.trim() === "MISSING" || !sizeOutput.trim()) {
    res.status(404).json({ error: "APK file not found on remote server" });
    return;
  }

  const fileSize = parseInt(sizeOutput.trim(), 10);
  if (isNaN(fileSize) || fileSize < 1000) {
    res.status(404).json({ error: "APK file invalid or too small" });
    return;
  }

  setApkDownloadHeaders(res, fileName, fileSize);

  const child = spawn("bash", ["-c",
    `${sshCmd} "cat '${remotePath}'"`
  ], { env: execEnv });

  const killChild = () => {
    try { child.kill("SIGTERM"); } catch {}
  };

  req.on("close", killChild);
  res.on("close", killChild);

  child.stdout.pipe(res);
  child.stderr.on("data", (data: Buffer) => {
    console.error("[APK Download] stderr:", data.toString());
  });
  child.on("error", (err: Error) => {
    console.error("[APK Download] Error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream APK" });
    }
  });
  child.on("close", (code: number | null) => {
    req.removeListener("close", killChild);
    if (code !== 0 && !res.headersSent) {
      res.status(500).json({ error: "APK transfer failed" });
    }
  });
}));

router.get("/:id", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deployment = await deploymentEngine.getDeployment(req.params.id);
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }
  res.json(deployment);
}));

router.delete("/:id", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  await deploymentEngine.deleteDeployment(req.params.id);
  res.json({ success: true, message: "تم حذف العملية" });
}));

const ALLOWED_PREBUILD_HOSTS = (process.env.PREBUILD_ALLOWED_HOSTS || "app2.binarjoinanelytic.info,localhost")
  .split(",")
  .map(h => h.trim())
  .filter(Boolean);

router.post("/prebuild-check", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { runPrebuildChecks } = await import("../../services/prebuild-route-checker.js");
  let baseUrl = process.env.PRODUCTION_URL || "https://app2.binarjoinanelytic.info";

  if (req.body.baseUrl && typeof req.body.baseUrl === "string") {
    try {
      const parsed = new URL(req.body.baseUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return res.status(400).json({ error: "Only http/https URLs allowed" });
      }
      if (!ALLOWED_PREBUILD_HOSTS.includes(parsed.hostname)) {
        return res.status(400).json({ error: `Host not in allowlist: ${parsed.hostname}` });
      }
      baseUrl = req.body.baseUrl;
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }
  }

  const report = await runPrebuildChecks(baseUrl);
  res.json(report);
}));

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function handlePublicApkDownload(req: Request, res: Response): Promise<void> {
  const SSH_SIZE_TIMEOUT_MS = 20000;
  const SSH_STREAM_TIMEOUT_MS = 120000;

  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  if (isDownloadRateLimited(clientIp)) {
    res.status(429).json({ error: "طلبات تحميل كثيرة، حاول بعد قليل" });
    return;
  }

  const token = (req.query.token as string) || (req.headers["x-download-token"] as string);
  if (!token) {
    res.status(401).json({ error: "رمز التحميل مطلوب — أضف ?token=... أو header x-download-token" });
    return;
  }
  if (!deploymentEngine.verifyDownloadToken(req.params.id, token)) {
    res.status(403).json({ error: "رمز التحميل غير صالح أو منتهي الصلاحية" });
    return;
  }

  try {
    const deployment = await deploymentEngine.getDeployment(req.params.id);
    if (!deployment || !deployment.artifactUrl) {
      res.status(404).json({ error: "الملف غير متوفر" });
      return;
    }

    if (deployment.status !== "success") {
      res.status(403).json({ error: "هذا الإصدار لم يكتمل بنجاح" });
      return;
    }

    if (!ANDROID_PIPELINES.has(deployment.pipeline)) {
      res.status(403).json({ error: "هذا الإصدار ليس إصدار أندرويد" });
      return;
    }

    const remotePath = deployment.artifactUrl;
    if (/[`$;|&(){}\[\]!~<>'"\\#\n\r\0]/.test(remotePath) || remotePath.includes("..")) {
      res.status(400).json({ error: "مسار الملف غير صالح" });
      return;
    }

    const sshCmd = deploymentEngine.getSSHCommandForDownload();
    const fileName = `AXION_v${deployment.version}_build${deployment.buildNumber}.apk`;

    const execEnv = { ...process.env };
    if (process.env.SSH_PASSWORD && !execEnv.SSHPASS) {
      execEnv.SSHPASS = process.env.SSH_PASSWORD;
    }

    const { spawn } = await import("child_process");

    const sizeChild = spawn("bash", ["-c",
      `${sshCmd} "stat -c%s '${remotePath}' 2>/dev/null || echo MISSING"`
    ], { env: execEnv });

    let sizeOutput = "";
    sizeChild.stdout.on("data", (d: Buffer) => { sizeOutput += d.toString(); });

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try { sizeChild.kill("SIGTERM"); } catch {}
        resolve();
      }, SSH_SIZE_TIMEOUT_MS);
      sizeChild.on("close", () => { clearTimeout(timer); resolve(); });
    });

    if (sizeOutput.trim() === "MISSING" || !sizeOutput.trim()) {
      console.error("[Public APK Download] SSH size check failed or file missing. output:", sizeOutput.substring(0, 200));
      if (!res.headersSent) res.status(503).json({ error: "ملف APK غير متوفر مؤقتاً — حاول لاحقاً" });
      return;
    }

    const fileSize = parseInt(sizeOutput.trim(), 10);
    if (isNaN(fileSize) || fileSize < 1000) {
      if (!res.headersSent) res.status(404).json({ error: "ملف APK غير صالح" });
      return;
    }

    setApkDownloadHeaders(res, fileName, fileSize);

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const child = spawn("bash", ["-c",
      `${sshCmd} "cat '${remotePath}'"`
    ], { env: execEnv });

    const streamTimeout = setTimeout(() => {
      console.error("[Public APK Download] Stream timeout — killing SSH process");
      try { child.kill("SIGTERM"); } catch {}
    }, SSH_STREAM_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(streamTimeout);
      try { child.kill("SIGTERM"); } catch {}
    };

    req.on("close", cleanup);
    res.on("close", cleanup);

    child.stdout.pipe(res);
    child.stderr.on("data", (data: Buffer) => {
      console.error("[Public APK Download] stderr:", data.toString().substring(0, 500));
    });
    child.on("error", (err: Error) => {
      console.error("[Public APK Download] spawn error:", err.message);
      clearTimeout(streamTimeout);
      if (!res.headersSent) res.status(503).json({ error: "فشل الاتصال بخادم التخزين" });
    });
    child.on("close", (code: number | null) => {
      clearTimeout(streamTimeout);
      if (code !== 0) {
        console.error(`[Public APK Download] SSH process exited with code ${code}`);
      }
    });
  } catch (err: any) {
    console.error("[Public APK Download] Error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "خطأ داخلي" });
  }
}

publicRouter.get("/app/download/:id", handlePublicApkDownload);
publicRouter.head("/app/download/:id", handlePublicApkDownload);

router.get("/dora-metrics", requireAuth, requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await DeploymentLogger.calculateDORAMetrics(30);
  res.json({ success: true, data: metrics });
}));

router.get("/pipelines", requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const pipelines = listAvailablePipelines();
  res.json({ success: true, data: pipelines });
}));

export default router;
export { publicRouter as deploymentPublicRouter };
