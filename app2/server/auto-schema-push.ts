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
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCK_FILE = join(__dirname, '../.schema-push.lock');
const MAX_AGE_HOURS = 24;
const AUTO_FIX_ENABLED = true;

interface SchemaCheckResult {
  isConsistent: boolean;
  missingTables: string[];
  extraTables: string[];
  missingColumns: Array<{ table: string; column: string; type?: string }>;
  extraColumns: Array<{ table: string; column: string }>;
  fixableIssues: number;
  criticalIssues: number;
}

interface LockFileData {
  timestamp: string;
  success: boolean;
  version: string;
  lastCheck?: SchemaCheckResult;
}

/**
 * التحقق مما إذا كان الكائن جدول Drizzle حقيقي
 */
function isDrizzleTable(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  const hasTableSymbol = Object.getOwnPropertySymbols(obj).some(
    sym => sym.toString().includes('drizzle') || sym.toString().includes('Table')
  );
  
  const hasTableProperties = 
    '_' in obj && 
    typeof obj._ === 'object' &&
    obj._.name && 
    (obj._.columns || obj._.schema !== undefined);
  
  const hasColumns = Object.keys(obj).some(key => {
    const col = obj[key];
    return col && typeof col === 'object' && 
           'name' in col && 
           ('dataType' in col || 'columnType' in col || 'default' in col);
  });
  
  const isNotRelation = !obj.referencedTable && !obj.referencedColumns;
  const isNotEnum = !Array.isArray(obj.enumValues);
  
  return (hasTableSymbol || hasTableProperties || hasColumns) && isNotRelation && isNotEnum;
}

/**
 * استخراج أسماء الجداول من المخطط المعرف في الكود
 */
function getExpectedTablesFromSchema(): string[] {
  const tables: string[] = [];
  const seen = new Set<string>();
  
  for (const [key, value] of Object.entries(schema)) {
    if (key.endsWith('Relations') || key.endsWith('Enum') || key.startsWith('_')) {
      continue;
    }
    
    if (isDrizzleTable(value)) {
      const tableObj = value as any;
      let tableName: string | undefined;
      
      if (tableObj._ && tableObj._.name) {
        tableName = tableObj._.name;
      } else if (tableObj.name && typeof tableObj.name === 'string') {
        tableName = tableObj.name;
      }
      
      if (tableName && !tableName.startsWith('_') && !seen.has(tableName)) {
        seen.add(tableName);
        tables.push(tableName);
      }
    }
  }
  
  return tables;
}

/**
 * استخراج الأعمدة المتوقعة من جدول معين في المخطط
 */
