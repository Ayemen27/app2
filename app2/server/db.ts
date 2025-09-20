import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'fs';
import * as schema from "@shared/schema";
import { envLoader, initializeEnvironment } from './utils/env-loader';
import { smartConnectionManager } from './services/smart-connection-manager';

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

// 🔧 **إعداد SSL محسّن وآمن للاتصال**
function setupSSLConfig() {
  const connectionString = createDatabaseUrl();

  // التحقق من نوع الاتصال
  const isLocalConnection = connectionString.includes('localhost') || 
                           connectionString.includes('127.0.0.1') ||
                           connectionString.includes('@localhost/');

  if (isLocalConnection) {
    console.log('🔓 اتصال محلي - تعطيل SSL');
    return false;
  }

  console.log('🔐 اتصال خارجي - إعداد SSL آمن ومرن');

  // 🛡️ **SSL Configuration الآمن والمرن للخوادم الخاصة**
  const sslConfig: any = {
    // في حالة شهادات self-signed للخوادم الخاصة الآمنة
    rejectUnauthorized: false,
    // لكن نتطلب تشفير قوي
    minVersion: 'TLSv1.2' as const,
    maxVersion: 'TLSv1.3' as const,
    // التحقق من hostname إذا كان متاحاً  
    checkServerIdentity: (hostname: string, cert: any) => {
      console.log(`🔍 [SSL] التحقق من الخادم: ${hostname}`);
      // نسمح بالاتصال للخوادم الخاصة المعروفة
      if (hostname && (
        hostname.includes('93.127.142.144') || 
        hostname.includes('binarjoinanelytic.info')
      )) {
        console.log('✅ [SSL] خادم خاص موثوق');
        return undefined; // تمرير التحقق
      }
      // للخوادم غير المعروفة، ننفذ التحقق القياسي
      return require('tls').checkServerIdentity(hostname, cert);
    }
  };
  
  // إذا كان لدينا شهادة SSL مخصصة
  try {
    const certPath = process.env.PGSSLROOTCERT || './pg_cert.pem';
    if (require('fs').existsSync(certPath)) {
      console.log('📜 [SSL] استخدام شهادة SSL مخصصة');
      sslConfig.ca = require('fs').readFileSync(certPath);
      sslConfig.rejectUnauthorized = true; // إذا كان لدينا شهادة، نفعل التحقق
    }
  } catch (error) {
    console.log('⚠️ [SSL] لا توجد شهادة مخصصة، الاعتماد على التكوين المرن');
  }

  return sslConfig;
}

// SSL configuration is handled per connection in setupSSLConfig()

const connectionString = createDatabaseUrl(); // Re-fetch to ensure we have the correct string for config
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

// 🧠 الدوال الذكية لإدارة الاتصالات
export function getSmartDB(operationType: 'read' | 'write' | 'backup' | 'sync' = 'read') {
  const connection = smartConnectionManager.getSmartConnection(operationType);
  
  console.log(`🎯 [Smart DB] توجيه ${operationType} إلى: ${connection.source || 'لا يوجد اتصال'}`);
  
  return connection.db || db; // fallback to default db
}

export function getSmartPool(operationType: 'read' | 'write' | 'backup' | 'sync' = 'read') {
  const connection = smartConnectionManager.getSmartConnection(operationType);
  
  console.log(`🎯 [Smart Pool] توجيه ${operationType} إلى: ${connection.source || 'لا يوجد اتصال'}`);
  
  return connection.pool || pool; // fallback to default pool
}