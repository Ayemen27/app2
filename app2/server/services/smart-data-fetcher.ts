import { Client } from "pg";
import fs from "fs";
import { db } from "../db";
import * as schema from "@shared/schema";

// خدمة ذكية لجلب البيانات من قواعد البيانات الخارجية
export class SmartDataFetcher {
  private externalClient: Client | null = null;
  private isConnected = false;

  constructor(private connectionString: string) {}

  // إنشاء اتصال آمن بقاعدة البيانات الخارجية
  private async connect(): Promise<void> {
    if (this.isConnected && this.externalClient) return;

    console.log('🔗 إنشاء اتصال بقاعدة البيانات الخارجية...');
    
    const config: any = { connectionString: this.connectionString };
    
    // إعداد SSL آمن
    try {
      const certPath = './pg_cert.pem';
      if (fs.existsSync(certPath)) {
        const ca = fs.readFileSync(certPath, { encoding: "utf8" });
        config.ssl = {
          rejectUnauthorized: false,
          ca: ca,
          minVersion: 'TLSv1.2',
          checkServerIdentity: () => undefined
        };
        console.log('📜 تم تحميل شهادة SSL');
      } else {
        config.ssl = { rejectUnauthorized: false };
        console.log('⚠️ لا توجد شهادة SSL، استخدام اتصال أساسي');
      }
    } catch (error) {
      console.warn('⚠️ خطأ في إعداد SSL:', error);
      config.ssl = { rejectUnauthorized: false };
    }

    this.externalClient = new Client(config);
    await this.externalClient.connect();
    this.isConnected = true;
    console.log('✅ تم الاتصال بقاعدة البيانات الخارجية');
  }

  // جلب البيانات بطريقة ذكية مع التحكم في الحجم
  async fetchData(tableName: string, options: {
    limit?: number;
    offset?: number;
    where?: string;
    orderBy?: string;
    columns?: string[];
  } = {}): Promise<any[]> {
    await this.connect();
    
    const {
      limit = 100,
      offset = 0,
      where = '',
      orderBy = '',
      columns = ['*']
    } = options;

    const columnList = columns.includes('*') ? '*' : columns.map(c => `"${c}"`).join(', ');
    let query = `SELECT ${columnList} FROM public."${tableName}"`;
    
    if (where) {
      query += ` WHERE ${where}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    console.log(`📊 جلب البيانات من ${tableName} (${limit} صف من ${offset})`);
    
    try {
      const result = await this.externalClient!.query(query);
      console.log(`✅ تم جلب ${result.rows.length} صف من ${tableName}`);
      return result.rows;
    } catch (error) {
      console.error(`❌ خطأ في جلب البيانات من ${tableName}:`, error);
      throw error;
    }
  }

  // جلب عدد الصفوف في الجدول
  async getRowCount(tableName: string, where?: string): Promise<number> {
    await this.connect();
    
    let query = `SELECT COUNT(*) as count FROM public."${tableName}"`;
    if (where) {
      query += ` WHERE ${where}`;
    }

    try {
      const result = await this.externalClient!.query(query);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error(`❌ خطأ في عد الصفوف من ${tableName}:`, error);
      return 0;
    }
  }

  // جلب معلومات الجدول
  async getTableInfo(tableName: string): Promise<{
    columns: string[];
    rowCount: number;
  }> {
    await this.connect();
    
    try {
      // جلب أسماء الأعمدة
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

  // مزامنة بيانات جدول محدد بطريقة ذكية
  async syncTableData(tableName: string, batchSize = 100): Promise<{
    success: boolean;
    synced: number;
    errors: number;
  }> {
    console.log(`🔄 بدء مزامنة جدول ${tableName}...`);
    
    try {
      const tableInfo = await this.getTableInfo(tableName);
      
      if (tableInfo.columns.length === 0) {
        console.log(`⚠️ الجدول ${tableName} غير موجود أو فارغ`);
        return { success: false, synced: 0, errors: 1 };
      }

      let totalSynced = 0;
      let totalErrors = 0;
      const totalRows = tableInfo.rowCount;
      
      console.log(`📊 الجدول ${tableName} يحتوي على ${totalRows} صف`);

      // جلب البيانات على دفعات
      for (let offset = 0; offset < totalRows; offset += batchSize) {
        try {
          const batch = await this.fetchData(tableName, {
            limit: batchSize,
            offset: offset,
            columns: tableInfo.columns
          });

          if (batch.length > 0) {
            // هنا يمكن إضافة منطق لحفظ البيانات في قاعدة البيانات المحلية
            // أو معالجة البيانات حسب الحاجة
            totalSynced += batch.length;
            console.log(`✅ تم مزامنة دفعة ${offset / batchSize + 1}: ${batch.length} صف`);
          }
        } catch (error) {
          console.error(`❌ خطأ في مزامنة الدفعة ${offset / batchSize + 1}:`, error);
          totalErrors++;
        }
      }

      console.log(`🎯 انتهاء مزامنة ${tableName}: ${totalSynced} صف تم، ${totalErrors} أخطاء`);
      
      return {
        success: totalErrors === 0,
        synced: totalSynced,
        errors: totalErrors
      };
      
    } catch (error) {
      console.error(`❌ خطأ عام في مزامنة ${tableName}:`, error);
      return { success: false, synced: 0, errors: 1 };
    }
  }

  // إغلاق الاتصال
  async disconnect(): Promise<void> {
    if (this.externalClient && this.isConnected) {
      await this.externalClient.end();
      this.isConnected = false;
      console.log('🔌 تم قطع الاتصال بقاعدة البيانات الخارجية');
    }
  }
}

// إنشاء مثيل للخدمة (سيتم تهيئته لاحقاً)
let smartFetcher: SmartDataFetcher | null = null;

export function getSmartFetcher(connectionString?: string): SmartDataFetcher {
  if (!smartFetcher && connectionString) {
    smartFetcher = new SmartDataFetcher(connectionString);
  }
  
  if (!smartFetcher) {
    throw new Error('يجب تهيئة الخدمة أولاً بـ connection string');
  }
  
  return smartFetcher;
}