/**
 * خدمة البريد الإلكتروني المتقدمة
 * إدارة إرسال البريد الإلكتروني باستخدام nodemailer
 */

import nodemailer from 'nodemailer';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { emailVerificationTokens, passwordResetTokens, users } from '../../shared/schema.js';
import { hashPassword } from '../auth/crypto-utils.js';
import crypto from 'crypto';

// تحسين الأداء: إنشاء transporter واحد مع connection pooling
let emailTransporter: nodemailer.Transporter | null = null;

const getEmailTransporter = (): nodemailer.Transporter => {
  if (!emailTransporter) {
    // تنظيف البريد الإلكتروني من المسافات الزائدة
    const smtpUser = process.env.SMTP_USER?.trim().replace(/\s+/g, '') || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      pool: true, // تمكين connection pooling
      maxConnections: 5, // الحد الأقصى للاتصالات المتزامنة
      maxMessages: 100, // أقصى عدد رسائل لكل اتصال
      rateLimit: 14, // معدل الإرسال (رسائل في الثانية)
      keepAlive: true, // الحفاظ على الاتصال مفتوحاً
      auth: {
        user: smtpUser,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    console.log('🚀 [EmailService] إنشاء transporter محسّن مع connection pooling:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      pool: smtpConfig.pool,
      maxConnections: smtpConfig.maxConnections,
      user: smtpUser,
      hasPassword: !!smtpConfig.auth.pass
    });

    emailTransporter = nodemailer.createTransport(smtpConfig);
  }
  return emailTransporter!;
};

// تحقق من صحة إعداد البريد الإلكتروني
export async function verifyEmailConfiguration(): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    await transporter.verify();
    console.log('✅ [EmailService] تم التحقق من إعداد SMTP بنجاح');
    return true;
  } catch (error) {
    console.error('❌ [EmailService] فشل في التحقق من إعداد SMTP:', error);
    return false;
  }
}

// تهيئة transporter عند بدء تشغيل الخدمة
export async function initializeEmailService(): Promise<void> {
  console.log('🔧 [EmailService] تهيئة خدمة البريد الإلكتروني...');
  try {
    await verifyEmailConfiguration();
    console.log('✅ [EmailService] تم تهيئة خدمة البريد الإلكتروني بنجاح');
  } catch (error) {
    console.error('❌ [EmailService] فشل في تهيئة خدمة البريد الإلكتروني:', error);
  }
}

// دالة لإنشاء رمز تحقق عشوائي (6 أرقام)
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// دالة لإنشاء رمز آمن لاسترجاع كلمة المرور
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// دالة لتحديد النطاق حسب البيئة
function getDynamicDomain(): string {
  // أولوية أولى: استخدام DOMAIN من ملف .env
  if (process.env.DOMAIN && process.env.DOMAIN.trim()) {
    console.log('🌐 [EmailService] استخدام DOMAIN من .env:', process.env.DOMAIN);
    return process.env.DOMAIN.trim();
  }
  
  // في بيئة التطوير
  if (process.env.NODE_ENV === 'development') {
    console.log('🌐 [EmailService] استخدام localhost للتطوير');
    return 'localhost:5000';
  }
  
  // إذا كان على Replit (كحل احتياطي فقط)
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const replitDomain = `${process.env.REPL_SLUG}--5000.${process.env.REPL_OWNER}.repl.co`;
    console.log('🌐 [EmailService] استخدام Replit domain كحل احتياطي:', replitDomain);
    return replitDomain;
  }
  
  // القيم الافتراضية حسب البيئة
  const defaultDomain = process.env.DOMAIN || 'app2.binarjoinanelytic.info';
  
  console.log('🌐 [EmailService] استخدام القيمة الافتراضية:', defaultDomain);
  return defaultDomain;
}

// دالة لتحديد البروتوكول
function getProtocol(): string {
  return process.env.NODE_ENV === 'production' ? 'https' : 'http';
}

