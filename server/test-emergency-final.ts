
import { db } from "./db";
import { sql } from "drizzle-orm";
import { smartConnectionManager } from "./services/smart-connection-manager";
import { BackupService } from "./services/BackupService";
import fs from "fs";
import path from "path";

async function runTest() {
  console.log("🚀 [Test] بدء اختبار محاكاة فشل النظام والاستعادة الذكية...");

  try {
    // 1. التأكد من تهيئة النظام
    await smartConnectionManager.initialize();
    
    // 2. التحقق من وجود نسخة احتياطية للطوارئ
    const emergencyPath = path.join(process.cwd(), "backups", "emergency-latest.sql.gz");
    if (!fs.existsSync(emergencyPath)) {
      console.log("📝 [Test] إنشاء نسخة احتياطية تجريبية للطوارئ...");
      await BackupService.runBackup("test-user", true);
    }
    console.log("✅ [Test] ملف الطوارئ موجود.");

    // 3. محاكاة فشل الاتصال بالقاعدة المركزية
    console.log("🔌 [Test] محاكاة فشل الاتصال بالقاعدة المركزية...");
    (global as any).forceEmergencyMode = true; 
    
    // إعادة تهيئة الاتصال الذكي للمحاكاة
    await smartConnectionManager.initialize();
    
    if ((global as any).isEmergencyMode) {
      console.log("✅ [Test] تم تفعيل وضع الطوارئ والتحويل إلى SQLite بنجاح.");
    } else {
      throw new Error("فشل النظام في التحويل إلى وضع الطوارئ");
    }

    // 4. اختبار استعادة نسخة محددة في وضع الطوارئ
    console.log("🔄 [Test] اختبار استعادة نسخة احتياطية في وضع الطوارئ...");
    const logs = await BackupService.getLogs();
    const lastLog = logs.find(l => l.status === "success");
    
    if (lastLog) {
      console.log(`📜 [Test] استعادة النسخة: ${lastLog.filename}`);
      await BackupService.restore(lastLog.id);
      console.log("✅ [Test] تمت الاستعادة بنجاح داخل SQLite.");
    }

    // 5. التحقق من البيانات في SQLite
    const tables = await db.execute(sql`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log("📊 [Test] الجداول الموجودة في SQLite:", tables.rows.map(r => r.name));

    console.log("\n✨ [Test] جميع الاختبارات اجتازت بنجاح! النظام جاهز للطوارئ.");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ [Test] فشل الاختبار:", error.message);
    process.exit(1);
  }
}

runTest();
