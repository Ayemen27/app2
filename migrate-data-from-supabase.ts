import { Client } from "pg";
import fs from "fs";
import dotenv from "dotenv";

// تحميل متغيرات البيئة
dotenv.config({ path: ".env.migration" });

/*
سكريبت ترحيل بيانات من Supabase -> قاعدة خارجية

الاستخدام:
- ضع هذا الملف في مشروعك على Replit
- اضبط المتغيرات في Secrets/ENV أو ملف .env.migration

متغيرات البيئة:
OLD_DB_URL  - اتصال Supabase (read-only)
NEW_DB_URL  - اتصال قاعدة السيرفر (وجهة)
CA_PATH     - (اختياري) مسار ملف PEM لشهادة الجذر
ALLOW_INSECURE - "true" لتجاهل تحقق الشهادات (غير آمن)
BATCH_SIZE  - عدد الصفوف لكل دفعة (افتراضي 500)
TABLES      - (اختياري) قائمة الجداول مفصولة بفواصل

ملاحظات الأمان:
- الأفضل توفير شهادة جذرية (CA) وترك rejectUnauthorized = true
- ALLOW_INSECURE=true يسمح بالاتصال مع شهادات self-signed (غير مستحسن)
*/

const LOG = {
  info: (s: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${s}`),
  ok: (s: string) => console.log(`\x1b[32m[OK]\x1b[0m ${s}`),
  warn: (s: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${s}`),
  err: (s: string) => console.error(`\x1b[31m[ERR]\x1b[0m ${s}`)
};

const OLD_DB_URL = process.env.OLD_DB_URL;
const NEW_DB_URL = process.env.NEW_DB_URL;
const CA_PATH = process.env.CA_PATH || "";
const ALLOW_INSECURE = process.env.ALLOW_INSECURE === "true";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "500", 10);
const TABLES_ENV = process.env.TABLES || "";

if (!OLD_DB_URL || !NEW_DB_URL) {
  LOG.err("Please set OLD_DB_URL and NEW_DB_URL environment variables.");
  process.exit(1);
}

const DEFAULT_TABLES = [
  "account_balances", "accounts", "actions", "approvals", "autocomplete_data", "channels",
  "daily_expense_summaries", "daily_expenses", "equipment", "finance_events", "finance_payments",
  "fund_transfers", "journals", "maintenance_schedules", "maintenance_tasks", "material_purchases",
  "materials", "messages", "notification_read_states", "print_settings", "project_fund_transfers",
  "projects", "report_templates", "supplier_payments", "suppliers", "system_events", "system_notifications",
  "tool_categories", "tool_cost_tracking", "tool_maintenance_logs", "tool_movements", "tool_notifications",
  "tool_purchase_items", "tool_reservations", "tool_stock", "tool_usage_analytics", "tools",
  "transaction_lines", "transactions", "users", "worker_attendance", "workers"
];

const TABLES = TABLES_ENV ? TABLES_ENV.split(",").map(s => s.trim()).filter(Boolean) : DEFAULT_TABLES;

function makeClient(connectionString: string) {
  const config: any = { connectionString };

  // تحديد ما إذا كان الاتصال محلي أم خارجي
  const isLocalConnection = connectionString.includes('localhost') || 
                           connectionString.includes('127.0.0.1') ||
                           connectionString.includes('@localhost/');

  if (isLocalConnection) {
    LOG.info("🔓 اتصال محلي - تعطيل SSL");
    config.ssl = false;
    return new Client(config);
  }

  // للاتصالات الخارجية - محاولة استخدام شهادة SSL
  LOG.info("🔐 اتصال خارجي - تفعيل SSL");
  
  let ca = undefined;
  const certPath = CA_PATH ? CA_PATH : './pg_cert.pem';
  
  try {
    if (fs.existsSync(certPath)) {
      ca = fs.readFileSync(certPath, { encoding: "utf8" });
      LOG.info(`📜 تم تحميل شهادة SSL من: ${certPath}`);
    }
  } catch (e: any) {
    LOG.warn(`⚠️ تعذر تحميل شهادة SSL من ${certPath}: ${e.message}`);
  }

  // إعداد SSL - أولاً نجرب الاتصال الآمن مع الشهادة المخصصة
  if (ca) {
    LOG.info("🔑 استخدام شهادة SSL مخصصة - السماح بالشهادات الموقعة ذاتياً");
    config.ssl = {
      rejectUnauthorized: false, // مطلوب للشهادات الموقعة ذاتياً
      ca: ca,
      minVersion: 'TLSv1.2',
      checkServerIdentity: () => undefined // تعطيل فحص اسم الخادم
    };
  } else {
    // إذا لم تكن هناك شهادة مخصصة، نستخدم إعدادات أكثر تساهلاً
    LOG.warn("لا توجد شهادة SSL مخصصة - استخدام إعدادات SSL أساسية");
    config.ssl = { 
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    };
  }

  return new Client(config);
}

async function getColumnNames(client: Client, table: string): Promise<string[]> {
  const q = `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`;
  const res = await client.query(q, [table]);
  return res.rows.map(r => r.column_name as string);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function migrateTable(oldClient: Client, newClient: Client, table: string) {
  LOG.info(`Migrating table: ${table}`);
  
  const columns = await getColumnNames(oldClient, table);
  if (!columns.length) {
    LOG.warn(`table ${table} has no columns, skipping`);
    return;
  }
  
  const colList = columns.map(c => `"${c}"`).join(", ");

  // count rows
  const cntRes = await oldClient.query(`SELECT COUNT(*) AS cnt FROM public."${table}"`);
  const total = parseInt(cntRes.rows[0].cnt, 10);
  LOG.info(`  rows to migrate: ${total}`);
  
  if (!total) return;

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const q = `SELECT * FROM public."${table}" OFFSET ${offset} LIMIT ${BATCH_SIZE}`;
    const r = await oldClient.query(q);
    const rows = r.rows;
    
    if (!rows.length) break;

    // build multi-row insert with parameterized values
    const params: any[] = [];
    const valuesSql: string[] = [];
    let idx = 1;
    
    for (const row of rows) {
      const placeholders = columns.map(col => {
        params.push((row as any)[col]);
        return `$${idx++}`;
      });
      valuesSql.push(`(${placeholders.join(",")})`);
    }

    const insertSql = `INSERT INTO public."${table}" (${colList}) VALUES ${valuesSql.join(",")} ON CONFLICT DO NOTHING`;

    try {
      await newClient.query("BEGIN");
      await newClient.query(insertSql, params);
      await newClient.query("COMMIT");
      LOG.ok(`  migrated batch offset ${offset} (${rows.length} rows)`);
    } catch (e: any) {
      await newClient.query("ROLLBACK").catch(() => {});
      LOG.err(`  insert error at offset ${offset}: ${e.message}`);
      // continue to next batch
    }
  }
  
  LOG.ok(`Finished ${table}`);
}

// دالة خاصة لإنشاء عميل قاعدة البيانات الجديدة بدون SSL
function makeNewDbClient(connectionString: string) {
  const config: any = { connectionString };
  
  // التحقق إذا كان الاتصال محلي
  const isLocalConnection = connectionString.includes('localhost') || 
                           connectionString.includes('127.0.0.1') ||
                           connectionString.includes('@localhost/');

  if (isLocalConnection) {
    LOG.info("🔓 NEW DB: اتصال محلي - تعطيل SSL");
    config.ssl = false;
  } else {
    LOG.warn("⚠️ NEW DB: تعطيل SSL للتوافق (غير آمن!)");
    config.ssl = false;
  }
  
  return new Client(config);
}

async function main() {
  LOG.info(`OLD_DB_URL: ${OLD_DB_URL?.slice(0, 20)}...`);
  LOG.info(`NEW_DB_URL: ${NEW_DB_URL?.slice(0, 20)}...`);
  
  const oldClient = makeClient(OLD_DB_URL as string);
  const newClient = makeNewDbClient(NEW_DB_URL as string);

  try {
    LOG.info("Connecting to OLD DB...");
    await oldClient.connect();
    LOG.ok("Connected to OLD DB");

    LOG.info("Connecting to NEW DB...");
    try {
      await newClient.connect();
      LOG.ok("Connected to NEW DB");
    } catch (newDbError: any) {
      if (newDbError.message?.includes('self-signed certificate')) {
        LOG.err("مشكلة شهادة SSL في NEW DB. جرب إعداد متغير البيئة:");
        LOG.err("export ALLOW_INSECURE=true");
        LOG.err("أو تأكد من أن شهادة SSL صحيحة");
      }
      throw newDbError;
    }

    for (const t of TABLES) {
      try {
        await migrateTable(oldClient, newClient, t);
      } catch (e: any) {
        LOG.err(`Failed migrating ${t}: ${e.message}`);
      }
    }

    LOG.ok("Migration finished");

  } catch (e: any) {
    LOG.err(`Fatal: ${e.message}`);
  } finally {
    try { await oldClient.end(); } catch (e) {}
    try { await newClient.end(); } catch (e) {}
  }
}

// handle SIGINT gracefully
process.on('SIGINT', async () => {
  LOG.warn('Interrupted, closing connections...');
  process.exit(0);
});

main().catch(err => {
  LOG.err(`Unhandled error: ${err.message}`);
  process.exit(1);
});