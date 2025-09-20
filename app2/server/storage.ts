import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, desc, asc, count, sum, sql, and, or, gte, lte } from "drizzle-orm";
import { 
  Project, Worker, Material, Supplier, WorkerAttendance, MaterialPurchase, 
  FundTransfer, TransportationExpense, WorkerTransfer, WorkerBalance,
  DailyExpenseSummary, WorkerType, AutocompleteData, WorkerMiscExpense,
  SupplierPayment, PrintSettings, ProjectFundTransfer,
  InsertProject, InsertWorker, InsertMaterial, InsertSupplier,
  InsertWorkerAttendance, InsertMaterialPurchase, InsertFundTransfer,
  InsertTransportationExpense, InsertWorkerTransfer, InsertWorkerBalance,
  InsertDailyExpenseSummary, InsertWorkerType, InsertAutocompleteData,
  InsertWorkerMiscExpense, InsertSupplierPayment, InsertPrintSettings,
  InsertProjectFundTransfer
} from "@shared/schema";

// ===============================
// PROJECTS (المشاريع)
// ===============================

export async function getProjects(params?: { 
  status?: string, 
  limit?: number 
}): Promise<Project[]> {
  try {
    let query = db.select().from(schema.projects);
    
    if (params?.status) {
      query = query.where(eq(schema.projects.status, params.status));
    }
    
    query = query.orderBy(desc(schema.projects.createdAt));
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    const projects = await query;
    console.log(`📊 [Storage] تم جلب ${projects.length} مشروع`);
    return projects;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب المشاريع:', error);
    throw new Error(`فشل في جلب المشاريع: ${error.message}`);
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const [project] = await db.select()
      .from(schema.projects)
      .where(eq(schema.projects.id, id));
    
    return project || null;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب المشروع:', error);
    throw new Error(`فشل في جلب المشروع: ${error.message}`);
  }
}

export async function createProject(data: InsertProject): Promise<Project> {
  try {
    const [project] = await db.insert(schema.projects)
      .values(data)
      .returning();
    
    console.log(`✅ [Storage] تم إنشاء مشروع جديد: ${project.name}`);
    return project;
  } catch (error) {
    console.error('❌ [Storage] خطأ في إنشاء المشروع:', error);
    throw new Error(`فشل في إنشاء المشروع: ${error.message}`);
  }
}

// ===============================
// WORKERS (العمال)
// ===============================

export async function getWorkers(params?: { 
  isActive?: boolean, 
  type?: string, 
  limit?: number 
}): Promise<Worker[]> {
  try {
    let query = db.select().from(schema.workers);
    
    const conditions = [];
    
    if (params?.isActive !== undefined) {
      conditions.push(eq(schema.workers.isActive, params.isActive));
    }
    
    if (params?.type) {
      conditions.push(eq(schema.workers.type, params.type));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(schema.workers.createdAt));
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    const workers = await query;
    console.log(`👷 [Storage] تم جلب ${workers.length} عامل`);
    return workers;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب العمال:', error);
    throw new Error(`فشل في جلب العمال: ${error.message}`);
  }
}

export async function getWorker(id: string): Promise<Worker | null> {
  try {
    const [worker] = await db.select()
      .from(schema.workers)
      .where(eq(schema.workers.id, id));
    
    return worker || null;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب العامل:', error);
    throw new Error(`فشل في جلب العامل: ${error.message}`);
  }
}

export async function createWorker(data: InsertWorker): Promise<Worker> {
  try {
    const [worker] = await db.insert(schema.workers)
      .values(data)
      .returning();
    
    console.log(`✅ [Storage] تم إنشاء عامل جديد: ${worker.name}`);
    return worker;
  } catch (error) {
    console.error('❌ [Storage] خطأ في إنشاء العامل:', error);
    throw new Error(`فشل في إنشاء العامل: ${error.message}`);
  }
}

// ===============================
// MATERIALS (المواد)
// ===============================

