
import { Pool } from 'pg';

async function verifyDatabaseConnection() {
  console.log('🔍 التحقق من الاتصال بقاعدة البيانات VSP Server...\n');
  
  // بيانات الاتصال المحددة
  const connectionConfig = {
    host: '93.127.142.144',
    port: 5432,
    database: 'app2data',
    user: 'app2data',
    password: 'Ay**--772283228',
    ssl: false, // تعطيل SSL
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  };

  console.log('📋 بيانات الاتصال:');
  console.log(`   🌐 Host: ${connectionConfig.host}`);
  console.log(`   🔌 Port: ${connectionConfig.port}`);
  console.log(`   🗃️ Database: ${connectionConfig.database}`);
  console.log(`   👤 User: ${connectionConfig.user}`);
  console.log(`   🔒 SSL: ${connectionConfig.ssl ? 'مُفعّل' : 'معطل'}\n`);

  const pool = new Pool(connectionConfig);

  try {
    console.log('1️⃣ محاولة الاتصال...');
    const client = await pool.connect();
    console.log('✅ نجح الاتصال!\n');

    console.log('2️⃣ فحص معلومات الخادم...');
    const serverInfo = await client.query(`
      SELECT 
        version() as postgres_version,
        current_database() as database_name,
        current_user as user_name,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        pg_postmaster_start_time() as server_start_time
    `);

    if (serverInfo.rows[0]) {
      const info = serverInfo.rows[0];
      console.log('📊 معلومات الخادم:');
      console.log(`   🔢 PostgreSQL: ${info.postgres_version?.split(' ')[1] || 'غير معروف'}`);
      console.log(`   🗃️ قاعدة البيانات: ${info.database_name}`);
      console.log(`   👤 المستخدم المتصل: ${info.user_name}`);
      console.log(`   🌐 عنوان الخادم: ${info.server_ip || 'محلي'}`);
      console.log(`   🔌 بورت الخادم: ${info.server_port || connectionConfig.port}`);
      console.log(`   ⏰ وقت تشغيل الخادم: ${info.server_start_time}\n`);
    }

    console.log('3️⃣ فحص الجداول الموجودة...');
    const tablesQuery = await client.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`📋 عدد الجداول الموجودة: ${tablesQuery.rows.length}`);
    
    if (tablesQuery.rows.length > 0) {
      console.log('📝 قائمة الجداول:');
      tablesQuery.rows.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.tablename} (Owner: ${table.tableowner})`);
      });
    } else {
      console.log('⚠️ لا توجد جداول في المخطط العام (public schema)');
    }

    console.log('\n4️⃣ اختبار العمليات الأساسية...');
    
    // اختبار القراءة
    try {
      await client.query('SELECT 1 as test_read');
      console.log('✅ عملية القراءة تعمل');
    } catch (error) {
      console.log('❌ فشل في عملية القراءة:', error);
    }

    // اختبار إنشاء جدول مؤقت
    try {
      await client.query(`
        CREATE TEMP TABLE connection_test (
          id SERIAL PRIMARY KEY,
          test_value TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      await client.query(`
        INSERT INTO connection_test (test_value) 
        VALUES ('اختبار الاتصال بقاعدة البيانات')
      `);
      
      const testResult = await client.query('SELECT * FROM connection_test');
      
      if (testResult.rows.length > 0) {
        console.log('✅ عمليات الكتابة والإنشاء تعمل');
        console.log(`   📝 تم إدراج: ${testResult.rows[0].test_value}`);
      }
      
    } catch (error) {
      console.log('❌ فشل في عملية الكتابة:', error);
    }

    console.log('\n5️⃣ اختبار الأداء...');
    const startTime = Date.now();
    await client.query('SELECT COUNT(*) FROM information_schema.tables');
    const responseTime = Date.now() - startTime;
    
    console.log(`⚡ زمن الاستجابة: ${responseTime}ms`);
    
    if (responseTime < 100) {
      console.log('🚀 أداء ممتاز');
    } else if (responseTime < 500) {
      console.log('✅ أداء جيد');
    } else {
      console.log('⚠️ الأداء بطيء نوعاً ما');
    }

    client.release();
    
    console.log('\n🎉 اكتمل فحص قاعدة البيانات بنجاح!');
    console.log('✅ قاعدة البيانات جاهزة للاستخدام');
    
  } catch (error) {
    console.error('\n❌ فشل الاتصال بقاعدة البيانات:');
    console.error('📍 السبب:', error.message);
    
    if (error.code) {
      console.error('🔴 كود الخطأ:', error.code);
    }
    
    console.log('\n💡 نصائح لحل المشكلة:');
    console.log('   1. تحقق من أن الخادم يعمل ويقبل الاتصالات');
    console.log('   2. تأكد من صحة عنوان IP والبورت');
    console.log('   3. تحقق من إعدادات firewall');
    console.log('   4. تأكد من صحة اسم المستخدم وكلمة المرور');
    console.log('   5. تحقق من إعدادات postgresql.conf و pg_hba.conf');
    
  } finally {
    await pool.end();
    console.log('\n🔚 انتهى الفحص');
    process.exit(0);
  }
}

// تشغيل الفحص
verifyDatabaseConnection().catch(console.error);
