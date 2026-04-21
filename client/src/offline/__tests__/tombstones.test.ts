import { describe, it, expect, vi, beforeEach } from 'vitest';
import { smartReconcile } from '../storage-factory';
import { nativeStorage } from '../native-db';

// Mock shared/hlc
vi.mock('@/shared/hlc', () => ({
  compareHlc: (a: string, b: string) => {
    if (a === b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    return a > b ? 1 : -1;
  }
}));

// Mock dependencies
vi.mock('../native-db', () => ({
  nativeStorage: {
    getAll: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    waitForReady: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn().mockReturnValue('android')
  }
}));

vi.mock('../intelligent-monitor', () => ({
  intelligentMonitor: {
    logEvent: vi.fn()
  }
}));

describe('tombstones sync', () => {
  const tableName = 'test_table';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes local record if it is missing from server records (server tombstone)', async () => {
    const localRecords = [{ id: '1', name: 'To be deleted', _pendingSync: false }];
    const serverRecords: any[] = []; // ID 1 missing = deleted on server

    (nativeStorage.getAll as any).mockResolvedValue(localRecords);

    await smartReconcile(tableName, serverRecords);

    expect(nativeStorage.delete).toHaveBeenCalledWith(tableName, '1');
  });

  it('does NOT delete local record if it is missing from server but has _pendingSync=true', async () => {
    const localRecords = [{ id: '1', name: 'Pending', _pendingSync: true }];
    const serverRecords: any[] = [];

    (nativeStorage.getAll as any).mockResolvedValue(localRecords);

    await smartReconcile(tableName, serverRecords);

    expect(nativeStorage.delete).not.toHaveBeenCalled();
  });

  it('correctly identifies deleted records when multiple records exist', async () => {
    const localRecords = [
      { id: '1', name: 'Stay', _pendingSync: false },
      { id: '2', name: 'Delete', _pendingSync: false }
    ];
    const serverRecords = [{ id: '1', name: 'Stay' }];

    (nativeStorage.getAll as any).mockResolvedValue(localRecords);

    await smartReconcile(tableName, serverRecords);

    expect(nativeStorage.delete).toHaveBeenCalledWith(tableName, '2');
    expect(nativeStorage.delete).not.toHaveBeenCalledWith(tableName, '1');
    expect(nativeStorage.set).toHaveBeenCalledWith(tableName, '1', serverRecords[0]);
  });
});
