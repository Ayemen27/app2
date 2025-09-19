import { storage } from "./storage";
import * as fs from 'fs/promises';
import * as path from 'path';

interface BackupData {
  timestamp: string;
  version: string;
  data: {
    projects: any[];
    workers: any[];
    materials: any[];
    suppliers: any[];
    fundTransfers: any[];
    materialPurchases: any[];
    workerAttendance: any[];
    transportationExpenses: any[];
    dailyExpenseSummaries: any[];
    workerBalances: any[];
    workerTransfers: any[];
    workerMiscExpenses: any[];
    supplierPayments: any[];
    projectFundTransfers: any[];
    workerTypes: any[];
    autocompleteData: any[];
    printSettings: any[];
  };
}

export class BackupSystem {
  private backupDir = path.join(process.cwd(), 'backups');

  constructor() {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('خطأ في إنشاء مجلد النسخ الاحتياطي:', error);
    }
  }

  /**
   * إنشاء نسخة احتياطية كاملة من جميع البيانات
   */
  async createFullBackup(): Promise<{ success: boolean; filePath?: string; message: string }> {
    try {
      console.log('🔄 بدء إنشاء النسخة الاحتياطية...');
      
      // جمع جميع البيانات
      // نحصل على جميع المشاريع أولاً ثم نجمع البيانات لكل مشروع
      const projects = await storage.getProjects();
      const workers = await storage.getWorkers();
      const materials = await storage.getMaterials();
      const suppliers = await storage.getSuppliers();
      const workerTypes = await storage.getWorkerTypes();
      
      // جمع البيانات من جميع المشاريع
      const fundTransfers: any[] = [];
      const materialPurchases: any[] = [];
      const workerAttendance: any[] = [];
      const transportationExpenses: any[] = [];
      const dailyExpenseSummaries: any[] = [];
      const workerBalances: any[] = [];
      const workerTransfers: any[] = [];
      const workerMiscExpenses: any[] = [];
      const supplierPayments: any[] = [];
      const projectFundTransfers: any[] = [];
      
      // جمع البيانات من جميع المشاريع
      for (const project of projects) {
        const projectFunds = await storage.getFundTransfers(project.id);
        const projectMaterials = await storage.getMaterialPurchases(project.id);
        const projectAttendance = await storage.getWorkerAttendance(project.id);
        const projectTransport = await storage.getTransportationExpenses(project.id);
        const projectSummary = await storage.getDailyExpenseSummary(project.id, '');
        
        fundTransfers.push(...projectFunds);
        materialPurchases.push(...projectMaterials);
        workerAttendance.push(...projectAttendance);
        transportationExpenses.push(...projectTransport);
        if (projectSummary) dailyExpenseSummaries.push(projectSummary);
      }
      
      // جمع بيانات العمال
      for (const worker of workers) {
        const balance = await storage.getWorkerBalance(worker.id, "");
        const transfers = await storage.getWorkerTransfers(worker.id, "");
        const miscExpenses = await storage.getWorkerMiscExpenses(worker.id, "");
        
        if (balance) workerBalances.push(balance);
        workerTransfers.push(...transfers);
        workerMiscExpenses.push(...miscExpenses);
      }
      
      // جمع بيانات الموردين
      for (const supplier of suppliers) {
        const payments = await storage.getSupplierPayments(supplier.id);
        supplierPayments.push(...payments);
      }
      
      // بيانات أخرى
      const allProjectTransfers = await storage.getProjectFundTransfers();
      projectFundTransfers.push(...allProjectTransfers);
      
      // بيانات الإعدادات
      // بيانات الإعدادات (يمكن أن تكون فارغة)
      const autocompleteData: any[] = [];
      const printSettings: any[] = [];

      // إعداد بيانات النسخة الاحتياطية
      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        data: {
          projects,
          workers,
          materials,
          suppliers,
          fundTransfers,
          materialPurchases,
          workerAttendance,
          transportationExpenses,
          dailyExpenseSummaries,
          workerBalances,
          workerTransfers,
          workerMiscExpenses,
          supplierPayments,
          projectFundTransfers,
          workerTypes,
          autocompleteData,
          printSettings
        }
      };

      // إنشاء اسم الملف بالتاريخ والوقت
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup-${timestamp}.json`;
      const filePath = path.join(this.backupDir, fileName);

      // حفظ البيانات
      await fs.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf8');

      console.log(`✅ تم إنشاء النسخة الاحتياطية بنجاح: ${fileName}`);
      
      return {
        success: true,
        filePath,
        message: `تم إنشاء النسخة الاحتياطية بنجاح: ${fileName}`
      };

    } catch (error) {
      console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
      return {
        success: false,
        message: `خطأ في إنشاء النسخة الاحتياطية: ${error}`
      };
    }
  }

  /**
   * الحصول على قائمة بجميع النسخ الاحتياطية المتاحة
   */
  async getBackupsList(): Promise<Array<{ fileName: string; date: string; size: number }>> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
      
      const backupsInfo = await Promise.all(
        backupFiles.map(async (fileName) => {
          const filePath = path.join(this.backupDir, fileName);
          const stats = await fs.stat(filePath);
          return {
            fileName,
            date: stats.mtime.toISOString(),
            size: stats.size
          };
        })
      );

      // ترتيب حسب التاريخ (الأحدث اولاً)
      return backupsInfo.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('خطأ في قراءة النسخ الاحتياطية:', error);
      return [];
    }
  }

  /**
   * تنظيف النسخ الاحتياطية القديمة (الاحتفاظ بآخر 10 نسخ فقط)
   */
  async cleanupOldBackups(keepCount: number = 10): Promise<void> {
    try {
      const backups = await this.getBackupsList();
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        
        for (const backup of toDelete) {
          const filePath = path.join(this.backupDir, backup.fileName);
          await fs.unlink(filePath);
          console.log(`🗑️ تم حذف النسخة الاحتياطية القديمة: ${backup.fileName}`);
        }
      }
    } catch (error) {
      console.error('خطأ في تنظيف النسخ الاحتياطية:', error);
    }
  }

  /**
   * جدولة النسخ الاحتياطي التلقائي
   */
  scheduleAutoBackup(intervalHours: number = 24): void {
    setInterval(async () => {
      console.log('⏰ بدء النسخ الاحتياطي التلقائي...');
      await this.createFullBackup();
      await this.cleanupOldBackups();
    }, intervalHours * 60 * 60 * 1000);
    
    console.log(`📅 تم تفعيل النسخ الاحتياطي التلقائي كل ${intervalHours} ساعة`);
  }
}

export const backupSystem = new BackupSystem();