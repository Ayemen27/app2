import { db } from "../db";
import * as schema from "@shared/schema";

interface SchemaValidationResult {
  isConsistent: boolean;
  missingInDb: string[];
  missingInSchema: string[];
  schemaTableCount: number;
  dbTableCount: number;
  timestamp: string;
}

const SYSTEM_TABLES = [
  'drizzle_migrations',
  'spatial_ref_sys',
  'geometry_columns',
  'geography_columns',
];

let lastResult: SchemaValidationResult | null = null;

function extractSchemaTableNames(): string[] {
  const tables: string[] = [];
  const drizzleNameSymbol = Symbol.for('drizzle:Name');

  for (const key of Object.keys(schema)) {
    try {
      const val = (schema as any)[key];
      if (
        val &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof val[drizzleNameSymbol] === 'string'
      ) {
        const tableName = val[drizzleNameSymbol];
        if (!tables.includes(tableName)) {
          tables.push(tableName);
        }
      }
    } catch {
    }
  }

  return tables;
}

async function fetchDbTableNames(): Promise<string[]> {
  const result = await db.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  return ((result as any).rows || []).map((r: any) => r.table_name);
}

export async function validateSchemaIntegrity(): Promise<SchemaValidationResult> {
  console.log('🔍 [Schema Guard] بدء فحص التكامل ثنائي الاتجاه...');

  const schemaTables = extractSchemaTableNames();

  let dbTables: string[] = [];
  try {
    dbTables = await fetchDbTableNames();
  } catch (error) {
    console.error('❌ [Schema Guard] فشل الاتصال بقاعدة البيانات:', error);
    const result: SchemaValidationResult = {
      isConsistent: false,
      missingInDb: [],
      missingInSchema: [],
      schemaTableCount: schemaTables.length,
      dbTableCount: 0,
      timestamp: new Date().toISOString()
    };
    lastResult = result;
    return result;
  }

  const filteredDbTables = dbTables.filter(t => !SYSTEM_TABLES.includes(t));

  const missingInDb = schemaTables.filter(t => !filteredDbTables.includes(t));
  const missingInSchema = filteredDbTables.filter(t => !schemaTables.includes(t));

  if (missingInDb.length > 0) {
    console.warn(`⚠️ [Schema Guard] جداول معرّفة في الكود لكنها غير موجودة في قاعدة البيانات (${missingInDb.length}):`);
    missingInDb.forEach(t => console.warn(`   - ${t}`));
  }

  if (missingInSchema.length > 0) {
    console.warn(`⚠️ [Schema Guard] جداول موجودة في قاعدة البيانات لكنها غير معرّفة في الكود (${missingInSchema.length}):`);
    missingInSchema.forEach(t => console.warn(`   - ${t}`));
    console.warn('   ⛔ تحذير: تشغيل db:push سيحذف هذه الجداول! لا تستخدم db:push.');
  }

  const isConsistent = missingInDb.length === 0 && missingInSchema.length === 0;

  if (isConsistent) {
    console.log(`✅ [Schema Guard] المخطط متطابق تماماً (${schemaTables.length} جدول في الكود = ${filteredDbTables.length} جدول في القاعدة)`);
  } else {
    console.warn(`📊 [Schema Guard] ملخص: ${schemaTables.length} جدول في الكود، ${filteredDbTables.length} جدول في القاعدة | ناقصة من DB: ${missingInDb.length} | ناقصة من الكود: ${missingInSchema.length}`);
  }

  const result: SchemaValidationResult = {
    isConsistent,
    missingInDb,
    missingInSchema,
    schemaTableCount: schemaTables.length,
    dbTableCount: filteredDbTables.length,
    timestamp: new Date().toISOString()
  };
  lastResult = result;
  return result;
}

export function getSchemaStatus() {
  return {
    lastCheck: lastResult?.timestamp || null,
    isConsistent: lastResult?.isConsistent ?? null,
    schemaTableCount: lastResult?.schemaTableCount ?? null,
    dbTableCount: lastResult?.dbTableCount ?? null,
    missingInDb: lastResult?.missingInDb?.length ?? null,
    missingInSchema: lastResult?.missingInSchema?.length ?? null,
    warning: '⛔ db:push معطّل - استخدم SQL مباشر لتغييرات قاعدة البيانات'
  };
}

export async function runStartupValidation(): Promise<void> {
  const TIMEOUT = 15000;
  try {
    const result = await Promise.race([
      validateSchemaIntegrity(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Schema check timeout')), TIMEOUT)
      )
    ]);

    if (result && !result.isConsistent) {
      console.warn('⚠️ [Schema Guard] توجد اختلافات بين المخطط وقاعدة البيانات - راجع التفاصيل أعلاه');
    }
  } catch (error: any) {
    if (error.message === 'Schema check timeout') {
      console.log('⏱️ [Schema Guard] تم تجاوز وقت الفحص - سيستمر الخادم بدون انتظار');
    } else {
      console.error('⚠️ [Schema Guard] خطأ في الفحص:', error.message);
    }
  }
}
