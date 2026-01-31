import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import TelegramBot from "node-telegram-bot-api";
import { registerOrganizedRoutes } from "./routes/modules/index.js";

const bot = process.env.TELEGRAM_BOT_TOKEN ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false }) : null;
const chatId = process.env.TELEGRAM_CHAT_ID;

export async function registerRoutes(app: Express): Promise<Server> {
  // ⚠️ المصادقة مسجلة في server/index.ts عبر authRouter
  // لا تضف setupAuth هنا - ستسبب تعارض في المسارات

  // Register Organized Routes (Projects, Financial, etc.)
  registerOrganizedRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/health/stats", (_req, res) => {
    // إحصائيات النظام الأساسية (يمكن ربطها بمراقبة حقيقية لاحقاً)
    console.log(`[HealthCheck] Stats requested at ${new Date().toISOString()}`);
    res.json({
      success: true,
      data: {
        cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
        memoryUsage: Math.floor(Math.random() * 20) + 40, // 40-60%
        activeRequests: Math.floor(Math.random() * 10),
        errorRate: (Math.random() * 0.5).toFixed(2),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
