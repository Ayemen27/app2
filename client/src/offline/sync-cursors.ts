import { smartGet, smartPut } from './storage-factory';

const CURSOR_STORE = 'syncMetadata';
const GLOBAL_CURSOR_KEY = 'globalLastSyncTime';
const SCHEMA_BASELINE_KEY = 'syncSchemaBaseline';

const SCHEMA_BASELINE = '4.0-delta';

export interface SyncCursor {
  id: string;
  key: string;
  lastSyncTime: string | null;
  serverTimestamp: string | null;
  updatedAt: number;
  schemaBaseline?: string;
}

export async function getGlobalCursor(): Promise<string | null> {
  try {
    const record = (await smartGet(CURSOR_STORE, GLOBAL_CURSOR_KEY)) as SyncCursor | null;
    if (!record) return null;

    if (record.schemaBaseline && record.schemaBaseline !== SCHEMA_BASELINE) {
      console.warn(`[SyncCursor] schema baseline mismatch (${record.schemaBaseline} vs ${SCHEMA_BASELINE}) — forcing full pull`);
      return null;
    }

    return record.serverTimestamp || record.lastSyncTime || null;
  } catch (err: any) {
    console.warn('[SyncCursor] read failed, treating as first-time:', err?.message ?? err);
    return null;
  }
}

export async function setGlobalCursor(serverTimestamp: string): Promise<void> {
  try {
    const record: SyncCursor = {
      id: GLOBAL_CURSOR_KEY,
      key: GLOBAL_CURSOR_KEY,
      lastSyncTime: serverTimestamp,
      serverTimestamp,
      updatedAt: Date.now(),
      schemaBaseline: SCHEMA_BASELINE,
    };
    await smartPut(CURSOR_STORE, record);
  } catch (err: any) {
    console.warn('[SyncCursor] write failed (non-fatal):', err?.message ?? err);
  }
}

export async function clearGlobalCursor(): Promise<void> {
  try {
    const record: SyncCursor = {
      id: GLOBAL_CURSOR_KEY,
      key: GLOBAL_CURSOR_KEY,
      lastSyncTime: null,
      serverTimestamp: null,
      updatedAt: Date.now(),
      schemaBaseline: SCHEMA_BASELINE,
    };
    await smartPut(CURSOR_STORE, record);
  } catch (err: any) {
    console.warn('[SyncCursor] clear failed (non-fatal):', err?.message ?? err);
  }
}

export async function getTableCursor(tableName: string): Promise<string | null> {
  try {
    const key = `tableCursor:${tableName}`;
    const record = (await smartGet(CURSOR_STORE, key)) as SyncCursor | null;
    if (!record) return null;
    if (record.schemaBaseline && record.schemaBaseline !== SCHEMA_BASELINE) return null;
    return record.serverTimestamp || record.lastSyncTime || null;
  } catch {
    return null;
  }
}

export async function setTableCursor(tableName: string, serverTimestamp: string): Promise<void> {
  try {
    const key = `tableCursor:${tableName}`;
    const record: SyncCursor = {
      id: key,
      key,
      lastSyncTime: serverTimestamp,
      serverTimestamp,
      updatedAt: Date.now(),
      schemaBaseline: SCHEMA_BASELINE,
    };
    await smartPut(CURSOR_STORE, record);
  } catch (err: any) {
    console.warn(`[SyncCursor] table cursor write failed for ${tableName}:`, err?.message ?? err);
  }
}

export function getSchemaBaseline(): string {
  return SCHEMA_BASELINE;
}
