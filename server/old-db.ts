import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { DatabaseSecurityGuard } from './database-security';
import { DatabaseRestrictionGuard } from './database-restrictions';

// Configure WebSocket for Neon/Supabase serverless connection
neonConfig.webSocketConstructor = ws;

// ✅ SUPABASE CLOUD DATABASE CONFIGURATION - الاتصال الوحيد المسموح
// ⚠️ تحذير صارم: ممنوع منعاً باتاً استخدام قاعدة البيانات المحلية الخاصة بـ Replit
// ⚠️ التطبيق يستخدم فقط قاعدة بيانات Supabase PostgreSQL السحابية
// ⚠️ أي محاولة لاستخدام DATABASE_URL المحلي سيؤدي إلى فشل النظام

const SUPABASE_DATABASE_URL = "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

// ⛔ حماية صارمة ضد استخدام قواعد البيانات المحلية
// ✅ الاتصال الوحيد المسموح: Supabase Cloud Database
const connectionString = SUPABASE_DATABASE_URL;

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