import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getEncryptionKey } from './sqlcipher-key-manager';

const DB_NAME = 'binarjoin_native.db';
const SCHEMA_VERSION = '3.0';
const MIGRATION_FLAG_KEY = 'sqlite_encrypted_migration_v3';
const LOG_TAG = '[SQLite]';

type LogLevel = 'info' | 'warn' | 'error';
function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta) fn(`${LOG_TAG} ${message}`, meta);
  else fn(`${LOG_TAG} ${message}`);
}

class SQLiteStorage {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private readonly dbName: string = DB_NAME;
  private _initialized: boolean = false;
  private _initPromise: Promise<void> | null = null;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this._initPromise = this.initialize().catch((err) => {
      log('error', 'Initialization failed (non-fatal, will run in degraded mode):', {
        error: err?.message ?? String(err),
      });
    });
  }

  async initialize(): Promise<void> {
    if (this._initialized && this.db) return;

    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
      log('info', 'Web platform detected — native SQLite disabled.');
      return;
    }

    if (!Capacitor.isPluginAvailable('CapacitorSQLite')) {
      log('warn', 'CapacitorSQLite plugin not available in this build — skipping native DB init.');
      return;
    }

    const secret = await getEncryptionKey();

    await this.runOneTimeLegacyCleanup(secret);

    await this.sqlite.setEncryptionSecret(secret).catch((e: any) => {
      const msg = String(e?.message ?? e);
      if (!/already.*set|already.*stored/i.test(msg)) {
        log('warn', 'setEncryptionSecret returned non-fatal error:', { error: msg });
      }
    });

    await this.openEncryptedConnection();

    await this.verifyCipher();
    await this.createTables();

    this._initialized = true;
    log('info', 'Native SQLite ready (SQLCipher).', { schemaVersion: SCHEMA_VERSION });
  }

  private async runOneTimeLegacyCleanup(_secret: string): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: MIGRATION_FLAG_KEY });
      if (value === 'done') return;

      log('info', 'One-time legacy DB cleanup starting…');

      try {
        const isConn = (await this.sqlite.isConnection(this.dbName, false)).result ?? false;
        if (isConn) {
          await this.sqlite.closeConnection(this.dbName, false).catch(() => {});
        }
      } catch {}

      try {
        const exists = (await this.sqlite.isDatabase(this.dbName)).result ?? false;
        if (exists) {
          const removed = await this.tryDeleteDatabaseFile();
          log(removed ? 'info' : 'warn', removed ? 'Legacy DB removed.' : 'Legacy DB delete attempt did not confirm removal.');
        } else {
          log('info', 'No legacy DB found.');
        }
      } catch (e: any) {
        log('warn', 'Legacy cleanup encountered an issue (continuing):', {
          error: String(e?.message ?? e),
        });
      }

      await Preferences.set({ key: MIGRATION_FLAG_KEY, value: 'done' });
      log('info', 'Migration flag committed.');
    } catch (e: any) {
      log('warn', 'Legacy cleanup wrapper failed (continuing):', {
        error: String(e?.message ?? e),
      });
    }
  }

  private async tryDeleteDatabaseFile(): Promise<boolean> {
    const modes: Array<'no-encryption' | 'secret'> = ['no-encryption', 'secret'];
    for (const mode of modes) {
      try {
        const tmp = await this.sqlite.createConnection(this.dbName, mode === 'secret', mode, 1, false);
        try { await tmp.open(); } catch { /* may fail if wrong key/mode — still try delete */ }
        try {
          await tmp.delete();
          await this.sqlite.closeConnection(this.dbName, false).catch(() => {});
          return true;
        } catch (delErr: any) {
          await this.sqlite.closeConnection(this.dbName, false).catch(() => {});
          log('warn', `delete() in mode=${mode} failed:`, { error: String(delErr?.message ?? delErr) });
        }
      } catch (createErr: any) {
        log('warn', `createConnection in mode=${mode} failed during cleanup:`, {
          error: String(createErr?.message ?? createErr),
        });
      }
    }

    try {
      await (CapacitorSQLite as any).deleteDatabase({ database: this.dbName });
      return true;
    } catch (rawErr: any) {
      log('warn', 'Raw plugin deleteDatabase failed:', { error: String(rawErr?.message ?? rawErr) });
    }

    return false;
  }

  private async openEncryptedConnection(): Promise<void> {
    let isConn = false;
    try {
      isConn = (await this.sqlite.isConnection(this.dbName, false)).result ?? false;
    } catch {
      isConn = false;
    }

    if (isConn) {
      this.db = await this.sqlite.retrieveConnection(this.dbName, false);
    } else {
      this.db = await this.sqlite.createConnection(
        this.dbName,
        true,
        'secret',
        1,
        false,
      );
    }

    const openCheck = await this.db.isDBOpen();
    if (!openCheck.result) {
      await this.db.open();
    }
  }

  private async verifyCipher(): Promise<void> {
    if (!this.db) return;
    try {
      const res = await this.db.query('PRAGMA cipher_version;');
      const version = res?.values?.[0]?.cipher_version ?? res?.values?.[0]?.[Object.keys(res.values[0])[0]];
      if (!version) {
        log('warn', 'cipher_version returned empty — encryption may not be active.');
      } else {
        log('info', 'SQLCipher active.', { version });
      }
    } catch (e: any) {
      log('warn', 'Could not verify cipher_version:', { error: String(e?.message ?? e) });
    }
  }

  async waitForReady(): Promise<void> {
    if (this._initPromise) {
      await this._initPromise;
    }
  }

  get isReady(): boolean {
    return this._initialized && this.db !== null;
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    const { ALL_SYNC_STORES } = await import('@shared/sync-tables');
    const ALL_STORES = ALL_SYNC_STORES;

    for (const store of ALL_STORES) {
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS ${store} (
          id TEXT PRIMARY KEY,
          data TEXT,
          synced INTEGER DEFAULT 1,
          isLocal INTEGER DEFAULT 0,
          pendingSync INTEGER DEFAULT 0
        );
      `);
    }

    await this.db.run(
      `INSERT OR REPLACE INTO _schema_version (key, value) VALUES (?, ?)`,
      ['version', SCHEMA_VERSION],
    );
  }

  async get(table: string, id: string): Promise<any | null> {
    if (!this.db) return null;
    try {
      await this.ensureTable(table);
      const res = await this.db.query(`SELECT data FROM ${table} WHERE id = ?`, [id]);
      return res.values && res.values.length > 0 ? JSON.parse(res.values[0].data) : null;
    } catch {
      return null;
    }
  }

  async set(table: string, id: string, data: any): Promise<void> {
    if (!this.db) return;
    try {
      await this.ensureTable(table);
      await this.db.run(
        `INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`,
        [id.toString(), JSON.stringify(data)],
      );
    } catch (e) {
      log('error', `set(${table}, ${id}) failed:`, { error: String((e as any)?.message ?? e) });
      throw e;
    }
  }

  async getAll(table: string): Promise<any[]> {
    if (!this.db) return [];
    try {
      await this.ensureTable(table);
      const res = await this.db.query(`SELECT data FROM ${table}`);
      return res.values ? res.values.map((row: any) => JSON.parse(row.data)) : [];
    } catch (e) {
      log('error', `getAll(${table}) failed:`, { error: String((e as any)?.message ?? e) });
      return [];
    }
  }

  async delete(table: string, id: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.ensureTable(table);
      await this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    } catch (e) {
      log('error', `delete(${table}, ${id}) failed:`, { error: String((e as any)?.message ?? e) });
      throw e;
    }
  }

  async clearTable(table: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.ensureTable(table);
      await this.db.run(`DELETE FROM ${table}`, []);
    } catch (e) {
      log('error', `clearTable(${table}) failed:`, { error: String((e as any)?.message ?? e) });
      throw e;
    }
  }

  async count(table: string): Promise<number> {
    if (!this.db) return 0;
    try {
      await this.ensureTable(table);
      const res = await this.db.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      return res.values && res.values.length > 0 ? (res.values[0].cnt || 0) : 0;
    } catch (e) {
      log('error', `count(${table}) failed:`, { error: String((e as any)?.message ?? e) });
      return 0;
    }
  }

  async query(table: string, filterFn: (item: any) => boolean): Promise<any[]> {
    const all = await this.getAll(table);
    return all.filter(filterFn);
  }

  private async ensureTable(table: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY,
          data TEXT,
          synced INTEGER DEFAULT 1,
          isLocal INTEGER DEFAULT 0,
          pendingSync INTEGER DEFAULT 0
        );
      `);
    } catch {
      // Ignore — table likely exists or transient failure.
    }
  }
}

export const nativeStorage = new SQLiteStorage();
