/**
 * 🚀 سكربت تطبيق المخطط التلقائي الذكي مع التحقق والمعالجة
 * يتم تشغيله مرة واحدة عند بدء التطبيق
 * يتعامل تلقائياً مع جميع التفاعلات المطلوبة
 * 
 * المميزات:
 * ✅ كشف ذكي للتغييرات في المخطط
 * ✅ مقارنة المخطط مع قاعدة البيانات ديناميكياً
 * ✅ معالجة تلقائية للاختلافات
 * ✅ إرسال تحذيرات للمسؤول عبر نظام الإشعارات
 * ✅ إجابة تلقائية على جميع الأسئلة
 * ✅ نظام قفل لمنع التشغيل المتكرر
 * ✅ معالجة أخطاء متقدمة
 * ✅ تسجيل مفصل للعمليات
 * ✅ إصلاح تلقائي للمشاكل المكتشفة
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './db';
import { sql, Table } from 'drizzle-orm';
import * as schema from '../shared/schema';
import BackupManager from './backup-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCK_FILE = join(__dirname, '../.schema-push.lock');
const MAX_AGE_HOURS = 24;
const AUTO_FIX_ENABLED = true;
const BACKUP_MANAGER = new BackupManager({
  backupDir: join(__dirname, '../backups/schema-push'),
  maxBackups: 10,
  retentionDays: 30
});

type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface SchemaIssue {
  type: 'missing_table' | 'extra_table' | 'missing_column' | 'extra_column' | 'type_mismatch';
  severity: IssueSeverity;
  entity: string;
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

interface SchemaCheckResult {
  isConsistent: boolean;
  missingTables: string[];
  extraTables: string[];
  missingColumns: Array<{ table: string; column: string; type?: string }>;
  extraColumns: Array<{ table: string; column: string }>;
  fixableIssues: number;
  criticalIssues: number;
  issues: SchemaIssue[];
}

interface LockFileData {
  timestamp: string;
  success: boolean;
  version: string;
  lastCheck?: SchemaCheckResult;
}

interface SchemaAuditLog {
  timestamp: string;
  action: string;
  severity: IssueSeverity;
  details: any;
  result: 'success' | 'failed' | 'pending';
}

/**
 * التحقق مما إذا كان الكائن جدول Drizzle حقيقي باستخدام Table.Symbol
 */
function isDrizzleTable(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  try {
    // الطريقة الموثوقة: استخدام Drizzle Table Symbol
    const isTable = obj[Table.Symbol.IsTable] === true;
    if (isTable) return true;
    
    // طريقة احتياطية: فحص البنية
    const hasTableSymbol = Object.getOwnPropertySymbols(obj).some(
      sym => sym.toString().includes('drizzle') || sym.toString().includes('Table')
    );
    
    if (hasTableSymbol) return true;
    
    // فحص خصائص الجدول التقليدية
    const hasTableProperties = 
      '_' in obj && 
      typeof obj._ === 'object' &&
      obj._.name;
    
    return hasTableProperties;
  } catch {
    return false;
  }
}

/**
 * استخراج اسم الجدول من كائن Drizzle Table
 */
