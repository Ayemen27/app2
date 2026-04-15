import { Router, Request, Response } from "express";
import { db } from "../db";
import { devices, crashes, metrics, notifications } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { FcmService } from "../services/FcmService";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/authz";

const monitoringRouter = Router();

monitoringRouter.use(requireAuth);
monitoringRouter.use(requireAdmin());

monitoringRouter.get("/dashboard-stats", async (_req: Request, res: Response) => {
  try {
    const [deviceCount] = await db.select({ count: sql<number>`count(*)` }).from(devices);
    const [crashCount] = await db.select({ count: sql<number>`count(*)` }).from(crashes);
    
    const recentCrashes = await db.select().from(crashes).orderBy(desc(crashes.timestamp)).limit(5);
    
    res.json({
      success: true,
      data: {
        activeDevices: Number(deviceCount?.count || 0),
        totalCrashes: Number(crashCount?.count || 0),
        crashRate: deviceCount?.count ? ((Number(crashCount?.count) / Number(deviceCount?.count)) * 100).toFixed(2) : 0,
        recentCrashes
      }
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

monitoringRouter.get("/devices", async (_req: Request, res: Response) => {
  try {
    const allDevices = await db.select().from(devices).orderBy(desc(devices.lastSeen));
    res.json({ success: true, data: allDevices });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

monitoringRouter.post("/alert", async (req: Request, res: Response) => {
  try {
    const { title, message, severity } = req.body as { title: string; message: string; severity: string };
    const priority = severity === 'critical' ? 5 : 3;
    
    const result = await FcmService.sendNotification({
      title: `[System Alert] ${title}`,
      message,
      type: 'system_alert',
      priority,
      targetPlatform: 'all',
      recipients: 'admins'
    });
    
    res.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

monitoringRouter.get("/metrics", async (_req: Request, res: Response) => {
  try {
    const [deviceCount] = await db.select({ count: sql<number>`count(*)` }).from(devices);
    const [crashCount] = await db.select({ count: sql<number>`count(*)` }).from(crashes);
    const [metricCount] = await db.select({ count: sql<number>`count(*)` }).from(metrics);
    const [notifCount] = await db.select({ count: sql<number>`count(*)` }).from(notifications);

    const recentCrashes = await db
      .select()
      .from(crashes)
      .orderBy(desc(crashes.timestamp))
      .limit(10);

    const deviceTotal = Number(deviceCount?.count || 0);
    const crashTotal = Number(crashCount?.count || 0);
    const crashRate = deviceTotal > 0
      ? ((crashTotal / deviceTotal) * 100).toFixed(2)
      : '0.00';

    res.json({
      success: true,
      data: {
        devices: { total: deviceTotal },
        crashes: { total: crashTotal, recent: recentCrashes.length, latest: recentCrashes },
        metrics: { total: Number(metricCount?.count || 0) },
        notifications: { total: Number(notifCount?.count || 0) },
        crashRate: parseFloat(crashRate),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

monitoringRouter.get("/notifications", async (_req: Request, res: Response) => {
  try {
    const recent = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const [total] = await db.select({ count: sql<number>`count(*)` }).from(notifications);
    const unread = recent.filter((n: any) => !n.isRead).length;

    res.json({
      success: true,
      data: {
        total: Number(total?.count || 0),
        unread,
        recent
      }
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export { monitoringRouter };
