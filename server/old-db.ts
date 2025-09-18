import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import { DatabaseSecurityGuard } from './database-security';
import { DatabaseRestrictionGuard } from './database-restrictions';

// Configure WebSocket for Neon/Supabase serverless connection - Dynamic import
const wsModule = await import("ws");
neonConfig.webSocketConstructor = wsModule.WebSocket;

const SUPABASE_DATABASE_URL = "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

const connectionString = SUPABASE_DATABASE_URL;

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