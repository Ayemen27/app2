import { Router, Request, Response } from "express";
import { BackupService } from "../../services/BackupService";
import { authenticate, requireAdmin, sensitiveOperationsRateLimit } from "../../middleware/auth";
import type { AuthenticatedRequest } from "../../middleware/auth";
import path from 'path';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.post("/run", sensitiveOperationsRateLimit, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const triggeredBy = authReq.user?.user_id || 'unknown';
    console.log(`🚀 [Backup] نسخ يدوي بواسطة: ${triggeredBy}`);
    const result = await BackupService.runBackup(triggeredBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/restore", sensitiveOperationsRateLimit, async (req: Request, res: Response) => {
  try {
    const { fileName, target } = req.body;
    if (!fileName) return res.status(400).json({ success: false, message: "اسم الملف مطلوب" });

    const authReq = req as AuthenticatedRequest;
    console.log(`🔄 [Backup] استعادة بواسطة: ${authReq.user?.user_id || 'unknown'} | ملف: ${fileName} | هدف: ${target || 'local'}`);

    const result = await BackupService.restoreBackup(fileName, target || 'local');
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/download/:filename", async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = BackupService.getBackupFilePath(filename);
    
    if (!filePath) {
      return res.status(404).json({ success: false, message: "الملف غير موجود" });
    }

    const contentType = filename.endsWith('.gz') ? 'application/gzip' : 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fs = await import('fs');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:filename", sensitiveOperationsRateLimit, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const authReq = req as AuthenticatedRequest;
    console.log(`🗑️ [Backup] حذف بواسطة: ${authReq.user?.user_id || 'unknown'} | ملف: ${filename}`);
    
    const result = await BackupService.deleteBackup(filename);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/test-connection", async (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    const result = await BackupService.testConnection(target);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    const result = await BackupService.analyzeDatabase(target || 'local');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/databases", async (_req: Request, res: Response) => {
  try {
    const dbs = await BackupService.getAvailableDatabases();
    const safeDbs = dbs.map(db => ({ id: db.id, name: db.name }));
    res.json({ success: true, data: safeDbs });
  } catch (error: any) {
    res.status(500).json({ success: false, data: [], message: error.message });
  }
});

router.get("/logs", async (_req: Request, res: Response) => {
  try {
    const result = await BackupService.listBackups();
    if (!result.success) {
      return res.status(500).json({ success: false, data: [], message: result.message || 'فشل جلب السجلات' });
    }
    res.json({ success: true, data: result.logs || [], total: result.total || 0 });
  } catch (error: any) {
    res.status(500).json({ success: false, data: [], message: error.message });
  }
});

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const status = BackupService.getAutoBackupStatus();
    const storage = await BackupService.getStorageInfo();
    res.json({ success: true, data: { ...status, storage: storage.success ? storage : null } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
