import { describe, it, expect } from 'vitest';

describe('Database Module Structure Tests', () => {
  it('يجب أن يصدّر الوحدة الدوال الأساسية', async () => {
    const dbModule = await import('../db');
    expect(typeof dbModule.getSmartStorage).toBe('function');
    expect(typeof dbModule.getDB).toBe('function');
    expect(typeof dbModule.getSafeTransaction).toBe('function');
  });

  it('يجب أن يصدّر وحدة storage-factory الدوال المطلوبة', async () => {
    const sfModule = await import('../storage-factory');
    expect(typeof sfModule.smartSave).toBe('function');
    expect(typeof sfModule.smartGetAll).toBe('function');
  });

  it('يجب أن يصدّر وحدة data-cleanup الدوال المطلوبة', async () => {
    const cleanupModule = await import('../data-cleanup');
    expect(typeof cleanupModule.clearAllLocalData).toBe('function');
  });

  it('يجب أن يحتوي sync على جميع الجداول المطلوبة', async () => {
    const syncModule = await import('../sync');
    expect(syncModule.ALL_SYNC_TABLES).toBeDefined();
    expect(syncModule.ALL_SYNC_TABLES.length).toBeGreaterThan(40);
    expect(syncModule.ALL_SYNC_TABLES).toContain('projects');
    expect(syncModule.ALL_SYNC_TABLES).toContain('workers');
    expect(syncModule.ALL_SYNC_TABLES).toContain('wells');
  });
});
