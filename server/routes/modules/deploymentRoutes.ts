import { Router, Request, Response } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { deploymentEngine } from "../../services/deployment-engine.js";
import { getAuthUser } from "../../internal/auth-user.js";
import { asyncHandler } from "../../lib/async-handler.js";

const router = Router();
const publicRouter = Router();

deploymentEngine.recoverOrphanedDeployments().catch(err => {
  console.error("[DeploymentRoutes] Failed to recover orphaned deployments:", err);
});

function sanitizeShellArg(input: string): string {
  return input.replace(/[^\w\s\u0600-\u06FF.,!?@#$%^&*()\-=+\[\]{}|:;<>\/~`'"]/g, "").substring(0, 200);
}

const updateCheckLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

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

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of updateCheckLimiter) {
    if (now > entry.resetAt) updateCheckLimiter.delete(ip);
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
      res.json({ updateAvailable: false });
      return;
    }

    const updateAvailable = clientVersionCode > 0
      ? latest.versionCode > clientVersionCode
      : compareVersions(latest.versionName, clientVersionName) > 0;

    res.json({
      updateAvailable,
      forceUpdate: false,
      latest: {
        versionName: latest.versionName,
        versionCode: latest.versionCode,
        downloadUrl: latest.downloadUrl,
        releasedAt: latest.releasedAt,
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

router.post("/start", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { pipeline = "web-deploy", appType = "web", environment = "production", branch = "main", commitMessage, version, buildTarget = "server" } = req.body;

  const validPipelines = ["web-deploy", "android-build", "full-deploy", "git-push", "hotfix", "git-android-build", "android-build-test"];
  if (!validPipelines.includes(pipeline)) {
    res.status(400).json({ error: `Invalid pipeline. Valid: ${validPipelines.join(", ")}` });
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

  const userId = getAuthUser(req)?.user_id;
  const deploymentId = await deploymentEngine.startDeployment({
    pipeline,
    appType: androidPipelines.includes(pipeline) ? "android" : appType,
    environment,
    branch: safeBranch,
    commitMessage: safeMessage,
    triggeredBy: userId,
    version: safeVersion,
    buildTarget: safeBuildTarget,
  });

  res.json({ id: deploymentId, message: "Deployment started" });
}));

router.post("/deploy", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { pipeline = "web-deploy", appType = "web", environment = "production", branch = "main", commitMessage, version, buildTarget = "server" } = req.body;

  const validPipelines = ["web-deploy", "android-build", "full-deploy", "git-push", "hotfix", "git-android-build", "android-build-test"];
  if (!validPipelines.includes(pipeline)) {
    res.status(400).json({ error: `Invalid pipeline. Valid: ${validPipelines.join(", ")}` });
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

  const userId = getAuthUser(req)?.user_id;
  const deploymentId = await deploymentEngine.startDeployment({
    pipeline,
    appType: androidPipelines.includes(pipeline) ? "android" : appType,
    environment,
    branch: safeBranch,
    commitMessage: safeMessage,
    triggeredBy: userId,
    version: safeVersion,
    buildTarget: safeBuildTarget,
  });

  res.json({ id: deploymentId, message: "Deployment started" });
}));

router.get("/list", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const deployments = await deploymentEngine.getDeployments(limit, offset);
  const total = await deploymentEngine.getDeploymentCount();
  res.json({ deployments, total, limit, offset });
}));

router.get("/history", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
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

router.get("/health", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const health = await deploymentEngine.checkServerHealth();
  res.json(health);
}));

router.post("/cleanup", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const result = await deploymentEngine.runCleanup();
  res.json(result);
}));

router.get("/status/:id", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const deployment = await deploymentEngine.getDeployment(req.params.id);
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }
  res.json(deployment);
}));

router.get("/:id/events", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const events = await deploymentEngine.getDeploymentEvents(req.params.id);
  res.json(events);
}));

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
  setTimeout(() => sendInitialState(), 1500);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

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
  const rollbackId = await deploymentEngine.rollbackDeployment(req.params.id);
  res.json({ id: rollbackId, message: "Rollback started" });
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

export default router;
export { publicRouter as deploymentPublicRouter };
