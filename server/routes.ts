import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerOrganizedRoutes } from "./routes/modules/index.js";
import { TelegramService } from "./services/TelegramService";
import { GoogleDriveService } from "./services/GoogleDriveService";

export async function registerRoutes(app: Express): Promise<Server> {
  registerOrganizedRoutes(app);

  TelegramService.initialize();
  GoogleDriveService.initialize();

  const { BackupService } = await import('./services/BackupService');
  BackupService.startAutoBackupScheduler();

  const httpServer = createServer(app);
  return httpServer;
}
