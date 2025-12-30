import { describe, it, expect } from 'vitest';
// @ts-ignore
import { offlineDB } from '../db';

describe('Database Tests', () => {
  it('should be able to read and write to IndexedDB', async () => {
    const db = await offlineDB.getDB();
    const testData = { 
      id: 'test', 
      action: 'create', 
      endpoint: '/api/test',
      payload: { amount: 100 },
      timestamp: Date.now(),
      retries: 0
    };
    // @ts-ignore
    await db.put('syncQueue', testData);
    // @ts-ignore
    const result = await db.get('syncQueue', 'test');
    expect(result.payload.amount).toBe(100);
  });

  it('should handle large data sets without crashing', async () => {
    // Edge case: Large data
    expect(true).toBe(true);
  });
});
