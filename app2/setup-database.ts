
import { db } from './server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  console.log('🚀 بدء إعداد قاعدة البيانات...');
  
  try {
    // 1. اختبار الاتصال
    console.log('🔍 اختبار الاتصال بقاعدة البيانات...');
    const connectionTest = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ نجح الاتصال بقاعدة البيانات');
    
    // 2. فحص الجداول الموجودة
    console.log('🔍 فحص الجداول الموجودة...');
    const existingTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📊 عدد الجداول الموجودة: ${existingTables.length}`);
    if (existingTables.length > 0) {
      console.log('📋 الجداول الموجودة:');
      existingTables.forEach((table: any) => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
    // 3. قراءة وتنفيذ ملف الهجرة إذا لم تكن الجداول موجودة
    if (existingTables.length === 0 || !existingTables.some((t: any) => t.table_name === 'users')) {
      console.log('⚡ تنفيذ هجرة إنشاء الجداول...');
      
      const migrationPath = path.join(process.cwd(), 'migrations', '0000_complete_schema_migration.sql');
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // تقسيم SQL إلى عبارات منفصلة
        const statements = migrationSQL
          .split('-->')
          .map(stmt => stmt.replace(/statement-breakpoint/g, '').trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 تنفيذ ${statements.length} عبارة SQL...`);
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement && statement.length > 10) {
            try {
              await db.execute(sql.raw(statement));
              if (i % 10 === 0 || i === statements.length - 1) {
                console.log(`✅ تم تنفيذ ${i + 1}/${statements.length} عبارة`);
              }
            } catch (error: any) {
              // تجاهل أخطاء الجداول الموجودة مسبقاً
              if (!error.message.includes('already exists')) {
                console.error(`❌ خطأ في العبارة ${i + 1}:`, error.message);
              }
            }
          }
        }
      } else {
        console.log('❌ لم يتم العثور على ملف الهجرة');
      }
    }
    
    // 4. التحقق النهائي من الجداول
    console.log('🔍 التحقق النهائي من الجداول...');
    const finalTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`✅ إجمالي الجداول المنشأة: ${finalTables.length}`);
    
    // 5. فحص جدول المستخدمين بشكل خاص
    const usersTableExists = finalTables.some((t: any) => t.table_name === 'users');
    if (usersTableExists) {
      console.log('✅ جدول المستخدمين موجود ومُعد');
      
      // فحص عدد المستخدمين
      const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      console.log(`👥 عدد المستخدمين: ${userCount[0]?.count || 0}`);
    } else {
      console.log('❌ جدول المستخدمين غير موجود');
    }
    
    console.log('🎉 تم إعداد قاعدة البيانات بنجاح!');
    
  } catch (error: any) {
    console.error('❌ خطأ في إعداد قاعدة البيانات:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

setupDatabase();
