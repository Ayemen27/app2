import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

class SQLiteStorage {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private dbName: string = 'binarjoin_native.db';

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    // بدء التهيئة تلقائياً عند الإنشاء لضمان الجاهزية المبكرة
    this.initialize().catch(err => console.error("🔴 SQLite Auto-Init Failed:", err));
  }

  async initialize() {
    if (this.db) return; // منع التهيئة المتكررة
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      // تقليل الضجيج في السجلات عند تشغيل الويب
      return;
    }

    try {
      // محاولة فتح قاعدة البيانات
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;

      if (ret.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        // إنشاء اتصال جديد مع تعطيل التشفير وضمان القراءة/الكتابة
        this.db = await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
      }

      await this.db.open();
      const isDbOpen = await this.db.isDBOpen();
      if (!isDbOpen.result) {
        // محاولة ثانية لفتح القاعدة إذا فشلت الأولى
        await this.db.open();
      }
      
      await this.createTables();
      console.log('✅ Native SQLite initialized and tables checked');
    } catch (err) {
      console.error('❌ SQLite Init Error:', err);
      // في وضع الأندرويد، لا نتراجع لـ IndexedDB إلا في حالة اليأس المطلق
      // لكن هنا نترك الخطأ ليظهر للمستخدم ليعرف أن هناك مشكلة في SQLite الحقيقي
      this.db = null;
      throw err;
    }
  }

  private async createTables() {
    if (!this.db) return;
    
    // تأكد من وجود عمود المزامنة في كل جدول
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
      'emergencyUsers', 'syncQueue', 'syncMetadata'
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
      
      // إضافة أعمدة المزامنة إذا لم تكن موجودة (للتوافق مع الإصدارات الأقدم)
      const columns = ['synced', 'isLocal', 'pendingSync'];
      for (const col of columns) {
        try {
          await this.db.execute(`ALTER TABLE ${store} ADD COLUMN ${col} INTEGER DEFAULT 0;`);
        } catch (e) {
          // العمود موجود بالفعل
        }
      }
    }
  }

  async get(table: string, id: string) {
    if (!this.db) return null;
    try {
      const res = await this.db.query(`SELECT data FROM ${table} WHERE id = ?`, [id]);
      return res.values && res.values.length > 0 ? JSON.parse(res.values[0].data) : null;
    } catch (e) {
      console.error(`Error getting from ${table}:`, e);
      return null;
    }
  }

  async set(table: string, id: string, data: any) {
    if (!this.db) return;
    try {
      const query = `INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`;
      await this.db.run(query, [id.toString(), JSON.stringify(data)]);
    } catch (e) {
      console.error(`Error setting in ${table}:`, e);
    }
  }

  async getAll(table: string): Promise<any[]> {
    if (!this.db) return [];
    try {
      const res = await this.db.query(`SELECT data FROM ${table}`);
      return res.values ? res.values.map(row => JSON.parse(row.data)) : [];
    } catch (e) {
      console.error(`Error getting all from ${table}:`, e);
      return [];
    }
  }

  async delete(table: string, id: string) {
    if (!this.db) return;
    try {
      await this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    } catch (e) {
      console.error(`Error deleting from ${table}:`, e);
    }
  }
}

export const nativeStorage = new SQLiteStorage();
