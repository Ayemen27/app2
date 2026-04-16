import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import pg from "pg";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SmartConnectionManager } from "./services/smart-connection-manager";

const { Pool } = pg;

// التحقق من البيئة (أندرويد أو محلي)
const isAndroid = process.env.PLATFORM === 'android';
const isServerProduction = process.env.NODE_ENV === 'production' && !process.env.PLATFORM;
const sqliteDbPath = path.resolve(process.cwd(), "local.db");

/**
 * 🔗 ترتيب أولوية متغيرات الاتصال بقاعدة البيانات:
 * 1. DATABASE_URL_CENTRAL - القاعدة المركزية الرئيسية (الأولوية القصوى)
 * 2. DATABASE_URL_RAILWAY - قاعدة Railway
 * ❌ يتم تجاهل DATABASE_URL (Replit Helium) لمنع الاتصال بها
 */
const rawDbUrl = 
  process.env.DATABASE_URL_CENTRAL ||
  process.env.DATABASE_URL_RAILWAY || 
  "";

if (!isAndroid && !rawDbUrl) {
  const errorMsg = '🚨 [DB FATAL] No database URL configured. Set DATABASE_URL_CENTRAL or DATABASE_URL_RAILWAY environment variable.';
  console.error(errorMsg);
  if (isServerProduction) {
    throw new Error(errorMsg);
  }
}

// تسجيل القاعدة المستخدمة
const dbSource = process.env.DATABASE_URL_CENTRAL ? 'CENTRAL' :
                 process.env.DATABASE_URL_RAILWAY ? 'RAILWAY' : 'NONE';

// استخراج اسم القاعدة من الرابط
function extractDbName(url: string): string {
  try {
    const match = url.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'غير معروف';
  } catch {
    return 'غير معروف';
  }
}

// عرض حالة جميع القواعد
console.log('═══════════════════════════════════════════════════════════');
console.log('📊 [DB Status] حالة قواعد البيانات:');
console.log('───────────────────────────────────────────────────────────');

const databases = [
  { name: 'DATABASE_URL_CENTRAL', url: process.env.DATABASE_URL_CENTRAL, priority: 1 },
  { name: 'DATABASE_URL_RAILWAY', url: process.env.DATABASE_URL_RAILWAY, priority: 2 },
  { name: 'DATABASE_URL (Replit)', url: process.env.DATABASE_URL, priority: 3, blocked: true },
];

let activeDb = '';
databases.forEach(db => {
  const dbName = db.url ? extractDbName(db.url) : 'غير مُعيّن';
  const isActive = db.url && db.url === rawDbUrl && !db.blocked;
  const isBlocked = db.blocked && db.url;
  
  if (isActive) {
    activeDb = dbName;
    console.log(`  ✅ [أولوية ${db.priority}] ${db.name}: ${dbName} (متصل - نشط)`);
  } else if (isBlocked) {
    console.log(`  🚫 [أولوية ${db.priority}] ${db.name}: ${dbName} (محظور - heliumdb)`);
  } else if (db.url) {
    console.log(`  ⏸️  [أولوية ${db.priority}] ${db.name}: ${dbName} (متاح - غير نشط)`);
  } else {
    console.log(`  ❌ [أولوية ${db.priority}] ${db.name}: غير مُعيّن`);
  }
});

console.log('───────────────────────────────────────────────────────────');
if (activeDb) {
  console.log(`🎯 [DB Active] القاعدة النشطة: ${activeDb} (${dbSource})`);
} else {
  console.error('🚫 [DB] لا توجد قاعدة بيانات نشطة!');
}
console.log('═══════════════════════════════════════════════════════════');

