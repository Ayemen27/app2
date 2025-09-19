import { Client } from "pg";
import fs from "fs";
import { db } from "../db";

/**
 * خدمة الهجرة المتقدمة مع نظام retry ذكي ومعالجة محسنة للأخطاء
 * 
 * الميزات المحسنة:
 * - نظام retry تدريجي مع backoff strategy
 * - تقسيم ذكي للبيانات إلى دفعات
 * - معالجة تفصيلية للأخطاء
 * - logging مفصل لكل العمليات
 * - إدارة الاتصالات مع connection pooling
 * - إحصائيات دقيقة للتقدم
 */

export interface MigrationOptions {
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  connectionTimeout: number;
  tableName: string;
  onProgress?: (progress: MigrationProgress) => void;
  onError?: (error: MigrationError) => void;
}

export interface MigrationProgress {
  tableName: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  startTime: Date;
  estimatedTimeRemaining?: number;
  speed: number; // rows per second
}

export interface MigrationError {
  type: 'CONNECTION' | 'QUERY' | 'TIMEOUT' | 'VALIDATION' | 'UNKNOWN';
  message: string;
  tableName?: string;
  batchIndex?: number;
  retryAttempt?: number;
  originalError?: any;
  timestamp: Date;
}

export interface MigrationResult {
  success: boolean;
  tableName: string;
  totalRows: number;
  migratedRows: number;
  failedRows: number;
  duration: number; // milliseconds
  errors: MigrationError[];
  speed: number; // rows per second
}

export class EnhancedMigrationService {
  private oldClient: Client | null = null;
  private newClient: Client | null = null;
  private isConnected = false;
  private migrationCancelled = false;

  private readonly DEFAULT_OPTIONS: Partial<MigrationOptions> = {
    batchSize: 100,
    maxRetries: 3,
    retryDelayMs: 1000,
    connectionTimeout: 30000,
  };

  private readonly LOG = {
    info: (s: string) => console.log(`🔵 [MIGRATION] ${s}`),
    success: (s: string) => console.log(`✅ [MIGRATION] ${s}`),
    warn: (s: string) => console.log(`⚠️ [MIGRATION] ${s}`),
    error: (s: string) => console.error(`❌ [MIGRATION] ${s}`),
    debug: (s: string) => console.log(`🔍 [DEBUG] ${s}`)
  };

  constructor(private oldDbUrl: string, private newDbUrl: string) {
    if (!oldDbUrl || !newDbUrl) {
      throw new Error('يجب توفير عناوين قواعد البيانات القديمة والجديدة');
    }
  }

  /**
   * إنشاء اتصال محسن مع retry و timeout
   */
  private async createConnection(connectionString: string, name: string): Promise<Client> {
    const config: any = { 
      connectionString,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
      max: 1 // اتصال واحد لكل عملية
    };

    // تحديد نوع الاتصال للـ SSL
    const isLocalConnection = connectionString.includes('localhost') || 
                             connectionString.includes('127.0.0.1') ||
                             connectionString.includes('@localhost/');

    if (isLocalConnection) {
      this.LOG.info(`🔓 ${name}: اتصال محلي - تعطيل SSL`);
      config.ssl = false;
    } else {
      this.LOG.info(`🔐 ${name}: اتصال خارجي - إعداد SSL`);
      
      // محاولة تحميل شهادة SSL
      let ca: string | undefined = undefined;
      const certPath = process.env.CA_PATH || './pg_cert.pem';
      
      try {
        if (fs.existsSync(certPath)) {
          ca = fs.readFileSync(certPath, { encoding: "utf8" });
          this.LOG.success(`📜 ${name}: تم تحميل شهادة SSL من ${certPath}`);
        }
      } catch (e: any) {
        this.LOG.warn(`⚠️ ${name}: تعذر تحميل شهادة SSL: ${e.message}`);
      }

      config.ssl = ca ? {
        rejectUnauthorized: false,
        ca: ca,
        minVersion: 'TLSv1.2',
        checkServerIdentity: () => undefined
      } : {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      };
    }

    const client = new Client(config);
    
    // محاولة الاتصال مع retry
    let lastError: any;
    const maxConnectionRetries = 3;
    
    for (let attempt = 1; attempt <= maxConnectionRetries; attempt++) {
      try {
        this.LOG.info(`🔌 ${name}: محاولة الاتصال ${attempt}/${maxConnectionRetries}...`);
        await client.connect();
        this.LOG.success(`✅ ${name}: تم الاتصال بنجاح`);
        return client;
      } catch (error: any) {
        lastError = error;
        this.LOG.warn(`⚠️ ${name}: فشل الاتصال (محاولة ${attempt}): ${error.message}`);
        
        if (attempt < maxConnectionRetries) {
          const delayMs = attempt * 2000; // تأخير متدرج
          this.LOG.info(`⏳ انتظار ${delayMs}ms قبل المحاولة التالية...`);
          await this.sleep(delayMs);
        }
      }
    }
    
    throw new Error(`فشل في الاتصال بـ ${name} بعد ${maxConnectionRetries} محاولات: ${lastError.message}`);
  }

