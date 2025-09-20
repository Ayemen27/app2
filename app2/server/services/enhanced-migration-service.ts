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

export interface SchemaValidationResult {
  tableName: string;
  isValid: boolean;
  sourceColumns: string[];
  targetColumns: string[];
  missingInTarget: string[];
  extraInTarget: string[];
  criticalIssues: string[];
  warnings: string[];
  canMigrate: boolean;
}

export interface DryRunResult {
  overallSuccess: boolean;
  tablesChecked: number;
  validTables: number;
  tablesWithWarnings: number;
  tablesWithErrors: number;
  tableResults: SchemaValidationResult[];
  summary: string;
  recommendations: string[];
}

export class EnhancedMigrationService {
  private oldClient: Client | null = null;
  private newClient: Client | null = null;
  private isConnected = false;
  private migrationCancelled = false;
  private defaultProjectId: string | null = null;

  // الجداول المدعومة في schema.ts
  private readonly SUPPORTED_TABLES = [
    'users', 'auth_user_sessions', 'projects', 'workers', 'fund_transfers',
    'worker_attendance', 'suppliers', 'materials', 'material_purchases', 
    'supplier_payments', 'daily_expenses', 'worker_misc_expenses',
    'worker_transfers', 'worker_balances', 'daily_expense_summaries',
    'notifications', 'notification_settings', 'notification_read_states',
    'notification_queue', 'notification_metrics', 'notification_templates',
    'autocomplete_data', 'auth_roles', 'auth_user_roles', 'auth_role_permissions',
    'migrationJobs', 'migrationTableProgress', 'migrationBatchLog'
  ];

  // الجداول المستثناة من الهجرة (موجودة في DB لكن غير مدعومة في الكود)
  private readonly EXCLUDED_TABLES = [
    'equipment', 'equipment_movements', // الجداول غير المُعرفة في schema.ts
    'error_logs', 'system_events', // جداول النظام
    'print_settings', 'report_templates' // جداول التقارير القديمة
  ];

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
   * الحصول على المشروع الافتراضي أو إنشاؤه
   */
  private async ensureDefaultProject(): Promise<string> {
    if (this.defaultProjectId) {
      return this.defaultProjectId;
    }

    try {
      // البحث عن المشروع الافتراضي
      const findQuery = `SELECT id FROM public.projects WHERE name = 'غير مخصص' LIMIT 1`;
      const result = await this.newClient!.query(findQuery);
      
      if (result.rows.length > 0) {
        this.defaultProjectId = result.rows[0].id;
        this.LOG.success(`✅ تم العثور على المشروع الافتراضي: ${this.defaultProjectId}`);
      } else {
        // إنشاء المشروع الافتراضي
        const insertQuery = `INSERT INTO public.projects (name, status) VALUES ('غير مخصص', 'active') RETURNING id`;
        const insertResult = await this.newClient!.query(insertQuery);
        this.defaultProjectId = insertResult.rows[0].id;
        this.LOG.success(`🆕 تم إنشاء المشروع الافتراضي: ${this.defaultProjectId}`);
      }
      
      return this.defaultProjectId!;
    } catch (error: any) {
      this.LOG.error(`❌ فشل في الحصول على المشروع الافتراضي: ${error.message}`);
      throw error;
    }
  }

  /**
   * التحقق من دعم الجدول في schema.ts
   */
  private checkTableSupport(tableName: string): 'supported' | 'excluded' | 'unknown' {
    if (this.SUPPORTED_TABLES.includes(tableName)) {
      return 'supported';
    }
    if (this.EXCLUDED_TABLES.includes(tableName)) {
      return 'excluded';
    }
    return 'unknown';
  }

