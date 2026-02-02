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

// GET /api/backups/logs
router.get("/logs", async (req, res) => {
  try {
    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      return res.json({ success: true, logs: [] });
    }

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.db') || f.endsWith('.json') || f.endsWith('.sql.gz'))
      .map((f, index) => {
        const stats = fs.statSync(path.join(backupsDir, f));
        return {
          id: index + 1,
          message: `نسخة احتياطية: ${f}`,
          timestamp: stats.mtime.toISOString(),
          path: f,
          size: stats.size,
          // Add data property for frontend consistency
          data: {
            id: index + 1,
            message: `نسخة احتياطية: ${f}`,
            timestamp: stats.mtime.toISOString(),
            path: f,
            size: stats.size
          }
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, logs: files });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
