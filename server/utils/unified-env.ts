/**
 * نظام موحد وذكي لبيئة التشغيل (Unified & Intelligent Environment System)
 * يدمج جميع الوظائف السابقة في نقطة تحكم واحدة
 */
import dotenv from "dotenv";
import path from "path";

// تحميل متغيرات البيئة تلقائياً عند استدعاء الموديول
dotenv.config();

export const isReplit = !!process.env.REPLIT_ID || 
                        !!process.env.REPLIT_ENVIRONMENT || 
                        !!process.env.REPLIT_DEV_DOMAIN;

export const isProduction = process.env.NODE_ENV === 'production' && !isReplit;

// تحديد المنفذ الذكي مع مراعاة الأولويات
export const PORT = Number(process.env.PORT) || (isReplit ? 5000 : (isProduction ? 6000 : 5000));

// تحديد الدومينات بشكل ديناميكي
export const REPLIT_DOMAIN = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : process.env.DOMAIN;
export const PRODUCTION_DOMAIN = process.env.PRODUCTION_DOMAIN || 'https://app2.binarjoinanelytic.info';

export const CURRENT_DOMAIN = isProduction ? PRODUCTION_DOMAIN : REPLIT_DOMAIN;

export const envConfig = {
  isReplit,
  isProduction,
  PORT,
  REPLIT_DOMAIN,
  PRODUCTION_DOMAIN,
  CURRENT_DOMAIN,
  NODE_ENV: process.env.NODE_ENV || (isProduction ? 'production' : 'development'),
  DATABASE_URL: process.env.DATABASE_URL
};

console.log(`🚀 [UnifiedEnv] تم تحميل البيئة بنجاح: ${envConfig.NODE_ENV} على المنفذ ${PORT}`);

export default envConfig;
