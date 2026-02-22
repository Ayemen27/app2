import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerOrganizedRoutes, checkForUnregisteredRouters } from "./routes/modules/index.js";
import { TelegramService } from "./services/TelegramService";
import { GoogleDriveService } from "./services/GoogleDriveService";
import { insertCrashSchema, insertMetricSchema, insertDeviceSchema } from "@shared/schema";

import { FcmService } from "./services/FcmService";

export async function registerRoutes(app: Express): Promise<Server> {
  // FCM Initialization
  FcmService.initialize();

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

  app.get("/api/monitoring/stats", async (_req, res) => {
    try {
      const devices = await storage.getDevices();
      const recentCrashes = await storage.getRecentCrashes(10);
      res.json({
        deviceCount: devices.length,
        recentCrashes
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
