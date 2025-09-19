
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

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

async function checkPrerequisites(): Promise<boolean> {
  log('🔍 فحص المتطلبات المسبقة...', colors.blue);

  // فحص وجود ملف .env.migration
  if (!fs.existsSync('.env.migration')) {
    log('❌ ملف .env.migration غير موجود', colors.red);
    log('💡 قم بإنشاء ملف .env.migration وأضف معلومات Supabase', colors.yellow);
    return false;
  }

  // فحص وجود ملف الترحيل
  if (!fs.existsSync('migrate-data-from-supabase.ts')) {
    log('❌ ملف migrate-data-from-supabase.ts غير موجود', colors.red);
    return false;
  }

  // فحص تثبيت المكتبات المطلوبة
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasPg = packageJson.dependencies?.pg || packageJson.devDependencies?.pg;
  const hasDotenv = packageJson.dependencies?.dotenv || packageJson.devDependencies?.dotenv;

  if (!hasPg) {
    log('❌ مكتبة pg غير مثبتة', colors.red);
    log('💡 قم بتشغيل: npm install pg @types/pg', colors.yellow);
    return false;
  }

  if (!hasDotenv) {
    log('❌ مكتبة dotenv غير مثبتة', colors.red);
    log('💡 قم بتشغيل: npm install dotenv', colors.yellow);
    return false;
  }

  log('✅ جميع المتطلبات متوفرة', colors.green);
  return true;
}

function runMigration(): Promise<void> {
  return new Promise((resolve, reject) => {
    log('🚀 بدء تشغيل سكربت الترحيل...', colors.bright);

    const child = spawn('npx', ['tsx', 'migrate-data-from-supabase.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'migration'
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        log('\n✅ انتهى سكربت الترحيل بنجاح', colors.green);
        resolve();
      } else {
        log(`\n❌ انتهى سكربت الترحيل بخطأ (رمز الخروج: ${code})`, colors.red);
        reject(new Error(`Migration failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      log(`❌ خطأ في تشغيل السكربت: ${error.message}`, colors.red);
      reject(error);
    });
  });
}

async function main() {
  log('🎯 مدير ترحيل البيانات من Supabase', colors.bright);
  log('=' .repeat(50), colors.cyan);

  try {
    // فحص المتطلبات
    const prerequisitesOk = await checkPrerequisites();
    if (!prerequisitesOk) {
      process.exit(1);
    }

    // تشغيل الترحيل
    await runMigration();

    log('\n🎉 تمت عملية الترحيل بنجاح!', colors.bright);
    log('💡 تحقق من البيانات في قاعدة البيانات الجديدة', colors.yellow);

  } catch (error) {
    log(`❌ خطأ في عملية الترحيل: ${(error as Error).message}`, colors.red);
    process.exit(1);
  }
}

main();
