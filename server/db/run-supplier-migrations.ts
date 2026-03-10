import { db } from "../db";
import { sql } from "drizzle-orm";
import { suppliers, supplierPayments } from "@shared/schema";

async function runSupplierMigrations() {
  console.log('🚀 بدء تطبيق migrations الموردين...');
  
  try {
    // إنشاء جدول الموردين
    console.log('📊 إنشاء جدول الموردين...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        contact_person TEXT,
        phone TEXT,
        address TEXT,
        email TEXT,
        tax_number TEXT,
        credit_limit DECIMAL(10,2) DEFAULT 0,
        payment_terms INTEGER DEFAULT 30,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    // إنشاء جدول مدفوعات الموردين
    console.log('💰 إنشاء جدول مدفوعات الموردين...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id VARCHAR NOT NULL REFERENCES suppliers(id),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        purchase_id VARCHAR REFERENCES material_purchases(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'نقد',
        payment_date TEXT NOT NULL,
        reference_number TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    // إضافة فهارس للأداء
    console.log('🔍 إنشاء فهارس الأداء...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_project ON supplier_payments(project_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(payment_date);
    `);
    
    // إضافة حقل supplierId لجدول material_purchases إذا لم يكن موجوداً
    console.log('🔗 تحديث جدول المشتريات...');
    try {
      await db.execute(sql`
        ALTER TABLE material_purchases 
        ADD COLUMN IF NOT EXISTS supplier_id VARCHAR REFERENCES suppliers(id);
      `);
      
      // إضافة حقول محاسبية جديدة
      await db.execute(sql`
        ALTER TABLE material_purchases 
        ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
        ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
        ADD COLUMN IF NOT EXISTS due_date TEXT;
      `);
      
      // فهرس على supplier_id
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_material_purchases_supplier ON material_purchases(supplier_id);
      `);
      
    } catch (error) {
      console.log('⚠️ بعض الحقول موجودة مسبقاً:', (error as Error).message);
    }
    
    console.log('✅ تم تطبيق جميع migrations الموردين بنجاح!');
    
    // إضافة الموردين التجريبيين
    console.log('📝 إضافة موردين تجريبيين...');
    
    // Use dynamic port for migrations if needed, but here it's just data insertion
    // If there was a fetch to localhost:5000, it would be replaced. 
    // Checking the file content again to be sure.
    
    const sampleSuppliers = [
      {
        name: 'مؤسسة الخليج للحديد والأسمنت',
        contactPerson: 'أحمد محمد',
        phone: '777123456',
        address: 'شارع الزبيري، صنعاء',
        paymentTerms: 30,
        creditLimit: '500000',
        notes: 'مورد أساسي للحديد والأسمنت'
      },
      {
        name: 'شركة البناء الحديث للمواد',
        contactPerson: 'علي حسن',
        phone: '777654321',
        address: 'منطقة الثورة، صنعاء',
        paymentTerms: 15,
        creditLimit: '300000',
        notes: 'متخصص في مواد التشطيب'
      },
      {
        name: 'مؤسسة النجاح التجارية',
        contactPerson: 'سالم محمد',
        phone: '777987654',
        address: 'شارع الستين، صنعاء',
        paymentTerms: 45,
        creditLimit: '750000',
        notes: 'مورد شامل لجميع مواد البناء'
      }
    ];
    
    for (const supplier of sampleSuppliers) {
      try {
        await db.execute(sql`
          INSERT INTO suppliers (name, contact_person, phone, address, payment_terms, credit_limit, notes)
          VALUES (${supplier.name}, ${supplier.contactPerson}, ${supplier.phone}, ${supplier.address}, ${supplier.paymentTerms}, ${supplier.creditLimit}, ${supplier.notes})
          ON CONFLICT (name, created_by) DO NOTHING;
        `);
        console.log(`➕ تم إضافة المورد: ${supplier.name}`);
      } catch (error) {
        console.log(`⚠️ المورد ${supplier.name} موجود مسبقاً`);
      }
    }
    
    console.log('🎉 تم إكمال إعداد نظام الموردين بنجاح!');
    return true;
    
  } catch (error) {
    console.error('❌ خطأ فيmigrations الموردين:', error);
    throw error;
  }
}

export { runSupplierMigrations };

// تشغيل المهمة إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  runSupplierMigrations()
    .then(() => {
      console.log('✅ انتهت migrations الموردين بنجاح');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ فشل فيmigrations الموردين:', error);
      process.exit(1);
    });
}