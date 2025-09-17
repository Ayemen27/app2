
/**
 * سكربت إنشاء هجرة جديدة ودفع جميع الجداول إلى قاعدة البيانات
 * يقوم بتشغيل العمليات التالية:
 * 1. إنشاء هجرة جديدة من الـ schema
 * 2. دفع الهجرة إلى قاعدة البيانات
 * 3. التحقق من نجاح إنشاء الجداول
 */

import { spawn } from 'child_process';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

// ألوان للتسجيل
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command: string, args: string[] = []): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    log(`🔄 تشغيل الأمر: ${command} ${args.join(' ')}`, colors.blue);
    
    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ تم تنفيذ الأمر بنجاح`, colors.green);
        resolve({ success: true, output: output + errorOutput });
      } else {
        log(`❌ فشل في تنفيذ الأمر (رمز الخروج: ${code})`, colors.red);
        resolve({ success: false, output: output + errorOutput });
      }
    });

    child.on('error', (error) => {
      log(`❌ خطأ في تشغيل الأمر: ${error.message}`, colors.red);
      resolve({ success: false, output: error.message });
    });
  });
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    log('🔍 فحص الاتصال بقاعدة البيانات...', colors.cyan);
    const result = await db.execute(sql`SELECT 1 as test`);
    if (result && result.length > 0) {
      log('✅ نجح الاتصال بقاعدة البيانات', colors.green);
      return true;
    }
    return false;
  } catch (error: any) {
    log(`❌ فشل الاتصال بقاعدة البيانات: ${error.message}`, colors.red);
    return false;
  }
}

async function getTableCount(): Promise<number> {
  try {
    const tablesQuery = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    return Number(tablesQuery[0]?.count || 0);
  } catch (error) {
    log(`❌ خطأ في عد الجداول: ${error}`, colors.red);
    return 0;
  }
}

async function listExistingTables(): Promise<string[]> {
  try {
    const tablesQuery = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    return tablesQuery.map((row: any) => row.table_name);
  } catch (error) {
    log(`❌ خطأ في جلب قائمة الجداول: ${error}`, colors.red);
    return [];
  }
}

async function main() {
  log('🚀 بدء عملية إنشاء الهجرة ودفع الجداول', colors.bright);
  log('=' .repeat(60), colors.cyan);

  // 1. فحص الاتصال بقاعدة البيانات
  const connectionOk = await checkDatabaseConnection();
  if (!connectionOk) {
    log('❌ لا يمكن المتابعة بدون اتصال صحيح بقاعدة البيانات', colors.red);
    process.exit(1);
  }

  // 2. عرض حالة الجداول الحالية
  const initialTableCount = await getTableCount();
  const initialTables = await listExistingTables();
  
  log(`📊 الحالة الحالية:`, colors.yellow);
  log(`   - عدد الجداول الموجودة: ${initialTableCount}`, colors.yellow);
  log(`   - الجداول: ${initialTables.join(', ')}`, colors.yellow);

  // 3. إنشاء هجرة جديدة
  log('\n🔨 الخطوة 1: إنشاء هجرة جديدة...', colors.bright);
  const generateResult = await runCommand('npx', ['drizzle-kit', 'generate']);