export async function getMaterials(params?: { 
  category?: string, 
  limit?: number 
}): Promise<Material[]> {
  try {
    let query = db.select().from(schema.materials);
    
    if (params?.category) {
      query = query.where(eq(schema.materials.category, params.category));
    }
    
    query = query.orderBy(asc(schema.materials.name));
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    const materials = await query;
    console.log(`🧱 [Storage] تم جلب ${materials.length} مادة`);
    return materials;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب المواد:', error);
    throw new Error(`فشل في جلب المواد: ${error.message}`);
  }
}

export async function getMaterial(id: string): Promise<Material | null> {
  try {
    const [material] = await db.select()
      .from(schema.materials)
      .where(eq(schema.materials.id, id));
    
    return material || null;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب المادة:', error);
    throw new Error(`فشل في جلب المادة: ${error.message}`);
  }
}

export async function createMaterial(data: InsertMaterial): Promise<Material> {
  try {
    const [material] = await db.insert(schema.materials)
      .values(data)
      .returning();
    
    console.log(`✅ [Storage] تم إنشاء مادة جديدة: ${material.name}`);
    return material;
  } catch (error) {
    console.error('❌ [Storage] خطأ في إنشاء المادة:', error);
    throw new Error(`فشل في إنشاء المادة: ${error.message}`);
  }
}

// ===============================
// SUPPLIERS (الموردين)
// ===============================

export async function getSuppliers(params?: { 
  isActive?: boolean, 
  limit?: number 
}): Promise<Supplier[]> {
  try {
    let query = db.select().from(schema.suppliers);
    
    if (params?.isActive !== undefined) {
      query = query.where(eq(schema.suppliers.isActive, params.isActive));
    }
    
    query = query.orderBy(asc(schema.suppliers.name));
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    const suppliers = await query;
    console.log(`🏪 [Storage] تم جلب ${suppliers.length} مورد`);
    return suppliers;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب الموردين:', error);
    throw new Error(`فشل في جلب الموردين: ${error.message}`);
  }
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  try {
    const [supplier] = await db.select()
      .from(schema.suppliers)
      .where(eq(schema.suppliers.id, id));
    
    return supplier || null;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب المورد:', error);
    throw new Error(`فشل في جلب المورد: ${error.message}`);
  }
}

export async function createSupplier(data: InsertSupplier): Promise<Supplier> {
  try {
    const [supplier] = await db.insert(schema.suppliers)
      .values(data)
      .returning();
    
    console.log(`✅ [Storage] تم إنشاء مورد جديد: ${supplier.name}`);
    return supplier;
  } catch (error) {
    console.error('❌ [Storage] خطأ في إنشاء المورد:', error);
    throw new Error(`فشل في إنشاء المورد: ${error.message}`);
  }
}

// ===============================
// NOTIFICATIONS (الإشعارات)
// ===============================

