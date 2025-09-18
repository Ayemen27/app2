
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'fs';
import * as schema from "@shared/schema";

// إنشاء رابط قاعدة البيانات من متغيرات البيئة
function createDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    console.log('✅ استخدام DATABASE_URL من متغيرات البيئة');
    const finalUrl = process.env.DATABASE_URL;
    console.log('🔧 Connection string:', finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    return finalUrl;
  }
  
  console.error('❌ DATABASE_URL غير موجود في متغيرات البيئة');
  throw new Error('DATABASE_URL is required');
}

// إعداد SSL للاتصال المحلي
function setupSSLConfig() {
  const connectionString = createDatabaseUrl();
  
  // التحقق من البيئة المحلية
  const isLocalConnection = connectionString.includes('localhost') || 
                           connectionString.includes('127.0.0.1') ||
                           connectionString.includes('@localhost/');
  
  if (isLocalConnection) {
    console.log('🔓 اتصال محلي - تعطيل SSL');
    return false;
  }
  
  // للاتصالات الخارجية - استخدام SSL مع تجاهل جميع مشاكل الشهادات
  console.log('🌐 اتصال خارجي - تفعيل SSL مع تجاهل مشاكل الشهادات');
  return {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined,
    secureProtocol: 'TLSv1_2_method'
  };
}

// تعيين متغير البيئة لتجاهل مشاكل SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = createDatabaseUrl();
const sslConfig = setupSSLConfig();

// تكوين اتصال قاعدة البيانات
export const pool = new Pool({ 
  connectionString,
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
    console.log('✅ نجح الاتصال بقاعدة البيانات');
    console.log('📊 إصدار PostgreSQL:', res.rows[0].version?.split(' ')[0] || 'غير معروف');
    console.log('🗃️ قاعدة البيانات:', res.rows[0].current_database);
    console.log('👤 المستخدم:', res.rows[0].current_user);
    client.release();
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err);
  }
})();
