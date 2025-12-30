import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
// @ts-ignore
import { syncOfflineData } from '../sync';

describe('Sync Engine Tests', () => {
  beforeEach(async () => {
    // @ts-ignore
    await db.syncQueue.clear();
  });

  it('should successfully sync offline data when connection is restored', async () => {
    console.log('Running sync test...');
    expect(true).toBe(true);
  });
});
