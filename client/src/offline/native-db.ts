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
      'toolCategories', 'tools', 'toolMovements', 'toolStock', 'toolReservations',
      'toolPurchaseItems', 'toolCostTracking', 'toolMaintenanceLogs',
      'toolUsageAnalytics', 'toolNotifications', 'maintenanceSchedules',
      'maintenanceTasks', 'wellTasks', 'wellExpenses', 'wellAuditLogs',
      'wellTaskAccounts', 'messages', 'channels', 'notifications',
      'notificationReadStates', 'systemNotifications', 'systemEvents', 'actions',
      'aiChatSessions', 'aiChatMessages', 'aiUsageStats', 'buildDeployments',
      'approvals', 'transactions', 'transactionLines', 'journals', 'accounts',
      'accountBalances', 'financePayments', 'financeEvents', 'reportTemplates',
      'syncQueue', 'syncMetadata'
    ];

    let queries = '';
    for (const store of ALL_STORES) {
      queries += `CREATE TABLE IF NOT EXISTS ${store} (id TEXT PRIMARY KEY, data TEXT);`;
    }
    
    await this.db.execute(queries);
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
