import { SecureDataFetcher } from "./secure-data-fetcher";
import { JsonMigrationHandler } from "./json-migration-handler";
import { db } from "../db";
import { 
  migrationJobs, 
  migrationTableProgress, 
  migrationBatchLog,
  type MigrationJob as DBMigrationJob,
  type MigrationTableProgress as DBMigrationTableProgress,
  type MigrationBatchLog as DBMigrationBatchLog,
  workers,
  projects,
  suppliers,
  materialPurchases,
  equipment,
  workerAttendance,
  fundTransfers
} from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface MigrationJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  currentTable?: string;
  tablesProcessed: number;
  totalTables: number;
  totalRowsProcessed: number;
  totalRowsSaved: number;
  totalErrors: number;
  progress: number; // 0-100
  tableProgress: MigrationTableProgress[];
  error?: string;
}

export interface MigrationTableProgress {
  tableName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  totalRows: number;
  processedRows: number;
  savedRows: number;
  errors: number;
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
}

export interface BatchInfo {
  batchIndex: number;
  batchSize: number;
  batchOffset: number;
  rowsProcessed: number;
  rowsSaved: number;
  totalProcessed: number;
  totalSaved: number;
  totalErrors: number;
}

/**
 * Enhanced Migration Job Manager مع تخزين دائم وآمن
 * 
 * الميزات الجديدة:
 * - تخزين دائم في قاعدة البيانات
 * - معاملات آمنة مع ON CONFLICT protection
 * - إمكانية الاستئناف بعد إعادة التشغيل
 * - تتبع تفصيلي للدفعات
 * - نظام heartbeat للموثوقية
 */
