import { SecureDataFetcher } from "./secure-data-fetcher";

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

class MigrationJobManager {
  private jobs = new Map<string, MigrationJob>();
  private activeJobId: string | null = null;

  private generateJobId(): string {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public createJob(): string {
    // منع تشغيل مهام متعددة
    if (this.activeJobId) {
      throw new Error('هناك مهمة هجرة نشطة بالفعل');
    }

    const jobId = this.generateJobId();
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

    this.jobs.set(jobId, job);
    this.activeJobId = jobId;
    
    console.log(`✨ تم إنشاء مهمة هجرة جديدة: ${jobId}`);
    return jobId;
  }

  public getJob(jobId: string): MigrationJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): MigrationJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  public getActiveJob(): MigrationJob | null {
    if (!this.activeJobId) return null;
    return this.jobs.get(this.activeJobId) || null;
  }

  public updateJob(jobId: string, updates: Partial<MigrationJob>): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    Object.assign(job, updates);
    
    // حساب التقدم تلقائياً
    if (job.totalTables > 0) {
      job.progress = Math.round((job.tablesProcessed / job.totalTables) * 100);
    }
  }

  public updateTableProgress(jobId: string, tableName: string, updates: Partial<MigrationTableProgress>): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

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

  public completeJob(jobId: string, success: boolean = true, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = success ? 'completed' : 'failed';
    job.endTime = new Date();
    job.progress = 100;
    
    if (error) {
      job.error = error;
    }

    // إنهاء المهمة النشطة
    if (this.activeJobId === jobId) {
      this.activeJobId = null;
    }

    const duration = job.endTime.getTime() - job.startTime.getTime();
    console.log(`🏁 انتهت مهمة الهجرة ${jobId} - ${success ? 'نجح' : 'فشل'} (${Math.round(duration / 1000)}s)`);
  }

  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'cancelled';
    job.endTime = new Date();
    
    if (this.activeJobId === jobId) {
      this.activeJobId = null;
    }

    console.log(`⛔ تم إلغاء مهمة الهجرة ${jobId}`);
    return true;
  }

  public async runMigration(jobId: string, batchSize: number = 100): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('مهمة الهجرة غير موجودة');
    }

    const externalUrl = process.env.OLD_DB_URL;
    if (!externalUrl) {
      throw new Error('رابط قاعدة البيانات الخارجية غير مُكوَّن');
    }

    try {
      job.status = 'running';
      console.log(`🚀 بدء تشغيل مهمة الهجرة ${jobId}...`);

      const fetcher = new SecureDataFetcher(externalUrl);
      const availableTables = await fetcher.getAvailableTables();
      
      job.totalTables = availableTables.length;
      console.log(`📊 تم العثور على ${availableTables.length} جدول للهجرة`);

      // تهيئة جداول التقدم
      for (const tableName of availableTables) {
        this.updateTableProgress(jobId, tableName, {
          status: 'pending',
          totalRows: 0,
          processedRows: 0,
          savedRows: 0,
          errors: 0
        });
      }

      // معالجة كل جدول
      for (let i = 0; i < availableTables.length; i++) {
        const tableName = availableTables[i];
        
        // التحقق من الإلغاء
        const currentJob = this.jobs.get(jobId);
        if (currentJob?.status === 'cancelled') {
          console.log('⛔ تم إلغاء المهمة من المستخدم');
          return;
        }

        job.currentTable = tableName;
        this.updateTableProgress(jobId, tableName, {
          status: 'processing',
          startTime: new Date()
        });

        console.log(`🔄 معالجة الجدول ${i + 1}/${availableTables.length}: ${tableName}...`);

        try {
          // فحص وجود الجدول
          const tableInfo = await fetcher.getTableInfo(tableName);
          
          if (!tableInfo.exists) {
            console.warn(`⚠️ تخطي الجدول ${tableName} - غير موجود في Supabase`);
            this.updateTableProgress(jobId, tableName, {
              status: 'skipped',
              endTime: new Date(),
              errorMessage: 'الجدول غير موجود في Supabase'
            });
            continue;
          }

          // تحديث العدد الكلي
          this.updateTableProgress(jobId, tableName, {
            totalRows: tableInfo.rowCount
          });

          // تشغيل المزامنة
          const result = await fetcher.syncTableData(tableName, batchSize);
          
          // تحديث النتائج
          this.updateTableProgress(jobId, tableName, {
            status: result.success ? 'completed' : 'failed',
            processedRows: result.synced,
            savedRows: result.savedLocally,
            errors: result.errors,
            endTime: new Date(),
            errorMessage: result.success ? undefined : 'فشل في المزامنة'
          });

          // تحديث الإحصائيات العامة
          job.totalRowsProcessed += result.synced;
          job.totalRowsSaved += result.savedLocally;
          job.totalErrors += result.errors;

        } catch (error) {
          console.error(`❌ خطأ في معالجة الجدول ${tableName}:`, error);
          
          this.updateTableProgress(jobId, tableName, {
            status: 'failed',
            errors: 1,
            endTime: new Date(),
            errorMessage: error instanceof Error ? error.message : 'خطأ غير معروف'
          });
          
          job.totalErrors++;
        }

        job.tablesProcessed = i + 1;
        job.currentTable = undefined;
        
        // فترة استراحة قصيرة
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // إنهاء المهمة بنجاح
      this.completeJob(jobId, true);
      console.log(`✅ انتهت مهمة الهجرة بنجاح: ${job.totalRowsProcessed} صف معالج، ${job.totalRowsSaved} صف محفوظ`);

    } catch (error) {
      console.error(`❌ خطأ عام في مهمة الهجرة ${jobId}:`, error);
      this.completeJob(jobId, false, error instanceof Error ? error.message : 'خطأ غير معروف');
      throw error;
    }
  }
}

export const migrationJobManager = new MigrationJobManager();