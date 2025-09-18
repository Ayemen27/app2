
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function checkLocalDatabase() {
  console.log('🔍 فحص وجود قاعدة بيانات محلية...\n');

  // 1. فحص متغيرات البيئة
  console.log('1️⃣ فحص متغيرات البيئة:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ موجود' : '❌ غير موجود'}`);
  
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const isLocal = url.includes('localhost') || 
                   url.includes('127.0.0.1') || 
                   url.includes('@helium') ||
                   url.includes('@postgres');
    
    console.log(`   النوع: ${isLocal ? '🏠 محلية' : '🌐 خارجية'}`);
    console.log(`   الرابط: ${url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  }

  // 2. فحص الملفات المحلية
  console.log('\n2️⃣ فحص ملفات قاعدة البيانات المحلية:');
  
  const localDbPaths = [
    './database.db',
    './sqlite.db',
    './local.db',
    './data/database.db',
    '/tmp/postgresql',
    './postgres-data',
    process.env.PGDATA || ''
  ].filter(Boolean);

  localDbPaths.forEach(dbPath => {
    const exists = fs.existsSync(dbPath);
    console.log(`   ${dbPath}: ${exists ? '✅ موجود' : '❌ غير موجود'}`);
  });

  // 3. فحص عمليات PostgreSQL المحلية
  console.log('\n3️⃣ فحص عمليات PostgreSQL المحلية:');
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
      const { stdout } = await execPromise('ps aux | grep postgres');
      const processes = stdout.split('\n').filter(line => 
        line.includes('postgres') && !line.includes('grep')
      );
      
      if (processes.length > 0) {
        console.log('   ✅ عمليات PostgreSQL تعمل:');
        processes.slice(0, 3).forEach(process => {
          console.log(`   📋 ${process.substring(0, 80)}...`);
        });
      } else {
        console.log('   ❌ لا توجد عمليات PostgreSQL محلية');
      }
    } catch (error) {
      console.log('   ⚠️ لا يمكن فحص العمليات');
    }
  } catch (error) {
    console.log('   ⚠️ أدوات فحص العمليات غير متوفرة');
  }

  // 4. اختبار الاتصال
  console.log('\n4️⃣ اختبار الاتصال بقاعدة البيانات:');
  
  if (!process.env.DATABASE_URL) {
    console.log('   ❌ لا يمكن الاختبار - DATABASE_URL غير موجود');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    connectionTimeoutMillis: 5000
  });

  try {
    const client = await pool.connect();
    
    // معلومات الخادم
    const serverInfo = await client.query(`
      SELECT 
        version() as version,
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `);

    const info = serverInfo.rows[0];
    console.log('   ✅ نجح الاتصال!');
    console.log(`   📊 PostgreSQL: ${info.version?.split(' ')[1] || 'غير معروف'}`);
    console.log(`   🗃️ قاعدة البيانات: ${info.database}`);
    console.log(`   👤 المستخدم: ${info.user}`);
    console.log(`   🌐 عنوان الخادم: ${info.server_ip || 'محلي'}`);
    console.log(`   🔌 المنفذ: ${info.server_port || 'افتراضي'}`);

    // فحص الجداول
    const tablesResult = await client.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tableCount = tablesResult.rows[0]?.table_count || 0;
    console.log(`   📋 عدد الجداول: ${tableCount}`);

    // تحديد نوع قاعدة البيانات
    const isLocalDatabase = !info.server_ip || 
                           info.server_ip === '127.0.0.1' ||
                           info.server_ip === 'localhost' ||
                           info.database === 'heliumdb';

    console.log(`   🏷️ النوع: ${isLocalDatabase ? '🏠 قاعدة بيانات محلية' : '🌐 قاعدة بيانات خارجية'}`);

    client.release();

  } catch (error) {
    console.log('   ❌ فشل الاتصال:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   💡 السبب المحتمل: لا توجد قاعدة بيانات محلية تعمل');
    } else if (error.message.includes('timeout')) {
      console.log('   💡 السبب المحتمل: انتهت مهلة الاتصال');
    }
  } finally {
    await pool.end();
  }

  // 5. التوصيات
  console.log('\n5️⃣ التوصيات:');
  
  if (process.env.DATABASE_URL?.includes('helium') || 
      process.env.DATABASE_URL?.includes('localhost')) {
    console.log('   🏠 تستخدم قاعدة بيانات محلية');
    console.log('   💡 لإعداد قاعدة بيانات Replit PostgreSQL:');
    console.log('   1. افتح تبويب Database في Replit');
    console.log('   2. انقر على "Create Database"');
    console.log('   3. ستتم إضافة DATABASE_URL تلقائياً');
  } else {
    console.log('   🌐 تستخدم قاعدة بيانات خارجية');
    console.log('   ✅ إعدادك الحالي جيد');
  }

  console.log('\n🏁 انتهى فحص قاعدة البيانات');
}

// تشغيل الفحص
checkLocalDatabase().catch(console.error);
