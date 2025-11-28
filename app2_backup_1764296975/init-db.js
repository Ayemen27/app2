import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function initDB() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    // Grant permissions first
    try {
      await client.query('GRANT ALL PRIVILEGES ON SCHEMA public TO CURRENT_USER');
    } catch (e) {
      console.log('✓ Schema permissions already set');
    }
    
    // Get migration file
    const migrationsDir = './drizzle';
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    
    if (files.length === 0) {
      console.log('❌ No migration files found');
      process.exit(1);
    }
    
    const migrationFile = files.sort().pop();
    console.log(`📄 Running migration: ${migrationFile}`);
    
    const sql = fs.readFileSync(path.join(migrationsDir, migrationFile), 'utf8');
    
    // Split by semicolon and execute
    const statements = sql.split(';').filter(s => s.trim());
    let count = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          count++;
        } catch (e) {
          if (!e.message.includes('already exists')) {
            console.error(`Error in statement: ${e.message}`);
          }
        }
      }
    }
    
    console.log(`✅ Executed ${count} statements successfully`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDB();
