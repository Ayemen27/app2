// سكريبت لفحص البيانات في Supabase بالتفصيل
import { Client } from 'pg';
import fs from 'fs';

// إعدادات الاتصال بـ Supabase
const supabaseConnectionString = "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

// الجداول التشغيلية المهمة التي نريد فحصها
const OPERATIONAL_TABLES = [
  'workers', 'projects', 'materials', 'suppliers',
  'worker_attendance', 'material_purchases', 'supplier_payments',
  'fund_transfers', 'daily_expenses', 'equipment'
];

// الجداول الخلفية/النظام التي نتوقع أن تكون منقولة
const SYSTEM_TABLES = [
  'users', 'auth_user_sessions', 'ai_system_logs', 'ai_system_metrics',
  'notifications', 'system_events', 'autocomplete_data'
];

async function createSecureConnection() {
  console.log('🔗 إنشاء اتصال آمن بـ Supabase...');
  
  const config = {
    connectionString: supabaseConnectionString,
    ssl: {
      rejectUnauthorized: false, // مرونة مع شهادة Supabase
      ca: fs.existsSync('./pg_cert.pem') ? fs.readFileSync('./pg_cert.pem', 'utf8') : undefined
    }
  };

  const client = new Client(config);
  await client.connect();
  console.log('✅ تم الاتصال بـ Supabase');
  return client;
}

async function checkTableExists(client, tableName) {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.warn(`⚠️ خطأ في فحص وجود الجدول ${tableName}:`, error.message);
    return false;
  }
}

async function getRowCount(client, tableName) {
  try {
    const exists = await checkTableExists(client, tableName);
    if (!exists) {
      return { exists: false, count: 0, error: 'Table does not exist' };
    }

    const result = await client.query(`SELECT COUNT(*) as count FROM public."${tableName}"`);
    return { 
      exists: true, 
      count: parseInt(result.rows[0].count, 10),
      error: null 
    };
  } catch (error) {
    return { 
      exists: false, 
      count: 0, 
      error: error.message 
    };
  }
}

async function getSampleData(client, tableName, limit = 5) {
  try {
    const exists = await checkTableExists(client, tableName);
    if (!exists) {
      return { exists: false, data: [], error: 'Table does not exist' };
    }

    const result = await client.query(`SELECT * FROM public."${tableName}" LIMIT $1`, [limit]);
    return { 
      exists: true, 
      data: result.rows,
      error: null,
      columns: result.fields ? result.fields.map(f => f.name) : []
    };
  } catch (error) {
    return { 
      exists: false, 
      data: [], 
      error: error.message,
      columns: []
    };
  }
}

