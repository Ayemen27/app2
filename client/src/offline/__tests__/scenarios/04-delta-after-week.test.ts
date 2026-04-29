/**
 * 🧪 السيناريو 4: delta sync بعد أسبوع offline.
 * - cursor قديم بأسبوع → أول pull يستخدمه ثم يحدّثه.
 * - بدون cursor → أول pull = full reconcile.
 * - تباين schema baseline → يُرجِع null لإجبار full pull.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const storeData: Record<string, any> = {};

vi.mock('../../storage-factory', () => ({
  smartGet: vi.fn(async (_table: string, key: string) => storeData[key] ?? null),
  smartPut: vi.fn(async (_table: string, record: any) => {
    storeData[record.id || record.key] = record;
  }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: vi.fn().mockReturnValue('android') },
}));

describe('Scenario 4: delta sync بعد أسبوع offline', () => {
  beforeEach(() => {
    Object.keys(storeData).forEach((k) => delete storeData[k]);
    vi.clearAllMocks();
  });

  it('بدون cursor → getGlobalCursor يُرجِع null (full pull)', async () => {
    const { getGlobalCursor } = await import('../../sync-cursors');
    const c = await getGlobalCursor();
    expect(c).toBeNull();
  });

  it('بعد setGlobalCursor → getGlobalCursor يُعيد القيمة', async () => {
    const { setGlobalCursor, getGlobalCursor } = await import('../../sync-cursors');
    const ts = '2026-04-22T10:00:00Z'; // قبل أسبوع
    await setGlobalCursor(ts);

    const c = await getGlobalCursor();
    expect(c).toBe(ts);
  });

  it('cursor مع schema baseline قديم → يُرجِع null (تجبير full pull)', async () => {
    storeData['globalLastSyncTime'] = {
      id: 'globalLastSyncTime',
      key: 'globalLastSyncTime',
      lastSyncTime: '2026-04-22T10:00:00Z',
      serverTimestamp: '2026-04-22T10:00:00Z',
      updatedAt: Date.now(),
      schemaBaseline: '3.0-old',
    };

    const { getGlobalCursor } = await import('../../sync-cursors');
    const c = await getGlobalCursor();
    expect(c).toBeNull();
  });

  it('clearGlobalCursor → cursor يصبح null', async () => {
    const { setGlobalCursor, clearGlobalCursor, getGlobalCursor } = await import('../../sync-cursors');
    await setGlobalCursor('2026-04-22T10:00:00Z');
    await clearGlobalCursor();

    const c = await getGlobalCursor();
    expect(c).toBeNull();
  });

  it('table cursor مستقل عن global cursor', async () => {
    const { setTableCursor, getTableCursor, getGlobalCursor } = await import('../../sync-cursors');

    await setTableCursor('workers', '2026-04-22T10:00:00Z');
    await setTableCursor('projects', '2026-04-25T10:00:00Z');

    expect(await getTableCursor('workers')).toBe('2026-04-22T10:00:00Z');
    expect(await getTableCursor('projects')).toBe('2026-04-25T10:00:00Z');
    expect(await getGlobalCursor()).toBeNull();
  });

  it('SCHEMA_BASELINE معرّف بـ 4.0-delta', async () => {
    const { getSchemaBaseline } = await import('../../sync-cursors');
    expect(getSchemaBaseline()).toBe('4.0-delta');
  });
});
