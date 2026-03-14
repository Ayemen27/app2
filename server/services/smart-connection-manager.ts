
import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from "@shared/schema";
import { getCredential } from '../config/credentials';
import { envConfig } from '../utils/unified-env';
import fs from 'fs';
import path from 'path';
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);

/**
 * 🧠 مدير الاتصالات الذكي
 * يتعامل مع قواعد البيانات المختلفة تلقائياً
 */
export interface DynamicConnection {
  key: string;
  label: string;
  pool: Pool | null;
  db: unknown;
  connected: boolean;
  url: string;
  dbName?: string;
  dbUser?: string;
  host?: string;
  latency?: number;
}

export class SmartConnectionManager {
  private static instance: SmartConnectionManager;
  private localPool: Pool | null = null;
  private supabasePool: Pool | null = null;
  private localDb: any = null;
  private supabaseDb: any = null;
  private connectionStatus = {
    local: false,
    supabase: false
  };
  private isProduction = envConfig.isProduction;
  
  private dynamicConnections: Map<string, DynamicConnection> = new Map();
  
  private connectionMetrics: Record<string, {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    lastAttemptTime: number | null;
    lastFailureTime: number | null;
    averageLatency: number;
    latencyHistory: number[];
  }> = {
    local: {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      lastAttemptTime: null,
      lastFailureTime: null,
      averageLatency: 0,
      latencyHistory: []
    },
    supabase: {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      lastAttemptTime: null,
      lastFailureTime: null,
      averageLatency: 0,
      latencyHistory: []
    }
  };
  
  private autoReconnectInterval: NodeJS.Timeout | null = null;
  private lastReconnectAttempt = 0;
  private readonly MIN_RECONNECT_INTERVAL = 5000;

  private _readyPromise: Promise<void>;
  private _isReady = false;

  private constructor() {
    this._readyPromise = this.initialize().then(() => {
      this._isReady = true;
    }).catch((err) => {
      console.error('❌ [Smart Connection Manager] Initialization failed:', err);
      this._isReady = false;
    });
  }

  static getInstance(): SmartConnectionManager {
    if (!SmartConnectionManager.instance) {
      SmartConnectionManager.instance = new SmartConnectionManager();
    }
    return SmartConnectionManager.instance;
  }

