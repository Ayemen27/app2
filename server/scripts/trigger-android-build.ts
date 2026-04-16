/**
 * محرك النشر الموحّد — يُشغّل أي pipeline عبر المسار الداخلي لـ Express
 * (النشر يعمل داخل عملية السيرفر الرئيسي ويستمر حتى لو أُغلقت الجلسة)
 *
 * الاستخدام:
 *   npx tsx server/scripts/trigger-android-build.ts [pipeline] [branch] [message]
 *
 * أمثلة:
 *   npx tsx server/scripts/trigger-android-build.ts                    ← full-deploy (افتراضي)
 *   npx tsx server/scripts/trigger-android-build.ts android-build      ← أندرويد فقط
 *   npx tsx server/scripts/trigger-android-build.ts web-deploy         ← ويب فقط
 *   npx tsx server/scripts/trigger-android-build.ts full-deploy main   ← تحديد الفرع
 *
 * الـ pipelines المتاحة:
 *   full-deploy       ← نشر ويب كامل + بناء APK أندرويد (الافتراضي)
 *   android-build     ← بناء APK فقط (يشمل تحديث السيرفر)
 *   web-deploy        ← نشر الويب فقط
 *   hotfix            ← نشر سريع بلا فحوصات مطوّلة
 *   android-build-test← أندرويد + اختبار Firebase Test Lab
 *   health-check      ← فحص صحة السيرفر الشامل
 */
import "dotenv/config";

const SERVER_PORT = process.env.PORT || 5000;
const BASE_URL    = `http://127.0.0.1:${SERVER_PORT}/api/deployment/internal`;
const DEPLOY_KEY  = process.env.INTERNAL_DEPLOY_KEY || "axion-internal-deploy-2026";

const PIPELINE_LABELS: Record<string, string> = {
  "full-deploy":        "🚀 نشر شامل (ويب + أندرويد)",
  "android-build":      "📱 بناء أندرويد APK",
  "web-deploy":         "🌐 نشر الويب",
  "hotfix":             "🔥 Hotfix سريع",
  "android-build-test": "🧪 أندرويد + Firebase Test Lab",
  "health-check":       "🏥 فحص صحة السيرفر",
  "server-cleanup":     "🧹 تنظيف السيرفر",
};

const ANDROID_PIPELINES = new Set(["full-deploy", "android-build", "android-build-test"]);