// دالة لتشفير الرموز
async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// قوالب البريد الإلكتروني
const emailTemplates = {
  verification: (code: string, verificationLink: string, userFullName?: string) => ({
    subject: '🔐 تحقق من حسابك - نظام إدارة المشاريع',
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تحقق من حسابك</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 40px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px; text-align: center; }
          .verification-code { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; display: inline-block; }
          .button { display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; margin: 20px 0; transition: transform 0.3s ease; }
          .button:hover { transform: translateY(-2px); }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; border-top: 1px solid #e9ecef; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 10px; margin: 20px 0; color: #856404; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 تحقق من حسابك</h1>
            <p>نظام إدارة المشاريع الإنشائية</p>
          </div>
          <div class="content">
            <h2>${userFullName ? `مرحباً ${userFullName}!` : 'مرحباً بك!'}</h2>
            <p>شكراً لك على التسجيل في نظام إدارة المشاريع. لإكمال تفعيل حسابك، يرجى استخدام رمز التحقق التالي:</p>
            
            <div class="verification-code" style="cursor: pointer; user-select: all; position: relative;">
              ${code}
              <small style="display: block; font-size: 12px; margin-top: 10px; opacity: 0.8;">انقر لتحديد الكود</small>
            </div>
            
            <p>أو يمكنك الضغط على الرابط التالي للتحقق مباشرة:</p>
            <a href="${verificationLink}" class="button">✅ تحقق من الحساب</a>
            
            <div class="warning">
              <strong>تنبيه أمني:</strong>
              <ul style="text-align: right; margin: 10px 0;">
                <li>هذا الرمز صالح لمدة 24 ساعة فقط</li>
                <li>لا تشارك هذا الرمز مع أي شخص آخر</li>
                <li>إذا لم تطلب هذا التحقق، يرجى تجاهل هذا البريد</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 نظام إدارة المشاريع - جميع الحقوق محفوظة</p>
            <p>هذا بريد إلكتروني تلقائي، يرجى عدم الرد عليه</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      تحقق من حسابك - نظام إدارة المشاريع
      
      ${userFullName ? `مرحباً ${userFullName}!` : 'مرحباً بك!'}
      شكراً لك على التسجيل في نظام إدارة المشاريع.
      
      رمز التحقق الخاص بك: ${code}
      
      أو استخدم الرابط التالي: ${verificationLink}
      
      هذا الرمز صالح لمدة 24 ساعة فقط.
      إذا لم تطلب هذا التحقق، يرجى تجاهل هذا البريد.
    `
  }),

  passwordReset: (resetLink: string, userEmail: string) => ({
    subject: '🔑 استرجاع كلمة المرور - نظام إدارة المشاريع',
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>استرجاع كلمة المرور</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 40px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px; text-align: center; }
          .button { display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; margin: 20px 0; transition: transform 0.3s ease; }
          .button:hover { transform: translateY(-2px); }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; border-top: 1px solid #e9ecef; }
          .warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 10px; margin: 20px 0; color: #721c24; }
          .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 10px; margin: 20px 0; color: #0c5460; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 استرجاع كلمة المرور</h1>
            <p>نظام إدارة المشاريع الإنشائية</p>
          </div>
          <div class="content">
            <h2>طلب استرجاع كلمة المرور</h2>
            <p>تم استلام طلب لاسترجاع كلمة المرور للحساب المرتبط بـ: <strong>${userEmail}</strong></p>
            
            <p>للمتابعة، يرجى الضغط على الرابط التالي لإنشاء كلمة مرور جديدة:</p>
            <a href="${resetLink}" class="button">🔐 إنشاء كلمة مرور جديدة</a>
            
            <div class="warning">
              <strong>تنبيه أمني مهم:</strong>
              <ul style="text-align: right; margin: 10px 0;">
                <li>هذا الرابط صالح لمدة ساعة واحدة فقط</li>
                <li>يمكن استخدام الرابط مرة واحدة فقط</li>
                <li>لا تشارك هذا الرابط مع أي شخص آخر</li>
              </ul>
            </div>
            
            <div class="info">
              <strong>إذا لم تطلب استرجاع كلمة المرور:</strong>
              <p>يرجى تجاهل هذا البريد وتغيير كلمة المرور الحالية للأمان</p>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 نظام إدارة المشاريع - جميع الحقوق محفوظة</p>
            <p>هذا بريد إلكتروني تلقائي، يرجى عدم الرد عليه</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      استرجاع كلمة المرور - نظام إدارة المشاريع
      
      تم استلام طلب لاسترجاع كلمة المرور للحساب: ${userEmail}
      
      لإنشاء كلمة مرور جديدة، استخدم الرابط التالي: ${resetLink}
      
      هذا الرابط صالح لمدة ساعة واحدة فقط.
      إذا لم تطلب استرجاع كلمة المرور، يرجى تجاهل هذا البريد.
    `
  })
};