async function getAllTables(client) {
  try {
    const result = await client.query(`
      SELECT table_name, 
             (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في جلب قائمة الجداول:', error.message);
    return [];
  }
}

async function analyzeSupabaseData() {
  console.log('🚀 بدء تحليل بيانات Supabase...\n');
  
  let client;
  try {
    client = await createSecureConnection();
    
    // 1. فحص جميع الجداول
    console.log('📊 1. فحص جميع الجداول في Supabase:');
    const allTables = await getAllTables(client);
    console.log(`✅ العدد الإجمالي: ${allTables.length} جدول\n`);
    
    // 2. فحص الجداول التشغيلية
    console.log('🏗️ 2. فحص الجداول التشغيلية:');
    const operationalResults = {};
    let totalOperationalRows = 0;
    
    for (const tableName of OPERATIONAL_TABLES) {
      const result = await getRowCount(client, tableName);
      operationalResults[tableName] = result;
      
      if (result.exists && result.count > 0) {
        console.log(`✅ ${tableName}: ${result.count} صف`);
        totalOperationalRows += result.count;
      } else if (result.exists && result.count === 0) {
        console.log(`⚠️ ${tableName}: موجود لكن فارغ (0 صف)`);
      } else {
        console.log(`❌ ${tableName}: غير موجود - ${result.error}`);
      }
    }
    
    console.log(`📊 إجمالي البيانات التشغيلية: ${totalOperationalRows} صف\n`);
    
    // 3. فحص الجداول النظامية
    console.log('⚙️ 3. فحص الجداول النظامية:');
    const systemResults = {};
    let totalSystemRows = 0;
    
    for (const tableName of SYSTEM_TABLES) {
      const result = await getRowCount(client, tableName);
      systemResults[tableName] = result;
      
      if (result.exists && result.count > 0) {
        console.log(`✅ ${tableName}: ${result.count} صف`);
        totalSystemRows += result.count;
      } else if (result.exists && result.count === 0) {
        console.log(`⚠️ ${tableName}: موجود لكن فارغ (0 صف)`);
      } else {
        console.log(`❌ ${tableName}: غير موجود - ${result.error}`);
      }
    }
    
    console.log(`📊 إجمالي البيانات النظامية: ${totalSystemRows} صف\n`);
    
    // 4. فحص عينة من البيانات الموجودة
    console.log('📋 4. عينة من البيانات الموجودة:');
    for (const tableName of [...OPERATIONAL_TABLES, ...SYSTEM_TABLES]) {
      const result = operationalResults[tableName] || systemResults[tableName];
      if (result && result.exists && result.count > 0) {
        console.log(`\n📄 عينة من جدول ${tableName}:`);
        const sample = await getSampleData(client, tableName, 3);
        if (sample.exists && sample.data.length > 0) {
          console.log(`   الأعمدة: ${sample.columns.join(', ')}`);
          console.log(`   عدد الصفوف في العينة: ${sample.data.length}`);
          // عرض أول صف كمثال
          if (sample.data[0]) {
            const firstRow = Object.keys(sample.data[0]).reduce((acc, key) => {
              const value = sample.data[0][key];
              acc[key] = typeof value === 'string' && value.length > 50 
                ? value.substring(0, 50) + '...' 
                : value;
              return acc;
            }, {});
            console.log(`   مثال: ${JSON.stringify(firstRow, null, 2).substring(0, 200)}...`);
          }
        }
      }
    }
    
    // 5. ملخص التحليل
    console.log('\n📈 ملخص التحليل:');
    console.log('================');
    console.log(`🗃️ إجمالي الجداول في Supabase: ${allTables.length}`);
    console.log(`🏗️ الجداول التشغيلية الموجودة: ${Object.values(operationalResults).filter(r => r.exists).length}/${OPERATIONAL_TABLES.length}`);
    console.log(`📊 إجمالي البيانات التشغيلية: ${totalOperationalRows} صف`);
    console.log(`⚙️ الجداول النظامية الموجودة: ${Object.values(systemResults).filter(r => r.exists).length}/${SYSTEM_TABLES.length}`);
    console.log(`📊 إجمالي البيانات النظامية: ${totalSystemRows} صف`);
    console.log(`📊 إجمالي البيانات: ${totalOperationalRows + totalSystemRows} صف`);
    
    // تحديد المشكلة
    const missingOperationalTables = OPERATIONAL_TABLES.filter(table => {
      const result = operationalResults[table];
      return !result || !result.exists || result.count === 0;
    });
    
    const presentOperationalTables = OPERATIONAL_TABLES.filter(table => {
      const result = operationalResults[table];
      return result && result.exists && result.count > 0;
    });
    
    console.log('\n🔍 تشخيص المشكلة:');
    console.log('==================');
    if (missingOperationalTables.length > 0) {
      console.log(`❌ الجداول التشغيلية المفقودة أو الفارغة: ${missingOperationalTables.join(', ')}`);
    }
    if (presentOperationalTables.length > 0) {
      console.log(`✅ الجداول التشغيلية الموجودة والمملوءة: ${presentOperationalTables.join(', ')}`);
    }
    
    return {
      allTables,
      operationalResults,
      systemResults,
      totalOperationalRows,
      totalSystemRows,
      missingOperationalTables,
      presentOperationalTables
    };
    
  } catch (error) {
    console.error('❌ خطأ في التحليل:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 تم قطع الاتصال');
    }
  }
}

// تشغيل التحليل
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeSupabaseData()
    .then(() => {
      console.log('\n✅ تم الانتهاء من التحليل');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ فشل التحليل:', error.message);
      process.exit(1);
    });
}

export { analyzeSupabaseData };