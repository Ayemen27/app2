import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

// التحقق من وجود DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL غير موجود في متغيرات البيئة");
  throw new Error("DATABASE_URL is required. Please set it in your environment variables");
}

// تجاهل شهادة SSL للتبسيط
console.log("⚠️ تجاهل تحقق SSL للتبسيط");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// استخراج معلومات الاتصال
const databaseUrl = process.env.DATABASE_URL;
console.log("🔧 استخدام قاعدة البيانات:", databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

// إعداد SSL مبسط
function getSSLConfig() {
  const url = databaseUrl.toLowerCase();

  // اتصال محلي بدون SSL
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return false;
  }

  // اتصال خارجي مع تجاهل مشاكل SSL
  return {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  };
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: getSSLConfig()
  },
  verbose: true,
  strict: true,
  schemaFilter: ["app2data"],
  tablesFilter: ["*"],
  breakpoints: true
});