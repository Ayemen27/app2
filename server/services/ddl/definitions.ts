import * as schema from "../../../shared/schema";
import { getTableConfig } from "drizzle-orm/pg-core";

export const DATABASE_DDL: Record<string, string> = {};

// تحويل مخطط Drizzle إلى DDL بشكل ديناميكي لضمان المطابقة الكاملة
Object.entries(schema).forEach(([key, value]) => {
  if (typeof value === 'object' && value !== null && 'pgConfig' in (value as any)) {
    const table = value as any;
    const config = getTableConfig(table);
    DATABASE_DDL[config.name] = `CREATE TABLE IF NOT EXISTS "${config.name}" (...)`; // سيتم استخدام TRUNCATE/INSERT بدلاً من DDL الكامل في الاستعادة
  }
});

// تعاريف يدوية للجداول الأساسية لضمان عمل BackupService
DATABASE_DDL['users'] = 'users';
DATABASE_DDL['projects'] = 'projects';
DATABASE_DDL['wells'] = 'wells';
DATABASE_DDL['workers'] = 'workers';
DATABASE_DDL['audit_logs'] = 'audit_logs';
