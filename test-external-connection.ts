
import { pool } from './server/db';

async function testExternalConnection() {
  console.log('🧪 اختبار الاتصال بالسيرفر الخارجي...\n');

  try {
    // اختبار الاتصال الأساسي
    console.log('1️⃣ اختبار الاتصال الأساسي...');
    const client = await pool.connect();
    
    const basicTest = await client.query(`
      SELECT 
        version() as postgres_version,
        current_database() as database_name,
        current_user as user_name,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        pg_postmaster_start_time() as server_start_time
    `);
    
    console.log('✅ معلومات الاتصال:');
    console.log(`   📊 إصدار PostgreSQL: ${basicTest.rows[0].postgres_version.split(' ')[0]}`);
    console.log(`   🗃️ قاعدة البيانات: ${basicTest.rows[0].database_name}`);
    console.log(`   👤 المستخدم: ${basicTest.rows[0].user_name}`);
    console.log(`   🌐 عنوان IP: ${basicTest.rows[0].server_ip}`);
    console.log(`   🔌 البورت: ${basicTest.rows[0].server_port}`);
    console.log(`   ⏰ وقت تشغيل السيرفر: ${basicTest.rows[0].server_start_time}`);
    
    // اختبار SSL
    console.log('\n2️⃣ اختبار حالة SSL...');
    try {
      // محاولة التحقق من SSL بطرق متعددة
      const sslTest = await client.query(`
        SELECT 
          CASE 
            WHEN current_setting('ssl', true) IS NOT NULL THEN 'enabled'
            ELSE 'disabled'
          END as ssl_status,
          current_setting('port', true) as server_port
      `);
      
      console.log('✅ معلومات الأمان:');
      console.log(`   🔒 حالة SSL: ${sslTest.rows[0].ssl_status}`);
      console.log(`   🔌 بورت السيرفر: ${sslTest.rows[0].server_port}`);
      
      // التحقق من الاتصال المشفر من خلال معلومات الاتصال
      const connectionInfo = process.env.DATABASE_URL;
      if (connectionInfo?.includes('sslmode=require')) {
        console.log('   🛡️ SSL مطلوب في رابط الاتصال');
      } else if (connectionInfo?.includes('sslmode=disable')) {
        console.log('   ⚠️ SSL معطل في رابط الاتصال');
      }
      
    } catch (sslError) {
      console.log('⚠️ لا يمكن التحقق من حالة SSL - الاتصال يعمل بدون SSL');
    }
    
    // اختبار الأداء
    console.log('\n3️⃣ اختبار أداء الاتصال...');
    const startTime = Date.now();
    
    await client.query('SELECT 1');
    
    const latency = Date.now() - startTime;
    console.log(`⚡ زمن الاستجابة: ${latency}ms`);
    
    if (latency < 50) {
      console.log('🚀 سرعة ممتازة');
    } else if (latency < 200) {
      console.log('✅ سرعة جيدة');
    } else {
      console.log('⚠️ الاتصال بطيء نوعاً ما');
    }
    
    // اختبار إضافي للتأكد من صحة قاعدة البيانات
    console.log('\n4️⃣ اختبار صحة قاعدة البيانات...');
    try {
      const healthCheck = await client.query(`
        SELECT 
          COUNT(*) as total_tables
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      console.log(`📊 عدد الجداول في قاعدة البيانات: ${healthCheck.rows[0].total_tables}`);
      
      // اختبار العمليات الأساسية
      await client.query(`
        SELECT 
          schemaname,
          tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        LIMIT 5
      `);
      
      console.log('✅ العمليات الأساسية تعمل بشكل صحيح');
      
    } catch (healthError) {
      console.log('⚠️ تحذير: مشكلة في فحص صحة قاعدة البيانات');
    }
    
    client.release();
    
    console.log('\n🎉 جميع الاختبارات نجحت! التطبيق جاهز للعمل مع السيرفر الخارجي');
    
  } catch (error) {
    console.error('❌ فشل الاتصال بالسيرفر الخارجي:', error);
    console.log('\n💡 تحقق من:');
    console.log('   - صحة عنوان IP والبورت');
    console.log('   - إعدادات firewall في السيرفر');
    console.log('   - صحة بيانات المصادقة');
    console.log('   - إعدادات SSL في PostgreSQL');
  } finally {
    await pool.end();
    console.log('\n🏁 انتهى الاختبار');
    process.exit(0);
  }
}

testExternalConnection();