function getTableName(tableObj: any): string | undefined {
  try {
    // الطريقة الموثوقة: استخدام Table.Symbol.Name
    const symbolName = tableObj[Table.Symbol.Name];
    if (symbolName && typeof symbolName === 'string') {
      return symbolName;
    }
    
    // طريقة احتياطية: استخدام _.name
    if (tableObj._ && tableObj._.name) {
      return tableObj._.name;
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * استخراج أسماء الجداول من المخطط المعرف في الكود
 * يستخدم Drizzle Table.Symbol للكشف الموثوق والديناميكي
 */
function getExpectedTablesFromSchema(): string[] {
  const tables: string[] = [];
  const seen = new Set<string>();
  
  console.log('🔍 [Schema Detection] بدء الكشف الديناميكي عن الجداول...');
  
  for (const [key, value] of Object.entries(schema)) {
    // تخطي العلاقات والأنواع والتعريفات
    if (key.endsWith('Relations') || 
        key.endsWith('Enum') || 
        key.startsWith('_') || 
        key.endsWith('Schema') ||
        key.startsWith('insert') ||
        key.startsWith('update') ||
        key.startsWith('Insert') ||
        key.startsWith('Update')) {
      continue;
    }
    
    if (isDrizzleTable(value)) {
      const tableName = getTableName(value);
      
      if (tableName && !tableName.startsWith('_') && !seen.has(tableName)) {
        seen.add(tableName);
        tables.push(tableName);
      }
    }
  }
  
  console.log(`📊 [Schema Detection] تم اكتشاف ${tables.length} جدول ديناميكياً`);
  
  if (tables.length === 0) {
    console.log('⚠️ [Schema Detection] لم يتم اكتشاف أي جداول! تفاصيل المخطط:');
    console.log('   عدد المُصدَّرات:', Object.keys(schema).length);
    
    // محاولة أخيرة: فحص كل المصدرات
    for (const [key, value] of Object.entries(schema)) {
      if (value && typeof value === 'object') {
        const symbols = Object.getOwnPropertySymbols(value);
        if (symbols.length > 0) {
          console.log(`   ${key}: يحتوي على ${symbols.length} رموز`);
        }
      }
    }
  }
  
  return tables;
}

/**
 * استخراج الأعمدة المتوقعة من جدول معين في المخطط
 * يستخدم Table.Symbol.Columns للكشف الموثوق
 */
function getExpectedColumnsFromTable(tableName: string): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  
  for (const [key, value] of Object.entries(schema)) {
    if (!isDrizzleTable(value)) continue;
    
    const tableObj = value as any;
    const tblName = getTableName(tableObj);
    
    if (tblName === tableName) {
      try {
        // الطريقة الموثوقة: استخدام Table.Symbol.Columns
        const tableColumns = tableObj[Table.Symbol.Columns];
        if (tableColumns && typeof tableColumns === 'object') {
          for (const colKey of Object.keys(tableColumns)) {
            const col = tableColumns[colKey];
            if (col && col.name && !seen.has(col.name)) {
              seen.add(col.name);
              columns.push(col.name);
            }
          }
        }
      } catch {
        // طريقة احتياطية: فحص الأعمدة مباشرة
        for (const colKey of Object.keys(tableObj)) {
          if (colKey === '_' || colKey === 'name' || colKey.startsWith('$')) continue;
          
          const col = tableObj[colKey];
          if (col && typeof col === 'object' && 'name' in col) {
            const isColumn = 'dataType' in col || 'columnType' in col || 
                            'default' in col || 'notNull' in col || 'primary' in col;
            
            if (isColumn && !seen.has(col.name)) {
              seen.add(col.name);
              columns.push(col.name);
            }
          }
        }
      }
      break;
    }
  }
  
  return columns;
}

/**
 * التحقق مما إذا كان يجب تشغيل تطبيق المخطط
 */
async function shouldRunPush(): Promise<boolean> {
  if (!existsSync(LOCK_FILE)) {
    console.log('📝 [Schema Push] لا يوجد ملف قفل، سيتم التشغيل');
    return true;
  }

  try {
    const lockData: LockFileData = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
    const lastRun = new Date(lockData.timestamp);
    const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastRun > MAX_AGE_HOURS) {
      console.log(`⏰ [Schema Push] مر ${hoursSinceLastRun.toFixed(1)} ساعة، سيتم التشغيل`);
      return true;
    }
    
    console.log(`⏭️ [Schema Push] تم التطبيق مؤخراً (منذ ${hoursSinceLastRun.toFixed(1)} ساعة)`);
    return false;
  } catch (error) {
    console.log('⚠️ [Schema Push] ملف القفل تالف، سيتم التشغيل');
    return true;
  }
}

/**
 * إنشاء ملف قفل لمنع التشغيل المتكرر
 */
function createLockFile(success: boolean = true, checkResult?: SchemaCheckResult): void {
  try {
    const lockData: LockFileData = {
      timestamp: new Date().toISOString(),
      success,
      version: '3.0',
      lastCheck: checkResult
    };
    writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
    console.log('✅ [Schema Push] تم إنشاء ملف القفل');
  } catch (error) {
    console.error('❌ [Schema Push] فشل إنشاء ملف القفل:', error);
  }
}

/**
 * تحديد خطورة المشكلة
 */
function determineIssueSeverity(issueType: string, entity: string): IssueSeverity {
  if (issueType === 'missing_table') {
    return 'high';
  }
  if (issueType === 'missing_column') {
    if (['id', 'user_id', 'created_at', 'project_id'].includes(entity)) {
      return 'critical';
    }
    return 'high';
  }
  if (issueType === 'extra_table') {
    return 'medium';
  }
  if (issueType === 'extra_column') {
    return 'low';
  }
  return 'info';
}

/**
 * إنشاء اقتراح حل للمشكلة
 */
function generateSuggestion(issueType: string, entity: string, tableName?: string): string {
  switch (issueType) {
    case 'missing_table':
      return `قم بتشغيل 'npx drizzle-kit push' لإنشاء الجدول "${entity}" في قاعدة البيانات، أو تأكد من تعريف الجدول بشكل صحيح في ملف schema.ts`;
    case 'extra_table':
      return `الجدول "${entity}" موجود في قاعدة البيانات ولكن غير معرف في المخطط. إما أضفه لملف schema.ts إذا كان مطلوباً، أو احذفه من قاعدة البيانات إذا لم يعد مستخدماً`;
    case 'missing_column':
      return `العمود "${entity}" مفقود في جدول "${tableName}". قم بتشغيل 'npx drizzle-kit push' لإضافته، أو راجع تعريف الجدول في schema.ts`;
    case 'extra_column':
      return `العمود "${entity}" موجود في جدول "${tableName}" ولكن غير معرف في المخطط. أضفه للمخطط أو احذفه من قاعدة البيانات`;
    default:
      return 'راجع التعريفات وتأكد من التوافق';
  }
}

/**
 * التحقق من توافق المخطط مع قاعدة البيانات ديناميكياً
 */
async function checkSchemaConsistency(): Promise<SchemaCheckResult> {
  console.log('🔍 [Schema Check] بدء التحقق من توافق المخطط...');
  
  const issues: SchemaIssue[] = [];
  
  try {
    const dbTablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const dbTables = dbTablesResult.rows.map((row: any) => row.table_name);
    const expectedTables = getExpectedTablesFromSchema();
    
    const missingTables = expectedTables.filter(table => !dbTables.includes(table));
    const extraTables = dbTables.filter((table: string) => 
      !expectedTables.includes(table) && 
      !table.startsWith('drizzle') &&
      !table.startsWith('pg_') &&
      table !== '__drizzle_migrations'
    );
    
    for (const table of missingTables) {
      issues.push({
        type: 'missing_table',
        severity: determineIssueSeverity('missing_table', table),
        entity: table,
        description: `الجدول "${table}" معرف في المخطط ولكن غير موجود في قاعدة البيانات`,
        suggestion: generateSuggestion('missing_table', table),
        autoFixable: true
      });
    }
    
    for (const table of extraTables) {
      issues.push({
        type: 'extra_table',
        severity: determineIssueSeverity('extra_table', table),
        entity: table,
        description: `الجدول "${table}" موجود في قاعدة البيانات ولكن غير معرف في المخطط`,
        suggestion: generateSuggestion('extra_table', table),
        autoFixable: false
      });
    }
    
    const missingColumns: Array<{ table: string; column: string; type?: string }> = [];
    const extraColumns: Array<{ table: string; column: string }> = [];
    const missingDefaults: Array<{ table: string; column: string; isNullable: boolean }> = [];
    
    for (const tableName of expectedTables) {
      if (!dbTables.includes(tableName)) continue;
      
      const columnsResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      `);
      
      const dbColumns = columnsResult.rows.map((row: any) => row.column_name);
      const expectedColumns = getExpectedColumnsFromTable(tableName);
      
      // فحص DEFAULT values للأعمدة التي لا تقبل NULL
      for (const dbCol of columnsResult.rows) {
        const isNullable = dbCol.is_nullable === 'YES';
        const hasDefault = dbCol.column_default !== null;
        
        // إذا كان العمود NOT NULL وليس له DEFAULT value
        if (!isNullable && !hasDefault && expectedColumns.includes(dbCol.column_name)) {
          missingDefaults.push({ 
            table: tableName, 
            column: dbCol.column_name,
            isNullable: false
          });
          issues.push({
            type: 'missing_column',
            severity: 'high',
            entity: `${tableName}.${dbCol.column_name}`,
            description: `العمود "${dbCol.column_name}" في جدول "${tableName}" لا يملك قيمة افتراضية (DEFAULT) وهو NOT NULL، مما سيسبب أخطاء عند الإدراج`,
            suggestion: `أضف DEFAULT value للعمود في قاعدة البيانات: ALTER TABLE "${tableName}" ALTER COLUMN "${dbCol.column_name}" SET DEFAULT [value];`,
            autoFixable: true
          });
        }
      }
      
      for (const col of expectedColumns) {
        if (!dbColumns.includes(col)) {
          missingColumns.push({ table: tableName, column: col });
          issues.push({
            type: 'missing_column',
            severity: determineIssueSeverity('missing_column', col),
            entity: `${tableName}.${col}`,
            description: `العمود "${col}" معرف في جدول "${tableName}" في المخطط ولكن غير موجود في قاعدة البيانات`,
            suggestion: generateSuggestion('missing_column', col, tableName),
            autoFixable: true
          });
        }
      }
      
      for (const col of dbColumns) {
        if (!expectedColumns.includes(col) && col !== 'id') {
          extraColumns.push({ table: tableName, column: col });
          issues.push({
            type: 'extra_column',
            severity: determineIssueSeverity('extra_column', col),
            entity: `${tableName}.${col}`,
            description: `العمود "${col}" موجود في جدول "${tableName}" في قاعدة البيانات ولكن غير معرف في المخطط`,
            suggestion: generateSuggestion('extra_column', col, tableName),
            autoFixable: false
          });
        }
      }
    }
    
    const fixableIssues = missingTables.length + missingColumns.length;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    
    const isConsistent = missingTables.length === 0 && 
                        missingColumns.length === 0;
    
    console.log(`📊 [Schema Check] الجداول المفقودة: ${missingTables.length}`);
    console.log(`📊 [Schema Check] الجداول الزائدة: ${extraTables.length}`);
    console.log(`📊 [Schema Check] الأعمدة المفقودة: ${missingColumns.length}`);
    console.log(`📊 [Schema Check] المشاكل القابلة للإصلاح: ${fixableIssues}`);
    console.log(`📊 [Schema Check] إجمالي المشاكل: ${issues.length}`);
    
    if (missingTables.length > 0) {
      console.log(`   الجداول المفقودة: ${missingTables.join(', ')}`);
    }
    if (missingColumns.length > 0) {
      console.log(`   الأعمدة المفقودة:`);
      missingColumns.forEach(c => console.log(`     - ${c.table}.${c.column}`));
    }
    
    return {
      isConsistent,
      missingTables,
      extraTables,
      missingColumns,
      extraColumns,
      fixableIssues,
      criticalIssues,
      issues
    };
  } catch (error) {
    console.error('❌ [Schema Check] خطأ في التحقق:', error);
    return {
      isConsistent: false,
      missingTables: [],
      extraTables: [],
      missingColumns: [],
      extraColumns: [],
      fixableIssues: 0,
      criticalIssues: 1,
      issues: [{
        type: 'missing_table',
        severity: 'critical',
        entity: 'database_connection',
        description: 'فشل الاتصال بقاعدة البيانات أو خطأ في الاستعلام',
        suggestion: 'تحقق من اتصال قاعدة البيانات ومتغيرات البيئة',
        autoFixable: false
      }]
    };
  }
}

/**
 * تحويل نوع العمود من Drizzle إلى PostgreSQL
 */
function getPostgresType(columnDef: any): string {
  if (!columnDef) return 'text';
  
  const dataType = columnDef.dataType || columnDef.columnType || '';
  const typeName = String(dataType).toLowerCase();
  
  if (typeName.includes('serial')) return 'serial';
  if (typeName.includes('integer') || typeName.includes('int4')) return 'integer';
  if (typeName.includes('bigint') || typeName.includes('int8')) return 'bigint';
  if (typeName.includes('smallint') || typeName.includes('int2')) return 'smallint';
  if (typeName.includes('boolean') || typeName.includes('bool')) return 'boolean';
  if (typeName.includes('timestamp')) return 'timestamp';
  if (typeName.includes('date')) return 'date';
  if (typeName.includes('time')) return 'time';
  if (typeName.includes('numeric') || typeName.includes('decimal')) return 'numeric';
  if (typeName.includes('real') || typeName.includes('float4')) return 'real';
  if (typeName.includes('double') || typeName.includes('float8')) return 'double precision';
  if (typeName.includes('json')) return 'jsonb';
  if (typeName.includes('uuid')) return 'uuid';
  if (typeName.includes('varchar')) {
    const length = columnDef.length || 255;
    return `varchar(${length})`;
  }
  if (typeName.includes('char')) {
    const length = columnDef.length || 1;
    return `char(${length})`;
  }
  
  return 'text';
}

/**
 * الحصول على تعريف العمود الافتراضي
 */
function getDefaultValue(columnDef: any): string | null {
  if (!columnDef) return null;
  
  if (columnDef.hasDefault && columnDef.default !== undefined) {
    const def = columnDef.default;
    if (def === null) return 'NULL';
    if (typeof def === 'string') return `'${def}'`;
    if (typeof def === 'number') return String(def);
    if (typeof def === 'boolean') return def ? 'true' : 'false';
    if (def && typeof def === 'object' && 'sql' in def) {
      return String(def.sql || 'NULL');
    }
  }
  
  return null;
}

/**
 * إنشاء جدول مفقود باستخدام SQL مباشر
 */
async function createMissingTable(tableName: string): Promise<boolean> {
  try {
    console.log(`📝 [SQL Fix] إنشاء جدول ${tableName}...`);
    
    for (const [key, value] of Object.entries(schema)) {
      if (!isDrizzleTable(value)) continue;
      
      const tableObj = value as any;
      const tblName = getTableName(tableObj);
      
      if (tblName === tableName) {
        const columns: string[] = [];
        const tableColumns = tableObj[Table.Symbol.Columns];
        
        if (tableColumns) {
          for (const colKey of Object.keys(tableColumns)) {
            const col = tableColumns[colKey];
            if (!col || !col.name) continue;
            
            const pgType = getPostgresType(col);
            const notNull = col.notNull ? ' NOT NULL' : '';
            const defaultVal = getDefaultValue(col);
            const defaultClause = defaultVal ? ` DEFAULT ${defaultVal}` : '';
            const primaryKey = col.primary ? ' PRIMARY KEY' : '';
            
            if (pgType === 'serial') {
              columns.push(`"${col.name}" serial${primaryKey}`);
            } else {
              columns.push(`"${col.name}" ${pgType}${notNull}${defaultClause}${primaryKey}`);
            }
          }
        }
        
        if (columns.length > 0) {
          const createSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columns.join(',\n  ')}\n)`;
          console.log(`   SQL: ${createSQL.substring(0, 100)}...`);
          await db.execute(sql.raw(createSQL));
          console.log(`✅ [SQL Fix] تم إنشاء جدول ${tableName}`);
          return true;
        }
        break;
      }
    }
    
    console.log(`⚠️ [SQL Fix] لم يتم العثور على تعريف الجدول ${tableName}`);
    return false;
  } catch (error) {
    console.error(`❌ [SQL Fix] فشل إنشاء جدول ${tableName}:`, error);
    return false;
  }
}

