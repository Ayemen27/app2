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

  const httpServer = createServer(app);
  return httpServer;
}
