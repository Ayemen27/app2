import type { Migration } from './types';

/**
 * v002 - Relational columns + indices للجداول الثقيلة.
 *
 * البقاء على JSON blob في `data` كما هو، لكن نستخرج أعمدة مفهرسة للحقول
 * الأكثر استخدامًا في الفلترة. هذا يُعطي أداء × N على استعلامات WHERE
 * مع الحفاظ على التوافق الكامل مع الكود الحالي.
 *
 * ⚠️ ALTER TABLE في SQLite لا يدعم ADD COLUMN IF NOT EXISTS قبل 3.35،
 * لذا نلتقط الأخطاء "duplicate column name" بأمان (idempotent).
 *
 * التطبيق على IDB غير ضروري — IDB له آلية indices خاصة عبر createIndex
 * في openDB.upgrade() ويتم بشكل تلقائي عند إنشاء stores جديدة.
 */

interface ColumnSpec {
  name: string;
  type: 'TEXT' | 'INTEGER';
}

interface TableSpec {
  table: string;
  columns: ColumnSpec[];
  indices: { name: string; cols: string[] }[];
}

const RELATIONAL_TABLES: TableSpec[] = [
  {
    table: 'workers',
    columns: [
      { name: 'project_id', type: 'TEXT' },
      { name: 'worker_type', type: 'TEXT' },
      { name: 'is_active', type: 'INTEGER' },
      { name: 'deleted_at', type: 'TEXT' },
    ],
    indices: [
      { name: 'idx_workers_project', cols: ['project_id'] },
      { name: 'idx_workers_active', cols: ['is_active'] },
      { name: 'idx_workers_deleted', cols: ['deleted_at'] },
    ],
  },
  {
    table: 'projects',
    columns: [
      { name: 'status', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' },
    ],
    indices: [
      { name: 'idx_projects_status', cols: ['status'] },
      { name: 'idx_projects_deleted', cols: ['deleted_at'] },
    ],
  },
  {
    table: 'materialPurchases',
    columns: [
      { name: 'project_id', type: 'TEXT' },
      { name: 'supplier_id', type: 'TEXT' },
      { name: 'purchase_date', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' },
    ],
    indices: [
      { name: 'idx_matpur_project', cols: ['project_id'] },
      { name: 'idx_matpur_supplier', cols: ['supplier_id'] },
      { name: 'idx_matpur_date', cols: ['purchase_date'] },
      { name: 'idx_matpur_proj_date', cols: ['project_id', 'purchase_date'] },
      { name: 'idx_matpur_deleted', cols: ['deleted_at'] },
    ],
  },
  {
    table: 'fundTransfers',
    columns: [
      { name: 'project_id', type: 'TEXT' },
      { name: 'transfer_date', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' },
    ],
    indices: [
      { name: 'idx_fundtr_project', cols: ['project_id'] },
      { name: 'idx_fundtr_date', cols: ['transfer_date'] },
      { name: 'idx_fundtr_proj_date', cols: ['project_id', 'transfer_date'] },
      { name: 'idx_fundtr_deleted', cols: ['deleted_at'] },
    ],
  },
  {
    table: 'workerAttendance',
    columns: [
      { name: 'project_id', type: 'TEXT' },
      { name: 'worker_id', type: 'TEXT' },
      { name: 'date', type: 'TEXT' },
      { name: 'attendance_date', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' },
    ],
    indices: [
      { name: 'idx_att_project', cols: ['project_id'] },
      { name: 'idx_att_worker', cols: ['worker_id'] },
      { name: 'idx_att_date', cols: ['date'] },
      { name: 'idx_att_proj_date', cols: ['project_id', 'date'] },
      { name: 'idx_att_worker_date', cols: ['worker_id', 'date'] },
      { name: 'idx_att_deleted', cols: ['deleted_at'] },
    ],
  },
  {
    table: 'suppliers',
    columns: [
      { name: 'is_active', type: 'INTEGER' },
      { name: 'deleted_at', type: 'TEXT' },
    ],
    indices: [
      { name: 'idx_suppliers_active', cols: ['is_active'] },
      { name: 'idx_suppliers_deleted', cols: ['deleted_at'] },
    ],
  },
  {
    table: 'equipment',
    columns: [
      { name: 'project_id', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'deleted_at', type: 'TEXT' },
    ],
    indices: [
      { name: 'idx_equipment_project', cols: ['project_id'] },
      { name: 'idx_equipment_status', cols: ['status'] },
      { name: 'idx_equipment_deleted', cols: ['deleted_at'] },
    ],
  },
];

/**
 * 📋 خريطة عامة للأعمدة المفهرسة - يستخدمها storage-factory للاستخراج التلقائي.
 */
export const RELATIONAL_COLUMNS_MAP: Record<string, string[]> =
  RELATIONAL_TABLES.reduce((acc, t) => {
    acc[t.table] = t.columns.map((c) => c.name);
    return acc;
  }, {} as Record<string, string[]>);

export const v002_relational_indices: Migration = {
  version: 2,
  name: 'relational columns + indices for heavy tables',

  async upSqlite({ exec, query }) {
    for (const spec of RELATIONAL_TABLES) {
      // تأكد من وجود الجدول الأساسي (قد لا يكون لمستخدمين جدد)
      await exec(`
        CREATE TABLE IF NOT EXISTS ${spec.table} (
          id TEXT PRIMARY KEY,
          data TEXT,
          synced INTEGER DEFAULT 1,
          isLocal INTEGER DEFAULT 0,
          pendingSync INTEGER DEFAULT 0
        );
      `);

      // اقرأ الأعمدة الموجودة
      const cols = await query(`PRAGMA table_info(${spec.table})`);
      const existing = new Set<string>(cols.map((c: any) => String(c.name)));

      // أضف الأعمدة الناقصة
      for (const col of spec.columns) {
        if (existing.has(col.name)) continue;
        try {
          await exec(`ALTER TABLE ${spec.table} ADD COLUMN ${col.name} ${col.type}`);
        } catch (e: any) {
          const msg = String(e?.message ?? e).toLowerCase();
          if (!msg.includes('duplicate') && !msg.includes('already exists')) {
            throw e;
          }
        }
      }

      // أنشئ الفهارس
      for (const idx of spec.indices) {
        await exec(
          `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${spec.table}(${idx.cols.join(', ')})`,
        );
      }

      // 🔄 backfill: استخرج القيم من JSON للسجلات الموجودة (مرة واحدة)
      await backfillTableColumns(query, exec, spec);
    }
  },

  // IDB indices تُدار عبر openDB.upgrade() — لا حاجة لعمل شيء هنا
  async upIdb() {},
};

/**
 * يقرأ كل سجل ويستخرج قيم الأعمدة من JSON `data` ويُحدّث الأعمدة الجديدة.
 * يُنفّذ على دفعات لتجنّب استهلاك الذاكرة.
 */
async function backfillTableColumns(
  query: (sql: string, params?: any[]) => Promise<any[]>,
  exec: (sql: string, params?: any[]) => Promise<void>,
  spec: TableSpec,
): Promise<void> {
  const colNames = spec.columns.map((c) => c.name);

  // اختر السجلات التي تحتوي data ولكن أحد الأعمدة الجديدة NULL
  const whereNull = colNames.map((c) => `${c} IS NULL`).join(' OR ');
  const rows = await query(
    `SELECT id, data FROM ${spec.table} WHERE data IS NOT NULL AND (${whereNull}) LIMIT 5000`,
  );

  if (rows.length === 0) return;

  let updated = 0;
  for (const row of rows) {
    try {
      const obj = JSON.parse(row.data);
      const setClauses: string[] = [];
      const values: any[] = [];
      for (const col of spec.columns) {
        const v = extractField(obj, col.name);
        if (v !== undefined) {
          setClauses.push(`${col.name} = ?`);
          values.push(v);
        }
      }
      if (setClauses.length === 0) continue;
      values.push(row.id);
      await exec(
        `UPDATE ${spec.table} SET ${setClauses.join(', ')} WHERE id = ?`,
        values,
      );
      updated++;
    } catch {
      // تجاهل السجلات الفاسدة
    }
  }

  if (updated > 0) {
    console.log(`[Migrations] backfilled ${updated} rows in ${spec.table}`);
  }
}

/**
 * استخرج قيمة حقل من record يدعم snake_case و camelCase.
 * يحوّل booleans إلى 1/0 للأعمدة INTEGER (is_active …).
 */
function extractField(obj: any, snakeName: string): any {
  if (!obj || typeof obj !== 'object') return undefined;

  const camel = snakeName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const v = obj[snakeName] !== undefined ? obj[snakeName] : obj[camel];

  if (v === undefined || v === null) return undefined;

  if (snakeName.startsWith('is_') || snakeName === 'is_active') {
    return v === true || v === 1 || v === '1' ? 1 : 0;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return v;
  return String(v);
}