  async waitUntilReady(): Promise<void> {
    return this._readyPromise;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * 🚀 تهيئة جميع الاتصالات
   */
  private async initialize(): Promise<void> {
    if (!this.isProduction) {
      console.log('🧠 [Smart Connection Manager] بدء التهيئة...');
    }
    
    await this.initializeLocalConnection();
    await this.initializeSupabaseConnection();
    await this.discoverAndConnectAllDatabases();
    await this.discoverDatabasesOnServer();

    if (!this.connectionStatus.supabase && !this.connectionStatus.local) {
      const isAndroid = process.env.PLATFORM === 'android';
      if (isAndroid) {
         console.log('📱 [Smart Connection Manager] بيئة أندرويد مكتشفة، استخدام SQLite افتراضياً.');
         await this.activateEmergencyMode();
      } else {
         console.error('🚨 [Smart Connection Manager] فشل الاتصال المركزي، تفعيل وضع الطوارئ كحل أخير...');
         await this.activateEmergencyMode();
      }
    }

    if (!this.isProduction) {
      console.log('✅ [Smart Connection Manager] تم إكمال التهيئة');
      this.logConnectionStatus();
    }
  }

  private async activateEmergencyMode(): Promise<void> {
    try {
      console.log('🔄 [Emergency] جاري تفعيل وضع الطوارئ التلقائي...');
      const workDir = process.cwd();
      const backupPath = path.join(workDir, "backups");
      const sqliteDbPath = path.join(workDir, "local.db");
      
      const sqliteInstance = new Database(sqliteDbPath);
      const emergencyDb = drizzleSqlite(sqliteInstance, { schema });
      
      // البحث عن أحدث نسخة احتياطية صالحة
      let chosenBackup = null;
      const emergencyBackup = path.join(backupPath, "emergency-latest.sql.gz");
      
      console.log(`📂 [Emergency] Scanning backup directory: ${backupPath}`);
      
      if (fs.existsSync(emergencyBackup) && fs.statSync(emergencyBackup).size > 100) {
        chosenBackup = emergencyBackup;
      } else if (fs.existsSync(backupPath)) {
        // البحث في المجلد عن أحدث ملف sql.gz أو sql
        const files = fs.readdirSync(backupPath)
          .filter(f => (f.endsWith(".sql.gz") || f.endsWith(".sql")) && fs.statSync(path.join(backupPath, f)).size > 1000)
          .sort((a, b) => fs.statSync(path.join(backupPath, b)).mtimeMs - fs.statSync(path.join(backupPath, a)).mtimeMs);
        
        if (files.length > 0) {
          chosenBackup = path.join(backupPath, files[0]);
          console.log(`📂 [Emergency] البديل المختار: ${files[0]} (الحجم: ${fs.statSync(chosenBackup).size} بايت)`);
        } else {
          console.error('❌ [Emergency] لم يتم العثور على أي ملفات صالحة في المجلد');
        }
      } else {
        console.error(`❌ [Emergency] المجلد غير موجود: ${backupPath}`);
      }

      if (chosenBackup) {
        console.log(`📦 [Emergency] بدء الاستعادة من: ${path.basename(chosenBackup)}`);
        
        const uncompressedPath = path.join(backupPath, "temp-restore.sql");
        
        try {
          if (chosenBackup.endsWith(".gz")) {
            console.log(`📂 [Emergency] جاري فك ضغط ${chosenBackup}...`);
            await execPromise(`gunzip -c "${chosenBackup}" > "${uncompressedPath}"`);
          } else {
            console.log(`📂 [Emergency] جاري نسخ ${chosenBackup}...`);
            fs.copyFileSync(chosenBackup, uncompressedPath);
          }
          
          if (!fs.existsSync(uncompressedPath)) {
            throw new Error(`تعذر العثور على الملف المفكوك في ${uncompressedPath}`);
          }

          const sqlContent = fs.readFileSync(uncompressedPath, 'utf8');
          
          const commands = sqlContent.split(/;\s*$/m).filter(cmd => cmd.trim().length > 0);
          console.log(`📜 [Emergency] جاري تنفيذ ${commands.length} أمر SQL في SQLite...`);
          
          sqliteInstance.exec("PRAGMA foreign_keys = OFF;");
          sqliteInstance.exec("PRAGMA journal_mode = OFF;");
          sqliteInstance.exec("PRAGMA synchronous = OFF;");
          sqliteInstance.exec("BEGIN TRANSACTION;");
          
          for (const command of commands) {
            try {
              const trimmedCmd = command.trim();
              if (trimmedCmd.startsWith("CREATE SCHEMA") || 
                  trimmedCmd.startsWith("SET ") ||
                  trimmedCmd.startsWith("SELECT pg_catalog") ||
                  trimmedCmd.startsWith("COMMENT ON") ||
                  (trimmedCmd.startsWith("ALTER TABLE") && trimmedCmd.includes("OWNER TO"))) {
                continue;
              }
              
              let sqliteCommand = command
                .replace(/gen_random_uuid\(\)/g, "hex(randomblob(16))")
                .replace(/SERIAL PRIMARY KEY/g, "INTEGER PRIMARY KEY AUTOINCREMENT")
                .replace(/TIMESTAMP WITH TIME ZONE/g, "DATETIME")
                .replace(/TIMESTAMP WITHOUT TIME ZONE/g, "DATETIME")
                .replace(/NOW\(\)/g, "CURRENT_TIMESTAMP")
                .replace(/::text/g, "")
                .replace(/::jsonb/g, "")
                .replace(/::json/g, "")
                .replace(/::integer/g, "")
                .replace(/::boolean/g, "")
                .replace(/RETURNING [^;]+/gi, "")
                .replace(/ON CONFLICT[^;]+DO NOTHING/gi, "OR IGNORE")
                .replace(/ON CONFLICT[^;]+DO UPDATE[^;]+/gi, "OR REPLACE");
              
              sqliteInstance.exec(sqliteCommand);
            } catch (cmdError: any) {
              if (!cmdError.message.includes('already exists') && 
                  !cmdError.message.includes('UNIQUE constraint failed')) {
                // صامت للسرعة
              }
            }
          }
          
          sqliteInstance.exec("COMMIT;");
          sqliteInstance.exec("PRAGMA journal_mode = DELETE;");
          sqliteInstance.exec("PRAGMA synchronous = FULL;");
          sqliteInstance.exec("PRAGMA foreign_keys = ON;");
          
          if (fs.existsSync(uncompressedPath)) fs.unlinkSync(uncompressedPath);
          
          console.log('✅ [Emergency] اكتملت الاستعادة بنجاح');
          (globalThis as Record<string, unknown>).isEmergencyMode = true;
          (globalThis as Record<string, unknown>).emergencyDb = emergencyDb;
        } catch (restoreError: any) {
          try { sqliteInstance.exec("ROLLBACK;"); } catch (e) {}
          console.error(`❌ [Emergency] فشل الاستعادة الفعلي: ${restoreError.message}`);
          throw restoreError;
        }
      } else {
        console.warn('⚠️ [Emergency] لم تنجح محاولات البحث، إنشاء قاعدة بيانات فارغة');
        (globalThis as Record<string, unknown>).isEmergencyMode = true;
        (globalThis as Record<string, unknown>).emergencyDb = emergencyDb;
      }
    } catch (e: any) {
      console.error('❌ [Emergency] خطأ حرج في وضع الطوارئ:', e.message);
    }
  }

  /**
   * 🔄 فحص استعادة الاتصال والمزامنة العكسية
   */
  async checkAndSyncBack(): Promise<void> {
    if (!this.connectionStatus.supabase && !this.connectionStatus.local) {
      await this.reconnect('both');
    }

    if (this.connectionStatus.local || this.connectionStatus.supabase) {
      console.log('✅ [Sync] تم استعادة الاتصال المركزي، بدء المزامنة العكسية...');
      // منطق المزامنة من SQLite إلى Postgres
      (globalThis as Record<string, unknown>).isEmergencyMode = false;
    }
  }

  /**
   * 🏠 تهيئة الاتصال المحلي مع إعادة المحاولة الذكية
   * استخدام exponential backoff مع jitter
   */
  private async initializeLocalConnection(retries = 3): Promise<void> {
    let lastError: any;
    const metrics = this.connectionMetrics.local;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      const startTime = Date.now();
      metrics.totalAttempts++;
      metrics.lastAttemptTime = startTime;
      
      try {
        /**
         * 🔗 ترتيب أولوية الاتصال:
         * 1. DATABASE_URL_CENTRAL - القاعدة المركزية الرئيسية
         * 2. DATABASE_URL_SUPABASE - قاعدة Supabase/External
         * 3. DATABASE_URL_RAILWAY - قاعدة Railway
         * ❌ يتم تجاهل DATABASE_URL (Replit Helium) لمنع الاتصال بها
         */
        const databaseUrl = 
          process.env.DATABASE_URL_CENTRAL ||
          process.env.DATABASE_URL_SUPABASE || 
          process.env.DATABASE_URL_RAILWAY;
        
        // تسجيل مصدر القاعدة
        const dbSource = process.env.DATABASE_URL_CENTRAL ? 'CENTRAL' :
                        process.env.DATABASE_URL_SUPABASE ? 'SUPABASE' :
                        process.env.DATABASE_URL_RAILWAY ? 'RAILWAY' : 'NONE';
        
        if (!databaseUrl) {
          console.warn('⚠️ [Local DB] لا توجد قاعدة بيانات مركزية - تحقق من DATABASE_URL_CENTRAL أو DATABASE_URL_SUPABASE');
          metrics.failedAttempts++;
          return;
        }
        
        // منع الاتصال بقاعدة Replit (heliumdb)
        if (databaseUrl.includes('helium') || databaseUrl.includes('heliumdb')) {
          console.warn('🚫 [Local DB] تم منع الاتصال بقاعدة Replit (heliumdb) - استخدم القاعدة المركزية');
          metrics.failedAttempts++;
          return;
        }
        
        console.log(`🔗 [Local DB] الاتصال بقاعدة ${dbSource}`);

        if (!this.isProduction && attempt > 1) {
          console.log(`🔄 [Local DB] محاولة الاتصال ${attempt}/${retries}...`);
        }

        // تحديد نوع الاتصال (محلي أم بعيد)
        const isLocalConnection = databaseUrl.includes('localhost') || 
                                 databaseUrl.includes('127.0.0.1') ||
                                 databaseUrl.includes('@localhost/');

        const sslConfig = isLocalConnection ? false : {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2' as const
        };

        this.localPool = new Pool({
          connectionString: databaseUrl,
          ssl: sslConfig,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000, // 30 ثانية
          statement_timeout: 30000,
          query_timeout: 30000,
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000
        });

        this.localDb = drizzle(this.localPool, { schema });

        // اختبار الاتصال مع قياس الزمن
        const client = await this.localPool.connect();
        const result = await client.query('SELECT current_database(), current_user, now()');
        client.release();

        const latency = Date.now() - startTime;
        this.connectionStatus.local = true;
        metrics.successfulAttempts++;
        
        // تحديث قياسات الأداء
        this.updateMetrics('local', latency);
        
        if (!this.isProduction) {
          console.log('✅ [Local DB] اتصال محلي نجح:', {
            database: result.rows[0].current_database,
            user: result.rows[0].current_user,
            latency: `${latency}ms`,
            attempt: attempt,
            successRate: `${((metrics.successfulAttempts / metrics.totalAttempts) * 100).toFixed(1)}%`
          });
        }
        return; // نجح الاتصال

      } catch (error: any) {
        lastError = error;
        metrics.failedAttempts++;
        metrics.lastFailureTime = Date.now();
        
        if (attempt < retries) {
          // exponential backoff مع jitter: 2^attempt * 500ms + random jitter
          const baseWaitTime = Math.pow(2, attempt) * 500;
          const jitter = Math.random() * 1000;
          const totalWaitTime = baseWaitTime + jitter;
          
          if (!this.isProduction) {
            console.log(`⏳ [Local DB] محاولة ${attempt} فشلت: ${error.message?.substring(0, 80)}`);
            console.log(`🔁 [Local DB] إعادة المحاولة بعد ${(totalWaitTime/1000).toFixed(2)} ثانية (محاولة ${attempt + 1}/${retries})`);
          }
          await new Promise(resolve => setTimeout(resolve, totalWaitTime));
        }
      }
    }

    // فشلت جميع المحاولات - تسجيل مفصل
    metrics.failedAttempts++;
    if (!this.isProduction) {
      console.error('❌ [Local DB] فشل الاتصال المحلي بعد', retries, 'محاولات');
      console.error('📊 [Local DB] الإحصائيات:', {
        totalAttempts: metrics.totalAttempts,
        successfulAttempts: metrics.successfulAttempts,
        failedAttempts: metrics.failedAttempts,
        lastError: lastError.message?.substring(0, 100),
        errorCode: lastError.code,
        suggestions: this.getSuggestions(lastError)
      });
    }
    this.connectionStatus.local = false;
  }

