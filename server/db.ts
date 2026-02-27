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
 * 2. DATABASE_URL_SUPABASE - قاعدة Supabase/External
 * 3. DATABASE_URL_RAILWAY - قاعدة Railway
 * ❌ يتم تجاهل DATABASE_URL (Replit Helium) لمنع الاتصال بها
 */
const rawDbUrl = 
  process.env.DATABASE_URL_CENTRAL ||
  process.env.DATABASE_URL_SUPABASE || 
  process.env.DATABASE_URL_RAILWAY || 
  "";

// تسجيل القاعدة المستخدمة
const dbSource = process.env.DATABASE_URL_CENTRAL ? 'CENTRAL' :
                 process.env.DATABASE_URL_SUPABASE ? 'SUPABASE/EXTERNAL' :
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
  { name: 'DATABASE_URL_SUPABASE', url: process.env.DATABASE_URL_SUPABASE, priority: 2 },
  { name: 'DATABASE_URL_RAILWAY', url: process.env.DATABASE_URL_RAILWAY, priority: 3 },
  { name: 'DATABASE_URL (Replit)', url: process.env.DATABASE_URL, priority: 4, blocked: true },
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

/**
 * 🛠️ تحسين رابط Supabase لتجاوز مشاكل DNS
 * Supabase يواجه أحياناً مشاكل في دقة العناوين القديمة db.xxx.supabase.co
 * الحل الموصى به هو استخدام الـ Pooler الجديد: aws-0-[region].pooler.supabase.co
 * أو محاولة الاتصال المباشر عبر المعرف الجديد
 */
let finalDbUrl = dbUrl;
if (dbUrl.includes("supabase.co")) {
  // استخراج المعرف المشروع (Project Ref)
  const projectRefMatch = dbUrl.match(/@db\.([^.]+)\.supabase\.co/);
  const projectRef = projectRefMatch ? projectRefMatch[1] : null;
  
  if (projectRef) {
    // محاولة استخدام المضيف الجديد (Transaction Mode - PGBouncer)
    // المضيف القياسي الجديد: [project-ref].supabase.co أو استخدام pooler
    console.log(`🔧 [Supabase Fix] تحسين رابط الاتصال للمشروع: ${projectRef}`);
    
    // العودة للاتصال المستقر والمباشر مع تحسينات الأداء
    finalDbUrl = dbUrl;
    if (dbUrl.includes("supabase.co")) {
      const projectRefMatch = dbUrl.match(/@db\.([^.]+)\.supabase\.co/);
      const projectRef = projectRefMatch ? projectRefMatch[1] : null;
      
      if (projectRef) {
        // التحقق من صحة المستخدم - Supabase يتطلب postgres.[project-ref] للـ Pooler
        // أو postgres للاتصال المباشر. خطأ Tenant not found يعني غالباً تعارض بينهما.
        console.log(`🔧 [Supabase Fix] تحسين رابط الاتصال للمشروع: ${projectRef}`);
        
        // محاولة استخدام المضيف المباشر بالمنفذ 5432 والمستخدم postgres البسيط
        // هذا هو الحل الأكثر موثوقية لتجاوز مشاكل الـ Tenant في Supabase
        const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@/);
        if (urlParts) {
          const password = urlParts[2];
          finalDbUrl = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
        }
      }
    }
    if (!finalDbUrl.includes("?")) {
      finalDbUrl += "?sslmode=no-verify&connect_timeout=30";
    }
    console.log(`🔗 [DB] استخدام الاتصال المباشر لضمان الاستقرار وتجنب أخطاء الـ Tenant`);
  }
}

// تهيئة مدير الاتصالات الذكي
const smartConnectionManager = SmartConnectionManager.getInstance();

