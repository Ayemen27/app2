
import { Client as PgClient } from "pg";
import dotenv from "dotenv";

// تحميل متغيرات البيئة
dotenv.config({ path: '.env.migration' });

// 🎯 ألوان للتسجيل
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

// 1️⃣ إعداد اتصال قاعدة البيانات القديمة (Supabase)
const oldDb = new PgClient({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2️⃣ إعداد اتصال قاعدة البيانات الجديدة (الخارجية)
const newDb = new PgClient({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 📊 إحصائيات الترحيل
interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

const stats: MigrationStats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0
};

// دالة فحص وجود الجدول
async function tableExists(client: PgClient, tableName: string): Promise<boolean> {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

// دالة الحصول على بنية الجدول
async function getTableSchema(client: PgClient, tableName: string) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

// دالة تنظيف وتحويل البيانات
function cleanValue(value: any, dataType: string): any {
  if (value === null || value === undefined) {
    return null;
  }

  // معالجة التواريخ
  if (dataType.includes('timestamp') || dataType.includes('date')) {
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return value;
  }

  // معالجة الأرقام
  if (dataType.includes('numeric') || dataType.includes('decimal')) {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  // معالجة الأعداد الصحيحة
  if (dataType.includes('integer')) {
    const int = parseInt(value);
    return isNaN(int) ? 0 : int;
  }

  // معالجة البوليان
  if (dataType.includes('boolean')) {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  }

  // معالجة JSON
  if (dataType.includes('json')) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  }

  return value;
}

// دالة ترحيل جدول واحد
async function migrateTable(tableName: string): Promise<void> {
  try {
    log(`\n⏳ جاري ترحيل البيانات من الجدول: ${tableName}...`, colors.blue);

    // فحص وجود الجدول في قاعدة البيانات القديمة
    const oldTableExists = await tableExists(oldDb, tableName);
    if (!oldTableExists) {
      log(`⚠️ الجدول ${tableName} غير موجود في قاعدة البيانات القديمة`, colors.yellow);
      stats.skipped++;
      return;
    }

    // فحص وجود الجدول في قاعدة البيانات الجديدة
    const newTableExists = await tableExists(newDb, tableName);
    if (!newTableExists) {
      log(`⚠️ الجدول ${tableName} غير موجود في قاعدة البيانات الجديدة`, colors.yellow);
      stats.skipped++;
      return;
    }

    // الحصول على بنية الجدول الجديد
    const newTableSchema = await getTableSchema(newDb, tableName);
    const newColumns = newTableSchema.map(col => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES'
    }));

    // فحص البنية أولاً
    log(`🔍 فحص بنية الجدول ${tableName}...`, colors.blue);
    const schemaResult = await oldDb.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    if (schemaResult.rows.length === 0) {
      log(`❌ الجدول ${tableName} غير موجود أو لا يحتوي على أعمدة`, colors.red);
      stats.failed++;
      return;
    }
    
    log(`📋 الجدول ${tableName} يحتوي على ${schemaResult.rows.length} عمود`, colors.cyan);

    // استخراج البيانات من الجدول القديم
    let res;
    try {
      // محاولة مع ترتيب created_at إذا كان موجود
      const hasCreatedAt = schemaResult.rows.some(col => col.column_name === 'created_at');
      const orderBy = hasCreatedAt ? 'ORDER BY created_at ASC' : '';
      
      res = await oldDb.query(`SELECT * FROM ${tableName} ${orderBy}`);
    } catch (error) {
      // إذا فشل، جرب بدون ترتيب
      log(`⚠️ فشل في الاستعلام المرتب، محاولة بدون ترتيب...`, colors.yellow);
      res = await oldDb.query(`SELECT * FROM ${tableName}`);
    }
    
    const rows = res.rows;

    if (rows.length === 0) {
      log(`⚠️ لا توجد بيانات في ${tableName}`, colors.yellow);
      stats.skipped++;
      return;
    }

    log(`📊 تم العثور على ${rows.length} سجل في ${tableName}`, colors.cyan);

    // تحضير الاستعلام للإدخال
    const availableColumns = newColumns.filter(col => 
      rows[0].hasOwnProperty(col.name)
    );

    if (availableColumns.length === 0) {
      log(`⚠️ لا توجد أعمدة متطابقة للجدول ${tableName}`, colors.yellow);
      stats.skipped++;
      return;
    }

    const colNames = availableColumns.map(col => col.name).join(", ");
    const placeholders = availableColumns.map((_, i) => `$${i + 1}`).join(", ");

    let successCount = 0;
    let errorCount = 0;

    // إدخال كل صف في قاعدة البيانات الجديدة
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const values = availableColumns.map(col => 
          cleanValue(row[col.name], col.type)
        );

        await newDb.query(
          `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        successCount++;

        // إظهار التقدم كل 100 سجل
        if ((i + 1) % 100 === 0) {
          log(`   📈 تم ترحيل ${i + 1}/${rows.length} سجل...`, colors.cyan);
        }
      } catch (error) {
        errorCount++;
        log(`   ❌ خطأ في السجل ${i + 1}: ${(error as Error).message}`, colors.red);
        
        // إيقاف الترحيل إذا كان هناك أكثر من 10 أخطاء
        if (errorCount > 10) {
          log(`   🛑 توقف الترحيل بسبب كثرة الأخطاء في ${tableName}`, colors.red);
          break;
        }
      }
    }

    if (successCount > 0) {
      log(`✅ تم ترحيل ${successCount} سجل بنجاح من ${tableName}`, colors.green);
      if (errorCount > 0) {
        log(`⚠️ فشل في ترحيل ${errorCount} سجل من ${tableName}`, colors.yellow);
      }
      stats.success++;
    } else {
      log(`❌ فشل في ترحيل أي سجل من ${tableName}`, colors.red);
      stats.failed++;
    }

  } catch (error) {
    log(`❌ خطأ في ترحيل الجدول ${tableName}: ${(error as Error).message}`, colors.red);
    stats.failed++;
  }
}

// قائمة الجداول المراد ترحيلها (التي تحتوي على بيانات حسب فحص Supabase)
const tables = [
  "users", // يحتوي على 1 صف
  // يمكن إضافة جداول أخرى إذا تم العثور على بيانات لاحقاً
  "projects", 
  "workers",
  "worker_types",
  "suppliers",
  "materials",
  "fund_transfers",
  "worker_attendance",
  "material_purchases",
  "supplier_payments",
  "transportation_expenses",
  "worker_transfers",
  "worker_balances",
  "worker_misc_expenses",
  "daily_expense_summaries",
  "autocomplete_data",
  "print_settings",
  "project_fund_transfers",
  "report_templates"
];

// الدالة الرئيسية
async function main() {
  log('🚀 بدء عملية ترحيل البيانات من Supabase...', colors.bright);
  log('=' .repeat(60), colors.cyan);

  // التحقق من متغيرات البيئة أولاً
  log('🔍 فحص متغيرات البيئة...', colors.blue);
  
  if (!process.env.SUPABASE_DATABASE_URL) {
    log('❌ متغير SUPABASE_DATABASE_URL غير موجود!', colors.red);
    log('💡 تأكد من وجود ملف .env.migration مع الرابط الصحيح', colors.yellow);
    return;
  }
  
  if (!process.env.DATABASE_URL) {
    log('❌ متغير DATABASE_URL غير موجود!', colors.red);
    log('💡 تأكد من وجود ملف .env مع رابط قاعدة البيانات الجديدة', colors.yellow);
    return;
  }

  // عرض معلومات الاتصال (مع إخفاء كلمات المرور)
  const oldUrl = process.env.SUPABASE_DATABASE_URL;
  const newUrl = process.env.DATABASE_URL;
  
  log(`📡 رابط Supabase: ${oldUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`, colors.cyan);
  log(`📡 رابط قاعدة البيانات الجديدة: ${newUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`, colors.cyan);

  try {
    // اختبار الاتصالات
    log('🔗 اختبار الاتصال بقاعدة البيانات القديمة...', colors.blue);
    await oldDb.connect();
    
    // فحص تفصيلي للاتصال
    const oldTest = await oldDb.query('SELECT current_database(), current_user, version()');
    log(`✅ نجح الاتصال بـ Supabase`, colors.green);
    log(`   📊 قاعدة البيانات: ${oldTest.rows[0].current_database}`, colors.cyan);
    log(`   👤 المستخدم: ${oldTest.rows[0].current_user}`, colors.cyan);
    log(`   🔧 الإصدار: ${oldTest.rows[0].version.split(' ')[0]}`, colors.cyan);

    log('🔗 اختبار الاتصال بقاعدة البيانات الجديدة...', colors.blue);
    await newDb.connect();
    
    const newTest = await newDb.query('SELECT current_database(), current_user, version()');
    log(`✅ نجح الاتصال بقاعدة البيانات الجديدة`, colors.green);
    log(`   📊 قاعدة البيانات: ${newTest.rows[0].current_database}`, colors.cyan);
    log(`   👤 المستخدم: ${newTest.rows[0].current_user}`, colors.cyan);
    log(`   🔧 الإصدار: ${newTest.rows[0].version.split(' ')[0]}`, colors.cyan);

    // بدء عملية الترحيل
    log('\n📋 قائمة الجداول المراد ترحيلها:', colors.bright);
    tables.forEach((table, index) => {
      log(`   ${index + 1}. ${table}`, colors.cyan);
    });

    stats.total = tables.length;

    // ترحيل كل جدول
    for (const table of tables) {
      await migrateTable(table);
      
      // استراحة قصيرة بين الجداول
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // عرض الإحصائيات النهائية
    log('\n' + '=' .repeat(60), colors.cyan);
    log('📊 إحصائيات الترحيل النهائية:', colors.bright);
    log(`   📈 إجمالي الجداول: ${stats.total}`, colors.cyan);
    log(`   ✅ نجح: ${stats.success}`, colors.green);
    log(`   ❌ فشل: ${stats.failed}`, colors.red);
    log(`   ⏭️ تم تجاهله: ${stats.skipped}`, colors.yellow);

    if (stats.success === stats.total) {
      log('\n🎉 تم ترحيل جميع البيانات بنجاح!', colors.bright);
    } else if (stats.success > 0) {
      log('\n⚠️ تم الانتهاء من الترحيل مع بعض المشاكل', colors.yellow);
    } else {
      log('\n❌ فشل في ترحيل البيانات', colors.red);
    }

  } catch (error) {
    log(`❌ خطأ فادح أثناء الترحيل: ${(error as Error).message}`, colors.red);
    console.error(error);
  } finally {
    // إغلاق الاتصالات
    try {
      await oldDb.end();
      log('🔌 تم إغلاق الاتصال بقاعدة البيانات القديمة', colors.blue);
    } catch (error) {
      log('⚠️ خطأ في إغلاق الاتصال القديم', colors.yellow);
    }

    try {
      await newDb.end();
      log('🔌 تم إغلاق الاتصال بقاعدة البيانات الجديدة', colors.blue);
    } catch (error) {
      log('⚠️ خطأ في إغلاق الاتصال الجديد', colors.yellow);
    }
  }
}

// التعامل مع إشارات النظام
process.on('SIGINT', async () => {
  log('\n⚠️ تم إيقاف العملية بواسطة المستخدم', colors.yellow);
  await oldDb.end();
  await newDb.end();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log(`❌ خطأ غير متوقع: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});

// تشغيل الدالة الرئيسية
main();
