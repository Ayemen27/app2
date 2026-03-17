import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { idempotencyKeys } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';
import { getAuthUser } from '../internal/auth-user.js';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

const IDEMPOTENCY_HEADER = 'x-idempotency-key';
const KEY_TTL_HOURS = 24;
const PENDING_STATUS_CODE = -1;

function buildCompositeKey(key: string, userId: string, method: string, endpoint: string): string {
  const raw = `${userId}:${method}:${endpoint}:${key}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers[IDEMPOTENCY_HEADER] as string | undefined;

  if (!key || req.method === 'GET') {
    return next();
  }

  const authUser = getAuthUser(req);
  if (!authUser?.user_id) {
    return next();
  }

  const compositeKey = buildCompositeKey(key, authUser.user_id, req.method, req.originalUrl || req.path);

  handleIdempotency(compositeKey, req, res, next).catch(err => {
    console.error('[Idempotency] خطأ:', err);
    next();
  });
}

async function handleIdempotency(compositeKey: string, req: Request, res: Response, next: NextFunction) {
  const expiresAt = new Date(Date.now() + KEY_TTL_HOURS * 60 * 60 * 1000);

  try {
    const claimResult = await db.execute(sql`
      INSERT INTO idempotency_keys (key, endpoint, method, status_code, response_body, expires_at)
      VALUES (${compositeKey}, ${req.originalUrl || req.path}, ${req.method}, ${PENDING_STATUS_CODE}, null, ${expiresAt})
      ON CONFLICT (key) DO NOTHING
      RETURNING id
    `);

    const claimed = (claimResult as any).rows?.length > 0 || (claimResult as any).rowCount > 0;

    if (!claimed) {
      const existing = await db.select().from(idempotencyKeys).where(
        eq(idempotencyKeys.key, compositeKey)
      ).limit(1);

      if (existing.length > 0) {
        const record = existing[0];

        if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
          await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, compositeKey)).catch(() => {});
          return next();
        }

        if (record.statusCode === PENDING_STATUS_CODE) {
          res.status(409).json({
            success: false,
            message: 'طلب مطابق قيد المعالجة حالياً',
            code: 'IDEMPOTENCY_IN_PROGRESS',
          });
          return;
        }

        res.status(record.statusCode).json(record.responseBody);
        return;
      }

      return next();
    }
  } catch (err: any) {
    console.error('[Idempotency] فشل حجز المفتاح:', err);
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const statusCode = res.statusCode || 200;

    if (statusCode >= 200 && statusCode < 300) {
      db.update(idempotencyKeys)
        .set({ statusCode, responseBody: body })
        .where(eq(idempotencyKeys.key, compositeKey))
        .catch((err: any) => {
          console.error('[Idempotency] فشل تحديث المفتاح:', err);
        });
    } else {
      db.delete(idempotencyKeys)
        .where(eq(idempotencyKeys.key, compositeKey))
        .catch(() => {});
    }

    return originalJson(body);
  } as typeof res.json;

  next();
}

export async function cleanupExpiredKeys(): Promise<number> {
  const result = await db.delete(idempotencyKeys).where(lt(idempotencyKeys.expiresAt, new Date()));
  return (result as { rowCount?: number }).rowCount || 0;
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startIdempotencyCleanup(intervalMs: number = 3600000): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(async () => {
    try {
      const deleted = await cleanupExpiredKeys();
      if (deleted > 0) {
        console.log(`[Idempotency] تنظيف: حذف ${deleted} مفتاح منتهي الصلاحية`);
      }
    } catch (err) {
      console.error('[Idempotency] خطأ في التنظيف الدوري:', err);
    }
  }, intervalMs);
}

export function stopIdempotencyCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
