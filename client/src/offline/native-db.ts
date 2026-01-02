import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

class SQLiteStorage {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private dbName: string = 'binarjoin_native.db';

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initialize() {
    if (Capacitor.getPlatform() === 'web') {
      console.warn('⚠️ SQLite is not supported on web, falling back to mock or IndexedDB');
      return;
    }

    try {
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;

      if (ret.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
      }

      await this.db.open();
      await this.createTables();
      console.log('✅ Native SQLite initialized');
    } catch (err) {
      console.error('❌ SQLite Init Error:', err);
    }
  }

  private async createTables() {
    if (!this.db) return;
    
    // مثال بسيط لإنشاء الجداول (سيتم التوسع فيها لاحقاً)
    const query = `
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        data TEXT
      );
    `;
    await this.db.execute(query);
  }

  async get(table: string, id: string) {
    if (!this.db) return null;
    const res = await this.db.query(`SELECT data FROM ${table} WHERE id = ?`, [id]);
    return res.values && res.values.length > 0 ? JSON.parse(res.values[0].data) : null;
  }

  async set(table: string, id: string, data: any) {
    if (!this.db) return;
    const query = `INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`;
    await this.db.run(query, [id, JSON.stringify(data)]);
  }
}

export const nativeStorage = new SQLiteStorage();
