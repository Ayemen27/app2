/**
 * 🔒 Multi-store Transactions - عمليات ذرية عبر مخازن متعددة.
 *
 * Native (SQLite):  BEGIN / COMMIT / ROLLBACK يدويًا
 * Web (IDB):        transaction multi-store readwrite (atomic by spec)
 *
 * مثال:
 * ```
 * await runInTransaction(['workers', 'workerAttendance'], async (tx) => {
 *   await tx.put('workers', updatedWorker);
 *   await tx.put('workerAttendance', newRecord);
 *   // إذا أي خطوة رمت → كلتاهما تُلغى
 * });
 * ```
 */

import { Capacitor } from '@capacitor/core';
import { nativeStorage } from './native-db';
import { initializeDB } from './db';

const isNative = (): boolean => {
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios';
};

export interface TxAPI {
  get(table: string, id: string): Promise<any | null>;
  put(table: string, record: any): Promise<void>;
  delete(table: string, id: string): Promise<void>;
}

export class TransactionRollback extends Error {
  constructor(message = 'Transaction rolled back') {
    super(message);
    this.name = 'TransactionRollback';
  }
}

/**
 * 🚀 تشغيل عمليات متعددة كـ transaction واحدة - all-or-nothing.
 *
 * @param stores قائمة بالمخازن المستهدفة (لـ IDB، مطلوب لإنشاء tx).
 * @param callback دالة تتلقى TxAPI وتنفّذ العمليات. إذا رمت خطأ → rollback.
 * @returns ما تُعيده callback (إن نجحت).
 */
export async function runInTransaction<T>(
  stores: string[],
  callback: (tx: TxAPI) => Promise<T>,
): Promise<T> {
  if (isNative()) {
    return await runSqliteTransaction(stores, callback);
  }
  return await runIdbTransaction(stores, callback);
}

async function runSqliteTransaction<T>(
  _stores: string[],
  callback: (tx: TxAPI) => Promise<T>,
): Promise<T> {
  await nativeStorage.waitForReady();
  const db: any = (nativeStorage as any).db;
  if (!db) {
    throw new Error('SQLite غير جاهزة - لا يمكن بدء transaction');
  }

  const tx: TxAPI = {
    async get(table, id) {
      const res = await db.query(`SELECT data FROM ${table} WHERE id = ?`, [id]);
      return res?.values?.[0]?.data ? JSON.parse(res.values[0].data) : null;
    },
    async put(table, record) {
      const id = (record.id || record.key)?.toString();
      if (!id) throw new Error(`tx.put(${table}): record بدون id`);
      // نستخدم set من nativeStorage ليعالج الأعمدة العلاقية تلقائيًا
      await nativeStorage.set(table, id, record);
    },
    async delete(table, id) {
      await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    },
  };

  await db.execute('BEGIN TRANSACTION');
  try {
    const result = await callback(tx);
    await db.execute('COMMIT');
    return result;
  } catch (err) {
    try {
      await db.execute('ROLLBACK');
    } catch (rbErr) {
      console.error('[Tx] ROLLBACK فشل أيضًا:', rbErr);
    }
    throw err;
  }
}

async function runIdbTransaction<T>(
  stores: string[],
  callback: (tx: TxAPI) => Promise<T>,
): Promise<T> {
  if (stores.length === 0) {
    throw new Error('runInTransaction(IDB): قائمة المخازن لا يمكن أن تكون فارغة');
  }
  const db = await initializeDB();
  const idbTx = db.transaction(stores as any, 'readwrite');

  // حافظ على وعد الـ transaction للتراجع عند فشل callback
  const txDone = idbTx.done;

  const txApi: TxAPI = {
    async get(table, id) {
      const store = idbTx.objectStore(table as any);
      const r = await store.get(id);
      return r ?? null;
    },
    async put(table, record) {
      const store = idbTx.objectStore(table as any);
      await store.put(record);
    },
    async delete(table, id) {
      const store = idbTx.objectStore(table as any);
      await store.delete(id);
    },
  };

  try {
    const result = await callback(txApi);
    await txDone;
    return result;
  } catch (err) {
    try {
      idbTx.abort();
    } catch {}
    throw err;
  }
}
