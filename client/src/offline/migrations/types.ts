/**
 * 📦 نظام Migrations الرسمي - WatermelonDB/RxDB pattern.
 *
 * كل migration:
 *   - مرقّمة (1, 2, 3, …)
 *   - لها `name` وصفي
 *   - تطبّق مرة واحدة فقط (يُتتبع عبر جدول `_migrations`)
 *   - تتعامل مع IDB و/أو SQLite بشكل منفصل
 *   - يجب أن تكون idempotent (آمنة عند التكرار)
 *
 * ⚠️ لا تُعيد ترقيم migrations الموجودة. أضِف دومًا migration جديدة بأعلى رقم.
 */

export interface MigrationContext {
  /** نوع المخزن المستهدف */
  engine: 'idb' | 'sqlite';
}

export interface SQLiteMigrationContext extends MigrationContext {
  engine: 'sqlite';
  /** SQLiteDBConnection */
  db: any;
  exec: (sql: string, params?: any[]) => Promise<void>;
  query: (sql: string, params?: any[]) => Promise<any[]>;
}

export interface IDBMigrationContext extends MigrationContext {
  engine: 'idb';
  /** IDBPDatabase */
  db: any;
}

export interface Migration {
  /** الإصدار (يجب أن يكون فريدًا ومتزايدًا) */
  version: number;
  /** اسم وصفي للتوثيق والسجلات */
  name: string;
  /**
   * تطبيق على SQLite (Native). اتركها فارغة إن لم تكن مطلوبة.
   * يجب أن تكون idempotent.
   */
  upSqlite?: (ctx: SQLiteMigrationContext) => Promise<void>;
  /**
   * تطبيق على IDB (Web). اتركها فارغة إن لم تكن مطلوبة.
   * IDB له آلية `upgrade` خاصة لتعديلات schema (object stores/indices)؛
   * استخدم هذه الدالة لتحويلات البيانات فقط.
   */
  upIdb?: (ctx: IDBMigrationContext) => Promise<void>;
}
