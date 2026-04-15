/**
 * سكريبت تشغيل بناء الأندرويد مباشرة
 * يستدعي DeploymentEngine مباشرة بدون HTTP
 */
import "dotenv/config";
import { deploymentEngine } from "../services/deployment-engine.js";

async function main() {
  console.log("🚀 [AndroidBuild] بدء عملية بناء تطبيق الأندرويد...");
  console.log(`⏰ الوقت: ${new Date().toISOString()}`);

  try {
    const deploymentId = await deploymentEngine.startDeployment({
      pipeline: "android-build",
      appType: "android",
      environment: "production",
      branch: "main",
      commitMessage: "Android Build - Triggered via build script",
      triggeredBy: "build-script",
      buildTarget: "server",
    });

    console.log(`✅ [AndroidBuild] تم بدء النشر بنجاح | ID: ${deploymentId}`);
    console.log(`📊 متابعة العملية على: /api/deployment/${deploymentId}`);
    console.log("\n⏳ جاري متابعة عملية البناء...\n");

    let lastLogCount = 0;
    let checkCount = 0;
    const maxChecks = 180;

    while (checkCount < maxChecks) {
      await new Promise(r => setTimeout(r, 8000));
      checkCount++;

      try {
        const deployment = await deploymentEngine.getDeployment(deploymentId);
        if (!deployment) {
          console.log("⚠️ لم يتم العثور على النشر");
          break;
        }

        const logs = Array.isArray(deployment.logs) ? deployment.logs as any[] : [];
        if (logs.length > lastLogCount) {
          const newLogs = logs.slice(lastLogCount);
          for (const log of newLogs) {
            const prefix = log.level === "error" ? "❌" : log.level === "warn" ? "⚠️" : log.level === "success" ? "✅" : "ℹ️";
            const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('ar-SA') : "";
            console.log(`${prefix} [${time}] ${log.message}`);
          }
          lastLogCount = logs.length;
        }

        const steps = Array.isArray(deployment.steps) ? deployment.steps as any[] : [];
        const runningStep = steps.find((s: any) => s.status === "running");
        const failedStep = steps.find((s: any) => s.status === "failed");
        const doneSteps = steps.filter((s: any) => s.status === "success").length;

        console.log(`\n📊 [فحص ${checkCount}] الحالة: ${deployment.status} | الخطوة: ${runningStep?.name || '-'} | مكتمل: ${doneSteps}/${steps.length}\n`);

        if (deployment.status === "success") {
          console.log("\n🎉 ✅ تم بناء تطبيق الأندرويد بنجاح!");
          console.log(`📱 APK جاهز في: output_apks/`);
          break;
        }

        if (deployment.status === "failed") {
          console.log(`\n❌ فشل البناء`);
          if (failedStep) {
            console.log(`❌ الخطوة الفاشلة: ${failedStep.name}`);
            if (failedStep.error) console.log(`❌ الخطأ: ${failedStep.error}`);
          }
          console.log("\n🔧 [AutoFix] تحليل المشكلة وتسجيلها للإصلاح التلقائي في المستقبل...");
          await analyzeBuildFailure(deploymentId, failedStep, logs);
          process.exit(1);
        }

        if (deployment.status === "cancelled") {
          console.log("\n⚠️ تم إلغاء البناء");
          process.exit(1);
        }

      } catch (checkErr: any) {
        console.log(`⚠️ خطأ في التحقق (${checkCount}): ${checkErr.message}`);
      }
    }

    if (checkCount >= maxChecks) {
      console.log("⏰ انتهت مهلة المتابعة (24 دقيقة) - العملية لا تزال تعمل في الخلفية");
    }

  } catch (err: any) {
    if (err.message?.includes("قيد التنفيذ") || err.message?.includes("in progress") || err.message?.includes("already running")) {
      console.log("⚠️ يوجد نشر قيد التنفيذ بالفعل");
      console.log("📊 تحقق من لوحة التحكم لمتابعة العملية الجارية");
    } else {
      console.error("❌ فشل تشغيل البناء:", err.message);
      console.error(err.stack);
      process.exit(1);
    }
  }
}

async function analyzeBuildFailure(deploymentId: string, failedStep: any, logs: any[]) {
  console.log("\n📋 تقرير تحليل الفشل:");
  console.log("═══════════════════════════════════");
  
  if (failedStep) {
    console.log(`• الخطوة الفاشلة: ${failedStep.name}`);
    console.log(`• رسالة الخطأ: ${failedStep.error || "غير محددة"}`);
  }

  const errorLogs = logs.filter((l: any) => l.level === "error");
  if (errorLogs.length > 0) {
    console.log("\n• آخر أخطاء:");
    errorLogs.slice(-5).forEach((l: any) => {
      console.log(`  - ${l.message}`);
    });
  }

  console.log("\n💡 اقتراحات الإصلاح التلقائي:");
  
  const stepName = failedStep?.name || "";
  const errorMsg = (failedStep?.error || "").toLowerCase();
  const allLogs = logs.map((l: any) => l.message).join(" ").toLowerCase();

  if (stepName === "gradle-build" || allLogs.includes("gradle")) {
    console.log("  → خطأ في Gradle: تحقق من إصدار Java وإعدادات build.gradle");
    console.log("  → يمكن تشغيل: ./gradlew clean وإعادة المحاولة");
  } else if (stepName === "install-deps" || allLogs.includes("npm install")) {
    console.log("  → خطأ في التبعيات: npm install قد يحتاج --legacy-peer-deps");
  } else if (stepName === "build-web" || allLogs.includes("vite")) {
    console.log("  → خطأ في بناء الويب: تحقق من أخطاء TypeScript أو Vite");
  } else if (stepName === "sign-apk" || allLogs.includes("keystore")) {
    console.log("  → خطأ في التوقيع: تحقق من KEYSTORE_PASSWORD وملف keystore");
  } else if (stepName === "pull-server" || allLogs.includes("git")) {
    console.log("  → خطأ في Git: تحقق من صلاحيات الوصول والفرع");
  } else if (allLogs.includes("ssh") || allLogs.includes("connection")) {
    console.log("  → خطأ في SSH: تحقق من بيانات الاتصال بالسيرفر");
  } else {
    console.log("  → تحليل دقيق يتطلب مراجعة السجلات الكاملة");
  }

  console.log("═══════════════════════════════════");
}

main().catch(err => {
  console.error("❌ خطأ غير متوقع:", err);
  process.exit(1);
});
