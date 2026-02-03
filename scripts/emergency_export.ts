import { db } from "../server/db";
import * as schema from "../shared/schema";
import fs from "fs";
import path from "path";

async function exportData() {
  const tables = Object.keys(schema).filter(key => typeof (schema as any)[key] === 'object' && (schema as any)[key]._.table);
  const backupDir = path.join(process.cwd(), "backups", "json_export_20260203_213812");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  for (const tableName of tables) {
    try {
      const data = await (db.select().from((schema as any)[tableName]));
      fs.writeFileSync(path.join(backupDir, `${tableName}.json`), JSON.stringify(data, null, 2));
      console.log(`✅ Exported ${tableName}`);
    } catch (e) {
      console.error(`❌ Failed to export ${tableName}:`, e);
    }
  }
}

exportData().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