/**
 * إضافة عمود مفقود باستخدام SQL مباشر
 * ملاحظة: لا نضيف NOT NULL للأعمدة الجديدة لتجنب مشاكل البيانات الموجودة
 * يمكن تحديثها لاحقاً عبر drizzle-kit push يدوياً
 */
async function addMissingColumn(tableName: string, columnName: string): Promise<boolean> {
  try {
    console.log(`📝 [SQL Fix] إضافة عمود ${columnName} إلى ${tableName}...`);
    
    for (const [key, value] of Object.entries(schema)) {
      if (!isDrizzleTable(value)) continue;
      
      const tableObj = value as any;
      const tblName = getTableName(tableObj);
      
      if (tblName === tableName) {
        const tableColumns = tableObj[Table.Symbol.Columns];
        
        if (tableColumns) {
          for (const colKey of Object.keys(tableColumns)) {
            const col = tableColumns[colKey];
            if (col && col.name === columnName) {
              const pgType = getPostgresType(col);
              const defaultVal = getDefaultValue(col);
              
              let alterSQL: string;
              if (pgType === 'serial') {
                alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" integer`;
              } else {
                // إضافة DEFAULT أولاً، ثم يمكن إضافة NOT NULL لاحقاً إذا لزم الأمر
                const defaultClause = defaultVal ? ` DEFAULT ${defaultVal}` : '';
                alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" ${pgType}${defaultClause}`;
              }
              
              console.log(`   SQL: ${alterSQL}`);
              await db.execute(sql.raw(alterSQL));
              console.log(`✅ [SQL Fix] تم إضافة عمود ${columnName} إلى ${tableName}`);
              
              // تحذير إذا كان العمود يحتاج NOT NULL
              if (col.notNull) {
                console.log(`   ℹ️ العمود ${columnName} يحتاج NOT NULL - يمكن تطبيقه يدوياً لاحقاً`);
              }
              
              return true;
            }
          }
        }
        break;
      }
    }
    
    console.log(`⚠️ [SQL Fix] لم يتم العثور على تعريف العمود ${columnName} في ${tableName}`);
    return false;
  } catch (error) {
    console.error(`❌ [SQL Fix] فشل إضافة عمود ${columnName} إلى ${tableName}:`, error);
    return false;
  }
}