/**
 * إرسال رمز التحقق من البريد الإلكتروني
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string,
  userFullName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📧 [EmailService] بدء إرسال رمز التحقق للمستخدم:', userId);

    // استثناء المدير الأول من إرسال رموز التحقق
    if (email === 'binarjoinanalytic@gmail.com') {
      console.log('⚠️ [EmailService] المدير الأول لا يحتاج لإرسال رموز تحقق');
      // تحقيق بريد المدير الأول تلقائياً
      await db.update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, userId));
      
      return {
        success: true,
        message: 'حساب المدير الأول محقق تلقائياً'
      };
    }

    // استخدام الاسم المُمرر مباشرة - بدون استعلام قاعدة بيانات غير ضروري
    const displayName = userFullName?.trim() || null;
    console.log('👤 [EmailService] استخدام الاسم المُمرر مباشرة:', displayName || 'بدون اسم');

    // التحقق من إعداد البريد الإلكتروني
    const isConfigValid = await verifyEmailConfiguration();
    if (!isConfigValid) {
      return {
        success: false,
        message: 'خطأ في إعداد خدمة البريد الإلكتروني'
      };
    }

    // حذف الرموز القديمة المنتهية الصلاحية للمستخدم
    await db.delete(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.userId, userId),
        eq(emailVerificationTokens.email, email)
      ));

    // إنشاء رمز تحقق جديد
    const verificationCode = generateVerificationCode();
    const tokenHash = await hashToken(verificationCode);
    
    // إنشاء رابط التحقق
    const domain = getDynamicDomain();
    const protocol = getProtocol();
    const verificationLink = `${protocol}://${domain}/verify-email?token=${verificationCode}&userId=${userId}`;
    
    console.log('🔗 [EmailService] رابط التحقق المُنشأ:', verificationLink);

    // حفظ الرمز في قاعدة البيانات
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // صالح لمدة 24 ساعة

    await db.insert(emailVerificationTokens).values({
      userId,
      email,
      token: verificationCode,
      tokenHash,
      verificationLink,
      expiresAt,
      ipAddress,
      userAgent
    });

    // إرسال البريد الإلكتروني
    const transporter = getEmailTransporter();
    const emailTemplate = emailTemplates.verification(verificationCode, verificationLink, displayName || undefined);

    const cleanEmail = process.env.SMTP_USER?.trim().replace(/\s+/g, '') || '';
    await transporter.sendMail({
      from: `"نظام إدارة المشاريع" <${cleanEmail}>`,
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    console.log('✅ [EmailService] تم إرسال رمز التحقق بنجاح إلى:', email);

    return {
      success: true,
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني'
    };

  } catch (error) {
    console.error('❌ [EmailService] فشل في إرسال رمز التحقق:', error);
    return {
      success: false,
      message: 'فشل في إرسال رمز التحقق. يرجى المحاولة لاحقاً'
    };
  }
}

/**
 * التحقق من رمز البريد الإلكتروني
 */
