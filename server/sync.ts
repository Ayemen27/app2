import { db } from './db';
import * as schema from '../shared/schema';

export async function syncData(payload: any) {
  const { table, data } = payload;
  // Dynamic schema access: table name comes from sync payload at runtime
  const targetTable = (schema as Record<string, unknown>)[table];
  
  if (!targetTable) throw new Error("Table " + table + " not found");

  for (const item of data) {
    try {
      await db.insert(targetTable).values(item).onConflictDoUpdate({
        // Dynamic schema access: target table resolved at runtime from sync payload
        target: (targetTable as Record<string, unknown>).id as Parameters<typeof db.insert>[0],
        set: item
      });
    } catch (e) {
      console.error(`❌ [Sync] Error inserting into ${table}:`, e);
    }
  }
}
