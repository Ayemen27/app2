import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Configure WebSocket for Neon/Supabase serverless connection - Dynamic import
const wsModule = await import("ws");
neonConfig.webSocketConstructor = wsModule.WebSocket;

// التحقق من وجود رابط قاعدة البيانات القديمة
const connectionString = process.env.OLD_DB_URL || "";

// دالة فحص إتاحة قاعدة البيانات القديمة
export function isOldDatabaseAvailable(): boolean {
  return !!connectionString && connectionString.trim() !== "";
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
    const testPool = new Pool({ connectionString });
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
export async function getOldDbClient() {
  if (!isOldDatabaseAvailable()) {
    throw new Error("قاعدة البيانات القديمة غير مكوّنة");
  }
  
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema });
}

// تكوين اتصال قاعدة البيانات السحابية (إذا كان متوفراً)
export const pool = isOldDatabaseAvailable() ? new Pool({ connectionString }) : null;
export const db = pool ? drizzle({ client: pool, schema }) : null;