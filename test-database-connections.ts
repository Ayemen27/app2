
import { Client as PgClient } from "pg";
import dotenv from "dotenv";

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testConnection(name: string, connectionString: string) {
  log(`\n🔗 اختبار الاتصال مع ${name}...`, colors.blue);
  
  const client = new PgClient({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // اختبار استعلام بسيط
    const result = await client.query('SELECT version(), current_database(), current_user');
    const info = result.rows[0];
    
    log(`✅ نجح الاتصال مع ${name}`, colors.green);
    log(`   📊 الإصدار: ${info.version.split(' ')[0]}`, colors.cyan);
    log(`   🗃️ قاعدة البيانات: ${info.current_database}`, colors.cyan);
    log(`   👤 المستخدم: ${info.current_user}`, colors.cyan);
    
    // فحص عدد الجداول
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    log(`   📋 عدد الجداول: ${tablesResult.rows[0].count}`, colors.cyan);
    
    return true;
  } catch (error) {
    log(`❌ فشل الاتصال مع ${name}: ${(error as Error).message}`, colors.red);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  log('🧪 اختبار اتصالات قواعد البيانات', colors.blue);
  log('=' .repeat(50), colors.cyan);

  // اختبار قاعدة البيانات الجديدة
  const newDbOk = await testConnection(
    'قاعدة البيانات الجديدة (الخارجية)',
    process.env.DATABASE_URL!
  );

  // اختبار قاعدة البيانات القديمة (Supabase)
  let oldDbOk = false;
  if (process.env.SUPABASE_DATABASE_URL) {
    oldDbOk = await testConnection(
      'قاعدة البيانات القديمة (Supabase)',
      process.env.SUPABASE_DATABASE_URL
    );
  } else {
    log('\n⚠️ SUPABASE_DATABASE_URL غير محدد في متغيرات البيئة', colors.yellow);
    log('💡 قم بإضافة رابط Supabase في ملف .env.migration', colors.yellow);
  }

  // النتيجة النهائية
  log('\n' + '=' .repeat(50), colors.cyan);
  if (newDbOk && oldDbOk) {
    log('🎉 جميع الاتصالات تعمل بشكل صحيح!', colors.green);
    log('✅ يمكنك الآن تشغيل سكربت الترحيل', colors.green);
  } else if (newDbOk) {
    log('⚠️ قاعدة البيانات الجديدة تعمل، لكن Supabase لا يعمل', colors.yellow);
    log('💡 تحقق من إعدادات Supabase', colors.yellow);
  } else if (oldDbOk) {
    log('⚠️ Supabase يعمل، لكن قاعدة البيانات الجديدة لا تعمل', colors.yellow);
    log('💡 تحقق من إعدادات قاعدة البيانات الخارجية', colors.yellow);
  } else {
    log('❌ فشل في جميع الاتصالات', colors.red);
    log('💡 تحقق من إعدادات الشبكة ومتغيرات البيئة', colors.yellow);
  }
}

main().catch(console.error);
