/**
 * 🧪 السيناريو 1: 1000 mutation offline → online flush.
 * يختبر بنية الطابور وتوزيع batches بشكل وحدوي.
 */
import { describe, it, expect, beforeEach } from 'vitest';

interface QueueItem {
  id: string;
  batchId?: string;
  action: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: Record<string, any>;
  retries: number;
  timestamp: number;
  lastModifiedAt: number;
  nextRetryAt?: number;
}

function groupByBatch(items: QueueItem[]): { batches: Map<string, QueueItem[]>; unbatched: QueueItem[] } {
  const batches = new Map<string, QueueItem[]>();
  const unbatched: QueueItem[] = [];
  for (const item of items) {
    if (item.batchId) {
      if (!batches.has(item.batchId)) batches.set(item.batchId, []);
      batches.get(item.batchId)!.push(item);
    } else {
      unbatched.push(item);
    }
  }
  return { batches, unbatched };
}

function filterReady(items: QueueItem[], now: number): QueueItem[] {
  return items.filter((item) => {
    if (item.nextRetryAt && item.nextRetryAt > now) return false;
    return true;
  });
}

describe('Scenario 1: bulk-offline → online flush (1000 mutations)', () => {
  let queue: QueueItem[];

  beforeEach(() => {
    queue = [];
  });

  it('1000 عملية موزّعة على 10 batches → كلها جاهزة للإرسال', () => {
    const BATCH_COUNT = 10;
    const PER_BATCH = 100;

    for (let b = 0; b < BATCH_COUNT; b++) {
      for (let i = 0; i < PER_BATCH; i++) {
        queue.push({
          id: `op-${b}-${i}`,
          batchId: `batch-${b}`,
          action: 'create',
          endpoint: '/api/workers',
          payload: { id: `w-${b}-${i}` },
          retries: 0,
          timestamp: Date.now(),
          lastModifiedAt: Date.now(),
        });
      }
    }

    expect(queue.length).toBe(1000);

    const ready = filterReady(queue, Date.now());
    expect(ready.length).toBe(1000);

    const { batches, unbatched } = groupByBatch(ready);
    expect(batches.size).toBe(BATCH_COUNT);
    expect(unbatched.length).toBe(0);

    let totalInBatches = 0;
    for (const batch of batches.values()) {
      expect(batch.length).toBe(PER_BATCH);
      totalInBatches += batch.length;
    }
    expect(totalInBatches).toBe(1000);
  });

  it('عناصر nextRetryAt في المستقبل تُستبعد من الإرسال', () => {
    const now = Date.now();
    queue.push(
      {
        id: 'ready',
        action: 'create',
        endpoint: '/api/x',
        payload: {},
        retries: 0,
        timestamp: now,
        lastModifiedAt: now,
      },
      {
        id: 'pending-retry',
        action: 'create',
        endpoint: '/api/x',
        payload: {},
        retries: 1,
        nextRetryAt: now + 60_000, // بعد دقيقة
        timestamp: now,
        lastModifiedAt: now,
      },
    );

    const ready = filterReady(queue, now);
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe('ready');
  });

  it('عناصر بدون batchId → unbatched (إرسال منفصل)', () => {
    queue.push({
      id: 'solo',
      action: 'create',
      endpoint: '/api/x',
      payload: {},
      retries: 0,
      timestamp: Date.now(),
      lastModifiedAt: Date.now(),
    });

    const { batches, unbatched } = groupByBatch(queue);
    expect(batches.size).toBe(0);
    expect(unbatched.length).toBe(1);
  });
});
