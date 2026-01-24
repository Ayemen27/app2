import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import TelegramBot from "node-telegram-bot-api";
import { setupAuth } from "./auth/index";

const bot = process.env.TELEGRAM_BOT_TOKEN ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false }) : null;
const chatId = process.env.TELEGRAM_CHAT_ID;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Authentication First
  setupAuth(app);

  app.get("/api/incidents", async (_req, res) => {
    const incidents = await storage.getIncidents();
    res.json(incidents);
  });

  app.get("/api/metrics/summary", async (_req, res) => {
    const metrics = await storage.getMetricsSummary();
    res.json(metrics);
  });

  app.post("/api/incidents", async (req, res) => {
    try {
      const incident = await storage.createIncident(req.body);
      
      // Telegram Alert
      if (bot && chatId) {
        const message = `
🚨 *New Incident Detected*
*ID:* #${incident.id}
*Issue:* ${incident.title}
*Severity:* ${incident.severity.toUpperCase()}
*App Version:* ${incident.appVersion}
*Responsible:* ${req.body.responsible || "System Auto-detect"}
*Reason:* ${req.body.reason || "Under Investigation"}
*Plan/Price:* ${req.body.impactPrice || "N/A"}
        `;
        bot.sendMessage(chatId, message, { parse_mode: "Markdown" }).catch(err => console.error("Telegram Bot Error:", err));
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
