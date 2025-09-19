
import { Client as PgClient } from "pg";
import dotenv from "dotenv";

// تحميل متغيرات البيئة
dotenv.config({ path: '.env.migration' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testSupabaseConnection() {
  log('🔍 اختبار اتصال Supabase...', colors.bright);
  log('=' .repeat(50), colors.cyan);

  // فحص متغيرات البيئة
  log('📋 فحص متغيرات البيئة:', colors.blue);
  
  if (!process.env.SUPABASE_DATABASE_URL) {
    log('❌ SUPABASE_DATABASE_URL غير موجود', colors.red);
    log('💡 أضف الرابط في ملف .env.migration', colors.yellow);
    return;
  }
  
  const url = process.env.SUPABASE_DATABASE_URL;
  const maskedUrl = url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  log(`✅ SUPABASE_DATABASE_URL: ${maskedUrl}`, colors.green);

  // فحص صيغة الرابط
  log('\n🔗 فحص صيغة الرابط:', colors.blue);
  try {
    const urlObj = new URL(url);
    log(`✅ البروتوكول: ${urlObj.protocol}`, colors.green);
    log(`✅ المضيف: ${urlObj.hostname}`, colors.green);
    log(`✅ المنفذ: ${urlObj.port || 'افتراضي'}`, colors.green);
    log(`✅ قاعدة البيانات: ${urlObj.pathname.substring(1)}`, colors.green);
    log(`✅ المستخدم: ${urlObj.username}`, colors.green);
    log(`✅ كلمة المرور: ${'*'.repeat(urlObj.password.length)}`, colors.green);
  } catch (error) {
    log(`❌ صيغة الرابط غير صحيحة: ${(error as Error).message}`, colors.red);
    return;
  }

  // محاولة الاتصال
  log('\n🔌 محاولة الاتصال:', colors.blue);
  const client = new PgClient({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    log('✅ نجح الاتصال!', colors.green);

    // فحص معلومات قاعدة البيانات
    log('\n📊 معلومات قاعدة البيانات:', colors.blue);
    const dbInfo = await client.query('SELECT current_database(), current_user, version()');
    log(`📁 قاعدة البيانات: ${dbInfo.rows[0].current_database}`, colors.cyan);
    log(`👤 المستخدم: ${dbInfo.rows[0].current_user}`, colors.cyan);
    log(`🔧 الإصدار: ${dbInfo.rows[0].version}`, colors.cyan);

    // فحص الجداول
    log('\n📋 فحص الجداول:', colors.blue);
    const tablesResult = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      log('⚠️ لا توجد جداول في قاعدة البيانات', colors.yellow);
    } else {
      log(`✅ تم العثور على ${tablesResult.rows.length} جدول:`, colors.green);
      
      for (const table of tablesResult.rows) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
          const rowCount = countResult.rows[0].count;
          const status = rowCount > 0 ? '📊' : '📋';
          log(`  ${status} ${table.table_name}: ${rowCount} صف (${table.column_count} عمود)`, colors.cyan);
        } catch (error) {
          log(`  ❌ ${table.table_name}: خطأ في العد`, colors.red);
        }
      }
    }

    // فحص الجداول المطلوبة تحديداً
    log('\n🎯 فحص الجداول المطلوبة للترحيل:', colors.blue);
    const requiredTables = [
      "users", "projects", "workers", "worker_types", "suppliers",
      "materials", "fund_transfers", "worker_attendance", 
      "material_purchases", "supplier_payments", "transportation_expenses",
      "worker_transfers", "worker_balances", "worker_misc_expenses"
    ];

    let foundTables = 0;
    let tablesWithData = 0;

    for (const tableName of requiredTables) {
      try {
        const checkResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          )
        `, [tableName]);

        if (checkResult.rows[0].exists) {
          foundTables++;
          const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
          const rowCount = parseInt(countResult.rows[0].count);
          
          if (rowCount > 0) {
            tablesWithData++;
            log(`  ✅ ${tableName}: ${rowCount} صف`, colors.green);
          } else {
            log(`  📋 ${tableName}: فارغ`, colors.yellow);
          }
        } else {
          log(`  ❌ ${tableName}: غير موجود`, colors.red);
        }
      } catch (error) {
        log(`  ❌ ${tableName}: خطأ في الفحص`, colors.red);
      }
    }

    log(`\n📈 الإحصائيات:`, colors.bright);
    log(`  📊 إجمالي الجداول المطلوبة: ${requiredTables.length}`, colors.cyan);
    log(`  ✅ الجداول الموجودة: ${foundTables}`, colors.green);
    log(`  📦 الجداول التي تحتوي على بيانات: ${tablesWithData}`, colors.green);

    if (tablesWithData === 0) {
      log('\n⚠️ تحذير: لا توجد بيانات في أي من الجداول المطلوبة!', colors.yellow);
      log('💡 تأكد من أن رابط Supabase يشير إلى قاعدة البيانات الصحيحة', colors.yellow);
    } else {
      log('\n🎉 ممتاز! يمكن البدء في عملية الترحيل', colors.green);
    }

  } catch (error) {
    log(`❌ فشل الاتصال: ${(error as Error).message}`, colors.red);
    
    if ((error as Error).message.includes('password authentication failed')) {
      log('💡 كلمة المرور غير صحيحة', colors.yellow);
    } else if ((error as Error).message.includes('timeout')) {
      log('💡 انتهت مهلة الاتصال - تحقق من الرابط والشبكة', colors.yellow);
    } else if ((error as Error).message.includes('ENOTFOUND')) {
      log('💡 لا يمكن العثور على الخادم - تحقق من رابط المضيف', colors.yellow);
    }
  } finally {
    await client.end();
  }
}

// تشغيل الاختبار
testSupabaseConnection()
  .then(() => {
    log('\n🏁 انتهى الاختبار', colors.bright);
  })
  .catch((error) => {
    log(`❌ خطأ في الاختبار: ${error.message}`, colors.red);
  });
