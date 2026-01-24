import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/incidents", async (_req, res) => {
    const incidents = await storage.getIncidents();
    res.json(incidents);
  });

  app.get("/api/metrics/summary", async (_req, res) => {
    const metrics = await storage.getMetricsSummary();
    res.json(metrics);
  });

  const httpServer = createServer(app);
  return httpServer;
}