  /**
   * إنشاء الاتصالات
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      this.LOG.warn('الاتصال موجود مسبقاً');
      return;
    }

    try {
      this.LOG.info('🚀 بدء إنشاء الاتصالات...');
      
      // إنشاء الاتصالات بالتوازي
      const [oldClient, newClient] = await Promise.all([
        this.createConnection(this.oldDbUrl, 'OLD_DB'),
        this.createConnection(this.newDbUrl, 'NEW_DB')
      ]);

      this.oldClient = oldClient;
      this.newClient = newClient;
      this.isConnected = true;

      this.LOG.success('🎉 تم إنشاء جميع الاتصالات بنجاح');
    } catch (error: any) {
      await this.disconnect();
      throw new Error(`فشل في إنشاء الاتصالات: ${error.message}`);
    }
  }

  /**
   * قطع الاتصالات بأمان
   */
  async disconnect(): Promise<void> {
    this.LOG.info('🔌 قطع الاتصالات...');
    
    const closePromises = [];
    
    if (this.oldClient) {
      closePromises.push(this.oldClient.end().catch(e => 
        this.LOG.warn(`تحذير في إغلاق OLD_DB: ${e.message}`)
      ));
    }
    
    if (this.newClient) {
      closePromises.push(this.newClient.end().catch(e => 
        this.LOG.warn(`تحذير في إغلاق NEW_DB: ${e.message}`)
      ));
    }

    await Promise.all(closePromises);
    
    this.oldClient = null;
    this.newClient = null;
    this.isConnected = false;
    
    this.LOG.success('✅ تم قطع جميع الاتصالات');
  }

