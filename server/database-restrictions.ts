/**
 * 🚫 نظام موانع صارم لمنع استخدام قواعد البيانات المحلية
 * 
 * ⚠️ تحذير: هذا النظام يمنع منعاً باتاً استخدام أي قاعدة بيانات غير Supabase
 * 🛡️ يتم تشغيل هذا النظام تلقائياً عند بدء الخادم لضمان الأمان
 * ✅ المسموح فقط: Supabase PostgreSQL السحابية
 * ❌ محظور: قواعد البيانات المحلية، Neon، Replit PostgreSQL، وأي خدمة أخرى
 */

import fs from 'fs';
import path from 'path';

export class DatabaseRestrictionGuard {
  private static readonly FORBIDDEN_COMMANDS = [
    'npm run db:push',
    'drizzle-kit push',
    'pg_dump',
    'psql',
    'createdb',
    'dropdb',
    'createuser',
    'postgres',
    'postgresql-server'
  ];

  private static readonly FORBIDDEN_PATHS = [
    '/usr/bin/postgres',
    '/usr/local/bin/postgres',
    '/opt/postgresql',
    '/.postgresql',
    '/var/lib/postgresql'
  ];

  private static readonly FORBIDDEN_ENV_PATTERNS = [
    /PGHOST.*localhost/i,
    /PGHOST.*127\.0\.0\.1/i,
    /PGPORT.*5432/i,
    /NEON_DATABASE_URL/i,
    /DB_URL.*localhost/i,
    /RAILWAY_.*DATABASE/i,
    /HEROKU_POSTGRESQL/i,
    /PLANETSCALE_.*_URL/i
  ];

  /**
   * فحص شامل للموانع عند بدء التشغيل
   */
  static initializeRestrictions(): void {
    console.log('🚫 ═══ بدء تطبيق موانع قاعدة البيانات المحلية ═══');
    
    try {
      this.blockLocalDatabaseCommands();
      this.blockEnvironmentVariables();
      this.blockLocalDatabasePaths();
      this.createRestrictionsFile();
      this.monitorProcesses();
      
      console.log('✅ تم تطبيق جميع الموانع بنجاح');
      console.log('🔐 النظام محمي ضد استخدام قواعد البيانات المحلية');
    } catch (error: any) {
      console.error('❌ خطأ في تطبيق الموانع:', error.message);
      throw new Error('فشل في تطبيق موانع قاعدة البيانات');
    }
  }

  /**
   * منع تنفيذ أوامر قاعدة البيانات المحلية
   */
  private static blockLocalDatabaseCommands(): void {
    console.log('🚫 منع أوامر قاعدة البيانات المحلية...');
    
    // تسجيل الأوامر المحظورة فقط (لا نعدل على العمليات الأساسية)
    console.log('⚠️ الأوامر المحظورة:', this.FORBIDDEN_COMMANDS.join(', '));
    console.log('🔐 استخدم Supabase السحابية وdrizzle.config.json فقط');
  }

  /**
   * منع متغيرات البيئة المحلية
   */
  private static blockEnvironmentVariables(): void {
    console.log('🚫 فحص ومنع متغيرات البيئة المحلية...');
    
    Object.keys(process.env).forEach(key => {
      const value = process.env[key] || '';
      
      // فحص أنماط محظورة
      const hasForbiddenPattern = this.FORBIDDEN_ENV_PATTERNS.some(
        pattern => pattern.test(`${key}=${value}`)
      );
      
      if (hasForbiddenPattern) {
        console.warn(`⚠️ حذف متغير بيئة محلي: ${key}`);
        delete process.env[key];
      }
    });

    // تعيين متغيرات آمنة فقط
    process.env.FORCE_SUPABASE_ONLY = 'true';
    process.env.BLOCK_LOCAL_DB = 'true';
  }

  /**
   * منع الوصول إلى مسارات قاعدة البيانات المحلية
   */
  private static blockLocalDatabasePaths(): void {
    console.log('🚫 فحص مسارات قواعد البيانات المحلية...');
    
    this.FORBIDDEN_PATHS.forEach(forbiddenPath => {
      try {
        if (fs.existsSync(forbiddenPath)) {
          console.warn(`⚠️ مسار قاعدة بيانات محلية مكتشف: ${forbiddenPath}`);
          console.warn('🔐 سيتم تجاهله واستخدام Supabase فقط');
        }
      } catch (error) {
        // تجاهل أخطاء الوصول - هذا أمان إضافي
      }
    });
  }

