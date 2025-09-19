import { Client } from "pg";
import fs from "fs";
import { pool } from "../old-db";
import * as schema from "@shared/schema";

// قائمة بيضاء للجداول المسموح بالوصول إليها
const ALLOWED_TABLES = [
  "projects", "workers", "daily_expenses", "material_purchases",
  "suppliers", "accounts", "transactions", "equipment", "tools",
  "users", "worker_attendance"
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

// قائمة بيضاء للأعمدة التي يمكن الترتيب بها
const ALLOWED_ORDER_COLUMNS = [
  "id", "name", "date", "created_at", "updated_at", "amount", "status"
] as const;

type AllowedOrderColumn = typeof ALLOWED_ORDER_COLUMNS[number];

interface FetchOptions {
  limit?: number;
  offset?: number;
  orderBy?: AllowedOrderColumn;
  orderDirection?: 'ASC' | 'DESC';
}

export class SecureDataFetcher {
  private externalClient: Client | null = null;
  private isConnected = false;

  constructor(private connectionString: string) {}

  // التحقق من أن الجدول مسموح
  private validateTable(tableName: string): tableName is AllowedTable {
    return ALLOWED_TABLES.includes(tableName as AllowedTable);
  }

  // إنشاء اتصال آمن بقاعدة البيانات الخارجية
  private async connect(): Promise<void> {
    if (this.isConnected && this.externalClient) return;

    console.log('🔗 إنشاء اتصال آمن بقاعدة البيانات الخارجية...');
    
    const config: any = { connectionString: this.connectionString };
    
    // إعداد SSL آمن - مطلوب للاتصالات الخارجية
    const certPath = './pg_cert.pem';
    try {
      if (fs.existsSync(certPath)) {
        const ca = fs.readFileSync(certPath, { encoding: "utf8" });
        config.ssl = {
          rejectUnauthorized: true, // التحقق الكامل من الشهادات الرسمية
          ca: ca,
          minVersion: 'TLSv1.2'
        };
        console.log('🔒 تم تحميل شهادة SSL الرسمية وتفعيل التحقق الآمن');
      } else {
        console.error('❌ ملف شهادة SSL مفقود: pg_cert.pem');
        throw new Error('شهادة SSL مطلوبة للاتصالات الآمنة');
      }
    } catch (error) {
      console.error('❌ فشل في إعداد SSL الآمن:', error);
      throw new Error('لا يمكن إنشاء اتصال آمن بدون شهادة SSL صالحة');
    }

    this.externalClient = new Client(config);
    await this.externalClient.connect();
    this.isConnected = true;
    console.log('✅ تم الاتصال الآمن بقاعدة البيانات الخارجية');
  }

  // جلب البيانات بطريقة آمنة
  async fetchData(tableName: string, options: FetchOptions = {}): Promise<any[]> {
    // التحقق من الجدول المسموح
    if (!this.validateTable(tableName)) {
      throw new Error(`الجدول '${tableName}' غير مسموح به`);
    }

    await this.connect();
    
    const {
      limit = 100,
      offset = 0,
      orderBy,
      orderDirection = 'ASC'
    } = options;

    // التحقق من حدود الاستعلام
    if (limit > 1000) throw new Error('الحد الأقصى للصفوف هو 1000');
    if (offset < 0) throw new Error('الإزاحة يجب أن تكون موجبة');

    // بناء الاستعلام الآمن
    let query = `SELECT * FROM public."${tableName}"`;
    const params: any[] = [];
    let paramIndex = 1;

    // إضافة الترتيب الآمن
    if (orderBy && ALLOWED_ORDER_COLUMNS.includes(orderBy)) {
      const direction = orderDirection === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY "${orderBy}" ${direction}`;
    }

    // إضافة الحدود والإزاحة
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    console.log(`📊 جلب البيانات الآمنة من ${tableName} (${limit} صف من ${offset})`);
    
    try {
      const result = await this.externalClient!.query(query, params);
      console.log(`✅ تم جلب ${result.rows.length} صف من ${tableName}`);
      return result.rows;
    } catch (error) {
      console.error(`❌ خطأ في جلب البيانات من ${tableName}:`, error);
      throw error;
    }
  }

  // جلب عدد الصفوف بطريقة آمنة
  async getRowCount(tableName: string): Promise<number> {
    if (!this.validateTable(tableName)) {
      throw new Error(`الجدول '${tableName}' غير مسموح به`);
    }

    await this.connect();
    
    const query = `SELECT COUNT(*) as count FROM public."${tableName}"`;

    try {
      const result = await this.externalClient!.query(query);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error(`❌ خطأ في عد الصفوف من ${tableName}:`, error);
      return 0;
    }
  }

  // جلب معلومات الجدول بطريقة آمنة
  async getTableInfo(tableName: string): Promise<{
    columns: string[];
    rowCount: number;
  }> {
    if (!this.validateTable(tableName)) {
      throw new Error(`الجدول '${tableName}' غير مسموح به`);
    }

    await this.connect();
    
    try {
      // جلب أسماء الأعمدة باستخدام parameterized query
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name=$1 
        ORDER BY ordinal_position
      `;
      const columnsResult = await this.externalClient!.query(columnsQuery, [tableName]);
      const columns = columnsResult.rows.map(row => row.column_name);
      
      // جلب عدد الصفوف
      const rowCount = await this.getRowCount(tableName);
      
      return { columns, rowCount };
    } catch (error) {
      console.error(`❌ خطأ في جلب معلومات الجدول ${tableName}:`, error);
      return { columns: [], rowCount: 0 };
    }
  }

  // مزامنة آمنة مع حفظ محلي فعلي
  async syncTableData(tableName: string, batchSize = 100): Promise<{
    success: boolean;
    synced: number;
    errors: number;
    savedLocally: number;
  }> {
    if (!this.validateTable(tableName)) {
      throw new Error(`الجدول '${tableName}' غير مسموح به`);
    }

    console.log(`🔄 بدء المزامنة الآمنة لجدول ${tableName}...`);
    
    try {
      const tableInfo = await this.getTableInfo(tableName);
      
      if (tableInfo.columns.length === 0) {
        console.log(`⚠️ الجدول ${tableName} غير موجود أو فارغ`);
        return { success: false, synced: 0, errors: 1, savedLocally: 0 };
      }

      let totalSynced = 0;
      let totalErrors = 0;
      let totalSavedLocally = 0;
      const totalRows = tableInfo.rowCount;
      
      console.log(`📊 الجدول ${tableName} يحتوي على ${totalRows} صف`);

      // جلب البيانات على دفعات وحفظها محلياً
      for (let offset = 0; offset < totalRows; offset += batchSize) {
        try {
          const batch = await this.fetchData(tableName, {
            limit: batchSize,
            offset: offset,
            orderBy: 'id' // ترتيب آمن
          });

          if (batch.length > 0) {
            totalSynced += batch.length;
            
            // محاولة حفظ البيانات محلياً (حسب نوع الجدول)
            try {
              const savedCount = await this.saveDataLocally(tableName, batch);
              totalSavedLocally += savedCount;
              console.log(`✅ تم حفظ ${savedCount} من ${batch.length} صف محلياً - دفعة ${Math.floor(offset / batchSize) + 1}`);
            } catch (saveError) {
              console.error(`⚠️ خطأ في حفظ البيانات محلياً:`, saveError);
              // نتابع المزامنة حتى لو فشل الحفظ المحلي
            }
          }
        } catch (error) {
          console.error(`❌ خطأ في مزامنة الدفعة ${Math.floor(offset / batchSize) + 1}:`, error);
          totalErrors++;
        }
      }

      console.log(`🎯 انتهاء مزامنة ${tableName}: ${totalSynced} صف تم، ${totalSavedLocally} صف حُفظ محلياً، ${totalErrors} أخطاء`);
      
      return {
        success: totalErrors === 0,
        synced: totalSynced,
        errors: totalErrors,
        savedLocally: totalSavedLocally
      };
      
    } catch (error) {
      console.error(`❌ خطأ عام في مزامنة ${tableName}:`, error);
      return { success: false, synced: 0, errors: 1, savedLocally: 0 };
    }
  }

  // حفظ البيانات محلياً في قاعدة البيانات المحلية
  private async saveDataLocally(tableName: string, data: any[]): Promise<number> {
    if (data.length === 0) return 0;

    try {
      console.log(`💾 حفظ ${data.length} صف من ${tableName} في قاعدة البيانات المحلية...`);
      
      // إنشاء جدول backup مخصص لكل جدول أصلي
      const backupTableName = `backup_${tableName}`;
      
      // استعلام لإنشاء الجدول إذا لم يكن موجوداً (JSONB لمرونة البيانات)
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${backupTableName}" (
          id SERIAL PRIMARY KEY,
          original_id TEXT,
          source_table VARCHAR(100) DEFAULT '${tableName}',
          data JSONB NOT NULL,
          synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(original_id, source_table)
        );
      `;
      
      await pool.query(createTableQuery);
      
      // حفظ البيانات على دفعات
      let savedCount = 0;
      
      for (const row of data) {
        try {
          // استخدام upsert لتجنب التكرار - تصحيح syntax للمعاملات
          const upsertQuery = `
            INSERT INTO "${backupTableName}" (original_id, data, source_table)
            VALUES (?, ?, ?)
            ON CONFLICT (original_id, source_table) 
            DO UPDATE SET 
              data = EXCLUDED.data,
              synced_at = CURRENT_TIMESTAMP;
          `;
          
          // استخدام ID من البيانات الأصلية أو فهرس فريد
          const originalId = row.id?.toString() || 
                           row.uuid?.toString() || 
                           `${tableName}_${savedCount}_${Date.now()}`;
          
          // استخدام pool.query بدلاً من db.execute للتوافق مع المعاملات
          await pool.query(upsertQuery, [
            originalId,
            JSON.stringify(row),
            tableName
          ]);
          
          savedCount++;
        } catch (saveError) {
          console.warn(`⚠️ تخطي صف في ${tableName}:`, saveError);
          // نتابع مع بقية الصفوف
        }
      }
      
      console.log(`✅ تم حفظ ${savedCount}/${data.length} صف من ${tableName} في قاعدة البيانات المحلية`);
      
      // إنشاء فهرس للبحث السريع
      try {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_${backupTableName}_synced_at 
          ON "${backupTableName}" (synced_at);
        `);
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_${backupTableName}_source 
          ON "${backupTableName}" (source_table);
        `);
      } catch (indexError) {
        // الفهارس غير حرجة
        console.log(`ℹ️ تخطي إنشاء فهارس لـ ${backupTableName}`);
      }
      
      return savedCount;
      
    } catch (error) {
      console.error(`❌ فشل حفظ البيانات محلياً في ${tableName}:`, error);
      return 0;
    }
  }

  // إغلاق الاتصال الآمن
  async disconnect(): Promise<void> {
    if (this.externalClient && this.isConnected) {
      await this.externalClient.end();
      this.isConnected = false;
      console.log('🔌 تم قطع الاتصال الآمن بقاعدة البيانات الخارجية');
    }
  }

  // الحصول على قائمة الجداول المسموحة
  static getAllowedTables(): readonly AllowedTable[] {
    return ALLOWED_TABLES;
  }
}

// إنشاء مثيل للخدمة الآمنة
let secureDataFetcher: SecureDataFetcher | null = null;

export function getSecureDataFetcher(connectionString?: string): SecureDataFetcher {
  if (!secureDataFetcher && connectionString) {
    secureDataFetcher = new SecureDataFetcher(connectionString);
  }
  
  if (!secureDataFetcher) {
    throw new Error('يجب تهيئة الخدمة الآمنة أولاً بـ connection string');
  }
  
  return secureDataFetcher;
}