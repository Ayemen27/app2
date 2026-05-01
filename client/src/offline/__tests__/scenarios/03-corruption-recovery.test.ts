/**
 * 🧪 السيناريو 3: استرداد من corruption.
 * يختبر منطق تصنيف الأخطاء (retryable vs non-retryable) و backoff.
 */
import { describe, it, expect } from 'vitest';

const NON_RETRYABLE: number[] = [400, 401, 403, 404, 422];

function isRetryableError(statusCode: number): boolean {
  if (statusCode === 409) return false;
  return !NON_RETRYABLE.includes(statusCode);
}

function calculateBackoffDelay(retryCount: number): number {
  const base = 500;
  const max = 60000;
  const exp = base * Math.pow(2, retryCount);
  return Math.max(0, Math.round(Math.min(exp, max)));
}

function extractStatusCode(err: any): number {
  if (err?.status) return err.status;
  const msg = err?.message || String(err);
  const m = msg.match(/status:\s*(\d{3})/i);
  if (m) return parseInt(m[1], 10);
  if (msg.includes('duplicate') || msg.includes('already exists')) return 409;
  return 0;
}

describe('Scenario 3: استرداد من corruption أثناء sync', () => {
  it('400 validation → غير قابل لإعادة المحاولة → DLQ', () => {
    expect(isRetryableError(400)).toBe(false);
    expect(isRetryableError(422)).toBe(false);
  });

  it('500/503 server error → قابل لإعادة المحاولة', () => {
    expect(isRetryableError(500)).toBe(true);
    expect(isRetryableError(503)).toBe(true);
    expect(isRetryableError(504)).toBe(true);
  });

  it('409 duplicate → غير قابل لإعادة المحاولة (يُحلّ كـ idempotent)', () => {
    expect(isRetryableError(409)).toBe(false);
  });

  it('401/403 auth → غير قابل لإعادة المحاولة (يوقف المزامنة)', () => {
    expect(isRetryableError(401)).toBe(false);
    expect(isRetryableError(403)).toBe(false);
  });

  it('404 missing → غير قابل لإعادة المحاولة', () => {
    expect(isRetryableError(404)).toBe(false);
  });

  it('extractStatusCode يستخرج من نص الخطأ', () => {
    expect(extractStatusCode(new Error('status: 400 - validation'))).toBe(400);
    expect(extractStatusCode(new Error('status: 503 unavailable'))).toBe(503);
    expect(extractStatusCode({ status: 401 })).toBe(401);
    expect(extractStatusCode(new Error('duplicate key'))).toBe(409);
    expect(extractStatusCode(new Error('unknown'))).toBe(0);
  });

  it('backoff exponential: 1s → 2s → 4s → ... محدود بـ 60s', () => {
    expect(calculateBackoffDelay(0)).toBe(500);
    expect(calculateBackoffDelay(1)).toBe(1000);
    expect(calculateBackoffDelay(2)).toBe(2000);
    expect(calculateBackoffDelay(3)).toBe(4000);
    expect(calculateBackoffDelay(10)).toBe(60_000);
    expect(calculateBackoffDelay(20)).toBe(60_000);
  });

  it('سيناريو مختلط: عناصر فاسدة وعناصر سليمة في طابور واحد', () => {
    const items = [
      { id: 'good-1', payload: { id: 'w1' } },
      { id: 'corrupt-1', payload: { _corrupt: true } },
      { id: 'good-2', payload: { id: 'w2' } },
    ];

    // محاكاة استجابة السيرفر: 400 للفاسد، 200 للباقي
    const dlq: any[] = [];
    const sent: any[] = [];

    for (const item of items) {
      const status = item.payload._corrupt ? 400 : 200;
      if (status === 200) {
        sent.push(item);
      } else if (!isRetryableError(status)) {
        dlq.push(item);
      }
    }

    expect(sent.length).toBe(2);
    expect(dlq.length).toBe(1);
    expect(dlq[0].id).toBe('corrupt-1');
  });
});