/**
 * محاولة إصلاح المشاكل تلقائياً باستخدام SQL مباشر
 */
async function attemptAutoFix(checkResult: SchemaCheckResult): Promise<{ success: boolean; newCheckResult: SchemaCheckResult }> {
  if (!AUTO_FIX_ENABLED) {
    console.log('⚠️ [Auto Fix] الإصلاح التلقائي معطل');
    return { success: false, newCheckResult: checkResult };
  }
  
  if (checkResult.isConsistent) {
    console.log('✅ [Auto Fix] لا توجد مشاكل تحتاج إصلاح');
    return { success: true, newCheckResult: checkResult };
  }
  
  console.log('🔧 [Auto Fix] بدء الإصلاح التلقائي باستخدام SQL مباشر...');
  console.log(`   الجداول المفقودة: ${checkResult.missingTables.length}`);
  console.log(`   الأعمدة المفقودة: ${checkResult.missingColumns.length}`);
  
  let fixedCount = 0;
  let failedCount = 0;
  
  // إنشاء الجداول المفقودة
  for (const tableName of checkResult.missingTables) {
    const success = await createMissingTable(tableName);
    if (success) {
      fixedCount++;
    } else {
      failedCount++;
    }
  }
  
  // إضافة الأعمدة المفقودة
  for (const { table, column } of checkResult.missingColumns) {
    const success = await addMissingColumn(table, column);
    if (success) {
      fixedCount++;
    } else {
      failedCount++;
    }
  }
  
  console.log(`📊 [Auto Fix] النتيجة: ${fixedCount} إصلاح ناجح، ${failedCount} فشل`);
  
  // إعادة التحقق
  console.log('🔍 [Auto Fix] إعادة التحقق من المخطط...');
  const newCheckResult = await checkSchemaConsistency();
  
  if (newCheckResult.isConsistent) {
    console.log('✅ [Auto Fix] تم إصلاح جميع المشاكل بنجاح!');
    return { success: true, newCheckResult };
  } else {
    const remainingIssues = newCheckResult.fixableIssues;
    console.log(`⚠️ [Auto Fix] بقي ${remainingIssues} مشكلة`);
    
    // محاولة استخدام drizzle-kit push كخطة بديلة
    if (remainingIssues > 0 && failedCount > 0) {
      console.log('🔄 [Auto Fix] محاولة استخدام drizzle-kit push كخطة بديلة...');
      const pushResult = await runDrizzlePush();
      
      if (pushResult.success) {
        console.log('✅ [Auto Fix] تم تنفيذ drizzle push بنجاح');
        const finalCheckResult = await checkSchemaConsistency();
        return { success: finalCheckResult.isConsistent, newCheckResult: finalCheckResult };
      }
    }
    
    return { success: false, newCheckResult };
  }
}

