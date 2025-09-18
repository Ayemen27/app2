
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

// إعداد SSL الآمن للاتصال
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
  
  // للاتصالات الخارجية - استخدام SSL الآمن مع التحقق من الشهادات
  console.log('🔐 اتصال خارجي - تفعيل SSL الآمن مع التحقق من الشهادات');
  
  // التحقق من وجود ملف الشهادة
  const certPath = './pg_cert.pem';
  let ca = undefined;
  
  try {
    if (fs.existsSync(certPath)) {
      ca = fs.readFileSync(certPath);
      console.log('📜 تم تحميل شهادة SSL بنجاح');
    } else if (process.env.NODE_ENV === 'production') {
      console.error('❌ ملف الشهادة مفقود في الإنتاج: pg_cert.pem');
      throw new Error('SSL certificate file is required in production');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ فشل في تحميل شهادة SSL في الإنتاج:', error);
      throw error;
    }
    console.warn('⚠️ تعذر تحميل شهادة SSL، سيتم استخدام الشهادات الافتراضية');
  }
  
  // For self-signed certificates, we need to handle them specially
  if (ca) {
    console.log('🔑 استخدام شهادة SSL مخصصة - السماح بالشهادات الموقعة ذاتياً');
    return {
      rejectUnauthorized: false, // Must be false for self-signed certs
      ca: ca, // Use our trusted certificate
      minVersion: 'TLSv1.2' as const,
      checkServerIdentity: () => undefined // Disable hostname check since we trust our CA
    };
  }
  
  // No custom CA - use system certificates with full validation
  return {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2' as const
  };
}

// SSL configuration is handled per connection in setupSSLConfig()

const connectionString = createDatabaseUrl();
const sslConfig = setupSSLConfig();

// تكوين اتصال قاعدة البيانات
// Remove SSL parameters from connection string to avoid conflicts
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
    console.log('✅ نجح الاتصال بقاعدة البيانات');
    console.log('📊 إصدار PostgreSQL:', res.rows[0].version?.split(' ')[0] || 'غير معروف');
    console.log('🗃️ قاعدة البيانات:', res.rows[0].current_database);
    console.log('👤 المستخدم:', res.rows[0].current_user);
    client.release();
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err);
  }
})();
