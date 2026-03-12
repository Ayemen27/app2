import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { deploymentEngine } from "../../services/deployment-engine.js";

const router = Router();

deploymentEngine.recoverOrphanedDeployments().catch(err => {
  console.error("[DeploymentRoutes] Failed to recover orphaned deployments:", err);
});

function sanitizeShellArg(input: string): string {
  return input.replace(/[^\w\s\u0600-\u06FF.,!?@#$%^&*()\-=+\[\]{}|:;<>\/~`'"]/g, "").substring(0, 200);
}

router.use(requireAuth as any);

router.post("/start", requireAdmin as any, async (req, res) => {
  try {
    const { pipeline = "web-deploy", appType = "web", environment = "production", branch = "main", commitMessage } = req.body;

    const validPipelines = ["web-deploy", "android-build", "full-deploy", "git-push", "hotfix"];
    if (!validPipelines.includes(pipeline)) {
      return res.status(400).json({ error: `Invalid pipeline. Valid: ${validPipelines.join(", ")}` });
    }

    const validEnvs = ["production", "staging"];
    if (!validEnvs.includes(environment)) {
      return res.status(400).json({ error: "Invalid environment" });
    }

    const safeBranch = typeof branch === "string" ? branch.replace(/[^a-zA-Z0-9_\-\/\.]/g, "").substring(0, 100) : "main";
    const safeMessage = typeof commitMessage === "string" ? sanitizeShellArg(commitMessage) : undefined;

    const userId = (req as any).user?.id;
    const deploymentId = await deploymentEngine.startDeployment({
      pipeline,
      appType: pipeline === "android-build" || pipeline === "full-deploy" ? "android" : appType,
      environment,
      branch: safeBranch,
      commitMessage: safeMessage,
      triggeredBy: userId,
    });

    res.json({ id: deploymentId, message: "Deployment started" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/deploy", requireAdmin as any, async (req, res) => {
  try {
    const { pipeline = "web-deploy", appType = "web", environment = "production", branch = "main", commitMessage } = req.body;

    const validPipelines = ["web-deploy", "android-build", "full-deploy", "git-push", "hotfix"];
    if (!validPipelines.includes(pipeline)) {
      return res.status(400).json({ error: `Invalid pipeline. Valid: ${validPipelines.join(", ")}` });
    }

    const safeBranch = typeof branch === "string" ? branch.replace(/[^a-zA-Z0-9_\-\/\.]/g, "").substring(0, 100) : "main";
    const safeMessage = typeof commitMessage === "string" ? sanitizeShellArg(commitMessage) : undefined;

    const userId = (req as any).user?.id;
    const deploymentId = await deploymentEngine.startDeployment({
      pipeline,
      appType: pipeline === "android-build" || pipeline === "full-deploy" ? "android" : appType,
      environment,
      branch: safeBranch,
      commitMessage: safeMessage,
      triggeredBy: userId,
    });

    res.json({ id: deploymentId, message: "Deployment started" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/list", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const deployments = await deploymentEngine.getDeployments(limit, offset);
    const total = await deploymentEngine.getDeploymentCount();
    res.json({ deployments, total, limit, offset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const deployments = await deploymentEngine.getDeployments(limit, offset);
    const total = await deploymentEngine.getDeploymentCount();
    res.json({ deployments, total, limit, offset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await deploymentEngine.getDeploymentStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/health", requireAdmin as any, async (req, res) => {
  try {
    const health = await deploymentEngine.checkServerHealth();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/cleanup", requireAdmin as any, async (req, res) => {
  try {
    const result = await deploymentEngine.runCleanup();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/status/:id", async (req, res) => {
  try {
    const deployment = await deploymentEngine.getDeployment(req.params.id);
    if (!deployment) return res.status(404).json({ error: "Deployment not found" });
    res.json(deployment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/events", async (req, res) => {
  try {
    const events = await deploymentEngine.getDeploymentEvents(req.params.id);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/stream", async (req, res) => {
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

router.post("/:id/cancel", requireAdmin as any, async (req, res) => {
  try {
    const deployment = await deploymentEngine.getDeployment(req.params.id);
    if (!deployment) return res.status(404).json({ error: "Deployment not found" });
    if (deployment.status !== "running") return res.status(400).json({ error: "Can only cancel running deployments" });

    await deploymentEngine.cancelDeployment(req.params.id);
    res.json({ message: "Deployment cancelled" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/rollback", requireAdmin as any, async (req, res) => {
  try {
    const rollbackId = await deploymentEngine.rollbackDeployment(req.params.id);
    res.json({ id: rollbackId, message: "Rollback started" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const deployment = await deploymentEngine.getDeployment(req.params.id);
    if (!deployment) return res.status(404).json({ error: "Deployment not found" });
    res.json(deployment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requireAdmin as any, async (req, res) => {
  try {
    await deploymentEngine.deleteDeployment(req.params.id);
    res.json({ success: true, message: "تم حذف العملية" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
