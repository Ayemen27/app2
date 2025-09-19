import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import { getCredential } from './config/credentials';

// Configure WebSocket for Neon/Supabase serverless connection
// Use native WebSocket if available, otherwise skip WebSocket configuration
if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket;
} else {
  // In Node.js environment, we'll use regular HTTP connections
  console.warn('⚠️ WebSocket غير متوفر، سيتم استخدام HTTP connections');
}

// دالة فحص إتاحة قاعدة البيانات القديمة
export function isOldDatabaseAvailable(): boolean {
  try {
    const supabaseUrl = getCredential('SUPABASE_URL');
    const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
    
    return Boolean(supabaseUrl && supabasePassword && supabaseUrl !== 'https://placeholder.supabase.co');
  } catch {
    return false;
  }
}

// دالة اختبار الاتصال بقاعدة البيانات القديمة
export async function testOldDatabaseConnection() {
  if (!isOldDatabaseAvailable()) {
    return {
      success: false,
      message: "OLD_DB_URL غير مكوّن في متغيرات البيئة",
      details: null
    };
  }

  try {
    const supabaseUrl = getCredential('SUPABASE_URL');
    const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
    const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!project) {
      throw new Error('فشل في استخراج اسم المشروع من SUPABASE_URL');
    }

    const connectionString = `postgresql://postgres.${project}:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
    const testPool = new Pool({ 
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    const client = await testPool.connect();
    
    const startTime = Date.now();
    const result = await client.query('SELECT version(), current_database(), current_user');
    const responseTime = Date.now() - startTime;
    
    client.release();
    await testPool.end();
    
    return {
      success: true,
      message: "تم الاتصال بقاعدة البيانات القديمة بنجاح",
      details: {
        database: result.rows[0].current_database,
        user: result.rows[0].current_user,
        version: result.rows[0].version,
        responseTime,
        host: "مخفي لأسباب أمنية",
        port: "مخفي لأسباب أمنية"
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "فشل الاتصال بقاعدة البيانات القديمة",
      details: null
    };
  }
}

// دالة الحصول على عميل قاعدة البيانات القديمة
export async function getOldDbClient(maxRetries: number = 3): Promise<any> {
  if (!isOldDatabaseAvailable()) {
    throw new Error("قاعدة البيانات القديمة غير مكوّنة");
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 محاولة الاتصال ${attempt}/${maxRetries} بقاعدة البيانات القديمة...`);
      
      const supabaseUrl = getCredential('SUPABASE_URL');
      const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
      
      // بناء connection string للاتصال بـ Supabase
      const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      if (!project) {
        throw new Error('فشل في استخراج اسم المشروع من SUPABASE_URL');
      }

      const connectionString = `postgresql://postgres.${project}:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
      
      console.log(`🔗 Connection: ${connectionString.replace(supabasePassword, '***')}`);
      
      const pool = new Pool({ 
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      });
      
      const client = await pool.connect();
      
      // اختبار الاتصال
      await client.query('SELECT 1');
      
      console.log('✅ نجح الاتصال مع قاعدة البيانات القديمة (Supabase)');
      return client;
      
    } catch (error: any) {
      console.warn(`⚠️ فشل الاتصال مع قاعدة البيانات القديمة (محاولة ${attempt}):`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error('فشل في الاتصال مع قاعدة البيانات القديمة نهائياً');
}

// تكوين اتصال قاعدة البيانات السحابية (إذا كان متوفراً)
let pool: Pool | null = null;
let db: any = null;

if (isOldDatabaseAvailable()) {
  try {
    const supabaseUrl = getCredential('SUPABASE_URL');
    const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
    const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (project) {
      const connectionString = `postgresql://postgres.${project}:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
      pool = new Pool({ connectionString });
      db = drizzle({ client: pool, schema });
    }
  } catch (error) {
    console.warn('⚠️ فشل في تكوين pool قاعدة البيانات القديمة:', error);
  }
}

export { pool, db };