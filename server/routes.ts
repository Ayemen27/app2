import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { TelegramService } from "./services/TelegramService";
import { GoogleDriveService } from "./services/GoogleDriveService";
import { insertCrashSchema, insertMetricSchema, insertDeviceSchema } from "@shared/schema";

import { FcmService } from "./services/FcmService";
import { monitoringRouter } from "./monitoring/routes";
import { requireAuth } from "./middleware/auth";
import { requireAdmin } from "./middleware/authz";

interface NotificationRecord {
  read?: boolean;
  priority?: number | string | null;
  type?: string;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/monitoring", monitoringRouter);

  app.post("/api/devices", requireAuth, async (req, res) => {
    try {
      const data = insertDeviceSchema.parse(req.body);
      const device = await storage.upsertDevice(data);
      res.json(device);
    } catch (e: unknown) {
      res.status(400).json({ error: getErrorMessage(e) });
    }
  });

  app.post("/api/crashes", requireAuth, async (req, res) => {
    try {
      const data = insertCrashSchema.parse(req.body);
      const crash = await storage.createCrash(data);
      res.status(201).json(crash);
    } catch (e: unknown) {
      res.status(400).json({ error: getErrorMessage(e) });
    }
  });

  app.post("/api/metrics", requireAuth, async (req, res) => {
    try {
      const data = insertMetricSchema.parse(req.body);
      const metric = await storage.createMetric(data);
      res.status(201).json(metric);
    } catch (e: unknown) {
      res.status(400).json({ error: getErrorMessage(e) });
    }
  });

  app.get("/api/notifications/monitoring/stats", requireAuth, requireAdmin(), async (_req, res) => {
    try {
      const devices = await storage.getDevices ? await storage.getDevices() : [];
      const recentCrashes = await storage.getRecentCrashes ? await storage.getRecentCrashes(10) : [];
      
      const notifications: NotificationRecord[] = await storage.getAdminNotifications ? await storage.getAdminNotifications() : [];
      
      res.json({
        total: notifications.length || 0,
        unread: notifications.filter((n) => !n.read).length || 0,
        critical: notifications.filter((n) => n.priority === 1 || n.priority === 'critical').length || 0,
        deviceCount: devices.length || 0,
        recentCrashes: recentCrashes || [],
        userStats: [], 
        typeStats: {
          safety: notifications.filter((n) => n.type === 'safety').length || 0
        }
      });
    } catch (e: unknown) {
      console.error("[API Error] /api/notifications/monitoring/stats:", e);
      res.json({
        total: 0,
        unread: 0,
        critical: 0,
        deviceCount: 0,
        recentCrashes: [],
        userStats: [],
        typeStats: { safety: 0 }
      });
    }
  });

  app.get("/api/monitoring/crashes", requireAuth, requireAdmin(), async (_req, res) => {
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

  app.get("/api/monitoring/stats", requireAuth, requireAdmin(), async (_req, res) => {
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

  app.post("/api/v1/traces", async (_req, res) => {
    res.status(202).json({ status: "disabled", message: "OTLP proxy is currently disabled" });
  });

  app.post("/api/notifications/announcement", requireAuth, requireAdmin(), async (req, res) => {
    try {
      const { title, body, priority, targetPlatform, recipients } = req.body;
      const result = await FcmService.sendNotification({
        title,
        message: body,
        type: 'announcement',
        priority,
        targetPlatform,
        recipients
      });
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: getErrorMessage(e) });
    }
  });

  TelegramService.initialize();
  GoogleDriveService.initialize();

  const httpServer = createServer(app);
  return httpServer;
}
