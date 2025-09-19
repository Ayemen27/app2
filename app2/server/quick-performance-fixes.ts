import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * إصلاحات الأداء السريعة
 * Quick Performance Fixes - تنفيذ فوري للحلول
 */

export class QuickPerformanceFixes {

  /**
   * تطبيق فهارس محسنة فورية
   */
  async applyOptimizedIndexes(): Promise<{
    success: boolean;
    indexesCreated: string[];
    errors: string[];
  }> {
    console.log('🔧 تطبيق فهارس محسنة فورية...');
    
    const indexesCreated: string[] = [];
    const errors: string[] = [];

    try {
      // فهرس محسن للحذف السريع بناءً على التاريخ والاستخدام  
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_autocomplete_fast_delete 
        ON autocomplete_data (last_used, usage_count)
      `);
      indexesCreated.push('idx_autocomplete_fast_delete');

      // فهرس محسن للبحث السريع
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_autocomplete_search_optimized 
        ON autocomplete_data (category, value text_pattern_ops, usage_count DESC)
      `);
      indexesCreated.push('idx_autocomplete_search_optimized');

      // فهرس لتحسين عمليات الترتيب
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_autocomplete_ranking 
        ON autocomplete_data (category, usage_count DESC, last_used DESC)
      `);
      indexesCreated.push('idx_autocomplete_ranking');

      console.log(`✅ تم إنشاء ${indexesCreated.length} فهرس محسن`);

      return {
        success: true,
        indexesCreated,
        errors
      };

    } catch (error) {
      console.error('❌ خطأ في إنشاء الفهارس:', error);
      errors.push(`خطأ في إنشاء الفهارس: ${error}`);
      
      return {
        success: false,
        indexesCreated,
        errors
      };
    }
  }

  /**
   * تحسين إعدادات قاعدة البيانات للأداء
   */
  async optimizeDatabaseSettings(): Promise<{
    success: boolean;
    settings: string[];
    errors: string[];
  }> {
    console.log('⚙️ تحسين إعدادات قاعدة البيانات...');
    
    const settings: string[] = [];
    const errors: string[] = [];

    try {
      // تحسين إعدادات autovacuum للجدول
      await db.execute(sql`
        ALTER TABLE autocomplete_data SET (
          autovacuum_vacuum_threshold = 50,
          autovacuum_vacuum_scale_factor = 0.02,
          autovacuum_analyze_threshold = 25,
          autovacuum_analyze_scale_factor = 0.01
        )
      `);
      settings.push('تحسين autovacuum للجدول autocomplete_data');

      // تحسين إعدادات الإحصائيات
      await db.execute(sql`
        ALTER TABLE autocomplete_data ALTER COLUMN category SET STATISTICS 1000
      `);
      settings.push('تحسين إحصائيات العمود category');

      await db.execute(sql`
        ALTER TABLE autocomplete_data ALTER COLUMN usage_count SET STATISTICS 1000
      `);
      settings.push('تحسين إحصائيات العمود usage_count');

      console.log(`✅ تم تطبيق ${settings.length} إعداد محسن`);

      return {
        success: true,
        settings,
        errors
      };

    } catch (error) {
      console.error('❌ خطأ في تحسين الإعدادات:', error);
      errors.push(`خطأ في تحسين الإعدادات: ${error}`);
      
      return {
        success: false,
        settings,
        errors
      };
    }
  }

  /**
   * تنظيف فوري وتحسين
   */
  async immediateCleanupAndOptimize(): Promise<{
    success: boolean;
    cleaned: number;
    optimized: boolean;
    executionTime: number;
  }> {
    console.log('🧹 تنظيف فوري وتحسين...');
    
    const startTime = Date.now();

    try {
      // تنظيف البيانات القديمة والمكررة
      const cleanResult = await db.execute(sql`
        WITH duplicates AS (
          SELECT id, 
                 ROW_NUMBER() OVER (
                   PARTITION BY category, value 
                   ORDER BY usage_count DESC, last_used DESC
                 ) as rn
          FROM autocomplete_data
        )
        DELETE FROM autocomplete_data 
        WHERE id IN (
          SELECT id FROM duplicates WHERE rn > 1
        )
      `);

      const cleaned = cleanResult.rowCount || 0;

      // تشغيل VACUUM وإعادة الفهرسة
      await db.execute(sql`VACUUM ANALYZE autocomplete_data`);
      await db.execute(sql`REINDEX TABLE autocomplete_data`);

      const endTime = Date.now();

      console.log(`✅ تم تنظيف ${cleaned} سجل في ${endTime - startTime}ms`);

      return {
        success: true,
        cleaned,
        optimized: true,
        executionTime: endTime - startTime
      };

    } catch (error) {
      console.error('❌ خطأ في التنظيف:', error);
      
      const endTime = Date.now();
      return {
        success: false,
        cleaned: 0,
        optimized: false,
        executionTime: endTime - startTime
      };
    }
  }

  /**
   * قياس الأداء قبل وبعد التحسين
   */
  async benchmarkPerformance(): Promise<{
    beforeOptimization: any;
    afterOptimization: any;
    improvement: string;
  }> {
    console.log('📊 قياس الأداء قبل وبعد التحسين...');

    // قياس الأداء قبل التحسين
    const beforeStartTime = Date.now();
    await db.execute(sql`
      SELECT category, COUNT(*), AVG(usage_count) 
      FROM autocomplete_data 
      GROUP BY category 
      ORDER BY COUNT(*) DESC
    `);
    const beforeTime = Date.now() - beforeStartTime;

    // تطبيق التحسينات
    await this.applyOptimizedIndexes();
    await this.optimizeDatabaseSettings();
    await this.immediateCleanupAndOptimize();

    // قياس الأداء بعد التحسين
    const afterStartTime = Date.now();
    await db.execute(sql`
      SELECT category, COUNT(*), AVG(usage_count) 
      FROM autocomplete_data 
      GROUP BY category 
      ORDER BY COUNT(*) DESC
    `);
    const afterTime = Date.now() - afterStartTime;

    const improvementPercent = beforeTime > 0 ? 
      Math.round(((beforeTime - afterTime) / beforeTime) * 100) : 0;

    const improvement = afterTime < beforeTime ? 
      `تحسن بنسبة ${improvementPercent}% (من ${beforeTime}ms إلى ${afterTime}ms)` :
      `لا يوجد تحسن ملحوظ (${beforeTime}ms → ${afterTime}ms)`;

    return {
      beforeOptimization: { executionTime: beforeTime },
      afterOptimization: { executionTime: afterTime },
      improvement
    };
  }

  /**
   * تطبيق جميع التحسينات دفعة واحدة
   */
  async applyAllOptimizations(): Promise<{
    success: boolean;
    results: {
      indexes: any;
      settings: any;
      cleanup: any;
      benchmark: any;
    };
    summary: string;
  }> {
    console.log('🚀 تطبيق جميع التحسينات دفعة واحدة...');

    try {
      const [indexes, settings, cleanup, benchmark] = await Promise.all([
        this.applyOptimizedIndexes(),
        this.optimizeDatabaseSettings(),
        this.immediateCleanupAndOptimize(),
        this.benchmarkPerformance()
      ]);

      const totalSuccess = indexes.success && settings.success && cleanup.success;

      const summary = `
📊 ملخص التحسينات:
✅ فهارس محسنة: ${indexes.indexesCreated.length}
⚙️ إعدادات محسنة: ${settings.settings.length}  
🧹 سجلات منظفة: ${cleanup.cleaned}
⏱️ تحسين الأداء: ${benchmark.improvement}
🎯 النتيجة: ${totalSuccess ? 'نجح التحسين بالكامل' : 'نجح جزئياً'}
      `.trim();

      console.log(summary);

      return {
        success: totalSuccess,
        results: { indexes, settings, cleanup, benchmark },
        summary
      };

    } catch (error) {
      console.error('❌ خطأ في تطبيق التحسينات:', error);
      
      return {
        success: false,
        results: {
          indexes: { success: false, indexesCreated: [], errors: [`خطأ: ${error}`] },
          settings: { success: false, settings: [], errors: [`خطأ: ${error}`] },
          cleanup: { success: false, cleaned: 0, optimized: false, executionTime: 0 },
          benchmark: { beforeOptimization: {}, afterOptimization: {}, improvement: 'فشل' }
        },
        summary: `❌ فشل في تطبيق التحسينات: ${error}`
      };
    }
  }
}

export const quickPerformanceFixes = new QuickPerformanceFixes();