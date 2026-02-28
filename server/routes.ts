import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerOrganizedRoutes, checkForUnregisteredRouters } from "./routes/modules/index.js";
import { TelegramService } from "./services/TelegramService";
import { GoogleDriveService } from "./services/GoogleDriveService";
import { insertCrashSchema, insertMetricSchema, insertDeviceSchema } from "@shared/schema";

import { FcmService } from "./services/FcmService";
import { monitoringRouter } from "./monitoring/routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // FCM Initialization
  await FcmService.initialize();

  // Initialize Monitoring Routes
  await monitoringRouter(app).catch(err => {
    console.error("Failed to initialize monitoring router:", err);
  });

  // Monitoring Routes
  app.post("/api/devices", async (req, res) => {
    try {
      const data = insertDeviceSchema.parse(req.body);
      const device = await storage.upsertDevice(data);
      res.json(device);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/crashes", async (req, res) => {
    try {
      const data = insertCrashSchema.parse(req.body);
      const crash = await storage.createCrash(data);
      res.status(201).json(crash);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/metrics", async (req, res) => {
    try {
      const data = insertMetricSchema.parse(req.body);
      const metric = await storage.createMetric(data);
      res.status(201).json(metric);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/notifications/monitoring/stats", async (_req, res) => {
    try {
      const devices = await storage.getDevices ? await storage.getDevices() : [];
      const recentCrashes = await storage.getRecentCrashes ? await storage.getRecentCrashes(10) : [];
      
      // جلب إحصائيات الإشعارات الفعلية
      const notifications = await storage.getAdminNotifications ? await storage.getAdminNotifications() : [];
      
      res.json({
        total: notifications.length || 0,
        unread: notifications.filter((n: any) => !n.read).length || 0,
        critical: notifications.filter((n: any) => n.priority === 1 || n.priority === 'critical').length || 0,
        deviceCount: devices.length || 0,
        recentCrashes: recentCrashes || [],
        userStats: [], 
        typeStats: {
          safety: notifications.filter((n: any) => n.type === 'safety').length || 0
        }
      });
    } catch (e: any) {
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

  app.get("/api/monitoring/crashes", async (req, res) => {
    try {
      const recentCrashes = await storage.getRecentCrashes(50);
      res.json({
        success: true,
        data: recentCrashes
      });
    } catch (e: any) {
      console.error("[API Error] /api/monitoring/crashes:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });

  app.get("/api/monitoring/stats", async (req, res) => {
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
    } catch (e: any) {
      console.error("[API Error] /api/monitoring/stats:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });

  // Proxy for OpenTelemetry traces from mobile/frontend
  app.post("/api/v1/traces", async (req, res) => {
    // تم تعطيل الوكيل مؤقتاً لتجنب أخطاء الاتصال بـ localhost غير الموجود
    res.status(202).json({ status: "disabled", message: "OTLP proxy is currently disabled" });
  });

  app.post("/api/notifications/announcement", async (req, res) => {
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
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  registerOrganizedRoutes(app);

  checkForUnregisteredRouters().catch(() => {});

  TelegramService.initialize();
  GoogleDriveService.initialize();

  const { BackupService } = await import('./services/BackupService');
  BackupService.startAutoBackupScheduler();

  const httpServer = createServer(app);
  return httpServer;
}
