import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { DatabaseSecurityGuard } from './database-security';
import { DatabaseRestrictionGuard } from './database-restrictions';
import { getDatabaseUrl } from './services/SmartSecretsManager';

// Configure WebSocket for Neon/Supabase serverless connection
neonConfig.webSocketConstructor = ws;

// ✅ SUPABASE CLOUD DATABASE CONFIGURATION - الاتصال الوحيد المسموح
// ⚠️ تحذير صارم: ممنوع منعاً باتاً استخدام قاعدة البيانات المحلية الخاصة بـ Replit
// ⚠️ التطبيق يستخدم فقط قاعدة بيانات Supabase PostgreSQL السحابية
// ⚠️ أي محاولة لاستخدام DATABASE_URL المحلي سيؤدي إلى فشل النظام

// إنشاء رابط قاعدة البيانات بناءً على البيئة
function createDatabaseUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isProduction) {
    // في بيئة الإنتاج المحلية، حاول تحميل متغيرات البيئة من النظام الذكي
    if (!process.env.VERCEL) {
      // في Replit production mode، استخدم القيمة الثابتة المعروفة
      return "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/app2data";
    }
    
    // في بيئة Vercel، حاول استخدام متغيرات Supabase إذا كانت متوفرة
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && serviceKey) {
      // تحويل URL لتنسيق PostgreSQL
      const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
      return `postgresql://postgres.${projectRef}:${serviceKey}@aws-0-us-east-1.pooler.supabase.com:6543/app2data`;
    }
    
    // استخدام القيمة الثابتة كبديل إذا لم تكن متغيرات البيئة متوفرة
    console.log('⚠️ لم يتم العثور على متغيرات Supabase، استخدام القيمة الثابتة...');
    return "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/app2data";
  } else {
    // في بيئة التطوير، استخدم القيمة الثابتة المعروفة
    return "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/app2data";
  }
}

// ⛔ حماية صارمة ضد استخدام قواعد البيانات المحلية
// ✅ الاتصال الوحيد المسموح: Supabase Cloud Database
const connectionString = createDatabaseUrl();

// ⚠️ تفعيل نظام الحماية المتقدم والموانع الصارمة
DatabaseSecurityGuard.monitorEnvironmentVariables();
DatabaseSecurityGuard.validateDatabaseConnection(connectionString);
DatabaseSecurityGuard.logSecureConnectionInfo();

// تطبيق موانع صارمة ضد قواعد البيانات المحلية
DatabaseRestrictionGuard.validateSystemSecurity();

// بدء المراقبة الدورية للأمان
DatabaseSecurityGuard.startSecurityMonitoring();

// إنشاء تقرير أمني شامل
const securityReport = DatabaseSecurityGuard.generateSecurityReport();
if (!securityReport.isSecure) {
  console.error('🚨 تحذير أمني: النظام يحتوي على ثغرات أمنية!');
  securityReport.warnings.forEach(warning => console.error(`⚠️ ${warning}`));
}

// تكوين اتصال قاعدة البيانات السحابية
export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });