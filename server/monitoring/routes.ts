import { db } from "../db";
import { devices, crashes, metrics, notifications } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { FcmService } from "../services/FcmService";

export const monitoringRouter = async (app: any) => {
  app.get("/api/monitoring/dashboard-stats", async (_req: any, res: any) => {
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
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/monitoring/devices", async (_req: any, res: any) => {
    try {
      const allDevices = await db.select().from(devices).orderBy(desc(devices.lastSeen));
      res.json({ success: true, data: allDevices });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/monitoring/alert", async (req: any, res: any) => {
    try {
      const { title, message, severity } = req.body;
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
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
};
