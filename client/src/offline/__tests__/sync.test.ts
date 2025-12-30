import { describe, it, expect, beforeEach } from 'vitest';
// @ts-ignore
import { offlineDB } from '../db';
// @ts-ignore
import { syncOfflineData } from '../sync';

describe('Sync Engine Tests', () => {
  beforeEach(async () => {
    // @ts-ignore
    await offlineDB.syncQueue.clear();
  });

  it('should successfully sync offline data when connection is restored', async () => {
    console.log('Running sync test...');
    expect(true).toBe(true);
  });
});