async function internalFetch(path: string, options?: RequestInit): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Deploy-Key": DEPLOY_KEY,
      ...(options?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

async function main() {
  const pipeline  = (process.argv[2] || "full-deploy").trim();
  const branch    = (process.argv[3] || "main").trim();
  const commitMsg = process.argv[4] || `${PIPELINE_LABELS[pipeline] || pipeline} — ${new Date().toLocaleDateString('en-GB')}`;

  const label = PIPELINE_LABELS[pipeline] || pipeline;

  console.log("═══════════════════════════════════════════════════");
  console.log(`  ${label}`);
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Pipeline : ${pipeline}`);
  console.log(`  Branch   : ${branch}`);
  console.log(`  Message  : ${commitMsg}`);
  console.log(`  Time     : ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' })}`);
  console.log(`  Server   : ${BASE_URL}`);
  console.log("═══════════════════════════════════════════════════\n");

  try {
    const result = await internalFetch("/start", {
      method: "POST",
      body: JSON.stringify({
        pipeline,
        appType:       ANDROID_PIPELINES.has(pipeline) ? "android" : "web",
        environment:   "production",
        branch,
        commitMessage: commitMsg,
        buildTarget:   "server",
      }),
    });

    console.log(`✅ بدأ النشر داخل السيرفر | ID: ${result.id}`);
    console.log(`📊 متابعة على: /api/deployment/${result.id}\n`);
    console.log("ℹ️  النشر يعمل داخل عملية السيرفر الرئيسي ويستمر بعد إغلاق هذه الجلسة.\n");

    await monitorDeployment(result.id, pipeline);

  } catch (err: any) {
    if (
      err.message?.includes("قيد التنفيذ") ||
      err.message?.includes("in progress") ||
      err.message?.includes("already running")
    ) {
      console.log("⚠️  يوجد نشر قيد التنفيذ بالفعل.");
      console.log("    تحقق من لوحة التحكم أو انتظر انتهاء العملية الحالية.\n");
    } else if (
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("fetch failed")
    ) {
      console.error("❌ لم يتمكن السكريبت من الوصول للسيرفر على", BASE_URL);
      console.error("   تأكد أن السيرفر يعمل (npm run dev) ثم أعد المحاولة.\n");
      process.exit(1);
    } else {
      console.error("❌ فشل تشغيل النشر:", err.message);
      console.error(err.stack);
      process.exit(1);
    }
  }
}

async function monitorDeployment(deploymentId: string, pipeline: string) {
  const POLL_MS   = 10_000;
  const MAX_POLLS = 270; // 45 دقيقة

  let lastLogCount  = 0;
  let lastStatusLine = "";

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_MS));

    try {
      const d = await internalFetch(`/status/${deploymentId}`);

      // طباعة السجلات الجديدة فقط
      const logs    = Array.isArray(d.recentLogs) ? d.recentLogs as any[] : [];
      const newLogs = logs.slice(lastLogCount);
      for (const log of newLogs) {
        const icon = log.level === "error"   ? "❌" :
                     log.level === "warn"    ? "⚠️ " :
                     log.level === "success" ? "✅" : "  ";
        const t = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-GB') : "";
        console.log(`  ${icon} [${t}] ${log.message}`);
      }
      lastLogCount = logs.length;

      // سطر الحالة (كل 3 فحوصات)
      const statusLine = `[${String(i + 1).padStart(3)}] ${d.status.padEnd(8)} | خطوة: ${(d.stepRunning || "-").padEnd(22)} | ${d.stepsDone}/${d.stepsTotal}`;
      if (statusLine !== lastStatusLine && i % 3 === 0) {
        console.log(`\n📊 ${statusLine}\n`);
        lastStatusLine = statusLine;
      }

      // نهاية: نجاح
      if (d.status === "success") {
        console.log("\n═══════════════════════════════════════════════════");
        console.log("  🎉 تم النشر بنجاح!");
        if (ANDROID_PIPELINES.has(pipeline)) {
          console.log("  📱 APK الأندرويد: جاهز للتنزيل");
          if (d.artifactUrl) console.log(`  📦 المسار: ${d.artifactUrl}`);
        }
        if (pipeline !== "android-build") {
          console.log("  🌐 الويب: محدَّث على السيرفر");
        }
        const dur = d.duration ? Math.round(d.duration / 1000) : "?";
        console.log(`  ⏱  المدة: ${dur} ث`);
        console.log("═══════════════════════════════════════════════════\n");
        break;
      }

      // نهاية: فشل
      if (d.status === "failed") {
        console.log("\n═══════════════════════════════════════════════════");
        console.log("  ❌ فشل النشر");
        if (d.stepFailed) {
          console.log(`  الخطوة الفاشلة : ${d.stepFailed}`);
        }
        console.log("═══════════════════════════════════════════════════");
        diagnose(pipeline, d.stepFailed, logs);
        process.exit(1);
      }

      // نهاية: إلغاء
      if (d.status === "cancelled") {
        console.log("\n⚠️  تم إلغاء النشر.\n");
        process.exit(1);
      }

    } catch (pollErr: any) {
      if (pollErr.message?.includes("ECONNREFUSED")) {
        console.log(`\n⚠️  تعذّر الوصول للسيرفر في الاستطلاع ${i + 1}. سيستمر النشر في السيرفر.`);
        console.log(`   ابحث عن ID: ${deploymentId} في لوحة التحكم.\n`);
        break;
      }
      console.log(`⚠️  خطأ مؤقت في الفحص [${i + 1}]: ${pollErr.message}`);
    }
  }
}

function diagnose(pipeline: string, failedStep: string | null, logs: any[]) {
  const step    = failedStep || "";
  const allLogs = logs.map((l: any) => l.message).join(" ").toLowerCase();

  console.log("\n💡 تشخيص المشكلة:");

  if (step === "gradle-build"   || allLogs.includes("gradle"))
    console.log("  → Gradle: تحقق من إصدار Java وإعدادات build.gradle — جرّب: ./gradlew clean");
  else if (step === "install-deps" || allLogs.includes("npm install"))
    console.log("  → npm install: جرّب إضافة --legacy-peer-deps أو حذف node_modules");
  else if (step === "build-web"    || allLogs.includes("vite") || allLogs.includes("tsc"))
    console.log("  → بناء الويب: تحقق من أخطاء TypeScript أو Vite في السجلات أعلاه");
  else if (step === "sign-apk"     || allLogs.includes("keystore"))
    console.log("  → التوقيع: تحقق من KEYSTORE_PASSWORD وملف keystore على السيرفر");
  else if (step === "pull-server"  || allLogs.includes("git pull") || allLogs.includes("git push"))
    console.log("  → Git: تحقق من صلاحيات SSH وأن الفرع موجود على الريموت");
  else if (step === "db-migrate"   || allLogs.includes("migrate") || allLogs.includes("drizzle"))
    console.log("  → Migration: تحقق من اتصال قاعدة البيانات وأن المخطط متوافق");
  else if (allLogs.includes("ssh") || allLogs.includes("connection refused"))
    console.log("  → SSH: تحقق من SSH_HOST / SSH_USER / SSH_PASSWORD في .env");
  else if (step === "android-readiness")
    console.log("  → Android: تحقق من تثبيت Java 17/21 وAndroid SDK على السيرفر");
  else
    console.log("  → راجع السجلات الكاملة أعلاه أو في لوحة التحكم /deployment-console");
}

main().catch(err => {
  console.error("❌ خطأ غير متوقع:", err);
  process.exit(1);
});
