
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function createTablesDirectly() {
  console.log('🚀 إنشاء الجداول مباشرة...');
  
  try {
    // إنشاء جدول المستخدمين
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ تم إنشاء جدول المستخدمين');

    // إنشاء جدول المشاريع
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        start_date TEXT,
        end_date TEXT,
        budget DECIMAL(12,2),
        location TEXT,
        client_name TEXT,
        client_phone TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ تم إنشاء جدول المشاريع');

    // إنشاء جدول العمال
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS workers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT,
        type TEXT NOT NULL,
        daily_wage DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'active',
        hired_date TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ تم إنشاء جدول العمال');

    // إنشاء جدول حضور العمال
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS worker_attendance (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id VARCHAR NOT NULL REFERENCES workers(id),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        attendance_date TEXT NOT NULL,
        hours_worked DECIMAL(4,2) DEFAULT 8.00,
        overtime DECIMAL(4,2) DEFAULT 0.00,
        daily_wage DECIMAL(10,2) NOT NULL,
        overtime_rate DECIMAL(10,2) DEFAULT 0.00,
        total_pay DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ تم إنشاء جدول حضور العمال');

    // إنشاء جدول المصروفات اليومية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS daily_expenses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        expense_date TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        receipt_number TEXT,
        supplier_name TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ تم إنشاء جدول المصروفات اليومية');

    // إنشاء جدول شراء المواد
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS material_purchases (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        purchase_date TEXT NOT NULL,
        material_name TEXT NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        unit TEXT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        supplier_name TEXT,
        receipt_number TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ تم إنشاء جدول شراء المواد');

    // إنشاء جدول المعدات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS equipment (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        serial_number TEXT,
        category TEXT NOT NULL,
        purchase_date TEXT,
        purchase_price DECIMAL(10,2),
        current_value DECIMAL(10,2),
        status TEXT DEFAULT 'available',
        location TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ تم إنشاء جدول المعدات');

    // إنشاء جدول الإكمال التلقائي
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS autocomplete_data (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        category TEXT NOT NULL,
        value TEXT NOT NULL,
        usage_count INTEGER DEFAULT 1,
        last_used TIMESTAMP DEFAULT now(),
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ تم إنشاء جدول الإكمال التلقائي');

    // إنشاء المستخدم التجريبي
    const password = 'admin123';
    const crypto = await import('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    await db.execute(sql`
      INSERT INTO users (email, password, first_name, last_name, role, is_active)
      VALUES ('admin@test.com', ${hashedPassword}, 'مدير', 'النظام', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('✅ تم إنشاء المستخدم التجريبي');

    console.log('🎉 تم إنشاء جميع الجداول والبيانات بنجاح!');
    console.log('');
    console.log('📧 البريد الإلكتروني: admin@test.com');
    console.log('🔐 كلمة المرور: admin123');
    
  } catch (error: any) {
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
  }
  
  process.exit(0);
}

createTablesDirectly();