class EnhancedMigrationJobManager {
  // تخزين مؤقت للأداء - قاعدة البيانات هي المصدر الحقيقي
  private jobsCache = new Map<string, MigrationJob>();
  private activeJobId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // بدء نظام heartbeat للمهام النشطة
    this.startHeartbeatSystem();
  }

  private generateJobId(): string {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // التحقق من صحة معرف المهمة (دعم النمطين القديم والجديد)
  private isValidJobId(jobId: string): boolean {
    return jobId.startsWith('migration_') || jobId.startsWith('batch_migration_');
  }

  /**
   * نظام Heartbeat للتأكد من أن المهام النشطة لا تزال تعمل
   */
  private startHeartbeatSystem(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.activeJobId) {
        try {
          await db.update(migrationJobs)
            .set({ 
              lastHeartbeat: new Date(),
              updatedAt: new Date()
            })
            .where(eq(migrationJobs.id, this.activeJobId));
        } catch (error: any) {
          console.error('❌ فشل في تحديث heartbeat:', error.message);
        }
      }
    }, 30000); // كل 30 ثانية
  }

  /**
   * الحصول على المهمة النشطة من قاعدة البيانات
   */
  private async getActiveJobFromDB(): Promise<DBMigrationJob | null> {
    try {
      const activeJobs = await db.select()
        .from(migrationJobs)
        .where(eq(migrationJobs.status, 'running'))
        .limit(1);
      
      return activeJobs.length > 0 ? activeJobs[0] : null;
    } catch (error: any) {
      console.error('❌ خطأ في البحث عن المهمة النشطة:', error.message);
      return null;
    }
  }

  /**
   * تحويل من نموذج قاعدة البيانات إلى نموذج الواجهة
   */
  private async convertDBJobToInterface(dbJob: DBMigrationJob): Promise<MigrationJob> {
    // جلب تقدم الجداول
    const tableProgressRows = await db.select()
      .from(migrationTableProgress)
      .where(eq(migrationTableProgress.jobId, dbJob.id));
    
    const tableProgress: MigrationTableProgress[] = tableProgressRows.map(tp => ({
      tableName: tp.tableName,
      status: tp.status as any,
      totalRows: tp.totalRows,
      processedRows: tp.processedRows,
      savedRows: tp.savedRows,
      errors: tp.errors,
      startTime: tp.startTime || undefined,
      endTime: tp.endTime || undefined,
      errorMessage: tp.errorMessage || undefined
    }));

    return {
      id: dbJob.id,
      status: dbJob.status as any,
      startTime: dbJob.startTime,
      endTime: dbJob.endTime || undefined,
      currentTable: dbJob.currentTable || undefined,
      tablesProcessed: dbJob.tablesProcessed,
      totalTables: dbJob.totalTables,
      totalRowsProcessed: dbJob.totalRowsProcessed,
      totalRowsSaved: dbJob.totalRowsSaved,
      totalErrors: dbJob.totalErrors,
      progress: dbJob.progress,
      tableProgress,
      error: dbJob.errorMessage || undefined
    };
  }

  /**
   * إنشاء مهمة هجرة جديدة مع التخزين الدائم
   */
  public async createJob(userId?: string): Promise<string> {
    // منع تشغيل مهام متعددة - فحص من قاعدة البيانات
    const activeJob = await this.getActiveJobFromDB();
    if (activeJob) {
      throw new Error('هناك مهمة هجرة نشطة بالفعل');
    }

    const jobId = this.generateJobId();
    
    try {
      // إنشاء المهمة في قاعدة البيانات مع معاملة آمنة
      await db.transaction(async (tx) => {
        await tx.insert(migrationJobs).values({
          id: jobId,
          status: 'pending',
          tablesProcessed: 0,
          totalTables: 0,
          totalRowsProcessed: 0,
          totalRowsSaved: 0,
          totalErrors: 0,
          progress: 0,
          userId: userId || null,
          batchSize: 100,
          resumable: true
        });
      });

      this.activeJobId = jobId;
      
      // إضافة للتخزين المؤقت
      const job: MigrationJob = {
        id: jobId,
        status: 'pending',
        startTime: new Date(),
        tablesProcessed: 0,
        totalTables: 0,
        totalRowsProcessed: 0,
        totalRowsSaved: 0,
        totalErrors: 0,
        progress: 0,
        tableProgress: [],
      };
      this.jobsCache.set(jobId, job);
      
      console.log(`✨ تم إنشاء مهمة هجرة جديدة في قاعدة البيانات: ${jobId}`);
      return jobId;
      
    } catch (error: any) {
      console.error(`❌ فشل في إنشاء مهمة الهجرة: ${error.message}`);
      throw new Error(`فشل في إنشاء مهمة الهجرة: ${error.message}`);
    }
  }

  /**
   * استعلام المهمة مع أولوية للتخزين المؤقت ثم قاعدة البيانات
   */
  public async getJob(jobId: string): Promise<MigrationJob | undefined> {
    console.log(`🔍 EnhancedMigrationJobManager.getJob called with: ${jobId}`);
    
    // التحقق من صحة معرف المهمة
    if (!this.isValidJobId(jobId)) {
      console.log(`❌ Invalid job ID format: ${jobId}`);
      return undefined;
    }

    console.log(`✅ Valid job ID format: ${jobId}`);

    // البحث في التخزين المؤقت أولاً
    let job = this.jobsCache.get(jobId);
    if (job) {
      console.log(`🔍 Job found in cache: ${jobId}`);
      return job;
    }

    // البحث في قاعدة البيانات
    try {
      const dbJobRows = await db.select()
        .from(migrationJobs)
        .where(eq(migrationJobs.id, jobId))
        .limit(1);
      
      if (dbJobRows.length > 0) {
        const dbJob = dbJobRows[0];
        job = await this.convertDBJobToInterface(dbJob);
        
        // حفظ في التخزين المؤقت
        this.jobsCache.set(jobId, job);
        console.log(`🔍 Job found in database and cached: ${jobId}`);
        return job;
      }
    } catch (error: any) {
      console.error(`❌ خطأ في استعلام المهمة من قاعدة البيانات: ${error.message}`);
    }

    // إذا لم توجد وكانت مهمة قديمة، إنشاء placeholder
    if (jobId.startsWith('batch_migration_')) {
      console.log(`📋 إنشاء placeholder للمهمة القديمة: ${jobId}`);
      job = this.createLegacyJobPlaceholder(jobId);
      this.jobsCache.set(jobId, job);
      console.log(`✅ Placeholder created and cached for: ${jobId}`);
      return job;
    }

    console.log(`🏁 Job not found: ${jobId}`);
    return undefined;
  }

  // إنشاء مهمة وهمية للمهام القديمة المفقودة
  private createLegacyJobPlaceholder(jobId: string): MigrationJob {
    const timestamp = this.extractTimestampFromJobId(jobId);
    const startTime = timestamp ? new Date(timestamp) : new Date();
    
    return {
      id: jobId,
      status: 'completed', // افتراض أن المهام القديمة مكتملة
      startTime,
      endTime: new Date(startTime.getTime() + 300000), // إضافة 5 دقائق
      tablesProcessed: 0,
      totalTables: 0,
      totalRowsProcessed: 0,
      totalRowsSaved: 0,
      totalErrors: 0,
      progress: 100,
      tableProgress: [],
      error: 'مهمة قديمة - التفاصيل غير متوفرة'
    };
  }

  // استخراج الطابع الزمني من معرف المهمة
  private extractTimestampFromJobId(jobId: string): number | null {
    const matches = jobId.match(/_(\d{13})/);
    return matches ? parseInt(matches[1]) : null;
  }

  /**
   * الحصول على جميع المهام من قاعدة البيانات
   */
  public async getAllJobs(): Promise<MigrationJob[]> {
    try {
      const dbJobRows = await db.select()
        .from(migrationJobs)
        .orderBy(desc(migrationJobs.createdAt))
        .limit(50); // حد أقصى 50 مهمة

      const jobs = await Promise.all(
        dbJobRows.map(dbJob => this.convertDBJobToInterface(dbJob))
      );

      return jobs;
    } catch (error: any) {
      console.error(`❌ خطأ في جلب جميع المهام: ${error.message}`);
      // fallback للتخزين المؤقت
      return Array.from(this.jobsCache.values()).sort((a, b) => 
        b.startTime.getTime() - a.startTime.getTime()
      );
    }
  }

  /**
   * الحصول على المهمة النشطة
   */
  public async getActiveJob(): Promise<MigrationJob | null> {
    if (!this.activeJobId) return null;
    
    const job = await this.getJob(this.activeJobId);
    return job || null;
  }

  /**
   * تحديث المهمة مع التخزين الدائم
   */
  public async updateJob(jobId: string, updates: Partial<MigrationJob>): Promise<void> {
    try {
      // تحديث قاعدة البيانات أولاً
      const dbUpdates: Partial<DBMigrationJob> = {
        updatedAt: new Date()
      };

      if (updates.status) dbUpdates.status = updates.status;
      if (updates.currentTable !== undefined) dbUpdates.currentTable = updates.currentTable;
      if (updates.tablesProcessed !== undefined) dbUpdates.tablesProcessed = updates.tablesProcessed;
      if (updates.totalTables !== undefined) dbUpdates.totalTables = updates.totalTables;
      if (updates.totalRowsProcessed !== undefined) dbUpdates.totalRowsProcessed = updates.totalRowsProcessed;
      if (updates.totalRowsSaved !== undefined) dbUpdates.totalRowsSaved = updates.totalRowsSaved;
      if (updates.totalErrors !== undefined) dbUpdates.totalErrors = updates.totalErrors;
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
      if (updates.error !== undefined) dbUpdates.errorMessage = updates.error;
      if (updates.endTime !== undefined) dbUpdates.endTime = updates.endTime;

      await db.update(migrationJobs)
        .set(dbUpdates)
        .where(eq(migrationJobs.id, jobId));

      // تحديث التخزين المؤقت
      const job = this.jobsCache.get(jobId);
      if (job) {
        Object.assign(job, updates);
        
        // حساب التقدم تلقائياً
        if (job.totalTables > 0) {
          job.progress = Math.round((job.tablesProcessed / job.totalTables) * 100);
        }
      }
      
      console.log(`📝 تم تحديث المهمة ${jobId} في قاعدة البيانات`);
    } catch (error: any) {
      console.error(`❌ فشل في تحديث المهمة ${jobId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث تقدم جدول معين مع معاملات آمنة
   */
  public async updateTableProgress(
    jobId: string, 
    tableName: string, 
    updates: Partial<MigrationTableProgress>
  ): Promise<void> {
    try {
      // تحديث أو إنشاء في قاعدة البيانات مع ON CONFLICT
      const progressData: Partial<DBMigrationTableProgress> = {
        jobId,
        tableName,
        updatedAt: new Date()
      };

      if (updates.status) progressData.status = updates.status;
      if (updates.totalRows !== undefined) progressData.totalRows = updates.totalRows;
      if (updates.processedRows !== undefined) progressData.processedRows = updates.processedRows;
      if (updates.savedRows !== undefined) progressData.savedRows = updates.savedRows;
      if (updates.errors !== undefined) progressData.errors = updates.errors;
      if (updates.startTime !== undefined) progressData.startTime = updates.startTime;
      if (updates.endTime !== undefined) progressData.endTime = updates.endTime;
      if (updates.errorMessage !== undefined) progressData.errorMessage = updates.errorMessage;

      // استخدام UPSERT للحماية من التضارب
      await db.insert(migrationTableProgress)
        .values(progressData as any)
        .onConflictDoUpdate({
          target: [migrationTableProgress.jobId, migrationTableProgress.tableName],
          set: progressData
        });

      // تحديث التخزين المؤقت
      const job = this.jobsCache.get(jobId);
      if (job) {
        const tableIndex = job.tableProgress.findIndex(t => t.tableName === tableName);
        if (tableIndex === -1) {
          // إضافة جدول جديد
          const newTableProgress: MigrationTableProgress = {
            tableName,
            status: 'pending',
            totalRows: 0,
            processedRows: 0,
            savedRows: 0,
            errors: 0,
            ...updates
          };
          job.tableProgress.push(newTableProgress);
        } else {
          // تحديث جدول موجود
          Object.assign(job.tableProgress[tableIndex], updates);
        }
      }

    } catch (error: any) {
      console.error(`❌ فشل في تحديث تقدم الجدول ${tableName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * إنهاء المهمة مع التخزين الدائم
   */
  public async completeJob(jobId: string, success: boolean = true, error?: string): Promise<void> {
    try {
      const endTime = new Date();
      const status = success ? 'completed' : 'failed';

      // تحديث قاعدة البيانات
      await db.update(migrationJobs)
        .set({
          status,
          endTime,
          progress: 100,
          errorMessage: error || null,
          updatedAt: endTime
        })
        .where(eq(migrationJobs.id, jobId));

      // تحديث التخزين المؤقت
      const job = this.jobsCache.get(jobId);
      if (job) {
        job.status = status as any;
        job.endTime = endTime;
        job.progress = 100;
        if (error) {
          job.error = error;
        }
      }

      // إنهاء المهمة النشطة
      if (this.activeJobId === jobId) {
        this.activeJobId = null;
      }

      const duration = job ? endTime.getTime() - job.startTime.getTime() : 0;
      console.log(`🏁 انتهت مهمة الهجرة ${jobId} - ${success ? 'نجح' : 'فشل'} (${Math.round(duration / 1000)}s)`);
      
    } catch (error: any) {
      console.error(`❌ فشل في إنهاء المهمة ${jobId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * إلغاء المهمة مع التخزين الدائم
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    try {
      // فحص إمكانية الإلغاء
      const job = await this.getJob(jobId);
      if (!job || job.status === 'completed' || job.status === 'failed') {
        return false;
      }

      const endTime = new Date();

      // تحديث قاعدة البيانات
      await db.update(migrationJobs)
        .set({
          status: 'cancelled',
          endTime,
          updatedAt: endTime
        })
        .where(eq(migrationJobs.id, jobId));

      // تحديث التخزين المؤقت
      if (job) {
        job.status = 'cancelled';
        job.endTime = endTime;
      }

      if (this.activeJobId === jobId) {
        this.activeJobId = null;
      }

      console.log(`⛔ تم إلغاء مهمة الهجرة ${jobId}`);
      return true;
      
    } catch (error: any) {
      console.error(`❌ فشل في إلغاء المهمة ${jobId}: ${error.message}`);
      return false;
    }
  }

  /**
   * تشغيل الهجرة مع التخزين الدائم والمعاملات الآمنة
   */
  public async runMigration(jobId: string, batchSize: number = 100): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error('مهمة الهجرة غير موجودة');
    }

    const externalUrl = process.env.OLD_DB_URL;
    if (!externalUrl) {
      throw new Error('رابط قاعدة البيانات الخارجية غير مُكوَّن');
    }

    try {
      // تحديث حالة المهمة لتصبح نشطة
      await this.updateJob(jobId, { status: 'running' });
      console.log(`🚀 بدء تشغيل مهمة الهجرة ${jobId} مع التخزين الدائم...`);

      const fetcher = new SecureDataFetcher(externalUrl);
      const availableTables = await fetcher.getAvailableTables();
      
      await this.updateJob(jobId, { 
        totalTables: availableTables.length,
        currentTable: availableTables[0] || undefined
      });
      
      console.log(`📊 تم العثور على ${availableTables.length} جدول للهجرة`);

      // تهيئة جداول التقدم في قاعدة البيانات
      for (const tableName of availableTables) {
        await this.updateTableProgress(jobId, tableName, {
          status: 'pending',
          totalRows: 0,
          processedRows: 0,
          savedRows: 0,
          errors: 0
        });
      }

      // معالجة كل جدول مع حفظ التقدم
      for (let i = 0; i < availableTables.length; i++) {
        const tableName = availableTables[i];
        
        // التحقق من الإلغاء
        const currentJob = await this.getJob(jobId);
        if (currentJob?.status === 'cancelled') {
          console.log('⛔ تم إلغاء المهمة من المستخدم');
          return;
        }

        await this.updateJob(jobId, { currentTable: tableName });
        await this.updateTableProgress(jobId, tableName, {
          status: 'processing',
          startTime: new Date()
        });

        console.log(`🔄 معالجة الجدول ${i + 1}/${availableTables.length}: ${tableName}...`);

        try {
          // فحص وجود الجدول
          const tableInfo = await fetcher.getTableInfo(tableName);
          
          if (!tableInfo.exists) {
            console.warn(`⚠️ تخطي الجدول ${tableName} - غير موجود في Supabase`);
            await this.updateTableProgress(jobId, tableName, {
              status: 'skipped',
              endTime: new Date(),
              errorMessage: 'الجدول غير موجود في Supabase'
            });
            continue;
          }

          // تحديث العدد الكلي
          await this.updateTableProgress(jobId, tableName, {
            totalRows: tableInfo.rowCount
          });

          // معالجة خاصة لجدول material_purchases بسبب احتواءه على JSON
          if (tableName === 'material_purchases') {
            console.log('🔍 [Migration] تطبيق معالجة خاصة لجدول material_purchases...');
            const jsonHandler = new JsonMigrationHandler(externalUrl);
            
            try {
              const result = await jsonHandler.migrateMaterialPurchasesSafely(batchSize);
              
              await this.updateTableProgress(jobId, tableName, {
                status: 'completed',
                processedRows: result.totalProcessed,
                savedRows: result.successfullyMigrated,
                errors: result.errors,
                endTime: new Date(),
                errorMessage: result.errors > 0 ? `${result.errors} أخطاء - التفاصيل: ${result.errorDetails.slice(0, 3).join('; ')}` : undefined
              });

              console.log(`✅ [Migration] مهمة ${tableName} مكتملة:`, {
                processed: result.totalProcessed,
                saved: result.successfullyMigrated,
                duplicatesSkipped: result.duplicatesSkipped,
                jsonConversions: result.jsonConversions,
                errors: result.errors
              });

            } catch (jsonError: any) {
              console.error(`❌ [Migration] فشل في معالجة JSON لجدول ${tableName}:`, jsonError);
              await this.updateTableProgress(jobId, tableName, {
                status: 'failed',
                endTime: new Date(),
                errorMessage: `فشل معالجة JSON: ${jsonError.message}`
              });
            } finally {
              await jsonHandler.disconnect();
            }
          } else {
            // معالجة عادية للجداول الأخرى مع حماية من التكرار
            const result = await this.migrateSafeTable(fetcher, tableName, batchSize, jobId);
            
            await this.updateTableProgress(jobId, tableName, {
              status: result.success ? 'completed' : 'failed',
              processedRows: result.totalProcessed,
              savedRows: result.totalSaved,
              errors: result.errors,
              endTime: new Date(),
              errorMessage: result.errors > 0 ? `${result.errors} أخطاء` : undefined
            });
          }
          
          // تسجيل تفاصيل العملية
          try {
            await db.insert(migrationBatchLog).values({
              jobId,
              tableName,
              batchIndex: 1,
              batchSize: batchSize,
              batchOffset: 0,
              status: result.success ? 'completed' : 'failed',
              rowsProcessed: result.synced,
              rowsSaved: result.savedLocally,
              retryCount: 0,
              transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              endTime: new Date()
            });
          } catch (logError: any) {
            console.warn(`تحذير في تسجيل العملية: ${logError.message}`);
          }

          // تحديث النتيجة النهائية للجدول
          await this.updateTableProgress(jobId, tableName, {
            status: result.success ? 'completed' : 'failed',
            processedRows: result.synced,
            savedRows: result.savedLocally,
            errors: result.errors,
            endTime: new Date(),
            errorMessage: result.success ? undefined : 'فشل في المزامنة'
          });

          // تحديث إجماليات المهمة
          await this.updateJob(jobId, {
            tablesProcessed: i + 1,
            totalRowsProcessed: (currentJob?.totalRowsProcessed || 0) + result.synced,
            totalRowsSaved: (currentJob?.totalRowsSaved || 0) + result.savedLocally,
            totalErrors: (currentJob?.totalErrors || 0) + result.errors
          });

        } catch (tableError: any) {
          console.error(`❌ خطأ في معالجة الجدول ${tableName}:`, tableError.message);
          
          await this.updateTableProgress(jobId, tableName, {
            status: 'failed',
            endTime: new Date(),
            errorMessage: tableError.message,
            errors: 1
          });

          await this.updateJob(jobId, {
            totalErrors: (currentJob?.totalErrors || 0) + 1
          });
        }
      }

      // إنهاء المهمة بنجاح
      await this.completeJob(jobId, true);
      console.log(`🎉 انتهت مهمة الهجرة ${jobId} بنجاح`);

    } catch (error: any) {
      console.error(`❌ فشل في تشغيل مهمة الهجرة ${jobId}:`, error.message);
      await this.completeJob(jobId, false, error.message);
      throw error;
    }
  }

  /**
   * 🔄 هجرة آمنة للجداول العادية مع حماية من التكرار
   */
  private async migrateSafeTable(
    fetcher: SecureDataFetcher,
    tableName: string,
    batchSize: number,
    jobId: string
  ): Promise<{
    success: boolean;
    totalProcessed: number;
    totalSaved: number;
    errors: number;
    duplicatesSkipped: number;
  }> {
    console.log(`🔄 [Migration] بدء الهجرة الآمنة للجدول: ${tableName}`);
    
    const result = {
      success: true,
      totalProcessed: 0,
      totalSaved: 0,
      errors: 0,
      duplicatesSkipped: 0
    };

    try {
      const totalRows = await fetcher.getRowCount(tableName);
      const totalBatches = Math.ceil(totalRows / batchSize);

      // معالجة الدفعات
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const offset = batchIndex * batchSize;
        
        try {
          const batchData = await fetcher.fetchData(tableName, {
            limit: batchSize,
            offset: offset,
            orderBy: 'id'
          });

          // معالجة كل سجل في الدفعة
          for (const row of batchData) {
            result.totalProcessed++;

            try {
              // فحص التكرار حسب الجدول
              const isDuplicate = await this.checkDuplicateRecord(tableName, row);
              
              if (isDuplicate) {
                result.duplicatesSkipped++;
                continue;
              }

              // إدراج السجل
              await this.insertSafeRecord(tableName, row);
              result.totalSaved++;

            } catch (rowError: any) {
              result.errors++;
              console.error(`❌ [Migration] خطأ في السجل ${row.id}:`, rowError.message);
            }
          }

          // تحديث التقدم كل دفعة
          if (batchIndex % 5 === 0) {
            await this.updateTableProgress(jobId, tableName, {
              processedRows: result.totalProcessed,
              savedRows: result.totalSaved,
              errors: result.errors
            });
          }

        } catch (batchError: any) {
          result.errors++;
          console.error(`❌ [Migration] خطأ في الدفعة ${batchIndex + 1}:`, batchError.message);
          result.success = false;
        }
      }

    } catch (error: any) {
      console.error(`❌ [Migration] فشل في الهجرة الآمنة لـ ${tableName}:`, error.message);
      result.success = false;
      result.errors++;
    }

    console.log(`✅ [Migration] انتهت هجرة ${tableName}:`, result);
    return result;
  }

  /**
   * 🔍 فحص تكرار السجل
   */
  private async checkDuplicateRecord(tableName: string, row: any): Promise<boolean> {
    try {
      let existingRecord;

      // فحص حسب نوع الجدول
      switch (tableName) {
        case 'workers':
          existingRecord = await db.select()
            .from(workers)
            .where(eq(workers.id, row.id))
            .limit(1);
          break;

        case 'projects':
          existingRecord = await db.select()
            .from(projects)
            .where(eq(projects.id, row.id))
            .limit(1);
          break;

        case 'suppliers':
          existingRecord = await db.select()
            .from(suppliers)
            .where(eq(suppliers.id, row.id))
            .limit(1);
          break;

        case 'equipment':
          existingRecord = await db.select()
            .from(equipment)
            .where(eq(equipment.id, row.id))
            .limit(1);
          break;

        case 'worker_attendance':
          existingRecord = await db.select()
            .from(workerAttendance)
            .where(eq(workerAttendance.id, row.id))
            .limit(1);
          break;

        case 'fund_transfers':
          existingRecord = await db.select()
            .from(fundTransfers)
            .where(eq(fundTransfers.id, row.id))
            .limit(1);
          break;

        default:
          console.warn(`⚠️ [Migration] جدول غير معروف للفحص: ${tableName}`);
          return false;
      }

      return existingRecord && existingRecord.length > 0;

    } catch (error: any) {
      console.error(`❌ [Migration] خطأ في فحص التكرار لـ ${tableName}:`, error.message);
      return false; // في حالة الشك، نسمح بالإدراج
    }
  }

  /**
   * 💾 إدراج آمن للسجل
   */
  private async insertSafeRecord(tableName: string, row: any): Promise<void> {
    try {
      // تنظيف البيانات حسب الجدول
      const cleanedRow = this.cleanRowData(tableName, row);

      // الإدراج حسب نوع الجدول
      switch (tableName) {
        case 'workers':
          await db.insert(workers).values(cleanedRow);
          break;

        case 'projects':
          await db.insert(projects).values(cleanedRow);
          break;

        case 'suppliers':
          await db.insert(suppliers).values(cleanedRow);
          break;

        case 'equipment':
          await db.insert(equipment).values(cleanedRow);
          break;

        case 'worker_attendance':
          await db.insert(workerAttendance).values(cleanedRow);
          break;

        case 'fund_transfers':
          await db.insert(fundTransfers).values(cleanedRow);
          break;

        default:
          throw new Error(`جدول غير مدعوم للإدراج: ${tableName}`);
      }

    } catch (error: any) {
      console.error(`❌ [Migration] فشل إدراج السجل في ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * 🧹 تنظيف بيانات السجل حسب الجدول
   */
  private cleanRowData(tableName: string, row: any): any {
    const cleaned = { ...row };

    // إزالة الحقول غير المطلوبة
    delete cleaned._count;
    delete cleaned.__typename;

    // تحويل التواريخ والقيم النصية
    if (cleaned.created_at) {
      cleaned.createdAt = cleaned.created_at;
      delete cleaned.created_at;
    }
    
    if (cleaned.updated_at) {
      cleaned.updatedAt = cleaned.updated_at;
      delete cleaned.updated_at;
    }

    // تحويل الأرقام العشرية إلى نصوص (للتوافق مع نوع decimal)
    const decimalFields = ['daily_wage', 'amount', 'quantity', 'unit_price', 'total_amount', 'paid_amount', 'remaining_amount'];
    decimalFields.forEach(field => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = String(cleaned[field]);
      }
    });

    // معالجة خاصة حسب الجدول
    switch (tableName) {
      case 'worker_attendance':
        if (cleaned.work_days !== undefined) {
          cleaned.workDays = String(cleaned.work_days);
          delete cleaned.work_days;
        }
        break;

      case 'fund_transfers':
        if (cleaned.transfer_date) {
          cleaned.transferDate = cleaned.transfer_date;
          delete cleaned.transfer_date;
        }
        break;
    }

    return cleaned;
  }

  /**
   * تنظيف الموارد
   */
  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.jobsCache.clear();
    this.activeJobId = null;
  }
}

// إنشاء instance مشترك
export const enhancedMigrationJobManager = new EnhancedMigrationJobManager();
export { EnhancedMigrationJobManager };