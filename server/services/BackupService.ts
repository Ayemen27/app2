import fs from 'fs';
import path from 'path';
import sqlite3 from 'better-sqlite3';
import zlib from 'zlib';

export class BackupService {
  private static readonly LOCAL_DB_PATH = path.resolve(process.cwd(), 'local.db');

  static async restoreFromFile(filePath: string): Promise<boolean> {
    try {
      console.log(`📂 [BackupService] فك ضغط الملف: ${filePath}`);
      const compressedContent = fs.readFileSync(filePath);
      const sqlContent = zlib.gunzipSync(compressedContent).toString('utf-8');

      console.log(`🏗️ [BackupService] تهيئة SQLite...`);
      const targetInstance = new sqlite3(this.LOCAL_DB_PATH);
      
      targetInstance.pragma("foreign_keys = OFF");
      targetInstance.pragma("journal_mode = OFF");
      targetInstance.pragma("synchronous = OFF");

      const tables = targetInstance.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name: string}[];
      for (const table of tables) {
        if (table.name !== 'sqlite_sequence') {
          targetInstance.exec(`DROP TABLE IF EXISTS "${table.name}"`);
        }
      }

      targetInstance.exec("BEGIN TRANSACTION;");

      const createTableRegex = /CREATE TABLE\s+(?:public\.)?(\w+)\s+\((.*?)\);/gs;
      let match;
      while ((match = createTableRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const body = match[2];
        let converted = `CREATE TABLE "${tableName}" (${body});`
          .replace(/"public"\./g, "")
          .replace(/"/g, "`")
          .replace(/character varying(\(\d+\))?/gi, "TEXT")
          .replace(/timestamp( without time zone)?/gi, "TEXT")
          .replace(/numeric\(\d+,\d+\)/gi, "NUMERIC")
          .replace(/boolean/gi, "INTEGER")
          .replace(/uuid/gi, "TEXT")
          .replace(/jsonb/gi, "TEXT")
          .replace(/DEFAULT gen_random_uuid\(\)/gi, "PRIMARY KEY")
          .replace(/DEFAULT now\(\)/gi, "DEFAULT CURRENT_TIMESTAMP")
          .replace(/'t'/g, "1")
          .replace(/'f'/g, "0")
          .replace(/::[a-z0-9]+/gi, "")
          .replace(/WITH\s+\([^)]+\)/gi, "");
        
        try { targetInstance.exec(converted); } catch (e) { }
      }

      const copyRegex = /COPY (?:public\.)?(\w+)\s+\((.*?)\)\s+FROM stdin;(.*?)\\\./gs;
      while ((match = copyRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const cols = match[2].replace(/"/g, "`");
        const data = match[3].strip ? match[3].trim() : match[3];
        if (!data) continue;

        const lines = data.split('\n');
        const placeholders = cols.split(',').map(() => '?').join(',');
        const insertStmt = targetInstance.prepare(`INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})`);

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const vals = line.split('\t').map(v => v === '\\N' ? null : v);
          try { insertStmt.run(...vals); } catch (e) { }
        }
      }

      targetInstance.exec("COMMIT;");
      targetInstance.close();
      return true;
    } catch (error) {
      console.error('❌ [BackupService] خطأ في الاستعادة:', error);
      return false;
    }
  }
}
