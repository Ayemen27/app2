import fs from 'fs';
import path from 'path';

/**
 * نظام قراءة متغيرات البيئة بالأولوية الصحيحة
 * 1. ملف .env
 * 2. ecosystem.config.json
 * 3. متغيرات بيئة النظام
 */
export class EnvironmentLoader {
  private static instance: EnvironmentLoader;
  private envVars: { [key: string]: string } = {};
  private loaded = false;

  private constructor() {}

  static getInstance(): EnvironmentLoader {
    if (!EnvironmentLoader.instance) {
      EnvironmentLoader.instance = new EnvironmentLoader();
    }
    return EnvironmentLoader.instance;
  }

  /**
   * تحميل جميع متغيرات البيئة بالأولوية الصحيحة
   */
  load(): void {
    if (this.loaded) {
      return;
    }

    console.log('🔄 تحميل متغيرات البيئة بالأولوية الصحيحة...');

    // 1. قراءة ملف .env
    this.loadFromEnvFile();

    // 2. قراءة من ecosystem.config.json
    this.loadFromEcosystemConfig();

    // 3. قراءة من متغيرات النظام
    this.loadFromSystemEnv();

    // تطبيق المتغيرات على process.env
    Object.assign(process.env, this.envVars);

    this.loaded = true;
    console.log('✅ تم تحميل متغيرات البيئة بنجاح');
    this.logLoadedVariables();
  }

  /**
   * قراءة ملف .env
   */
  private loadFromEnvFile(): void {
    const envPath = path.join(process.cwd(), '.env');

    if (!fs.existsSync(envPath)) {
      console.log('⚠️ ملف .env غير موجود');
      return;
    }

    try {
      console.log('📄 قراءة متغيرات من ملف .env');
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');

          if (key.trim() && value.trim()) {
            this.envVars[key.trim()] = value.trim();
          }
        }
      }
    } catch (error) {
      console.error('❌ خطأ في قراءة ملف .env:', error);
    }
  }

  /**
   * قراءة من ecosystem.config.json
   */
  private loadFromEcosystemConfig(): void {
    const ecosystemPath = path.join(process.cwd(), 'ecosystem.config.json');

    if (!fs.existsSync(ecosystemPath)) {
      console.log('⚠️ ملف ecosystem.config.json غير موجود');
      return;
    }

    try {
      console.log('📄 قراءة متغيرات من ecosystem.config.json');
      const content = fs.readFileSync(ecosystemPath, 'utf-8');
      const config = JSON.parse(content);

      if (config.apps && config.apps.length > 0) {
        // البحث عن التطبيق الحالي
        const currentApp = config.apps.find((app: any) => 
          app.name === 'app2' || 
          app.script?.includes('server/index.js') ||
          app.cwd?.includes('app2')
        ) || config.apps[0];

        if (currentApp && currentApp.env) {
          for (const [key, value] of Object.entries(currentApp.env)) {
            // فقط إذا لم توجد في .env (أولوية أقل)
            if (!this.envVars[key] && value) {
              this.envVars[key] = String(value);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ خطأ في قراءة ecosystem.config.json:', error);
    }
  }

  /**
   * قراءة من متغيرات النظام
   */
  private loadFromSystemEnv(): void {
    console.log('📄 قراءة متغيرات من بيئة النظام');

    const systemVars = [
      'DATABASE_URL', 'NODE_ENV', 'PORT', 'JWT_ACCESS_SECRET', 
      'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'DOMAIN'
    ];

    for (const key of systemVars) {
      if (!this.envVars[key] && process.env[key]) {
        this.envVars[key] = process.env[key];
      }
    }
  }

  /**
   * عرض المتغيرات المحملة (بدون كشف القيم الحساسة)
   */
  private logLoadedVariables(): void {
    const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN'];

    console.log('📋 المتغيرات المحملة:');
    for (const [key, value] of Object.entries(this.envVars)) {
      const isSensitive = sensitiveKeys.some(sensitive => 
        key.toUpperCase().includes(sensitive)
      );

      if (isSensitive) {
        console.log(`   ${key}: [مخفي]`);
      } else if (key === 'DATABASE_URL') {
        console.log(`   ${key}: ${value.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    }
  }

  /**
   * الحصول على قيمة متغير بيئة
   */
  get(key: string): string | undefined {
    if (!this.loaded) {
      this.load();
    }
    return this.envVars[key] || process.env[key];
  }

  /**
   * التحقق من وجود متغير
   */
  has(key: string): boolean {
    if (!this.loaded) {
      this.load();
    }
    return !!(this.envVars[key] || process.env[key]);
  }

  /**
   * الحصول على جميع المتغيرات
   */
  getAll(): { [key: string]: string } {
    if (!this.loaded) {
      this.load();
    }
    return { ...this.envVars };
  }
}

// تصدير مثيل واحد
export const envLoader = EnvironmentLoader.getInstance();

// دالة مساعدة للتهيئة
export function initializeEnvironment(): void {
  envLoader.load();
}

// دالة للحصول على متغير بيئة
export function getEnvVar(key: string, defaultValue?: string): string {
  return envLoader.get(key) || defaultValue || '';
}