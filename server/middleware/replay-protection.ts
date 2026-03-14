import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { authRequestNonces } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';

const NONCE_HEADER = 'x-request-nonce';
const TIMESTAMP_HEADER = 'x-request-timestamp';

export function requireFreshRequest({ windowSec = 60 }: { windowSec?: number } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const nonce = req.headers[NONCE_HEADER] as string | undefined;
    const timestampStr = req.headers[TIMESTAMP_HEADER] as string | undefined;

    if (!nonce || !timestampStr) {
      return res.status(400).json({
        success: false,
        message: 'Missing replay protection headers (x-request-nonce, x-request-timestamp)',
        code: 'REPLAY_HEADERS_MISSING',
      });
    }

    const requestTimestamp = new Date(timestampStr);
    if (isNaN(requestTimestamp.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request timestamp format',
        code: 'INVALID_TIMESTAMP',
      });
    }

    const now = Date.now();
    const age = Math.abs(now - requestTimestamp.getTime()) / 1000;

    if (age > windowSec) {
      return res.status(400).json({
        success: false,
        message: `Request timestamp is stale (${Math.round(age)}s old, max ${windowSec}s)`,
        code: 'STALE_REQUEST',
      });
    }

    try {
      const existing = await db
        .select({ id: authRequestNonces.id })
        .from(authRequestNonces)
        .where(eq(authRequestNonces.nonce, nonce))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate request detected (nonce already used)',
          code: 'DUPLICATE_NONCE',
        });
      }

      const userId = (req as any).user?.user_id || null;
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const expiresAt = new Date(now + windowSec * 2 * 1000);

      await db.insert(authRequestNonces).values({
        nonce,
        user_id: userId,
        endpoint: req.originalUrl || req.path,
        method: req.method,
        ipAddress: ip,
        requestTimestamp,
        expiresAt,
      });

      next();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate request detected (nonce already used)',
          code: 'DUPLICATE_NONCE',
        });
      }
      console.error('[ReplayProtection] Error:', msg);
      return res.status(503).json({
        success: false,
        message: 'Replay protection service temporarily unavailable',
        code: 'REPLAY_SERVICE_ERROR',
      });
    }
  };
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startNonceCleanup(intervalMs = 10 * 60 * 1000) {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(async () => {
    try {
      await db.delete(authRequestNonces).where(lt(authRequestNonces.expiresAt, new Date()));
    } catch (err) {
      console.error('[ReplayProtection] Cleanup error:', err);
    }
  }, intervalMs);
}
