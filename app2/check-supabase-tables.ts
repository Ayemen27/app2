
import { Client as PgClient } from "pg";
import dotenv from "dotenv";

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkSupabaseTables() {
  const client = new PgClient({
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    log('🔗 متصل بـ Supabase...', colors.blue);

    // الحصول على جميع الجداول
    const result = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    log(`\n📊 الجداول الموجودة في Supabase (${result.rows.length} جدول):`, colors.green);
    log('=' .repeat(60), colors.cyan);

    for (const row of result.rows) {
      // فحص عدد الصفوف في كل جدول
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${row.table_name}"`);
        const rowCount = countResult.rows[0].count;
        log(`📋 ${row.table_name.padEnd(30)} | ${row.column_count} أعمدة | ${rowCount} صف`, colors.cyan);
      } catch (error) {
        log(`📋 ${row.table_name.padEnd(30)} | ${row.column_count} أعمدة | خطأ في العد`, colors.yellow);
      }
    }

    // فحص الجداول المطلوبة
    const requiredTables = [
      "users", "projects", "workers", "worker_types", "suppliers",
      "materials", "fund_transfers", "worker_attendance", 
      "material_purchases", "supplier_payments", "transportation_expenses",
      "worker_transfers", "worker_balances"
    ];

    log(`\n🎯 فحص الجداول المطلوبة:`, colors.green);
    log('=' .repeat(60), colors.cyan);

    for (const table of requiredTables) {
      const exists = result.rows.some(row => row.table_name === table);
      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
        const rowCount = countResult.rows[0].count;
        log(`✅ ${table.padEnd(25)} | موجود | ${rowCount} صف`, colors.green);
      } else {
        log(`❌ ${table.padEnd(25)} | غير موجود`, colors.yellow);
      }
    }

  } catch (error) {
    log(`❌ خطأ: ${(error as Error).message}`, colors.yellow);
  } finally {
    await client.end();
  }
}

checkSupabaseTables().catch(console.error);
