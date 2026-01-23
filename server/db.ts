import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import pg from "pg";
import Database from "better-sqlite3";
import path from "path";

const { Pool } = pg;

// التحقق من البيئة (أندرويد أو محلي)
const isAndroid = process.env.PLATFORM === 'android' || process.env.NODE_ENV === 'production';
const sqliteDbPath = path.resolve(process.cwd(), "local.db");

// DATABASE_URL_RAILWAY is preferred for Railway database
const dbUrl = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL_SUPABASE || process.env.DATABASE_URL || "";

export const pool = new Pool({
  connectionString: dbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// تهيئة قاعدة البيانات المناسبة
export const db = isAndroid 
  ? drizzleSqlite(new Database(sqliteDbPath), { schema })
  : drizzle(pool, { schema });

if (!dbUrl && !isAndroid) {
  console.error("❌ [PostgreSQL] DATABASE_URL is not defined!");
} else if (isAndroid) {
  console.log("✅ [SQLite] Using local database for Android.");
} else if (dbUrl.includes("rlwy.net")) {
  console.log("✅ [PostgreSQL] Using Railway cloud database.");
} else if (dbUrl.includes("supabase.co") || dbUrl.includes("pooler.supabase.com")) {
  console.log("✅ [PostgreSQL] Using Supabase cloud database.");
} else {
  console.log("✅ [PostgreSQL] Using Replit database.");
}

pool.on('error', (err) => {
  console.error('⚠️ [PostgreSQL] Pool Error:', err.message);
});

// دالة مساعدة للتحقق من حالة الاتصال
export async function checkDBConnection() {
  if (isAndroid) return true; // SQLite always connected
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