  /**
   * الحصول على معلومات الجدول
   */
  async getTableInfo(tableName: string): Promise<{columns: string[], rowCount: number}> {
    if (!this.isConnected || !this.oldClient) {
      throw new Error('لا يوجد اتصال بقاعدة البيانات');
    }

    try {
      // الحصول على أعمدة الجدول
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name=$1 
        ORDER BY ordinal_position
      `;
      const columnsResult = await this.oldClient.query(columnsQuery, [tableName]);
      const columns = columnsResult.rows.map(r => r.column_name as string);

      if (!columns.length) {
        throw new Error(`الجدول ${tableName} غير موجود أو لا يحتوي على أعمدة`);
      }

      // عد الصفوف
      const countQuery = `SELECT COUNT(*) as count FROM public."${tableName}"`;
      const countResult = await this.oldClient.query(countQuery);
      const rowCount = parseInt(countResult.rows[0].count, 10);

      this.LOG.debug(`جدول ${tableName}: ${columns.length} عمود، ${rowCount} صف`);

      return { columns, rowCount };
    } catch (error: any) {
      throw new Error(`فشل في الحصول على معلومات الجدول ${tableName}: ${error.message}`);
    }
  }

  /**
   * هجرة جدول واحد مع التحسينات
   */
  async migrateTable(options: MigrationOptions): Promise<MigrationResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = new Date();
    const errors: MigrationError[] = [];
    
    this.migrationCancelled = false;

    this.LOG.info(`🚀 بدء هجرة الجدول: ${opts.tableName}`);
    this.LOG.info(`📊 إعدادات الهجرة: حجم الدفعة=${opts.batchSize}, محاولات=${opts.maxRetries}, تأخير=${opts.retryDelayMs}ms`);

    if (!this.isConnected) {
      throw new Error('يجب الاتصال بقاعدة البيانات أولاً');
    }

    try {
      // الحصول على معلومات الجدول
      const { columns, rowCount: totalRows } = await this.getTableInfo(opts.tableName!);
      
      if (totalRows === 0) {
        this.LOG.warn(`⚠️ الجدول ${opts.tableName} فارغ - تم تخطيه`);
        return {
          success: true,
          tableName: opts.tableName!,
          totalRows: 0,
          migratedRows: 0,
          failedRows: 0,
          duration: Date.now() - startTime.getTime(),
          errors: [],
          speed: 0
        };
      }

      const totalBatches = Math.ceil(totalRows / opts.batchSize!);
      let processedRows = 0;
      let successfulRows = 0;
      let failedRows = 0;

      this.LOG.info(`📈 إجمالي الصفوف: ${totalRows}، عدد الدفعات: ${totalBatches}`);

      // معالجة كل دفعة
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        if (this.migrationCancelled) {
          this.LOG.warn('🛑 تم إلغاء عملية الهجرة');
          break;
        }

        const offset = batchIndex * opts.batchSize!;
        const batchResult = await this.migrateBatch(
          opts.tableName!, 
          columns, 
          offset, 
          opts.batchSize!, 
          opts.maxRetries!, 
          opts.retryDelayMs!
        );

        processedRows += batchResult.processedRows;
        successfulRows += batchResult.successfulRows;
        failedRows += batchResult.failedRows;
        errors.push(...batchResult.errors);

        // تحديث التقدم
        const progress: MigrationProgress = {
          tableName: opts.tableName!,
          totalRows,
          processedRows,
          successfulRows,
          failedRows,
          currentBatch: batchIndex + 1,
          totalBatches,
          percentage: Math.round((processedRows / totalRows) * 100),
          startTime,
          speed: this.calculateSpeed(successfulRows, startTime),
          estimatedTimeRemaining: this.estimateTimeRemaining(processedRows, totalRows, startTime)
        };

        opts.onProgress?.(progress);

        // تأخير قصير بين الدفعات لتجنب إرهاق النظام
        if (batchIndex < totalBatches - 1 && !this.migrationCancelled) {
          await this.sleep(200);
        }
      }

      const duration = Date.now() - startTime.getTime();
      const speed = this.calculateSpeed(successfulRows, startTime);

      const result: MigrationResult = {
        success: failedRows === 0 && !this.migrationCancelled,
        tableName: opts.tableName!,
        totalRows,
        migratedRows: successfulRows,
        failedRows,
        duration,
        errors,
        speed
      };

      this.LOG.success(`🎉 انتهت هجرة ${opts.tableName}: ${successfulRows}/${totalRows} صف (${speed.toFixed(1)} صف/ثانية)`);
      
      return result;

    } catch (error: any) {
      const migrationError: MigrationError = {
        type: 'UNKNOWN',
        message: error.message,
        tableName: opts.tableName,
        timestamp: new Date(),
        originalError: error
      };
      
      errors.push(migrationError);
      opts.onError?.(migrationError);

      throw new Error(`فشل في هجرة الجدول ${opts.tableName}: ${error.message}`);
    }
  }

  /**
   * هجرة دفعة واحدة مع retry ذكي
   */
  private async migrateBatch(
    tableName: string, 
    columns: string[], 
    offset: number, 
    batchSize: number, 
    maxRetries: number,
    baseDelay: number
  ): Promise<{processedRows: number, successfulRows: number, failedRows: number, errors: MigrationError[]}> {
    
    const errors: MigrationError[] = [];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // استخراج البيانات
        const selectQuery = `SELECT * FROM public."${tableName}" OFFSET ${offset} LIMIT ${batchSize}`;
        const result = await this.oldClient!.query(selectQuery);
        const rows = result.rows;

        if (!rows.length) {
          return { processedRows: 0, successfulRows: 0, failedRows: 0, errors: [] };
        }

        // بناء استعلام الإدراج
        const { insertQuery, params } = this.buildInsertQuery(tableName, columns, rows);

        // إدراج البيانات مع transaction
        await this.newClient!.query('BEGIN');
        await this.newClient!.query(insertQuery, params);
        await this.newClient!.query('COMMIT');

        this.LOG.debug(`✅ نجحت الدفعة ${Math.floor(offset/batchSize) + 1}: ${rows.length} صف`);
        
        return { 
          processedRows: rows.length, 
          successfulRows: rows.length, 
          failedRows: 0, 
          errors: [] 
        };

      } catch (error: any) {
        await this.newClient!.query('ROLLBACK').catch(() => {});

        const migrationError: MigrationError = {
          type: this.categorizeError(error),
          message: error.message,
          tableName,
          batchIndex: Math.floor(offset/batchSize),
          retryAttempt: attempt,
          timestamp: new Date(),
          originalError: error
        };

        errors.push(migrationError);

        if (attempt < maxRetries) {
          const delayMs = baseDelay * Math.pow(2, attempt - 1); // exponential backoff
          this.LOG.warn(`⚠️ فشلت الدفعة ${Math.floor(offset/batchSize) + 1} (محاولة ${attempt}): ${error.message}`);
          this.LOG.info(`⏳ إعادة المحاولة بعد ${delayMs}ms...`);
          await this.sleep(delayMs);
        } else {
          this.LOG.error(`❌ فشلت الدفعة ${Math.floor(offset/batchSize) + 1} نهائياً بعد ${maxRetries} محاولات`);
        }
      }
    }

    return { processedRows: batchSize, successfulRows: 0, failedRows: batchSize, errors };
  }

  /**
   * بناء استعلام الإدراج مع المعاملات
   */
  private buildInsertQuery(tableName: string, columns: string[], rows: any[]): {insertQuery: string, params: any[]} {
    const columnsList = columns.map(c => `"${c}"`).join(', ');
    const params: any[] = [];
    const valuesSql: string[] = [];
    
    let paramIndex = 1;
    
    for (const row of rows) {
      const placeholders = columns.map(col => {
        params.push(row[col]);
        return `$${paramIndex++}`;
      });
      valuesSql.push(`(${placeholders.join(',')})`);
    }

    const insertQuery = `
      INSERT INTO public."${tableName}" (${columnsList}) 
      VALUES ${valuesSql.join(',')} 
      ON CONFLICT DO NOTHING
    `;

    return { insertQuery, params };
  }

  /**
   * تصنيف نوع الخطأ
   */
  private categorizeError(error: any): MigrationError['type'] {
    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      return 'TIMEOUT';
    }
    if (error.message?.includes('connect') || error.code?.includes('CONNECTION')) {
      return 'CONNECTION';
    }
    if (error.message?.includes('syntax') || error.code?.startsWith('42')) {
      return 'QUERY';
    }
    if (error.code?.startsWith('23')) {
      return 'VALIDATION';
    }
    return 'UNKNOWN';
  }

  /**
   * حساب السرعة (صفوف/ثانية)
   */
  private calculateSpeed(rowsProcessed: number, startTime: Date): number {
    const elapsedSeconds = (Date.now() - startTime.getTime()) / 1000;
    return elapsedSeconds > 0 ? rowsProcessed / elapsedSeconds : 0;
  }

  /**
   * تقدير الوقت المتبقي
   */
  private estimateTimeRemaining(processedRows: number, totalRows: number, startTime: Date): number {
    if (processedRows === 0) return 0;
    
    const elapsedTime = Date.now() - startTime.getTime();
    const averageTimePerRow = elapsedTime / processedRows;
    const remainingRows = totalRows - processedRows;
    
    return Math.round((remainingRows * averageTimePerRow) / 1000); // seconds
  }

  /**
   * تأخير بالميللي ثانية
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * إلغاء عملية الهجرة
   */
  cancelMigration(): void {
    this.LOG.warn('🛑 تم طلب إلغاء عملية الهجرة');
    this.migrationCancelled = true;
  }

  /**
   * التحقق من صحة اسم الجدول
   */
  private validateTableName(tableName: string): boolean {
    // التحقق الأساسي لمنع SQL injection
    const validTableName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
    if (!validTableName) {
      throw new Error(`اسم جدول غير صالح: ${tableName}`);
    }
    return true;
  }

  /**
   * هجرة شاملة لعدة جداول
   */
  async migrateMultipleTables(tables: string[], options: Partial<MigrationOptions> = {}): Promise<MigrationResult[]> {
    this.LOG.info(`🚀 بدء الهجرة الشاملة لـ ${tables.length} جدول`);
    
    const results: MigrationResult[] = [];
    
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i];
      
      try {
        this.validateTableName(tableName);
        
        this.LOG.info(`📋 هجرة الجدول ${i + 1}/${tables.length}: ${tableName}`);
        
        const result = await this.migrateTable({
          ...this.DEFAULT_OPTIONS,
          ...options,
          tableName: tableName,
          batchSize: options.batchSize || this.DEFAULT_OPTIONS.batchSize!,
          maxRetries: options.maxRetries || this.DEFAULT_OPTIONS.maxRetries!,
          retryDelayMs: options.retryDelayMs || this.DEFAULT_OPTIONS.retryDelayMs!,
          connectionTimeout: options.connectionTimeout || this.DEFAULT_OPTIONS.connectionTimeout!
        });
        
        results.push(result);
        
        // تأخير بين الجداول
        if (i < tables.length - 1) {
          await this.sleep(1000);
        }
        
      } catch (error: any) {
        this.LOG.error(`❌ فشل في هجرة الجدول ${tableName}: ${error.message}`);
        
        results.push({
          success: false,
          tableName,
          totalRows: 0,
          migratedRows: 0,
          failedRows: 0,
          duration: 0,
          errors: [{
            type: 'UNKNOWN',
            message: error.message,
            tableName,
            timestamp: new Date(),
            originalError: error
          }],
          speed: 0
        });
      }
    }
    
    const successfulTables = results.filter(r => r.success).length;
    this.LOG.success(`🎉 انتهت الهجرة الشاملة: ${successfulTables}/${tables.length} جدول نجح`);
    
    return results;
  }
}