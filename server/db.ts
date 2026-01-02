import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

// محاولة الاتصال بقاعدة البيانات الحقيقية لجلب البيانات الأولية
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('⚠️ [PostgreSQL] Pool Error:', err.message);
});

export const db = drizzle(pool, { schema });

// دالة مساعدة للتحقق من حالة الاتصال
export async function checkDBConnection() {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (err) {
    return false;
  }
}