// إنشاء إشعارات ديناميكية بناء على الأنشطة الحديثة
export async function getNotifications(params?: { 
  projectId?: string, 
  limit?: number 
}): Promise<any[]> {
  try {
    const notifications = [];
    const limit = params?.limit || 50;
    
    // إشعارات من الحضور الحديث
    const recentAttendance = await db.select({
      id: schema.workerAttendance.id,
      workerId: schema.workerAttendance.workerId,
      workerName: schema.workers.name,
      projectId: schema.workerAttendance.projectId,
      projectName: schema.projects.name,
      date: schema.workerAttendance.date,
      isPresent: schema.workerAttendance.isPresent,
      actualWage: schema.workerAttendance.actualWage,
      createdAt: schema.workerAttendance.createdAt
    })
    .from(schema.workerAttendance)
    .leftJoin(schema.workers, eq(schema.workerAttendance.workerId, schema.workers.id))
    .leftJoin(schema.projects, eq(schema.workerAttendance.projectId, schema.projects.id))
    .where(params?.projectId ? eq(schema.workerAttendance.projectId, params.projectId) : undefined)
    .orderBy(desc(schema.workerAttendance.createdAt))
    .limit(20);
    
    recentAttendance.forEach(attendance => {
      notifications.push({
        id: `attendance_${attendance.id}`,
        type: 'worker_attendance',
        title: `${attendance.isPresent ? 'حضور' : 'غياب'} عامل`,
        message: `${attendance.workerName} - ${attendance.isPresent ? 'حضر' : 'تغيب'} في مشروع ${attendance.projectName}`,
        data: {
          workerId: attendance.workerId,
          workerName: attendance.workerName,
          projectId: attendance.projectId,
          projectName: attendance.projectName,
          date: attendance.date,
          isPresent: attendance.isPresent,
          wage: attendance.actualWage
        },
        isRead: false,
        priority: attendance.isPresent ? 'normal' : 'high',
        createdAt: attendance.createdAt
      });
    });
    
    // إشعارات من المشتريات الحديثة
    const recentPurchases = await db.select({
      id: schema.materialPurchases.id,
      materialId: schema.materialPurchases.materialId,
      materialName: schema.materials.name,
      projectId: schema.materialPurchases.projectId,
      projectName: schema.projects.name,
      quantity: schema.materialPurchases.quantity,
      totalAmount: schema.materialPurchases.totalAmount,
      supplierName: schema.materialPurchases.supplierName,
      createdAt: schema.materialPurchases.createdAt
    })
    .from(schema.materialPurchases)
    .leftJoin(schema.materials, eq(schema.materialPurchases.materialId, schema.materials.id))
    .leftJoin(schema.projects, eq(schema.materialPurchases.projectId, schema.projects.id))
    .where(params?.projectId ? eq(schema.materialPurchases.projectId, params.projectId) : undefined)
    .orderBy(desc(schema.materialPurchases.createdAt))
    .limit(15);
    
    recentPurchases.forEach(purchase => {
      notifications.push({
        id: `purchase_${purchase.id}`,
        type: 'material_purchase',
        title: 'شراء مواد جديدة',
        message: `تم شراء ${purchase.quantity} ${purchase.materialName} بقيمة ${purchase.totalAmount} من ${purchase.supplierName}`,
        data: {
          materialId: purchase.materialId,
          materialName: purchase.materialName,
          projectId: purchase.projectId,
          projectName: purchase.projectName,
          quantity: purchase.quantity,
          totalAmount: purchase.totalAmount,
          supplierName: purchase.supplierName
        },
        isRead: false,
        priority: 'normal',
        createdAt: purchase.createdAt
      });
    });
    
    // إشعارات من التحويلات المالية
    const recentTransfers = await db.select({
      id: schema.fundTransfers.id,
      projectId: schema.fundTransfers.projectId,
      projectName: schema.projects.name,
      amount: schema.fundTransfers.amount,
      senderName: schema.fundTransfers.senderName,
      transferType: schema.fundTransfers.transferType,
      transferDate: schema.fundTransfers.transferDate,
      createdAt: schema.fundTransfers.createdAt
    })
    .from(schema.fundTransfers)
    .leftJoin(schema.projects, eq(schema.fundTransfers.projectId, schema.projects.id))
    .where(params?.projectId ? eq(schema.fundTransfers.projectId, params.projectId) : undefined)
    .orderBy(desc(schema.fundTransfers.createdAt))
    .limit(10);
    
    recentTransfers.forEach(transfer => {
      notifications.push({
        id: `transfer_${transfer.id}`,
        type: 'fund_transfer',
        title: 'تحويل مالي جديد',
        message: `تم استلام ${transfer.amount} من ${transfer.senderName} لمشروع ${transfer.projectName}`,
        data: {
          projectId: transfer.projectId,
          projectName: transfer.projectName,
          amount: transfer.amount,
          senderName: transfer.senderName,
          transferType: transfer.transferType,
          transferDate: transfer.transferDate
        },
        isRead: false,
        priority: 'high',
        createdAt: transfer.createdAt
      });
    });
    
    // ترتيب الإشعارات حسب التاريخ والأولوية
    notifications.sort((a, b) => {
      // أولاً حسب الأولوية
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // ثم حسب التاريخ
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    const finalNotifications = notifications.slice(0, limit);
    console.log(`🔔 [Storage] تم إنشاء ${finalNotifications.length} إشعار من الأنشطة الحديثة`);
    
    return finalNotifications;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب الإشعارات:', error);
    throw new Error(`فشل في جلب الإشعارات: ${error.message}`);
  }
}

// ===============================
// WORKER ATTENDANCE (حضور العمال)
// ===============================

export async function getWorkerAttendance(params?: { 
  projectId?: string, 
  workerId?: string, 
  date?: string, 
  limit?: number 
}): Promise<any[]> {
  try {
    let query = db.select({
      id: schema.workerAttendance.id,
      projectId: schema.workerAttendance.projectId,
      workerId: schema.workerAttendance.workerId,
      workerName: schema.workers.name,
      workerType: schema.workers.type,
      projectName: schema.projects.name,
      date: schema.workerAttendance.date,
      startTime: schema.workerAttendance.startTime,
      endTime: schema.workerAttendance.endTime,
      workDescription: schema.workerAttendance.workDescription,
      isPresent: schema.workerAttendance.isPresent,
      workDays: schema.workerAttendance.workDays,
      dailyWage: schema.workerAttendance.dailyWage,
      actualWage: schema.workerAttendance.actualWage,
      paidAmount: schema.workerAttendance.paidAmount,
      remainingAmount: schema.workerAttendance.remainingAmount,
      paymentType: schema.workerAttendance.paymentType,
      createdAt: schema.workerAttendance.createdAt
    })
    .from(schema.workerAttendance)
    .leftJoin(schema.workers, eq(schema.workerAttendance.workerId, schema.workers.id))
    .leftJoin(schema.projects, eq(schema.workerAttendance.projectId, schema.projects.id));
    
    const conditions = [];
    
    if (params?.projectId) {
      conditions.push(eq(schema.workerAttendance.projectId, params.projectId));
    }
    
    if (params?.workerId) {
      conditions.push(eq(schema.workerAttendance.workerId, params.workerId));
    }
    
    if (params?.date) {
      conditions.push(eq(schema.workerAttendance.date, params.date));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(schema.workerAttendance.date), desc(schema.workerAttendance.createdAt));
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    const attendance = await query;
    console.log(`📅 [Storage] تم جلب ${attendance.length} سجل حضور`);
    return attendance;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب سجلات الحضور:', error);
    throw new Error(`فشل في جلب سجلات الحضور: ${error.message}`);
  }
}

export async function createWorkerAttendance(data: InsertWorkerAttendance): Promise<WorkerAttendance> {
  try {
    // حساب الأجر الفعلي
    const actualWage = (parseFloat(data.dailyWage) * parseFloat(data.workDays.toString())).toFixed(2);
    
    const attendanceData = {
      ...data,
      actualWage,
      remainingAmount: data.remainingAmount || (parseFloat(actualWage) - parseFloat(data.paidAmount || '0')).toFixed(2)
    };
    
    const [attendance] = await db.insert(schema.workerAttendance)
      .values(attendanceData)
      .returning();
    
    console.log(`✅ [Storage] تم تسجيل حضور عامل: ${data.workerId} في ${data.date}`);
    return attendance;
  } catch (error) {
    console.error('❌ [Storage] خطأ في تسجيل الحضور:', error);
    throw new Error(`فشل في تسجيل الحضور: ${error.message}`);
  }
}

// ===============================
// MATERIAL PURCHASES (مشتريات المواد)
// ===============================

export async function getMaterialPurchases(params?: { 
  projectId?: string, 
  materialId?: string, 
  supplierId?: string, 
  limit?: number 
}): Promise<any[]> {
  try {
    let query = db.select({
      id: schema.materialPurchases.id,
      projectId: schema.materialPurchases.projectId,
      projectName: schema.projects.name,
      supplierId: schema.materialPurchases.supplierId,
      supplierName: schema.materialPurchases.supplierName,
      materialId: schema.materialPurchases.materialId,
      materialName: schema.materials.name,
      materialUnit: schema.materials.unit,
      quantity: schema.materialPurchases.quantity,
      unitPrice: schema.materialPurchases.unitPrice,
      totalAmount: schema.materialPurchases.totalAmount,
      purchaseType: schema.materialPurchases.purchaseType,
      paidAmount: schema.materialPurchases.paidAmount,
      remainingAmount: schema.materialPurchases.remainingAmount,
      invoiceNumber: schema.materialPurchases.invoiceNumber,
      invoiceDate: schema.materialPurchases.invoiceDate,
      dueDate: schema.materialPurchases.dueDate,
      notes: schema.materialPurchases.notes,
      purchaseDate: schema.materialPurchases.purchaseDate,
      createdAt: schema.materialPurchases.createdAt
    })
    .from(schema.materialPurchases)
    .leftJoin(schema.projects, eq(schema.materialPurchases.projectId, schema.projects.id))
    .leftJoin(schema.materials, eq(schema.materialPurchases.materialId, schema.materials.id));
    
    const conditions = [];
    
    if (params?.projectId) {
      conditions.push(eq(schema.materialPurchases.projectId, params.projectId));
    }
    
    if (params?.materialId) {
      conditions.push(eq(schema.materialPurchases.materialId, params.materialId));
    }
    
    if (params?.supplierId) {
      conditions.push(eq(schema.materialPurchases.supplierId, params.supplierId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(schema.materialPurchases.purchaseDate), desc(schema.materialPurchases.createdAt));
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    const purchases = await query;
    console.log(`🛒 [Storage] تم جلب ${purchases.length} مشترى مواد`);
    return purchases;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب مشتريات المواد:', error);
    throw new Error(`فشل في جلب مشتريات المواد: ${error.message}`);
  }
}

export async function createMaterialPurchase(data: InsertMaterialPurchase): Promise<MaterialPurchase> {
  try {
    // حساب المبلغ الإجمالي
    const totalAmount = (parseFloat(data.quantity) * parseFloat(data.unitPrice)).toFixed(2);
    const remainingAmount = (parseFloat(totalAmount) - parseFloat(data.paidAmount || '0')).toFixed(2);
    
    const purchaseData = {
      ...data,
      totalAmount,
      remainingAmount
    };
    
    const [purchase] = await db.insert(schema.materialPurchases)
      .values(purchaseData)
      .returning();
    
    console.log(`✅ [Storage] تم تسجيل مشترى مواد: ${data.materialId} بقيمة ${totalAmount}`);
    return purchase;
  } catch (error) {
    console.error('❌ [Storage] خطأ في تسجيل مشترى المواد:', error);
    throw new Error(`فشل في تسجيل مشترى المواد: ${error.message}`);
  }
}

// ===============================
// AI SYSTEM FUNCTIONS (دوال نظام الذكاء الاصطناعي)
// ===============================

// دوال للتوافق مع AiSystemService
export async function getAiSystemLogs(params?: { limit?: number }): Promise<any[]> {
  // مؤقتاً نعيد قائمة فارغة حتى يتم إنشاء جداول AI
  console.log('⚠️ [Storage] جداول AI غير متاحة بعد - إرجاع بيانات فارغة');
  return [];
}

export async function createAiSystemLog(data: any): Promise<any> {
  // مؤقتاً نعيد نجاح وهمي
  console.log('⚠️ [Storage] محاولة حفظ سجل AI - الجداول غير متاحة بعد');
  return { id: 'temp-log', ...data, createdAt: new Date() };
}

export async function getAiSystemDecisions(): Promise<any[]> {
  console.log('⚠️ [Storage] جداول AI غير متاحة بعد - إرجاع قرارات فارغة');
  return [];
}

export async function getAiSystemRecommendations(params?: { status?: string }): Promise<any[]> {
  console.log('⚠️ [Storage] جداول AI غير متاحة بعد - إرجاع توصيات فارغة');
  return [];
}

export async function getAiSystemRecommendation(id: string): Promise<any | null> {
  console.log(`⚠️ [Storage] محاولة جلب توصية AI ${id} - الجداول غير متاحة بعد`);
  return null;
}

export async function createAiSystemRecommendation(data: any): Promise<any> {
  console.log('⚠️ [Storage] محاولة إنشاء توصية AI - الجداول غير متاحة بعد');
  return { id: 'temp-recommendation', ...data, createdAt: new Date() };
}

export async function dismissAiSystemRecommendation(id: string): Promise<void> {
  console.log(`⚠️ [Storage] محاولة رفض توصية AI ${id} - الجداول غير متاحة بعد`);
}

export async function executeAiSystemRecommendation(id: string): Promise<any> {
  console.log(`⚠️ [Storage] محاولة تنفيذ توصية AI ${id} - الجداول غير متاحة بعد`);
  return { success: false, message: 'جداول AI غير متاحة بعد' };
}

export async function createAiSystemDecision(data: any): Promise<any> {
  console.log('⚠️ [Storage] محاولة إنشاء قرار AI - الجداول غير متاحة بعد');
  return { id: 'temp-decision', ...data, createdAt: new Date() };
}

export async function createAiSystemMetric(data: any): Promise<any> {
  console.log('⚠️ [Storage] محاولة حفظ مقياس AI - الجداول غير متاحة بعد');
  return { id: 'temp-metric', ...data, createdAt: new Date() };
}

// ===============================
// STATISTICS & ANALYTICS (الإحصائيات والتحليلات)
// ===============================

export async function getProjectStatistics(projectId?: string): Promise<any> {
  try {
    const stats = {
      projects: {
        total: 0,
        active: 0,
        completed: 0,
        paused: 0
      },
      workers: {
        total: 0,
        active: 0,
        inactive: 0,
        byType: {}
      },
      materials: {
        total: 0,
        categories: {}
      },
      financial: {
        totalIncome: '0',
        totalExpenses: '0',
        totalWorkerWages: '0',
        totalMaterialCosts: '0',
        remainingBalance: '0'
      }
    };

    // إحصائيات المشاريع
    const projectStats = await db.select({
      total: count(),
      active: sum(sql`CASE WHEN status = 'active' THEN 1 ELSE 0 END`),
      completed: sum(sql`CASE WHEN status = 'completed' THEN 1 ELSE 0 END`),
      paused: sum(sql`CASE WHEN status = 'paused' THEN 1 ELSE 0 END`)
    }).from(schema.projects);

    if (projectStats[0]) {
      stats.projects = {
        total: Number(projectStats[0].total || 0),
        active: Number(projectStats[0].active || 0),
        completed: Number(projectStats[0].completed || 0),
        paused: Number(projectStats[0].paused || 0)
      };
    }

    // إحصائيات العمال
    const workerStats = await db.select({
      total: count(),
      active: sum(sql`CASE WHEN is_active = true THEN 1 ELSE 0 END`)
    }).from(schema.workers);

    if (workerStats[0]) {
      stats.workers.total = Number(workerStats[0].total || 0);
      stats.workers.active = Number(workerStats[0].active || 0);
      stats.workers.inactive = stats.workers.total - stats.workers.active;
    }

    // إحصائيات المواد
    const materialStats = await db.select({
      total: count()
    }).from(schema.materials);

    if (materialStats[0]) {
      stats.materials.total = Number(materialStats[0].total || 0);
    }

    console.log(`📊 [Storage] تم جمع الإحصائيات: ${stats.projects.total} مشروع، ${stats.workers.total} عامل، ${stats.materials.total} مادة`);
    return stats;
  } catch (error) {
    console.error('❌ [Storage] خطأ في جلب الإحصائيات:', error);
    throw new Error(`فشل في جلب الإحصائيات: ${error.message}`);
  }
}

// ===============================
// EXPORT INTERFACE
// ===============================

// تصدير كائن storage للتوافق مع الكود الموجود
export const storage = {
  // Projects
  getProjects,
  getProject,
  createProject,
  
  // Workers
  getWorkers,
  getWorker,
  createWorker,
  
  // Materials
  getMaterials,
  getMaterial,
  createMaterial,
  
  // Suppliers
  getSuppliers,
  getSupplier,
  createSupplier,
  
  // Notifications
  getNotifications,
  
  // Worker Attendance
  getWorkerAttendance,
  createWorkerAttendance,
  
  // Material Purchases
  getMaterialPurchases,
  createMaterialPurchase,
  
  // AI System Functions (مؤقتة)
  getAiSystemLogs,
  createAiSystemLog,
  getAiSystemDecisions,
  getAiSystemRecommendations,
  getAiSystemRecommendation,
  createAiSystemRecommendation,
  dismissAiSystemRecommendation,
  executeAiSystemRecommendation,
  createAiSystemDecision,
  createAiSystemMetric,
  
  // Statistics
  getProjectStatistics
};

console.log('✅ [Storage] تم تحميل نظام تخزين البيانات بنجاح');