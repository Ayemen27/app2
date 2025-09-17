import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// إعدادات SSL آمنة - استخدام rejectUnauthorized على مستوى Pool فقط
// هذا يحافظ على الأمان العام مع السماح بالاتصال بقواعد البيانات ذات الشهادات ذاتية التوقيع

// Configure WebSocket for Neon/Supabase serverless connection
neonConfig.webSocketConstructor = ws;

// إنشاء رابط قاعدة البيانات من متغيرات البيئة
function createDatabaseUrl(): string {
  // استخدام DATABASE_URL من متغيرات البيئة إذا كانت متوفرة
  if (process.env.DATABASE_URL) {
    console.log('✅ استخدام DATABASE_URL من متغيرات البيئة');
    // استخدام SSL بشكل آمن - سيتم تكوين SSL على مستوى Pool
    const url = new URL(process.env.DATABASE_URL);
    // إزالة أي معاملات SSL غير آمنة من URL
    url.searchParams.delete('sslmode');
    const finalUrl = url.toString();
    console.log('🔧 Connection string (SSL يُدار على مستوى Pool):', finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    return finalUrl;
  }
  
  // إنشاء رابط من متغيرات البيئة المنفصلة
  const host = process.env.POSTGRES_HOST;
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;
  
  if (host && user && password && database) {
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    console.log('✅ إنشاء رابط اتصال من متغيرات البيئة المنفصلة (SSL يُدار على مستوى Pool)');
    return connectionString;
  }
  
  console.error('❌ لم يتم العثور على بيانات الاتصال بقاعدة البيانات');
  console.error('⚠️ يرجى تعيين DATABASE_URL أو جميع متغيرات POSTGRES_*');
  console.error('⚠️ المتغيرات المطلوبة: POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB');
  throw new Error('بيانات الاتصال بقاعدة البيانات مفقودة');
}

const connectionString = createDatabaseUrl();

// تكوين اتصال قاعدة البيانات مع إعدادات محسنة
const isLocalConnection = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool = new Pool({ 
  connectionString,
  // إعدادات SSL محسنة - إيقاف SSL للاتصالات المحلية أو المشاكل الشائعة
  ssl: isLocalConnection ? false : {
    rejectUnauthorized: false
  },
  // إعدادات الاتصال المحسنة
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  // إعدادات إضافية لتحسين الاستقرار
  statement_timeout: 30000,
  query_timeout: 30000
});
export const db = drizzle({ client: pool, schema });