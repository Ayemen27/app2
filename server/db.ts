import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

// الأولوية لـ Supabase ثم Replit
const dbUrl = process.env.DATABASE_URL_SUPABASE || process.env.DATABASE_URL || "";

if (!dbUrl) {
  console.error("❌ [PostgreSQL] DATABASE_URL is not defined!");
} else if (process.env.DATABASE_URL_SUPABASE) {
  console.log("✅ [PostgreSQL] Using Supabase cloud database.");
} else {
  console.log("✅ [PostgreSQL] Using Replit database.");
}

export const pool = new Pool({
  connectionString: dbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
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
    console.log("✅ [PostgreSQL] Connection successful!");
    return true;
  } catch (err: any) {
    console.error("❌ [PostgreSQL] Connection failed:", err.message);
    return false;
  }
}
