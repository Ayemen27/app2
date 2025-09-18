
import { db } from './server/db';
import { users } from '@shared/schema';
import * as crypto from 'crypto';

async function createTestUser() {
  console.log('🚀 إنشاء مستخدم تجريبي...');
  
  try {
    // تشفير كلمة المرور
    const password = 'admin123';
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    // إنشاء المستخدم
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
    
  } catch (error: any) {
    if (error.message.includes('duplicate key')) {
      console.log('ℹ️ المستخدم موجود مسبقاً');
      console.log('📧 البريد الإلكتروني: admin@test.com');
      console.log('🔐 كلمة المرور: admin123');
    } else {
      console.error('❌ خطأ في إنشاء المستخدم:', error.message);
    }
  }
  
  process.exit(0);
}

createTestUser();
