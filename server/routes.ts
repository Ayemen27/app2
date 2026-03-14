import type { Express } from "express";
import { TelegramService } from "./services/TelegramService";
import { GoogleDriveService } from "./services/GoogleDriveService";

export async function registerRoutes(app: Express): Promise<void> {
  TelegramService.initialize();
  GoogleDriveService.initialize();
}
