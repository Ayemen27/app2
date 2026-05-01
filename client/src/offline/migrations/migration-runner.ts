import { ALL_MIGRATIONS, LATEST_VERSION, type Migration } from './index';
import type { SQLiteMigrationContext, IDBMigrationContext } from './types';

const LOG = '[Migrations]';

/**
 * 🚀 تشغيل migrations على SQLite (Native).
 *
 * - يقرأ الإصدارات المُطبّقة من جدول `_migrations`.
 * - يُطبّق الناقصات بالترتيب.
 * - فشل migration واحدة يوقف السلسلة (لا يُسجّل كمطبّق).
 * - أول تشغيل لمستخدم قائم: نُسجّل v1 تلقائيًا (baseline) لأن الجداول موجودة فعلاً.
 */
export async function runSqliteMigrations(db: any): Promise<{
  applied: number[];
  current: number;
}> {
  if (!db) return { applied: [], current: 0 };

  const exec = async (sql: string, params: any[] = []) => {
    if (params.length === 0) {
      await db.execute(sql);
    } else {
      await db.run(sql, params);
    }
  };
  const query = async (sql: string, params: any[] = []) => {
    const res = await db.query(sql, params);
    return res?.values ?? [];
  };

  // التأكد من وجود جدول _migrations قبل أي قراءة
  await exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await query(`SELECT version FROM _migrations ORDER BY version ASC`);
  const appliedSet = new Set<number>(appliedRows.map((r: any) => Number(r.version)));

  // إذا كان الجدول فارغًا والمخزن يحتوي بيانات سابقة، نعتبر v1 مطبّقة (baseline).
  if (appliedSet.size === 0) {
    try {
      const versionRows = await query(
        `SELECT value FROM _schema_version WHERE key = 'version'`,
      );
      const hasLegacy = versionRows.length > 0;
      if (hasLegacy) {
        console.log(`${LOG} مستخدم حالي مكتشف (legacy schema_version=${versionRows[0]?.value}) — تأشير v1 كمطبّقة.`);
        await exec(
          `INSERT OR REPLACE INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)`,
          [1, 'initial baseline (auto-marked)', new Date().toISOString()],
        );
        appliedSet.add(1);
      }
    } catch {
      // _schema_version غير موجود — مستخدم جديد، نتركه يطبّق v1 طبيعيًا.
    }
  }

  const pending = ALL_MIGRATIONS
    .filter((m) => !appliedSet.has(m.version) && m.upSqlite)
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    console.log(`${LOG} ✅ SQLite up-to-date (v${LATEST_VERSION})`);
    return { applied: [], current: LATEST_VERSION };
  }

  const applied: number[] = [];
  for (const m of pending) {
    const start = Date.now();
    try {
      console.log(`${LOG} ⬆️ SQLite applying v${m.version}: ${m.name}`);
      const ctx: SQLiteMigrationContext = { engine: 'sqlite', db, exec, query };
      await m.upSqlite!(ctx);
      await exec(
        `INSERT OR REPLACE INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)`,
        [m.version, m.name, new Date().toISOString()],
      );
      applied.push(m.version);
      console.log(`${LOG} ✅ SQLite v${m.version} done in ${Date.now() - start}ms`);
    } catch (err: any) {
      console.error(`${LOG} ❌ SQLite v${m.version} FAILED:`, err?.message ?? err);
      // نتوقف عن المتابعة - لا نُسجّل كمطبّقة حتى يتم الإصلاح
      throw new Error(`Migration v${m.version} (${m.name}) failed: ${err?.message ?? err}`);
    }
  }

  return { applied, current: LATEST_VERSION };
}

/**
 * 🚀 تشغيل migrations على IDB.
 *
 * IDB schema (object stores/indices) يُدار عبر openDB.upgrade() — هنا نُطبّق
 * فقط تحويلات البيانات للإصدارات الناقصة.
 */
export async function runIdbMigrations(idb: any): Promise<{
  applied: number[];
  current: number;
}> {
  if (!idb) return { applied: [], current: 0 };

  // نخزن سجل migrations المُطبّقة في syncMetadata (لا نضيف object store جديد لتجنّب bump للإصدار).
  const META_KEY = '_migrations_applied';

  const readApplied = async (): Promise<Set<number>> => {
    try {
      const tx = idb.transaction('syncMetadata', 'readonly');
      const store = tx.objectStore('syncMetadata');
      const rec = await store.get(META_KEY);
      const list: number[] = Array.isArray(rec?.versions) ? rec.versions : [];
      return new Set<number>(list.map((v) => Number(v)));
    } catch {
      return new Set();
    }
  };

  const writeApplied = async (versions: Set<number>) => {
    try {
      const tx = idb.transaction('syncMetadata', 'readwrite');
      const store = tx.objectStore('syncMetadata');
      await store.put({
        key: META_KEY,
        id: META_KEY,
        timestamp: Date.now(),
        version: '4.0-migrations',
        recordCount: versions.size,
        versions: Array.from(versions).sort((a, b) => a - b),
      });
      await tx.done;
    } catch (e) {
      console.warn(`${LOG} writeApplied(IDB) failed:`, e);
    }
  };

  const appliedSet = await readApplied();

  // إذا فارغ ومستخدم قائم (DB version >= 16 كانت موجودة قبل migrations)، نؤشّر v1 تلقائيًا.
  if (appliedSet.size === 0) {
    try {
      // وجود syncMetadata يدلّ على مستخدم قائم
      const tx = idb.transaction('syncMetadata', 'readonly');
      const store = tx.objectStore('syncMetadata');
      const lastSync = await store.get('lastSync');
      if (lastSync) {
        console.log(`${LOG} مستخدم IDB حالي مكتشف — تأشير v1 كمطبّقة.`);
        appliedSet.add(1);
        await writeApplied(appliedSet);
      }
    } catch {}
  }

  const pending = ALL_MIGRATIONS
    .filter((m) => !appliedSet.has(m.version) && m.upIdb)
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    console.log(`${LOG} ✅ IDB up-to-date (v${LATEST_VERSION})`);
    return { applied: [], current: LATEST_VERSION };
  }

  const applied: number[] = [];
  for (const m of pending) {
    const start = Date.now();
    try {
      console.log(`${LOG} ⬆️ IDB applying v${m.version}: ${m.name}`);
      const ctx: IDBMigrationContext = { engine: 'idb', db: idb };
      await m.upIdb!(ctx);
      appliedSet.add(m.version);
      await writeApplied(appliedSet);
      applied.push(m.version);
      console.log(`${LOG} ✅ IDB v${m.version} done in ${Date.now() - start}ms`);
    } catch (err: any) {
      console.error(`${LOG} ❌ IDB v${m.version} FAILED:`, err?.message ?? err);
      throw new Error(`IDB Migration v${m.version} (${m.name}) failed: ${err?.message ?? err}`);
    }
  }

  return { applied, current: LATEST_VERSION };
}
