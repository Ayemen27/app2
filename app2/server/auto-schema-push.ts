
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
