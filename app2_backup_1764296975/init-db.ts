import { Client } from 'pg';
import fs from 'fs';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    const sql = fs.readFileSync('./migrations/0000_complete_schema_migration.sql', 'utf8');
    const statements = sql.split('--> statement-breakpoint').filter(s => s.trim());
    
    let count = 0;
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) {
        try {
          await client.query(trimmed);
          count++;
        } catch (e: any) {
          if (e.code !== '42P07') console.log(`⚠ ${e.code}: skipping`);
        }
      }
    }
    
    console.log(`✅ Created ${count} database objects!`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

init();
