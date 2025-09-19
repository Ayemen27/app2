
import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { getCredential } from './config/credentials';

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

    const client = new Client({
      host: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: `postgres.${project}`,
      password: supabasePassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    
    const startTime = Date.now();
    await client.connect();
    
    const result = await client.query('SELECT version(), current_database(), current_user');
    const responseTime = Date.now() - startTime;
    
    await client.end();
    
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
export async function getOldDbClient(maxRetries: number = 3): Promise<Client> {
  if (!isOldDatabaseAvailable()) {
    throw new Error("قاعدة البيانات القديمة غير مكوّنة");
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 محاولة الاتصال ${attempt}/${maxRetries} بقاعدة البيانات القديمة...`);
      
      const supabaseUrl = getCredential('SUPABASE_URL');
      const supabasePassword = getCredential('SUPABASE_DATABASE_PASSWORD');
      
      // بناء connection للاتصال بـ Supabase
      const project = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      if (!project) {
        throw new Error('فشل في استخراج اسم المشروع من SUPABASE_URL');
      }

      console.log(`🔗 Connection: postgresql://postgres.${project}:***@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`);
      
      const client = new Client({
        host: 'aws-0-eu-central-1.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        user: `postgres.${project}`,
        password: supabasePassword,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      
      await client.connect();
      
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
      pool = new Pool({
        host: 'aws-0-eu-central-1.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        user: `postgres.${project}`,
        password: supabasePassword,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      db = drizzle(pool, { schema });
    }
  } catch (error) {
    console.warn('⚠️ فشل في تكوين pool قاعدة البيانات القديمة:', error);
  }
}

export { pool, db };
