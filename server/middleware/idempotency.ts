import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { idempotencyKeys } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';

const IDEMPOTENCY_HEADER = 'x-idempotency-key';
const KEY_TTL_HOURS = 24;

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers[IDEMPOTENCY_HEADER] as string | undefined;

  if (!key || req.method === 'GET') {
    return next();
  }

  handleIdempotency(key, req, res, next).catch(err => {
    console.error('[Idempotency] خطأ:', err);
    next();
  });
}

async function handleIdempotency(key: string, req: Request, res: Response, next: NextFunction) {
  const existing = await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key)).limit(1);

  if (existing.length > 0) {
    const record = existing[0];
    res.status(record.statusCode).json(record.responseBody);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const statusCode = res.statusCode || 200;

    if (statusCode >= 200 && statusCode < 300) {
      const expiresAt = new Date(Date.now() + KEY_TTL_HOURS * 60 * 60 * 1000);
      db.insert(idempotencyKeys).values({
        key,
        endpoint: req.originalUrl || req.path,
        method: req.method,
        statusCode,
        responseBody: body,
        expiresAt,
      }).catch(err => {
        if (!String(err).includes('duplicate key')) {
          console.error('[Idempotency] فشل حفظ المفتاح:', err);
        }
      });
    }

    return originalJson(body);
  } as any;

  next();
}

export async function cleanupExpiredKeys(): Promise<number> {
  const result = await db.delete(idempotencyKeys).where(lt(idempotencyKeys.expiresAt, new Date()));
  return (result as any).rowCount || 0;
}
