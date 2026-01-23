import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import pg from "pg";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const { Pool } = pg;

// التحقق من البيئة (أندرويد أو محلي)
const isAndroid = process.env.PLATFORM === 'android' || process.env.NODE_ENV === 'production';
const sqliteDbPath = path.resolve(process.cwd(), "local.db");

// DATABASE_URL_RAILWAY is preferred for Railway database
const rawDbUrl = process.env.DATABASE_URL_RAILWAY || process.env.DATABASE_URL_SUPABASE || process.env.DATABASE_URL || "";

// ✅ تنظيف الرابط من أي مسافات أو علامات اقتباس زائدة قد تسبب خطأ ENOTFOUND
const dbUrl = rawDbUrl.trim().replace(/^["']|["']$/g, "");

export const pool = new Pool({
  connectionString: dbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // إضافة معالجة للخطأ ENOTFOUND hostname: 'base'
  ssl: dbUrl.includes("supabase.co") || dbUrl.includes("rlwy.net") ? { rejectUnauthorized: false } : false
});

// تهيئة قاعدة البيانات المناسبة
let dbInstance: any;
let isEmergencyMode = false;

try {
  if (isAndroid) {
    dbInstance = drizzleSqlite(new Database(sqliteDbPath), { schema });
    console.log("✅ [SQLite] Using local database for Android.");
  } else {
    // محاولة الاتصال بـ Postgres مع مهلة زمنية قصيرة
    dbInstance = drizzle(pool, { schema });
    console.log("✅ [PostgreSQL] Initialized.");
  }
} catch (e) {
  console.error("🚨 [Emergency] Failed to initialize primary DB, switching to local SQLite:", e);
  dbInstance = drizzleSqlite(new Database(sqliteDbPath), { schema });
  isEmergencyMode = true;
}

export const db = dbInstance;
export { isEmergencyMode };

pool.on('error', (err) => {
  console.error('⚠️ [PostgreSQL] Pool Error:', err.message);
});

// دالة مساعدة للتحقق من حالة الاتصال
export async function checkDBConnection() {
  if (isAndroid || (global as any).isEmergencyMode) return true; // SQLite always connected or already in emergency
  
  try {
    const client = await pool.connect();
    client.release();
    console.log("✅ [PostgreSQL] Connection successful!");
    
    // إذا كان في وضع طوارئ، نقوم بتعطيله فوراً
    if ((global as any).isEmergencyMode) {
      console.log("🔄 [Emergency] Connection restored, disabling emergency mode.");
      (global as any).isEmergencyMode = false;
      isEmergencyMode = false;
    }
    return true;
  } catch (err: any) {
    console.error("❌ [PostgreSQL] Connection failed:", err.message);
    
    // تفعيل وضع الطوارئ فوراً عند فشل الاتصال
    if (!(global as any).isEmergencyMode) {
      console.error("🚨 [Emergency] Activating emergency mode protocol.");
      (global as any).isEmergencyMode = true;
      isEmergencyMode = true;
      
      // محاولة استعادة أحدث نسخة احتياطية حقيقية فوراً عند تفعيل وضع الطوارئ
      import("./services/BackupService").then(({ BackupService }) => {
        console.log("🔄 [Emergency] محاولة استعادة البيانات تلقائياً من أحدث نسخة احتياطية...");
        BackupService.initialize().then(async () => {
          const emergencyFile = path.join(process.cwd(), "backups", "emergency-latest.sql.gz");
          if (fs.existsSync(emergencyFile)) {
             console.log("📂 [Emergency] استخدام ملف emergency-latest.sql.gz للاستعادة...");
             try {
               await BackupService.restoreFromFile(emergencyFile);
               console.log("✅ [Emergency] تم تحميل أحدث البيانات الحقيقية في وضع الطوارئ بنجاح");
             } catch (e: any) {
               console.error("❌ [Emergency] فشل تحميل النسخة الاحتياطية التلقائي:", e.message);
             }
          }
        });
      });
    }
    return false;
  }
}
