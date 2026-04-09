/**
 * الوصف: طبقة الوصول للبيانات - إدارة جميع عمليات قاعدة البيانات
 * المدخلات: طلبات CRUD للبيانات
 * المخرجات: كائنات البيانات والاستعلامات المحسّنة
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - نظام إدارة البيانات الأساسي
 */

import { 
  type Project, type Worker, type FundTransfer, type WorkerAttendance, 
  type Material, type MaterialPurchase, type TransportationExpense, type DailyExpenseSummary,
  type WorkerTransfer, type WorkerBalance, type AutocompleteData, type WorkerType, type WorkerMiscExpense, type User,
  type Supplier, type SupplierPayment, type PrintSettings, type ProjectFundTransfer,
  type ReportTemplate,
  type Well, type WellTask, type WellTaskAccount, type WellExpense, type WellAuditLog,
  type InsertWell, type InsertWellTask, type InsertWellTaskAccount, type InsertWellExpense, type InsertWellAuditLog,
  type Notification, type InsertNotification,
  type NotificationReadState, type InsertNotificationReadState,
  type WorkerProjectWage, type InsertWorkerProjectWage,
  type InsertProject, type InsertWorker, type InsertFundTransfer, type InsertWorkerAttendance,
  type InsertMaterial, type InsertMaterialPurchase, type InsertTransportationExpense, type InsertDailyExpenseSummary,
  type InsertWorkerTransfer, type InsertWorkerBalance, type InsertAutocompleteData, type InsertWorkerType, type InsertWorkerMiscExpense, type InsertUser,
  type InsertSupplier, type InsertSupplierPayment, type InsertPrintSettings, type InsertProjectFundTransfer,
  type InsertReportTemplate, type EmergencyUser, type InsertEmergencyUser,
  type DailyActivityLog, type InsertDailyActivityLog,
  type Equipment, type InsertEquipment, type EquipmentMovement, type InsertEquipmentMovement,
  type RefreshToken, type InsertRefreshToken, type AuditLog, type InsertAuditLog,
  type Task, type InsertTask,
  type Device, type InsertDevice, type Crash, type InsertCrash, type Metric, type InsertMetric,
  type WhatsAppStats, type InsertWhatsAppStats, type WhatsAppMessage, type InsertWhatsAppMessage,
  type WhatsAppSecurityEvent, type InsertWhatsAppSecurityEvent,
  type WebAuthnCredential, type InsertWebAuthnCredential, type WebAuthnChallenge, type InsertWebAuthnChallenge,
  projects as projectsTable, workers, fundTransfers, workerAttendance, materials, materialPurchases, transportationExpenses, dailyExpenseSummaries,
  workerTransfers, workerBalances, workerProjectWages, autocompleteData, workerTypes, workerMiscExpenses, users, suppliers, supplierPayments, printSettings, projectFundTransfers, reportTemplates, emergencyUsers,
  dailyActivityLogs,
  refreshTokens, auditLogs,
  wells, wellTasks, wellTaskAccounts, wellExpenses, wellAuditLogs,
  equipment, equipmentMovements,
  notifications, notificationReadStates,
  tasks,
  devices,
  crashes,
  metrics,
  whatsappStats,
  whatsappMessages,
  whatsappSecurityEvents,
  webauthnCredentials,
  webauthnChallenges,
  userPreferences,
} from "@shared/schema";
import { db, pool } from "./db";
import { and, eq, isNull, or, gte, lte, desc, ilike, like, isNotNull, asc, count, sum, ne, max, sql, inArray, gt } from 'drizzle-orm';

const NUM = (col: any) => sql`safe_numeric(${col}::text, 0)`;

interface SqlAggregateRow {
  count?: string;
  total?: string;
  total_wages?: string;
  completed_days?: string;
  cash_total?: string;
  credit_total?: string;
}

const projects = projectsTable;

export interface IStorage {
  // Monitoring
  upsertDevice(device: InsertDevice): Promise<Device>;
  getDevices(): Promise<Device[]>;
  createCrash(crash: InsertCrash): Promise<Crash>;
  getRecentCrashes(limit: number): Promise<Crash[]>;
  createMetric(metric: InsertMetric): Promise<Metric>;

  // Notifications
  createNotification(notif: InsertNotification): Promise<Notification>;
  getNotifications(user_id?: string): Promise<Notification[]>;
  getAdminNotifications(): Promise<Notification[]>;

  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;

  // WhatsApp AI
  getWhatsAppStats(): Promise<WhatsAppStats | undefined>;
  updateWhatsAppStats(stats: Partial<InsertWhatsAppStats>): Promise<WhatsAppStats>;
  getWhatsAppMessagesCount(): Promise<number>;
  getWhatsAppLastSync(): Promise<Date | null>;
  createWhatsAppMessage(message: InsertWhatsAppMessage): Promise<WhatsAppMessage>;
  getWhatsAppMessagesByUser(userId: string, limit?: number, offset?: number): Promise<WhatsAppMessage[]>;
  getWhatsAppMessagesByPhone(phoneNumber: string, limit?: number, offset?: number): Promise<WhatsAppMessage[]>;

