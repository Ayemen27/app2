import type { Migration } from './types';

/**
 * v001 - Initial baseline.
 *
 * - SQLite: تأكد من وجود _migrations + جدول schema_version (الأسماء الموجودة).
 * - IDB: لا تفعل شيئًا (الترقية تتم عبر `upgrade` callback في openDB).
 *
 * للمستخدمين الحاليين: تُعتبر مطبّقة تلقائيًا (التعريف + الجداول موجود).
 * للمستخدمين الجدد: تنشئ جداول _migrations الأساسية فقط.
 */
export const v001_initial: Migration = {
  version: 1,
  name: 'initial baseline',

  async upSqlite({ exec }) {
    // _migrations موجود مسبقًا — نتأكد من وجوده فقط.
    await exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);
  },

  async upIdb() {
    // IDB schema يُدار عبر openDB.upgrade() في db.ts
    // هذه migration للتأشير فقط على وجود baseline.
  },
};
