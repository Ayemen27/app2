/**
 * طبقة التغليف الذكية لـ Drizzle ORM
 * تلتقط جميع أخطاء قاعدة البيانات وتمررها للنظام الذكي
 * تدعم جميع العمليات: insert, update, delete, select
 */

import { db } from '../db';
import { smartErrorHandler, type ErrorContext } from './SmartErrorHandler';
import { sql, SQL } from 'drizzle-orm';

export class DrizzleWrapper {
  /**
   * تنفيذ عملية INSERT مع التعامل الذكي مع الأخطاء
   */
  static async insert<T extends any>(
    table: any,
    values: any,
    context?: Partial<ErrorContext>
  ): Promise<any[]> {
    const startTime = Date.now();
    const operation: ErrorContext = {
      operation: 'insert',
      tableName: table?._.name || 'unknown',
      ...context
    };

    try {
      console.log(`🔄 تنفيذ INSERT في الجدول: ${operation.tableName}`);
      
      const result = await db.insert(table).values(values).returning();
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ تم تنفيذ INSERT بنجاح في ${executionTime}ms`);
      return Array.isArray(result) ? result : [result];
      
    } catch (error: any) {
      operation.executionTime = Date.now() - startTime;
      operation.attemptedValue = values;
      
      console.log(`❌ خطأ في INSERT: ${error.message}`);
      
      // تمرير الخطأ للنظام الذكي
      await smartErrorHandler.handleDatabaseError(error, operation, false);
      
      // هذا السطر لن يتم الوصول إليه بسبب الـ throw في المعالج
      throw error;
    }
  }

  /**
   * تنفيذ عملية UPDATE مع التعامل الذكي مع الأخطاء
   */
  static async update<T extends any>(
    table: any,
    where: any,
    values: any,
    context?: Partial<ErrorContext>
  ): Promise<T[]> {
    const startTime = Date.now();
    const operation: ErrorContext = {
      operation: 'update',
      tableName: table?._.name || 'unknown',
      ...context
    };

    try {
      console.log(`🔄 تنفيذ UPDATE في الجدول: ${operation.tableName}`);
      
      const result = await db.update(table).set(values).where(where).returning();
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ تم تنفيذ UPDATE بنجاح في ${executionTime}ms`);
      return Array.isArray(result) ? result : [result];
      
    } catch (error: any) {
      operation.executionTime = Date.now() - startTime;
      operation.attemptedValue = values;
      
      console.log(`❌ خطأ في UPDATE: ${error.message}`);
      
      await smartErrorHandler.handleDatabaseError(error, operation, true);
      throw error;
    }
  }

  /**
   * تنفيذ عملية DELETE مع التعامل الذكي مع الأخطاء
   */
  static async delete<T extends any>(
    table: any,
    where: any,
    context?: Partial<ErrorContext>
  ): Promise<T[]> {
    const startTime = Date.now();
    const operation: ErrorContext = {
      operation: 'delete',
      tableName: table?._.name || 'unknown',
      ...context
    };

    try {
      console.log(`🔄 تنفيذ DELETE في الجدول: ${operation.tableName}`);
      
      const result = await db.delete(table).where(where).returning();
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ تم تنفيذ DELETE بنجاح في ${executionTime}ms`);
      return result;
      
    } catch (error: any) {
      operation.executionTime = Date.now() - startTime;
      
      console.log(`❌ خطأ في DELETE: ${error.message}`);
      
      await smartErrorHandler.handleDatabaseError(error, operation, true);
      throw error;
    }
  }

  /**
   * تنفيذ عملية SELECT مع التعامل الذكي مع الأخطاء
   */
  static async select<T extends any>(
    query: any,
    context?: Partial<ErrorContext>
  ): Promise<any[]> {
    const startTime = Date.now();
    const operation: ErrorContext = {
      operation: 'select',
      tableName: context?.tableName || 'unknown',
      ...context
    };

    try {
      console.log(`🔄 تنفيذ SELECT من: ${operation.tableName}`);
      
      const result = await query;
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ تم تنفيذ SELECT بنجاح في ${executionTime}ms`);
      return result;
      
    } catch (error: any) {
      operation.executionTime = Date.now() - startTime;
      
      console.log(`❌ خطأ في SELECT: ${error.message}`);
      
      await smartErrorHandler.handleDatabaseError(error, operation, true);
      throw error;
    }
  }

  /**
   * تنفيذ استعلام SQL مخصص مع التعامل الذكي مع الأخطاء
   */
  static async execute(
    query: SQL,
    context?: Partial<ErrorContext>
  ): Promise<any> {
    const startTime = Date.now();
    const operation: ErrorContext = {
      operation: 'select',
      tableName: context?.tableName || 'custom_query',
      queryExecuted: query.queryChunks?.join(' ') || 'custom query',
      ...context
    };

    try {
      console.log(`🔄 تنفيذ استعلام مخصص`);
      
      const result = await db.execute(query);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ تم تنفيذ الاستعلام المخصص بنجاح في ${executionTime}ms`);
      return result;
      
    } catch (error: any) {
      operation.executionTime = Date.now() - startTime;
      
      console.log(`❌ خطأ في الاستعلام المخصص: ${error.message}`);
      
      await smartErrorHandler.handleDatabaseError(error, operation, true);
      throw error;
    }
  }

  /**
   * دالة مساعدة لتحديد السياق تلقائياً من معلومات الطلب
   */
  static createContext(req?: any): Partial<ErrorContext> {
    if (!req) return {};
    
    return {
      user_id: req.user?.user_id,
      project_id: req.body?.project_id || req.params?.project_id || req.query?.project_id,
      additionalContext: {
        userAgent: req.headers?.['user-agent'],
        ip: req.ip,
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * دوال مساعدة سريعة للاستخدام المباشر
 */

// Insert مع السياق التلقائي
export const smartInsert = async (table: any, values: any, req?: any) => {
  return DrizzleWrapper.insert(table, values, DrizzleWrapper.createContext(req));
};

// Update مع السياق التلقائي  
export const smartUpdate = async (table: any, where: any, values: any, req?: any) => {
  return DrizzleWrapper.update(table, where, values, DrizzleWrapper.createContext(req));
};

// Delete مع السياق التلقائي
export const smartDelete = async (table: any, where: any, req?: any) => {
  return DrizzleWrapper.delete(table, where, DrizzleWrapper.createContext(req));
};

// Select مع السياق التلقائي
export const smartSelect = async (query: any, tableName?: string, req?: any) => {
  const context = DrizzleWrapper.createContext(req);
  if (tableName) context.tableName = tableName;
  return DrizzleWrapper.select(query, context);
};

// Execute مع السياق التلقائي
export const smartExecute = async (query: SQL, req?: any, tableName?: string) => {
  const context = DrizzleWrapper.createContext(req);
  if (tableName) context.tableName = tableName;
  return DrizzleWrapper.execute(query, context);
};