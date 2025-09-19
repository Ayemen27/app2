

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'fs';
import * as schema from "@shared/schema";
import { envLoader, initializeEnvironment } from './utils/env-loader';

// تهيئة متغيرات البيئة عند تحميل الموديول
initializeEnvironment();

// إنشاء رابط قاعدة البيانات مع الأولوية الصحيحة
function createDatabaseUrl(): string {
  const databaseUrl = envLoader.get('DATABASE_URL');
  
  if (databaseUrl) {
    console.log('✅ تم العثور على DATABASE_URL');
    console.log('🔧 Connection string:', databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    return databaseUrl;
  }
  
  console.error('❌ DATABASE_URL غير موجود في أي من المصادر:');
  console.error('   - ملف .env');
  console.error('   - ecosystem.config.json');
  console.error('   - متغيرات بيئة النظام');
  throw new Error('DATABASE_URL is required');
}

// إعداد SSL للاتصال المحلي
function setupSSLConfig() {
  const connectionString = createDatabaseUrl();
  
  // التحقق من sslmode في connection string
  if (connectionString.includes('sslmode=disable') || connectionString.includes('ssl=false')) {
    console.log('🔓 SSL معطل في connection string - تعطيل SSL');
    return false;
  }
  
  // التحقق من البيئة المحلية
  const isLocalConnection = connectionString.includes('localhost') || 
                           connectionString.includes('127.0.0.1') ||
                           connectionString.includes('@localhost/');
  
  if (isLocalConnection) {
    console.log('🔓 اتصال محلي - تعطيل SSL');
    return false;
  }
  
  // للاتصالات الخارجية - استخدام SSL مع إعدادات مرنة
  console.log('🔐 اتصال خارجي - تفعيل SSL');
  
  // للسيرفر المحلي الخاص، نستخدم إعدادات SSL مرنة
  return {
    rejectUnauthorized: false, // مرونة للشهادات المحلية
    minVersion: 'TLSv1.2' as const
  };
}

const connectionString = createDatabaseUrl();
const sslConfig = setupSSLConfig();

// تكوين اتصال قاعدة البيانات المحلية
const cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]ssl=[^&]*/g, '');

export const pool = new Pool({ 
  connectionString: cleanConnectionString,
  ssl: sslConfig,
  // إعدادات الاتصال المحسنة
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  statement_timeout: 30000,
  query_timeout: 30000
});

export const db = drizzle(pool, { schema });

// اختبار الاتصال عند تحميل الموديول
(async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT version(), current_database(), current_user');
    console.log('✅ نجح الاتصال بقاعدة البيانات المحلية');
    console.log('📊 إصدار PostgreSQL:', res.rows[0].version?.split(' ')[0] || 'غير معروف');
    console.log('🗃️ قاعدة البيانات:', res.rows[0].current_database);
    console.log('👤 المستخدم:', res.rows[0].current_user);
    client.release();
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات المحلية:', err);
  }
})();

