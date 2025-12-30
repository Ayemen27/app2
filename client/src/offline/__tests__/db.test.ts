import { describe, it, expect } from 'vitest';
// @ts-ignore
import { offlineDB } from '../db';

describe('Database Tests', () => {
  it('should be able to read and write to IndexedDB', async () => {
    const testData = { id: 'test', action: 'create', table: 'expenses', data: { amount: 100 } };
    // @ts-ignore
    await offlineDB.syncQueue.add(testData);
    // @ts-ignore
    const result = await offlineDB.syncQueue.get('test');
    expect(result.data.amount).toBe(100);
  });
});
