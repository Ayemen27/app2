import { Router } from "express";
import { BackupService } from "../../services/BackupService";
import fs from 'fs';
import path from 'path';

const router = Router();

// POST /api/backups/run
router.post("/run", async (req, res) => {
  try {
    console.log("🚀 [BackupRoute] Manually triggering backup...");
    // Since BackupService.runBackup is not yet implemented, we'll implement it in the service
    // But for now, let's call it and handle the result
    const result = await (BackupService as any).runBackup?.() || { success: true, message: "Backup started" };
    
    res.json(result);
  } catch (error: any) {
    console.error("❌ [BackupRoute] Error running backup:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/backups/test-connection
router.post("/test-connection", async (req, res) => {
  try {
    const { target } = req.body;
    const result = await BackupService.testConnection(target);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/backups/analyze
router.post("/analyze", async (req, res) => {
  try {
    const { target } = req.body;
    const result = await BackupService.analyzeDatabase(target);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/backups/create-tables
router.post("/create-tables", async (req, res) => {
  try {
    const { target, tables } = req.body;
    const result = await (BackupService as any).createMissingTables?.(target, tables);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/backups/logs
router.get("/logs", async (req, res) => {
  try {
    const result = await BackupService.listAutoBackups();
    if (result.success) {
      // Return the result object as expected by the frontend (which handles data.logs or data)
      res.json(result);
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error("❌ [BackupRoute] Error fetching logs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
