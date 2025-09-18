
import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'fs';

// إنشاء رابط قاعدة البيانات القديمة (Supabase) من متغيرات البيئة
function createOldDatabaseUrl(): string | null {
  if (process.env.OLD_DB_URL) {
    console.log('✅ استخدام OLD_DB_URL من متغيرات البيئة');
    const finalUrl = process.env.OLD_DB_URL;
    console.log('🔧 Old DB Connection string:', finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    return finalUrl;
  }
  
  console.warn('⚠️ OLD_DB_URL غير موجود في متغيرات البيئة - سيتم استخدام البيانات الافتراضية');
  return null;
}

// التحقق من صحة URL قاعدة البيانات
function validateOldDatabaseUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'postgresql:' || urlObj.protocol === 'postgres:';
  } catch (error: any) {
    console.error('❌ URL قاعدة البيانات القديمة غير صحيح:', error?.message || error);
    return false;
  }
}

// فحص إمكانية الوصول لقاعدة البيانات القديمة
export function isOldDatabaseAvailable(): boolean {
  const url = process.env.OLD_DB_URL;
  return url !== undefined && url !== null && url.trim() !== '' && validateOldDatabaseUrl(url);
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

// تنظيف connection string من معاملات SSL المتضاربة (فقط إذا كان موجود)
const cleanOldConnectionString = oldConnectionString ? 
  oldConnectionString.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]ssl=[^&]*/g, '') : 
  null;

// إنشاء Pool محسن للاتصال بقاعدة البيانات القديمة (فقط إذا كان متاح)
export const oldPool = cleanOldConnectionString ? new Pool({ 
  connectionString: cleanOldConnectionString,
  ssl: oldSSLConfig,
  // إعدادات محسّنة للاتصالات الخارجية مع Supabase
  max: 3, // عدد أقل للاستخدام المؤقت
  min: 0, // عدم إنشاء اتصالات مسبقة
  idleTimeoutMillis: 60000, // زيادة idle timeout
  connectionTimeoutMillis: 10000, // تقليل timeout للكشف السريع عن الأخطاء
  // acquireTimeoutMillis: 15000, // هذا الخيار غير متاح في PoolConfig
  // createTimeoutMillis: 10000, // هذا الخيار غير متاح في PoolConfig
  destroyTimeoutMillis: 5000, // وقت إغلاق الاتصال
  reapIntervalMillis: 1000, // فحص الاتصالات كل ثانية
  createRetryIntervalMillis: 2000, // إعادة المحاولة كل ثانيتين
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 60000, // تقليل statement timeout للكشف السريع عن المشاكل
  query_timeout: 60000, // تقليل query timeout
  application_name: 'migration_tool_v2' // تحديد اسم التطبيق
}) : null;

// إنشاء Drizzle instance للقاعدة القديمة (بدون schema لأننا نقرأ فقط)
export const oldDb = oldPool ? drizzle(oldPool) : null;

// دالة محسنة للحصول على client مع retry logic
export const getOldDbClient = async (retries = 3): Promise<Client> => {
  // التحقق من توفر قاعدة البيانات القديمة
  if (!isOldDatabaseAvailable()) {
    throw new Error('قاعدة البيانات القديمة غير متاحة أو غير مُكوّنة بشكل صحيح');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 محاولة الاتصال ${attempt}/${retries} بقاعدة البيانات القديمة...`);
      
      const client = new Client({
        connectionString: cleanOldConnectionString!,
        ssl: oldSSLConfig,
        connectionTimeoutMillis: 8000, // تقليل timeout للكشف السريع عن المشاكل
        statement_timeout: 30000, // تقليل statement timeout
        query_timeout: 30000, // تقليل query timeout
        application_name: 'migration_client_v2'
      });
      
      await client.connect();
      console.log(`✅ نجح الاتصال في المحاولة ${attempt}`);
      return client;
      
    } catch (error: any) {
      console.error(`❌ فشلت المحاولة ${attempt}:`, error.message);
      
      // إذا كانت المشكلة في الشبكة أو DNS، لا تحاول مرة أخرى
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        throw new Error(`قاعدة البيانات القديمة غير قابلة للوصول: ${error.message}`);
      }
      
      if (attempt === retries) {
        throw new Error(`فشل الاتصال بعد ${retries} محاولات: ${error.message}`);
      }
      
      // انتظار متزايد بين المحاولات (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ انتظار ${waitTime}ms قبل المحاولة التالية...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('فشل في جميع محاولات الاتصال');
};

// اختبار الاتصال بقاعدة البيانات القديمة (بدون تنفيذ تلقائي)
export const testOldDatabaseConnection = async (): Promise<{success: boolean, message: string, details?: any}> => {
  if (!isOldDatabaseAvailable()) {
    return {
      success: false,
      message: 'قاعدة البيانات القديمة غير مُكوّنة أو غير متاحة'
    };
  }

  try {
    console.log('🔄 اختبار الاتصال بقاعدة البيانات القديمة...');
    
    const client = await oldPool!.connect();
    const res = await client.query('SELECT version(), current_database(), current_user, inet_server_addr(), inet_server_port()');
    
    // اختبار إضافي لقياس سرعة الاستجابة
    const startTime = Date.now();
    await client.query('SELECT 1 as test');
    const responseTime = Date.now() - startTime;
    
    const details = {
      version: res.rows[0].version?.split(' ')[0] || 'غير معروف',
      database: res.rows[0].current_database,
      user: res.rows[0].current_user,
      host: res.rows[0].inet_server_addr || 'مخفي لأسباب أمنية',
      port: res.rows[0].inet_server_port || 'مخفي لأسباب أمنية',
      responseTime: responseTime
    };
    
    client.release();
    
    console.log('✅ نجح الاتصال بقاعدة البيانات القديمة');
    console.log('📊 التفاصيل:', details);
    
    return {
      success: true,
      message: `نجح الاتصال بقاعدة البيانات القديمة في ${responseTime}ms`,
      details: details
    };
    
  } catch (error: any) {
    console.error('❌ فشل الاتصال بقاعدة البيانات القديمة:', error.message);
    
    return {
      success: false,
      message: `فشل الاتصال بقاعدة البيانات القديمة: ${error.message}`
    };
  }
};

// دالة لإغلاق جميع الاتصالات عند إنهاء التطبيق
export const closeOldDbConnections = async () => {
  try {
    if (oldPool) {
      await oldPool.end();
      console.log('✅ تم إغلاق جميع الاتصالات بقاعدة البيانات القديمة');
    }
  } catch (error) {
    console.error('❌ خطأ في إغلاق اتصالات قاعدة البيانات القديمة:', error);
  }
};

// تنظيف الاتصالات عند إنهاء العملية
process.on('exit', closeOldDbConnections);
process.on('SIGINT', closeOldDbConnections);
process.on('SIGTERM', closeOldDbConnections);