  /**
   * معالجة خاصة لجدول fund_transfers - إصلاح null project_id
   */
  private async processFundTransfersRow(row: any): Promise<any> {
    const processedRow = { ...row };
    
    // إذا كان project_id فارغ أو null، استخدم المشروع الافتراضي
    if (!processedRow.project_id || processedRow.project_id === null) {
      const defaultProjectId = await this.ensureDefaultProject();
      processedRow.project_id = defaultProjectId;
      this.LOG.debug(`🔧 تم إصلاح project_id null إلى المشروع الافتراضي: ${defaultProjectId}`);
    }
    
    return processedRow;
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

      // التحقق من وجود شهادة CA للاتصال الآمن
      if (ca) {
        this.LOG.success(`🔐 ${name}: تطبيق SSL آمن مع شهادة CA`);
        config.ssl = {
          rejectUnauthorized: true,
          ca: ca,
          minVersion: 'TLSv1.2',
          secureProtocol: 'TLSv1_2_method'
        };
      } else {
        // فشل مبكر - لا نسمح بالاتصال بدون شهادة CA صحيحة
        const errorMsg = `⛔ ${name}: رفض الاتصال - لا توجد شهادة CA صحيحة. الاتصال غير آمن!`;
        this.LOG.error(errorMsg);
        throw new Error(`فشل في التحقق من الأمان: ${errorMsg}`);
      }
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

    // التحقق من دعم الجدول
    const tableSupport = this.checkTableSupport(opts.tableName!);
    
    if (tableSupport === 'excluded') {
      this.LOG.warn(`⚠️ تم تخطي الجدول ${opts.tableName} - مستثنى من الهجرة (غير مدعوم في schema.ts)`);
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
    
    if (tableSupport === 'unknown') {
      this.LOG.error(`❌ الجدول ${opts.tableName} غير معروف - لا يوجد في قائمة الجداول المدعومة أو المستثناة`);
      throw new Error(`الجدول ${opts.tableName} غير معروف في النظام`);
    }

    this.LOG.success(`✅ الجدول ${opts.tableName} مدعوم - بدء الهجرة`);

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
        const { insertQuery, params } = await this.buildInsertQuery(tableName, columns, rows);

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
   * بناء استعلام الإدراج مع المعاملات ومعالجة خاصة للجداول
   */
  private async buildInsertQuery(tableName: string, columns: string[], rows: any[]): Promise<{insertQuery: string, params: any[]}> {
    const columnsList = columns.map(c => `"${c}"`).join(', ');
    const params: any[] = [];
    const valuesSql: string[] = [];
    
    let paramIndex = 1;
    
    // معالجة كل صف حسب نوع الجدول
    const processedRows = await Promise.all(
      rows.map(async (row) => {
        if (tableName === 'fund_transfers') {
          return await this.processFundTransfersRow(row);
        }
        return row; // الجداول الأخرى بدون معالجة
      })
    );
    
    for (const row of processedRows) {
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
   * التحقق من schema لجدول واحد
   */
  async validateTableSchema(tableName: string): Promise<SchemaValidationResult> {
    if (!this.isConnected) {
      throw new Error('يجب الاتصال بقاعدة البيانات أولاً');
    }

    const result: SchemaValidationResult = {
      tableName,
      isValid: false,
      sourceColumns: [],
      targetColumns: [],
      missingInTarget: [],
      extraInTarget: [],
      criticalIssues: [],
      warnings: [],
      canMigrate: false
    };

    try {
      // التحقق من دعم الجدول أولاً
      const tableSupport = this.checkTableSupport(tableName);
      
      if (tableSupport === 'excluded') {
        result.warnings.push(`الجدول ${tableName} مستثنى من الهجرة`);
        result.canMigrate = false;
        return result;
      }

      if (tableSupport === 'unknown') {
        result.criticalIssues.push(`الجدول ${tableName} غير معروف في النظام`);
        result.canMigrate = false;
        return result;
      }

      // الحصول على أعمدة الجدول من المصدر
      const sourceColumnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name=$1 
        ORDER BY ordinal_position
      `;
      const sourceResult = await this.oldClient!.query(sourceColumnsQuery, [tableName]);
      result.sourceColumns = sourceResult.rows.map(r => `${r.column_name}:${r.data_type}${r.is_nullable === 'NO' ? ':NOT_NULL' : ''}`);

      // الحصول على أعمدة الجدول من الهدف
      const targetResult = await this.newClient!.query(sourceColumnsQuery, [tableName]);
      result.targetColumns = targetResult.rows.map(r => `${r.column_name}:${r.data_type}${r.is_nullable === 'NO' ? ':NOT_NULL' : ''}`);

      // المقارنة بين الأعمدة
      const sourceColNames = sourceResult.rows.map(r => r.column_name);
      const targetColNames = targetResult.rows.map(r => r.column_name);

      result.missingInTarget = sourceColNames.filter(col => !targetColNames.includes(col));
      result.extraInTarget = targetColNames.filter(col => !sourceColNames.includes(col));

      // فحص المشاكل الحرجة
      if (result.missingInTarget.length > 0) {
        result.criticalIssues.push(`أعمدة مفقودة في الهدف: ${result.missingInTarget.join(', ')}`);
      }

      // فحص التحذيرات
      if (result.extraInTarget.length > 0) {
        result.warnings.push(`أعمدة إضافية في الهدف: ${result.extraInTarget.join(', ')}`);
      }

      // تحديد إمكانية الهجرة
      result.canMigrate = result.criticalIssues.length === 0;
      result.isValid = result.canMigrate && result.warnings.length === 0;

      this.LOG.debug(`تم فحص schema للجدول ${tableName}: ${result.canMigrate ? 'قابل للهجرة' : 'غير قابل للهجرة'}`);

    } catch (error: any) {
      result.criticalIssues.push(`خطأ في فحص الجدول: ${error.message}`);
      result.canMigrate = false;
    }

    return result;
  }

  /**
   * تشغيل dry-run للتحقق من جميع الجداول قبل الهجرة
   */
  async performDryRun(tableNames: string[]): Promise<DryRunResult> {
    this.LOG.info(`🔍 بدء Dry-Run للتحقق من ${tableNames.length} جدول...`);

    const tableResults: SchemaValidationResult[] = [];
    let validTables = 0;
    let tablesWithWarnings = 0;
    let tablesWithErrors = 0;

    // فحص كل جدول على حدة
    for (const tableName of tableNames) {
      try {
        const result = await this.validateTableSchema(tableName);
        tableResults.push(result);

        if (result.canMigrate) {
          if (result.warnings.length === 0) {
            validTables++;
          } else {
            tablesWithWarnings++;
          }
        } else {
          tablesWithErrors++;
        }

      } catch (error: any) {
        tableResults.push({
          tableName,
          isValid: false,
          sourceColumns: [],
          targetColumns: [],
          missingInTarget: [],
          extraInTarget: [],
          criticalIssues: [`خطأ في الفحص: ${error.message}`],
          warnings: [],
          canMigrate: false
        });
        tablesWithErrors++;
      }
    }

    // إنشاء التقرير النهائي
    const dryRunResult: DryRunResult = {
      overallSuccess: tablesWithErrors === 0,
      tablesChecked: tableNames.length,
      validTables,
      tablesWithWarnings,
      tablesWithErrors,
      tableResults,
      summary: '',
      recommendations: []
    };

    // إنشاء الملخص
    if (dryRunResult.overallSuccess) {
      if (tablesWithWarnings === 0) {
        dryRunResult.summary = `✅ جميع الجداول (${validTables}) جاهزة للهجرة بدون مشاكل`;
      } else {
        dryRunResult.summary = `⚠️ ${validTables} جدول جاهز للهجرة، ${tablesWithWarnings} جدول مع تحذيرات`;
        dryRunResult.recommendations.push('راجع التحذيرات قبل بدء الهجرة');
      }
    } else {
      dryRunResult.summary = `❌ فشل: ${tablesWithErrors} جدول غير قابل للهجرة، ${validTables} جدول صالح`;
      dryRunResult.recommendations.push('أصلح المشاكل الحرجة قبل المتابعة');
    }

    // إضافة توصيات مفصلة
    if (tablesWithErrors > 0) {
      dryRunResult.recommendations.push('فحص schema الجداول الفاشلة وإصلاح عدم التطابق');
    }

    this.LOG.info(`📊 نتائج Dry-Run: ${dryRunResult.summary}`);
    
    return dryRunResult;
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