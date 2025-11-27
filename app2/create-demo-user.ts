import { Client } from 'pg';
import fs from 'fs';
import crypto from 'crypto';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  try {
    await client.connect();
    console.log('✓ متصل بقاعدة البيانات');
    
    // 1. تنفيذ migration SQL
    console.log('📄 جاري إنشاء الجداول...');
    const sql = fs.readFileSync('./migrations/0000_complete_schema_migration.sql', 'utf8');
    const statements = sql.split('--> statement-breakpoint').filter(s => s.trim());
    
    let count = 0;
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await client.query(stmt);
          count++;
        } catch (e: any) {
          if (e.code === '42P07' || e.code === '42601') continue;
          console.error(`❌ خطأ: ${e.message.substring(0, 60)}`);
        }
      }
    }
    console.log(`✅ تم إنشاء ${count} جداول/كائنات`);
    
    // 2. إنشاء مستخدم تجريبي
    console.log('👤 جاري إنشاء مستخدم تجريبي...');
    
    const demoUser = {
      id: crypto.randomUUID(),
      email: 'demo@test.com',
      password: 'Demo@123456', // Hash this in real scenario
      fullName: 'مستخدم تجريبي',
      role: 'admin',
      isActive: true
    };
    
    try {
      // تجربة إدراج المستخدم
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (email) DO NOTHING`,
        [
          demoUser.id,
          demoUser.email,
          demoUser.password, // في الواقع يجب أن يكون مُشفر
          demoUser.fullName,
          demoUser.role,
          true
        ]
      );
      console.log(`✅ تم إنشاء مستخدم تجريبي`);
      console.log(`   البريد: ${demoUser.email}`);
      console.log(`   كلمة المرور: ${demoUser.password}`);
    } catch (e: any) {
      console.log(`⚠ المستخدم موجود بالفعل أو حدث خطأ: ${e.message.substring(0, 50)}`);
    }
    
    console.log('\n✅ تم إكمال التهيئة بنجاح!');
    
  } catch (error: any) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

init();