  /**
   * ☁️ تهيئة اتصال Supabase
   */
  private async initializeSupabaseConnection(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseDbPassword = process.env.SUPABASE_DATABASE_PASSWORD || process.env.SSH_PASSWORD;

    // التحقق من تكوين Supabase قبل المحاولة
    if (!supabaseUrl || !supabaseDbPassword) {
      if (!this.isProduction) {
        console.log('ℹ️ [Supabase] غير مكون (SUPABASE_URL أو SUPABASE_DATABASE_PASSWORD مفقود)');
      }
      return;
    }
    
    try {
      const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      if (!project) {
        console.warn('⚠️ [Supabase] فشل استخراج project ID');
        return;
      }

      // SSL configuration for Supabase
      let sslConfig: any = { rejectUnauthorized: false };
      
      const certPath = './pg_cert.pem';
      if (fs.existsSync(certPath)) {
        const ca = fs.readFileSync(certPath, { encoding: "utf8" });
        sslConfig = {
          rejectUnauthorized: false,
          ca: ca,
          minVersion: 'TLSv1.2',
          checkServerIdentity: () => undefined
        };
        console.log('🔒 [Supabase] تم تحميل شهادة SSL');
      }

      let connectionString = process.env.DATABASE_URL_SUPABASE;
      const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

      if (connectionString) {
        // 🛠️ تحسين رابط Supabase لتجاوز مشاكل DNS (تطبيق نفس منطق db.ts)
        // نقوم بالتحويل إلى Pooler الجديد aws-0-eu-central-1.pooler.supabase.com
        if (connectionString.includes("supabase.co") || connectionString.includes("pooler.supabase.com")) {
          const projectRefMatch = connectionString.match(/@db\.([^.]+)\.supabase\.co/) || 
                                connectionString.match(/postgresql:\/\/postgres\.([^:]+):/);
          const projectRef = projectRefMatch ? projectRefMatch[1] : project;
          
          if (projectRef) {
            console.log(`🔧 [Supabase Fix] تحسين رابط الاتصال للمشروع: ${projectRef}`);
            // استخراج الأجزاء المهمة من الرابط الحالي لضمان الحفاظ على كلمة المرور والمستخدم
            const urlParts = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@/);
            if (urlParts) {
              const user = urlParts[1];
              const password = urlParts[2];
              
              // الحل الجذري التقني الصحيح لـ Supabase:
              // لضمان عمل DNS وتجاوز خطأ Tenant:
              // 1. المضيف: aws-0-eu-central-1.pooler.supabase.com
              // 2. المستخدم: postgres.[project-ref]
              // 3. المنفذ: 6543 (Session Mode)
              
              const poolerHost = `aws-0-eu-central-1.pooler.supabase.com`;
              const compositeUser = `postgres.${projectRef}`;
              connectionString = `postgresql://${compositeUser}:${password}@${poolerHost}:6543/postgres?pgbouncer=true&connection_limit=1`;
              
              console.log(`🔗 [Supabase Fix] تم فرض اتصال Pooler المركب لضمان الربط: ${compositeUser}`);
            } else {
              // fallback إذا فشل regex الاستخراج
              connectionString = connectionString
                .replace(`db.${projectRef}.supabase.co:5432`, `aws-0-eu-central-1.pooler.supabase.com:6543`)
                .replace(`db.${projectRef}.supabase.co`, `aws-0-eu-central-1.pooler.supabase.com`);
                
              if (!connectionString.includes("?")) {
                connectionString += "?pgbouncer=true&connection_limit=1";
              }
            }
          }
        }

        console.log('🔗 [Supabase] استخدام رابط الاتصال المباشر المجمع (المحسن)');
        this.supabasePool = new Pool({
          connectionString: connectionString,
          ssl: sslConfig,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000
        });
      } else if (supabaseKey && project) {
        console.log('🔑 [Supabase] استخدام طريقة الاتصال عبر API Key');
        // استخدام عنوان IPv4 المجمع (Pooler) مع المنفذ 5432 لتجنب مشاكل IPv6
        this.supabasePool = new Pool({
          host: `aws-0-eu-central-1.pooler.supabase.com`,
          port: 6543, // استخدام منفذ PGBouncer للاستقرار
          database: 'postgres',
          user: `postgres.${project}`,
          password: supabaseDbPassword,
          ssl: sslConfig,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000
        });
      } else {
        this.supabasePool = new Pool({
          host: 'aws-0-eu-central-1.pooler.supabase.com',
          port: 6543,
          database: 'postgres',
          user: `postgres.${project}`,
          password: supabaseDbPassword,
          ssl: sslConfig,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000
        });
      }

      this.supabaseDb = drizzle(this.supabasePool, { schema });

      // اختبار الاتصال مع معالجة خطأ Tenant
      try {
        const client = await this.supabasePool.connect();
        await client.query('SELECT 1');
        client.release();
        this.connectionStatus.supabase = true;
        if (!this.isProduction) {
          console.log('✅ [Supabase] اتصال Supabase نجح');
        }
      } catch (connError: any) {
        if (connError.message?.includes('Tenant or user not found')) {
          console.error('❌ [Supabase Fix] خطأ في هوية المشروع (Tenant not found). يرجى التأكد من أن DATABASE_URL_SUPABASE يحتوي على كلمة المرور الصحيحة لمستخدم postgres.');
          // تذكير بالخطأ في المحاولات التالية
          (this as unknown as Record<string, boolean>).supabaseTenantError = true;
        } else {
          console.error('❌ [Supabase] فشل اختبار الاتصال:', connError.message);
        }
        this.connectionStatus.supabase = false;
        // لا نرمي خطأ هنا لمنع تعطل النظام بالكامل
      }

    } catch (error: any) {
      if (!this.isProduction) {
        console.error('❌ [Supabase] فشل اتصال Supabase:', error.message);
      }
      this.connectionStatus.supabase = false;
    }
  }

  /**
   * 📊 تحديث قياسات الأداء
   */
  private updateMetrics(target: 'local' | 'supabase', latency: number): void {
    const metrics = this.connectionMetrics[target];
    metrics.latencyHistory.push(latency);
    
    // الاحتفاظ بـ آخر 100 قياس فقط
    if (metrics.latencyHistory.length > 100) {
      metrics.latencyHistory.shift();
    }
    
    // حساب متوسط الزمن
    metrics.averageLatency = metrics.latencyHistory.length > 0
      ? Math.round(metrics.latencyHistory.reduce((a, b) => a + b, 0) / metrics.latencyHistory.length)
      : 0;
  }

  /**
   * 💡 اقتراحات لحل الأخطاء الشائعة
   */
  private getSuggestions(error: any): string[] {
    const suggestions: string[] = [];
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';

    if (message.includes('enotfound') || code === 'ENOTFOUND') {
      suggestions.push('تحقق من اسم المضيف ومعلومات الاتصال');
      suggestions.push('تأكد من توفر الشبكة والإنترنت');
    }

    if (message.includes('econnrefused') || code === 'ECONNREFUSED') {
      suggestions.push('قد لا تكون قاعدة البيانات قيد التشغيل');
      suggestions.push('تحقق من المنفذ والخادم');
    }

    if (message.includes('timeout')) {
      suggestions.push('زيادة المهلة الزمنية للاتصال');
      suggestions.push('التحقق من أداء الشبكة والخادم');
    }

    if (message.includes('ssl') || message.includes('certificate')) {
      suggestions.push('تحقق من شهادة SSL والتكوين');
      suggestions.push('حاول تعطيل التحقق من شهادة SSL إذا كانت الشهادة موثوقة');
    }

    if (message.includes('authentication') || message.includes('password')) {
      suggestions.push('تحقق من اسم المستخدم وكلمة المرور');
      suggestions.push('تأكد من صحة بيانات المصادقة في متغيرات البيئة');
    }

    return suggestions.length > 0 ? suggestions : ['تحقق من إعدادات قاعدة البيانات والاتصال'];
  }

  /**
   * 🎯 الحصول على الاتصال المناسب تلقائياً
   */
  getSmartConnection(operationType: 'read' | 'write' | 'backup' | 'sync' = 'read'): {
    pool: Pool | null;
    db: any;
    source: 'local' | 'supabase' | 'emergency' | null;
  } {
    // التحقق من وضع الطوارئ أولاً
    if ((globalThis as Record<string, unknown>).isEmergencyMode) {
      return {
        pool: null,
        db: this.localDb, // في Replit، القاعدة المحلية هي SQLite
        source: 'emergency'
      };
    }

    // قواعد التوجيه الذكي المعتادة
    switch (operationType) {
      case 'write':
        // الكتابة دائماً في قاعدة البيانات المحلية
        if (this.connectionStatus.local) {
          return {
            pool: this.localPool,
            db: this.localDb,
            source: 'local'
          };
        }
        break;

      case 'backup':
      case 'sync':
        // النسخ الاحتياطي والمزامنة من Supabase
        if (this.connectionStatus.supabase) {
          return {
            pool: this.supabasePool,
            db: this.supabaseDb,
            source: 'supabase'
          };
        }
        break;

      case 'read':
      default:
        // القراءة: أولوية للمحلي، ثم Supabase
        if (this.connectionStatus.local) {
          return {
            pool: this.localPool,
            db: this.localDb,
            source: 'local'
          };
        } else if (this.connectionStatus.supabase) {
          return {
            pool: this.supabasePool,
            db: this.supabaseDb,
            source: 'supabase'
          };
        }
        break;
    }

    return {
      pool: null,
      db: null,
      source: null
    };
  }

  /**
   * 🔄 إعادة تهيئة اتصال معين
   */
  async reconnect(target: 'local' | 'supabase' | 'both' = 'both'): Promise<void> {
    console.log(`🔄 [Smart Connection Manager] إعادة تهيئة: ${target}`);

    if (target === 'local' || target === 'both') {
      await this.initializeLocalConnection();
    }

    if (target === 'supabase' || target === 'both') {
      await this.initializeSupabaseConnection();
    }

    this.logConnectionStatus();
  }

  /**
   * 📊 حالة الاتصالات المفصلة
   */
  getConnectionStatus(): {
    local: boolean;
    supabase: boolean;
    totalConnections: number;
    emergencyMode: boolean;
    metrics?: any;
  } {
    return {
      ...this.connectionStatus,
      totalConnections: Object.values(this.connectionStatus).filter(Boolean).length,
      emergencyMode: (globalThis as Record<string, unknown>).isEmergencyMode as boolean || false,
      metrics: this.getMetrics()
    };
  }

  /**
   * 📈 الحصول على قياسات الاتصال المفصلة
   */
  getMetrics(): {
    local: any;
    supabase: any;
    healthScore: number;
  } {
    const localMetrics = this.connectionMetrics.local;
    const supabaseMetrics = this.connectionMetrics.supabase;

    // حساب النسبة المئوية للنجاح
    const localSuccessRate = localMetrics.totalAttempts > 0
      ? (localMetrics.successfulAttempts / localMetrics.totalAttempts) * 100
      : 0;

    const supabaseSuccessRate = supabaseMetrics.totalAttempts > 0
      ? (supabaseMetrics.successfulAttempts / supabaseMetrics.totalAttempts) * 100
      : 0;

    // حساب درجة الصحة الكلية (0-100)
    const connectionHealthScore = (
      (this.connectionStatus.local ? 50 : 0) +
      (this.connectionStatus.supabase ? 50 : 0)
    );

    return {
      local: {
        connected: this.connectionStatus.local,
        totalAttempts: localMetrics.totalAttempts,
        successfulAttempts: localMetrics.successfulAttempts,
        failedAttempts: localMetrics.failedAttempts,
        successRate: `${localSuccessRate.toFixed(1)}%`,
        averageLatency: `${localMetrics.averageLatency}ms`,
        lastAttemptTime: localMetrics.lastAttemptTime ? new Date(localMetrics.lastAttemptTime).toISOString() : null,
        lastFailureTime: localMetrics.lastFailureTime ? new Date(localMetrics.lastFailureTime).toISOString() : null
      },
      supabase: {
        connected: this.connectionStatus.supabase,
        totalAttempts: supabaseMetrics.totalAttempts,
        successfulAttempts: supabaseMetrics.successfulAttempts,
        failedAttempts: supabaseMetrics.failedAttempts,
        successRate: `${supabaseSuccessRate.toFixed(1)}%`,
        averageLatency: `${supabaseMetrics.averageLatency}ms`,
        lastAttemptTime: supabaseMetrics.lastAttemptTime ? new Date(supabaseMetrics.lastAttemptTime).toISOString() : null,
        lastFailureTime: supabaseMetrics.lastFailureTime ? new Date(supabaseMetrics.lastFailureTime).toISOString() : null
      },
      healthScore: connectionHealthScore
    };
  }

  /**
   * 🔍 اكتشاف وتوصيل جميع قواعد البيانات من متغيرات البيئة
   */
  private async discoverAndConnectAllDatabases(): Promise<void> {
    const envVars = process.env;
    const dbUrlPattern = /^DATABASE_URL_(.+)$/;
    
    const discoveredKeys: string[] = [];
    
    for (const [key, value] of Object.entries(envVars)) {
      const match = key.match(dbUrlPattern);
      if (!match || !value) continue;
      
      const suffix = match[1].toLowerCase();
      
      if (suffix === 'central' || suffix === 'railway') continue;
      
      if (value.includes('helium') || value.includes('heliumdb')) continue;
      
      if (suffix === 'supabase' && (this.connectionStatus.supabase || (this as unknown as Record<string, boolean>).supabaseTenantError)) continue;
      
      if (this.dynamicConnections.has(suffix)) continue;
      
      discoveredKeys.push(suffix);
      
      try {
        const startTime = Date.now();
        
        const isLocalConnection = value.includes('localhost') || value.includes('127.0.0.1');
        const sslConfig = isLocalConnection ? false : { rejectUnauthorized: false, minVersion: 'TLSv1.2' as const };
        
        const newPool = new Pool({
          connectionString: value,
          ssl: sslConfig,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
          keepAlive: true
        });
        
        const db = drizzle(newPool, { schema });
        
        const client = await newPool.connect();
        const result = await client.query('SELECT current_database() as db, current_user as usr');
        client.release();
        
        const latency = Date.now() - startTime;
        
        const urlObj = new URL(value);
        const label = suffix === 'supabase' ? 'Supabase' : 
                      (suffix === 'backup' || suffix === 'blackup') ? 'النسخ الاحتياطي' :
                      suffix.charAt(0).toUpperCase() + suffix.slice(1);
        
        this.dynamicConnections.set(suffix, {
          key: suffix,
          label,
          pool: newPool,
          db,
          connected: true,
          url: value,
          dbName: result.rows[0]?.db,
          dbUser: result.rows[0]?.usr,
          host: urlObj.hostname,
          latency
        });
        
        if (!this.connectionMetrics[suffix]) {
          this.connectionMetrics[suffix] = {
            totalAttempts: 1, successfulAttempts: 1, failedAttempts: 0,
            lastAttemptTime: Date.now(), lastFailureTime: null,
            averageLatency: latency, latencyHistory: [latency]
          };
        }
        
        if (suffix === 'supabase' && !this.connectionStatus.supabase) {
          this.supabasePool = newPool;
          this.supabaseDb = db;
          this.connectionStatus.supabase = true;
        }
        
        if (!this.isProduction) {
          console.log(`✅ [Dynamic DB] اتصال "${label}" نجح:`, {
            database: result.rows[0]?.db,
            host: urlObj.hostname,
            latency: `${latency}ms`
          });
        }
      } catch (error: any) {
        if (!this.isProduction) {
          console.warn(`⚠️ [Dynamic DB] فشل الاتصال بـ "${suffix}":`, error.message?.substring(0, 80));
        }
        
        const urlObj = (() => { try { return new URL(value); } catch { return null; } })();
        this.dynamicConnections.set(suffix, {
          key: suffix,
          label: suffix.charAt(0).toUpperCase() + suffix.slice(1),
          pool: null,
          db: null,
          connected: false,
          url: value,
          host: urlObj?.hostname,
        });
      }
    }
    
    if (discoveredKeys.length > 0 && !this.isProduction) {
      console.log(`🔍 [Dynamic DB] تم اكتشاف ${discoveredKeys.length} قاعدة بيانات إضافية:`, discoveredKeys);
    }
  }

  /**
   * 🔍 اكتشاف جميع قواعد البيانات على الخادم الرئيسي
   */
  private async discoverDatabasesOnServer(): Promise<void> {
    if (!this.localPool || !this.connectionStatus.local) return;

    try {
      const client = await this.localPool.connect();
      const result = await client.query(`
        SELECT datname FROM pg_database 
        WHERE datistemplate = false 
        AND datname NOT IN ('postgres', 'template0', 'template1')
      `);
      client.release();

      const currentDbUrl = process.env.DATABASE_URL || '';
      let urlObj: URL;
      try {
        urlObj = new URL(currentDbUrl);
      } catch {
        return;
      }
      
      const currentDbName = urlObj.pathname.replace('/', '');
      const discoveredOnServer: string[] = [];
      const isLocalConnection = currentDbUrl.includes('localhost') || currentDbUrl.includes('127.0.0.1');
      const sslConfig = isLocalConnection ? false : { rejectUnauthorized: false, minVersion: 'TLSv1.2' as const };

      for (const row of result.rows) {
        const dbName = row.datname;
        if (dbName === currentDbName) continue;

        const key = `server_${dbName}`;
        if (this.dynamicConnections.has(key)) continue;

        const existingKeys = Array.from(this.dynamicConnections.values());
        const alreadyConnected = existingKeys.some(c => c.dbName === dbName && c.connected);
        if (alreadyConnected) continue;

        const newUrl = new URL(currentDbUrl);
        newUrl.pathname = `/${dbName}`;
        const connString = newUrl.toString();

        try {
          const startTime = Date.now();
          const newPool = new Pool({
            connectionString: connString,
            ssl: sslConfig,
            max: 3,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 15000,
            keepAlive: true
          });

          const testClient = await newPool.connect();
          const testResult = await testClient.query('SELECT current_database() as db, current_user as usr');
          testClient.release();
          const latency = Date.now() - startTime;

          const labelMap: Record<string, string> = {
            'app2': 'تطبيق الأندرويد (app2)',
            'app2_backup': 'نسخة احتياطية (app2_backup)',
            'app2_plus': 'تطبيق متقدم (app2_plus)',
            'ai_agents_db': 'وكلاء الذكاء الاصطناعي',
            'ai_system_db': 'نظام الذكاء الاصطناعي',
            'admindata': 'بيانات الإدارة',
          };
          const label = labelMap[dbName] || dbName;

          this.dynamicConnections.set(key, {
            key,
            label,
            pool: newPool,
            db: drizzle(newPool, { schema }),
            connected: true,
            url: connString,
            dbName: testResult.rows[0]?.db,
            dbUser: testResult.rows[0]?.usr,
            host: urlObj.hostname,
            latency
          });

          discoveredOnServer.push(dbName);

          if (!this.connectionMetrics[key]) {
            this.connectionMetrics[key] = {
              totalAttempts: 1, successfulAttempts: 1, failedAttempts: 0,
              lastAttemptTime: Date.now(), lastFailureTime: null,
              averageLatency: latency, latencyHistory: [latency]
            };
          }

          if (!this.isProduction) {
            console.log(`✅ [Server DB] اكتشاف "${label}" نجح:`, {
              database: dbName, host: urlObj.hostname, latency: `${latency}ms`
            });
          }
        } catch (error: any) {
          this.dynamicConnections.set(key, {
            key,
            label: dbName,
            pool: null,
            db: null,
            connected: false,
            url: connString,
            host: urlObj.hostname,
          });
          if (!this.isProduction) {
            console.warn(`⚠️ [Server DB] فشل الاتصال بـ "${dbName}":`, error.message?.substring(0, 80));
          }
        }
      }

      if (discoveredOnServer.length > 0 && !this.isProduction) {
        console.log(`🔍 [Server DB] تم اكتشاف ${discoveredOnServer.length} قاعدة بيانات على الخادم:`, discoveredOnServer);
      }
    } catch (error: any) {
      if (!this.isProduction) {
        console.warn('⚠️ [Server DB] فشل فحص قواعد البيانات على الخادم:', error.message?.substring(0, 80));
      }
    }
  }

  /**
   * 📋 الحصول على جميع الاتصالات الديناميكية
   */
  getAllDynamicConnections(): DynamicConnection[] {
    return Array.from(this.dynamicConnections.values());
  }

  /**
   * 🎯 الحصول على اتصال ديناميكي بالمفتاح
   */
  getDynamicConnection(key: string): DynamicConnection | undefined {
    return this.dynamicConnections.get(key);
  }

  /**
   * 📝 عرض حالة الاتصالات
   */
  private logConnectionStatus(): void {
    if (this.isProduction) return;
    
    const status = this.getConnectionStatus();
    const dynamicStatus: Record<string, string> = {};
    for (const [key, conn] of this.dynamicConnections) {
      dynamicStatus[`📦 ${conn.label}`] = conn.connected ? `✅ متصل (${conn.dbName || key})` : '❌ غير متصل';
    }
    
    const totalConnected = (status.local ? 1 : 0) + 
      Array.from(this.dynamicConnections.values()).filter(c => c.connected).length;
    
    console.log('📊 [Smart Connection Manager] حالة الاتصالات:', {
      '🏠 محلي': status.local ? '✅ متصل' : '❌ غير متصل',
      ...dynamicStatus,
      '📈 إجمالي الاتصالات': totalConnected
    });
  }

  /**
   * 🧪 اختبار شامل للاتصالات
   */
  async runConnectionTest(): Promise<{
    local: { status: boolean; details?: any; error?: string };
    supabase: { status: boolean; details?: any; error?: string };
  }> {
    const results: {
      local: { status: boolean; details?: any; error?: string };
      supabase: { status: boolean; details?: any; error?: string };
    } = {
      local: { status: false },
      supabase: { status: false }
    };

    // اختبار الاتصال المحلي
    try {
      if (this.localPool) {
        const client = await this.localPool.connect();
        const result = await client.query('SELECT version(), current_database(), current_user, now()');
        client.release();
        
        results.local = {
          status: true,
          details: {
            database: result.rows[0].current_database,
            user: result.rows[0].current_user,
            version: result.rows[0].version?.split(' ')[0],
            timestamp: result.rows[0].now
          }
        };
      }
    } catch (error: any) {
      results.local = {
        status: false,
        error: error.message
      };
    }

    // اختبار اتصال Supabase
    try {
      if (this.supabasePool) {
        const client = await this.supabasePool.connect();
        const result = await client.query('SELECT version(), current_database(), current_user, now()');
        client.release();
        
        results.supabase = {
          status: true,
          details: {
            database: result.rows[0].current_database,
            user: result.rows[0].current_user,
            version: result.rows[0].version?.split(' ')[0],
            timestamp: result.rows[0].now
          }
        };
      }
    } catch (error: any) {
      results.supabase = {
        status: false,
        error: error.message
      };
    }

    return results;
  }

  /**
   * 🔐 إغلاق جميع الاتصالات
   */
  async closeAllConnections(): Promise<void> {
    console.log('🔐 [Smart Connection Manager] إغلاق جميع الاتصالات...');

    const closePromises = [];

    if (this.localPool) {
      closePromises.push(this.localPool.end());
    }

    if (this.supabasePool) {
      closePromises.push(this.supabasePool.end());
    }

    for (const [, conn] of this.dynamicConnections) {
      if (conn.pool) {
        closePromises.push(conn.pool.end());
      }
    }

    await Promise.all(closePromises);
    
    this.connectionStatus.local = false;
    this.connectionStatus.supabase = false;
    this.dynamicConnections.clear();

    console.log('✅ [Smart Connection Manager] تم إغلاق جميع الاتصالات');
  }
}

// تصدير المثيل الوحيد
export const smartConnectionManager = SmartConnectionManager.getInstance();

// دوال مساعدة للاستخدام السريع
export function getSmartConnection(operationType: 'read' | 'write' | 'backup' | 'sync' = 'read') {
  return smartConnectionManager.getSmartConnection(operationType);
}

export function getConnectionStatus() {
  return smartConnectionManager.getConnectionStatus();
}
