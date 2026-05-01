/**
 * 🧪 السيناريو 2: تعارض حقيقي بين جهازين على نفس السجل.
 * يستخدم applyServerRecordsWithTombstones وsmartReconcile الفعليين عبر mock لـ nativeStorage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/hlc', () => ({
  compareHlc: (a: string, b: string) => {
    if (a === b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    return a > b ? 1 : -1;
  },
}));

const hoisted = vi.hoisted(() => {
  const tableData: Record<string, any[]> = {};
  return { tableData };
});

vi.mock('../../native-db', () => ({
  nativeStorage: {
    getAll: vi.fn(async (table: string) => hoisted.tableData[table] || []),
    get: vi.fn(async (table: string, id: string) => {
      const arr = hoisted.tableData[table] || [];
      return arr.find((r: any) => r.id === id) || null;
    }),
    set: vi.fn(async (table: string, id: string, record: any) => {
      hoisted.tableData[table] = hoisted.tableData[table] || [];
      const idx = hoisted.tableData[table].findIndex((r: any) => r.id === id);
      if (idx >= 0) hoisted.tableData[table][idx] = record;
      else hoisted.tableData[table].push(record);
    }),
    delete: vi.fn(async (table: string, id: string) => {
      hoisted.tableData[table] = (hoisted.tableData[table] || []).filter((r: any) => r.id !== id);
    }),
    waitForReady: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: vi.fn().mockReturnValue('android') },
}));

vi.mock('../../intelligent-monitor', () => ({
  intelligentMonitor: { logEvent: vi.fn() },
}));

describe('Scenario 2: تعارض جهازين على نفس السجل', () => {
  const tableName = 'workers';

  beforeEach(() => {
    Object.keys(hoisted.tableData).forEach((k) => delete hoisted.tableData[k]);
  });

  it('السيرفر أحدث + لا تعديل محلي مُعلَّق → النسخة المحلية تُستبدل', async () => {
    hoisted.tableData[tableName] = [
      { id: 'w1', name: 'Ali', salary: 1000, hlc_timestamp: '00010', _pendingSync: false },
    ];

    const serverRecords = [
      { id: 'w1', name: 'Ali', salary: 1500, hlc_timestamp: '00015' },
    ];

    const { smartReconcile } = await import('../../storage-factory');
    await smartReconcile(tableName, serverRecords);

    expect(hoisted.tableData[tableName][0].salary).toBe(1500);
  });

  it('المحلي أحدث ومُعلَّق → الاحتفاظ بالنسخة المحلية', async () => {
    hoisted.tableData[tableName] = [
      { id: 'w1', name: 'Ali', salary: 2000, hlc_timestamp: '00020', _pendingSync: true },
    ];

    const serverRecords = [
      { id: 'w1', name: 'Ali', salary: 1500, hlc_timestamp: '00015' },
    ];

    const { smartReconcile } = await import('../../storage-factory');
    await smartReconcile(tableName, serverRecords);

    expect(hoisted.tableData[tableName][0].salary).toBe(2000);
    expect(hoisted.tableData[tableName][0]._pendingSync).toBe(true);
  });

  it('السيرفر أحدث + تعديل محلي مُعلَّق → كشف تعارض مع الاحتفاظ بالمحلي', async () => {
    hoisted.tableData[tableName] = [
      { id: 'w1', name: 'Ali', salary: 2000, hlc_timestamp: '00010', _pendingSync: true },
    ];

    const serverRecords = [
      { id: 'w1', name: 'Ali', salary: 1500, hlc_timestamp: '00020' },
    ];

    const { smartReconcile } = await import('../../storage-factory');
    await smartReconcile(tableName, serverRecords);

    expect(hoisted.tableData[tableName][0].salary).toBe(2000);
    expect(hoisted.tableData[tableName][0]._conflictDetected).toBe(true);
  });

  it('tombstone من السيرفر → حذف محلي بشرط عدم وجود تعديل أحدث مُعلَّق', async () => {
    hoisted.tableData[tableName] = [
      { id: 'w1', name: 'Ali', _pendingSync: false },
    ];

    const { applyServerRecordsWithTombstones } = await import('../../storage-factory');
    await applyServerRecordsWithTombstones(tableName, [
      { id: 'w1', deleted_at: '2026-01-01T00:00:00Z' },
    ]);

    expect(hoisted.tableData[tableName].length).toBe(0);
  });

  it('tombstone من السيرفر + تعديل محلي مُعلَّق → الاحتفاظ بالمحلي', async () => {
    hoisted.tableData[tableName] = [
      { id: 'w1', name: 'Ali', _pendingSync: true },
    ];

    const { applyServerRecordsWithTombstones } = await import('../../storage-factory');
    await applyServerRecordsWithTombstones(tableName, [
      { id: 'w1', deleted_at: '2026-01-01T00:00:00Z' },
    ]);

    expect(hoisted.tableData[tableName].length).toBe(1);
    expect(hoisted.tableData[tableName][0]._pendingSync).toBe(true);
  });
});