/**
 * تحويل الخطورة إلى أولوية الإشعار
 */
function severityToPriority(severity: IssueSeverity): number {
  switch (severity) {
    case 'critical': return 5;
    case 'high': return 4;
    case 'medium': return 3;
    case 'low': return 2;
    case 'info': return 1;
    default: return 1;
  }
}

/**
 * إنشاء ملخص المشاكل للإشعار
 */
function createIssuesSummary(issues: SchemaIssue[]): string {
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low')
  };

  let summary = '';
  
  if (bySeverity.critical.length > 0) {
    summary += `🚨 مشاكل حرجة (${bySeverity.critical.length}):\n`;
    bySeverity.critical.slice(0, 3).forEach(i => {
      summary += `  • ${i.description}\n    💡 ${i.suggestion}\n`;
    });
  }
  
  if (bySeverity.high.length > 0) {
    summary += `⚠️ مشاكل عالية الخطورة (${bySeverity.high.length}):\n`;
    bySeverity.high.slice(0, 3).forEach(i => {
      summary += `  • ${i.description}\n`;
    });
  }
  
  if (bySeverity.medium.length > 0) {
    summary += `📋 مشاكل متوسطة (${bySeverity.medium.length}):\n`;
    if (bySeverity.medium.length <= 5) {
      bySeverity.medium.forEach(i => {
        summary += `  • ${i.entity}\n`;
      });
    } else {
      summary += `  • ${bySeverity.medium.slice(0, 5).map(i => i.entity).join(', ')} و${bySeverity.medium.length - 5} أخرى\n`;
    }
  }
  
  if (bySeverity.low.length > 0) {
    summary += `ℹ️ مشاكل منخفضة الخطورة: ${bySeverity.low.length}\n`;
  }
  
  return summary;
}

