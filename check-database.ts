
import { databaseManager } from './server/database-manager';

async function checkDatabaseStatus() {
  console.log('🔄 بدء فحص حالة قاعدة البيانات...\n');

  try {
    // 1. فحص الاتصال
    console.log('1️⃣ فحص الاتصال بقاعدة البيانات...');
    const connectionResult = await databaseManager.checkConnection();
    
    if (!connectionResult.success) {
      console.log('❌ فشل الاتصال بقاعدة البيانات:', connectionResult.message);
      console.log('💡 تحقق من:');
      console.log('   - صحة DATABASE_URL في متغيرات البيئة');
      console.log('   - تشغيل خدمة قاعدة البيانات');
      console.log('   - إعدادات الشبكة');
      console.log('   - شهادات SSL');
      return;
    }

    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

    // 2. فحص الجداول
    console.log('\n2️⃣ فحص الجداول المطلوبة...');
    const tablesResult = await databaseManager.checkTablesExist();
    
    if (tablesResult.success) {
      console.log('✅ جميع الجداول المطلوبة موجودة');
      console.log('📋 الجداول الموجودة:', tablesResult.details?.existingTables?.length || 0);
    } else {
      console.log('⚠️ بعض الجداول مفقودة:', tablesResult.message);
      if (tablesResult.details?.missingTables?.length > 0) {
        console.log('❌ الجداول المفقودة:');
        tablesResult.details.missingTables.forEach((table: string) => {
          console.log(`   - ${table}`);
        });
        
        console.log('\n💡 لإنشاء الجداول المفقودة:');
        console.log('   npx drizzle-kit push');
      }
    }

    // 3. اختبار العمليات الأساسية (فقط إذا كانت الجداول موجودة)
    if (tablesResult.success) {
      console.log('\n3️⃣ اختبار العمليات الأساسية...');
      const operationsResult = await databaseManager.testBasicOperations();
      
      if (operationsResult.success) {
        console.log('✅ جميع العمليات الأساسية تعمل بشكل صحيح');
      } else {
        console.log('❌ خطأ في العمليات الأساسية:', operationsResult.message);
      }
    }

    // 4. تقرير نهائي
    console.log('\n📋 =============== تقرير الحالة النهائي ===============');
    console.log(`🔌 الاتصال: ${connectionResult.success ? '✅ متصل' : '❌ غير متصل'}`);
    console.log(`🗃️ الجداول: ${tablesResult.success ? '✅ مكتملة' : '⚠️ ناقصة'}`);
    
    if (connectionResult.success && tablesResult.success) {
      console.log('🎉 قاعدة البيانات جاهزة تماماً!');
      console.log('🚀 يمكنك تشغيل التطبيق بأمان');
    } else {
      console.log('⚠️ هناك مشاكل تحتاج للحل');
      console.log('💡 راجع الأخطاء أعلاه واتبع التوجيهات');
    }
    console.log('===========================================\n');

  } catch (error) {
    console.error('💥 خطأ عام في فحص قاعدة البيانات:', error);
    console.log('💡 تأكد من:');
    console.log('   1. صحة متغير DATABASE_URL');
    console.log('   2. تشغيل خدمة قاعدة البيانات'); 
    console.log('   3. إعدادات الأمان والشبكة');
  }
}

// تشغيل الفحص
checkDatabaseStatus().then(() => {
  console.log('🏁 انتهى فحص قاعدة البيانات');
  process.exit(0);
}).catch((error) => {
  console.error('💥 خطأ حرج:', error);
  process.exit(1);
});