export async function verifyEmailToken(
  userId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔍 [EmailService] بدء التحقق من الرمز:', { userId, tokenLength: token.length });

    // فحص ما إذا كان المدير الأول
    const userCheck = await db.select({ 
      email: users.email, 
      emailVerifiedAt: users.emailVerifiedAt 
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const isFirstAdmin = userCheck.length > 0 && userCheck[0].email === 'binarjoinanalytic@gmail.com';
    
    // المدير الأول يجب أن يكون محقق البريد دائماً
    if (isFirstAdmin) {
      console.log('✅ [EmailService] تحقيق بريد المدير الأول تلقائياً...');
      await db.update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, userId));
      
      return {
        success: true,
        message: 'تم التحقق من بريدك الإلكتروني بنجاح'
      };
    }

    // البحث عن الرمز في قاعدة البيانات
    const tokenRecord = await db.select()
      .from(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.userId, userId),
        eq(emailVerificationTokens.token, token)
      ))
      .limit(1);

    console.log('🔍 [EmailService] نتيجة البحث:', { found: tokenRecord.length > 0, userId, token });

    if (tokenRecord.length === 0) {
      console.log('❌ [EmailService] لم يتم العثور على الرمز');
      return {
        success: false,
        message: 'رمز التحقق غير صالح'
      };
    }

    const record = tokenRecord[0];
    console.log('✅ [EmailService] تم العثور على الرمز:', { id: record.id, verifiedAt: record.verifiedAt });

    // التحقق من انتهاء الصلاحية
    if (new Date() > record.expiresAt) {
      console.log('❌ [EmailService] الرمز منتهي الصلاحية');
      // حذف الرمز المنتهي الصلاحية
      await db.delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.id, record.id));

      return {
        success: false,
        message: 'رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد'
      };
    }

    // التحقق من أن الرمز لم يتم استخدامه من قبل
    if (record.verifiedAt) {
      console.log('❌ [EmailService] الرمز تم استخدامه مسبقاً');
      return {
        success: false,
        message: 'تم استخدام هذا الرمز مسبقاً'
      };
    }

    console.log('🔄 [EmailService] بدء تحديث جداول التحقق والمستخدمين...');

    // تحديث حالة التحقق في جدول رموز التحقق
    const tokenUpdate = await db.update(emailVerificationTokens)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerificationTokens.id, record.id));
    
    console.log('📝 [EmailService] تم تحديث email_verification_tokens');

    // تحديث حساب المستخدم لتأكيد تحقق البريد الإلكتروني
    const userUpdate = await db.update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, userId));
    
    console.log('📝 [EmailService] تم تحديث users بنجاح');

    // التحقق من نجاح التحديث فوراً
    const verifyUpdate = await db.select({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    console.log('🔍 [EmailService] فحص البيانات بعد التحديث:', verifyUpdate.length > 0 ? verifyUpdate[0] : 'لا توجد بيانات');

    console.log('✅ [EmailService] اكتمل التحقق من البريد الإلكتروني بنجاح للمستخدم:', userId);

    return {
      success: true,
      message: 'تم التحقق من بريدك الإلكتروني بنجاح'
    };

  } catch (error) {
    console.error('❌ [EmailService] خطأ في التحقق من الرمز:', error);
    return {
      success: false,
      message: 'فشل في التحقق من الرمز. يرجى المحاولة لاحقاً'
    };
  }
}

/**
 * إرسال رابط استرجاع كلمة المرور
 */
