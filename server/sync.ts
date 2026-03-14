import { db } from './db';
import * as schema from '../shared/schema';

export async function syncData(payload: any) {
  const { table, data } = payload;
  const targetTable = (schema as any)[table];
  
  if (!targetTable) throw new Error("Table " + table + " not found");

  for (const item of data) {
    try {
      await db.insert(targetTable).values(item).onConflictDoUpdate({
        target: (targetTable as any).id,
        set: item
      });
    } catch (e) {
      console.error(`❌ [Sync] Error inserting into ${table}:`, e);
    }
  }
}
