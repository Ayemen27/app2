/**
 * نظام إدارة متغيرات البيئة التلقائي والذكي
 * يتولى إنشاء وإدارة جميع مفاتيح التشفير والمتغيرات المطلوبة تلقائياً
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// المتغيرات المطلوبة مع القيم الافتراضية الذكية
interface EnvironmentVariable {
  key: string;
  description: string;
  required: boolean;
  generator?: () => string;
  defaultValue?: string;
}

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private envPath: string;
  private requiredVariables: EnvironmentVariable[] = [
    {
      key: 'JWT_ACCESS_SECRET',
      description: 'مفتاح JWT للمصادقة',
      required: true,
      generator: () => crypto.randomBytes(32).toString('hex')
    },
    {
      key: 'JWT_REFRESH_SECRET', 
      description: 'مفتاح JWT للتحديث',
      required: false,
      generator: () => crypto.randomBytes(32).toString('hex')
    },
    {
      key: 'ENCRYPTION_KEY',
      description: 'مفتاح تشفير البيانات الحساسة',
      required: true,
      generator: () => crypto.randomBytes(32).toString('hex')
    },
    {
      key: 'SESSION_SECRET',
      description: 'مفتاح تشفير الجلسات',
      required: false,
      generator: () => crypto.randomBytes(32).toString('hex')
    },
    {
      key: 'DATABASE_URL',
      description: 'رابط قاعدة البيانات',
      required: true,
      defaultValue: 'postgresql://user:password@host:5432/newdb'
    },
    {
      key: 'NODE_ENV',
      description: 'بيئة التشغيل',
      required: false,
      defaultValue: 'production'
    }
  ];

  private constructor() {
    this.envPath = path.join(process.cwd(), '.env');
  }

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * فحص المتغيرات المطلوبة (بدون إنشاء تلقائي)
   */
  async validateEnvironmentVariables(): Promise<{
    existing: string[];
    missing: string[];
    status: 'success' | 'failed';
    errors: string[];
  }> {
    try {
      console.log('🔍 فحص متغيرات البيئة المطلوبة...');
      
      const existing: string[] = [];
      const missing: string[] = [];
      const errors: string[] = [];

      // فحص كل متغير مطلوب
      for (const variable of this.requiredVariables) {
        const currentValue = process.env[variable.key];

        if (currentValue && currentValue.length > 0) {
          existing.push(variable.key);
          console.log(`✅ متغير موجود: ${variable.key}`);
        } else if (variable.required) {
          missing.push(variable.key);
          errors.push(`❌ متغير مطلوب مفقود: ${variable.key} (${variable.description})`);
          console.error(`❌ متغير مطلوب مفقود: ${variable.key} - ${variable.description}`);
        } else {
          console.warn(`⚠️ متغير اختياري مفقود: ${variable.key} - ${variable.description}`);
        }
      }

      const status = missing.length === 0 ? 'success' : 'failed';

      if (missing.length > 0) {
        console.error('🚫 ======================================');
        console.error('🚫 متغيرات البيئة المطلوبة مفقودة!');
        console.error('🚫 ======================================');
        errors.forEach(error => console.error(error));
        console.error('🚫 ======================================');
        console.error('💡 لحل هذه المشكلة:');
        console.error('💡 1. أضف المتغيرات المفقودة في ملف .env');
        console.error('💡 2. أو أضفها في Environment Variables');
        console.error('💡 3. تأكد من أن جميع القيم صحيحة وليست فارغة');
        console.error('🚫 ======================================');
      } else {
        console.log('✅ جميع متغيرات البيئة المطلوبة موجودة');
      }

      console.log(`✅ انتهى فحص متغيرات البيئة - الحالة: ${status}`);
      
      return { existing, missing, status, errors };
      
    } catch (error) {
      console.error('❌ خطأ في إدارة متغيرات البيئة:', error);
      return { existing: [], missing: [], status: 'failed', errors: [] };
    }
  }

  /**
   * إنشاء مفتاح تشفير آمن
   */
  generateSecureKey(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * فحص قوة مفتاح التشفير
   */
  validateSecretKey(key: string): {
    isValid: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 0;

    if (!key) {
      issues.push('المفتاح فارغ');
      return { isValid: false, score: 0, issues };
    }

    // طول المفتاح
    if (key.length < 32) {
      issues.push('المفتاح قصير جداً (أقل من 32 حرف)');
    } else if (key.length >= 64) {
      score += 3;
    } else if (key.length >= 32) {
      score += 2;
    }

    // التنوع في الأحرف
    const hasLower = /[a-z]/.test(key);
    const hasUpper = /[A-Z]/.test(key);
    const hasNumbers = /[0-9]/.test(key);
    const hasSpecial = /[^a-zA-Z0-9]/.test(key);

    const varietyScore = [hasLower, hasUpper, hasNumbers, hasSpecial].filter(Boolean).length;
    score += varietyScore;

    // التحقق من الأنماط المشبوهة
    if (key.includes('12345') || key.includes('abcde')) {
      issues.push('يحتوي على أنماط متتالية');
      score -= 1;
    }

    if (key === key.toLowerCase() || key === key.toUpperCase()) {
      issues.push('ينقص التنوع في نوع الأحرف');
    }

    return {
      isValid: issues.length === 0 && score >= 4,
      score,
      issues
    };
  }

  /**
   * الحصول على معلومات حالة متغيرات البيئة
   */
  getEnvironmentStatus(): {
    total: number;
    present: number;
    missing: number;
    generated: number;
    status: 'healthy' | 'needs_attention' | 'critical';
    details: Array<{
      key: string;
      status: 'present' | 'missing' | 'generated';
      required: boolean;
      description: string;
    }>;
  } {
    const details = this.requiredVariables.map(variable => {
      const value = process.env[variable.key];
      let status: 'present' | 'missing' | 'generated' = 'missing';

      if (value) {
        status = value.length >= 32 ? 'generated' : 'present';
      }

      return {
        key: variable.key,
        status,
        required: variable.required,
        description: variable.description
      };
    });

    const present = details.filter(d => d.status === 'present').length;
    const missing = details.filter(d => d.status === 'missing').length;
    const generated = details.filter(d => d.status === 'generated').length;
    const total = details.length;

    const requiredMissing = details.filter(d => d.required && d.status === 'missing').length;
    
    let status: 'healthy' | 'needs_attention' | 'critical' = 'healthy';
    if (requiredMissing > 0) {
      status = 'critical';
    } else if (missing > 0) {
      status = 'needs_attention';
    }

    return {
      total,
      present,
      missing,
      generated,
      status,
      details
    };
  }

  /**
   * تحديث متغير بيئة محدد
   */
  async updateEnvironmentVariable(key: string, value: string): Promise<boolean> {
    try {
      process.env[key] = value;
      
      // تحديث ملف .env
      let envContent = '';
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      const lines = envContent.split('\n');
      const existingLineIndex = lines.findIndex(line => line.startsWith(`${key}=`));

      if (existingLineIndex >= 0) {
        lines[existingLineIndex] = `${key}=${value}`;
      } else {
        lines.push(`${key}=${value}`);
      }

      fs.writeFileSync(this.envPath, lines.join('\n'), 'utf8');
      console.log(`✅ تم تحديث متغير البيئة: ${key}`);
      return true;

    } catch (error) {
      console.error(`❌ خطأ في تحديث متغير البيئة ${key}:`, error);
      return false;
    }
  }

  /**
   * تدوير جميع المفاتيح التلقائية (لأغراض الأمان)
   */
  async rotateSecrets(): Promise<{
    rotated: string[];
    failed: string[];
  }> {
    const rotated: string[] = [];
    const failed: string[] = [];

    const rotatableKeys = this.requiredVariables.filter(v => v.generator);

    for (const variable of rotatableKeys) {
      try {
        const newValue = variable.generator!();
        const success = await this.updateEnvironmentVariable(variable.key, newValue);
        
        if (success) {
          rotated.push(variable.key);
        } else {
          failed.push(variable.key);
        }
      } catch (error) {
        failed.push(variable.key);
        console.error(`❌ فشل في تدوير مفتاح ${variable.key}:`, error);
      }
    }

    console.log(`🔄 تم تدوير ${rotated.length} مفتاح، فشل ${failed.length}`);
    return { rotated, failed };
  }
}

// تصدير مثيل وحيد
export const envManager = EnvironmentManager.getInstance();

// دالة مساعدة للتهيئة السريعة
export async function initializeEnvironment() {
  return await envManager.validateEnvironmentVariables();
}

// دالة فحص سريع
export function checkEnvironmentHealth() {
  return envManager.getEnvironmentStatus();
}