/**
 * إرسال تحذير للمسؤول عبر نظام الإشعارات
 */
async function sendAdminNotification(
  title: string, 
  message: string, 
  details: any
): Promise<void> {
  try {
    const { NotificationService } = await import('./services/NotificationService');
    const notificationService = new NotificationService();
    
    const priority = details.severity === 'critical' ? 5 :
                    details.severity === 'high' ? 4 :
                    details.severity === 'warning' ? 3 : 2;
    
    const result = await notificationService.createNotification({
      type: 'system',
      title: title,
      body: message,
      priority: priority,
      recipients: ['admin'],
      payload: {
        ...details,
        timestamp: new Date().toISOString(),
        action: 'review_schema',
        route: '/admin/schema-management'
      },
      channelPreference: {
        push: true,
        email: priority >= 4,
        sms: priority >= 5
      }
    });
    
    console.log(`📧 [Notification] تم إرسال إشعار للمسؤول (${result.id})`);
  } catch (error: any) {
    console.error('❌ [Notification] فشل في إرسال الإشعار:', {
      errorMessage: error?.message || 'خطأ غير معروف',
      errorName: error?.name,
      errorCode: error?.code,
      stack: error?.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'لا توجد stack trace'
    });
  }
}

/**
 * إرسال تقرير المخطط الشامل للمسؤول
 */
async function sendSchemaReport(checkResult: SchemaCheckResult): Promise<void> {
  if (checkResult.issues.length === 0) {
    console.log('✅ [Schema Report] المخطط متوافق، لا حاجة لإرسال تقرير');
    return;
  }
  
  const hasExtraTables = checkResult.extraTables.length > 0;
  const hasMissingItems = checkResult.missingTables.length > 0 || checkResult.missingColumns.length > 0;
  
  const highestSeverity = checkResult.issues.reduce((max, issue) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return severityOrder[issue.severity] > severityOrder[max] ? issue.severity : max;
  }, 'info' as IssueSeverity);
  
  const summary = createIssuesSummary(checkResult.issues);
  
  let title = '';
  if (highestSeverity === 'critical') {
    title = '🚨 تقرير المخطط: مشاكل حرجة تحتاج تدخل فوري';
  } else if (highestSeverity === 'high') {
    title = '⚠️ تقرير المخطط: مشاكل تحتاج مراجعة';
  } else if (hasExtraTables) {
    title = '📋 تقرير المخطط: جداول غير معرفة في المخطط';
  } else {
    title = 'ℹ️ تقرير المخطط: ملاحظات للمراجعة';
  }
  
  const message = `تم اكتشاف ${checkResult.issues.length} مشكلة في توافق المخطط:\n\n${summary}`;
  
  await sendAdminNotification(title, message, {
    severity: highestSeverity,
    totalIssues: checkResult.issues.length,
    criticalCount: checkResult.criticalIssues,
    fixableCount: checkResult.fixableIssues,
    extraTablesCount: checkResult.extraTables.length,
    missingTablesCount: checkResult.missingTables.length,
    missingColumnsCount: checkResult.missingColumns.length,
    issues: checkResult.issues,
    extraTables: checkResult.extraTables,
    suggestedActions: hasMissingItems 
      ? ['تشغيل npx drizzle-kit push لإصلاح المشاكل القابلة للإصلاح']
      : ['مراجعة الجداول الزائدة وتحديد ما يجب فعله بها'],
    autoFixAttempted: hasMissingItems,
    requiresManualReview: hasExtraTables || !hasMissingItems
  });
  
  console.log(`📊 [Schema Report] تم إرسال تقرير بـ ${checkResult.issues.length} مشكلة`);
}

/**
 * الإجابات التلقائية الذكية على أسئلة drizzle-kit
 */
const AUTO_ANSWERS = [
  'y\n',
  'yes\n',
  'Y\n',
  'Yes\n',
  '1\n',
  '\n'
];

/**
 * تشغيل drizzle-kit push
 */
