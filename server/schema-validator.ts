import { db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

export async function validateSchemaIntegrity() {
  console.log('🔍 [System] بدء فحص التكامل بين Schema وقاعدة البيانات...');
  const tables = Object.keys(schema).filter(key => (schema as any)[key]?.dbName);
  
  for (const tableName of tables) {
    try {
      await db.execute(sql`SELECT 1 FROM ${sql.identifier((schema as any)[tableName].dbName)} LIMIT 1`);
    } catch (error) {
      console.error(`❌ [Schema Error] الجدول ${tableName} غير موجود أو به تعارض في القاعدة`);
    }
  }
}
