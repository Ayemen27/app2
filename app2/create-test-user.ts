
import { db } from './server/db';
import { users } from '@shared/schema';
import * as crypto from 'crypto';

async function createTestUser() {
  console.log('🚀 إنشاء مستخدم تجريبي...');
  
  try {
    // 1. التحقق من وجود جدول المستخدمين
    console.log('🔍 التحقق من وجود جدول المستخدمين...');
    const tablesCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tablesCheck.length === 0) {
      console.log('❌ جدول المستخدمين غير موجود!');
      console.log('🔧 تشغيل الأمر التالي أولاً: npx tsx setup-database.ts');
      process.exit(1);
    }
    
    console.log('✅ جدول المستخدمين موجود');
    
    // 2. فحص المستخدمين الموجودين
    const existingUsers = await db.execute(sql`SELECT email FROM users`);
    console.log(`👥 عدد المستخدمين الحالي: ${existingUsers.length}`);
    
    // 3. تشفير كلمة المرور
    const password = 'admin123';
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    // 4. إنشاء المستخدم
    const newUser = await db.insert(users).values({
      email: 'admin@test.com',
      password: hashedPassword,
      firstName: 'مدير',
      lastName: 'النظام',
      role: 'admin',
      isActive: true
    }).returning();
    
    console.log('✅ تم إنشاء المستخدم بنجاح:');
    console.log('📧 البريد الإلكتروني: admin@test.com');
    console.log('🔐 كلمة المرور: admin123');
    console.log('👤 الدور: admin');
    console.log('🆔 معرف المستخدم:', newUser[0]?.id);
    
    // 5. التحقق النهائي
    const finalUserCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    console.log(`🎯 إجمالي المستخدمين الآن: ${finalUserCount[0]?.count}`);
    
  } catch (error: any) {
    if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
      console.log('ℹ️ المستخدم موجود مسبقاً');
      console.log('📧 البريد الإلكتروني: admin@test.com');
      console.log('🔐 كلمة المرور: admin123');
      
      // عرض المستخدمين الموجودين
      try {
        const users = await db.execute(sql`SELECT email, role, is_active FROM users ORDER BY created_at`);
        console.log('👥 المستخدمون الموجودون:');
        users.forEach((user: any, index) => {
          console.log(`  ${index + 1}. ${user.email} (${user.role}) - ${user.is_active ? 'نشط' : 'غير نشط'}`);
        });
      } catch (listError) {
        console.log('🔍 لا يمكن عرض قائمة المستخدمين');
      }
    } else if (error.message.includes('relation "users" does not exist')) {
      console.error('❌ جدول المستخدمين غير موجود!');
      console.log('🔧 تشغيل الأمر التالي: npx tsx setup-database.ts');
    } else {
      console.error('❌ خطأ في إنشاء المستخدم:', error.message);
    }
  }
  
  process.exit(0);
}

createTestUser();
