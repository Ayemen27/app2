import express from 'express';
import { Request, Response } from 'express';
import { storage } from '../../storage.js';
import { insertDeviceSchema, insertCrashSchema, insertMetricSchema } from '@shared/schema';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authz';

export const telemetryRouter = express.Router();

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

telemetryRouter.post("/devices", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertDeviceSchema.parse(req.body);
    const device = await storage.upsertDevice(data);
    res.json(device);
  } catch (e: unknown) {
    res.status(400).json({ error: getErrorMessage(e) });
  }
});

telemetryRouter.post("/crashes", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertCrashSchema.parse(req.body);
    const crash = await storage.createCrash(data);
    res.status(201).json(crash);
  } catch (e: unknown) {
    res.status(400).json({ error: getErrorMessage(e) });
  }
});

telemetryRouter.post("/metrics", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertMetricSchema.parse(req.body);
    const metric = await storage.createMetric(data);
    res.status(201).json(metric);
  } catch (e: unknown) {
    res.status(400).json({ error: getErrorMessage(e) });
  }
});

telemetryRouter.get("/monitoring/crashes", requireAuth, requireAdmin(), async (_req: Request, res: Response) => {
  try {
    const recentCrashes = await storage.getRecentCrashes(50);
    res.json({
      success: true,
      data: recentCrashes
    });
  } catch (e: unknown) {
    console.error("[API Error] /api/monitoring/crashes:", e);
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

telemetryRouter.get("/monitoring/stats", requireAuth, requireAdmin(), async (_req: Request, res: Response) => {
  try {
    const devicesList = await storage.getDevices();
    const deviceCount = devicesList.length;
    const recentCrashes = await storage.getRecentCrashes(50);
    const crashCount = recentCrashes.length;
    const divisor = deviceCount || 1;
    const crashRate = ((crashCount / divisor) * 100).toFixed(2);

    res.json({
      success: true,
      data: {
        activeDevices: deviceCount,
        crashRate: parseFloat(crashRate),
        recentCrashes
      }
    });
  } catch (e: unknown) {
    console.error("[API Error] /api/monitoring/stats:", e);
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

telemetryRouter.post("/v1/traces", async (_req: Request, res: Response) => {
  res.status(202).json({ status: "disabled", message: "OTLP proxy is currently disabled" });
});

export default telemetryRouter;
