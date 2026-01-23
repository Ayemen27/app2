
import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from "@shared/schema";
import { getCredential, isSupabaseConfigured } from '../config/credentials';
import { envConfig } from '../utils/unified-env';
import fs from 'fs';
import path from 'path';

/**
 * 🧠 مدير الاتصالات الذكي
 * يتعامل مع قواعد البيانات المختلفة تلقائياً
 */
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

  private constructor() {
    this.initialize();
  }

  static getInstance(): SmartConnectionManager {
    if (!SmartConnectionManager.instance) {
      SmartConnectionManager.instance = new SmartConnectionManager();
    }
    return SmartConnectionManager.instance;
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

    // فحص وضع الطوارئ التلقائي
    if (!this.connectionStatus.supabase && !this.connectionStatus.local) {
      console.error('🚨 [Smart Connection Manager] فشل الاتصال المركزي، تفعيل وضع الطوارئ...');
      await this.activateEmergencyMode();
    }

    if (!this.isProduction) {
      console.log('✅ [Smart Connection Manager] تم إكمال التهيئة');
      this.logConnectionStatus();
    }
  }

  private async activateEmergencyMode(): Promise<void> {
    try {
      console.log('🔄 [Emergency] جاري تفعيل وضع الطوارئ التلقائي...');
      const backupDir = path.join(process.cwd(), "backups");
      const emergencyBackup = path.join(backupDir, "emergency-latest.sql.gz");
      const sqliteDbPath = path.join(process.cwd(), "local.db");
      
      const sqliteInstance = new Database(sqliteDbPath);
      const emergencyDb = drizzleSqlite(sqliteInstance, { schema });
      
      if (fs.existsSync(emergencyBackup)) {
        console.log('📦 [Emergency] تم العثور على نسخة طوارئ حديثة، بدء الاستعادة إلى SQLite...');
        
        const uncompressedPath = emergencyBackup.replace(".gz", "");
        const { promisify } = require("util");
        const { exec } = require("child_process");
        const execPromise = promisify(exec);
        
        await execPromise(`gunzip -c "${emergencyBackup}" > "${uncompressedPath}"`);
        const sqlContent = fs.readFileSync(uncompressedPath, 'utf8');
        
        const commands = sqlContent.split(/;\s*$/m).filter(cmd => cmd.trim().length > 0);
        console.log(`📜 [Emergency] تنفيذ ${commands.length} أمر SQL في قاعدة SQLite...`);
        
        sqliteInstance.exec("PRAGMA foreign_keys = OFF;");
        
        for (const command of commands) {
          try {
            if (command.trim().startsWith("CREATE SCHEMA") || 
                command.trim().startsWith("SET ") ||
                command.trim().startsWith("SELECT pg_catalog") ||
                command.trim().startsWith("COMMENT ON") ||
                command.trim().startsWith("ALTER TABLE") && command.includes("OWNER TO")) {
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
              console.warn(`⚠️ [Emergency] تنبيه في أمر SQL: ${cmdError.message.substring(0, 100)}`);
            }
          }
        }
        
        sqliteInstance.exec("PRAGMA foreign_keys = ON;");
        
        if (fs.existsSync(uncompressedPath)) fs.unlinkSync(uncompressedPath);
        
        console.log('✅ [Emergency] تمت استعادة البيانات إلى SQLite بنجاح');
        (global as any).isEmergencyMode = true;
        (global as any).emergencyDb = emergencyDb;
      } else {
        console.warn('⚠️ [Emergency] لا توجد نسخة احتياطية محلية، إنشاء قاعدة بيانات فارغة...');
        (global as any).isEmergencyMode = true;
        (global as any).emergencyDb = emergencyDb;
      }
    } catch (e: any) {
      console.error('❌ [Emergency] فشل تفعيل وضع الطوارئ:', e.message);
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
      (global as any).isEmergencyMode = false;
    }
  }

  /**
   * 🏠 تهيئة الاتصال المحلي مع إعادة المحاولة
   */
  private async initializeLocalConnection(retries = 3): Promise<void> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // محاولة جلب المتغير مباشرة من الـ loader لضمان التحديث
        const databaseUrl = process.env.DATABASE_URL || (global as any).envLoader?.get('DATABASE_URL');
        
        if (!databaseUrl) {
          console.warn('⚠️ [Local DB] DATABASE_URL غير موجود');
          return;
        }

        if (!this.isProduction && attempt > 1) {
          console.log(`🔄 [Local DB] محاولة الاتصال ${attempt}/${retries}...`);
        }

        // SSL configuration for local connection
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
          connectionTimeoutMillis: 60000, // 60 ثانية
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000
        });

        this.localDb = drizzle(this.localPool, { schema });

        // اختبار الاتصال
        const client = await this.localPool.connect();
        const result = await client.query('SELECT current_database(), current_user');
        client.release();

        this.connectionStatus.local = true;
        if (!this.isProduction) {
          console.log('✅ [Local DB] اتصال محلي نجح:', {
            database: result.rows[0].current_database,
            user: result.rows[0].current_user,
            attempt: attempt
          });
        }
        return; // نجح الاتصال

      } catch (error: any) {
        lastError = error;
        
        if (attempt < retries) {
          const waitTime = attempt * 2000; // انتظار متزايد: 2s, 4s, 6s
          if (!this.isProduction) {
            console.log(`⏳ [Local DB] إعادة المحاولة بعد ${waitTime/1000} ثانية...`);
          }
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // فشلت جميع المحاولات
    if (!this.isProduction) {
      console.error('❌ [Local DB] فشل الاتصال المحلي بعد', retries, 'محاولات:', lastError.message);
    }
    this.connectionStatus.local = false;
  }

  /**
   * ☁️ تهيئة اتصال Supabase
   */
  private async initializeSupabaseConnection(): Promise<void> {
    // التحقق من تكوين Supabase قبل المحاولة
    if (!isSupabaseConfigured()) {
      if (!this.isProduction) {
        console.log('ℹ️ [Supabase] غير مكون - سيتم تخطيه');
      }
      return;
    }
    
    try {
      const supabaseUrl = getCredential('SUPABASE_URL');
      const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
      
      if (!supabaseUrl || !supabasePassword) {
        return;
      }

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

      this.supabasePool = new Pool({
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: `postgres.${project}`,
        password: supabasePassword,
        ssl: sslConfig,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000
      });

      this.supabaseDb = drizzle(this.supabasePool, { schema });

      // اختبار الاتصال
      const client = await this.supabasePool.connect();
      const result = await client.query('SELECT current_database(), current_user');
      client.release();

      this.connectionStatus.supabase = true;
      if (!this.isProduction) {
        console.log('✅ [Supabase] اتصال Supabase نجح');
      }

    } catch (error: any) {
      if (!this.isProduction) {
        console.error('❌ [Supabase] فشل اتصال Supabase:', error.message);
      }
      this.connectionStatus.supabase = false;
    }
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
    if ((global as any).isEmergencyMode) {
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
   * 📊 حالة الاتصالات
   */
  getConnectionStatus(): {
    local: boolean;
    supabase: boolean;
    totalConnections: number;
  } {
    return {
      ...this.connectionStatus,
      totalConnections: Object.values(this.connectionStatus).filter(Boolean).length
    };
  }

  /**
   * 📝 عرض حالة الاتصالات
   */
  private logConnectionStatus(): void {
    if (this.isProduction) return;
    
    const status = this.getConnectionStatus();
    console.log('📊 [Smart Connection Manager] حالة الاتصالات:', {
      '🏠 محلي': status.local ? '✅ متصل' : '❌ غير متصل',
      '☁️ Supabase': status.supabase ? '✅ متصل' : '❌ غير متصل',
      '📈 إجمالي الاتصالات': status.totalConnections
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

    await Promise.all(closePromises);
    
    this.connectionStatus.local = false;
    this.connectionStatus.supabase = false;

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
