
import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'fs';

// إنشاء رابط قاعدة البيانات القديمة (Supabase) من متغيرات البيئة
function createOldDatabaseUrl(): string {
  if (process.env.OLD_DB_URL) {
    console.log('✅ استخدام OLD_DB_URL من متغيرات البيئة');
    const finalUrl = process.env.OLD_DB_URL;
    console.log('🔧 Old DB Connection string:', finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    return finalUrl;
  }
  
  console.error('❌ OLD_DB_URL غير موجود في متغيرات البيئة');
  throw new Error('OLD_DB_URL is required for data migration');
}

// إعداد SSL للاتصال بـ Supabase
function setupOldDBSSLConfig() {
  const connectionString = createOldDatabaseUrl();
  
  // Supabase يتطلب SSL دائماً
  console.log('🔐 تفعيل SSL للاتصال بـ Supabase');
  
  // للاتصال بـ Supabase - استخدام SSL مع تجاهل مشاكل الشهادات للتبسيط
  return {
    rejectUnauthorized: false, // تجاهل مشاكل الشهادات
    minVersion: 'TLSv1.2' as const
  };
}

const oldConnectionString = createOldDatabaseUrl();
const oldSSLConfig = setupOldDBSSLConfig();

// تنظيف connection string من معاملات SSL المتضاربة
const cleanOldConnectionString = oldConnectionString.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]ssl=[^&]*/g, '');

// إنشاء Pool للاتصال بقاعدة البيانات القديمة
export const oldPool = new Pool({ 
  connectionString: cleanOldConnectionString,
  ssl: oldSSLConfig,
  // إعدادات محسّنة للاتصال بـ Supabase
  max: 5, // عدد أقل من الاتصالات للاستخدام المؤقت
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  statement_timeout: 30000,
  query_timeout: 30000
});

// إنشاء Drizzle instance للقاعدة القديمة (بدون schema لأننا نقرأ فقط)
export const oldDb = drizzle(oldPool);

// دالة للحصول على client مباشر للاستعلامات المخصصة
export const getOldDbClient = async (): Promise<Client> => {
  const client = new Client({
    connectionString: cleanOldConnectionString,
    ssl: oldSSLConfig,
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
    query_timeout: 30000
  });
  
  await client.connect();
  return client;
};

// اختبار الاتصال بقاعدة البيانات القديمة عند تحميل الموديول
(async () => {
  try {
    const client = await oldPool.connect();
    const res = await client.query('SELECT version(), current_database(), current_user');
    console.log('✅ نجح الاتصال بقاعدة البيانات القديمة (Supabase)');
    console.log('📊 إصدار PostgreSQL (Supabase):', res.rows[0].version?.split(' ')[0] || 'غير معروف');
    console.log('🗃️ قاعدة البيانات القديمة:', res.rows[0].current_database);
    console.log('👤 المستخدم (Supabase):', res.rows[0].current_user);
    client.release();
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات القديمة (Supabase):', err);
    console.error('💡 تأكد من صحة OLD_DB_URL في ملف .env');
  }
})();

// دالة لإغلاق جميع الاتصالات عند إنهاء التطبيق
export const closeOldDbConnections = async () => {
  try {
    await oldPool.end();
    console.log('✅ تم إغلاق جميع الاتصالات بقاعدة البيانات القديمة');
  } catch (error) {
    console.error('❌ خطأ في إغلاق اتصالات قاعدة البيانات القديمة:', error);
  }
};

// تنظيف الاتصالات عند إنهاء العملية
process.on('exit', closeOldDbConnections);
process.on('SIGINT', closeOldDbConnections);
process.on('SIGTERM', closeOldDbConnections);
