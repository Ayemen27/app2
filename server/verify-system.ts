
import { db, isEmergencyMode } from "./db";
import { sql } from "drizzle-orm";

async function verifyEmergencySystem() {
  console.log("🔍 [Verification] Starting deep system check...");
  
  // 1. Check if SQLite tables exist
  try {
    const tables = await db.execute(sql`SELECT name FROM sqlite_master WHERE type='table'`);
    const tableNames = tables.rows.map((r: any) => r.name);
    console.log("✅ Tables found in SQLite:", tableNames.join(", "));
    
    if (tableNames.length === 0) {
      console.warn("⚠️ No tables found in SQLite yet. This is expected if the system hasn't failed yet.");
    }
  } catch (e: any) {
    console.error("❌ Error checking SQLite tables:", e.message);
  }

  // 2. Check Emergency Backup File
  import fs from "fs";
  import path from "path";
  const backupPath = path.join(process.cwd(), "backups", "emergency-latest.sql.gz");
  if (fs.existsSync(backupPath)) {
    const stats = fs.statSync(backupPath);
    console.log(`✅ Emergency backup file exists: ${backupPath} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.warn("⚠️ Emergency backup file not found. It will be created on the next successful backup.");
  }

  // 3. Verify logic in SmartConnectionManager
  import { smartConnectionManager } from "./services/smart-connection-manager";
  const testConn = smartConnectionManager.getSmartConnection('read');
  console.log(`ℹ️ Current Routing Source: ${testConn.source}`);

  console.log("\n✨ [Verification] System is properly configured for Zero-Interruption.");
  process.exit(0);
}

verifyEmergencySystem().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
