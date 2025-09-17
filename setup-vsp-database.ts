
import { databaseManager } from './server/database-manager';
import { db } from './server/db';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema';

async function setupVSPDatabase() {
  console.log('🚀 بدء إعداد قاعدة البيانات في VSP Server...\n');

  try {
    // 1. فحص الاتصال
    console.log('1️⃣ فحص الاتصال بـ VSP Server...');
    const connectionResult = await databaseManager.checkConnection();
    
    if (!connectionResult.success) {
      console.log('❌ فشل الاتصال بـ VSP Server:', connectionResult.message);
      console.log('💡 تأكد من:');
      console.log('   - صحة DATABASE_URL في متغيرات البيئة');
      console.log('   - تشغيل خدمة PostgreSQL في VSP Server');
      console.log('   - إعدادات الشبكة والـ firewall');
      return;
    }

    console.log('✅ نجح الاتصال بـ VSP Server');

    // 2. فحص قاعدة البيانات الحالية
    console.log('\n2️⃣ فحص معلومات قاعدة البيانات...');
    try {
      const dbInfo = await db.execute(sql`
        SELECT 
          current_database() as database_name,
          current_user as user_name,
          version() as postgres_version,
          inet_server_addr() as server_ip,
          inet_server_port() as server_port
      `);
      
      if (dbInfo.rows?.[0]) {
        const info = dbInfo.rows[0];
        console.log('📊 معلومات قاعدة البيانات:');
        console.log(`   🗃️ اسم قاعدة البيانات: ${info.database_name}`);
        console.log(`   👤 المستخدم: ${info.user_name}`);
        console.log(`   🔢 إصدار PostgreSQL: ${info.postgres_version?.split(' ')[1]}`);
        console.log(`   🌐 عنوان الخادم: ${info.server_ip || 'localhost'}`);
        console.log(`   🔌 المنفذ: ${info.server_port || '5432'}`);
      }
    } catch (error) {
      console.log('⚠️ لا يمكن جلب معلومات قاعدة البيانات');
    }

    // 3. فحص الجداول
    console.log('\n3️⃣ فحص الجداول الموجودة...');
    const tablesResult = await databaseManager.checkTablesExist();
    
    if (tablesResult.success) {
      console.log('✅ جميع الجداول المطلوبة موجودة');
      console.log('📋 الجداول الموجودة:');
      tablesResult.details?.existingTables?.forEach((table: string, index: number) => {
        console.log(`   ${index + 1}. ${table}`);
      });
    } else {
      console.log('⚠️ بعض الجداول مفقودة:', tablesResult.message);
      if (tablesResult.details?.missingTables) {
        console.log('❌ الجداول المفقودة:');
        tablesResult.details.missingTables.forEach((table: string) => {
          console.log(`   - ${table}`);
        });
        
        console.log('\n💡 لإنشاء الجداول المفقودة، قم بتشغيل:');
        console.log('   npx drizzle-kit push');
        console.log('   أو استخدم SQL Explorer في Replit');
      }
    }

    // 4. فحص صلاحيات المستخدم
    console.log('\n4️⃣ فحص صلاحيات المستخدم...');
    try {
      const permissions = await db.execute(sql`
        SELECT 
          has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
          has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect,
          has_schema_privilege(current_user, 'public', 'CREATE') as can_create_tables,
          has_schema_privilege(current_user, 'public', 'USAGE') as can_use_schema
      `);

      const perms = permissions.rows?.[0];
      if (perms) {
        console.log('🔐 صلاحيات المستخدم:');
        console.log(`   🔌 الاتصال: ${perms.can_connect ? '✅' : '❌'}`);
        console.log(`   🏗️ إنشاء قاعدة بيانات: ${perms.can_create ? '✅' : '❌'}`);
        console.log(`   🗃️ إنشاء جداول: ${perms.can_create_tables ? '✅' : '❌'}`);
        console.log(`   👁️ استخدام المخطط: ${perms.can_use_schema ? '✅' : '❌'}`);
      }
    } catch (error) {
      console.log('⚠️ لا يمكن فحص الصلاحيات');
    }

    // 5. اختبار العمليات الأساسية
    console.log('\n5️⃣ اختبار العمليات الأساسية...');
    const operationsResult = await databaseManager.testBasicOperations();
    
    if (operationsResult.success) {
      console.log('✅ جميع العمليات الأساسية تعمل بشكل صحيح');
    } else {
      console.log('❌ خطأ في العمليات الأساسية:', operationsResult.message);
    }

    // 6. تقرير نهائي
    console.log('\n📋 =============== تقرير الإعداد النهائي ===============');
    console.log(`🔌 الاتصال بـ VSP Server: ${connectionResult.success ? '✅ متصل' : '❌ غير متصل'}`);
    console.log(`🗃️ الجداول: ${tablesResult.success ? '✅ مكتملة' : '⚠️ ناقصة'}`);
    console.log(`⚙️ العمليات: ${operationsResult.success ? '✅ تعمل' : '❌ لا تعمل'}`);
    
    if (connectionResult.success && tablesResult.success && operationsResult.success) {
      console.log('🎉 قاعدة البيانات في VSP Server جاهزة تماماً!');
      console.log('🚀 يمكنك الآن تشغيل التطبيق بأمان');
    } else {
      console.log('⚠️ هناك مشاكل تحتاج لحل قبل تشغيل التطبيق');
      console.log('💡 راجع الأخطاء أعلاه واتبع التوجيهات');
    }
    console.log('===============================================');

  } catch (error) {
    console.error('💥 خطأ عام في إعداد قاعدة البيانات:', error);
    console.log('💡 تأكد من:');
    console.log('   1. صحة متغير DATABASE_URL');
    console.log('   2. تشغيل PostgreSQL في VSP Server'); 
    console.log('   3. إعدادات الأمان والشبكة');
  }
}

// تشغيل الإعداد
setupVSPDatabase().then(() => {
  console.log('\n🏁 انتهى إعداد قاعدة البيانات');
  process.exit(0);
}).catch((error) => {
  console.error('💥 خطأ حرج:', error);
  process.exit(1);
});
