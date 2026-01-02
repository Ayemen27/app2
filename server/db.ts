import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'fs';
import * as schema from "@shared/schema";
import { envLoader, initializeEnvironment } from './utils/env-loader';
import { smartConnectionManager } from './services/smart-connection-manager';

// تهيئة متغيرات البيئة عند تحميل الموديول
initializeEnvironment();

// تأكيد توفر متغيرات البيئة
if (!process.env.DATABASE_URL) {
  const envVars = envLoader.getAll();
  if (envVars.DATABASE_URL) {
    process.env.DATABASE_URL = envVars.DATABASE_URL;
  }
}

// التحقق من بيئة الإنتاج
const isProduction = process.env.NODE_ENV === 'production';

// إخفاء المعلومات الحساسة في السجلات
function maskConnectionString(url: string): string {
  return url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/\d+\.\d+\.\d+\.\d+/, '***.***.***.**');
}

// إنشاء رابط قاعدة البيانات مع الأولوية الصحيحة
function createDatabaseUrl(): string {
  const databaseUrl = envLoader.get('DATABASE_URL');

  if (databaseUrl) {
    if (!isProduction) {
      console.log('✅ تم العثور على DATABASE_URL');
      console.log('🔧 Connection:', maskConnectionString(databaseUrl));
    }
    return databaseUrl;
  }

  console.error('❌ DATABASE_URL غير موجود');
  throw new Error('DATABASE_URL is required');
}

// ⚠️ [Absolute-Offline] تعطيل الاعتماد على PostgreSQL تماماً
// سيتم استخدام محاكاة بسيطة للسيرفر لخدمة الملفات فقط
export const pool = { 
  connect: async () => ({
    query: async () => ({ rows: [{ version: 'Offline Mode' }] }),
    release: () => {}
  }),
  on: () => {}
} as any;

export const db = {} as any;

export function getSmartDB() { return db; }
export function getSmartPool() { return pool; }
