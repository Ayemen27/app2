
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function quickDbCheck() {
  console.log('🔍 فحص سريع لقاعدة البيانات...');
  
  try {
    // اختبار الاتصال
    const connectionTest = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ الاتصال بقاعدة البيانات يعمل');
    
    // عدد الجداول
    const tablesCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`📊 عدد الجداول: ${tablesCount[0]?.count}`);
    
    // قائمة الجداول
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('📋 الجداول الموجودة:');
    tables.forEach((table: any) => console.log(`  - ${table.table_name}`));
    
  } catch (error: any) {
    console.error('❌ خطأ في الفحص:', error.message);
  }
  
  process.exit(0);
}

quickDbCheck();
