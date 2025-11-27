
/**
 * 🚀 سكربت تطبيق المخطط التلقائي الذكي
 * يتم تشغيله مرة واحدة عند بدء التطبيق
 * يتعامل تلقائياً مع جميع التفاعلات المطلوبة
 * 
 * المميزات:
 * ✅ كشف ذكي للتغييرات في المخطط
 * ✅ إجابة تلقائية على جميع الأسئلة
 * ✅ نظام قفل لمنع التشغيل المتكرر
 * ✅ معالجة أخطاء متقدمة
 * ✅ تسجيل مفصل للعمليات
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// حل مشكلة __dirname في ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCK_FILE = join(__dirname, '../.schema-push.lock');
const MAX_AGE_HOURS = 24; // تطبيق المخطط مرة كل 24 ساعة

/**
 * التحقق مما إذا كان يجب تشغيل تطبيق المخطط
 */
async function shouldRunPush(): Promise<boolean> {
  if (!existsSync(LOCK_FILE)) {
    console.log('📝 [Schema Push] لا يوجد ملف قفل، سيتم التشغيل');
    return true;
  }

  try {
    const lockData = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
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
function createLockFile(success: boolean = true): void {
  try {
    writeFileSync(LOCK_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      success,
      version: '2.0'
    }, null, 2));
    console.log('✅ [Schema Push] تم إنشاء ملف القفل');
  } catch (error) {
    console.error('❌ [Schema Push] فشل إنشاء ملف القفل:', error);
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
 * تطبيق المخطط التلقائي مع معالجة ذكية
 */
export async function autoSchemaPush(): Promise<void> {
  const should = await shouldRunPush();
  
  if (!should) {
    console.log('⏭️ [Schema Push] تم تخطي التطبيق (تم التشغيل مؤخراً)');
    return;
  }

  console.log('🚀 [Schema Push] بدء تطبيق المخطط التلقائي...');
  console.log('📍 [Schema Push] المجلد:', join(__dirname, '..'));

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
    let lastOutput = '';
    let hasResponded = false;

    // معالجة المخرجات والإجابة التلقائية الذكية
    pushProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      lastOutput = text;
      
      // عرض المخرجات بتنسيق جميل
      const lines = text.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.trim()) {
          console.log(`   ${line}`);
        }
      });

      // كشف ذكي للأسئلة
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
        
        // إعادة تعيين بعد 500ms للسماح بأسئلة متعددة
        setTimeout(() => { hasResponded = false; }, 500);
      }
    });

    // معالجة الأخطاء
    pushProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      const lowerError = error.toLowerCase();
      
      // تجاهل التحذيرات غير المهمة
      if (lowerError.includes('deprecat') || 
          lowerError.includes('warning') ||
          lowerError.includes('experimental')) {
        return;
      }
      
      console.error('⚠️ [Schema Push]', error);
    });

    // معالجة انتهاء العملية
    pushProcess.on('close', (code: number | null) => {
      console.log('\n' + '═'.repeat(60));
      
      if (code === 0) {
        console.log('✅ [Schema Push] تم تطبيق المخطط بنجاح!');
        console.log('📊 [Schema Push] قاعدة البيانات محدثة ومتزامنة');
        createLockFile(true);
      } else {
        console.log(`⚠️ [Schema Push] انتهى بكود: ${code}`);
        console.log('💡 [Schema Push] قد يكون المخطط محدث بالفعل');
        // لا نفشل التطبيق
      }
      
      console.log('═'.repeat(60) + '\n');
      resolve();
    });

    // معالجة أخطاء العملية
    pushProcess.on('error', (error: Error) => {
      console.error('❌ [Schema Push] خطأ في العملية:', error.message);
      resolve();
    });

    // إرسال إجابة أولية استباقية بعد ثانية
    setTimeout(() => {
      if (!hasResponded) {
        console.log('🤖 [Schema Push] إرسال إجابة استباقية...');
        pushProcess.stdin.write('y\n');
      }
    }, 1000);

    // حد أقصى للوقت: 45 ثانية (زيادة الوقت للعمليات الكبيرة)
    setTimeout(() => {
      if (pushProcess.exitCode === null) {
        console.log('⏱️ [Schema Push] انتهت المهلة (45 ثانية)');
        pushProcess.kill('SIGTERM');
        
        // محاولة إنهاء قوي بعد 5 ثواني
        setTimeout(() => {
          if (pushProcess.exitCode === null) {
            console.log('🔨 [Schema Push] إنهاء قوي...');
            pushProcess.kill('SIGKILL');
          }
        }, 5000);
        
        resolve();
      }
    }, 45000);
  });
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
  lastRun: string | null;
  hoursSinceLastRun: number | null;
} {
  if (!existsSync(LOCK_FILE)) {
    return {
      enabled: true,
      lastRun: null,
      hoursSinceLastRun: null
    };
  }

  try {
    const lockData = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
    const lastRun = new Date(lockData.timestamp);
    const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    
    return {
      enabled: true,
      lastRun: lockData.timestamp,
      hoursSinceLastRun
    };
  } catch {
    return {
      enabled: true,
      lastRun: null,
      hoursSinceLastRun: null
    };
  }
}
/**
 * 🚀 سكربت تطبيق المخطط التلقائي الذكي مع التحقق والمعالجة
 * يتم تشغيله مرة واحدة عند بدء التطبيق
 * يتعامل تلقائياً مع جميع التفاعلات المطلوبة
 * 
 * المميزات:
 * ✅ كشف ذكي للتغييرات في المخطط
 * ✅ مقارنة المخطط مع قاعدة البيانات
 * ✅ معالجة تلقائية للاختلافات
 * ✅ إرسال تحذيرات للمسؤول عبر نظام الإشعارات
 * ✅ إجابة تلقائية على جميع الأسئلة
 * ✅ نظام قفل لمنع التشغيل المتكرر
 * ✅ معالجة أخطاء متقدمة
 * ✅ تسجيل مفصل للعمليات
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './db';
import { sql } from 'drizzle-orm';

// حل مشكلة __dirname في ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCK_FILE = join(__dirname, '../.schema-push.lock');
const MAX_AGE_HOURS = 24; // تطبيق المخطط مرة كل 24 ساعة

/**
 * التحقق مما إذا كان يجب تشغيل تطبيق المخطط
 */
