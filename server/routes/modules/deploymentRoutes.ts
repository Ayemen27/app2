import { Router, Request, Response } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { deploymentEngine } from "../../services/deployment-engine.js";
import { getAuthUser } from "../../internal/auth-user.js";
import { asyncHandler } from "../../lib/async-handler.js";

const router = Router();

deploymentEngine.recoverOrphanedDeployments().catch(err => {
  console.error("[DeploymentRoutes] Failed to recover orphaned deployments:", err);
});

function sanitizeShellArg(input: string): string {
  return input.replace(/[^\w\s\u0600-\u06FF.,!?@#$%^&*()\-=+\[\]{}|:;<>\/~`'"]/g, "").substring(0, 200);
}

router.use(requireAuth);

router.post("/start", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { pipeline = "web-deploy", appType = "web", environment = "production", branch = "main", commitMessage } = req.body;

  const validPipelines = ["web-deploy", "android-build", "full-deploy", "git-push", "hotfix"];
  if (!validPipelines.includes(pipeline)) {
    res.status(400).json({ error: `Invalid pipeline. Valid: ${validPipelines.join(", ")}` });
    return;
  }

  const validEnvs = ["production", "staging"];
  if (!validEnvs.includes(environment)) {
    res.status(400).json({ error: "Invalid environment" });
    return;
  }

  const safeBranch = typeof branch === "string" ? branch.replace(/[^a-zA-Z0-9_\-\/\.]/g, "").substring(0, 100) : "main";
  const safeMessage = typeof commitMessage === "string" ? sanitizeShellArg(commitMessage) : undefined;

  const userId = getAuthUser(req)?.user_id;
  const deploymentId = await deploymentEngine.startDeployment({
    pipeline,
    appType: pipeline === "android-build" || pipeline === "full-deploy" ? "android" : appType,
    environment,
    branch: safeBranch,
    commitMessage: safeMessage,
    triggeredBy: userId,
  });

  res.json({ id: deploymentId, message: "Deployment started" });
}));

router.post("/deploy", requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { pipeline = "web-deploy", appType = "web", environment = "production", branch = "main", commitMessage } = req.body;

  const validPipelines = ["web-deploy", "android-build", "full-deploy", "git-push", "hotfix"];
  if (!validPipelines.includes(pipeline)) {
    res.status(400).json({ error: `Invalid pipeline. Valid: ${validPipelines.join(", ")}` });
    return;
  }

  const safeBranch = typeof branch === "string" ? branch.replace(/[^a-zA-Z0-9_\-\/\.]/g, "").substring(0, 100) : "main";
  const safeMessage = typeof commitMessage === "string" ? sanitizeShellArg(commitMessage) : undefined;

  const userId = getAuthUser(req)?.user_id;
  const deploymentId = await deploymentEngine.startDeployment({
    pipeline,
    appType: pipeline === "android-build" || pipeline === "full-deploy" ? "android" : appType,
    environment,
    branch: safeBranch,
    commitMessage: safeMessage,
    triggeredBy: userId,
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

export default router;
