import { db } from './db';
import { sql } from 'drizzle-orm';
import { autocompleteData } from '@shared/schema';

/**
 * محسن العمليات الجماعية - Batch Operations Optimizer
 * تطبيق التوصيات المتقدمة لتحسين الأداء
 */

export class BatchOperationsOptimizer {

  /**
   * حذف جماعي محسن - Optimized Batch Delete
   * بدلاً من حذف كل سجل منفصل
   */
  async batchDeleteAutocomplete(idsToDelete: string[]): Promise<{
    deletedCount: number;
    executionTime: number;
    method: 'batch' | 'individual';
  }> {
    if (idsToDelete.length === 0) {
      return { deletedCount: 0, executionTime: 0, method: 'batch' };
    }

    const startTime = Date.now();

    try {
      if (idsToDelete.length > 100) {
        // للكميات الكبيرة: استخدم عمليات مقسمة
        return await this.chunkedBatchDelete(idsToDelete);
      }

      // حذف جماعي مباشر
      const result = await db.execute(sql`
        DELETE FROM autocomplete_data 
        WHERE id = ANY(${idsToDelete})
      `);

      const endTime = Date.now();
      
      return {
        deletedCount: result.rowCount || 0,
        executionTime: endTime - startTime,
        method: 'batch'
      };

    } catch (error) {
      console.error('خطأ في الحذف الجماعي:', error);
      // fallback للحذف الفردي
      return await this.individualDelete(idsToDelete);
    }
  }

  /**
   * إضافة جماعية محسنة - Optimized Batch Insert
   */
  async batchInsertAutocomplete(records: Array<{
    category: string;
    value: string;
    usage_count?: number;
  }>): Promise<{
    insertedCount: number;
    executionTime: number;
    method: 'batch' | 'individual';
  }> {
    if (records.length === 0) {
      return { insertedCount: 0, executionTime: 0, method: 'batch' };
    }

    const startTime = Date.now();

    try {
      if (records.length > 100) {
        // للكميات الكبيرة: استخدم عمليات مقسمة
        return await this.chunkedBatchInsert(records);
      }

      // تحضير البيانات للإدخال الجماعي
      const preparedRecords = records.map(record => ({
        category: record.category,
        value: record.value,
        usage_count: record.usage_count || 1,
        last_used: new Date(),
        created_at: new Date()
      }));

      // إدخال جماعي مع التعامل مع التكرار
      const result = await db.execute(sql`
        INSERT INTO autocomplete_data (category, value, usage_count, last_used, created_at)
        SELECT * FROM ${sql.raw(`(VALUES ${preparedRecords.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}) AS t(category, value, usage_count, last_used, created_at)`)}
        ON CONFLICT (category, value) 
        DO UPDATE SET 
          usage_count = autocomplete_data.usage_count + EXCLUDED.usage_count,
          last_used = EXCLUDED.last_used
      `);

      const endTime = Date.now();
      
      return {
        insertedCount: result.rowCount || 0,
        executionTime: endTime - startTime,
        method: 'batch'
      };

    } catch (error) {
      console.error('خطأ في الإدخال الجماعي:', error);
      // fallback للإدخال الفردي
      return await this.individualInsert(records);
    }
  }

