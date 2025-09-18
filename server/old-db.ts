
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

// إعداد SSL المحسن للاتصال بـ Supabase
function setupOldDBSSLConfig() {
  // Supabase يتطلب SSL دائماً مع إعدادات مرنة لتجنب مشاكل الاتصال
  console.log('🔐 تفعيل SSL المحسن للاتصال بـ Supabase');
  
  return {
    rejectUnauthorized: false, // استخدام SSL مرن لتجنب مشاكل الشهادات
    ca: undefined, 
    servername: undefined, 
    minVersion: 'TLSv1.2' as const,
    maxVersion: 'TLSv1.3' as const,
    ciphers: undefined // استخدام إعدادات افتراضية
  };
}

const oldConnectionString = createOldDatabaseUrl();
const oldSSLConfig = setupOldDBSSLConfig();

// تنظيف connection string من معاملات SSL المتضاربة
const cleanOldConnectionString = oldConnectionString.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]ssl=[^&]*/g, '');

// إنشاء Pool محسن للاتصال بقاعدة البيانات القديمة
export const oldPool = new Pool({ 
  connectionString: cleanOldConnectionString,
  ssl: oldSSLConfig,
  // إعدادات محسّنة للاتصالات الخارجية مع Supabase
  max: 3, // عدد أقل للاستخدام المؤقت
  min: 1, // اتصال واحد على الأقل جاهز
  idleTimeoutMillis: 60000, // زيادة idle timeout
  connectionTimeoutMillis: 60000, // زيادة connection timeout للاتصالات الخارجية
  acquireTimeoutMillis: 120000, // وقت انتظار للحصول على اتصال
  createTimeoutMillis: 60000, // وقت إنشاء اتصال جديد
  destroyTimeoutMillis: 5000, // وقت إغلاق الاتصال
  reapIntervalMillis: 1000, // فحص الاتصالات كل ثانية
  createRetryIntervalMillis: 2000, // إعادة المحاولة كل ثانيتين
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 120000, // زيادة statement timeout للاستعلامات الطويلة
  query_timeout: 120000, // زيادة query timeout
  application_name: 'migration_tool_v2' // تحديد اسم التطبيق
});

// إنشاء Drizzle instance للقاعدة القديمة (بدون schema لأننا نقرأ فقط)
export const oldDb = drizzle(oldPool);

// دالة محسنة للحصول على client مع retry logic
export const getOldDbClient = async (retries = 3): Promise<Client> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 محاولة الاتصال ${attempt}/${retries} بقاعدة البيانات القديمة...`);
      
      const client = new Client({
        connectionString: cleanOldConnectionString,
        ssl: oldSSLConfig,
        connectionTimeoutMillis: 60000, // زيادة timeout
        statement_timeout: 120000, // زيادة statement timeout
        query_timeout: 120000, // زيادة query timeout
        application_name: 'migration_client_v2'
      });
      
      await client.connect();
      console.log(`✅ نجح الاتصال في المحاولة ${attempt}`);
      return client;
      
    } catch (error) {
      console.error(`❌ فشلت المحاولة ${attempt}:`, error.message);
      
      if (attempt === retries) {
        throw new Error(`فشل الاتصال بعد ${retries} محاولات: ${error.message}`);
      }
      
      // انتظار متزايد بين المحاولات (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ انتظار ${waitTime}ms قبل المحاولة التالية...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('فشل في جميع محاولات الاتصال');
};

// اختبار الاتصال المحسن بقاعدة البيانات القديمة مع retry logic
(async () => {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 محاولة اختبار الاتصال ${retryCount + 1}/${maxRetries}...`);
      
      const client = await oldPool.connect();
      const res = await client.query('SELECT version(), current_database(), current_user, inet_server_addr(), inet_server_port()');
      
      console.log('✅ نجح الاتصال بقاعدة البيانات القديمة (Supabase)');
      console.log('📊 إصدار PostgreSQL (Supabase):', res.rows[0].version?.split(' ')[0] || 'غير معروف');
      console.log('🗃️ قاعدة البيانات القديمة:', res.rows[0].current_database);
      console.log('👤 المستخدم (Supabase):', res.rows[0].current_user);
      console.log('🌐 عنوان الخادم:', res.rows[0].inet_server_addr || 'غير متاح');
      console.log('🔌 منفذ الخادم:', res.rows[0].inet_server_port || 'غير متاح');
      
      // اختبار إضافي لقياس سرعة الاستجابة
      const startTime = Date.now();
      await client.query('SELECT 1 as test');
      const responseTime = Date.now() - startTime;
      console.log(`⚡ زمن الاستجابة: ${responseTime}ms`);
      
      client.release();
      break; // نجح الاتصال، اخرج من الحلقة
      
    } catch (err) {
      retryCount++;
      console.error(`❌ فشل الاتصال (المحاولة ${retryCount}):`, err.message);
      
      if (retryCount >= maxRetries) {
        console.error('🚨 فشل في جميع محاولات الاتصال بقاعدة البيانات القديمة');
        console.error('💡 تحقق من:');
        console.error('  - صحة OLD_DB_URL في ملف .env');
        console.error('  - الاتصال بالإنترنت');
        console.error('  - إعدادات SSL وFirewall');
        console.error('  - حالة خادم Supabase');
      } else {
        // انتظار قبل المحاولة التالية
        const waitTime = Math.min(2000 * retryCount, 10000);
        console.log(`⏳ انتظار ${waitTime}ms قبل المحاولة التالية...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
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
