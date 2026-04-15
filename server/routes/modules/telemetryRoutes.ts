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

telemetryRouter.post("/v1/traces", async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const traceCount = Array.isArray(payload?.resourceSpans) ? payload.resourceSpans.length : 0;
    console.log(`[OTLP] استقبال ${traceCount} resource span(s)`);
    res.status(202).json({ success: true, message: "تم استقبال traces بنجاح", received: traceCount });
  } catch (e: unknown) {
    res.status(400).json({ success: false, error: getErrorMessage(e) });
  }
});

telemetryRouter.get("/metrics", requireAuth, requireAdmin(), async (_req: Request, res: Response) => {
  try {
    const devicesList = await storage.getDevices();
    const recentCrashes = await storage.getRecentCrashes(100);
    const deviceCount = devicesList.length;
    const crashCount = recentCrashes.length;

    const platformStats = devicesList.reduce((acc: Record<string, number>, d: any) => {
      const p = d.platform || 'unknown';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    const now = Date.now();
    const last24h = recentCrashes.filter((c: any) => {
      const ts = new Date(c.timestamp).getTime();
      return now - ts < 86400000;
    }).length;

    res.json({
      success: true,
      data: {
        devices: { total: deviceCount, byPlatform: platformStats },
        crashes: { total: crashCount, last24h },
        crashRate: deviceCount > 0 ? ((crashCount / deviceCount) * 100).toFixed(2) : '0.00',
        generatedAt: new Date().toISOString()
      }
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: getErrorMessage(e) });
  }
});

export default telemetryRouter;