function getExpectedColumnsFromTable(tableName: string): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  
  for (const [key, value] of Object.entries(schema)) {
    if (!isDrizzleTable(value)) continue;
    
    const tableObj = value as any;
    let tblName: string | undefined;
    
    if (tableObj._ && tableObj._.name) {
      tblName = tableObj._.name;
    } else if (tableObj.name && typeof tableObj.name === 'string') {
      tblName = tableObj.name;
    }
    
    if (tblName === tableName) {
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
 * التحقق من توافق المخطط مع قاعدة البيانات ديناميكياً
 */
async function checkSchemaConsistency(): Promise<SchemaCheckResult> {
  console.log('🔍 [Schema Check] بدء التحقق من توافق المخطط...');
  
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
    
    const missingColumns: Array<{ table: string; column: string; type?: string }> = [];
    const extraColumns: Array<{ table: string; column: string }> = [];
    
    for (const tableName of expectedTables) {
      if (!dbTables.includes(tableName)) continue;
      
      const columnsResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      `);
      
      const dbColumns = columnsResult.rows.map((row: any) => row.column_name);
      const expectedColumns = getExpectedColumnsFromTable(tableName);
      
      for (const col of expectedColumns) {
        if (!dbColumns.includes(col)) {
          missingColumns.push({ table: tableName, column: col });
        }
      }
      
      for (const col of dbColumns) {
        if (!expectedColumns.includes(col) && col !== 'id') {
          extraColumns.push({ table: tableName, column: col });
        }
      }
    }
    
    const fixableIssues = missingTables.length + missingColumns.length;
    const criticalIssues = missingColumns.filter(c => 
      ['id', 'created_at', 'user_id'].includes(c.column)
    ).length;
    
    const isConsistent = missingTables.length === 0 && 
                        missingColumns.length === 0;
    
    console.log(`📊 [Schema Check] الجداول المفقودة: ${missingTables.length}`);
    console.log(`📊 [Schema Check] الجداول الزائدة: ${extraTables.length}`);
    console.log(`📊 [Schema Check] الأعمدة المفقودة: ${missingColumns.length}`);
    console.log(`📊 [Schema Check] المشاكل القابلة للإصلاح: ${fixableIssues}`);
    
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
      criticalIssues
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
      criticalIssues: 1
    };
  }
}

/**
 * محاولة إصلاح المشاكل تلقائياً
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
  
  console.log('🔧 [Auto Fix] بدء الإصلاح التلقائي...');
  console.log(`   الجداول المفقودة: ${checkResult.missingTables.length}`);
  console.log(`   الأعمدة المفقودة: ${checkResult.missingColumns.length}`);
  
  if (checkResult.fixableIssues > 0) {
    console.log('🔨 [Auto Fix] تشغيل drizzle-kit push لإصلاح جميع المشاكل...');
    
    const pushResult = await runDrizzlePush();
    
    if (pushResult.success) {
      console.log('✅ [Auto Fix] تم تنفيذ drizzle push بنجاح');
      
      console.log('🔍 [Auto Fix] إعادة التحقق من المخطط...');
      const newCheckResult = await checkSchemaConsistency();
      
      if (newCheckResult.isConsistent) {
        console.log('✅ [Auto Fix] تم إصلاح جميع المشاكل بنجاح!');
        return { success: true, newCheckResult };
      } else {
        const remainingIssues = newCheckResult.fixableIssues;
        console.log(`⚠️ [Auto Fix] بقي ${remainingIssues} مشكلة تحتاج مراجعة يدوية`);
        return { success: false, newCheckResult };
      }
    } else {
      console.error('❌ [Auto Fix] فشل تنفيذ drizzle push');
      return { success: false, newCheckResult: checkResult };
    }
  }
  
  console.log('⚠️ [Auto Fix] لا توجد مشاكل قابلة للإصلاح تلقائياً');
  return { success: false, newCheckResult: checkResult };
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
    
    await notificationService.createNotification({
      type: 'system',
      title: title,
      body: message,
      priority: 1,
      recipients: ['admin'],
      payload: {
        details,
        timestamp: new Date().toISOString(),
        action: 'review_schema',
        route: '/admin/schema-management'
      },
      channelPreference: {
        push: true,
        email: true,
        sms: false
      }
    });
    
    console.log('📧 [Notification] تم إرسال إشعار للمسؤول');
  } catch (error) {
    console.log('⚠️ [Notification] تعذر إرسال الإشعار (الخدمة غير متوفرة)');
  }
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
  
  if (!consistencyCheck.isConsistent) {
    console.log('⚠️ [Schema Check] تم اكتشاف اختلافات في المخطط!');
    
    if (consistencyCheck.criticalIssues > 0) {
      console.log('🚨 [Schema Check] مشاكل حرجة! سيتم تجاوز فحص القفل');
      skipLockCheck = true;
      
      await sendAdminNotification(
        '🚨 تحذير عاجل: مشاكل حرجة في المخطط',
        `تم اكتشاف ${consistencyCheck.criticalIssues} مشكلة حرجة تحتاج تدخل فوري`,
        {
          missingTables: consistencyCheck.missingTables,
          extraTables: consistencyCheck.extraTables,
          missingColumns: consistencyCheck.missingColumns,
          severity: 'critical',
          requiresAction: true
        }
      );
    } else {
      await sendAdminNotification(
        '⚠️ تحذير: اختلافات في مخطط قاعدة البيانات',
        `تم اكتشاف ${consistencyCheck.missingTables.length} جدول مفقود و ${consistencyCheck.missingColumns.length} عمود مفقود`,
        {
          missingTables: consistencyCheck.missingTables,
          extraTables: consistencyCheck.extraTables,
          missingColumns: consistencyCheck.missingColumns,
          severity: 'warning',
          requiresAction: consistencyCheck.fixableIssues > 0
        }
      );
    }
    
    if (AUTO_FIX_ENABLED && consistencyCheck.fixableIssues > 0) {
      const fixResult = await attemptAutoFix(consistencyCheck);
      consistencyCheck = fixResult.newCheckResult;
      
      if (fixResult.success) {
        console.log('✅ [Auto Fix] تم الإصلاح التلقائي بنجاح');
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