export async function sendPasswordResetEmail(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔑 [EmailService] بدء إرسال رابط استرجاع كلمة المرور للبريد:', email);

    // البحث عن المستخدم
    const userResult = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      // لأغراض الأمان، نرسل نفس الرسالة حتى لو لم يوجد المستخدم
      return {
        success: true,
        message: 'إذا كان البريد الإلكتروني مسجل في النظام، ستحصل على رابط استرجاع كلمة المرور'
      };
    }

    const user = userResult[0];

    // التحقق من إعداد البريد الإلكتروني
    const isConfigValid = await verifyEmailConfiguration();
    if (!isConfigValid) {
      return {
        success: false,
        message: 'خطأ في إعداد خدمة البريد الإلكتروني'
      };
    }

    // حذف رموز الاسترجاع القديمة للمستخدم
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    // إنشاء رمز استرجاع جديد
    const resetToken = generateSecureToken();
    const tokenHash = await hashToken(resetToken);

    // إنشاء رابط الاسترجاع
    const domain = getDynamicDomain();
    const protocol = getProtocol();
    const resetLink = `${protocol}://${domain}/reset-password?token=${resetToken}`;
    
    console.log('🔗 [EmailService] رابط استرجاع كلمة المرور المُنشأ:', resetLink);

    // حفظ الرمز في قاعدة البيانات
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // صالح لمدة ساعة واحدة

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent
    });

    // إرسال البريد الإلكتروني
    const transporter = getEmailTransporter();
    const emailTemplate = emailTemplates.passwordReset(resetLink, email);

    const cleanEmail = process.env.SMTP_USER?.trim().replace(/\s+/g, '') || '';
    await transporter.sendMail({
      from: `"نظام إدارة المشاريع" <${cleanEmail}>`,
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    console.log('✅ [EmailService] تم إرسال رابط استرجاع كلمة المرور بنجاح إلى:', email);

    return {
      success: true,
      message: 'إذا كان البريد الإلكتروني مسجل في النظام، ستحصل على رابط استرجاع كلمة المرور'
    };

  } catch (error) {
    console.error('❌ [EmailService] فشل في إرسال رابط استرجاع كلمة المرور:', error);
    return {
      success: false,
      message: 'فشل في إرسال رابط الاسترجاع. يرجى المحاولة لاحقاً'
    };
  }
}

/**
 * التحقق من رمز استرجاع كلمة المرور وتحديث كلمة المرور
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔐 [EmailService] التحقق من رمز استرجاع كلمة المرور');

    // البحث عن الرمز في قاعدة البيانات
    const tokenRecord = await db.select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    if (tokenRecord.length === 0) {
      return {
        success: false,
        message: 'رمز الاسترجاع غير صالح'
      };
    }

    const record = tokenRecord[0];

    // التحقق من انتهاء الصلاحية
    if (new Date() > record.expiresAt) {
      // حذف الرمز المنتهي الصلاحية
      await db.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.id, record.id));

      return {
        success: false,
        message: 'رمز الاسترجاع منتهي الصلاحية. يرجى طلب رمز جديد'
      };
    }

    // التحقق من أن الرمز لم يتم استخدامه من قبل
    if (record.usedAt) {
      return {
        success: false,
        message: 'تم استخدام هذا الرمز مسبقاً'
      };
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await hashPassword(newPassword);

    // تحديث كلمة مرور المستخدم
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, record.userId));

    // تحديث حالة الرمز كمستخدم
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    console.log('✅ [EmailService] تم تحديث كلمة المرور بنجاح للمستخدم:', record.userId);

    return {
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح'
    };

  } catch (error) {
    console.error('❌ [EmailService] فشل في تحديث كلمة المرور:', error);
    return {
      success: false,
      message: 'فشل في تحديث كلمة المرور. يرجى المحاولة لاحقاً'
    };
  }
}

/**
 * التحقق من صحة رمز استرجاع كلمة المرور (بدون تحديث كلمة المرور)
 */
export async function validatePasswordResetToken(token: string): Promise<{ success: boolean; message: string }> {
  try {
    const tokenRecord = await db.select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    if (tokenRecord.length === 0) {
      return {
        success: false,
        message: 'رمز الاسترجاع غير صالح'
      };
    }

    const record = tokenRecord[0];

    if (new Date() > record.expiresAt) {
      return {
        success: false,
        message: 'رمز الاسترجاع منتهي الصلاحية'
      };
    }

    if (record.usedAt) {
      return {
        success: false,
        message: 'تم استخدام هذا الرمز مسبقاً'
      };
    }

    return {
      success: true,
      message: 'رمز الاسترجاع صالح'
    };

  } catch (error) {
    console.error('❌ [EmailService] فشل في التحقق من رمز الاسترجاع:', error);
    return {
      success: false,
      message: 'فشل في التحقق من الرمز'
    };
  }
}