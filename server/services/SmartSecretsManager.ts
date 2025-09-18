/**
 * نظام إدارة المفاتيح السرية الذكي والتلقائي
 * يعمل بذكاء لمزامنة المفاتيح بين ملف .env و Replit Secrets و process.env
 * بدون تدخل يدوي
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

interface SecretConfig {
  name: string;
  description: string;
  defaultValue?: string;
  generateSecure?: boolean;
  length?: number;
}

export class SmartSecretsManager {
  private static instance: SmartSecretsManager;
  private envFilePath: string;
  
  // تكوين المفاتيح المطلوبة
  private requiredSecrets: SecretConfig[] = [
    {
      name: 'JWT_ACCESS_SECRET',
      description: 'مفتاح JWT للوصول',
      generateSecure: true,
      length: 128
    },
    {
      name: 'JWT_REFRESH_SECRET',
      description: 'مفتاح JWT للتحديث',
      generateSecure: true,
      length: 128
    },
    {
      name: 'ENCRYPTION_KEY',
      description: 'مفتاح التشفير العام',
      generateSecure: true,
      length: 128
    },
    {
      name: 'DATABASE_URL',
      description: 'رابط قاعدة بيانات app2data',
      generateSecure: false,
      defaultValue: 'postgresql://user:pass@host:5432/app2data'
    }
  ];

  constructor() {
    this.envFilePath = join(process.cwd(), '.env');
  }

  public static getInstance(): SmartSecretsManager {
    if (!SmartSecretsManager.instance) {
      SmartSecretsManager.instance = new SmartSecretsManager();
    }
    return SmartSecretsManager.instance;
  }

  /**
   * إنشاء مفتاح آمن عشوائي
   */
  private generateSecureKey(length: number = 64): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * قراءة ملف .env
   */
  private readEnvFile(): { [key: string]: string } {
    const envVars: { [key: string]: string } = {};
    
    try {
      if (existsSync(this.envFilePath)) {
        const content = readFileSync(this.envFilePath, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            const value = valueParts.join('=');
            envVars[key.trim()] = value.trim();
          }
        }
      }
    } catch (error) {
      console.error('خطأ في قراءة ملف .env:', error);
    }
    
    return envVars;
  }

  /**
   * كتابة ملف .env
   */
  private writeEnvFile(envVars: { [key: string]: string }): boolean {
    try {
      let content = '';
      
      for (const [key, value] of Object.entries(envVars)) {
        content += `${key}=${value}\n`;
      }
      
      writeFileSync(this.envFilePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('خطأ في كتابة ملف .env:', error);
      return false;
    }
  }

  /**
   * فحص حالة جميع المفاتيح المطلوبة
   */
  public analyzeSecretsStatus(): {
    inProcessEnv: string[];
    inEnvFile: string[];
    missing: string[];
    needsSync: string[];
    summary: {
      total: number;
      ready: number;
      needsAction: number;
    }
  } {
    const envFileVars = this.readEnvFile();
    const inProcessEnv: string[] = [];
    const inEnvFile: string[] = [];
    const missing: string[] = [];
    const needsSync: string[] = [];

    for (const secret of this.requiredSecrets) {
      const inProcess = !!process.env[secret.name];
      const inFile = !!envFileVars[secret.name];
      
      if (inProcess) {
        inProcessEnv.push(secret.name);
      }
      
      if (inFile) {
        inEnvFile.push(secret.name);
        // إذا كان في الملف وليس في process.env، يحتاج مزامنة
        if (!inProcess) {
          needsSync.push(secret.name);
        }
      }
      
      // إذا لم يكن في أي منهما
      if (!inProcess && !inFile) {
        missing.push(secret.name);
      }
    }

    const total = this.requiredSecrets.length;
    const ready = inProcessEnv.length;
    const needsAction = missing.length + needsSync.length;

    return {
      inProcessEnv,
      inEnvFile,
      missing,
      needsSync,
      summary: {
        total,
        ready,
        needsAction
      }
    };
  }

  /**
   * مزامنة المفاتيح من ملف .env إلى process.env
   */
  private syncFromEnvFile(secretNames: string[]): string[] {
    const envFileVars = this.readEnvFile();
    const synced: string[] = [];
    
    for (const secretName of secretNames) {
      if (envFileVars[secretName]) {
        process.env[secretName] = envFileVars[secretName];
        synced.push(secretName);
        console.log(`🔄 تم مزامنة ${secretName} من .env إلى process.env`);
      }
    }
    
    return synced;
  }

  /**
   * إنشاء وإضافة المفاتيح المفقودة
   */
  private createMissingSecrets(secretNames: string[]): { created: string[], failed: string[] } {
    const envFileVars = this.readEnvFile();
    const created: string[] = [];
    const failed: string[] = [];
    
    for (const secretName of secretNames) {
      try {
        const secretConfig = this.requiredSecrets.find(s => s.name === secretName);
        if (!secretConfig) continue;
        
        let value: string;
        
        if (secretConfig.generateSecure) {
          value = this.generateSecureKey(secretConfig.length || 64);
          console.log(`🔐 تم إنشاء مفتاح آمن جديد: ${secretName}`);
        } else if (secretConfig.defaultValue && secretConfig.name.includes('DATABASE')) {
          // للمتغيرات قاعدة البيانات، تحقق من وجود قيم حقيقية في .env أولاً
          if (envFileVars[secretName] && !envFileVars[secretName].includes('user:pass')) {
            value = envFileVars[secretName];
            console.log(`📋 تم استخدام القيمة الموجودة: ${secretName}`);
          } else {
            console.log(`⚠️ تحذير: ${secretName} يحتاج قيمة حقيقية لقاعدة بيانات app2data`);
            console.log(`💡 قم بإعداد رابط قاعدة البيانات الصحيح`);
            value = secretConfig.defaultValue;
          }
        } else if (secretConfig.defaultValue) {
          value = secretConfig.defaultValue;
          console.log(`📝 تم استخدام القيمة الافتراضية: ${secretName}`);
        } else {
          console.warn(`⚠️ لا توجد قيمة لإنشاء المفتاح: ${secretName}`);
          failed.push(secretName);
          continue;
        }
        
        // إضافة إلى ملف .env
        envFileVars[secretName] = value;
        
        // إضافة إلى process.env فوراً
        process.env[secretName] = value;
        
        created.push(secretName);
        console.log(`✅ تم إنشاء وإضافة المفتاح: ${secretName}`);
        
      } catch (error) {
        console.error(`❌ فشل في إنشاء المفتاح ${secretName}:`, error);
        failed.push(secretName);
      }
    }
    
    // حفظ التغييرات في ملف .env
    if (created.length > 0) {
      this.writeEnvFile(envFileVars);
    }
    
    return { created, failed };
  }

  /**
   * النظام الذكي الشامل لإدارة المفاتيح تلقائياً
   */
  public async autoManageSecrets(): Promise<{
    success: boolean;
    message: string;
    details: {
      synchronized: string[];
      created: string[];
      failed: string[];
      alreadyReady: string[];
    };
    summary: {
      total: number;
      processed: number;
      errors: number;
    }
  }> {
    console.log('🚀 بدء النظام الذكي لإدارة المفاتيح السرية...');
    
    const analysis = this.analyzeSecretsStatus();
    
    console.log(`📊 تحليل الوضع الحالي:`);
    console.log(`   • إجمالي المفاتيح المطلوبة: ${analysis.summary.total}`);
    console.log(`   • جاهزة في process.env: ${analysis.inProcessEnv.length}`);
    console.log(`   • موجودة في .env فقط: ${analysis.inEnvFile.length - analysis.inProcessEnv.length}`);
    console.log(`   • مفقودة كلياً: ${analysis.missing.length}`);
    console.log(`   • تحتاج مزامنة: ${analysis.needsSync.length}`);
    
    let synchronized: string[] = [];
    let created: string[] = [];
    let failed: string[] = [];
    const alreadyReady = analysis.inProcessEnv;
    
    // الخطوة 1: مزامنة المفاتيح الموجودة في .env
    if (analysis.needsSync.length > 0) {
      console.log('🔄 مزامنة المفاتيح من .env...');
      synchronized = this.syncFromEnvFile(analysis.needsSync);
    }
    
    // الخطوة 2: إنشاء المفاتيح المفقودة
    if (analysis.missing.length > 0) {
      console.log('🔐 إنشاء المفاتيح المفقودة...');
      const result = this.createMissingSecrets(analysis.missing);
      created = result.created;
      failed = result.failed;
    }
    
    const totalProcessed = synchronized.length + created.length;
    const success = failed.length === 0 && totalProcessed + alreadyReady.length === analysis.summary.total;
    
    let message: string;
    if (success) {
      if (totalProcessed === 0) {
        message = 'جميع المفاتيح السرية جاهزة ومتزامنة';
      } else {
        message = `تم معالجة ${totalProcessed} مفتاح بنجاح - النظام جاهز`;
      }
    } else {
      message = `تم معالجة ${totalProcessed} من ${analysis.summary.needsAction} مفتاح - ${failed.length} أخطاء`;
    }
    
    console.log(`🎯 النتيجة: ${message}`);
    
    return {
      success,
      message,
      details: {
        synchronized,
        created,
        failed,
        alreadyReady
      },
      summary: {
        total: analysis.summary.total,
        processed: totalProcessed,
        errors: failed.length
      }
    };
  }

  /**
   * إعادة تحليل سريع للوضع الحالي
   */
  public getQuickStatus(): {
    allReady: boolean;
    readyCount: number;
    totalCount: number;
    missingKeys: string[];
  } {
    const analysis = this.analyzeSecretsStatus();
    
    return {
      allReady: analysis.summary.needsAction === 0,
      readyCount: analysis.inProcessEnv.length,
      totalCount: analysis.summary.total,
      missingKeys: [...analysis.missing, ...analysis.needsSync]
    };
  }

  /**
   * تهيئة شاملة عند بدء التشغيل
   */
  public async initializeOnStartup(): Promise<boolean> {
    try {
      console.log('🔄 تهيئة نظام المفاتيح السرية عند بدء التشغيل...');
      
      // تحقق من البيئة (Production/Development)
      const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      if (isProd) {
        console.log('🌐 النشر على Vercel - سيتم استخدام متغيرات البيئة من Vercel');
        return this.validateProductionEnvironment();
      }
      
      const result = await this.autoManageSecrets();
      
      if (result.success) {
        console.log('✅ تم تهيئة جميع المفاتيح السرية بنجاح');
        return true;
      } else {
        console.warn('⚠️ تمت التهيئة مع بعض المشاكل:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ فشل في تهيئة نظام المفاتيح السرية:', error);
      return false;
    }
  }

  /**
   * فحص متغيرات البيئة في الإنتاج (Vercel)
   */
  private validateProductionEnvironment(): boolean {
    const requiredForProduction = [
      'DATABASE_URL', 
      'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'
    ];
    
    const missing: string[] = [];
    for (const key of requiredForProduction) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
    
    if (missing.length === 0) {
      console.log('✅ جميع المتغيرات البيئية متاحة في بيئة الإنتاج');
      return true;
    } else {
      console.error(`❌ متغيرات مفقودة في بيئة الإنتاج: ${missing.join(', ')}`);
      console.error('💡 تأكد من إعدادات قاعدة البيانات app2data والمتغيرات البيئية');
      return false;
    }
  }
}

// تصدير مثيل واحد للاستخدام العام
export const smartSecretsManager = SmartSecretsManager.getInstance();

// إضافة دالة مساعدة للحصول على رابط قاعدة البيانات
export function getDatabaseUrl(): string {
  // استخدام قاعدة البيانات app2data
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL غير موجودة في متغيرات البيئة');
  }
  return url;
}