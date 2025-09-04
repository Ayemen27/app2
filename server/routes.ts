import type { Express } from "express";
import type { Server } from "http";
import { createServer } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Basic API routes for construction project management
  app.get("/api/projects", (req, res) => {
    res.json({ success: true, data: [], message: "Projects endpoint working" });
  });

  app.get("/api/workers", (req, res) => {
    res.json({ success: true, data: [], message: "Workers endpoint working" });
  });

  app.get("/api/daily-expenses", (req, res) => {
    res.json({ success: true, data: [], message: "Daily expenses endpoint working" });
  });

  app.get("/api/material-purchases", (req, res) => {
    res.json({ success: true, data: [], message: "Material purchases endpoint working" });
  });

  // Temporary placeholder for projects with stats
  app.get("/api/projects/with-stats", (req, res) => {
    res.json({ 
      success: true, 
      data: [
        {
          id: 1,
          name: "مشروع تجريبي",
          status: "active",
          description: "مشروع لاختبار النظام",
          stats: {
            totalWorkers: "0",
            totalExpenses: 0,
            totalIncome: 0,
            currentBalance: 0,
            activeWorkers: "0",
            completedDays: "0",
            materialPurchases: "0",
            lastActivity: new Date().toISOString()
          }
        }
      ], 
      message: "Projects with stats loaded successfully" 
    });
  });

  const server = createServer(app);
  return server;
}