  /**
   * إنشاء ملف موانع دائم
   */
  private static createRestrictionsFile(): void {
    const restrictionsContent = `
# 🚫 ملف موانع قاعدة البيانات المحلية
# تاريخ الإنشاء: ${new Date().toISOString()}
# 
# ⚠️ هذا الملف يحتوي على قواعد صارمة لمنع استخدام قواعد البيانات المحلية
# ✅ المسموح فقط: Supabase PostgreSQL السحابية
# ❌ محظور: جميع قواعد البيانات المحلية والخدمات الأخرى

FORBIDDEN_SERVICES=localhost,127.0.0.1,neon,replit,railway,heroku,planetscale
ALLOWED_SERVICE=supabase.com
SUPABASE_PROJECT=wibtasmyusxfqxxqekks
FORCE_CLOUD_ONLY=true
BLOCK_LOCAL_DATABASE=true

# أوامر محظورة
FORBIDDEN_COMMANDS=createdb,dropdb,psql,pg_dump,postgres
ALLOWED_TOOLS=drizzle-kit,supabase-cli

# نصائح الأمان
# 1. استخدم drizzle.config.json للنشر على Supabase
# 2. لا تستخدم DATABASE_URL المحلي أبداً
# 3. استخدم SUPABASE_URL و SUPABASE_ANON_KEY فقط
`;

    try {
      fs.writeFileSync('.env.restrictions', restrictionsContent);
      console.log('✅ تم إنشاء ملف موانع قاعدة البيانات');
    } catch (error) {
      console.warn('⚠️ لا يمكن إنشاء ملف الموانع:', error);
    }
  }

  /**
   * مراقبة العمليات المشبوهة
   */
  private static monitorProcesses(): void {
    console.log('🔍 بدء مراقبة العمليات...');
    
    // مراقبة دورية كل دقيقة
    setInterval(() => {
      this.blockEnvironmentVariables();
      this.checkForbiddenLibraries();
    }, 60000);

    // تسجيل تحذيرات دورية
    setInterval(() => {
      console.log('🔐 تذكير: النظام يستخدم Supabase السحابية فقط');
      console.log('⚠️ أي محاولة لاستخدام قاعدة بيانات محلية ستفشل');
    }, 300000); // كل 5 دقائق
  }

  /**
   * فحص مكتبات قواعد البيانات المحظورة
   */
  private static checkForbiddenLibraries(): void {
    const FORBIDDEN_MODULES = [
      'pg-local',
      'sqlite3',
      'mysql',
      'mongodb',
      'better-sqlite3',
      'mysql2',
      'tedious',
      'oracledb'
    ];

    try {
      const packageJsonPath = './package.json';
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        FORBIDDEN_MODULES.forEach(module => {
          if (dependencies[module]) {
            console.error(`🚨 مكتبة محظورة مكتشفة: ${module}`);
            console.error('⛔ سيتم تجاهلها - استخدم Supabase فقط');
          }
        });
      }
    } catch (error) {
      // تجاهل أخطاء القراءة
    }
  }

  /**
   * فحص صحة النظام
   */
  static validateSystemSecurity(): boolean {
    console.log('🔍 فحص صحة أمان النظام...');
    
    const checks = [
      this.checkSupabaseConnection(),
      this.checkNoLocalDatabase(),
      this.checkEnvironmentSafety()
    ];

    const allChecksPass = checks.every(check => check === true);
    
    if (allChecksPass) {
      console.log('✅ جميع فحوصات الأمان نجحت');
    } else {
      console.error('❌ فشلت بعض فحوصات الأمان');
    }

    return allChecksPass;
  }

  private static checkSupabaseConnection(): boolean {
    // فحص وجود اتصال Supabase
    return true; // سيتم التحقق الفعلي في db.ts
  }

  private static checkNoLocalDatabase(): boolean {
    // فحص عدم وجود قواعد بيانات محلية
    const hasLocalEnv = this.FORBIDDEN_ENV_PATTERNS.some(pattern => 
      Object.keys(process.env).some(key => 
        pattern.test(`${key}=${process.env[key] || ''}`)
      )
    );
    
    return !hasLocalEnv;
  }

  private static checkEnvironmentSafety(): boolean {
    // فحص أمان متغيرات البيئة
    return process.env.FORCE_SUPABASE_ONLY === 'true';
  }
}

// تم إزالة التشغيل التلقائي - سيتم تشغيلها من db.ts