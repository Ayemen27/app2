
import { databaseManager } from './server/database-manager';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function checkDatabaseStatus() {
  console.log('🔄 بدء فحص حالة قاعدة البيانات...\n');

  try {
    // 1. فحص الاتصال بقاعدة البيانات
    console.log('1️⃣ فحص الاتصال بقاعدة البيانات...');
    const connectionResult = await databaseManager.checkConnection();
    
    if (connectionResult.success) {
      console.log('✅ الاتصال بقاعدة البيانات ناجح');
    } else {
      console.log('❌ فشل الاتصال بقاعدة البيانات:', connectionResult.message);
      return;
    }

    // 2. فحص الجداول الموجودة
    console.log('\n2️⃣ فحص الجداول الموجودة...');
    const tablesResult = await databaseManager.checkTablesExist();
    
    if (tablesResult.success) {
      console.log('✅ جميع الجداول المطلوبة موجودة');
      if (tablesResult.details?.existingTables) {
        console.log('📋 الجداول الموجودة:');
        tablesResult.details.existingTables.forEach((table: string, index: number) => {
          console.log(`   ${index + 1}. ${table}`);
        });
      }
    } else {
      console.log('⚠️ بعض الجداول مفقودة:', tablesResult.message);
      if (tablesResult.details?.missingTables) {
        console.log('❌ الجداول المفقودة:');
        tablesResult.details.missingTables.forEach((table: string) => {
          console.log(`   - ${table}`);
        });
      }
    }

    // 3. اختبار العمليات الأساسية
    console.log('\n3️⃣ اختبار العمليات الأساسية...');
    const operationsResult = await databaseManager.testBasicOperations();
    
    if (operationsResult.success) {
      console.log('✅ العمليات الأساسية تعمل بشكل صحيح');
    } else {
      console.log('❌ خطأ في العمليات الأساسية:', operationsResult.message);
    }

    // 4. فحص إضافي لعدد السجلات في كل جدول
    console.log('\n4️⃣ فحص عدد السجلات في الجداول...');
    try {
      const tables = ['projects', 'workers', 'worker_attendance', 'material_purchases', 'daily_expenses'];
      
      for (const tableName of tables) {
        try {
          const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
          const count = result.rows?.[0]?.count || 0;
          console.log(`   📊 ${tableName}: ${count} سجل`);
        } catch (error) {
          console.log(`   ❌ ${tableName}: غير موجود أو خطأ في الوصول`);
        }
      }
    } catch (error) {
      console.log('❌ خطأ في فحص عدد السجلات:', error);
    }

    console.log('\n📋 ملخص الفحص:');
    console.log(`   🔌 الاتصال: ${connectionResult.success ? '✅ متصل' : '❌ غير متصل'}`);
    console.log(`   🗃️ الجداول: ${tablesResult.success ? '✅ مكتملة' : '⚠️ ناقصة'}`);
    console.log(`   ⚙️ العمليات: ${operationsResult.success ? '✅ تعمل' : '❌ لا تعمل'}`);

  } catch (error) {
    console.error('💥 خطأ عام في فحص قاعدة البيانات:', error);
  }
}

// تشغيل الفحص
checkDatabaseStatus().then(() => {
  console.log('\n🏁 انتهى فحص قاعدة البيانات');
  process.exit(0);
}).catch((error) => {
  console.error('💥 خطأ حرج:', error);
  process.exit(1);
});