  /**
   * حذف مقسم للكميات الكبيرة
   */
  private async chunkedBatchDelete(idsToDelete: string[]): Promise<{
    deletedCount: number;
    executionTime: number;
    method: 'batch';
  }> {
    const startTime = Date.now();
    const chunkSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      
      const result = await db.execute(sql`
        DELETE FROM autocomplete_data 
        WHERE id = ANY(${chunk})
      `);
      
      totalDeleted += result.rowCount || 0;
      
      // استراحة قصيرة لتجنب إرهاق قاعدة البيانات
      if (i + chunkSize < idsToDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const endTime = Date.now();
    
    return {
      deletedCount: totalDeleted,
      executionTime: endTime - startTime,
      method: 'batch'
    };
  }

  /**
   * إدخال مقسم للكميات الكبيرة
   */
  private async chunkedBatchInsert(records: Array<{
    category: string;
    value: string;
    usage_count?: number;
  }>): Promise<{
    insertedCount: number;
    executionTime: number;
    method: 'batch';
  }> {
    const startTime = Date.now();
    const chunkSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const result = await this.batchInsertAutocomplete(chunk);
      totalInserted += result.insertedCount;
      
      // استراحة قصيرة لتجنب إرهاق قاعدة البيانات
      if (i + chunkSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const endTime = Date.now();
    
    return {
      insertedCount: totalInserted,
      executionTime: endTime - startTime,
      method: 'batch'
    };
  }

  /**
   * حذف فردي كـ fallback
   */
  private async individualDelete(idsToDelete: string[]): Promise<{
    deletedCount: number;
    executionTime: number;
    method: 'individual';
  }> {
    const startTime = Date.now();
    let deletedCount = 0;

    for (const id of idsToDelete) {
      try {
        const result = await db.execute(sql`
          DELETE FROM autocomplete_data WHERE id = ${id}
        `);
        if (result.rowCount && result.rowCount > 0) {
          deletedCount++;
        }
      } catch (error) {
        console.error(`خطأ في حذف السجل ${id}:`, error);
      }
    }

    const endTime = Date.now();
    
    return {
      deletedCount,
      executionTime: endTime - startTime,
      method: 'individual'
    };
  }

  /**
   * إدخال فردي كـ fallback
   */
  private async individualInsert(records: Array<{
    category: string;
    value: string;
    usage_count?: number;
  }>): Promise<{
    insertedCount: number;
    executionTime: number;
    method: 'individual';
  }> {
    const startTime = Date.now();
    let insertedCount = 0;

    for (const record of records) {
      try {
        const result = await db.execute(sql`
          INSERT INTO autocomplete_data (category, value, usage_count, last_used, created_at)
          VALUES (${record.category}, ${record.value}, ${record.usage_count || 1}, NOW(), NOW())
          ON CONFLICT (category, value) 
          DO UPDATE SET 
            usage_count = autocomplete_data.usage_count + 1,
            last_used = NOW()
        `);
        if (result.rowCount && result.rowCount > 0) {
          insertedCount++;
        }
      } catch (error) {
        console.error(`خطأ في إدخال السجل ${record.value}:`, error);
      }
    }

    const endTime = Date.now();
    
    return {
      insertedCount,
      executionTime: endTime - startTime,
      method: 'individual'
    };
  }

  /**
   * تنظيف جماعي محسن للبيانات القديمة
   */
  async optimizedBatchCleanup(): Promise<{
    deletedCount: number;
    executionTime: number;
    vacuumTime: number;
  }> {
    console.log('🧹 بدء التنظيف الجماعي المحسن...');
    
    const startTime = Date.now();

    // 1. حذف جماعي للبيانات القديمة
    const deleteResult = await db.execute(sql`
      DELETE FROM autocomplete_data 
      WHERE last_used < NOW() - INTERVAL '6 months' 
      AND usage_count < 3
    `);

    const deleteTime = Date.now();

    // 2. تشغيل VACUUM لاستعادة المساحة
    await db.execute(sql`VACUUM ANALYZE autocomplete_data`);

    const vacuumTime = Date.now();

    return {
      deletedCount: deleteResult.rowCount || 0,
      executionTime: deleteTime - startTime,
      vacuumTime: vacuumTime - deleteTime
    };
  }

  /**
   * إحصائيات العمليات الجماعية
   */
  async getBatchOperationsStats(): Promise<{
    tableSize: string;
    indexSize: string;
    totalRecords: number;
    oldRecords: number;
    recommendedAction: string;
  }> {
    try {
      // حجم الجدول والفهارس
      const sizeResult = await db.execute(sql`
        SELECT 
          pg_size_pretty(pg_total_relation_size('autocomplete_data')) as table_size,
          pg_size_pretty(pg_indexes_size('autocomplete_data')) as index_size
      `);

      // عدد السجلات
      const countResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_records,
          COUNT(*) FILTER (WHERE last_used < NOW() - INTERVAL '6 months' AND usage_count < 3) as old_records
        FROM autocomplete_data
      `);

      const sizeRow = sizeResult.rows?.[0] as any;
      const countRow = countResult.rows?.[0] as any;

      const totalRecords = parseInt(countRow?.total_records || '0');
      const oldRecords = parseInt(countRow?.old_records || '0');

      let recommendedAction = 'لا حاجة لإجراء';
      if (oldRecords > totalRecords * 0.1) {
        recommendedAction = 'ينصح بتشغيل التنظيف الجماعي';
      } else if (totalRecords > 100000) {
        recommendedAction = 'ينصح بتقسيم الجدول (Partitioning)';
      }

      return {
        tableSize: sizeRow?.table_size || 'غير محدد',
        indexSize: sizeRow?.index_size || 'غير محدد',
        totalRecords,
        oldRecords,
        recommendedAction
      };

    } catch (error) {
      console.error('خطأ في جلب إحصائيات العمليات:', error);
      return {
        tableSize: 'خطأ',
        indexSize: 'خطأ',
        totalRecords: 0,
        oldRecords: 0,
        recommendedAction: 'فحص الاتصال بقاعدة البيانات'
      };
    }
  }
}

export const batchOperationsOptimizer = new BatchOperationsOptimizer();