async function shouldRunPush(): Promise<boolean> {
  if (!existsSync(LOCK_FILE)) {
    console.log('📝 [Schema Push] لا يوجد ملف قفل، سيتم التشغيل');
    return true;
  }

  try {
    const lockData = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
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
function createLockFile(success: boolean = true): void {
  try {
    writeFileSync(LOCK_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      success,
      version: '2.0'
    }, null, 2));
    console.log('✅ [Schema Push] تم إنشاء ملف القفل');
  } catch (error) {
    console.error('❌ [Schema Push] فشل إنشاء ملف القفل:', error);
  }
}

/**
 * التحقق من توافق المخطط مع قاعدة البيانات
 */
async function checkSchemaConsistency(): Promise<{
  isConsistent: boolean;
  missingTables: string[];
  extraTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  extraColumns: Array<{ table: string; column: string }>;
}> {
  console.log('🔍 [Schema Check] بدء التحقق من توافق المخطط...');
  
  try {
    // الحصول على قائمة الجداول من قاعدة البيانات
    const dbTablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const dbTables = dbTablesResult.rows.map((row: any) => row.table_name);
    
    // قائمة الجداول المتوقعة من المخطط
    const expectedTables = [
      'users', 'auth_user_sessions', 'email_verification_tokens', 'password_reset_tokens',
      'projects', 'workers', 'fund_transfers', 'worker_attendance', 'suppliers', 'materials',
      'material_purchases', 'supplier_payments', 'transportation_expenses', 'worker_transfers',
      'worker_balances', 'daily_expense_summaries', 'worker_types', 'autocomplete_data',
      'worker_misc_expenses', 'print_settings', 'project_fund_transfers', 'user_project_permissions',
      'permission_audit_logs', 'report_templates', 'tool_categories', 'tools', 'tool_stock',
      'tool_movements', 'tool_maintenance_logs', 'tool_usage_analytics', 'tool_reservations',
      'system_notifications', 'notification_read_states', 'tool_notifications', 'approvals',
      'channels', 'messages', 'actions', 'system_events', 'accounts', 'transactions',
      'transaction_lines', 'journals', 'finance_payments', 'finance_events', 'account_balances',
      'notifications', 'tool_purchase_items', 'maintenance_schedules', 'maintenance_tasks',
      'tool_cost_tracking'
    ];
    
    // الجداول المفقودة والزائدة
    const missingTables = expectedTables.filter(table => !dbTables.includes(table));
    const extraTables = dbTables.filter(table => 
      !expectedTables.includes(table) && 
      !table.startsWith('drizzle') &&
      !table.startsWith('pg_')
    );
    
    // فحص الأعمدة لكل جدول (مثال: جدول users)
    const missingColumns: Array<{ table: string; column: string }> = [];
    const extraColumns: Array<{ table: string; column: string }> = [];
    
    // يمكن توسيع هذا للتحقق من جميع الجداول
    if (dbTables.includes('users')) {
      const columnsResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      `);
      
      const dbColumns = columnsResult.rows.map((row: any) => row.column_name);
      const expectedColumns = [
        'id', 'email', 'password', 'first_name', 'last_name', 'role', 'is_active',
        'email_verified_at', 'totp_secret', 'mfa_enabled', 'created_at', 'updated_at', 'last_login'
      ];
      
      expectedColumns.forEach(col => {
        if (!dbColumns.includes(col)) {
          missingColumns.push({ table: 'users', column: col });
        }
      });
    }
    
    const isConsistent = missingTables.length === 0 && 
                        extraTables.length === 0 && 
                        missingColumns.length === 0;
    
    console.log(`📊 [Schema Check] الجداول المفقودة: ${missingTables.length}`);
    console.log(`📊 [Schema Check] الجداول الزائدة: ${extraTables.length}`);
    console.log(`📊 [Schema Check] الأعمدة المفقودة: ${missingColumns.length}`);
    
    return {
      isConsistent,
      missingTables,
      extraTables,
      missingColumns,
      extraColumns
    };
  } catch (error) {
    console.error('❌ [Schema Check] خطأ في التحقق:', error);
    throw error;
  }
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
      priority: 1, // أعلى أولوية
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
    console.error('❌ [Notification] فشل إرسال الإشعار:', error);
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
 * تطبيق المخطط التلقائي مع معالجة ذكية
 */
export async function autoSchemaPush(): Promise<void> {
  console.log('🚀 [Schema Push] بدء النظام الذكي للتحقق والتطبيق...');
  
  // 1. التحقق من توافق المخطط
  const consistencyCheck = await checkSchemaConsistency();
  
  if (!consistencyCheck.isConsistent) {
    console.log('⚠️ [Schema Check] تم اكتشاف اختلافات في المخطط!');
    
    // إرسال تحذير للمسؤول
    await sendAdminNotification(
      '⚠️ تحذير: اختلافات في مخطط قاعدة البيانات',
      `تم اكتشاف ${consistencyCheck.missingTables.length} جدول مفقود و ${consistencyCheck.extraTables.length} جدول زائد`,
      {
        missingTables: consistencyCheck.missingTables,
        extraTables: consistencyCheck.extraTables,
        missingColumns: consistencyCheck.missingColumns,
        severity: 'warning',
        requiresAction: true
      }
    );
  }
  
  // 2. التحقق من ملف القفل
  const should = await shouldRunPush();
  
  if (!should) {
    console.log('⏭️ [Schema Push] تم تخطي التطبيق (تم التشغيل مؤخراً)');
    return;
  }

  console.log('📍 [Schema Push] المجلد:', join(__dirname, '..'));

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
    let lastOutput = '';
    let hasResponded = false;
    let hasErrors = false;

    // معالجة المخرجات والإجابة التلقائية الذكية
    pushProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      lastOutput = text;
      
      // عرض المخرجات بتنسيق جميل
      const lines = text.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.trim()) {
          console.log(`   ${line}`);
        }
      });

      // كشف ذكي للأسئلة
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
        
        // إعادة تعيين بعد 500ms للسماح بأسئلة متعددة
        setTimeout(() => { hasResponded = false; }, 500);
      }
    });

    // معالجة الأخطاء
    pushProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      const lowerError = error.toLowerCase();
      
      // تجاهل التحذيرات غير المهمة
      if (lowerError.includes('deprecat') || 
          lowerError.includes('warning') ||
          lowerError.includes('experimental')) {
        return;
      }
      
      hasErrors = true;
      console.error('⚠️ [Schema Push]', error);
    });

    // معالجة انتهاء العملية
    pushProcess.on('close', async (code: number | null) => {
      console.log('\n' + '═'.repeat(60));
      
      if (code === 0 && !hasErrors) {
        console.log('✅ [Schema Push] تم تطبيق المخطط بنجاح!');
        console.log('📊 [Schema Push] قاعدة البيانات محدثة ومتزامنة');
        
        // إرسال إشعار بالنجاح
        await sendAdminNotification(
          '✅ نجاح: تطبيق مخطط قاعدة البيانات',
          'تم تطبيق جميع التغييرات بنجاح على قاعدة البيانات',
          {
            timestamp: new Date().toISOString(),
            status: 'success',
            exitCode: code
          }
        );
        
        createLockFile(true);
      } else {
        console.log(`⚠️ [Schema Push] انتهى بكود: ${code || 'error'}`);
        
        // إرسال إشعار بالفشل
        await sendAdminNotification(
          '❌ خطأ: فشل تطبيق مخطط قاعدة البيانات',
          `فشل التطبيق برمز خروج: ${code}`,
          {
            timestamp: new Date().toISOString(),
            status: 'failed',
            exitCode: code,
            lastOutput: lastOutput.substring(0, 500),
            requiresManualIntervention: true
          }
        );
      }
      
      console.log('═'.repeat(60) + '\n');
      resolve();
    });

    // معالجة أخطاء العملية
    pushProcess.on('error', async (error: Error) => {
      console.error('❌ [Schema Push] خطأ في العملية:', error.message);
      
      // إرسال إشعار بالخطأ
      await sendAdminNotification(
        '🚨 خطأ حرج: فشل عملية تطبيق المخطط',
        error.message,
        {
          timestamp: new Date().toISOString(),
          status: 'critical_error',
          error: error.stack,
          requiresImmediateAction: true
        }
      );
      
      resolve();
    });

    // إرسال إجابة أولية استباقية بعد ثانية
    setTimeout(() => {
      if (!hasResponded) {
        console.log('🤖 [Schema Push] إرسال إجابة استباقية...');
        pushProcess.stdin.write('y\n');
      }
    }, 1000);

    // حد أقصى للوقت: 45 ثانية
    setTimeout(() => {
      if (pushProcess.exitCode === null) {
        console.log('⏱️ [Schema Push] انتهت المهلة (45 ثانية)');
        pushProcess.kill('SIGTERM');
        
        setTimeout(() => {
          if (pushProcess.exitCode === null) {
            console.log('🔨 [Schema Push] إنهاء قوي...');
            pushProcess.kill('SIGKILL');
          }
        }, 5000);
        
        resolve();
      }
    }, 45000);
  });
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
  lastRun: string | null;
  hoursSinceLastRun: number | null;
} {
  if (!existsSync(LOCK_FILE)) {
    return {
      enabled: true,
      lastRun: null,
      hoursSinceLastRun: null
    };
  }

  try {
    const lockData = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
    const lastRun = new Date(lockData.timestamp);
    const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    
    return {
      enabled: true,
      lastRun: lockData.timestamp,
      hoursSinceLastRun
    };
  } catch {
    return {
      enabled: true,
      lastRun: null,
      hoursSinceLastRun: null
    };
  }
}
