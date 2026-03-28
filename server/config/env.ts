import dotenv from 'dotenv';
import path from 'path';
import type { AppEnv, ServerRuntime, DatabaseSource, ServerEnvConfig } from '../../shared/env-types';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function resolveNodeEnv(): AppEnv {
  const raw = process.env.NODE_ENV?.toLowerCase().trim();
  if (raw === 'production') return 'production';
  if (raw === 'development') return 'development';

  const isReplit = !!(process.env.REPL_ID || process.env.REPLIT_ID || process.env.REPLIT_ENVIRONMENT);
  if (isReplit) return 'development';

  return 'production';
}

function resolveRuntime(): ServerRuntime {
  if (process.env.REPL_ID || process.env.REPLIT_ID || process.env.REPLIT_ENVIRONMENT) return 'replit';
  if (process.env.PM2_HOME || process.env.PM2_USAGE || process.env.NODE_APP_INSTANCE) return 'vps';
  return 'local';
}

function resolveDatabase(): { url: string; source: DatabaseSource } {
  if (process.env.DATABASE_URL_CENTRAL) return { url: process.env.DATABASE_URL_CENTRAL, source: 'CENTRAL' };
  if (process.env.DATABASE_URL_RAILWAY) return { url: process.env.DATABASE_URL_RAILWAY, source: 'RAILWAY' };
  return { url: '', source: 'NONE' };
}

function resolvePort(nodeEnv: AppEnv, runtime: ServerRuntime): number {
  if (process.env.PORT) return Number(process.env.PORT);
  if (runtime === 'replit') return 5000;
  if (nodeEnv === 'production') return 6000;
  return 5000;
}

function resolveDomain(nodeEnv: AppEnv, runtime: ServerRuntime): string {
  const prod = process.env.PRODUCTION_DOMAIN || '';
  if (nodeEnv === 'production') return prod;
  if (runtime === 'replit' && process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.DOMAIN) return process.env.DOMAIN;
  return `http://localhost:${resolvePort(nodeEnv, runtime)}`;
}

const NODE_ENV = resolveNodeEnv();
const runtime = resolveRuntime();
const db = resolveDatabase();
const PORT = resolvePort(NODE_ENV, runtime);
const isProduction = NODE_ENV === 'production';
const PRODUCTION_DOMAIN = process.env.PRODUCTION_DOMAIN || '';

if (isProduction && db.source === 'NONE') {
  console.error('🚨 [ENV FATAL] DATABASE_URL مفقود في بيئة الإنتاج');
  console.error('🚨 يجب تعيين DATABASE_URL_CENTRAL أو DATABASE_URL_RAILWAY');
  process.exit(1);
}

if (isProduction && !process.env.JWT_ACCESS_SECRET) {
  console.error('🚨 [ENV FATAL] JWT_ACCESS_SECRET مفقود في بيئة الإنتاج');
  process.exit(1);
}

export const ENV: ServerEnvConfig = Object.freeze({
  NODE_ENV,
  runtime,
  isProduction,
  PORT,
  DOMAIN: resolveDomain(NODE_ENV, runtime),
  PRODUCTION_DOMAIN,
  DATABASE_URL: db.url,
  DATABASE_SOURCE: db.source,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET || '',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
});

process.env.NODE_ENV = NODE_ENV;

const dbLabel = db.url ? db.url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').substring(0, 60) : 'NONE';
console.log(`✅ [ENV] ${NODE_ENV} | ${runtime} | port:${PORT} | db:${db.source} (${dbLabel})`);
