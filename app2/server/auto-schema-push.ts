
/**
 * 🚀 سكربت تطبيق المخطط التلقائي
 * يتم تشغيله مرة واحدة عند بدء التطبيق
 * يتعامل تلقائياً مع جميع التفاعلات المطلوبة
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const LOCK_FILE = join(__dirname, '../.schema-push.lock');
const MAX_AGE_HOURS = 24; // تطبيق المخطط مرة كل 24 ساعة

async function shouldRunPush(): Promise<boolean> {
  // إذا لم يكن هناك ملف قفل، قم بالتشغيل
  if (!existsSync(LOCK_FILE)) {
    return true;
  }

  // تحقق من عمر آخر تشغيل
  try {
    const lockData = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
    const lastRun = new Date(lockData.timestamp);
    const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    
    // إذا مر أكثر من MAX_AGE_HOURS، قم بالتشغيل مرة أخرى
    return hoursSinceLastRun > MAX_AGE_HOURS;
  } catch {
    // إذا كان الملف تالفاً، قم بالتشغيل
    return true;
  }
}

function createLockFile() {
  writeFileSync(LOCK_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    success: true
  }));
}

export async function autoSchemaPush(): Promise<void> {
  const should = await shouldRunPush();
  
  if (!should) {
    console.log('⏭️  [Schema Push] تم تطبيق المخطط مؤخراً، تخطي...');
    return;
  }

  console.log('🚀 [Schema Push] بدء تطبيق المخطط التلقائي...');

  return new Promise((resolve, reject) => {
    const pushProcess = spawn('npx', ['drizzle-kit', 'push', '--force'], {
      cwd: join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '0' // تعطيل الألوان للحصول على نص نظيف
      }
    });

    let output = '';
    let hasAnswered = false;

    // معالجة المخرجات والإجابة التلقائية
    pushProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      
      // عرض المخرجات
      process.stdout.write(text);

      // الإجابة التلقائية على الأسئلة
      if (!hasAnswered) {
        const lowerText = text.toLowerCase();
        
        if (
          lowerText.includes('continue?') ||
          lowerText.includes('proceed?') ||
          lowerText.includes('confirm') ||
          lowerText.includes('(y/n)') ||
          lowerText.includes('yes/no') ||
          lowerText.includes('apply') ||
          lowerText.includes('push')
        ) {
          console.log('\n✅ [Schema Push] إجابة تلقائية: نعم');
          pushProcess.stdin.write('y\n');
          hasAnswered = true;
          
          // إرسال إجابات إضافية للتأكد
          setTimeout(() => pushProcess.stdin.write('yes\n'), 100);
          setTimeout(() => pushProcess.stdin.write('Y\n'), 200);
        }
      }
    });

    // معالجة الأخطاء
    pushProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      // تجاهل التحذيرات غير المهمة
      if (!error.toLowerCase().includes('deprecat') && 
          !error.toLowerCase().includes('warning')) {
        console.error('⚠️ [Schema Push]', error);
      }
    });

    // معالجة انتهاء العملية
    pushProcess.on('close', (code: number | null) => {
      if (code === 0) {
        console.log('✅ [Schema Push] تم تطبيق المخطط بنجاح!');
        createLockFile();
        resolve();
      } else {
        console.log(`⚠️ [Schema Push] انتهى بكود: ${code}`);
        // لا نفشل التطبيق إذا فشل تطبيق المخطط
        resolve();
      }
    });

    // معالجة أخطاء العملية
    pushProcess.on('error', (error: Error) => {
      console.error('❌ [Schema Push] خطأ:', error.message);
      // لا نفشل التطبيق
      resolve();
    });

    // إرسال إجابة أولية بعد ثانية
    setTimeout(() => {
      if (!hasAnswered) {
        pushProcess.stdin.write('y\n');
      }
    }, 1000);

    // حد أقصى للوقت: 30 ثانية
    setTimeout(() => {
      if (pushProcess.exitCode === null) {
        console.log('⏱️ [Schema Push] انتهت المهلة، إنهاء...');
        pushProcess.kill();
        resolve();
      }
    }, 30000);
  });
}

// تصدير دالة للتشغيل اليدوي إذا لزم الأمر
export function forceSchemaPush() {
  // حذف ملف القفل للإجبار على التشغيل
  if (existsSync(LOCK_FILE)) {
    require('fs').unlinkSync(LOCK_FILE);
  }
  return autoSchemaPush();
}
