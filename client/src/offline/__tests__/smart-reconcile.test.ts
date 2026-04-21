import { describe, it, expect, vi, beforeEach } from 'vitest';
import { smartReconcile } from '../storage-factory';
import { nativeStorage } from '../native-db';
import { intelligentMonitor } from '../intelligent-monitor';

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

vi.mock('../intelligent-monitor', () => ({
  intelligentMonitor: {
    logEvent: vi.fn()
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn().mockReturnValue('android')
  }
}));

describe('smartReconcile', () => {
  const tableName = 'test_table';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces local record without _pendingSync with server version', async () => {
    const localRecords = [{ id: '1', name: 'Old', _pendingSync: false }];
    const serverRecords = [{ id: '1', name: 'New' }];

    (nativeStorage.getAll as any).mockResolvedValue(localRecords);

    await smartReconcile(tableName, serverRecords);

    expect(nativeStorage.set).toHaveBeenCalledWith(tableName, '1', serverRecords[0]);
  });

  it('keeps local record with _pendingSync=true if server version is missing', async () => {
    const localRecords = [{ id: '1', name: 'Pending', _pendingSync: true }];
    const serverRecords: any[] = [];

    (nativeStorage.getAll as any).mockResolvedValue(localRecords);

    await smartReconcile(tableName, serverRecords);

    expect(nativeStorage.delete).not.toHaveBeenCalled();
    expect(nativeStorage.set).not.toHaveBeenCalled();
  });

  it('prevents overwrite if local record has newer HLC than server', async () => {
    const localHlc = '000000000000200-00000-node1';
    const serverHlc = '000000000000100-00000-node1';
    
    const localRecords = [{ 
      id: '1', 
      name: 'Local', 
      _pendingSync: true, 
      hlc_timestamp: localHlc 
    }];
    const serverRecords = [{ 
      id: '1', 
      name: 'Server', 
      hlc_timestamp: serverHlc 
    }];

    (nativeStorage.getAll as any).mockResolvedValue(localRecords);

    await smartReconcile(tableName, serverRecords);

    expect(nativeStorage.set).not.toHaveBeenCalled();
    expect(intelligentMonitor.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Sync overwrite prevented')
    }));
  });

  it('marks conflict if server has newer HLC but local has _pendingSync=true', async () => {
    const localHlc = '000000000000100-00000-node1';
    const serverHlc = '000000000000200-00000-node1';
    
    const localRecords = [{ 
      id: '1', 
      name: 'Local', 
      _pendingSync: true, 
      hlc_timestamp: localHlc 
    }];
    const serverRecords = [{ 
      id: '1', 
      name: 'Server', 
      hlc_timestamp: serverHlc 
    }];

    (nativeStorage.getAll as any).mockResolvedValue(localRecords);

    await smartReconcile(tableName, serverRecords);

    // Should keep local but set _conflictDetected: true
    expect(nativeStorage.set).toHaveBeenCalledWith(tableName, '1', expect.objectContaining({
      id: '1',
      _conflictDetected: true
    }));
    expect(intelligentMonitor.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Conflict detected')
    }));
  });
});
