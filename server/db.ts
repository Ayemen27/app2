
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'fs';
import * as schema from "@shared/schema";

// إنشاء رابط قاعدة البيانات من متغيرات البيئة
function createDatabaseUrl(): string {
  // الأولوية للقاعدة الخارجية المحددة من المستخدم
  if (process.env.EXTERNAL_DB_HOST) {
    console.log('🌐 استخدام قاعدة البيانات الخارجية');
    const host = process.env.EXTERNAL_DB_HOST;
    const port = process.env.EXTERNAL_DB_PORT || '5432';
    const user = process.env.EXTERNAL_DB_USER;
    const password = process.env.EXTERNAL_DB_PASSWORD;
    const database = process.env.EXTERNAL_DB_NAME;
    
    if (user && password && database) {
      // تنظيف البيانات من المسافات الإضافية
      const cleanUser = user.trim();
      const cleanPassword = password.trim();
      const cleanDatabase = database.trim();
      const cleanHost = host.trim();
      
      const connectionString = `postgresql://${cleanUser}:${cleanPassword}@${cleanHost}:${port}/${cleanDatabase}`;
      console.log('🔧 Connection string:', connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
      return connectionString;
    }
    console.error('❌ بيانات القاعدة الخارجية غير مكتملة');
  }

  // استخدام DATABASE_URL من متغيرات البيئة إذا كانت متوفرة
  if (process.env.DATABASE_URL) {
    console.log('✅ استخدام DATABASE_URL من متغيرات البيئة');
    const finalUrl = process.env.DATABASE_URL;
    console.log('🔧 Connection string:', finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    return finalUrl;
  }
  
  // إنشاء رابط من متغيرات البيئة المنفصلة
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'app2data';
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB || 'app2data';
  
  if (password && database) {
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    console.log('✅ إنشاء رابط اتصال من متغيرات البيئة المنفصلة');
    return connectionString;
  }
  
  console.error('❌ لم يتم العثور على بيانات الاتصال بقاعدة البيانات');
  throw new Error('بيانات الاتصال بقاعدة البيانات مفقودة');
}

// إعداد SSL للاتصال المحلي
function setupSSLConfig() {
  const sslCertPath = '/etc/ssl/certs/pgsql.crt';
  
  // فحص وجود الشهادة المحلية
  if (fs.existsSync(sslCertPath)) {
    try {
      const caCert = fs.readFileSync(sslCertPath, 'utf-8');
      console.log('🔒 استخدام شهادة SSL محلية:', sslCertPath);
      return {
        rejectUnauthorized: true,
        ca: caCert
      };
    } catch (error) {
      console.warn('⚠️ خطأ في قراءة شهادة SSL:', error);
      return false;
    }
  }
  
  // التحقق من البيئة المحلية
  const connectionString = createDatabaseUrl();
  const isLocalConnection = connectionString.includes('localhost') || 
                           connectionString.includes('127.0.0.1') ||
                           connectionString.includes('@app2data/');
  
  if (isLocalConnection) {
    console.log('🔓 اتصال محلي - تعطيل فحص شهادة SSL');
    return {
      rejectUnauthorized: false
    };
  }
  
  // للاتصالات الخارجية - استخدام SSL مع تجاهل شهادات التوقيع الذاتي
  console.log('🌐 اتصال خارجي - تفعيل SSL مع تجاهل الشهادات الذاتية');
  return {
    rejectUnauthorized: false,
    require: true
  };
  
  return false;
}

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
    console.log('✅ نجح الاتصال بقاعدة البيانات app2data');
    console.log('📊 إصدار PostgreSQL:', res.rows[0].version?.split(' ')[0] || 'غير معروف');
    console.log('🗃️ قاعدة البيانات:', res.rows[0].current_database);
    console.log('👤 المستخدم:', res.rows[0].current_user);
    client.release();
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة بيانات app2data:', err);
  }
})();