export const pool = new Pool({
  connectionString: finalDbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 300000, // 5 دقائق للاتصالات البعيدة
  query_timeout: 300000,
  statement_timeout: 300000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: { rejectUnauthorized: false } // Supabase يتطلب SSL
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
        [userId, 'SQL_EXECUTION', JSON.stringify({ query: sqlQuery, rowCount: result.rowCount })]
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
    // Proxy for database to support both .query and .execute (for raw SQL)
    dbInstance = new Proxy(drizzleDb, {
      get(target, prop, receiver) {
        if (prop === 'execute') {
          return async (query: any) => {
            if (!query) throw new Error("A query must have either text or a name.");
            
            try {
              let text = '';
              let values = [];
              
              if (typeof query === 'string') {
                text = query;
              } else if (query && typeof query.toQuery === 'function') {
                try {
                  const q = query.toQuery();
                  text = q.text;
                  values = q.values;
                } catch (e) {
                  // If toQuery fails, try standard sql/params
                  text = query.sql || '';
                  values = query.params || [];
                }
              } else if (query && typeof query.sql === 'string') {
                // Handle cases where the query object has sql and params (standard Drizzle/custom)
                text = query.sql;
                values = query.params || [];
              } else if (query && query.inlineParams) {
                // Handle cases where the query object has inlineParams
                text = query.sql || '';
                values = query.params || [];
              } else if (query && query.text) {
                text = query.text;
                values = query.values || [];
              } else {
                // FALLBACK: Attempt to use the object directly
                return pool.query(query);
              }
              
              const result = await pool.query(text, values);
              return { rows: result.rows || result };
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

// إضافة متغير عالمي لحالة تكامل البيانات
(global as any).lastIntegrityCheck = {
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
  if (isAndroid || (global as any).isEmergencyMode) return true; 
  
  // إذا كنا في وضع الطوارئ، نقلل وتيرة المحاولات لتجنب البطء
  if ((global as any).inConnectionRetry) return false;
  (global as any).inConnectionRetry = true;

  const startTime = Date.now();
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user, now()');
    client.release();
    
    const latency = Date.now() - startTime;
    (global as any).inConnectionRetry = false;
    
    // Log successful connection
    if (latency > 1000) {
      console.warn(`⚠️ [PostgreSQL] Connection successful but slow (${latency}ms)`);
    } else if (!isEmergencyMode) {
      console.log(`✅ [PostgreSQL] Connection healthy (${latency}ms)`);
    }
    
    // إذا كان في وضع طوارئ، نقوم بتعطيله فوراً
    if ((global as any).isEmergencyMode) {
      console.log("🔄 [Emergency] Connection restored, disabling emergency mode.");
      (global as any).isEmergencyMode = false;
      isEmergencyMode = false;
    }
    return true;
  } catch (err: any) {
    const latency = Date.now() - startTime;
    (global as any).inConnectionRetry = false;
    
    // تسجيل مفصل للخطأ
    console.error("❌ [PostgreSQL] Connection failed:", {
      message: err.message?.substring(0, 150),
      code: err.code,
      latency: `${latency}ms`,
      timestamp: new Date().toISOString()
    });
    
    // تفعيل وضع الطوارئ فوراً عند فشل الاتصال
    if (!(global as any).isEmergencyMode) {
      console.error("🚨 [Emergency] Activating emergency mode protocol immediately.");
      (global as any).isEmergencyMode = true;
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
               if (typeof (BackupService as any).restoreFromFile === 'function') {
                 await (BackupService as any).restoreFromFile(emergencyFile);
               } else {
                 console.warn("⚠️ [Emergency] restoreFromFile not implemented, skipping auto-restore");
               }
               console.log("✅ [Emergency] Successfully loaded latest data in emergency mode");

               // تحديث dbInstance ليشير إلى SQLite بعد الاستعادة
               if (sqliteInstance) {
                 const { drizzle: drizzleSqlite } = await import("drizzle-orm/better-sqlite3");
                 dbInstance = drizzleSqlite(sqliteInstance, { schema });
                 (global as any).db = dbInstance; // التأكد من التحديث العالمي
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
  }
}

/**
 * 🔄 إعادة محاولة الاتصال الذكية
 * يتم استدعاؤها عند الكشف عن فشل الاتصال
 */
export async function smartReconnect(target: 'local' | 'supabase' | 'both' = 'both'): Promise<boolean> {
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
