import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon/Supabase serverless connection
neonConfig.webSocketConstructor = ws;

// إنشاء رابط قاعدة البيانات من متغيرات البيئة
function createDatabaseUrl(): string {
  // استخدام DATABASE_URL من متغيرات البيئة إذا كانت متوفرة
  if (process.env.DATABASE_URL) {
    console.log('✅ استخدام DATABASE_URL من متغيرات البيئة');
    return process.env.DATABASE_URL;
  }
  
  // إنشاء رابط من متغيرات البيئة المنفصلة
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'app2data';
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB || 'app2data';
  
  if (password) {
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    console.log('✅ إنشاء رابط اتصال من متغيرات البيئة المنفصلة');
    return connectionString;
  }
  
  console.error('❌ لم يتم العثور على بيانات الاتصال بقاعدة البيانات');
  console.error('⚠️ يرجى تعيين DATABASE_URL أو متغيرات POSTGRES_*');
  throw new Error('بيانات الاتصال بقاعدة البيانات مفقودة');
}

const connectionString = createDatabaseUrl();

// تكوين اتصال قاعدة البيانات
export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });