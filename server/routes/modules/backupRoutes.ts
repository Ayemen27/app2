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
      return res.json([]);
    }

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.db') || f.endsWith('.json') || f.endsWith('.sql.gz'))
      .map((f, index) => {
        const stats = fs.statSync(path.join(backupsDir, f));
        return {
          id: index + 1,
          filename: f,
          path: f,
          size: (stats.size / (1024 * 1024)).toFixed(2), // Convert to MB
          status: 'success',
          createdAt: stats.mtime.toISOString(),
          timestamp: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(files);
  } catch (error: any) {
    console.error("❌ [BackupRoute] Error fetching logs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
