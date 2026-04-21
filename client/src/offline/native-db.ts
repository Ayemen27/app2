import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

class SQLiteStorage {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private dbName: string = 'binarjoin_native.db';
  private _initialized: boolean = false;
  private _initPromise: Promise<void> | null = null;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this._initPromise = this.initialize().catch(() => {});
  }

  async initialize() {
    if (this._initialized && this.db) return;
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      return;
    }

    if (!Capacitor.isPluginAvailable('CapacitorSQLite')) {
      console.warn('[SQLite] CapacitorSQLite plugin not available in this build — skipping native DB init');
      return;
    }

    try {
      let isConn = false;
      try {
        isConn = (await this.sqlite.isConnection(this.dbName, false)).result ?? false;
      } catch (connErr) {
        isConn = false;
      }

      if (isConn) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        try {
          this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
        } catch (createErr: any) {
          if (createErr?.message?.includes('already exists')) {
            this.db = await this.sqlite.retrieveConnection(this.dbName, false);
          } else {
            throw createErr;
          }
        }
      }

      await this.db.open();
      await this.createTables();
      this._initialized = true;
    } catch (err) {
      this.db = null;
      throw err;
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

  private async createTables() {
    if (!this.db) return;

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    const ALL_STORES = [
      'users', 'authUserSessions', 'emailVerificationTokens', 'passwordResetTokens',
      'projectTypes', 'projects', 'workers', 'wells', 'fundTransfers',
      'workerAttendance', 'suppliers', 'materials', 'materialPurchases',
      'supplierPayments', 'transportationExpenses', 'workerTransfers',
      'workerBalances', 'dailyExpenseSummaries', 'workerTypes', 'autocompleteData',
      'workerMiscExpenses', 'printSettings', 'projectFundTransfers',
      'securityPolicies', 'securityPolicyImplementations',
      'securityPolicySuggestions', 'securityPolicyViolations',
      'permissionAuditLogs', 'userProjectPermissions', 'materialCategories',
      'wellTasks', 'wellExpenses', 'wellAuditLogs',
      'wellTaskAccounts', 'notifications',
      'notificationReadStates',
      'aiChatSessions', 'aiChatMessages', 'aiUsageStats', 'buildDeployments',
      'reportTemplates', 'backupLogs', 'backupSettings',
      'equipment', 'equipmentMovements',
      'wellWorkCrews', 'wellCrewWorkers', 'wellSolarComponents',
      'wellTransportDetails', 'wellReceptions',
      'authRequestNonces', 'workerSettlements', 'workerSettlementLines',
      'emergencyUsers', 'syncQueue', 'syncMetadata', 'userData', 'syncHistory',
      'deadLetterQueue', 'localAuditLog'
    ];

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
      ['version', '2.0']
    );
  }

  async get(table: string, id: string): Promise<any | null> {
    if (!this.db) return null;
    try {
      await this.ensureTable(table);
      const res = await this.db.query(`SELECT data FROM ${table} WHERE id = ?`, [id]);
      return res.values && res.values.length > 0 ? JSON.parse(res.values[0].data) : null;
    } catch (e) {
      return null;
    }
  }

  async set(table: string, id: string, data: any): Promise<void> {
    if (!this.db) return;
    try {
      await this.ensureTable(table);
      await this.db.run(
        `INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`,
        [id.toString(), JSON.stringify(data)]
      );
    } catch (e) {
      console.error(`[NativeDB] set(${table}, ${id}) فشل:`, e);
      throw e;
    }
  }

  async getAll(table: string): Promise<any[]> {
    if (!this.db) return [];
    try {
      await this.ensureTable(table);
      const res = await this.db.query(`SELECT data FROM ${table}`);
      return res.values ? res.values.map(row => JSON.parse(row.data)) : [];
    } catch (e) {
      console.error(`[NativeDB] getAll(${table}) فشل:`, e);
      return [];
    }
  }

  async delete(table: string, id: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.ensureTable(table);
      await this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    } catch (e) {
      console.error(`[NativeDB] delete(${table}, ${id}) فشل:`, e);
      throw e;
    }
  }

  async clearTable(table: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.ensureTable(table);
      await this.db.run(`DELETE FROM ${table}`, []);
    } catch (e) {
      console.error(`[NativeDB] clearTable(${table}) فشل:`, e);
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
      console.error(`[NativeDB] count(${table}) فشل:`, e);
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
    } catch (e) {
      // ignore
    }
  }
}

export const nativeStorage = new SQLiteStorage();
