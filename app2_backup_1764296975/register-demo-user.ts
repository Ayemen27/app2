import { db } from './server/db';
import { users } from './shared/schema';
import crypto from 'crypto';

async function registerDemoUser() {
  try {
    console.log('🔑 جاري إنشاء مستخدم تجريبي...');
    
    const hashedPassword = crypto
      .createHash('sha256')
      .update('Demo@123456')
      .digest('hex');

    const result = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: 'demo@test.com',
        passwordHash: hashedPassword,
        fullName: 'مستخدم تجريبي',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (result.length > 0) {
      console.log('✅ تم إنشاء المستخدم بنجاح');
      console.log('📧 البريد: demo@test.com');
      console.log('🔐 كلمة المرور: Demo@123456');
    } else {
      console.log('ℹ️ المستخدم موجود بالفعل');
    }
  } catch (error: any) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
}

registerDemoUser();
