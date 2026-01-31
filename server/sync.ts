export async function syncData(payload: any) {
  const { table, data } = payload;
  const targetTable = getTable(table);
  
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
