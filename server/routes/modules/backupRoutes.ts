import { Router, Request, Response } from "express";
import { BackupService } from "../../services/BackupService";
import { authenticate, requireAdmin, sensitiveOperationsRateLimit } from "../../middleware/auth";
import { getAuthUser } from "../../internal/auth-user.js";
import { asyncHandler } from "../../lib/async-handler.js";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.post("/run", sensitiveOperationsRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const triggeredBy = getAuthUser(req)?.user_id || 'unknown';
  console.log(`🚀 [Backup] نسخ يدوي بواسطة: ${triggeredBy}`);
  const result = await BackupService.runBackup(triggeredBy);
  res.json(result);
}));

router.post("/restore", sensitiveOperationsRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { fileName, target } = req.body;
  if (!fileName) {
    res.status(400).json({ success: false, message: "اسم الملف مطلوب" });
    return;
  }

  const user = getAuthUser(req);
  console.log(`🔄 [Backup] استعادة بواسطة: ${user?.user_id || 'unknown'} | ملف: ${fileName} | هدف: ${target || 'local'}`);

  const result = await BackupService.restoreBackup(fileName, target || 'local');
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
}));

router.get("/download/:filename", sensitiveOperationsRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = BackupService.getBackupFilePath(filename);
  
  if (!filePath) {
    res.status(404).json({ success: false, message: "الملف غير موجود" });
    return;
  }

  const contentType = filename.endsWith('.gz') ? 'application/gzip' : 'application/json';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  const fs = await import('fs');
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}));

router.delete("/:filename", sensitiveOperationsRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  const user = getAuthUser(req);
  console.log(`🗑️ [Backup] حذف بواسطة: ${user?.user_id || 'unknown'} | ملف: ${filename}`);
  
  const result = await BackupService.deleteBackup(filename);
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
}));

router.post("/test-connection", sensitiveOperationsRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { target } = req.body;
  const result = await BackupService.testConnection(target);
  res.json(result);
}));

router.post("/analyze", sensitiveOperationsRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { target } = req.body;
  const result = await BackupService.analyzeDatabase(target || 'local');
  res.json(result);
}));

router.get("/databases", asyncHandler(async (_req: Request, res: Response) => {
  const dbs = await BackupService.getAvailableDatabases();
  const safeDbs = dbs.map(db => ({ id: db.id, name: db.name }));
  res.json({ success: true, data: safeDbs });
}));

router.get("/logs", sensitiveOperationsRateLimit, asyncHandler(async (_req: Request, res: Response) => {
  const result = await BackupService.listBackups();
  if (!result.success) {
    res.status(500).json({ success: false, data: [], message: result.message || 'فشل جلب السجلات' });
    return;
  }
  res.json({ success: true, data: result.logs || [], total: result.total || 0 });
}));

router.get("/status", sensitiveOperationsRateLimit, asyncHandler(async (_req: Request, res: Response) => {
  const status = BackupService.getAutoBackupStatus();
  const storage = await BackupService.getStorageInfo();
  res.json({ success: true, data: { ...status, storage: storage.success ? storage : null } });
}));

export default router;
