
import { db } from "./db";
import { sql } from "drizzle-orm";
import { smartConnectionManager } from "./services/smart-connection-manager";
import { BackupService } from "./services/BackupService";
import fs from "fs";
import path from "path";

async function runTest() {
  console.log("🚀 [Test] بدء اختبار محاكاة فشل النظام والاستعادة الذكية...");

  try {
    // 1. التحقق من وجود نسخة احتياطية للطوارئ
    const emergencyPath = path.join(process.cwd(), "backups", "emergency-latest.sql.gz");
    if (!fs.existsSync(emergencyPath)) {
      console.log("📝 [Test] إنشاء نسخة احتياطية تجريبية للطوارئ...");
      await BackupService.runBackup("test-user", true);
    }
    console.log("✅ [Test] ملف الطوارئ موجود.");

    // 2. محاكاة فشل الاتصال بالقاعدة المركزية
    console.log("🔌 [Test] محاكاة فشل الاتصال بالقاعدة المركزية...");
    (global as any).forceEmergencyMode = true; // علامة داخلية للمحاكاة
    
    // إعادة تهيئة الاتصال الذكي
    await smartConnectionManager.initialize();
    
    if ((global as any).isEmergencyMode) {
      console.log("✅ [Test] تم تفعيل وضع الطوارئ والتحويل إلى SQLite بنجاح.");
    } else {
      throw new Error("فشل النظام في التحويل إلى وضع الطوارئ");
    }

    // 3. اختبار استعادة نسخة محددة في وضع الطوارئ
    console.log("🔄 [Test] اختبار استعادة نسخة احتياطية في وضع الطوارئ...");
    const logs = await BackupService.getLogs();
    const lastLog = logs.find(l => l.status === "success");
    
    if (lastLog) {
      await BackupService.restore(lastLog.id);
      console.log("✅ [Test] تمت الاستعادة بنجاح داخل SQLite.");
    }

    // 4. التحقق من البيانات في SQLite
    const projectsCount = await db.execute(sql`SELECT count(*) as count FROM projects`);
    console.log(`📊 [Test] عدد المشاريع في قاعدة الطوارئ: ${projectsCount.rows[0].count}`);

    console.log("\n✨ [Test] جميع الاختبارات اجتازت بنجاح! النظام جاهز للطوارئ.");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ [Test] فشل الاختبار:", error.message);
    process.exit(1);
  }
}

runTest();