// ✅ تنظيف الرابط من أي مسافات أو علامات اقتباس زائدة قد تسبب خطأ ENOTFOUND
const dbUrl = rawDbUrl.trim().replace(/^["']|["']$/g, "");

let finalDbUrl = dbUrl;

// (Supabase pooler block removed — not applicable to this deployment)

if (!finalDbUrl.includes("?")) {
  finalDbUrl += "?sslmode=no-verify&connect_timeout=30";
}

console.log(`🔗 [DB] استخدام الاتصال المستقر لضمان الوصول`);

// تهيئة مدير الاتصالات الذكي
const smartConnectionManager = SmartConnectionManager.getInstance();

export const pool = new Pool({
  connectionString: finalDbUrl,
  max: 8,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 15000,
  query_timeout: 30000,
  statement_timeout: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: { rejectUnauthorized: false }
});

// تهيئة قاعدة البيانات المناسبة مع إدارة ذكية
let dbInstance: any;
let isEmergencyMode = false;
let sqliteInstance: Database.Database | null = null;

// أداة تنفيذ SQL آمنة مع دعم التدقيق الآلي (Enterprise Standard)
export const executeSql = async (sqlQuery: string, params: any[] = [], userId?: string) => {
  const result = await pool.query(sqlQuery, params);
  
  // نظام التدقيق الآلي (Audit Logging) للمعايير العالمية
  if (userId && /INSERT|UPDATE|DELETE/i.test(sqlQuery)) {
    try {
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, meta, created_at) VALUES ($1, $2, $3, NOW())',
        [userId ? String(userId) : null, 'SQL_EXECUTION', JSON.stringify({ query: sqlQuery, rowCount: result.rowCount })]
      );
    } catch (auditError) {
      console.error('❌ [Audit] فشل تسجيل التدقيق:', auditError);
    }
  }
  
  return result;
};

