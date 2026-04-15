/**
 * نظام إدارة المفاتيح السرية التلقائي
 * يتحقق من وجود المفاتيح المطلوبة ويضيفها تلقائياً إذا لم تكن موجودة
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

interface SecretKey {
  name: string;
  generate: () => string;
  description: string;
}

export class SecretsManager {
  private static instance: SecretsManager;
  private envFilePath: string;
  
  private requiredSecrets: SecretKey[] = [
    {
      name: 'JWT_ACCESS_SECRET',
      generate: () => randomBytes(64).toString('hex'),
      description: 'مفتاح JWT للوصول'
    },
    {
      name: 'JWT_REFRESH_SECRET',
      generate: () => randomBytes(64).toString('hex'),
      description: 'مفتاح JWT للتحديث'
    },
    {
      name: 'ENCRYPTION_KEY',
      generate: () => randomBytes(64).toString('hex'),
      description: 'مفتاح التشفير'
    }
  ];

  constructor() {
    this.envFilePath = join(process.cwd(), '.env');
  }

  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  /**
   * يتحقق من وجود جميع المفاتيح السرية المطلوبة
   */
  public checkRequiredSecrets(): { missing: string[], existing: string[] } {
    const missing: string[] = [];
    const existing: string[] = [];

    for (const secret of this.requiredSecrets) {
      if (!process.env[secret.name]) {
        missing.push(secret.name);
      } else {
        existing.push(secret.name);
      }
    }

    return { missing, existing };
  }

  /**
   * يقرأ ملف .env الحالي
   */
  private readEnvFile(): string {
    try {
      if (existsSync(this.envFilePath)) {
        return readFileSync(this.envFilePath, 'utf-8');
      }
      return '';
    } catch (error) {
      console.error('خطأ في قراءة ملف .env:', error);
      return '';
    }
  }

  /**
   * يكتب ملف .env المحدث
   */
  private writeEnvFile(content: string): boolean {
    try {
      writeFileSync(this.envFilePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('خطأ في كتابة ملف .env:', error);
      return false;
    }
  }

  /**
   * يضيف مفتاح سري جديد إلى ملف .env
   */
  private addSecretToEnvFile(secretName: string, secretValue: string): boolean {
    try {
      let envContent = this.readEnvFile();
      
      // التحقق من وجود المفتاح في الملف
      const secretExists = envContent.includes(`${secretName}=`);
      
      if (!secretExists) {
        // إضافة المفتاح الجديد
        const newLine = envContent.endsWith('\n') || envContent === '' ? '' : '\n';
        envContent += `${newLine}${secretName}=${secretValue}\n`;
        
        if (this.writeEnvFile(envContent)) {
          // تحديث process.env فوراً
          process.env[secretName] = secretValue;
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`خطأ في إضافة المفتاح ${secretName}:`, error);
      return false;
    }
  }

  /**
   * يضيف جميع المفاتيح المفقودة تلقائياً
   */
  public async autoAddMissingSecrets(): Promise<{ added: string[], failed: string[], existing: string[] }> {
    const { missing, existing } = this.checkRequiredSecrets();
    const added: string[] = [];
    const failed: string[] = [];

    console.log('🔐 فحص المفاتيح السرية...');
    console.log(`📋 المفاتيح الموجودة: ${existing.length}`);
    console.log(`❌ المفاتيح المفقودة: ${missing.length}`);

    if (missing.length === 0) {
      console.log('✅ جميع المفاتيح السرية موجودة');
      return { added, failed, existing };
    }

    // إضافة المفاتيح المفقودة
    for (const secretName of missing) {
      const secretData = this.requiredSecrets.find(s => s.name === secretName);
      if (secretData) {
        console.log(`🔧 إضافة المفتاح: ${secretName}`);
        
        if (this.addSecretToEnvFile(secretData.name, secretData.generate())) {
          added.push(secretName);
          console.log(`✅ تم إضافة المفتاح: ${secretName}`);
        } else {
          failed.push(secretName);
          console.log(`❌ فشل في إضافة المفتاح: ${secretName}`);
        }
      } else {
        failed.push(secretName);
        console.log(`❌ لم يتم العثور على بيانات المفتاح: ${secretName}`);
      }
    }

    return { added, failed, existing };
  }

  /**
   * يتحقق ويضيف المفاتيح إذا لزم الأمر عند بدء التطبيق
   */
  public async initializeSecrets(): Promise<boolean> {
    try {
      console.log('🚀 بدء تهيئة نظام المفاتيح السرية...');
      
      const result = await this.autoAddMissingSecrets();
      
      if (result.failed.length > 0) {
        console.error(`❌ فشل في إضافة ${result.failed.length} مفاتيح:`, result.failed);
        return false;
      }

      if (result.added.length > 0) {
        console.log(`✅ تم إضافة ${result.added.length} مفاتيح جديدة بنجاح`);
      }

      console.log('✅ تم تهيئة نظام المفاتيح السرية بنجاح');
      return true;
    } catch (error) {
      console.error('❌ خطأ في تهيئة نظام المفاتيح السرية:', error);
      return false;
    }
  }

  /**
   * يعيد تحميل المفاتيح من ملف .env
   */
  public reloadSecrets(): void {
    try {
      const envContent = this.readEnvFile();
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key] = value;
          }
        }
      }
      
      console.log('✅ تم إعادة تحميل المفاتيح السرية');
    } catch (error) {
      console.error('❌ خطأ في إعادة تحميل المفاتيح:', error);
    }
  }

  /**
   * يعرض حالة جميع المفاتيح المطلوبة
   */
  public getSecretsStatus(): { name: string, exists: boolean, description: string }[] {
    return this.requiredSecrets.map(secret => ({
      name: secret.name,
      exists: !!process.env[secret.name],
      description: secret.description
    }));
  }

  /**
   * يضيف مفتاح سري جديد إلى القائمة المطلوبة
   */
  public addRequiredSecret(name: string, value: string, description: string): void {
    const existingIndex = this.requiredSecrets.findIndex(s => s.name === name);
    
    if (existingIndex >= 0) {
      // تحديث المفتاح الموجود
      this.requiredSecrets[existingIndex] = { name, value, description };
    } else {
      // إضافة مفتاح جديد
      this.requiredSecrets.push({ name, value, description });
    }
    
    console.log(`✅ تم إضافة المفتاح المطلوب: ${name}`);
  }

  /**
   * يزيل مفتاح سري من القائمة المطلوبة
   */
  public removeRequiredSecret(name: string): boolean {
    const initialLength = this.requiredSecrets.length;
    this.requiredSecrets = this.requiredSecrets.filter(s => s.name !== name);
    
    if (this.requiredSecrets.length < initialLength) {
      console.log(`✅ تم إزالة المفتاح المطلوب: ${name}`);
      return true;
    }
    
    return false;
  }
}

// تصدير المثيل الوحيد
export const secretsManager = SecretsManager.getInstance();