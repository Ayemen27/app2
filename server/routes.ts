import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import TelegramBot from "node-telegram-bot-api";
import { registerOrganizedRoutes } from "./routes/modules/index.js";
import path from "path";
import fs from "fs";

const bot = process.env.TELEGRAM_BOT_TOKEN ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false }) : null;
const chatId = process.env.TELEGRAM_CHAT_ID;

export async function registerRoutes(app: Express): Promise<Server> {
  // ⚠️ المصادقة مسجلة في server/index.ts عبر authRouter
  // لا تضف setupAuth هنا - ستسبب تعارض في المسارات

  // Register Organized Routes (Projects, Financial, etc.)
  registerOrganizedRoutes(app);

  // تشغيل جدولة النسخ الاحتياطي التلقائي
  const { BackupService } = await import('./services/BackupService');
  BackupService.startAutoBackupScheduler();

  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      version: "1.0.0-global-standard"
    });
  });

  app.get("/api/health/stats", async (_req, res) => {
    try {
      const { BackupService } = await import('./services/BackupService');
      const backupStatus = BackupService.getAutoBackupStatus();
      
      res.json({
        success: true,
        data: {
          cpuUsage: parseFloat((process.cpuUsage().user / 1000000).toFixed(1)),
          memoryUsage: parseFloat((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100).toFixed(1)),
          activeRequests: 0,
          errorRate: "0.00",
          uptime: process.uptime(),
          dbStatus: "connected",
          backupStatus,
          timestamp: new Date().toISOString(),
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