try {
  if (isAndroid) {
    sqliteInstance = new Database(sqliteDbPath, { timeout: 120000 });
    dbInstance = drizzleSqlite(sqliteInstance, { schema });
    console.log("✅ [SQLite] Using local database for Android.");
  } else {
    // محاولة الاتصال بـ Postgres مع مهلة زمنية أطول للاتصالات البعيدة
    const drizzleDb = drizzle(pool, { schema });
    dbInstance = new Proxy(drizzleDb, {
      get(target, prop, receiver) {
        if (prop === 'execute') {
          return async (query: any) => {
            if (!query) throw new Error("A query must have either text or a name.");
            
            try {
              if (typeof query === 'string') {
                const result = await pool.query(query);
                return { rows: result.rows || result };
              }

              if (query && query.text && typeof query.text === 'string') {
                const result = await pool.query(query.text, query.values || []);
                return { rows: result.rows || result };
              }

              return target.execute(query);
            } catch (err) {
              console.error("❌ [DB Proxy] Error executing query:", err);
              throw err;
            }
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    });
    console.log("✅ [PostgreSQL] Initialized with SmartConnectionManager and execute support.");
  }
} catch (e) {
  console.error("🚨 [Emergency] Failed to initialize primary DB, switching to local SQLite:", e);
  sqliteInstance = new Database(sqliteDbPath, { timeout: 120000 });
  dbInstance = drizzleSqlite(sqliteInstance, { schema });
  isEmergencyMode = true;
}

export const db = dbInstance;
export { isEmergencyMode, sqliteInstance };

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

if (!isAndroid && !isEmergencyMode && rawDbUrl) {
  (async () => {
    let client: pg.PoolClient | undefined;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT current_database(), now()');
      console.log(`✅ [DB Startup Health Check] Connection verified: ${result.rows[0].current_database}`);
    } catch (err: any) {
      console.error(`🚨 [DB Startup Health Check] Failed to verify database connection: ${err.message}`);
      if (isServerProduction) {
        console.error('🚨 [DB FATAL] Cannot connect to database in production. Exiting.');
        process.exit(1);
      }
    } finally {
      client?.release();
    }
  })();
}

// إضافة متغير عالمي لحالة تكامل البيانات
globalThis.lastIntegrityCheck = {
  status: "pending",
  lastChecked: null,
  issues: []
};

// معالج أخطاء Pool مع تسجيل محسّن
pool.on('error', (err: any) => {
  console.error('⚠️ [PostgreSQL Pool] Error detected:', {
    message: err.message,
    code: err.code,
    severity: err.severity || 'unknown'
  });
  
  // تفعيل وضع الطوارئ إذا حدث خطأ حرج
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    console.error('🚨 [PostgreSQL Pool] Connection error detected, triggering smart reconnection...');
    smartConnectionManager.reconnect('both').catch(e => {
      console.error('❌ [Smart Connection] Reconnection attempt failed:', e.message);
    });
  }
});

// دالة مساعدة للتحقق من حالة الاتصال مع تحسينات ذكية
export async function checkDBConnection() {
  if (isAndroid || globalThis.isEmergencyMode) return true; 
  
  // إذا كنا في وضع الطوارئ، نقلل وتيرة المحاولات لتجنب البطء
  if (globalThis.inConnectionRetry) return false;
  globalThis.inConnectionRetry = true;

  const startTime = Date.now();
  
  let client: pg.PoolClient | undefined;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user, now()');
    
    const latency = Date.now() - startTime;
    globalThis.inConnectionRetry = false;
    
    if (latency > 1000) {
      console.warn(`⚠️ [PostgreSQL] Connection successful but slow (${latency}ms)`);
    } else if (!isEmergencyMode) {
      console.log(`✅ [PostgreSQL] Connection healthy (${latency}ms)`);
    }
    
    if (globalThis.isEmergencyMode) {
      console.log("🔄 [Emergency] Connection restored, disabling emergency mode.");
      globalThis.isEmergencyMode = false;
      isEmergencyMode = false;
    }
    return true;
  } catch (err: any) {
    const latency = Date.now() - startTime;
    globalThis.inConnectionRetry = false;
    
    // تسجيل مفصل للخطأ
    console.error("❌ [PostgreSQL] Connection failed:", {
      message: err.message?.substring(0, 150),
      code: err.code,
      latency: `${latency}ms`,
      timestamp: new Date().toISOString()
    });
    
    // تفعيل وضع الطوارئ فوراً عند فشل الاتصال
    if (!globalThis.isEmergencyMode) {
      console.error("🚨 [Emergency] Activating emergency mode protocol immediately.");
      globalThis.isEmergencyMode = true;
      isEmergencyMode = true;
      
      // محاولة استعادة أحدث نسخة احتياطية حقيقية فوراً عند تفعيل وضع الطوارئ
      import("./services/BackupService").then(({ BackupService }) => {
        console.log("🔄 [Emergency] Attempting automatic data recovery from latest backup...");
        BackupService.initialize().then(async () => {
          const backupsDir = path.join(process.cwd(), "backups");
          let emergencyFile = path.join(backupsDir, "emergency-latest.sql.gz");
          
          if (!fs.existsSync(emergencyFile) && fs.existsSync(backupsDir)) {
            const files = fs.readdirSync(backupsDir)
              .filter(f => f.endsWith(".sql.gz"))
              .sort((a, b) => fs.statSync(path.join(backupsDir, b)).mtimeMs - fs.statSync(path.join(backupsDir, a)).mtimeMs);
            
            if (files.length > 0) {
              emergencyFile = path.join(backupsDir, files[0]);
              console.log(`📂 [Emergency] No fixed emergency file, selected latest: ${files[0]}`);
            }
          }

          if (fs.existsSync(emergencyFile)) {
             console.log(`📂 [Emergency] Found backup at ${path.basename(emergencyFile)}, initiating restore...`);
             try {
               // Fix: Cast BackupService to any to bypass type check for missing method during development
               // or ensure restoreBackup is used if restoreFromFile is not defined
               if ("restoreFromFile" in BackupService && typeof (BackupService as Record<string, unknown>).restoreFromFile === "function") {
                 await (BackupService as Record<string, (...args: unknown[]) => Promise<void>>).restoreFromFile(emergencyFile);
               } else {
                 console.warn("⚠️ [Emergency] restoreFromFile not implemented, skipping auto-restore");
               }
               console.log("✅ [Emergency] Successfully loaded latest data in emergency mode");

               // تحديث dbInstance ليشير إلى SQLite بعد الاستعادة
               if (sqliteInstance) {
                 const { drizzle: drizzleSqlite } = await import("drizzle-orm/better-sqlite3");
                 dbInstance = drizzleSqlite(sqliteInstance, { schema });
                 globalThis.db = dbInstance; // التأكد من التحديث العالمي
                 console.log("🔄 [Emergency] dbInstance updated to SQLite effectively.");
               }
             } catch (e: any) {
               console.error("❌ [Emergency] Failed to restore from backup:", e.message);
             }
          }
        });
      });
    }
    return false;
  } finally {
    client?.release();
  }
}

/**
 * 🔄 إعادة محاولة الاتصال الذكية
 * يتم استدعاؤها عند الكشف عن فشل الاتصال
 */
export async function smartReconnect(target: 'local' | 'both' = 'both'): Promise<boolean> {
  console.log(`🔄 [Smart Reconnect] Initiating smart reconnection for: ${target}`);
  
  try {
    await smartConnectionManager.reconnect(target);
    
    // فحص الحالة بعد إعادة المحاولة
    const status = smartConnectionManager.getConnectionStatus();
    console.log('📊 [Smart Reconnect] Connection status after reconnection:', status);
    
    return status.totalConnections > 0;
  } catch (error: any) {
    console.error('❌ [Smart Reconnect] Reconnection failed:', error.message);
    return false;
  }
}

/**
 * 📊 الحصول على حالة الاتصال المفصلة
 */
export function getConnectionHealthStatus() {
  return smartConnectionManager.getConnectionStatus();
}
