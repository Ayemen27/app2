
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
    const sslTest = await client.query(`
      SELECT 
        ssl_is_used() as ssl_used,
        ssl_version() as ssl_version,
        ssl_cipher() as ssl_cipher
    `);
    
    if (sslTest.rows[0].ssl_used) {
      console.log('✅ SSL مُفعّل:');
      console.log(`   🔒 نسخة SSL: ${sslTest.rows[0].ssl_version}`);
      console.log(`   🛡️ التشفير: ${sslTest.rows[0].ssl_cipher}`);
    } else {
      console.log('⚠️ SSL غير مُفعّل');
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