  // WhatsApp Security Events
  createWhatsAppSecurityEvent(event: InsertWhatsAppSecurityEvent): Promise<WhatsAppSecurityEvent>;
  getWhatsAppSecurityEvents(filters?: { phone_number?: string; event_type?: string; limit?: number }): Promise<WhatsAppSecurityEvent[]>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectByName(name: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  
  // Workers
  getWorkers(): Promise<Worker[]>;
  getWorker(id: string): Promise<Worker | undefined>;
  getWorkerByName(name: string): Promise<Worker | undefined>;
  createWorker(worker: InsertWorker): Promise<Worker>;
  updateWorker(id: string, worker: Partial<InsertWorker>): Promise<Worker | undefined>;
  
  // Worker Project Wages (أجور العمال حسب المشروع)
  getWorkerProjectWages(worker_id: string, project_id?: string): Promise<WorkerProjectWage[]>;
  getWorkerProjectWage(id: string): Promise<WorkerProjectWage | null>;
  createWorkerProjectWage(wage: InsertWorkerProjectWage): Promise<WorkerProjectWage>;
  updateWorkerProjectWage(id: string, wage: Partial<InsertWorkerProjectWage>): Promise<WorkerProjectWage | undefined>;
  deleteWorkerProjectWage(id: string): Promise<boolean>;
  resolveEffectiveWage(worker_id: string, project_id: string, date: string): Promise<string>;
  
  // Worker Types
  getWorkerTypes(): Promise<WorkerType[]>;
  createWorkerType(workerType: InsertWorkerType): Promise<WorkerType>;
  
  // Fund Transfers
  getFundTransfers(project_id: string, date?: string): Promise<FundTransfer[]>;
  getFundTransferByNumber(transferNumber: string): Promise<FundTransfer | undefined>;
  createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer>;
  updateFundTransfer(id: string, transfer: Partial<InsertFundTransfer>): Promise<FundTransfer | undefined>;
  deleteFundTransfer(id: string): Promise<void>;
  
  // Project Fund Transfers (ترحيل الأموال بين المشاريع)
  getProjectFundTransfers(fromProjectId?: string, toProjectId?: string, date?: string): Promise<ProjectFundTransfer[]>;
  getProjectFundTransfer(id: string): Promise<ProjectFundTransfer | undefined>;
  createProjectFundTransfer(transfer: InsertProjectFundTransfer): Promise<ProjectFundTransfer>;
  updateProjectFundTransfer(id: string, transfer: Partial<InsertProjectFundTransfer>): Promise<ProjectFundTransfer | undefined>;
  deleteProjectFundTransfer(id: string): Promise<void>;
  
  // Worker Attendance
  getWorkerAttendance(project_id: string, date?: string): Promise<WorkerAttendance[]>;
  getWorkerAttendanceById(id: string): Promise<WorkerAttendance | null>;
  createWorkerAttendance(attendance: InsertWorkerAttendance): Promise<WorkerAttendance>;
  updateWorkerAttendance(id: string, attendance: Partial<InsertWorkerAttendance>): Promise<WorkerAttendance | undefined>;
  deleteWorkerAttendance(id: string): Promise<void>;
  
  // Materials
  getMaterials(): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined>;
  findMaterialByNameAndUnit(name: string, unit: string): Promise<Material | undefined>;
  
  // Material Purchases
  getMaterialPurchases(project_id: string, dateFrom?: string, dateTo?: string): Promise<MaterialPurchase[]>;
  getMaterialPurchasesWithFilters(filters: {
    supplier_id?: string;
    project_id?: string;
    dateFrom?: string;
    dateTo?: string;
    purchaseType?: string;
  }): Promise<MaterialPurchase[]>;
  getMaterialPurchasesDateRange(): Promise<{ minDate: string; maxDate: string }>;
  getMaterialPurchaseById(id: string): Promise<MaterialPurchase | null>;
  createMaterialPurchase(purchase: InsertMaterialPurchase): Promise<MaterialPurchase>;
  updateMaterialPurchase(id: string, purchase: Partial<InsertMaterialPurchase>): Promise<MaterialPurchase | undefined>;
  deleteMaterialPurchase(id: string): Promise<void>;
  
  // Transportation Expenses
  getAllTransportationExpenses(): Promise<TransportationExpense[]>;
  getTransportationExpenses(project_id: string, date?: string): Promise<TransportationExpense[]>;
  createTransportationExpense(expense: InsertTransportationExpense): Promise<TransportationExpense>;
  updateTransportationExpense(id: string, expense: Partial<InsertTransportationExpense>): Promise<TransportationExpense | undefined>;
  deleteTransportationExpense(id: string): Promise<void>;
  
  // Daily Expense Summaries
  getDailyExpenseSummary(project_id: string, date: string): Promise<DailyExpenseSummary | undefined>;
  createOrUpdateDailyExpenseSummary(summary: InsertDailyExpenseSummary): Promise<DailyExpenseSummary>;
  updateDailyExpenseSummary(id: string, summary: Partial<InsertDailyExpenseSummary>): Promise<DailyExpenseSummary | undefined>;
  getPreviousDayBalance(project_id: string, currentDate: string): Promise<string>;
  deleteDailySummary(project_id: string, date: string): Promise<void>;
  getDailySummary(project_id: string, date: string): Promise<DailyExpenseSummary | null>;
  
  // Worker Balance Management
  getWorkerBalance(worker_id: string, project_id: string): Promise<WorkerBalance | undefined>;
  updateWorkerBalance(worker_id: string, project_id: string, balance: Partial<InsertWorkerBalance>): Promise<WorkerBalance>;
  
  // Worker Transfers
  getWorkerTransfers(worker_id: string, project_id?: string): Promise<WorkerTransfer[]>;
  getWorkerTransfer(id: string): Promise<WorkerTransfer | null>;
  createWorkerTransfer(transfer: InsertWorkerTransfer): Promise<WorkerTransfer>;
  updateWorkerTransfer(id: string, transfer: Partial<InsertWorkerTransfer>): Promise<WorkerTransfer | undefined>;
  deleteWorkerTransfer(id: string): Promise<void>;
  getAllWorkerTransfers(): Promise<WorkerTransfer[]>;
  getFilteredWorkerTransfers(project_id?: string, date?: string): Promise<WorkerTransfer[]>;
  
  // Project Statistics
  getProjectStatistics(project_id: string): Promise<any>;
  
  // Reports
  getWorkerAccountStatement(worker_id: string, project_id?: string, dateFrom?: string, dateTo?: string): Promise<{
    attendance: WorkerAttendance[];
    transfers: WorkerTransfer[];
    balance: WorkerBalance | null;
  }>;
  
  // Multi-project worker management
  getWorkersWithMultipleProjects(): Promise<{worker: Worker, projects: Project[], totalBalance: string}[]>;
  getWorkerMultiProjectStatement(worker_id: string, dateFrom?: string, dateTo?: string): Promise<{
    worker: Worker;
    projects: {
      project: Project;
      attendance: WorkerAttendance[];
      balance: WorkerBalance | null;
      transfers: WorkerTransfer[];
    }[];
    totals: {
      totalEarned: string;
      totalPaid: string;
      totalTransferred: string;
      totalBalance: string;
    };
  }>;
  getWorkerProjects(worker_id: string): Promise<Project[]>;
  updateDailySummaryForDate(project_id: string, date: string): Promise<void>;
  getDailyExpensesRange(project_id: string, dateFrom: string, dateTo: string): Promise<any[]>;
  
  // Autocomplete data
  getAutocompleteData(category: string): Promise<AutocompleteData[]>;
  saveAutocompleteData(data: InsertAutocompleteData): Promise<AutocompleteData>;
  removeAutocompleteData(category: string, value: string): Promise<void>;
  
  // Worker miscellaneous expenses
  getWorkerMiscExpenses(project_id: string, date?: string): Promise<WorkerMiscExpense[]>;
  getWorkerMiscExpense(id: string): Promise<WorkerMiscExpense | null>;
  createWorkerMiscExpense(expense: InsertWorkerMiscExpense): Promise<WorkerMiscExpense>;
  updateWorkerMiscExpense(id: string, expense: Partial<InsertWorkerMiscExpense>): Promise<WorkerMiscExpense | undefined>;
  deleteWorkerMiscExpense(id: string): Promise<void>;
  
  // Advanced Reports
  getExpensesForReport(project_id: string, dateFrom: string, dateTo: string): Promise<any[]>;
  getIncomeForReport(project_id: string, dateFrom: string, dateTo: string): Promise<any[]>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getEmergencyUser(id: string): Promise<EmergencyUser | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Refresh Tokens
  getRefreshToken(id: string): Promise<RefreshToken | undefined>;
  getRefreshTokenByHash(hash: string): Promise<RefreshToken | undefined>;
  getRefreshTokensByUser(user_id: string): Promise<RefreshToken[]>;
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  updateRefreshToken(id: string, token: Partial<InsertRefreshToken>): Promise<RefreshToken | undefined>;
  revokeAllUserTokens(user_id: string): Promise<void>;
  revokeTokenFamily(rootId: string): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(user_id?: string, action?: string): Promise<AuditLog[]>;

  // Daily Activity Logs
  getDailyLogs(project_id?: string, date?: string): Promise<DailyActivityLog[]>;
  createDailyLog(log: InsertDailyActivityLog): Promise<DailyActivityLog>;
  updateDailyLog(id: string, log: Partial<InsertDailyActivityLog>): Promise<DailyActivityLog | undefined>;
  deleteDailyLog(id: string): Promise<void>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  getSupplierByName(name: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<void>;
  
  // Supplier Payments
  getAllSupplierPayments(): Promise<SupplierPayment[]>;
  getSupplierPayments(supplier_id: string, project_id?: string): Promise<SupplierPayment[]>;
  getSupplierPayment(id: string): Promise<SupplierPayment | undefined>;
  createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment>;
  updateSupplierPayment(id: string, payment: Partial<InsertSupplierPayment>): Promise<SupplierPayment | undefined>;
  deleteSupplierPayment(id: string): Promise<void>;
  
  // Supplier Reports
  getSupplierAccountStatement(supplier_id: string, project_id?: string, dateFrom?: string, dateTo?: string): Promise<{
    supplier: Supplier;
    purchases: MaterialPurchase[];
    payments: SupplierPayment[];
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    // إضافة الحسابات المنفصلة للنقدي والآجل
    cashPurchases: {
      total: string;
      count: number;
      purchases: MaterialPurchase[];
    };
    creditPurchases: {
      total: string;
      count: number;
      purchases: MaterialPurchase[];
    };
  }>;
  
  // إحصائيات عامة لحساب الموردين
  getSupplierStatistics(filters?: {
    supplier_id?: string;
    project_id?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    totalSuppliers: number;
    totalCashPurchases: string;
    totalCreditPurchases: string;
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    activeSuppliers: number;
  }>;
  
  // Purchase filtering for supplier reports
  getPurchasesBySupplier(supplier_id: string, purchaseType?: string, dateFrom?: string, dateTo?: string): Promise<MaterialPurchase[]>;
  
  // Print Settings
  getPrintSettings(reportType?: string, user_id?: string): Promise<PrintSettings[]>;
  getPrintSettingsById(id: string): Promise<PrintSettings | undefined>;
  createPrintSettings(settings: InsertPrintSettings): Promise<PrintSettings>;
  updatePrintSettings(id: string, settings: Partial<InsertPrintSettings>): Promise<PrintSettings | undefined>;
  deletePrintSettings(id: string): Promise<void>;
  getDefaultPrintSettings(reportType: string): Promise<PrintSettings | undefined>;
  

  
  // Report Templates
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  getActiveReportTemplate(): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string): Promise<void>;

  // =====================================================
  // نظام إدارة المعدات المبسط
  // =====================================================

  // Equipment - Simple Management
  getEquipment(filters?: {
    project_id?: string;
    status?: string;
    type?: string;
    searchTerm?: string;
  }): Promise<Equipment[]>;
  getEquipmentById(id: string): Promise<Equipment | undefined>;
  getEquipmentByCode(code: string): Promise<Equipment | undefined>;
  getEquipmentByProject(project_id: string): Promise<Equipment[]>;
  generateNextEquipmentCode(): Promise<string>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<void>;

  // Equipment Movements - Simple Tracking
  getEquipmentMovements(equipmentId: string): Promise<EquipmentMovement[]>;
  createEquipmentMovement(movement: InsertEquipmentMovement): Promise<EquipmentMovement>;
  updateEquipmentMovement(id: string, movement: Partial<InsertEquipmentMovement>): Promise<EquipmentMovement | undefined>;

  // Notifications
  createNotification(notif: InsertNotification): Promise<Notification>;
  getNotifications(user_id?: string): Promise<Notification[]>;

  // Wells Management System (نظام إدارة الآبار)
  getWellTasks(well_id: number): Promise<WellTask[]>;
  getWellTask(id: number): Promise<WellTask | undefined>;
  createWellTask(task: InsertWellTask): Promise<WellTask>;
  updateWellTask(id: number, task: Partial<InsertWellTask>): Promise<WellTask | undefined>;
  deleteWellTask(id: number): Promise<void>;

  // Database Administration
  getDatabaseTables(): Promise<any[]>;
  toggleTableRLS(tableName: string, enable: boolean): Promise<any>;
  getTablePolicies(tableName: string): Promise<any[]>;
  analyzeSecurityThreats(): Promise<any>;
  exportData(): Promise<any>;

  // WebAuthn Credentials
  createWebAuthnCredential(data: InsertWebAuthnCredential): Promise<WebAuthnCredential>;
  getWebAuthnCredentialsByUserId(userId: string): Promise<WebAuthnCredential[]>;
  getWebAuthnCredentialByCredentialId(credentialId: string): Promise<WebAuthnCredential | undefined>;
  updateWebAuthnCredentialCounter(credentialId: string, counter: number): Promise<void>;
  deleteWebAuthnCredential(credentialId: string): Promise<void>;
  deleteAllWebAuthnCredentialsByUserId(userId: string): Promise<void>;

  // User Preferences
  getUserPreferences(userId: string): Promise<any | undefined>;
  upsertUserPreferences(userId: string, prefs: Record<string, any>): Promise<any>;

  // WebAuthn Challenges
  createWebAuthnChallenge(data: InsertWebAuthnChallenge): Promise<WebAuthnChallenge>;
  getWebAuthnChallenge(challenge: string): Promise<WebAuthnChallenge | undefined>;
  deleteWebAuthnChallenge(challenge: string): Promise<void>;
  cleanupExpiredChallenges(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Monitoring Implementations
  async upsertDevice(device: InsertDevice): Promise<Device> {
    const [existing] = await db.select().from(devices).where(eq(devices.deviceId, device.deviceId));
    if (existing) {
      const [updated] = await db.update(devices).set({ 
        ...device, 
        lastSeen: new Date(),
        metadata: { ...(existing.metadata as object || {}), ...(device.metadata as object || {}) }
      }).where(eq(devices.deviceId, device.deviceId)).returning();
      return updated;
    }
    const [inserted] = await db.insert(devices).values(device).returning();
    return inserted;
  }

  async getDevices(): Promise<Device[]> {
    try {
      return await db.select().from(devices).orderBy(desc(devices.lastSeen));
    } catch (error) {
      console.error("Error fetching devices from database:", error);
      return [];
    }
  }

  async createCrash(crash: InsertCrash): Promise<Crash> {
    const [newCrash] = await db.insert(crashes).values(crash).returning();
    return newCrash;
  }

  async getRecentCrashes(limit: number): Promise<Crash[]> {
    try {
      // Use raw SQL to avoid schema mismatch issues with exception_type column
      // Added message, severity, app_state, metadata to the SELECT list
      const result = await db.execute(sql`SELECT id, device_id, stack_trace, app_version, timestamp, exception_type, message, severity, app_state, metadata FROM crashes ORDER BY timestamp DESC LIMIT ${limit}`);
      return (result.rows || []).map((r: any) => ({
        id: r.id,
        deviceId: r.device_id,
        stackTrace: r.stack_trace,
        appVersion: r.app_version,
        timestamp: r.timestamp,
        exceptionType: r.exception_type || "Unknown",
        message: r.message || "Error details unavailable",
        severity: r.severity || "critical",
        appState: r.app_state || null,
        metadata: r.metadata || null
      })) as Crash[];
    } catch (error) {
      console.error("Error fetching crashes from DB:", error);
      return [];
    }
  }

  async createMetric(metric: InsertMetric): Promise<Metric> {
    const [newMetric] = await db.insert(metrics).values(metric).returning();
    return newMetric;
  }

  // Notifications Implementations
  async createNotification(notif: InsertNotification): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values({
      ...notif,
      targetPlatform: notif.targetPlatform || 'all'
    }).returning();
    return newNotif;
  }

  async getNotifications(user_id?: string): Promise<Notification[]> {
    if (user_id) {
      return await db.select().from(notifications).where(eq(notifications.user_id, user_id)).orderBy(desc(notifications.created_at));
    }
    return await db.select().from(notifications).orderBy(desc(notifications.created_at));
  }

  async getAdminNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(desc(notifications.created_at));
  }

  // Cache للمعدات - تحسين الأداء الفائق
  private equipmentCache: { data: any[], timestamp: number } | null = null;
  
  // Cache للإحصائيات - تحسين الأداء الفائق للمشاريع 
  private projectStatsCache: Map<string, { data: any, timestamp: number }> = new Map();
  
  private readonly CACHE_DURATION = 30 * 1000; // تقليل مدة الكاش لـ 30 ثانية لسرعة التحديث مع الحفاظ على الأداء

  // Tasks
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.created_at));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // WhatsApp AI
  async getWhatsAppStats(): Promise<WhatsAppStats | undefined> {
    const result = await db.select().from(whatsappStats).limit(1);
    return result[0];
  }

  async updateWhatsAppStats(stats: Partial<InsertWhatsAppStats>): Promise<WhatsAppStats> {
    const existing = await this.getWhatsAppStats();
    if (existing) {
      const [updated] = await db.update(whatsappStats)
        .set({ ...stats, updated_at: new Date() })
        .where(eq(whatsappStats.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(whatsappStats)
        .values(stats as InsertWhatsAppStats)
        .returning();
      return inserted;
    }
  }

  async createWhatsAppMessage(message: InsertWhatsAppMessage): Promise<WhatsAppMessage> {
    const [inserted] = await db.insert(whatsappMessages).values(message).returning();
    // Update stats count
    const stats = await this.getWhatsAppStats();
    await this.updateWhatsAppStats({ totalMessages: (stats?.totalMessages || 0) + 1 });
    return inserted;
  }

  async getWhatsAppMessagesCount(): Promise<number> {
    const stats = await this.getWhatsAppStats();
    return stats?.totalMessages || 0;
  }

  async getWhatsAppLastSync(): Promise<Date | null> {
    const stats = await this.getWhatsAppStats();
    return stats?.lastSync || null;
  }

  async getWhatsAppMessagesByUser(userId: string, limit: number = 50, offset: number = 0): Promise<WhatsAppMessage[]> {
    return await db.select().from(whatsappMessages)
      .where(eq(whatsappMessages.user_id, userId))
      .orderBy(desc(whatsappMessages.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getWhatsAppMessagesByPhone(phoneNumber: string, limit: number = 50, offset: number = 0): Promise<WhatsAppMessage[]> {
    return await db.select().from(whatsappMessages)
      .where(eq(whatsappMessages.phone_number, phoneNumber))
      .orderBy(desc(whatsappMessages.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async createWhatsAppSecurityEvent(event: InsertWhatsAppSecurityEvent): Promise<WhatsAppSecurityEvent> {
    const [inserted] = await db.insert(whatsappSecurityEvents).values(event).returning();
    return inserted;
  }

  async getWhatsAppSecurityEvents(filters?: { phone_number?: string; event_type?: string; limit?: number }): Promise<WhatsAppSecurityEvent[]> {
    const conditions = [];
    if (filters?.phone_number) {
      conditions.push(eq(whatsappSecurityEvents.phone_number, filters.phone_number));
    }
    if (filters?.event_type) {
      conditions.push(eq(whatsappSecurityEvents.event_type, filters.event_type));
    }
    const query = db.select().from(whatsappSecurityEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(whatsappSecurityEvents.created_at))
      .limit(filters?.limit || 100);
    return await query;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projectsTable);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    return project || undefined;
  }

  async getProjectByName(name: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.name, name.trim()));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    try {
      const [newProject] = await db
        .insert(projectsTable)
        .values({ ...project, name: project.name.trim() })
        .returning();
      
      if (!newProject) {
        throw new Error('فشل في إنشاء المشروع');
      }
      
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const updateData = project.name ? { ...project, name: project.name.trim() } : project;
    const [updated] = await db
      .update(projectsTable)
      .set(updateData)
      .where(eq(projectsTable.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
  }

  // Workers
  async getWorkers(): Promise<Worker[]> {
    return await db.select().from(workers);
  }

  async getWorker(id: string): Promise<Worker | undefined> {
    const [worker] = await db.select().from(workers).where(eq(workers.id, id));
    return worker || undefined;
  }

  async getWorkerByName(name: string): Promise<Worker | undefined> {
    const [worker] = await db.select().from(workers).where(eq(workers.name, name.trim()));
    return worker || undefined;
  }

  async createWorker(worker: InsertWorker): Promise<Worker> {
    try {
      const workerType = (worker.type || 'عامل عام').trim();
      const workerName = (worker.name || 'عامل جديد').trim();
      
      // التحقق من وجود نوع العامل وإضافته إذا لم يكن موجوداً
      await this.ensureWorkerTypeExists(workerType);
      
      const [newWorker] = await db
        .insert(workers)
        .values({ 
          ...worker, 
          name: workerName,
          type: workerType,
          dailyWage: worker.dailyWage || "0",
          phone: worker.phone || ""
        })
        .returning();
      
      if (!newWorker) {
        throw new Error('فشل في إنشاء العامل في قاعدة البيانات');
      }
      
      // تحديث عداد الاستخدام لنوع العامل
      await this.incrementWorkerTypeUsage(workerType);
      
      return newWorker;
    } catch (error: any) {
      console.error('❌ [Storage] Error creating worker:', error);
      throw new Error(error.message || 'خطأ داخلي في حفظ بيانات العامل');
    }
  }

  async updateWorker(id: string, worker: Partial<InsertWorker>): Promise<Worker | undefined> {
    const updateData = worker.name ? { ...worker, name: worker.name.trim() } : worker;
    const [updated] = await db
      .update(workers)
      .set(updateData)
      .where(eq(workers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWorker(id: string): Promise<void> {
    try {
      await db.delete(workers).where(eq(workers.id, id));
    } catch (error) {
      console.error('Error deleting worker:', error);
      throw new Error('فشل في حذف العامل');
    }
  }

  // Worker Project Wages (أجور العمال حسب المشروع)
  async getWorkerProjectWages(worker_id: string, project_id?: string): Promise<WorkerProjectWage[]> {
    try {
      const conditions = [eq(workerProjectWages.worker_id, worker_id)];
      if (project_id) {
        conditions.push(eq(workerProjectWages.project_id, project_id));
      }
      return await db.select().from(workerProjectWages)
        .where(and(...conditions))
        .orderBy(desc(workerProjectWages.effectiveFrom));
    } catch (error) {
      console.error('Error fetching worker project wages:', error);
      return [];
    }
  }

  async getWorkerProjectWage(id: string): Promise<WorkerProjectWage | null> {
    const [wage] = await db.select().from(workerProjectWages).where(eq(workerProjectWages.id, id));
    return wage || null;
  }

  async createWorkerProjectWage(wage: InsertWorkerProjectWage): Promise<WorkerProjectWage> {
    const [newWage] = await db.insert(workerProjectWages).values(wage).returning();
    if (!newWage) throw new Error('فشل في إنشاء أجر المشروع');
    return newWage;
  }

  async updateWorkerProjectWage(id: string, wage: Partial<InsertWorkerProjectWage>): Promise<WorkerProjectWage | undefined> {
    const [updated] = await db.update(workerProjectWages)
      .set({ ...wage, updated_at: new Date() })
      .where(eq(workerProjectWages.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWorkerProjectWage(id: string): Promise<boolean> {
    const result = await db.delete(workerProjectWages).where(eq(workerProjectWages.id, id)).returning();
    return result.length > 0;
  }

  async resolveEffectiveWage(worker_id: string, project_id: string, date: string): Promise<string> {
    try {
      const [projectWage] = await db.select().from(workerProjectWages)
        .where(and(
          eq(workerProjectWages.worker_id, worker_id),
          eq(workerProjectWages.project_id, project_id),
          eq(workerProjectWages.is_active, true),
          lte(workerProjectWages.effectiveFrom, date),
          or(
            isNull(workerProjectWages.effectiveTo),
            gte(workerProjectWages.effectiveTo, date)
          )
        ))
        .orderBy(desc(workerProjectWages.effectiveFrom))
        .limit(1);

      if (projectWage) {
        return projectWage.dailyWage;
      }

      const worker = await this.getWorker(worker_id);
      return worker?.dailyWage || '0';
    } catch (error) {
      console.error('Error resolving effective wage:', error);
      const worker = await this.getWorker(worker_id);
      return worker?.dailyWage || '0';
    }
  }

  // Worker Types
  async getWorkerTypes(): Promise<WorkerType[]> {
    try {
      return await db.select().from(workerTypes).orderBy(sql`${workerTypes.usageCount} DESC, ${workerTypes.name} ASC`);
    } catch (error) {
      console.error('Error fetching worker types:', error);
      throw new Error('خطأ في جلب أنواع العمال');
    }
  }

  async createWorkerType(workerType: InsertWorkerType): Promise<WorkerType> {
    try {
      const [newWorkerType] = await db
        .insert(workerTypes)
        .values({ ...workerType, name: workerType.name.trim() })
        .returning();
      
      if (!newWorkerType) {
        throw new Error('فشل في إنشاء نوع العامل');
      }
      
      return newWorkerType;
    } catch (error) {
      console.error('Error creating worker type:', error);
      throw new Error('خطأ في إضافة نوع العامل');
    }
  }

  // دالة للتأكد من وجود نوع العامل وإضافته إذا لم يكن موجوداً
  private async ensureWorkerTypeExists(typeName: string): Promise<void> {
    try {
      const trimmedName = typeName.trim();
      
      // البحث عن نوع العامل
      const [existingType] = await db
        .select()
        .from(workerTypes)
        .where(eq(workerTypes.name, trimmedName));
      
      // إذا لم يكن موجوداً، أضفه
      if (!existingType) {
        await db
          .insert(workerTypes)
          .values({ name: trimmedName })
          .onConflictDoNothing(); // تجنب الخطأ إذا تم إدراجه من مكان آخر
      }
    } catch (error) {
      console.error('Error ensuring worker type exists:', error);
      // لا نلقي خطأ هنا لأن هذا لا يجب أن يوقف إنشاء العامل
    }
  }

  // دالة لزيادة عداد استخدام نوع العامل
  private async incrementWorkerTypeUsage(typeName: string): Promise<void> {
    try {
      await db
        .update(workerTypes)
        .set({ 
          usageCount: sql`${workerTypes.usageCount} + 1`,
          lastUsed: new Date()
        })
        .where(eq(workerTypes.name, typeName.trim()));
    } catch (error) {
      console.error('Error incrementing worker type usage:', error);
      // لا نلقي خطأ هنا لأن هذا ليس حرجاً
    }
  }

  // Fund Transfers
  async getFundTransfers(project_id: string, date?: string): Promise<FundTransfer[]> {
    if (date) {
      const result = await db.select().from(fundTransfers)
        .where(and(eq(fundTransfers.project_id, project_id), sql`DATE(${fundTransfers.transferDate}) = ${date}`));
      return result;
    } else {
      const result = await db.select().from(fundTransfers)
        .where(eq(fundTransfers.project_id, project_id));
      return result;
    }
  }

  async getFundTransferByNumber(transferNumber: string): Promise<FundTransfer | undefined> {
    const [transfer] = await db.select().from(fundTransfers).where(eq(fundTransfers.transferNumber, transferNumber));
    return transfer || undefined;
  }

  async createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer> {
    try {
      console.log('💾 إنشاء حولة جديدة في قاعدة البيانات:', {
        project_id: transfer.project_id,
        amount: transfer.amount,
        transferType: transfer.transferType,
        senderName: transfer.senderName
      });
      
      const safeTransfer: any = { ...transfer };
      if (typeof safeTransfer.transferDate === 'string') {
        const dateStr = safeTransfer.transferDate.includes('T') ? safeTransfer.transferDate.split('T')[0] : safeTransfer.transferDate;
        safeTransfer.transferDate = new Date(dateStr + 'T00:00:00');
      }
      if (safeTransfer.updated_at && typeof safeTransfer.updated_at === 'string') {
        safeTransfer.updated_at = new Date(safeTransfer.updated_at);
      }
      const [newTransfer] = await db
        .insert(fundTransfers)
        .values(safeTransfer)
        .returning();
      
      if (!newTransfer) {
        throw new Error('فشل في إنشاء تحويل العهدة - لم يتم إرجاع البيانات من قاعدة البيانات');
      }
      
      console.log('✅ تم إنشاء الحولة بنجاح في قاعدة البيانات:', newTransfer.id);
      
      // تحديث الملخص اليومي في الخلفية (دون انتظار)
      const transferDate = new Date(transfer.transferDate).toISOString().split('T')[0];
      this.updateDailySummaryForDate(transfer.project_id, transferDate).catch(console.error);
      
      return newTransfer;
    } catch (error: any) {
      console.error('❌ خطأ في إنشاء الحولة:', error);
      
      // إذا كان الخطأ متعلق بتكرار رقم التحويل
      if (error.code === '23505' && error.constraint?.includes('transfer_number')) {
        throw new Error('يوجد تحويل بنفس رقم الحوالة مسبقاً');
      }
      
      // إذا كان الخطأ متعلق بمرجع خارجي غير صحيح (المشروع غير موجود)
      if (error.code === '23503') {
        throw new Error('المشروع المحدد غير موجود');
      }
      
      // إذا كان الخطأ متعلق بقيود البيانات
      if (error.code === '23514') {
        throw new Error('البيانات المدخلة لا تتوافق مع قيود قاعدة البيانات');
      }
      
      // خطأ عام
      throw new Error(error.message || 'حدث خطأ غير متوقع أثناء إنشاء الحولة');
    }
  }

  async updateFundTransfer(id: string, transfer: Partial<InsertFundTransfer>): Promise<FundTransfer | undefined> {
    const [oldTransfer] = await db.select().from(fundTransfers).where(eq(fundTransfers.id, id));
    
    const safeTransfer: any = { ...transfer };
    if (typeof safeTransfer.transferDate === 'string') {
      const dateStr = safeTransfer.transferDate.includes('T') ? safeTransfer.transferDate.split('T')[0] : safeTransfer.transferDate;
      safeTransfer.transferDate = new Date(dateStr + 'T00:00:00');
    }
    if (safeTransfer.updated_at && typeof safeTransfer.updated_at === 'string') {
      safeTransfer.updated_at = new Date(safeTransfer.updated_at);
    }
    const [updated] = await db
      .update(fundTransfers)
      .set(safeTransfer)
      .where(eq(fundTransfers.id, id))
      .returning();
    
    if (updated && oldTransfer) {
      const oldDate = new Date(oldTransfer.transferDate).toISOString().split('T')[0];
      await this.updateDailySummaryForDate(oldTransfer.project_id, oldDate);
      
      if (transfer.transferDate) {
        const newDate = new Date(transfer.transferDate).toISOString().split('T')[0];
        if (newDate !== oldDate) {
          await this.updateDailySummaryForDate(updated.project_id, newDate);
        }
      }
    }
    
    return updated || undefined;
  }

  async deleteFundTransfer(id: string): Promise<void> {
    const [transfer] = await db.select().from(fundTransfers).where(eq(fundTransfers.id, id));
    
    await db.delete(fundTransfers).where(eq(fundTransfers.id, id));
    
    if (transfer) {
      const transferDate = new Date(transfer.transferDate).toISOString().split('T')[0];
      await this.updateDailySummaryForDate(transfer.project_id, transferDate);
    }
  }

  // دالة مساعدة لجلب عمليات ترحيل الأموال لمشروع معين في تاريخ محدد
  async getProjectFundTransfersForDate(project_id: string, date: string): Promise<ProjectFundTransfer[]> {
    const transfers = await db.select().from(projectFundTransfers)
      .where(
        and(
          or(
            eq(projectFundTransfers.fromProjectId, project_id),
            eq(projectFundTransfers.toProjectId, project_id)
          ),
          eq(projectFundTransfers.transferDate, date)
        )
      );
    return transfers;
  }

  // Project Fund Transfers (ترحيل الأموال بين المشاريع)
  async getProjectFundTransfers(fromProjectId?: string, toProjectId?: string, date?: string): Promise<ProjectFundTransfer[]> {
    const conditions = [];
    if (fromProjectId) {
      conditions.push(eq(projectFundTransfers.fromProjectId, fromProjectId));
    }
    if (toProjectId) {
      conditions.push(eq(projectFundTransfers.toProjectId, toProjectId));
    }
    if (date) {
      conditions.push(eq(projectFundTransfers.transferDate, date));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(projectFundTransfers).where(and(...conditions));
    }
    
    return await db.select().from(projectFundTransfers);
  }

  async getProjectFundTransfer(id: string): Promise<ProjectFundTransfer | undefined> {
    const [transfer] = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    return transfer || undefined;
  }

  async createProjectFundTransfer(transfer: InsertProjectFundTransfer): Promise<ProjectFundTransfer> {
    try {
      // التحقق من أن المشروعين مختلفين
      if (transfer.fromProjectId === transfer.toProjectId) {
        throw new Error('لا يمكن ترحيل الأموال إلى نفس المشروع');
      }

      // التحقق من وجود المشروعين
      const fromProject = await this.getProject(transfer.fromProjectId);
      const toProject = await this.getProject(transfer.toProjectId);
      
      if (!fromProject) {
        throw new Error('المشروع المرسل غير موجود');
      }
      if (!toProject) {
        throw new Error('المشروع المستلم غير موجود');
      }

      // إنشاء عملية الترحيل
      const [newTransfer] = await db
        .insert(projectFundTransfers)
        .values(transfer)
        .returning();
      
      if (!newTransfer) {
        throw new Error('فشل في إنشاء عملية الترحيل');
      }
      
      // تحديث الملخصات اليومية للمشروعين
      if (transfer.transferDate) {
        await this.updateDailySummaryForDate(transfer.fromProjectId, transfer.transferDate);
        await this.updateDailySummaryForDate(transfer.toProjectId, transfer.transferDate);
      }
      
      return newTransfer;
    } catch (error) {
      console.error('Error creating project fund transfer:', error);
      throw error;
    }
  }

  async updateProjectFundTransfer(id: string, transfer: Partial<InsertProjectFundTransfer>): Promise<ProjectFundTransfer | undefined> {
    const [oldTransfer] = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    
    const [updated] = await db
      .update(projectFundTransfers)
      .set(transfer)
      .where(eq(projectFundTransfers.id, id))
      .returning();
    
    if (updated && oldTransfer) {
      // تحديث الملخصات اليومية للمشاريع المتأثرة
      await this.updateDailySummaryForDate(oldTransfer.fromProjectId, oldTransfer.transferDate);
      await this.updateDailySummaryForDate(oldTransfer.toProjectId, oldTransfer.transferDate);
      
      if (transfer.transferDate) {
        await this.updateDailySummaryForDate(updated.fromProjectId, updated.transferDate);
        await this.updateDailySummaryForDate(updated.toProjectId, updated.transferDate);
      }
    }
    
    return updated || undefined;
  }

  async deleteProjectFundTransfer(id: string): Promise<void> {
    const [transfer] = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    
    await db.delete(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    
    if (transfer) {
      // تحديث الملخصات اليومية للمشروعين
      if (transfer.transferDate) {
        await this.updateDailySummaryForDate(transfer.fromProjectId, transfer.transferDate);
        await this.updateDailySummaryForDate(transfer.toProjectId, transfer.transferDate);
      }
    }
  }

  // Worker Attendance
  async getWorkerAttendance(project_id: string, date?: string): Promise<WorkerAttendance[]> {
    if (date) {
      const result = await db.select().from(workerAttendance)
        .where(and(eq(workerAttendance.project_id, project_id), sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) = ${date}`));
      return result;
    } else {
      const result = await db.select().from(workerAttendance)
        .where(eq(workerAttendance.project_id, project_id));
      return result;
    }
  }

  async getWorkerAttendanceById(id: string): Promise<WorkerAttendance | null> {
    const [attendance] = await db.select().from(workerAttendance).where(eq(workerAttendance.id, id));
    return attendance || null;
  }

  async createWorkerAttendance(attendance: InsertWorkerAttendance): Promise<WorkerAttendance> {
    // التحقق من عدم وجود حضور مسجل مسبقاً لنفس العامل في نفس اليوم
    const existingAttendance = await db.select().from(workerAttendance)
      .where(and(
        eq(workerAttendance.worker_id, attendance.worker_id),
        sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) = ${attendance.date ?? ''}`,
        eq(workerAttendance.project_id, attendance.project_id)
      ));
    
    if (existingAttendance.length > 0) {
      throw new Error("تم تسجيل حضور هذا العامل مسبقاً في هذا التاريخ");
    }
    
    // حساب الأجر الفعلي بناءً على عدد أيام العمل
    const workDays = parseFloat(attendance.workDays?.toString() || '1.0');
    const dailyWage = parseFloat(attendance.dailyWage.toString());
    const actualWage = dailyWage * workDays;
    
    // إعداد الحضور مع الأجر المحسوب
    const attendanceData = {
      ...attendance,
      workDays: workDays.toString(),
      actualWage: actualWage.toString(),
      remainingAmount: attendance.paymentType === 'credit' 
        ? actualWage.toString() 
        : (actualWage - parseFloat(attendance.paidAmount?.toString() || '0')).toString()
    };
    
    try {
      const [newAttendance] = await db
        .insert(workerAttendance)
        .values(attendanceData)
        .returning();
      
      if (!newAttendance) {
        throw new Error('فشل في حفظ حضور العامل');
      }
      
      // تحديث الملخص اليومي في الخلفية (دون انتظار)
      this.updateDailySummaryForDate(attendance.project_id, attendance.date ?? attendance.attendanceDate).catch(console.error);
      
      return newAttendance;
    } catch (error: any) {
      console.error('Error creating worker attendance:', error);
      
      // إذا كان الخطأ متعلق بتكرار الحضور
      if (error.code === '23505' && error.constraint?.includes('unique')) {
        throw new Error('تم تسجيل حضور هذا العامل مسبقاً في هذا التاريخ');
      }
      
      throw error;
    }
  }

  async updateWorkerAttendance(id: string, attendance: Partial<InsertWorkerAttendance>): Promise<WorkerAttendance | undefined> {
    // الحصول على البيانات الحالية لحساب الأجر إذا تم تحديث عدد الأيام
    const [currentAttendance] = await db.select().from(workerAttendance).where(eq(workerAttendance.id, id));
    
    // إعداد بيانات التحديث مع التحويل المناسب للأنواع
    let updateData: any = {};
    
    // نسخ الحقول العادية
    Object.keys(attendance).forEach(key => {
      if (key !== 'workDays') {
        updateData[key] = attendance[key as keyof typeof attendance];
      }
    });
    
    // إعادة حساب الأجر الفعلي إذا تم تغيير عدد أيام العمل أو الأجر اليومي
    if (attendance.workDays !== undefined || attendance.dailyWage) {
      const workDays = typeof attendance.workDays === 'number' 
        ? attendance.workDays 
        : parseFloat(currentAttendance?.workDays || '1.0');
      const dailyWage = attendance.dailyWage 
        ? parseFloat(attendance.dailyWage.toString())
        : parseFloat(currentAttendance?.dailyWage || '0');
      
      const actualWage = dailyWage * workDays;
      
      // تحويل الأرقام إلى نصوص للحفظ في قاعدة البيانات
      updateData.workDays = workDays.toString();
      updateData.actualWage = actualWage.toString();
      
      // إعادة حساب المبلغ المتبقي
      const paidAmount = attendance.paidAmount 
        ? parseFloat(attendance.paidAmount.toString())
        : parseFloat(currentAttendance?.paidAmount || '0');
      
      updateData.remainingAmount = attendance.paymentType === 'credit' 
        ? actualWage.toString() 
        : (actualWage - paidAmount).toString();
    }
    
    const [updated] = await db
      .update(workerAttendance)
      .set(updateData)
      .where(eq(workerAttendance.id, id))
      .returning();
    
    if (updated) {
      await this.updateDailySummaryForDate(updated.project_id, updated.date);
    }
    
    return updated || undefined;
  }

  async deleteWorkerAttendance(id: string): Promise<void> {
    const [attendance] = await db.select().from(workerAttendance).where(eq(workerAttendance.id, id));
    
    await db.delete(workerAttendance).where(eq(workerAttendance.id, id));
    
    if (attendance) {
      await this.updateDailySummaryForDate(attendance.project_id, attendance.date);
    }
  }

  // Materials
  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials);
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db
      .insert(materials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [updated] = await db.update(materials).set(material).where(eq(materials.id, id)).returning();
    return updated || undefined;
  }

  async findMaterialByNameAndUnit(name: string, unit: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials)
      .where(and(eq(materials.name, name), eq(materials.unit, unit)));
    return material || undefined;
  }

  // Material Purchases
  async getMaterialPurchases(project_id: string, dateFrom?: string, dateTo?: string, purchaseType?: string): Promise<any[]> {
    // جلب مشتريات المواد - البيانات محفوظة مباشرة بدون انضمام
    const purchases = await db
      .select({
        id: materialPurchases.id,
        project_id: materialPurchases.project_id,
        quantity: materialPurchases.quantity,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        purchaseType: materialPurchases.purchaseType,
        supplierName: materialPurchases.supplierName,
        invoiceNumber: materialPurchases.invoiceNumber,
        invoiceDate: materialPurchases.invoiceDate,
        invoicePhoto: materialPurchases.invoicePhoto,
        notes: materialPurchases.notes,
        purchaseDate: materialPurchases.purchaseDate,
        created_at: materialPurchases.created_at,
        // بيانات المادة محفوظة مباشرة في الجدول
        materialName: materialPurchases.materialName,
        unit: materialPurchases.unit
      })
      .from(materialPurchases)
      .where(
        (() => {
          const conditions = [eq(materialPurchases.project_id, project_id)];
          
          if (dateFrom && dateTo) {
            conditions.push(eq(materialPurchases.purchaseDate, dateFrom));
          }
          
          if (purchaseType) {
            conditions.push(eq(materialPurchases.purchaseType, purchaseType));
          }
          
          return and(...conditions);
        })()
      )
      .orderBy(materialPurchases.created_at);

    // تحويل البيانات للشكل المطلوب
    return purchases.map((purchase: any) => ({
      id: purchase.id,
      project_id: purchase.project_id,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      purchaseType: purchase.purchaseType,
      supplierName: purchase.supplierName,
      invoiceNumber: purchase.invoiceNumber,
      invoiceDate: purchase.invoiceDate,
      invoicePhoto: purchase.invoicePhoto,
      notes: purchase.notes,
      purchaseDate: purchase.purchaseDate,
      created_at: purchase.created_at,
      // تجهيز بيانات المادة بنفس التنسيق المتوقع
      material: {
        id: null, // لا يوجد معرف منفصل للمادة
        name: purchase.materialName,
        category: null, // الفئة غير محفوظة في المشتريات
        unit: purchase.unit,
        created_at: null
      },
      // إضافة الحقول مباشرة أيضاً للتوافق مع الواجهة
      materialName: purchase.materialName,
      unit: purchase.unit
    }));
  }

  async getMaterialPurchasesWithFilters(filters: {
    supplier_id?: string;
    project_id?: string;
    dateFrom?: string;
    dateTo?: string;
    purchaseType?: string;
  }): Promise<any[]> {
    const { supplier_id, project_id, dateFrom, dateTo, purchaseType } = filters;
    
    // إنشاء شروط البحث
    const conditions = [];
    
    if (supplier_id) {
      // جلب اسم المورد من جدول الموردين
      const supplierData = await db.select({ name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.id, supplier_id));
      
      const supplierName = supplierData[0]?.name;
      console.log(`🔍 البحث عن المورد: ID=${supplier_id}, Name=${supplierName}`);
      
      if (supplierName) {
        // البحث بـ supplierName أولاً (لأن البيانات محفوظة بهذا الشكل)
        conditions.push(eq(materialPurchases.supplierName, supplierName));
        console.log(`✅ إضافة شرط البحث بـ supplierName: ${supplierName}`);
      } else {
        console.log(`❌ لم يتم العثور على اسم المورد للـ ID: ${supplier_id}`);
        // في حالة عدم وجود اسم، ابحث بـ supplier_id
        conditions.push(eq(materialPurchases.supplier_id, supplier_id));
      }
    }
    
    if (project_id && project_id !== 'all') {
      conditions.push(eq(materialPurchases.project_id, project_id));
    }
    
    if (dateFrom) {
      conditions.push(gte(materialPurchases.purchaseDate, dateFrom));
    }
    
    if (dateTo) {
      conditions.push(lte(materialPurchases.purchaseDate, dateTo));
    }
    
    if (purchaseType && purchaseType !== 'all') {
      // إضافة شرط فلترة purchaseType مع التعامل مع الأحرف العربية المختلفة
      console.log(`🔍 فلتر purchaseType المطلوب: "${purchaseType}"`);
      // البحث عن كلا الشكلين: "أجل" و "آجل"
      if (purchaseType === 'أجل') {
        conditions.push(or(
          sql`${materialPurchases.purchaseType} LIKE ${'%أجل%'}`,
          sql`${materialPurchases.purchaseType} LIKE ${'%آجل%'}`
        ));
      } else {
        conditions.push(sql`${materialPurchases.purchaseType} LIKE ${'%' + purchaseType + '%'}`);
      }
    }

    // جلب المشتريات مع معلومات المواد والموردين
    const purchases = await db
      .select({
        id: materialPurchases.id,
        project_id: materialPurchases.project_id,
        material_id: materialPurchases.material_id,
        supplier_id: materialPurchases.supplier_id,
        quantity: materialPurchases.quantity,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        purchaseType: materialPurchases.purchaseType,
        supplierName: materialPurchases.supplierName,
        invoiceNumber: materialPurchases.invoiceNumber,
        invoiceDate: materialPurchases.invoiceDate,
        invoicePhoto: materialPurchases.invoicePhoto,
        notes: materialPurchases.notes,
        purchaseDate: materialPurchases.purchaseDate,
        created_at: materialPurchases.created_at,
        // إضافة الحقول المالية المطلوبة
        paidAmount: materialPurchases.paidAmount,
        remainingAmount: materialPurchases.remainingAmount,
        dueDate: materialPurchases.dueDate,
        // معلومات المادة
        materialName: materials.name,
        materialCategory: materials.category,
        materialUnit: materials.unit,
        // معلومات المشروع
        projectName: projects.name
      })
      .from(materialPurchases)
      .leftJoin(materials, eq(materialPurchases.material_id, materials.id))
      .leftJoin(projects, eq(materialPurchases.project_id, projects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(materialPurchases.created_at);
      
    console.log(`📊 استعلم قاعدة البيانات وحصل على ${purchases.length} مشترى`);

    console.log(`🔍 إرجاع ${purchases.length} مشترى بعد التطبيق الفلاتر`);
    
    return purchases.map((purchase: any) => ({
      id: purchase.id,
      project_id: purchase.project_id,
      material_id: purchase.material_id,
      supplier_id: purchase.supplier_id,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      purchaseType: purchase.purchaseType,
      supplierName: purchase.supplierName,
      invoiceNumber: purchase.invoiceNumber,
      invoiceDate: purchase.invoiceDate,
      invoicePhoto: purchase.invoicePhoto,
      notes: purchase.notes,
      purchaseDate: purchase.purchaseDate,
      created_at: purchase.created_at,
      // إضافة الحقول المفقودة بقيم افتراضية
      paidAmount: purchase.paidAmount || "0",
      remainingAmount: purchase.remainingAmount || "0",
      dueDate: purchase.dueDate || null,
      material: {
        id: purchase.material_id,
        name: purchase.materialName,
        category: purchase.materialCategory,
        unit: purchase.materialUnit
      },
      project: {
        name: purchase.projectName
      }
    }));
  }

  async getMaterialPurchasesDateRange(): Promise<{ minDate: string; maxDate: string }> {
    const result = await db
      .select({
        minDate: sql<string>`MIN(${materialPurchases.purchaseDate})`,
        maxDate: sql<string>`MAX(${materialPurchases.purchaseDate})`
      })
      .from(materialPurchases);

    return {
      minDate: result[0]?.minDate || new Date().toISOString().split('T')[0],
      maxDate: result[0]?.maxDate || new Date().toISOString().split('T')[0]
    };
  }

  async getMaterialPurchaseById(id: string): Promise<MaterialPurchase | null> {
    const [purchase] = await db.select().from(materialPurchases).where(eq(materialPurchases.id, id));
    return purchase || null;
  }

  async createMaterialPurchase(purchase: InsertMaterialPurchase): Promise<MaterialPurchase> {
    // تحويل الأرقام إلى strings حسب schema
    const purchaseData = {
      ...purchase,
      quantity: purchase.quantity.toString(),
      unitPrice: (purchase.unitPrice ?? 0).toString(),
      totalAmount: (purchase.totalAmount ?? 0).toString(),
      paidAmount: (purchase.paidAmount ?? 0).toString(),
      remainingAmount: (purchase.remainingAmount ?? 0).toString()
    };
    
    const [newPurchase] = await db
      .insert(materialPurchases)
      .values(purchaseData)
      .returning();
    
    // تحديث الملخص اليومي في الخلفية (دون انتظار) لتحسين الأداء
    setImmediate(() => {
      this.updateDailySummaryForDate(purchase.project_id, purchase.purchaseDate)
        .catch(error => console.error("Error updating daily summary:", error));
    });
    
    return newPurchase;
  }

  async updateMaterialPurchase(id: string, purchase: Partial<InsertMaterialPurchase>): Promise<MaterialPurchase | undefined> {
    // تحويل الأرقام إلى strings إذا كانت موجودة
    const purchaseData: any = { ...purchase };
    if (purchaseData.quantity !== undefined) purchaseData.quantity = purchaseData.quantity.toString();
    if (purchaseData.unitPrice !== undefined) purchaseData.unitPrice = purchaseData.unitPrice.toString();
    if (purchaseData.totalAmount !== undefined) purchaseData.totalAmount = purchaseData.totalAmount.toString();
    if (purchaseData.paidAmount !== undefined) purchaseData.paidAmount = purchaseData.paidAmount.toString();
    if (purchaseData.remainingAmount !== undefined) purchaseData.remainingAmount = purchaseData.remainingAmount.toString();
    
    const [updated] = await db
      .update(materialPurchases)
      .set(purchaseData)
      .where(eq(materialPurchases.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMaterialPurchase(id: string): Promise<void> {
    const [purchase] = await db.select().from(materialPurchases).where(eq(materialPurchases.id, id));
    
    await db.delete(materialPurchases).where(eq(materialPurchases.id, id));
    
    if (purchase) {
      await this.updateDailySummaryForDate(purchase.project_id, purchase.purchaseDate);
    }
  }

  // Transportation Expenses
  async getAllTransportationExpenses(): Promise<TransportationExpense[]> {
    try {
      return await db.select().from(transportationExpenses).orderBy(transportationExpenses.date, transportationExpenses.id);
    } catch (error) {
      console.error('Error getting all transportation expenses:', error);
      return [];
    }
  }

  async getTransportationExpenses(project_id: string, date?: string): Promise<TransportationExpense[]> {
    if (date) {
      return await db.select().from(transportationExpenses)
        .where(and(eq(transportationExpenses.project_id, project_id), eq(transportationExpenses.date, date)));
    } else {
      return await db.select().from(transportationExpenses)
        .where(eq(transportationExpenses.project_id, project_id));
    }
  }

  async createTransportationExpense(expense: InsertTransportationExpense): Promise<TransportationExpense> {
    const [newExpense] = await db
      .insert(transportationExpenses)
      .values(expense)
      .returning();
    
    // تحديث الملخص اليومي في الخلفية (دون انتظار)
    this.updateDailySummaryForDate(expense.project_id, expense.date).catch(console.error);
    
    return newExpense;
  }

  async updateTransportationExpense(id: string, expense: Partial<InsertTransportationExpense>): Promise<TransportationExpense | undefined> {
    const [updated] = await db
      .update(transportationExpenses)
      .set(expense)
      .where(eq(transportationExpenses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTransportationExpense(id: string): Promise<void> {
    const [expense] = await db.select().from(transportationExpenses).where(eq(transportationExpenses.id, id));
    
    await db.delete(transportationExpenses).where(eq(transportationExpenses.id, id));
    
    if (expense) {
      await this.updateDailySummaryForDate(expense.project_id, expense.date);
    }
  }

  // Daily Expense Summaries
  async getDailyExpenseSummary(project_id: string, date: string): Promise<DailyExpenseSummary | undefined> {
    const [summary] = await db.select().from(dailyExpenseSummaries)
      .where(and(eq(dailyExpenseSummaries.project_id, project_id), eq(dailyExpenseSummaries.date, date)));
    return summary || undefined;
  }

  async getLatestDailySummary(project_id: string): Promise<DailyExpenseSummary | undefined> {
    const [summary] = await db.select().from(dailyExpenseSummaries)
      .where(eq(dailyExpenseSummaries.project_id, project_id))
      .orderBy(sql`${dailyExpenseSummaries.date} DESC`)
      .limit(1);
    return summary || undefined;
  }

  async updateDailyExpenseSummary(id: string, summary: Partial<InsertDailyExpenseSummary>): Promise<DailyExpenseSummary | undefined> {
    const [updated] = await db.update(dailyExpenseSummaries).set(summary).where(eq(dailyExpenseSummaries.id, id)).returning();
    return updated || undefined;
  }

  async createOrUpdateDailyExpenseSummary(summary: InsertDailyExpenseSummary): Promise<DailyExpenseSummary> {
    try {
      // استخدام UPSERT لمنع التكرار - إذا وُجد مشروع بنفس التاريخ، سيتم التحديث، وإلا سيتم الإنشاء
      const [result] = await db
        .insert(dailyExpenseSummaries)
        .values(summary)
        .onConflictDoUpdate({
          target: [dailyExpenseSummaries.project_id, dailyExpenseSummaries.date],
          set: {
            carriedForwardAmount: summary.carriedForwardAmount,
            totalFundTransfers: summary.totalFundTransfers,
            totalWorkerWages: summary.totalWorkerWages,
            totalMaterialCosts: summary.totalMaterialCosts,
            totalTransportationCosts: summary.totalTransportationCosts,
            totalIncome: summary.totalIncome,
            totalExpenses: summary.totalExpenses,
            remainingBalance: summary.remainingBalance,
            totalWorkerTransfers: summary.totalWorkerTransfers,
            totalWorkerMiscExpenses: summary.totalWorkerMiscExpenses,
            notes: summary.notes,
            updated_at: new Date()
          }
        })
        .returning();
      
      console.log(`✅ Daily summary upserted for project ${summary.project_id} on ${summary.date}`);
      return result;
    } catch (error) {
      console.error('❌ Error upserting daily summary:', error);
      throw error;
    }
  }

  private _balanceCache = new Map<string, { data: string; timestamp: number }>();

  async getPreviousDayBalance(project_id: string, currentDate: string): Promise<string> {
    const cacheKey = `prev-balance-${project_id}-${currentDate}`;
    const cached = this._balanceCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 30000)) {
      return cached.data;
    }

    const [result] = await db.select({ remainingBalance: dailyExpenseSummaries.remainingBalance })
      .from(dailyExpenseSummaries)
      .where(and(
        eq(dailyExpenseSummaries.project_id, project_id),
        sql`${dailyExpenseSummaries.date} < ${currentDate}`
      ))
      .orderBy(desc(dailyExpenseSummaries.date))
      .limit(1);
    
    const balance = result?.remainingBalance || "0";
    this._balanceCache.set(cacheKey, { data: balance, timestamp: Date.now() });
    return balance;
  }

  // إزالة الملخصات المكررة للتاريخ الواحد
  async removeDuplicateSummaries(project_id: string, date: string): Promise<void> {
    try {
      // البحث عن الملخصات المكررة
      const duplicates = await db.select()
        .from(dailyExpenseSummaries)
        .where(and(
          eq(dailyExpenseSummaries.project_id, project_id),
          eq(dailyExpenseSummaries.date, date)
        ))
        .orderBy(dailyExpenseSummaries.created_at);

      // إذا كان هناك أكثر من ملخص، احذف الأقدم واحتفظ بالأحدث
      if (duplicates.length > 1) {
        const toDelete = duplicates.slice(0, -1);
        const idsToDelete = toDelete.map((s: { id: number }) => s.id);
        await db.delete(dailyExpenseSummaries)
          .where(inArray(dailyExpenseSummaries.id, idsToDelete));
        console.log(`🗑️ Removed ${toDelete.length} duplicate summaries for ${project_id} on ${date}`);
      }
    } catch (error) {
      console.error('Error removing duplicate summaries:', error);
    }
  }

  // تحديث الملخص اليومي تلقائياً مع تحسينات الأداء المحسنة
  async updateDailySummaryForDate(project_id: string, date: string): Promise<void> {
    try {
      
      // تشغيل جميع الاستعلامات بشكل متوازي لتحسين الأداء
      const [
        fundTransfers,
        projectTransfers,
        workerAttendanceRecords,
        materialPurchases,
        transportationExpenses,
        workerTransfers,
        workerMiscExpenses,
        carriedForwardAmount,
        supplierPaymentsResult
      ] = await Promise.all([
        this.getFundTransfers(project_id, date),
        this.getProjectFundTransfersForDate(project_id, date),
        this.getWorkerAttendance(project_id, date),
        this.getMaterialPurchases(project_id, date, date),
        this.getTransportationExpenses(project_id, date),
        this.getFilteredWorkerTransfers(project_id, date),
        this.getWorkerMiscExpenses(project_id, date),
        this.getPreviousDayBalance(project_id, date).then(balance => parseFloat(balance)),
        pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM supplier_payments WHERE project_id = $1 AND payment_date = $2`, [project_id, date])
      ]);

      const tocents = (val: string) => Math.round(parseFloat(val || '0') * 100);
      const totalFundTransfersCents = fundTransfers.reduce((sum, t) => sum + tocents(t.amount), 0);
      
      const incomingTransfersCents = projectTransfers.filter(t => t.toProjectId === project_id && t.transferReason !== 'settlement').reduce((sum, t) => sum + tocents(t.amount), 0);
      const outgoingTransfersCents = projectTransfers.filter(t => t.fromProjectId === project_id).reduce((sum, t) => sum + tocents(t.amount), 0);
      
      const totalWorkerWagesCents = workerAttendanceRecords.reduce((sum, a) => {
        const paid = Math.round(parseFloat(a.paidAmount || '0') * 100);
        return sum + (paid > 0 ? paid : 0);
      }, 0);
      const totalMaterialCostsCents = materialPurchases
        .filter(p => p.purchaseType === "نقد" || p.purchaseType === "نقداً")
        .reduce((sum, p) => {
          const paid = Math.round(parseFloat(p.paidAmount || '0') * 100);
          return sum + (paid > 0 ? paid : tocents(p.totalAmount));
        }, 0);
      const totalTransportationCostsCents = transportationExpenses.reduce((sum, e) => sum + tocents(e.amount), 0);
      const totalWorkerTransferCostsCents = workerTransfers.reduce((sum, t) => sum + tocents(t.amount), 0);
      const totalWorkerMiscCostsCents = workerMiscExpenses.reduce((sum, e) => sum + tocents(e.amount), 0);
      const totalSupplierPaymentsCents = Math.round(parseFloat(supplierPaymentsResult.rows[0]?.total || '0') * 100);

      const carriedForwardCents = Math.round(carriedForwardAmount * 100);
      const totalExpensesCents = totalWorkerWagesCents + totalMaterialCostsCents + totalTransportationCostsCents + totalWorkerTransferCostsCents + totalWorkerMiscCostsCents + outgoingTransfersCents + totalSupplierPaymentsCents;
      const totalIncomeCents = carriedForwardCents + totalFundTransfersCents + incomingTransfersCents;
      const remainingBalanceCents = totalIncomeCents - totalExpensesCents;

      const totalFundTransfers = totalFundTransfersCents / 100;
      const incomingTransfers = incomingTransfersCents / 100;
      const outgoingTransfers = outgoingTransfersCents / 100;
      const totalWorkerWages = totalWorkerWagesCents / 100;
      const totalMaterialCosts = totalMaterialCostsCents / 100;
      const totalTransportationCosts = totalTransportationCostsCents / 100;
      const totalWorkerTransferCosts = totalWorkerTransferCostsCents / 100;
      const totalWorkerMiscCosts = totalWorkerMiscCostsCents / 100;
      const totalExpenses = totalExpensesCents / 100;
      const totalIncome = totalIncomeCents / 100;
      const remainingBalance = remainingBalanceCents / 100;

      // معلومات مختصرة للتشخيص
      console.log(`📊 ${date}: Income=${totalIncome} (Fund:${totalFundTransfers}, IncTrans:${incomingTransfers}), Expenses=${totalExpenses} (OutTrans:${outgoingTransfers}), Balance=${remainingBalance}`);
      
      // التحقق من صحة البيانات المحاسبية
      if (Math.abs(totalIncome - totalExpenses - remainingBalance) > 0.01) {
        console.error(`❌ BALANCE ERROR: Income(${totalIncome}) - Expenses(${totalExpenses}) ≠ Remaining(${remainingBalance})`);
        throw new Error(`خطأ في حساب الرصيد: الدخل - المصروفات ≠ المتبقي`);
      }

      await this.createOrUpdateDailyExpenseSummary({
        project_id,
        date,
        carriedForwardAmount: carriedForwardAmount.toString(),
        totalFundTransfers: (totalFundTransfers + incomingTransfers).toString(),
        totalWorkerWages: totalWorkerWages.toString(),
        totalMaterialCosts: totalMaterialCosts.toString(),
        totalTransportationCosts: totalTransportationCosts.toString(),
        totalWorkerTransfers: totalWorkerTransferCosts.toString(),
        totalWorkerMiscExpenses: totalWorkerMiscCosts.toString(),
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        remainingBalance: remainingBalance.toString()
      });

      await db.delete(dailyExpenseSummaries)
        .where(and(
          eq(dailyExpenseSummaries.project_id, project_id),
          sql`${dailyExpenseSummaries.date} > ${date}`
        ));
      
    } catch (error) {
      console.error('❌ Error updating daily summary:', error);
      throw error;
    }
  }

  // Helper function to get previous date
  private getPreviousDate(currentDate: string): string {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  async recalculateAllBalances(project_id: string): Promise<void> {
    console.log(`🔄 Recalculating all balances for project ${project_id}...`);
    
    try {
      const existingSummaries = await db.select()
        .from(dailyExpenseSummaries)
        .where(eq(dailyExpenseSummaries.project_id, project_id))
        .orderBy(sql`${dailyExpenseSummaries.date} ASC`);

      const dates = existingSummaries.map((s: any) => s.date);
      console.log(`📋 Found ${dates.length} dates to recalculate`);

      for (const date of dates) {
        console.log(`📅 Recalculating ${date}...`);
        
        const [
          fundTransfers,
          projectTransfers,
          workerAttendanceRecords,
          materialPurchases,
          transportationExpenses,
          workerTransfers,
          workerMiscExpenses,
          carriedForwardAmount
        ] = await Promise.all([
          this.getFundTransfers(project_id, date),
          this.getProjectFundTransfersForDate(project_id, date),
          this.getWorkerAttendance(project_id, date),
          this.getMaterialPurchases(project_id, date, date),
          this.getTransportationExpenses(project_id, date),
          this.getFilteredWorkerTransfers(project_id, date),
          this.getWorkerMiscExpenses(project_id, date),
          this.getPreviousDayBalance(project_id, date).then(b => parseFloat(b))
        ]);

        const tocents = (val: string) => Math.round(parseFloat(val || '0') * 100);
        const totalFundTransfersCents = fundTransfers.reduce((sum, t) => sum + tocents(t.amount), 0);
        const incomingTransfersCents = projectTransfers.filter(t => t.toProjectId === project_id && t.transferReason !== 'settlement').reduce((sum, t) => sum + tocents(t.amount), 0);
        const outgoingTransfersCents = projectTransfers.filter(t => t.fromProjectId === project_id).reduce((sum, t) => sum + tocents(t.amount), 0);
        const totalWorkerWagesCents = workerAttendanceRecords.reduce((sum, a) => {
          const paid = Math.round(parseFloat(a.paidAmount || '0') * 100);
          return sum + (paid > 0 ? paid : 0);
        }, 0);
        const totalMaterialCostsCents = materialPurchases
          .filter(p => p.purchaseType === "نقد" || p.purchaseType === "نقداً")
          .reduce((sum, p) => {
            const paid = Math.round(parseFloat(p.paidAmount || '0') * 100);
            return sum + (paid > 0 ? paid : tocents(p.totalAmount));
          }, 0);
        const totalTransportationCostsCents = transportationExpenses.reduce((sum, e) => sum + tocents(e.amount), 0);
        const totalWorkerTransferCostsCents = workerTransfers.reduce((sum, t) => sum + tocents(t.amount), 0);
        const totalWorkerMiscCostsCents = workerMiscExpenses.reduce((sum, e) => sum + tocents(e.amount), 0);
        const supplierPayResult = await pool.query(`SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total FROM supplier_payments WHERE project_id = $1 AND payment_date = $2`, [project_id, date]);
        const totalSupplierPaymentsCents = Math.round(parseFloat(supplierPayResult.rows[0]?.total || '0') * 100);

        const carriedForwardCents = Math.round(carriedForwardAmount * 100);
        const totalExpensesCents = totalWorkerWagesCents + totalMaterialCostsCents + totalTransportationCostsCents + totalWorkerTransferCostsCents + totalWorkerMiscCostsCents + outgoingTransfersCents + totalSupplierPaymentsCents;
        const totalIncomeCents = carriedForwardCents + totalFundTransfersCents + incomingTransfersCents;
        const remainingBalanceCents = totalIncomeCents - totalExpensesCents;

        const totalFundTransfers = totalFundTransfersCents / 100;
        const incomingTransfers = incomingTransfersCents / 100;
        const outgoingTransfers = outgoingTransfersCents / 100;
        const totalWorkerWages = totalWorkerWagesCents / 100;
        const totalMaterialCosts = totalMaterialCostsCents / 100;
        const totalTransportationCosts = totalTransportationCostsCents / 100;
        const totalWorkerTransferCosts = totalWorkerTransferCostsCents / 100;
        const totalWorkerMiscCosts = totalWorkerMiscCostsCents / 100;
        const totalExpenses = totalExpensesCents / 100;
        const totalIncome = totalIncomeCents / 100;
        const remainingBalance = remainingBalanceCents / 100;

        await this.createOrUpdateDailyExpenseSummary({
          project_id,
          date,
          carriedForwardAmount: carriedForwardAmount.toString(),
          totalFundTransfers: (totalFundTransfers + incomingTransfers).toString(),
          totalWorkerWages: totalWorkerWages.toString(),
          totalMaterialCosts: totalMaterialCosts.toString(),
          totalTransportationCosts: totalTransportationCosts.toString(),
          totalWorkerTransfers: totalWorkerTransferCosts.toString(),
          totalWorkerMiscExpenses: totalWorkerMiscCosts.toString(),
          totalIncome: totalIncome.toString(),
          totalExpenses: totalExpenses.toString(),
          remainingBalance: remainingBalance.toString()
        });
      }

      this._balanceCache.clear();
      console.log(`✅ All ${dates.length} balances recalculated successfully for project ${project_id}`);
    } catch (error) {
      console.error(`❌ Error recalculating balances:`, error);
      throw error;
    }
  }

  // Worker Balance Management
  async getWorkerBalance(worker_id: string, project_id: string): Promise<WorkerBalance | undefined> {
    // حساب الرصيد ديناميكياً من سجلات الحضور
    const attendanceRecords = await db.select().from(workerAttendance)
      .where(and(eq(workerAttendance.worker_id, worker_id), eq(workerAttendance.project_id, project_id)));
    
    let totalEarned = 0;
    let totalPaid = 0;
    
    attendanceRecords.forEach((record: any) => {
      totalEarned += parseFloat(record.actualWage || '0');
      totalPaid += parseFloat(record.paidAmount || '0');
    });
    
    const transferRecords = await db.select().from(workerTransfers)
      .where(and(
        eq(workerTransfers.worker_id, worker_id),
        eq(workerTransfers.project_id, project_id),
        sql`COALESCE(${workerTransfers.transferMethod}, '') != 'settlement'`
      ));
    
    let totalTransferred = 0;
    transferRecords.forEach((transfer: any) => {
      totalTransferred += parseFloat(transfer.amount || '0');
    });
    
    const currentBalance = totalEarned - totalPaid - totalTransferred;
    
    const balance: WorkerBalance = {
      id: `${worker_id}-${project_id}`,
      worker_id,
      project_id,
      totalEarned: totalEarned.toString(),
      totalPaid: totalPaid.toString(),
      totalTransferred: totalTransferred.toString(),
      currentBalance: currentBalance.toString(),
      lastUpdated: new Date(),
      created_at: new Date(),
      synced: null,
      isLocal: null,
      pendingSync: null
    };
    
    return balance;
  }

  async updateWorkerBalance(worker_id: string, project_id: string, balance: Partial<InsertWorkerBalance>): Promise<WorkerBalance> {
    const existing = await this.getWorkerBalance(worker_id, project_id);
    
    if (existing) {
      const [updated] = await db
        .update(workerBalances)
        .set({ ...balance, lastUpdated: new Date() })
        .where(eq(workerBalances.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newBalance] = await db
        .insert(workerBalances)
        .values({
          worker_id,
          project_id,
          totalEarned: '0',
          totalPaid: '0',
          totalTransferred: '0',
          currentBalance: '0',
          ...balance
        })
        .returning();
      return newBalance;
    }
  }

  // Worker Transfers
  async getWorkerTransfers(worker_id: string, project_id?: string): Promise<WorkerTransfer[]> {
    if (project_id) {
      return await db.select().from(workerTransfers)
        .where(and(eq(workerTransfers.worker_id, worker_id), eq(workerTransfers.project_id, project_id)));
    } else {
      return await db.select().from(workerTransfers)
        .where(eq(workerTransfers.worker_id, worker_id));
    }
  }

  async getWorkerTransfer(id: string): Promise<WorkerTransfer | null> {
    const [transfer] = await db.select().from(workerTransfers).where(eq(workerTransfers.id, id));
    return transfer || null;
  }

  async createWorkerTransfer(transfer: InsertWorkerTransfer): Promise<WorkerTransfer> {
    const [newTransfer] = await db
      .insert(workerTransfers)
      .values(transfer)
      .returning();
    return newTransfer;
  }

  async updateWorkerTransfer(id: string, transfer: Partial<InsertWorkerTransfer>): Promise<WorkerTransfer | undefined> {
    const [updated] = await db
      .update(workerTransfers)
      .set(transfer)
      .where(eq(workerTransfers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWorkerTransfer(id: string): Promise<void> {
    await db.delete(workerTransfers).where(eq(workerTransfers.id, id));
  }

  async getAllWorkerTransfers(): Promise<WorkerTransfer[]> {
    return await db.select().from(workerTransfers);
  }

  async getFilteredWorkerTransfers(project_id?: string, date?: string): Promise<WorkerTransfer[]> {
    if (project_id && date) {
      return await db.select().from(workerTransfers)
        .where(and(eq(workerTransfers.project_id, project_id), eq(workerTransfers.transferDate, date)));
    } else if (project_id) {
      return await db.select().from(workerTransfers)
        .where(eq(workerTransfers.project_id, project_id));
    } else if (date) {
      return await db.select().from(workerTransfers)
        .where(eq(workerTransfers.transferDate, date));
    }
    
    return await db.select().from(workerTransfers);
  }

  // Reports
  async getWorkerAccountStatement(worker_id: string, project_id?: string, dateFrom?: string, dateTo?: string): Promise<{
    worker: Worker | null;
    attendance: any[];
    transfers: WorkerTransfer[];
    balance: WorkerBalance | null;
    summary: {
      totalWorkDays: number;
      totalWagesEarned: number;
      totalPaidAmount: number;
      totalTransfers: number;
      remainingBalance: number;
    };
  }> {
    try {
      // جلب بيانات العامل
      const [worker] = await db.select().from(workers).where(eq(workers.id, worker_id));
      
      let attendanceConditions = [eq(workerAttendance.worker_id, worker_id)];
      
      if (project_id) {
        attendanceConditions.push(eq(workerAttendance.project_id, project_id));
      }
      
      if (dateFrom) {
        attendanceConditions.push(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) >= ${dateFrom}`);
      }
      
      if (dateTo) {
        attendanceConditions.push(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) <= ${dateTo}`);
      }
      
      const attendanceData = await db.select().from(workerAttendance)
        .where(and(...attendanceConditions))
        .orderBy(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`);

      // جلب بيانات المشاريع المرتبطة بالحضور
      const projectsMap = new Map();
      const uniqueProjectIds = Array.from(new Set(attendanceData.map((record: any) => record.project_id))).filter(Boolean) as string[];
      
      if (uniqueProjectIds.length > 0) {
        const projectsList = await db.select().from(projects).where(inArray(projects.id, uniqueProjectIds));
        for (const project of projectsList) {
          projectsMap.set(project.id, project);
        }
      }
      
      // دمج بيانات الحضور مع بيانات المشروع
      const attendance = attendanceData.map((record: any) => ({
        ...record,
        project: projectsMap.get(record.project_id) || null
      }));
      
      // Get worker transfers (including family transfers)
      let transfersConditions = [eq(workerTransfers.worker_id, worker_id)];
      
      if (project_id) {
        transfersConditions.push(eq(workerTransfers.project_id, project_id));
      }
      
      if (dateFrom) {
        transfersConditions.push(gte(workerTransfers.transferDate, dateFrom));
      }
      
      if (dateTo) {
        transfersConditions.push(lte(workerTransfers.transferDate, dateTo));
      }
      
      const transfers = await db.select().from(workerTransfers)
        .where(and(...transfersConditions))
        .orderBy(workerTransfers.transferDate);
      
      // Get worker balance (calculated dynamically to include all transfers)
      let balance: WorkerBalance | null = null;
      if (project_id) {
        const workerBalance = await this.getWorkerBalance(worker_id, project_id);
        balance = workerBalance || null;
      }
      
      // حساب الإحصائيات الإجمالية
      const totalWorkDays = attendance.reduce((sum: number, record: any) => sum + (Number(record.workDays) || 0), 0);
      const totalWagesEarned = attendance.reduce((sum: number, record: any) => {
        return sum + (Number(record.actualWage) || 0);
      }, 0);
      const totalPaidAmount = attendance.reduce((sum: number, record: any) => sum + (Number(record.paidAmount) || 0), 0);
      const totalTransfers = transfers.reduce((sum: number, transfer: any) => sum + (Number(transfer.amount) || 0), 0);
      const remainingBalance = totalWagesEarned - totalPaidAmount;

      const summary = {
        totalWorkDays,
        totalWagesEarned,
        totalPaidAmount,
        totalTransfers,
        remainingBalance
      };

      return {
        worker,
        attendance,
        transfers, // This now includes all transfers including family transfers
        balance,
        summary
      };
    } catch (error) {
      console.error('Error getting worker account statement:', error);
      return {
        worker: null,
        attendance: [],
        transfers: [],
        balance: null,
        summary: {
          totalWorkDays: 0,
          totalWagesEarned: 0,
          totalPaidAmount: 0,
          totalTransfers: 0,
          remainingBalance: 0
        }
      };
    }
  }

  // دالة جديدة لجلب كشف حساب العامل من مشاريع متعددة
  async getWorkerAccountStatementMultipleProjects(worker_id: string, project_ids: string[], dateFrom?: string, dateTo?: string): Promise<{
    worker: Worker | null;
    attendance: any[];
    transfers: WorkerTransfer[];
    balance: WorkerBalance | null;
    projectsInfo: { project_id: string; projectName: string }[];
  }> {
    try {
      // جلب معلومات المشاريع
      const projectsInfo = await Promise.all(
        project_ids.map(async (project_id) => {
          const project = await this.getProject(project_id);
          return {
            project_id,
            projectName: project?.name || `مشروع ${project_id}`
          };
        })
      );

      // جلب الحضور من المشاريع المحددة
      let attendanceConditions = [
        eq(workerAttendance.worker_id, worker_id),
        inArray(workerAttendance.project_id, project_ids)
      ];
      
      if (dateFrom) {
        attendanceConditions.push(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) >= ${dateFrom}`);
      }
      
      if (dateTo) {
        attendanceConditions.push(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) <= ${dateTo}`);
      }
      
      const attendanceData = await db.select().from(workerAttendance)
        .where(and(...attendanceConditions))
        .orderBy(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`);
      
      const projectsMap = new Map();
      if (project_ids.length > 0) {
        const projectsList = await db.select().from(projects).where(inArray(projects.id, project_ids));
        for (const project of projectsList) {
          projectsMap.set(project.id, project);
        }
      }
      
      // دمج بيانات الحضور مع بيانات المشروع
      const attendance = attendanceData.map((record: any) => ({
        ...record,
        project: projectsMap.get(record.project_id) || null
      }));
      
      // جلب التحويلات من المشاريع المحددة
      let transfersConditions = [
        eq(workerTransfers.worker_id, worker_id),
        inArray(workerTransfers.project_id, project_ids)
      ];
      
      if (dateFrom) {
        transfersConditions.push(gte(workerTransfers.transferDate, dateFrom));
      }
      
      if (dateTo) {
        transfersConditions.push(lte(workerTransfers.transferDate, dateTo));
      }
      
      const transfers = await db.select().from(workerTransfers)
        .where(and(...transfersConditions))
        .orderBy(workerTransfers.transferDate);
      
      let totalBalance = 0;
      if (project_ids.length > 0) {
        const balances = await db.select().from(workerBalances)
          .where(and(
            eq(workerBalances.worker_id, worker_id),
            inArray(workerBalances.project_id, project_ids)
          ));
        for (const bal of balances) {
          totalBalance += Math.round(parseFloat(bal.currentBalance) * 100) / 100;
        }
        totalBalance = Math.round(totalBalance * 100) / 100;
      }
      
      const balance: WorkerBalance = {
        id: `multi-${worker_id}`,
        created_at: new Date(),
        worker_id,
        project_id: project_ids[0], // المشروع الأول كمرجع
        totalEarned: "0",
        totalPaid: "0", 
        totalTransferred: "0",
        currentBalance: totalBalance.toString(),
        lastUpdated: new Date(),
        synced: null,
        isLocal: null,
        pendingSync: null
      };
      
      // جلب بيانات العامل
      const [worker] = await db.select().from(workers).where(eq(workers.id, worker_id));
      
      return {
        worker,
        attendance,
        transfers,
        balance,
        projectsInfo
      };
    } catch (error) {
      console.error('Error getting worker account statement for multiple projects:', error);
      return {
        worker: null,
        attendance: [],
        transfers: [],
        balance: null,
        projectsInfo: []
      };
    }
  }

  // Multi-project worker management
  async getWorkersWithMultipleProjects(): Promise<{worker: Worker, projects: Project[], totalBalance: string}[]> {
    return [];
  }

  async getWorkerMultiProjectStatement(worker_id: string, dateFrom?: string, dateTo?: string): Promise<{
    worker: Worker;
    projects: {
      project: Project;
      attendance: WorkerAttendance[];
      balance: WorkerBalance | null;
      transfers: WorkerTransfer[];
    }[];
    totals: {
      totalEarned: string;
      totalPaid: string;
      totalTransferred: string;
      totalBalance: string;
    };
  }> {
    const [worker] = await db.select().from(workers).where(eq(workers.id, worker_id));
    if (!worker) {
      throw new Error('Worker not found');
    }

    try {
      // جلب جميع المشاريع التي عمل بها العامل
      let projectConditions = [eq(workerAttendance.worker_id, worker_id)];
      
      if (dateFrom) {
        projectConditions.push(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) >= ${dateFrom}`);
      }
      
      if (dateTo) {
        projectConditions.push(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) <= ${dateTo}`);
      }
      
      // الحصول على المشاريع المميزة
      const distinctProjects = await db.selectDistinct({ project_id: workerAttendance.project_id })
        .from(workerAttendance)
        .where(and(...projectConditions));
      
      const projectsList: Array<{
        project: Project;
        attendance: WorkerAttendance[];
        balance: WorkerBalance | null;
        transfers: WorkerTransfer[];
      }> = [];
      let totalEarned = 0;
      let totalPaid = 0;
      let totalTransferred = 0;
      let totalBalance = 0;
      
      const distinctProjectIds = distinctProjects.map((dp: { project_id: string | null }) => dp.project_id).filter(Boolean) as string[];

      let allProjectsData: Project[] = [];
      let allAttendanceData: WorkerAttendance[] = [];
      let allTransfersData: WorkerTransfer[] = [];
      let allBalancesData: WorkerBalance[] = [];

      if (distinctProjectIds.length > 0) {
        const attendanceConditions: any[] = [eq(workerAttendance.worker_id, worker_id), inArray(workerAttendance.project_id, distinctProjectIds)];
        if (dateFrom) attendanceConditions.push(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) >= ${dateFrom}`);
        if (dateTo) attendanceConditions.push(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) <= ${dateTo}`);

        const transferConditions: ReturnType<typeof eq>[] = [eq(workerTransfers.worker_id, worker_id), inArray(workerTransfers.project_id, distinctProjectIds)];
        if (dateFrom) transferConditions.push(gte(workerTransfers.transferDate, dateFrom));
        if (dateTo) transferConditions.push(lte(workerTransfers.transferDate, dateTo));

        [allProjectsData, allAttendanceData, allTransfersData, allBalancesData] = await Promise.all([
          db.select().from(projects).where(inArray(projects.id, distinctProjectIds)),
          db.select().from(workerAttendance).where(and(...attendanceConditions)).orderBy(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`),
          db.select().from(workerTransfers).where(and(...transferConditions)).orderBy(workerTransfers.transferDate),
          db.select().from(workerBalances).where(and(
            eq(workerBalances.worker_id, worker_id),
            inArray(workerBalances.project_id, distinctProjectIds)
          )),
        ]);
      }

      const projectsMapLocal = new Map(allProjectsData.map(p => [p.id, p]));
      const balancesMap = new Map(allBalancesData.map(b => [b.project_id, b]));

      for (const { project_id } of distinctProjects) {
        const project = projectsMapLocal.get(project_id);
        if (!project) continue;

        const attendance = allAttendanceData.filter(a => a.project_id === project_id);
        const transfers = allTransfersData.filter(t => t.project_id === project_id);

        const projectEarned = attendance.reduce((sum, record) => {
          return sum + Math.round((Number(record.actualWage) || 0) * 100) / 100;
        }, 0);
        
        const projectPaid = attendance.reduce((sum, record) => sum + (Math.round((Number(record.paidAmount) || 0) * 100) / 100), 0);
        const projectTransferred = transfers.reduce((sum, transfer) => sum + (Math.round((Number(transfer.amount) || 0) * 100) / 100), 0);
        
        const balance = balancesMap.get(project_id) || null;
        
        projectsList.push({
          project,
          attendance,
          balance,
          transfers
        });
        
        totalEarned += projectEarned;
        totalPaid += projectPaid;
        totalTransferred += projectTransferred;
        totalBalance += balance ? Math.round(Number(balance.currentBalance) * 100) / 100 : 0;
      }
      
      return {
        worker,
        projects: projectsList,
        totals: {
          totalEarned: totalEarned.toString(),
          totalPaid: totalPaid.toString(),
          totalTransferred: totalTransferred.toString(),
          totalBalance: totalBalance.toString()
        }
      };
    } catch (error) {
      console.error('Error getting worker multi-project statement:', error);
      return {
        worker,
        projects: [],
        totals: {
          totalEarned: '0',
          totalPaid: '0',
          totalTransferred: '0',
          totalBalance: '0'
        }
      };
    }
  }

  async getWorkerProjects(worker_id: string): Promise<Project[]> {
    try {
      const project_ids = await db
        .selectDistinct({ project_id: workerAttendance.project_id })
        .from(workerAttendance)
        .where(eq(workerAttendance.worker_id, worker_id));
      
      if (project_ids.length === 0) {
        return [];
      }
      
      const projectsList = await db
        .select()
        .from(projects)
        .where(inArray(projects.id, project_ids.map((p: any) => p.project_id)));
      
      return projectsList;
    } catch (error) {
      console.error('Error getting worker projects:', error);
      return [];
    }
  }

  async getWorkerAttendanceForPeriod(worker_id: string, project_id: string, dateFrom: string, dateTo: string): Promise<WorkerAttendance[]> {
    try {
      return await db.select().from(workerAttendance)
        .where(and(
          eq(workerAttendance.worker_id, worker_id),
          eq(workerAttendance.project_id, project_id),
          sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) >= ${dateFrom}`,
          sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) <= ${dateTo}`
        ))
        .orderBy(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`);
    } catch (error) {
      console.error('Error getting worker attendance for period:', error);
      return [];
    }
  }

  async getFundTransfersForWorker(worker_id: string, project_id: string, dateFrom: string, dateTo: string): Promise<FundTransfer[]> {
    try {
      // البحث عن التحويلات المالية التي تخص هذا العامل
      const worker = await this.getWorker(worker_id);
      if (!worker) return [];

      return await db.select().from(fundTransfers)
        .where(and(
          eq(fundTransfers.project_id, project_id),
          sql`DATE(${fundTransfers.transferDate}) >= ${dateFrom}`,
          sql`DATE(${fundTransfers.transferDate}) <= ${dateTo}`,
          or(
            sql`${fundTransfers.senderName} LIKE ${`%${worker.name}%`}`,
            sql`${fundTransfers.notes} LIKE ${`%${worker.name}%`}`
          )
        ))
        .orderBy(fundTransfers.transferDate);
    } catch (error) {
      console.error('Error getting fund transfers for worker:', error);
      return [];
    }
  }

  async getProjectStatistics(project_id: string): Promise<{
    totalWorkers: number;
    totalExpenses: number;
    totalIncome: number;
    currentBalance: number;
    activeWorkers: number;
    completedDays: number;
    materialPurchases: number;
    lastActivity: string;
  }> {
    try {
      console.time(`getProjectStatistics-${project_id}`);
      
      // فحص Cache أولاً - تحسين الأداء الفائق
      const now = Date.now();
      const cachedStats = this.projectStatsCache.get(project_id);
      if (cachedStats && (now - cachedStats.timestamp) < this.CACHE_DURATION) {
        console.log(`⚡ استخدام Cache للمشروع ${project_id} - سرعة فائقة!`);
        console.timeEnd(`getProjectStatistics-${project_id}`);
        return cachedStats.data;
      }
      
      console.log(`🔍 حساب إحصائيات المشروع: ${project_id}`);
      
      // حساب الإحصائيات الكلية الحقيقية من جميع المعاملات
      const [
        workers,
        fundTransfers,
        projectTransfersIn,
        projectTransfersOut,
        attendance,
        materials,
        transport,
        miscExpenses,
        workerTransfers
      ] = await Promise.all([
        // عدد العمال المميزين
        db.execute(sql`
          SELECT COUNT(DISTINCT worker_id) as count
          FROM worker_attendance 
          WHERE project_id = ${project_id}
        `),
        
        // إجمالي تحويلات العهدة
        db.execute(sql`
          SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total
          FROM fund_transfers 
          WHERE project_id = ${project_id}
        `),
        
        // التحويلات الواردة للمشروع
        db.execute(sql`
          SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total
          FROM project_fund_transfers 
          WHERE to_project_id = ${project_id}
        `),
        
        // التحويلات الصادرة من المشروع
        db.execute(sql`
          SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total
          FROM project_fund_transfers 
          WHERE from_project_id = ${project_id}
        `),
        
        // إجمالي المبالغ المدفوعة فعلياً فقط (المبالغ التي تم صرفها فعلاً) والأيام
        db.execute(sql`
          SELECT 
            COALESCE(SUM(CASE WHEN paid_amount > 0 THEN safe_numeric(paid_amount::text, 0) ELSE 0 END), 0) as total_wages,
            COUNT(DISTINCT date) as completed_days
          FROM worker_attendance 
          WHERE project_id = ${project_id}
        `),
        
        // إجمالي مشتريات المواد النقدية (المدفوعة فعلياً)
        db.execute(sql`
          SELECT 
            COALESCE(SUM(CASE WHEN purchase_type = 'نقد' THEN safe_numeric(total_amount::text, 0) ELSE 0 END), 0) as cash_total,
            COALESCE(SUM(CASE WHEN purchase_type = 'أجل' THEN safe_numeric(total_amount::text, 0) ELSE 0 END), 0) as credit_total,
            COUNT(DISTINCT id) as count
          FROM material_purchases 
          WHERE project_id = ${project_id}
        `),
        
        // إجمالي النقل
        db.execute(sql`
          SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total
          FROM transportation_expenses 
          WHERE project_id = ${project_id}
        `),
        
        // مصاريف العمال المتنوعة
        db.execute(sql`
          SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total
          FROM worker_misc_expenses 
          WHERE project_id = ${project_id}
        `),
        
        // حوالات الأهل (من العامل للأهل)
        db.execute(sql`
          SELECT COALESCE(SUM(safe_numeric(amount::text, 0)), 0) as total
          FROM worker_transfers 
          WHERE project_id = ${project_id}
        `)
      ]);

      // حساب الإجماليات
      const workersRow = workers.rows[0] as SqlAggregateRow | undefined;
      const fundTransfersRow = fundTransfers.rows[0] as SqlAggregateRow | undefined;
      const projectTransfersInRow = projectTransfersIn.rows[0] as SqlAggregateRow | undefined;
      const projectTransfersOutRow = projectTransfersOut.rows[0] as SqlAggregateRow | undefined;
      const attendanceRow = attendance.rows[0] as SqlAggregateRow | undefined;
      const materialsRow = materials.rows[0] as SqlAggregateRow | undefined;
      const transportRow = transport.rows[0] as SqlAggregateRow | undefined;
      const miscExpensesRow = miscExpenses.rows[0] as SqlAggregateRow | undefined;
      const workerTransfersRow = workerTransfers.rows[0] as SqlAggregateRow | undefined;

      const totalWorkers = parseInt(workersRow?.count || '0');
      const totalFundTransfers = parseFloat(fundTransfersRow?.total || '0');
      const totalProjectIn = parseFloat(projectTransfersInRow?.total || '0');
      const totalProjectOut = parseFloat(projectTransfersOutRow?.total || '0');
      const totalWages = parseFloat(attendanceRow?.total_wages || '0');
      const completedDays = parseInt(attendanceRow?.completed_days || '0');
      const totalMaterialsCash = parseFloat(materialsRow?.cash_total || '0');
      const totalMaterialsCredit = parseFloat(materialsRow?.credit_total || '0');
      const materialCount = parseInt(materialsRow?.count || '0');
      const totalTransport = parseFloat(transportRow?.total || '0');
      const totalMisc = parseFloat(miscExpensesRow?.total || '0');
      const totalWorkerTransfers = parseFloat(workerTransfersRow?.total || '0');

      // الإجمالي الكلي للدخل والمصروفات - مع تصحيح منطق التحويلات الصادرة
      const totalIncome = totalFundTransfers + totalProjectIn;
      const totalExpenses = totalWages + totalMaterialsCash + totalTransport + totalMisc + totalWorkerTransfers + totalProjectOut;
      // ملاحظة: التحويلات الصادرة تُحسب كمصروف لأنها أموال تخرج من المشروع
      // حوالات الأهل أيضاً تُحسب كمصروف لأنها أموال تخرج من المشروع نهائياً
      const currentBalance = totalIncome - totalExpenses;

      console.log(`   📊 إجمالي الدخل: ${totalIncome}`);
      console.log(`   📊 إجمالي المصاريف (شاملة التحويلات): ${totalExpenses}`);
      console.log(`   📊 الرصيد النهائي: ${currentBalance}`);
      
      // التحقق من أن البيانات منطقية
      if (isNaN(currentBalance) || !isFinite(currentBalance)) {
        console.error('⚠️  خطأ في حساب الرصيد - قيمة غير منطقية');
        throw new Error('خطأ في حساب الرصيد المالي');
      }

      const result = {
        totalWorkers: totalWorkers,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        currentBalance: Math.round(currentBalance * 100) / 100,
        activeWorkers: totalWorkers, // نفترض أن جميع العمال نشطين
        completedDays: completedDays,
        materialPurchases: materialCount,
        lastActivity: new Date().toISOString().split('T')[0]
      };

      // حفظ في Cache للاستخدام السريع لاحقاً
      this.projectStatsCache.set(project_id, {
        data: result,
        timestamp: now
      });
      
      console.timeEnd(`getProjectStatistics-${project_id}`);
      console.log(`⚡ تم حساب وحفظ إحصائيات المشروع ${project_id} في Cache`);

      return result;
    } catch (error) {
      console.error('خطأ في حساب إحصائيات المشروع:', error);
      // إرجاع إحصائيات فارغة في حالة الخطأ
      return {
        totalWorkers: 0,
        totalExpenses: 0,
        totalIncome: 0,
        currentBalance: 0,
        activeWorkers: 0,
        completedDays: 0,
        materialPurchases: 0,
        lastActivity: new Date().toISOString().split('T')[0]
      };
    }
  }

  // Autocomplete data methods - محسنة مع حدود وذاكرة تخزين مؤقت
  async getAutocompleteData(category: string, limit: number = 50): Promise<AutocompleteData[]> {
    try {
      return await db
        .select()
        .from(autocompleteData)
        .where(eq(autocompleteData.category, category))
        .orderBy(sql`${autocompleteData.usageCount} DESC, ${autocompleteData.lastUsed} DESC`)
        .limit(limit);
    } catch (error) {
      console.error('Error getting autocomplete data:', error);
      return [];
    }
  }

  async saveAutocompleteData(data: InsertAutocompleteData): Promise<AutocompleteData> {
    try {
      const trimmedValue = data.value.trim();
      
      // تحقق من صحة البيانات
      if (!trimmedValue || trimmedValue.length < 2) {
        throw new Error('قيمة الإكمال التلقائي يجب أن تكون على الأقل حرفين');
      }

      // تحقق من وجود القيمة مسبقاً
      const existing = await db
        .select()
        .from(autocompleteData)
        .where(and(
          eq(autocompleteData.category, data.category),
          eq(autocompleteData.value, trimmedValue)
        ))
        .limit(1);

      if (existing.length > 0) {
        // إذا كانت موجودة، قم بتحديث عدد الاستخدام وتاريخ آخر استخدام
        const [updated] = await db
          .update(autocompleteData)
          .set({
            usageCount: sql`${autocompleteData.usageCount} + 1`,
            lastUsed: new Date()
          })
          .where(eq(autocompleteData.id, existing[0].id))
          .returning();
        
        return updated;
      } else {
        // تحقق من عدم تجاوز الحد الأقصى للسجلات في هذه الفئة
        await this.enforceCategoryLimit(data.category);

        // إنشاء سجل جديد
        const [created] = await db
          .insert(autocompleteData)
          .values({
            ...data,
            value: trimmedValue
          })
          .returning();
        
        return created;
      }
    } catch (error) {
      console.error('Error saving autocomplete data:', error);
      throw error;
    }
  }

  // طريقة جديدة لفرض حدود الفئة
  private async enforceCategoryLimit(category: string, maxRecords: number = 100): Promise<void> {
    try {
      // عد السجلات الحالية في هذه الفئة
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(autocompleteData)
        .where(eq(autocompleteData.category, category));

      const currentCount = countResult[0]?.count || 0;

      if (currentCount >= maxRecords) {
        // حذف أقل السجلات استخداماً
        const recordsToDelete = await db
          .select({ id: autocompleteData.id })
          .from(autocompleteData)
          .where(eq(autocompleteData.category, category))
          .orderBy(sql`${autocompleteData.usageCount} ASC, ${autocompleteData.lastUsed} ASC`)
          .limit(currentCount - maxRecords + 1);

        if (recordsToDelete.length > 0) {
          await db
            .delete(autocompleteData)
            .where(
              sql`id IN (${recordsToDelete.map((r: any) => `'${r.id}'`).join(',')})`
            );
        }
      }
    } catch (error) {
      console.error('Error enforcing category limit:', error);
    }
  }

  async removeAutocompleteData(category: string, value: string): Promise<void> {
    try {
      await db
        .delete(autocompleteData)
        .where(and(
          eq(autocompleteData.category, category),
          eq(autocompleteData.value, value.trim())
        ));
    } catch (error) {
      console.error('Error removing autocomplete data:', error);
      throw error;
    }
  }

  async getDailyExpensesRange(project_id: string, dateFrom: string, dateTo: string): Promise<any[]> {
    try {
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      const results = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const currentDate = d.toISOString().split('T')[0];
        
        let dailySummary = await this.getDailyExpenseSummary(project_id, currentDate);
        
        if (!dailySummary) {
          await this.updateDailySummaryForDate(project_id, currentDate);
          dailySummary = await this.getDailyExpenseSummary(project_id, currentDate);
        }

        if (dailySummary) {
          const [
            fundTransfers,
            workerAttendance,
            materialPurchases,
            transportationExpenses,
            workerTransfers,
            workerMiscExpenses
          ] = await Promise.all([
            this.getFundTransfers(project_id, currentDate),
            this.getWorkerAttendance(project_id, currentDate),
            this.getMaterialPurchases(project_id, currentDate, currentDate),
            this.getTransportationExpenses(project_id, currentDate),
            this.getWorkerTransfers("", project_id).then(transfers => 
              transfers.filter(t => t.transferDate === currentDate)
            ),
            this.getWorkerMiscExpenses(project_id, currentDate)
          ]);

          // حساب إجمالي نثريات العمال
          const totalWorkerMiscExpenses = workerMiscExpenses?.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0;

          results.push({
            date: currentDate,
            summary: {
              carriedForward: parseFloat(dailySummary.carriedForwardAmount),
              totalIncome: parseFloat(dailySummary.totalIncome),
              totalExpenses: parseFloat(dailySummary.totalExpenses),
              remainingBalance: parseFloat(dailySummary.remainingBalance),
              totalFundTransfers: parseFloat(dailySummary.totalFundTransfers),
              totalWorkerWages: parseFloat(dailySummary.totalWorkerWages),
              totalMaterialCosts: parseFloat(dailySummary.totalMaterialCosts),
              totalTransportationCosts: parseFloat(dailySummary.totalTransportationCosts),
              totalWorkerTransfers: workerTransfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0,
              totalWorkerMiscExpenses: totalWorkerMiscExpenses
            },
            fundTransfers,
            workerAttendance,
            materialPurchases,
            transportationExpenses,
            workerTransfers,
            workerMiscExpenses
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting daily expenses range:', error);
      return [];
    }
  }

  // Worker miscellaneous expenses methods
  async getWorkerMiscExpenses(project_id: string, date?: string): Promise<WorkerMiscExpense[]> {
    try {
      if (date) {
        return await db.select().from(workerMiscExpenses)
          .where(and(eq(workerMiscExpenses.project_id, project_id), eq(workerMiscExpenses.date, date)))
          .orderBy(workerMiscExpenses.created_at);
      } else {
        return await db.select().from(workerMiscExpenses)
          .where(eq(workerMiscExpenses.project_id, project_id))
          .orderBy(workerMiscExpenses.date, workerMiscExpenses.created_at);
      }
    } catch (error) {
      console.error('Error getting worker misc expenses:', error);
      return [];
    }
  }

  async getWorkerMiscExpense(id: string): Promise<WorkerMiscExpense | null> {
    try {
      const [expense] = await db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.id, id));
      return expense || null;
    } catch (error) {
      console.error('Error getting worker misc expense:', error);
      return null;
    }
  }

  async createWorkerMiscExpense(expense: InsertWorkerMiscExpense): Promise<WorkerMiscExpense> {
    try {
      const [newExpense] = await db
        .insert(workerMiscExpenses)
        .values(expense)
        .returning();
      return newExpense;
    } catch (error) {
      console.error('Error creating worker misc expense:', error);
      throw error;
    }
  }

  async updateWorkerMiscExpense(id: string, expense: Partial<InsertWorkerMiscExpense>): Promise<WorkerMiscExpense | undefined> {
    try {
      const [updated] = await db
        .update(workerMiscExpenses)
        .set(expense)
        .where(eq(workerMiscExpenses.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating worker misc expense:', error);
      throw error;
    }
  }

  async deleteWorkerMiscExpense(id: string): Promise<void> {
    try {
      await db.delete(workerMiscExpenses).where(eq(workerMiscExpenses.id, id));
    } catch (error) {
      console.error('Error deleting worker misc expense:', error);
      throw error;
    }
  }

  // Advanced Reports
  async getExpensesForReport(project_id: string, dateFrom: string, dateTo: string): Promise<any[]> {
    // جلب جميع المصروفات من مصادر مختلفة
    const expenses: any[] = [];

    // 1. أجور العمال المدفوعة فعلياً فقط
    const workerWages = await db.select({
      id: workerAttendance.id,
      project_id: workerAttendance.project_id,
      date: sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`.as('date'),
      category: sql`'عمالة'`.as('category'),
      subcategory: workers.type,
      description: workers.name,
      amount: workerAttendance.paidAmount,
      vendor: sql`NULL`.as('vendor'),
      notes: sql`NULL`.as('notes'),
      type: sql`'wages'`.as('type')
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
    .where(and(
      eq(workerAttendance.project_id, project_id),
      sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) >= ${dateFrom}`,
      sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) <= ${dateTo}`,
      eq(workerAttendance.isPresent, true),
      gt(workerAttendance.paidAmount, "0") // فقط الأجور المدفوعة
    ));

    // 2. مشتريات المواد (النقدية فقط - المشتريات الآجلة لا تُحسب كمصروفات)
    const materialPurchasesData = await db.select({
      id: materialPurchases.id,
      project_id: materialPurchases.project_id,
      date: materialPurchases.purchaseDate,
      category: sql`'مشتريات'`.as('category'),
      subcategory: materialPurchases.purchaseType, // نوع الدفع كفئة فرعية
      description: materials.name,
      amount: materialPurchases.totalAmount,
      vendor: materialPurchases.supplierName,
      notes: materialPurchases.notes,
      type: sql`'materials'`.as('type')
    })
    .from(materialPurchases)
    .leftJoin(materials, eq(materialPurchases.material_id, materials.id))
    .where(and(
      eq(materialPurchases.project_id, project_id),
      gte(materialPurchases.purchaseDate, dateFrom),
      lte(materialPurchases.purchaseDate, dateTo),
      eq(materialPurchases.purchaseType, 'نقد') // فقط المشتريات النقدية تُحسب كمصروفات
    ));

    // 3. مصروفات النقل
    const transportExpenses = await db.select({
      id: transportationExpenses.id,
      project_id: transportationExpenses.project_id,
      date: transportationExpenses.date,
      category: sql`'مواصلات'`.as('category'),
      subcategory: sql`'أجور نقل'`.as('subcategory'),
      description: transportationExpenses.description,
      amount: transportationExpenses.amount,
      vendor: sql`NULL`.as('vendor'),
      notes: transportationExpenses.notes,
      type: sql`'transport'`.as('type')
    })
    .from(transportationExpenses)
    .where(and(
      eq(transportationExpenses.project_id, project_id),
      gte(transportationExpenses.date, dateFrom),
      lte(transportationExpenses.date, dateTo)
    ));

    // 4. تحويلات العمال
    const workerTransfersExp = await db.select({
      id: workerTransfers.id,
      project_id: workerTransfers.project_id,
      date: workerTransfers.transferDate,
      category: sql`'تحويلات عمال'`.as('category'),
      subcategory: sql`'تحويل'`.as('subcategory'),
      description: workers.name,
      amount: workerTransfers.amount,
      vendor: sql`NULL`.as('vendor'),
      notes: workerTransfers.notes,
      type: sql`'worker_transfers'`.as('type')
    })
    .from(workerTransfers)
    .leftJoin(workers, eq(workerTransfers.worker_id, workers.id))
    .where(and(
      eq(workerTransfers.project_id, project_id),
      gte(workerTransfers.transferDate, dateFrom),
      lte(workerTransfers.transferDate, dateTo)
    ));

    // 5. نثريات العمال
    const workerMiscExp = await db.select({
      id: workerMiscExpenses.id,
      project_id: workerMiscExpenses.project_id,
      date: workerMiscExpenses.date,
      category: sql`'نثريات'`.as('category'),
      subcategory: sql`'نثريات عمال'`.as('subcategory'),
      description: workerMiscExpenses.description,
      amount: workerMiscExpenses.amount,
      vendor: sql`NULL`.as('vendor'),
      notes: workerMiscExpenses.notes,
      type: sql`'misc'`.as('type')
    })
    .from(workerMiscExpenses)
    .where(and(
      eq(workerMiscExpenses.project_id, project_id),
      gte(workerMiscExpenses.date, dateFrom),
      lte(workerMiscExpenses.date, dateTo)
    ));

    // دمج جميع المصروفات
    expenses.push(...workerWages, ...materialPurchasesData, ...transportExpenses, ...workerTransfersExp, ...workerMiscExp);

    // إضافة اسم المشروع لكل سجل
    const project = await this.getProject(project_id);
    const projectName = project?.name || 'غير محدد';

    return expenses.map(expense => ({
      ...expense,
      projectName,
      amount: parseFloat(expense.amount?.toString() || '0'),
      category: expense.category || 'غير محدد',
      subcategory: expense.subcategory || '',
      description: expense.description || '',
      vendor: expense.vendor || '',
      notes: expense.notes || ''
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getIncomeForReport(project_id: string, dateFrom: string, dateTo: string): Promise<any[]> {
    // جلب تحويلات العهدة (الإيرادات)
    const income = await db.select({
      id: fundTransfers.id,
      project_id: fundTransfers.project_id,
      date: fundTransfers.transferDate,
      transferNumber: fundTransfers.transferNumber,
      senderName: fundTransfers.senderName,
      transferType: fundTransfers.transferType,
      amount: fundTransfers.amount,
      notes: fundTransfers.notes
    })
    .from(fundTransfers)
    .where(and(
      eq(fundTransfers.project_id, project_id),
      gte(sql`date(${fundTransfers.transferDate})`, dateFrom),
      lte(sql`date(${fundTransfers.transferDate})`, dateTo)
    ))
    .orderBy(fundTransfers.transferDate);

    // إضافة اسم المشروع
    const project = await this.getProject(project_id);
    const projectName = project?.name || 'غير محدد';

    return income.map((inc: any) => ({
      ...inc,
      projectName,
      amount: parseFloat(inc.amount?.toString() || '0'),
      transferNumber: inc.transferNumber || 'غير محدد',
      senderName: inc.senderName || 'غير محدد',
      transferType: inc.transferType || 'حوالة عادية',
      notes: inc.notes || ''
    }));
  }

  // Users methods
  async getUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(users.created_at);
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getEmergencyUser(id: string): Promise<EmergencyUser | undefined> {
    try {
      const [user] = await db.select().from(emergencyUsers).where(eq(emergencyUsers.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting emergency user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // بحث غير حساس لحالة الأحرف (case-insensitive)
      const normalizedEmail = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`);
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          ...user,
          updated_at: new Date()
        })
        .returning();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updated] = await db
        .update(users)
        .set({
          ...user,
          updated_at: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    try {
      const [updated] = await db
        .update(users)
        .set({
          role,
          updated_at: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Refresh Tokens Implementation
  async getRefreshToken(id: string): Promise<RefreshToken | undefined> {
    const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.id, id));
    return token || undefined;
  }

  async getRefreshTokenByHash(hash: string): Promise<RefreshToken | undefined> {
    const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
    return token || undefined;
  }

  async getRefreshTokensByUser(user_id: string): Promise<RefreshToken[]> {
    return await db.select().from(refreshTokens).where(eq(refreshTokens.user_id, user_id));
  }

  async createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken> {
    const [newToken] = await db.insert(refreshTokens).values(token).returning();
    return newToken;
  }

  async updateRefreshToken(id: string, token: Partial<InsertRefreshToken>): Promise<RefreshToken | undefined> {
    const [updated] = await db.update(refreshTokens).set(token).where(eq(refreshTokens.id, id)).returning();
    return updated || undefined;
  }

  async revokeAllUserTokens(user_id: string): Promise<void> {
    await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.user_id, user_id));
  }

  async revokeTokenFamily(rootId: string): Promise<void> {
    await db.update(refreshTokens)
      .set({ revoked: true })
      .where(or(
        eq(refreshTokens.id, rootId),
        eq(refreshTokens.replacedBy, rootId)
      ));
  }

  // Suppliers methods
  async getSuppliers(): Promise<Supplier[]> {
    try {
      return await db.select({
        id: suppliers.id,
        name: suppliers.name,
        contactPerson: suppliers.contactPerson,
        phone: suppliers.phone,
        address: suppliers.address,
        paymentTerms: suppliers.paymentTerms,
        totalDebt: suppliers.totalDebt,
        notes: suppliers.notes,
        is_active: suppliers.is_active,
        created_at: suppliers.created_at,
      }).from(suppliers).orderBy(suppliers.name);
    } catch (error) {
      console.error('Error getting suppliers:', error);
      return [];
    }
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
      return supplier || undefined;
    } catch (error) {
      console.error('Error getting supplier:', error);
      return undefined;
    }
  }

  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.name, name));
      return supplier || undefined;
    } catch (error) {
      console.error('Error getting supplier by name:', error);
      return undefined;
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      // إنشاء كائن البيانات مع تحديد صريح للحقول
      const supplierData = {
        name: supplier.name,
        contactPerson: supplier.contactPerson || null,
        phone: supplier.phone || null,
        address: supplier.address || null,
        paymentTerms: supplier.paymentTerms || "نقد",
        totalDebt: supplier.totalDebt || '0',
        is_active: supplier.is_active !== undefined ? supplier.is_active : true,
        notes: supplier.notes || null
      };
      
      console.log('Creating supplier with data:', supplierData);
      
      const [newSupplier] = await db
        .insert(suppliers)
        .values(supplierData)
        .returning();
      return newSupplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const [updated] = await db
        .update(suppliers)
        .set(supplier)
        .where(eq(suppliers.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      await db.delete(suppliers).where(eq(suppliers.id, id));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }

  // Supplier Payments methods
  async getAllSupplierPayments(): Promise<SupplierPayment[]> {
    try {
      console.log('🔍 جاري جلب جميع مدفوعات الموردين...');
      const payments = await db.select().from(supplierPayments).orderBy(supplierPayments.paymentDate);
      console.log(`✅ تم جلب ${payments.length} مدفوعة مورد`);
      return payments;
    } catch (error) {
      console.error('خطأ في جلب جميع مدفوعات الموردين:', error);
      return [];
    }
  }

  async getSupplierPayments(supplier_id: string, project_id?: string): Promise<SupplierPayment[]> {
    try {
      const conditions = [eq(supplierPayments.supplier_id, supplier_id)];
      if (project_id) {
        conditions.push(eq(supplierPayments.project_id, project_id));
      }
      
      return await db.select().from(supplierPayments)
        .where(and(...conditions))
        .orderBy(supplierPayments.paymentDate);
    } catch (error) {
      console.error('Error getting supplier payments:', error);
      return [];
    }
  }

  async getSupplierPayment(id: string): Promise<SupplierPayment | undefined> {
    try {
      const [payment] = await db.select().from(supplierPayments).where(eq(supplierPayments.id, id));
      return payment || undefined;
    } catch (error) {
      console.error('Error getting supplier payment:', error);
      return undefined;
    }
  }

  async createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment> {
    try {
      const [newPayment] = await db
        .insert(supplierPayments)
        .values(payment)
        .returning();
      if (newPayment.projectId && newPayment.paymentDate) {
        const { markInvalid } = await import('./services/SummaryRebuildService');
        await markInvalid(newPayment.projectId, String(newPayment.paymentDate).substring(0, 10));
        this.updateDailySummaryForDate(newPayment.projectId, String(newPayment.paymentDate).substring(0, 10)).catch(console.error);
      }
      return newPayment;
    } catch (error) {
      console.error('Error creating supplier payment:', error);
      throw error;
    }
  }

  async updateSupplierPayment(id: string, payment: Partial<InsertSupplierPayment>): Promise<SupplierPayment | undefined> {
    try {
      const oldResult = await db.select().from(supplierPayments).where(eq(supplierPayments.id, id)).limit(1);
      const oldPayment = oldResult[0];
      const [updated] = await db
        .update(supplierPayments)
        .set(payment)
        .where(eq(supplierPayments.id, id))
        .returning();
      if (updated) {
        const { markInvalid } = await import('./services/SummaryRebuildService');
        if (oldPayment?.projectId && oldPayment?.paymentDate) {
          const oldDate = String(oldPayment.paymentDate).substring(0, 10);
          await markInvalid(oldPayment.projectId, oldDate);
          this.updateDailySummaryForDate(oldPayment.projectId, oldDate).catch(console.error);
        }
        if (updated.projectId && updated.paymentDate) {
          const newDate = String(updated.paymentDate).substring(0, 10);
          await markInvalid(updated.projectId, newDate);
          this.updateDailySummaryForDate(updated.projectId, newDate).catch(console.error);
        }
      }
      return updated || undefined;
    } catch (error) {
      console.error('Error updating supplier payment:', error);
      throw error;
    }
  }

  async deleteSupplierPayment(id: string): Promise<void> {
    try {
      const oldResult = await db.select().from(supplierPayments).where(eq(supplierPayments.id, id)).limit(1);
      const oldPayment = oldResult[0];
      await db.delete(supplierPayments).where(eq(supplierPayments.id, id));
      if (oldPayment?.projectId && oldPayment?.paymentDate) {
        const { markInvalid } = await import('./services/SummaryRebuildService');
        const oldDate = String(oldPayment.paymentDate).substring(0, 10);
        await markInvalid(oldPayment.projectId, oldDate);
        this.updateDailySummaryForDate(oldPayment.projectId, oldDate).catch(console.error);
      }
    } catch (error) {
      console.error('Error deleting supplier payment:', error);
      throw error;
    }
  }

  // Supplier Reports methods
  async getSupplierAccountStatement(supplier_id: string, project_id?: string, dateFrom?: string, dateTo?: string): Promise<{
    supplier: Supplier;
    purchases: MaterialPurchase[];
    payments: SupplierPayment[];
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    // إضافة الحسابات المنفصلة للنقدي والآجل
    cashPurchases: {
      total: string;
      count: number;
      purchases: MaterialPurchase[];
    };
    creditPurchases: {
      total: string;
      count: number;
      purchases: MaterialPurchase[];
    };
  }> {
    try {
      // جلب بيانات المورد
      const supplier = await this.getSupplier(supplier_id);
      if (!supplier) {
        throw new Error('المورد غير موجود');
      }

      // شروط التصفية للمشتريات (نحتاج للبحث بـ supplierName بدلاً من supplier_id)
      const supplierName = supplier.name;
      const purchaseConditions = [eq(materialPurchases.supplierName, supplierName)];
      const paymentConditions = [eq(supplierPayments.supplier_id, supplier_id)];
      
      if (project_id && project_id !== 'all') {
        purchaseConditions.push(eq(materialPurchases.project_id, project_id));
        paymentConditions.push(eq(supplierPayments.project_id, project_id));
      }
      
      if (dateFrom) {
        purchaseConditions.push(gte(materialPurchases.invoiceDate, dateFrom));
        if (paymentConditions.length > 1 || !paymentConditions.some(c => c === paymentConditions[0])) {
          paymentConditions.push(gte(supplierPayments.paymentDate, dateFrom));
        }
      }
      
      if (dateTo) {
        purchaseConditions.push(lte(materialPurchases.invoiceDate, dateTo));
        if (paymentConditions.length > 1 || dateFrom) {
          paymentConditions.push(lte(supplierPayments.paymentDate, dateTo));
        }
      }

      // جلب المشتريات
      const purchases = await db.select().from(materialPurchases)
        .where(and(...purchaseConditions))
        .orderBy(materialPurchases.invoiceDate);

      // جلب المدفوعات
      const payments = await db.select().from(supplierPayments)
        .where(and(...paymentConditions))
        .orderBy(supplierPayments.paymentDate);

      // فصل المشتريات حسب نوع الدفع (مع إزالة علامات التنصيص وتطبيع الأحرف العربية)
      const cashPurchasesList = purchases.filter((p: any) => {
        const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
        return cleanType === 'نقد';
      });
      const creditPurchasesList = purchases.filter((p: any) => {
        const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
        // البحث عن جميع أشكال "أجل": مع الألف العادية والمد
        return cleanType === 'أجل' || cleanType === 'آجل' || cleanType.includes('جل');
      });

      // حساب الإجماليات منفصلة
      const cashTotal = cashPurchasesList.reduce((sum: number, purchase: any) => 
        sum + parseFloat(purchase.totalAmount || '0'), 0);
      const creditTotal = creditPurchasesList.reduce((sum: number, purchase: any) => 
        sum + parseFloat(purchase.totalAmount || '0'), 0);
      
      const totalDebt = cashTotal + creditTotal;
      const totalPaid = payments.reduce((sum: number, payment: any) => 
        sum + parseFloat(payment.amount || '0'), 0);
      const remainingDebt = totalDebt - totalPaid;

      return {
        supplier,
        purchases,
        payments,
        totalDebt: totalDebt.toString(),
        totalPaid: totalPaid.toString(),
        remainingDebt: remainingDebt.toString(),
        cashPurchases: {
          total: cashTotal.toString(),
          count: cashPurchasesList.length,
          purchases: cashPurchasesList
        },
        creditPurchases: {
          total: creditTotal.toString(),
          count: creditPurchasesList.length,
          purchases: creditPurchasesList
        }
      };
    } catch (error) {
      console.error('Error getting supplier account statement:', error);
      throw error;
    }
  }

  async getPurchasesBySupplier(supplier_id: string, purchaseType?: string, dateFrom?: string, dateTo?: string): Promise<MaterialPurchase[]> {
    try {
      const conditions = [eq(materialPurchases.supplier_id, supplier_id)];
      
      if (purchaseType) {
        conditions.push(eq(materialPurchases.purchaseType, purchaseType));
      }
      
      if (dateFrom && dateTo) {
        conditions.push(
          gte(materialPurchases.invoiceDate, dateFrom),
          lte(materialPurchases.invoiceDate, dateTo)
        );
      }

      return await db.select().from(materialPurchases)
        .where(and(...conditions))
        .orderBy(materialPurchases.invoiceDate);
    } catch (error) {
      console.error('Error getting purchases by supplier:', error);
      return [];
    }
  }

  // تنفيذ دالة إحصائيات الموردين العامة
  async getSupplierStatistics(filters?: {
    supplier_id?: string;
    project_id?: string;
    dateFrom?: string;
    dateTo?: string;
    purchaseType?: string;
  }): Promise<{
    totalSuppliers: number;
    totalCashPurchases: string;
    totalCreditPurchases: string;
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    activeSuppliers: number;
  }> {
    try {
      console.log('🔍 Supplier statistics filters:', filters);
      
      // جلب جميع الموردين
      const allSuppliers = await this.getSuppliers();
      
      // إعداد شروط البحث للمشتريات
      const purchaseConditions = [];
      const paymentConditions = [];
      
      if (filters?.supplier_id) {
        // للبحث بالمورد المحدد
        try {
          const supplier = await this.getSupplier(filters.supplier_id);
          if (supplier) {
            purchaseConditions.push(eq(materialPurchases.supplierName, supplier.name));
            paymentConditions.push(eq(supplierPayments.supplier_id, filters.supplier_id));
          } else {
            // إذا لم يوجد المورد، نبحث مباشرة بالـ ID في جدول المشتريات
            purchaseConditions.push(eq(materialPurchases.supplier_id, filters.supplier_id));
            paymentConditions.push(eq(supplierPayments.supplier_id, filters.supplier_id));
          }
        } catch (error) {
          console.error('⚠️ خطأ في البحث عن المورد، سيتم البحث بالـ ID مباشرة:', error);
          // في حالة خطأ، نبحث مباشرة بالـ ID
          purchaseConditions.push(eq(materialPurchases.supplier_id, filters.supplier_id));
          paymentConditions.push(eq(supplierPayments.supplier_id, filters.supplier_id));
        }
      }
      
      if (filters?.project_id && filters.project_id !== 'all') {
        purchaseConditions.push(eq(materialPurchases.project_id, filters.project_id));
        paymentConditions.push(eq(supplierPayments.project_id, filters.project_id));
      }
      
      if (filters?.dateFrom) {
        purchaseConditions.push(gte(materialPurchases.invoiceDate, filters.dateFrom));
        paymentConditions.push(gte(supplierPayments.paymentDate, filters.dateFrom));
      }
      
      if (filters?.dateTo) {
        purchaseConditions.push(lte(materialPurchases.invoiceDate, filters.dateTo));
        paymentConditions.push(lte(supplierPayments.paymentDate, filters.dateTo));
      }

      // جلب جميع المشتريات مع الفلاتر
      const purchases = await db.select().from(materialPurchases)
        .where(purchaseConditions.length > 0 ? and(...purchaseConditions) : undefined);
      
      // جلب جميع المدفوعات مع الفلاتر
      const payments = await db.select().from(supplierPayments)
        .where(paymentConditions.length > 0 ? and(...paymentConditions) : undefined);

      // طباعة عينة من البيانات للتحقق من قيم purchaseType
      if (purchases.length > 0) {
        console.log('🔍 عينة من البيانات:', {
          total: purchases.length,
          first3: purchases.slice(0, 3).map((p: any) => ({
            id: p.id,
            purchaseType: p.purchaseType,
            purchaseTypeType: typeof p.purchaseType,
            totalAmount: p.totalAmount
          }))
        });
        
        // عرض جميع القيم الفريدة لـ purchaseType
        const uniqueTypes = Array.from(new Set(purchases.map((p: any) => p.purchaseType)));
        console.log('🏷️ جميع قيم purchaseType الموجودة:', uniqueTypes);
      }
      
      // فصل المشتريات حسب نوع الدفع أولاً (مع إزالة علامات التنصيص وتطبيع الأحرف العربية)
      const allCashPurchases = purchases.filter((p: any) => {
        const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
        const isCash = cleanType === 'نقد';
        console.log(`💳 فحص: "${p.purchaseType}" -> "${cleanType}" -> نقد؟ ${isCash}`);
        return isCash;
      });
      const allCreditPurchases = purchases.filter((p: any) => {
        const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
        // البحث عن جميع أشكال "أجل": مع الألف العادية والمد
        const isCredit = cleanType === 'أجل' || cleanType === 'آجل' || cleanType.includes('جل');
        console.log(`💰 فحص: "${p.purchaseType}" -> "${cleanType}" -> أجل/آجل؟ ${isCredit}`);
        return isCredit;
      });
      
      // تطبيق فلتر نوع الدفع المحدد
      let cashPurchases = allCashPurchases;
      let creditPurchases = allCreditPurchases;
      
      if (filters?.purchaseType && filters.purchaseType !== 'all') {
        if (filters.purchaseType === 'نقد') {
          creditPurchases = []; // إخفاء الآجلة عند اختيار النقدية فقط
        } else if (filters.purchaseType === 'أجل') {
          cashPurchases = []; // إخفاء النقدية عند اختيار الآجلة فقط
        }
      }
      
      console.log('📊 Purchase statistics:', {
        totalPurchases: purchases.length,
        allCashPurchases: allCashPurchases.length,
        allCreditPurchases: allCreditPurchases.length,
        filteredCashPurchases: cashPurchases.length,
        filteredCreditPurchases: creditPurchases.length,
        selectedFilter: filters?.purchaseType || 'all'
      });

      // حساب الإجماليات
      const totalCashPurchases = cashPurchases.reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || '0'), 0);
      const totalCreditPurchases = creditPurchases.reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || '0'), 0);
      
      // المديونية = فقط المشتريات الآجلة (ليس النقدية)
      const totalDebt = totalCreditPurchases;
      const totalPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0);
      const remainingDebt = totalDebt - totalPaid;
      
      console.log('💰 تفاصيل حساب المديونية:', {
        cashPurchases: totalCashPurchases,
        creditPurchases: totalCreditPurchases,
        totalDebt: totalDebt,
        totalPaid: totalPaid,
        remainingDebt: remainingDebt,
        creditPurchasesCount: creditPurchases.length
      });
      
      // حساب عدد الموردين النشطين (الذين لديهم مشتريات)
      const activeSupplierNames = Array.from(new Set(purchases.map((p: any) => p.supplierName).filter((name: any) => name !== null)));
      
      return {
        totalSuppliers: filters?.supplier_id ? 1 : allSuppliers.length,
        totalCashPurchases: totalCashPurchases.toString(),
        totalCreditPurchases: totalCreditPurchases.toString(),
        totalDebt: totalDebt.toString(),
        totalPaid: totalPaid.toString(),
        remainingDebt: remainingDebt.toString(),
        activeSuppliers: activeSupplierNames.length
      };
    } catch (error) {
      console.error('Error getting supplier statistics:', error);
      throw error;
    }
  }

  // Print Settings Methods
  async getPrintSettings(reportType?: string, user_id?: string): Promise<PrintSettings[]> {
    try {
      const conditions = [];
      
      if (reportType) {
        conditions.push(eq(printSettings.reportType, reportType));
      }
      
      if (user_id) {
        conditions.push(eq(printSettings.user_id, user_id));
      }
      
      return await db.select().from(printSettings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(printSettings.created_at);
    } catch (error) {
      console.error('Error getting print settings:', error);
      return [];
    }
  }

  async getPrintSettingsById(id: string): Promise<PrintSettings | undefined> {
    try {
      const [settings] = await db.select().from(printSettings).where(eq(printSettings.id, id));
      return settings || undefined;
    } catch (error) {
      console.error('Error getting print settings by id:', error);
      return undefined;
    }
  }

  async createPrintSettings(settings: InsertPrintSettings): Promise<PrintSettings> {
    try {
      const [newSettings] = await db
        .insert(printSettings)
        .values(settings)
        .returning();
      return newSettings;
    } catch (error) {
      console.error('Error creating print settings:', error);
      throw error;
    }
  }

  async updatePrintSettings(id: string, settings: Partial<InsertPrintSettings>): Promise<PrintSettings | undefined> {
    try {
      const [updated] = await db
        .update(printSettings)
        .set(settings)
        .where(eq(printSettings.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating print settings:', error);
      throw error;
    }
  }

  async deletePrintSettings(id: string): Promise<void> {
    try {
      await db.delete(printSettings).where(eq(printSettings.id, id));
    } catch (error) {
      console.error('Error deleting print settings:', error);
      throw error;
    }
  }

  async getDefaultPrintSettings(reportType: string): Promise<PrintSettings | undefined> {
    try {
      const [settings] = await db.select().from(printSettings)
        .where(and(
          eq(printSettings.reportType, reportType),
          eq(printSettings.isDefault, true)
        ))
        .limit(1);
      return settings || undefined;
    } catch (error) {
      console.error('Error getting default print settings:', error);
      return undefined;
    }
  }

  // دالتان إضافيتان للإصلاح
  async deleteDailySummary(project_id: string, date: string): Promise<void> {
    try {
      await db.delete(dailyExpenseSummaries)
        .where(and(
          eq(dailyExpenseSummaries.project_id, project_id),
          eq(dailyExpenseSummaries.date, date)
        ));
      console.log(`✅ تم حذف ملخص ${date} للمشروع ${project_id}`);
    } catch (error) {
      console.error('Error deleting daily summary:', error);
      throw error;
    }
  }

  async getDailySummary(project_id: string, date: string): Promise<DailyExpenseSummary | null> {
    try {
      const [summary] = await db.select().from(dailyExpenseSummaries)
        .where(and(
          eq(dailyExpenseSummaries.project_id, project_id),
          eq(dailyExpenseSummaries.date, date)
        ));
      return summary || null;
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return null;
    }
  }

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    try {
      return await db.select().from(reportTemplates).orderBy(sql`created_at DESC`);
    } catch (error) {
      console.error('Error getting report templates:', error);
      return [];
    }
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    try {
      const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
      return template || undefined;
    } catch (error) {
      console.error('Error getting report template:', error);
      return undefined;
    }
  }

  async getActiveReportTemplate(): Promise<ReportTemplate | undefined> {
    try {
      const [template] = await db.select().from(reportTemplates)
        .where(eq(reportTemplates.is_active, true))
        .orderBy(sql`updated_at DESC`)
        .limit(1);
      return template || undefined;
    } catch (error) {
      console.error('Error getting active report template:', error);
      return undefined;
    }
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    try {
      // إذا كان هذا القالب سيكون نشطاً، إلغاء تفعيل القوالب الأخرى
      if (template.is_active) {
        await db.update(reportTemplates)
          .set({ is_active: false })
          .where(eq(reportTemplates.is_active, true));
      }

      const [newTemplate] = await db
        .insert(reportTemplates)
        .values(template)
        .returning();
      
      if (!newTemplate) {
        throw new Error('فشل في إنشاء قالب التقرير');
      }
      
      return newTemplate;
    } catch (error) {
      console.error('Error creating report template:', error);
      throw error;
    }
  }

  async updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    try {
      // إذا كان سيتم تفعيل هذا القالب، إلغاء تفعيل القوالب الأخرى
      if (template.is_active) {
        await db.update(reportTemplates)
          .set({ is_active: false })
          .where(eq(reportTemplates.is_active, true));
      }

      const [updated] = await db
        .update(reportTemplates)
        .set({ ...template, updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(reportTemplates.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating report template:', error);
      throw error;
    }
  }

  async deleteReportTemplate(id: string): Promise<void> {
    try {
      await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
    } catch (error) {
      console.error('Error deleting report template:', error);
      throw error;
    }
  }

  // =====================================================
  // تنفيذ دوال نظام إدارة المعدات المبسط
  // =====================================================

  // Equipment Management (نظام المعدات المبسط)
  async getEquipmentList(): Promise<Equipment[]> {
    try {
      const equipmentList = await db
        .select()
        .from(equipment)
        .orderBy(equipment.code);
      return equipmentList;
    } catch (error) {
      console.error('Error getting equipment list:', error);
      return [];
    }
  }

  // Equipment operations with auto code generation and image support
  async generateNextEquipmentCode(): Promise<string> {
    try {
      console.time('generateCode');
      
      // تحسين جذري: استخدام timestamp للسرعة الفائقة
      const timestamp = Date.now().toString().slice(-6);
      const code = `EQ-${timestamp}`;
      
      console.timeEnd('generateCode');
      console.log(`📝 كود جديد: ${code}`);
      
      return code;
    } catch (error) {
      console.error('Error generating equipment code:', error);
      const fallback = `EQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      return fallback;
    }
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    try {
      const [foundEquipment] = await db.select().from(equipment)
        .where(eq(equipment.id, parseInt(id)));
      return foundEquipment || undefined;
    } catch (error) {
      console.error('Error getting equipment:', error);
      return undefined;
    }
  }

  async getEquipment(filters?: {
    project_id?: string;
    status?: string;
    type?: string;
    searchTerm?: string;
  }): Promise<Equipment[]> {
    try {
      console.time('getEquipment');
      
      // فحص Cache أولاً
      const now = Date.now();
      if (this.equipmentCache && (now - this.equipmentCache.timestamp) < this.CACHE_DURATION) {
        console.log('⚡ استخدام Cache المحلي - سرعة فائقة!');
        console.timeEnd('getEquipment');
        return this.applyFiltersToCache(this.equipmentCache.data, filters);
      }
      
      // استعلام فائق السرعة - الحقول الأساسية + الصورة
      const result = await db.select({
        id: equipment.id,
        code: equipment.code,
        name: equipment.name,
        status: equipment.status,
        currentProjectId: equipment.project_id,
        type: equipment.type,
        imageUrl: equipment.imageUrl,
        description: equipment.description,
        purchasePrice: equipment.purchasePrice,
        purchaseDate: equipment.purchaseDate
      }).from(equipment)
        .limit(50); // حد أقصى 50
      
      // حفظ في Cache
      this.equipmentCache = {
        data: result,
        timestamp: now
      };
      
      console.timeEnd('getEquipment');
      console.log(`⚡ تم جلب ${result.length} معدة وحفظها في Cache`);
      
      return this.applyFiltersToCache(result, filters);
    } catch (error) {
      console.error('Error getting equipment list:', error);
      return [];
    }
  }

  private applyFiltersToCache(data: any[], filters?: {
    project_id?: string;
    status?: string;
    type?: string;
    searchTerm?: string;
  }): any[] {
    if (!filters) return data;

    return data.filter(item => {
      // فلتر المشروع
      if (filters.project_id && filters.project_id !== 'all') {
        if (filters.project_id === 'warehouse') {
          if (item.currentProjectId) return false;
        } else if (item.currentProjectId !== filters.project_id) {
          return false;
        }
      }

      // فلتر الحالة
      if (filters.status && filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      // فلتر النوع
      if (filters.type && filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }

      // فلتر البحث
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(searchLower);
        const codeMatch = item.code?.toLowerCase().includes(searchLower);
        if (!nameMatch && !codeMatch) return false;
      }

      return true;
    });
  }

  async getEquipmentByCode(code: string): Promise<Equipment | undefined> {
    try {
      const [foundEquipment] = await db.select().from(equipment)
        .where(eq(equipment.code, code));
      return foundEquipment || undefined;
    } catch (error) {
      console.error('Error getting equipment by code:', error);
      return undefined;
    }
  }

  async getEquipmentByProject(project_id: string): Promise<Equipment[]> {
    try {
      return await db.select().from(equipment)
        .where(eq(equipment.project_id, project_id))
        .orderBy(equipment.code);
    } catch (error) {
      console.error('Error getting equipment by project:', error);
      return [];
    }
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    try {
      console.time('createEquipment');
      
      // توليد كود تلقائي - محسن
      const autoCode = await this.generateNextEquipmentCode();
      
      const [newEquipment] = await db
        .insert(equipment)
        .values({
          ...equipmentData,
          code: autoCode
        })
        .returning();
      
      if (!newEquipment) {
        throw new Error('فشل في إنشاء المعدة');
      }
      
      console.timeEnd('createEquipment');
      console.log(`✅ تمت إضافة المعدة: ${newEquipment.name}`);
      
      return newEquipment;
    } catch (error) {
      console.error('Error creating equipment:', error);
      throw error;
    }
  }

  async updateEquipment(id: string, equipmentData: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    try {
      console.time('updateEquipment');
      
      const [updatedEquipment] = await db
        .update(equipment)
        .set({ ...equipmentData })
        .where(eq(equipment.id, parseInt(id)))
        .returning();
      
      console.timeEnd('updateEquipment');
      console.log(`✅ تم تعديل المعدة: ${updatedEquipment?.name || id}`);
      
      return updatedEquipment || undefined;
    } catch (error) {
      console.error('Error updating equipment:', error);
      throw error;
    }
  }

  async deleteEquipment(id: string): Promise<void> {
    try {
      console.time('deleteEquipment');
      
      await db.delete(equipment).where(eq(equipment.id, parseInt(id)));
      
      console.timeEnd('deleteEquipment');
      console.log(`🗑️ تم حذف المعدة: ${id}`);
    } catch (error) {
      console.error('Error deleting equipment:', error);
      throw error;
    }
  }

  // Equipment Movements
  async getEquipmentMovements(equipmentId: string): Promise<EquipmentMovement[]> {
    try {
      return await db.select().from(equipmentMovements)
        .where(eq(equipmentMovements.equipmentId, parseInt(equipmentId)))
        .orderBy(desc(equipmentMovements.movementDate));
    } catch (error) {
      console.error('Error getting equipment movements:', error);
      return [];
    }
  }

  async createEquipmentMovement(movementData: InsertEquipmentMovement): Promise<EquipmentMovement> {
    try {
      const [newMovement] = await db
        .insert(equipmentMovements)
        .values(movementData)
        .returning();
      
      if (!newMovement) {
        throw new Error('فشل في إنشاء حركة المعدة');
      }
      
      return newMovement;
    } catch (error) {
      console.error('Error creating equipment movement:', error);
      throw error;
    }
  }

  async updateEquipmentMovement(id: string, movement: Partial<InsertEquipmentMovement>): Promise<EquipmentMovement | undefined> {
    try {
      const [updated] = await db
        .update(equipmentMovements)
        .set(movement)
        .where(eq(equipmentMovements.id, parseInt(id)))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating equipment movement:', error);
      return undefined;
    }
  }


  // =====================================================
  // تنفيذ دوال إدارة الإشعارات
  // =====================================================

  // Notification Read States Implementation
  async isNotificationRead(user_id: string, notificationId: string, notificationType: string): Promise<boolean> {
    try {
      const [state] = await db.select({
        isRead: notificationReadStates.isRead
      }).from(notificationReadStates)
        .where(and(
          eq(notificationReadStates.user_id, user_id),
          eq(notificationReadStates.notificationId, notificationId)
        ));
      return state?.isRead || false;
    } catch (error) {
      console.error('Error checking notification read state:', error);
      return false;
    }
  }

  async getNotificationReadState(user_id: string, notificationId: string, notificationType: string): Promise<NotificationReadState | undefined> {
    try {
      const [state] = await db.select({
        id: notificationReadStates.id,
        user_id: notificationReadStates.user_id,
        notificationId: notificationReadStates.notificationId,
        isRead: notificationReadStates.isRead,
        readAt: notificationReadStates.readAt,
        created_at: notificationReadStates.created_at
      }).from(notificationReadStates)
        .where(and(
          eq(notificationReadStates.user_id, user_id),
          eq(notificationReadStates.notificationId, notificationId)
        ));
      return state || undefined;
    } catch (error) {
      console.error('Error getting notification read state:', error);
      return undefined;
    }
  }

  async markNotificationAsRead(user_id: string, notificationId: string, notificationType: string): Promise<void> {
    try {
      const existingState = await this.getNotificationReadState(user_id, notificationId, notificationType);
      
      if (existingState) {
        await db.update(notificationReadStates)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(notificationReadStates.id, existingState.id));
      } else {
        await db.insert(notificationReadStates).values({
          user_id: user_id,
          notificationId: notificationId,
          isRead: true,
          readAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(user_id: string): Promise<void> {
    try {
      await db.update(notificationReadStates)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notificationReadStates.user_id, user_id),
          eq(notificationReadStates.isRead, false)
        ));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getReadNotifications(user_id: string, notificationType?: string): Promise<NotificationReadState[]> {
    try {
      const conditions = [eq(notificationReadStates.user_id, user_id), eq(notificationReadStates.isRead, true)];

      return await db.select({
        id: notificationReadStates.id,
        user_id: notificationReadStates.user_id,
        notificationId: notificationReadStates.notificationId,
        isRead: notificationReadStates.isRead,
        readAt: notificationReadStates.readAt,
        created_at: notificationReadStates.created_at
      }).from(notificationReadStates)
        .where(and(...conditions))
        .orderBy(desc(notificationReadStates.readAt));
    } catch (error) {
      console.error('Error getting read notifications:', error);
      return [];
    }
  }

  // =====================================================
  // Wells Management System Implementation (تنفيذ نظام إدارة الآبار)
  // =====================================================

  // Well Tasks
  async getWellTasks(well_id: number): Promise<WellTask[]> {
    try {
      return await db.select()
        .from(wellTasks)
        .where(eq(wellTasks.well_id, well_id))
        .orderBy(wellTasks.taskOrder);
    } catch (error) {
      console.error('Error getting well tasks:', error);
      return [];
    }
  }

  async getWellTask(id: number): Promise<WellTask | undefined> {
    try {
      const [task] = await db.select()
        .from(wellTasks)
        .where(eq(wellTasks.id, id));
      return task || undefined;
    } catch (error) {
      console.error('Error getting well task:', error);
      return undefined;
    }
  }

  async createWellTask(task: InsertWellTask): Promise<WellTask> {
    try {
      const [newTask] = await db
        .insert(wellTasks)
        .values(task)
        .returning();
      return newTask;
    } catch (error) {
      console.error('Error creating well task:', error);
      throw error;
    }
  }

  async updateWellTask(id: number, task: Partial<InsertWellTask>): Promise<WellTask | undefined> {
    try {
      const [updated] = await db
        .update(wellTasks)
        .set({ ...task, updated_at: new Date() })
        .where(eq(wellTasks.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating well task:', error);
      return undefined;
    }
  }

  async deleteWellTask(id: number): Promise<void> {
    try {
      await db.delete(wellTasks)
        .where(eq(wellTasks.id, id));
    } catch (error) {
      console.error('Error deleting well task:', error);
      throw error;
    }
  }

  // Well Task Accounts
  async getWellTaskAccount(taskId: number): Promise<WellTaskAccount | undefined> {
    try {
      const [account] = await db.select()
        .from(wellTaskAccounts)
        .where(eq(wellTaskAccounts.taskId, taskId));
      return account || undefined;
    } catch (error) {
      console.error('Error getting well task account:', error);
      return undefined;
    }
  }

  async createWellTaskAccount(account: InsertWellTaskAccount): Promise<WellTaskAccount> {
    try {
      const [newAccount] = await db
        .insert(wellTaskAccounts)
        .values(account)
        .returning();
      return newAccount;
    } catch (error) {
      console.error('Error creating well task account:', error);
      throw error;
    }
  }

  async updateWellTaskAccount(id: number, account: Partial<InsertWellTaskAccount>): Promise<WellTaskAccount | undefined> {
    try {
      const [updated] = await db
        .update(wellTaskAccounts)
        .set(account)
        .where(eq(wellTaskAccounts.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating well task account:', error);
      return undefined;
    }
  }

  async deleteWellTaskAccount(id: number): Promise<void> {
    try {
      await db.delete(wellTaskAccounts)
        .where(eq(wellTaskAccounts.id, id));
    } catch (error) {
      console.error('Error deleting well task account:', error);
      throw error;
    }
  }

  async getWellTaskAccountsByWell(well_id: number): Promise<WellTaskAccount[]> {
    try {
      return await db.select()
        .from(wellTaskAccounts)
        .innerJoin(wellTasks, eq(wellTaskAccounts.taskId, wellTasks.id))
        .where(eq(wellTasks.well_id, well_id))
        .then((results: any) => results.map((r: any) => r.well_task_accounts));
    } catch (error) {
      console.error('Error getting well task accounts by well:', error);
      return [];
    }
  }

  // Well Expenses
  async getWellExpenses(well_id: number, dateFrom?: string, dateTo?: string): Promise<WellExpense[]> {
    try {
      let query = db.select()
        .from(wellExpenses)
        .where(eq(wellExpenses.well_id, well_id));

      if (dateFrom) {
        query = query.andWhere(gte(wellExpenses.expenseDate, dateFrom));
      }
      if (dateTo) {
        query = query.andWhere(lte(wellExpenses.expenseDate, dateTo));
      }

      return await query.orderBy(desc(wellExpenses.expenseDate));
    } catch (error) {
      console.error('Error getting well expenses:', error);
      return [];
    }
  }

  async getWellExpense(id: number): Promise<WellExpense | undefined> {
    try {
      const [expense] = await db.select()
        .from(wellExpenses)
        .where(eq(wellExpenses.id, id));
      return expense || undefined;
    } catch (error) {
      console.error('Error getting well expense:', error);
      return undefined;
    }
  }

  async createWellExpense(expense: InsertWellExpense): Promise<WellExpense> {
    try {
      const [newExpense] = await db
        .insert(wellExpenses)
        .values(expense)
        .returning();
      return newExpense;
    } catch (error) {
      console.error('Error creating well expense:', error);
      throw error;
    }
  }

  async updateWellExpense(id: number, expense: Partial<InsertWellExpense>): Promise<WellExpense | undefined> {
    try {
      const [updated] = await db
        .update(wellExpenses)
        .set(expense)
        .where(eq(wellExpenses.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating well expense:', error);
      return undefined;
    }
  }

  async deleteWellExpense(id: number): Promise<void> {
    try {
      await db.delete(wellExpenses)
        .where(eq(wellExpenses.id, id));
    } catch (error) {
      console.error('Error deleting well expense:', error);
      throw error;
    }
  }

  async getWellExpensesByType(well_id: number, expenseType: string): Promise<WellExpense[]> {
    try {
      return await db.select()
        .from(wellExpenses)
        .where(and(
          eq(wellExpenses.well_id, well_id),
          eq(wellExpenses.expenseType, expenseType)
        ))
        .orderBy(desc(wellExpenses.expenseDate));
    } catch (error) {
      console.error('Error getting well expenses by type:', error);
      return [];
    }
  }

  // Well Audit Logs
  async getWellAuditLogs(well_id?: number, taskId?: number, limit?: number): Promise<WellAuditLog[]> {
    try {
      let query = db.select()
        .from(wellAuditLogs);

      if (well_id) {
        query = query.where(eq(wellAuditLogs.well_id, well_id));
      }
      if (taskId) {
        query = query.where(eq(wellAuditLogs.taskId, taskId));
      }

      query = query.orderBy(desc(wellAuditLogs.created_at));

      if (limit) {
        query = query.limit(limit);
      }

      return await query;
    } catch (error) {
      console.error('Error getting well audit logs:', error);
      return [];
    }
  }

  async getWellAuditLog(id: number): Promise<WellAuditLog | undefined> {
    try {
      const [log] = await db.select()
        .from(wellAuditLogs)
        .where(eq(wellAuditLogs.id, id));
      return log || undefined;
    } catch (error) {
      console.error('Error getting well audit log:', error);
      return undefined;
    }
  }

  async createWellAuditLog(log: InsertWellAuditLog): Promise<WellAuditLog> {
    try {
      const [newLog] = await db
        .insert(wellAuditLogs)
        .values(log)
        .returning();
      return newLog;
    } catch (error) {
      console.error('Error creating well audit log:', error);
      throw error;
    }
  }

  async deleteWellAuditLog(id: number): Promise<void> {
    try {
      await db.delete(wellAuditLogs)
        .where(eq(wellAuditLogs.id, id));
    } catch (error) {
      console.error('Error deleting well audit log:', error);
      throw error;
    }
  }

  // =====================================================
  // AI System Implementation (تنفيذ النظام الذكي)
  // =====================================================

  async getDatabaseTables(): Promise<any[]> {
    try {
      console.log('🔍 جاري تحليل جداول قاعدة البيانات...');
      
      const query = sql`
        SELECT DISTINCT
          t.table_name,
          t.table_schema as schema_name,
          COALESCE(s.n_tup_ins - s.n_tup_del, 0) as row_count,
          COALESCE(pt.rowsecurity, false) as rls_enabled,
          COALESCE(pt.rowsecurity, false) as rls_forced,
          EXISTS(
            SELECT 1 FROM pg_policies 
            WHERE schemaname = t.table_schema 
            AND tablename = t.table_name
          ) as has_policies,
          CASE 
            WHEN t.table_name ~* 'user|auth|session|account' THEN 'high'
            WHEN t.table_name ~* 'project|worker|supplier|payment' THEN 'medium'
            ELSE 'low'
          END as security_level,
          CASE 
            WHEN t.table_name ~* 'user|auth' AND NOT COALESCE(pt.rowsecurity, false) 
            THEN 'يُنصح بتفعيل RLS للحماية'
            WHEN COALESCE(s.n_tup_ins - s.n_tup_del, 0) > 10000 
            THEN 'يُنصح بإضافة فهارس للأداء'
            ELSE 'الإعدادات مناسبة'
          END as recommended_action,
          pg_size_pretty(COALESCE(pg_total_relation_size(c.oid), 0)) as size_estimate,
          CURRENT_TIMESTAMP as last_analyzed
        FROM information_schema.tables t
        LEFT JOIN pg_tables pt ON (pt.tablename = t.table_name AND pt.schemaname = t.table_schema)
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON (n.nspname = t.table_schema AND c.relnamespace = n.oid)
        LEFT JOIN pg_stat_user_tables s ON (s.relname = t.table_name AND s.schemaname = t.table_schema)
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT LIKE 'pg_%'
          AND t.table_name NOT LIKE 'sql_%'
        ORDER BY t.table_name
      `;
      
      const result = await db.execute(query);
      return result.rows.map((row: any) => ({
        table_name: row.table_name,
        schema_name: row.schema_name,
        row_count: parseInt(row.row_count) || 0,
        rls_enabled: Boolean(row.rls_enabled),
        rls_forced: Boolean(row.rls_forced),
        has_policies: Boolean(row.has_policies),
        security_level: row.security_level || 'low',
        recommended_action: row.recommended_action || '',
        size_estimate: row.size_estimate || '0 bytes',
        last_analyzed: row.last_analyzed || new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ خطأ في تحليل جداول قاعدة البيانات:', error);
      return [];
    }
  }

  async getAuditLogs(user_id?: string | number, action?: string): Promise<AuditLog[]> {
    const conditions = [];
    if (user_id) {
      conditions.push(eq(auditLogs.user_id, String(user_id)));
    }
    if (action) conditions.push(eq(auditLogs.action, action));
    
    return await db.select().from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.created_at));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  // Daily Activity Logs Implementation
  async getDailyLogs(project_id?: string, date?: string): Promise<DailyActivityLog[]> {
    let query = db.select().from(dailyActivityLogs).orderBy(desc(dailyActivityLogs.logDate));
    // Drizzle dynamic query builder limitation
    if (project_id) query = query.where(eq(dailyActivityLogs.project_id, project_id)) as typeof query; // Drizzle dynamic query builder limitation
    if (date) query = query.where(eq(dailyActivityLogs.logDate, date)) as typeof query; // Drizzle dynamic query builder limitation
    return await query;
  }

  async createDailyLog(log: InsertDailyActivityLog): Promise<DailyActivityLog> {
    const [newLog] = await db.insert(dailyActivityLogs).values(log).returning();
    return newLog;
  }

  async updateDailyLog(id: string, log: Partial<InsertDailyActivityLog>): Promise<DailyActivityLog | undefined> {
    const [updated] = await db.update(dailyActivityLogs).set(log).where(eq(dailyActivityLogs.id, id)).returning();
    return updated;
  }

  async deleteDailyLog(id: string): Promise<void> {
    await db.delete(dailyActivityLogs).where(eq(dailyActivityLogs.id, id));
  }

  async analyzeSecurityThreats(): Promise<any> {
    return { status: "secure", threats: [], lastCheck: new Date() };
  }

  async exportData(): Promise<any> {
    return await this.getProjects(); // Mock or simplified export
  }

  async toggleTableRLS(tableName: string, enable: boolean): Promise<any> {
    try {
      console.log(`🔧 ${enable ? 'تفعيل' : 'تعطيل'} RLS للجدول: ${tableName}`);
      
      // التحقق من وجود الجدول أولاً
      const tableCheck = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = ${tableName} 
          AND table_schema = 'public'
      `);
      
      if (tableCheck.rows.length === 0) {
        throw new Error(`الجدول ${tableName} غير موجود`);
      }
      
      // تنفيذ عملية تفعيل/تعطيل RLS
      const operation = enable ? 'ENABLE' : 'DISABLE';
      await pool.query(`ALTER TABLE "${tableName}" ${operation} ROW LEVEL SECURITY`);
      
      console.log(`✅ تم ${enable ? 'تفعيل' : 'تعطيل'} RLS للجدول ${tableName} بنجاح`);
      
      return {
        table_name: tableName,
        rls_enabled: enable,
        updated_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ خطأ في ${enable ? 'تفعيل' : 'تعطيل'} RLS للجدول ${tableName}:`, error);
      throw error;
    }
  }

  async getTablePolicies(tableName: string): Promise<any[]> {
    try {
      console.log(`🔍 جلب سياسات RLS للجدول: ${tableName}`);
      
      const query = sql`
        SELECT 
          policyname as policy_name,
          cmd as command,
          permissive,
          roles,
          qual as expression,
          with_check
        FROM pg_policies 
        WHERE tablename = ${tableName}
          AND schemaname = 'public'
        ORDER BY policyname
      `;
      
      const result = await db.execute(query);
      
      console.log(`✅ تم جلب ${result.rows?.length || 0} سياسة للجدول ${tableName}`);
      
      return (result.rows || []).map((row: any) => ({
        policy_name: row.policy_name,
        command: row.command,
        permissive: row.permissive,
        roles: row.roles,
        expression: row.expression,
        with_check: row.with_check
      }));
      
    } catch (error) {
      console.error(`❌ خطأ في جلب سياسات الجدول ${tableName}:`, error);
      return [];
    }
  }

  async createWebAuthnCredential(data: InsertWebAuthnCredential): Promise<WebAuthnCredential> {
    const [credential] = await db.insert(webauthnCredentials).values(data).returning();
    return credential;
  }

  async getWebAuthnCredentialsByUserId(userId: string): Promise<WebAuthnCredential[]> {
    return await db.select().from(webauthnCredentials).where(eq(webauthnCredentials.user_id, userId));
  }

  async getWebAuthnCredentialByCredentialId(credentialId: string): Promise<WebAuthnCredential | undefined> {
    const [credential] = await db.select().from(webauthnCredentials).where(eq(webauthnCredentials.credential_id, credentialId));
    return credential || undefined;
  }

  async updateWebAuthnCredentialCounter(credentialId: string, counter: number): Promise<void> {
    await db.update(webauthnCredentials)
      .set({ counter, last_used_at: new Date() })
      .where(eq(webauthnCredentials.credential_id, credentialId));
  }

  async deleteWebAuthnCredential(credentialId: string): Promise<void> {
    await db.delete(webauthnCredentials).where(eq(webauthnCredentials.credential_id, credentialId));
  }

  async deleteAllWebAuthnCredentialsByUserId(userId: string): Promise<void> {
    await db.delete(webauthnCredentials).where(eq(webauthnCredentials.user_id, userId));
  }

  async getUserPreferences(userId: string): Promise<any | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.user_id, userId));
    return prefs;
  }

  async upsertUserPreferences(userId: string, prefs: Record<string, any>): Promise<any> {
    const existing = await this.getUserPreferences(userId);
    if (existing) {
      const [updated] = await db.update(userPreferences)
        .set({ ...prefs, updated_at: new Date() })
        .where(eq(userPreferences.user_id, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPreferences)
        .values({ user_id: userId, ...prefs })
        .returning();
      return created;
    }
  }

  async createWebAuthnChallenge(data: InsertWebAuthnChallenge): Promise<WebAuthnChallenge> {
    const [challenge] = await db.insert(webauthnChallenges).values(data).returning();
    return challenge;
  }

  async getWebAuthnChallenge(challenge: string): Promise<WebAuthnChallenge | undefined> {
    const [result] = await db.select().from(webauthnChallenges).where(eq(webauthnChallenges.challenge, challenge));
    return result || undefined;
  }

  async deleteWebAuthnChallenge(challenge: string): Promise<void> {
    await db.delete(webauthnChallenges).where(eq(webauthnChallenges.challenge, challenge));
  }

  async cleanupExpiredChallenges(): Promise<void> {
    await db.delete(webauthnChallenges).where(lte(webauthnChallenges.expires_at, new Date()));
  }
}

export const storage = new DatabaseStorage();
