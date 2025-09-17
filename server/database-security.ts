/**
 * 🔐 نظام الحماية المتقدم لقاعدة البيانات
 * 
 * ⚠️ تحذير صارم: هذا النظام يمنع منعاً باتاً استخدام أي قاعدة بيانات غير Supabase
 * 🛡️ الحماية تشمل: منع قواعد البيانات المحلية، Neon، Replit PostgreSQL، وأي خدمة أخرى
 * ✅ المسموح: Supabase PostgreSQL السحابية فقط (wibtasmyusxfqxxqekks.supabase.co)
 */

export class DatabaseSecurityGuard {
  private static readonly ALLOWED_SUPABASE_PROJECT = 'wibtasmyusxfqxxqekks';
  private static readonly ALLOWED_HOSTS = [
    'aws-0-us-east-1.pooler.supabase.com',
    'supabase.com',
    '.supabase.co'
  ];

  private static readonly FORBIDDEN_NETWORKS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '192.168.',
    '10.0.',
    '172.16.',
    'neon.tech',
    'railway.app',
    'heroku.com',
    'planetscale.com'
  ];

  /**
   * فحص صارم لضمان استخدام Supabase فقط
   */
  static validateDatabaseConnection(connectionString: string): void {
    console.log('🔐 بدء فحص أمني شامل لقاعدة البيانات...');
    
    // فحص وجود رابط الاتصال
    if (!connectionString) {
      throw new Error('❌ رابط قاعدة البيانات مفقود!');
    }

    // فحص الشبكات المحظورة
    const forbiddenNetwork = this.FORBIDDEN_NETWORKS.find(network => 
      connectionString.toLowerCase().includes(network.toLowerCase())
    );
    
    if (forbiddenNetwork) {
      console.error(`🚨 خطر أمني: محاولة استخدام شبكة محظورة: ${forbiddenNetwork}`);
      throw new Error(
        `❌ خطأ أمني حرج: استخدام ${forbiddenNetwork} محظور!\n` +
        `🔐 يجب استخدام Supabase السحابية فقط`
      );
    }

    // فحص أن الرابط يحتوي على مشروع Supabase المحدد
    if (!connectionString.includes(this.ALLOWED_SUPABASE_PROJECT)) {
      throw new Error(
        `❌ خطأ أمني: مشروع Supabase غير صحيح!\n` +
        `🔐 يجب استخدام مشروع: ${this.ALLOWED_SUPABASE_PROJECT}.supabase.co فقط`
      );
    }

    // فحص أن الرابط يحتوي على نطاق Supabase صحيح
    const hasValidHost = this.ALLOWED_HOSTS.some(host => 
      connectionString.includes(host)
    );

    if (!hasValidHost) {
      throw new Error(
        `❌ خطأ أمني: نطاق قاعدة البيانات غير صحيح!\n` +
        `🔐 يجب استخدام Supabase السحابية فقط`
      );
    }

    console.log('✅ فحص الأمان مكتمل - قاعدة البيانات Supabase صحيحة');
  }

  /**
   * مراقبة مستمرة لمتغيرات البيئة المحظورة
   */
  static monitorEnvironmentVariables(): void {
    const FORBIDDEN_ENV_VARS = [
      'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE',
      'NEON_DATABASE_URL', 'DB_URL'
    ];

    // ✅ فحص ذكي لـ DATABASE_URL - نحتفظ بها إذا كانت تشير لـ Supabase الصحيح
    if (process.env.DATABASE_URL) {
      try {
        this.validateDatabaseConnection(process.env.DATABASE_URL);
        console.log('✅ DATABASE_URL صحيحة وتشير لـ Supabase app2data - سيتم الاحتفاظ بها');
      } catch (error) {
        console.warn('⚠️ DATABASE_URL تحتوي على رابط غير آمن - سيتم حذفها');
        delete process.env.DATABASE_URL;
      }
    }

    // فحص باقي المتغيرات المحظورة
    const detectedVars = FORBIDDEN_ENV_VARS.filter(varName => 
      process.env[varName] && process.env[varName] !== ''
    );

    if (detectedVars.length > 0) {
      console.warn(`⚠️ تحذير: متغيرات بيئة محلية محتملة مكتشفة: ${detectedVars.join(', ')}`);
      console.warn('🔐 سيتم تجاهلها واستخدام Supabase السحابية فقط');
      
      // تفريغ المتغيرات المحظورة لضمان عدم استخدامها
      detectedVars.forEach(varName => {
        delete process.env[varName];
      });
    }
  }

  /**
   * تسجيل معلومات الاتصال الآمن
   */
  static logSecureConnectionInfo(): void {
    console.log('🔐 ═══ معلومات اتصال قاعدة البيانات الآمن ═══');
    console.log('✅ قاعدة البيانات: Supabase PostgreSQL السحابية');
    console.log('✅ المشروع: wibtasmyusxfqxxqekks.supabase.co');
    console.log('✅ المنطقة: AWS US-East-1');
    console.log('⛔ قواعد البيانات المحلية: محظورة تماماً');
    console.log('⛔ خدمات أخرى: محظورة (Neon, Replit PostgreSQL, إلخ)');
    console.log('🛡️ مستوى الحماية: متقدم');
  }

  /**
   * فحص دوري للأمان
   */
  static startSecurityMonitoring(): void {
    // فحص دوري كل 30 دقيقة
    setInterval(() => {
      this.monitorEnvironmentVariables();
      this.checkNetworkConnections();
      console.log('🔍 فحص دوري للأمان مكتمل');
    }, 30 * 60 * 1000);
  }

  /**
   * مراقبة اتصالات الشبكة المشبوهة
   */
  private static checkNetworkConnections(): void {
    console.log('🌐 فحص اتصالات الشبكة...');
    
    // فحص أن كل متغيرات البيئة تحتوي على عناوين آمنة فقط
    const criticalEnvVars = ['SUPABASE_URL', 'DATABASE_URL', 'POSTGRES_URL'];
    
    criticalEnvVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        const hasForbiddenNetwork = this.FORBIDDEN_NETWORKS.some(network =>
          value.toLowerCase().includes(network.toLowerCase())
        );
        
        if (hasForbiddenNetwork) {
          console.error(`🚨 اتصال مشبوه مكتشف في ${varName}: ${value}`);
          console.error('⛔ سيتم حذف المتغير المشبوه...');
          delete process.env[varName];
        }
      }
    });
  }

  /**
   * إنشاء تقرير أمني شامل
   */
  static generateSecurityReport(): {
    isSecure: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // فحص متغيرات البيئة
    const suspiciousVars = Object.keys(process.env).filter(key => 
      this.FORBIDDEN_NETWORKS.some(network => 
        (process.env[key] || '').toLowerCase().includes(network.toLowerCase())
      )
    );

    if (suspiciousVars.length > 0) {
      warnings.push(`متغيرات بيئة مشبوهة مكتشفة: ${suspiciousVars.join(', ')}`);
      recommendations.push('احذف جميع متغيرات البيئة المحلية واستخدم Supabase فقط');
    }

    // فحص اتصال Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_URL.includes('supabase')) {
      warnings.push('متغير SUPABASE_URL غير مُعرّف أو غير صحيح');
      recommendations.push('تأكد من تعريف SUPABASE_URL بشكل صحيح');
    }

    const isSecure = warnings.length === 0;
    
    console.log('📊 تقرير الأمان:');
    console.log(`✅ آمن: ${isSecure ? 'نعم' : 'لا'}`);
    if (warnings.length > 0) {
      console.log('⚠️ تحذيرات:', warnings);
    }
    if (recommendations.length > 0) {
      console.log('💡 توصيات:', recommendations);
    }

    return { isSecure, warnings, recommendations };
  }
}