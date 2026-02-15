import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

interface TempFile {
  data: Buffer;
  fileName: string;
  mimeType: string;
  createdAt: number;
  userId: string;
}

const tempFiles = new Map<string, TempFile>();

const CLEANUP_INTERVAL = 60_000;
const FILE_TTL = 5 * 60_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_TOTAL_FILES = 50;
const MAX_FILES_PER_USER = 5;

setInterval(() => {
  const now = Date.now();
  for (const [id, file] of tempFiles) {
    if (now - file.createdAt > FILE_TTL) {
      tempFiles.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

router.post('/temp-download', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { base64Data, fileName, mimeType } = req.body;

    if (!base64Data || !fileName || !mimeType) {
      return res.status(400).json({ error: 'Missing required fields: base64Data, fileName, mimeType' });
    }

    if (tempFiles.size >= MAX_TOTAL_FILES) {
      const now = Date.now();
      let oldest: { key: string; time: number } | null = null;
      for (const [key, file] of tempFiles) {
        if (!oldest || file.createdAt < oldest.time) {
          oldest = { key, time: file.createdAt };
        }
      }
      if (oldest) tempFiles.delete(oldest.key);
    }

    let userFileCount = 0;
    for (const file of tempFiles.values()) {
      if (file.userId === userId) userFileCount++;
    }
    if (userFileCount >= MAX_FILES_PER_USER) {
      let oldestUserFile: { key: string; time: number } | null = null;
      for (const [key, file] of tempFiles) {
        if (file.userId === userId && (!oldestUserFile || file.createdAt < oldestUserFile.time)) {
          oldestUserFile = { key, time: file.createdAt };
        }
      }
      if (oldestUserFile) tempFiles.delete(oldestUserFile.key);
    }

    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File too large' });
    }

    const id = crypto.randomUUID();

    tempFiles.set(id, {
      data: buffer,
      fileName,
      mimeType,
      createdAt: Date.now(),
      userId,
    });

    console.log(`[TempDownload] Stored file: ${fileName} (${buffer.length} bytes) id=${id} user=${userId}`);

    return res.json({ success: true, downloadUrl: `/api/temp-download/${id}` });
  } catch (error) {
    console.error('[TempDownload] Error storing file:', error);
    return res.status(500).json({ error: 'Failed to store file' });
  }
});

router.get('/temp-download/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const file = tempFiles.get(id);

  if (!file) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  const accessCount = (file as any)._accessCount || 0;
  (file as any)._accessCount = accessCount + 1;
  if (accessCount >= 2) {
    tempFiles.delete(id);
  }

  const safeFileName = file.fileName.replace(/[^\w\u0600-\u06FF._-]/g, '_');

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.setHeader('Content-Length', file.data.length.toString());
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  return res.send(file.data);
});

export default router;