function runDrizzlePush(): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const pushProcess = spawn('npx', ['drizzle-kit', 'push', '--force'], {
      cwd: join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NODE_NO_WARNINGS: '1'
      }
    });

    let answerIndex = 0;
    let output = '';
    let hasResponded = false;
    let hasErrors = false;

    pushProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      
      const lines = text.split('\n').filter((line: string) => line.trim());
      lines.forEach((line: string) => {
        if (line.trim()) {
          console.log(`   ${line}`);
        }
      });

      const lowerText = text.toLowerCase();
      const needsAnswer = 
        lowerText.includes('continue?') ||
        lowerText.includes('proceed?') ||
        lowerText.includes('confirm') ||
        lowerText.includes('(y/n)') ||
        lowerText.includes('yes/no') ||
        lowerText.includes('apply') ||
        lowerText.includes('push') ||
        lowerText.includes('changes detected') ||
        lowerText.includes('schema changes') ||
        lowerText.includes('drop') ||
        lowerText.includes('delete') ||
        lowerText.includes('remove') ||
        lowerText.includes('?');

      if (needsAnswer && !hasResponded) {
        const answer = AUTO_ANSWERS[answerIndex % AUTO_ANSWERS.length];
        console.log(`\n✅ [Schema Push] إجابة تلقائية: ${answer.trim()}`);
        pushProcess.stdin.write(answer);
        hasResponded = true;
        answerIndex++;
        
        setTimeout(() => { hasResponded = false; }, 500);
      }
    });

    pushProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      const lowerError = error.toLowerCase();
      
      if (lowerError.includes('deprecat') || 
          lowerError.includes('warning') ||
          lowerError.includes('experimental')) {
        return;
      }
      
      hasErrors = true;
      output += `[ERROR] ${error}`;
      console.error('⚠️ [Schema Push]', error);
    });

    pushProcess.on('close', (code: number | null) => {
      resolve({
        success: code === 0 && !hasErrors,
        output
      });
    });

    pushProcess.on('error', (error: Error) => {
      resolve({
        success: false,
        output: `Process error: ${error.message}`
      });
    });

    setTimeout(() => {
      if (!hasResponded) {
        console.log('🤖 [Schema Push] إرسال إجابة استباقية...');
        pushProcess.stdin.write('y\n');
      }
    }, 1000);

    setTimeout(() => {
      if (pushProcess.exitCode === null) {
        console.log('⏱️ [Schema Push] انتهت المهلة (90 ثانية)');
        pushProcess.kill('SIGTERM');
        
        setTimeout(() => {
          if (pushProcess.exitCode === null) {
            console.log('🔨 [Schema Push] إنهاء قوي...');
            pushProcess.kill('SIGKILL');
          }
        }, 5000);
        
        resolve({
          success: false,
          output: 'Timeout exceeded'
        });
      }
    }, 90000);
  });
}

/**
 * تطبيق المخطط التلقائي مع معالجة ذكية
 */
export async function autoSchemaPush(): Promise<void> {
  console.log('🚀 [Schema Push] بدء النظام الذكي للتحقق والتطبيق...');
  console.log('═'.repeat(60));
  
  let consistencyCheck = await checkSchemaConsistency();
  let skipLockCheck = false;
  
  await sendSchemaReport(consistencyCheck);
  
  if (!consistencyCheck.isConsistent || consistencyCheck.extraTables.length > 0) {
    console.log('⚠️ [Schema Check] تم اكتشاف اختلافات في المخطط!');
    
    if (consistencyCheck.criticalIssues > 0) {
      console.log('🚨 [Schema Check] مشاكل حرجة! سيتم تجاوز فحص القفل');
      skipLockCheck = true;
    }
    
    if (AUTO_FIX_ENABLED && consistencyCheck.fixableIssues > 0) {
      const fixResult = await attemptAutoFix(consistencyCheck);
      consistencyCheck = fixResult.newCheckResult;
      
      if (fixResult.success) {
        console.log('✅ [Auto Fix] تم الإصلاح التلقائي بنجاح');
        await sendAdminNotification(
          '✅ تم الإصلاح التلقائي للمخطط',
          'تم إصلاح جميع المشاكل القابلة للإصلاح تلقائياً',
          { severity: 'info', autoFixed: true }
        );
        createLockFile(true, consistencyCheck);
        console.log('═'.repeat(60) + '\n');
        return;
      } else {
        console.log('⚠️ [Auto Fix] بقيت مشاكل، سيتم تجاوز فحص القفل');
        skipLockCheck = true;
      }
    }
  }
  
  if (!consistencyCheck.isConsistent && consistencyCheck.fixableIssues > 0) {
    console.log('🔄 [Schema Push] توجد مشاكل قابلة للإصلاح، سيتم تجاوز القفل');
    skipLockCheck = true;
  }
  
  const should = skipLockCheck || await shouldRunPush();
  
  if (!should) {
    console.log('⏭️ [Schema Push] تم تخطي التطبيق (تم التشغيل مؤخراً)');
    return;
  }

  console.log('📍 [Schema Push] المجلد:', join(__dirname, '..'));
  console.log('═'.repeat(60));

  // إنشاء نسخة احتياطية إذا كانت هناك مشاكل قابلة للإصلاح
  if (consistencyCheck.fixableIssues > 0) {
    console.log('💾 [Backup] بدء إنشاء نسخة احتياطية قبل التطبيق...');
    const backupResult = await BACKUP_MANAGER.createBackup(
      `تطبيق مخطط قاعدة البيانات - ${consistencyCheck.fixableIssues} مشكلة قابلة للإصلاح`,
      consistencyCheck.missingTables,
      consistencyCheck.extraTables,
      consistencyCheck.missingColumns,
      consistencyCheck.criticalIssues > 0 ? 'critical' : 'high'
    );

    if (backupResult.success) {
      console.log(`✅ [Backup] تم إنشاء النسخة الاحتياطية: ${backupResult.backupFile}`);
      
      await sendAdminNotification(
        '💾 تم إنشاء نسخة احتياطية من قاعدة البيانات',
        `تم حفظ نسخة احتياطية قبل تطبيق التغييرات:\n\nالمسار: ${backupResult.backupFile}\nالتاريخ: ${backupResult.manifest.timestamp}\nالجداول المحمية: ${backupResult.manifest.affectedTables.join(', ')}\nإجمالي الصفوف: ${backupResult.manifest.totalRows}\nحجم الملف: ${(backupResult.manifest.totalSize / 1024).toFixed(2)} KB`,
        {
          severity: 'info',
          backupFile: backupResult.backupFile,
          backupManifest: backupResult.manifest,
          timestamp: backupResult.manifest.timestamp
        }
      );
    } else {
      console.error(`❌ [Backup] فشل إنشاء النسخة الاحتياطية: ${backupResult.message}`);
    }
  }

  const result = await runDrizzlePush();
  
  console.log('\n' + '═'.repeat(60));
  
  if (result.success) {
    console.log('✅ [Schema Push] تم تطبيق المخطط بنجاح!');
    console.log('📊 [Schema Push] قاعدة البيانات محدثة ومتزامنة');
    
    console.log('🔍 [Schema Push] إعادة التحقق من المخطط بعد التطبيق...');
    const freshCheck = await checkSchemaConsistency();
    
    await sendAdminNotification(
      '✅ نجاح: تطبيق مخطط قاعدة البيانات',
      'تم تطبيق جميع التغييرات بنجاح على قاعدة البيانات',
      {
        timestamp: new Date().toISOString(),
        status: 'success',
        schemaStatus: freshCheck.isConsistent ? 'متوافق' : 'يحتاج مراجعة'
      }
    );
    
    createLockFile(true, freshCheck);
  } else {
    console.log('⚠️ [Schema Push] انتهى مع مشاكل');
    console.log('💡 [Schema Push] قد يكون المخطط محدث بالفعل أو توجد مشاكل تحتاج مراجعة');
    
    await sendAdminNotification(
      '❌ خطأ: فشل تطبيق مخطط قاعدة البيانات',
      'فشل التطبيق، يرجى مراجعة السجلات',
      {
        timestamp: new Date().toISOString(),
        status: 'failed',
        output: result.output.substring(0, 500),
        requiresManualIntervention: true
      }
    );
    
    createLockFile(false, consistencyCheck);
  }
  
  console.log('═'.repeat(60) + '\n');
}

/**
 * إجبار تطبيق المخطط (تجاهل ملف القفل)
 */
export function forceSchemaPush(): Promise<void> {
  console.log('🔓 [Schema Push] حذف ملف القفل للإجبار على التشغيل...');
  if (existsSync(LOCK_FILE)) {
    try {
      unlinkSync(LOCK_FILE);
      console.log('✅ [Schema Push] تم حذف ملف القفل');
    } catch (error) {
      console.error('❌ [Schema Push] فشل حذف ملف القفل:', error);
    }
  }
  return autoSchemaPush();
}

/**
 * التحقق من حالة نظام التطبيق التلقائي
 */
export function getAutoPushStatus(): {
  enabled: boolean;
  autoFixEnabled: boolean;
  lastRun: string | null;
  hoursSinceLastRun: number | null;
  lastCheck: SchemaCheckResult | null;
} {
  if (!existsSync(LOCK_FILE)) {
    return {
      enabled: true,
      autoFixEnabled: AUTO_FIX_ENABLED,
      lastRun: null,
      hoursSinceLastRun: null,
      lastCheck: null
    };
  }

  try {
    const lockData: LockFileData = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
    const lastRun = new Date(lockData.timestamp);
    const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    
    return {
      enabled: true,
      autoFixEnabled: AUTO_FIX_ENABLED,
      lastRun: lockData.timestamp,
      hoursSinceLastRun,
      lastCheck: lockData.lastCheck || null
    };
  } catch {
    return {
      enabled: true,
      autoFixEnabled: AUTO_FIX_ENABLED,
      lastRun: null,
      hoursSinceLastRun: null,
      lastCheck: null
    };
  }
}

/**
 * تشغيل فحص المخطط فقط بدون تطبيق
 */
export async function runSchemaCheck(): Promise<SchemaCheckResult> {
  console.log('🔍 [Schema Check] تشغيل فحص المخطط...');
  const result = await checkSchemaConsistency();
  
  if (result.isConsistent) {
    console.log('✅ [Schema Check] المخطط متوافق تماماً');
  } else {
    console.log('⚠️ [Schema Check] تم اكتشاف اختلافات');
  }
  
  return result;
}
