import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

// التحقق من وجود DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL غير موجود في متغيرات البيئة");
  throw new Error("DATABASE_URL is required. Please set it in your environment variables");
}

// التحقق من وجود شهادة SSL في متغيرات البيئة
if (!process.env.PGSSLROOTCERT) {
  console.error("❌ PGSSLROOTCERT غير موجود في متغيرات البيئة");
  throw new Error("PGSSLROOTCERT is required. Please set it in your environment variables");
}

// استخراج شهادة SSL من المتغير وحفظها مؤقتًا
const sslCertPath = path.join(process.cwd(), "pg_cert.pem");
fs.writeFileSync(sslCertPath, process.env.PGSSLROOTCERT.replace(/\\n/g, "\n"));

// استخراج معلومات الاتصال
const databaseUrl = process.env.DATABASE_URL;
console.log("🔧 استخدام قاعدة البيانات:", databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

// إعداد SSL بناءً على الشهادة
function getSSLConfig() {
  const url = databaseUrl.toLowerCase();

  // اتصال محلي بدون SSL
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return false;
  }

  // اتصال خارجي باستخدام الشهادة من .env
  return {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined,
    ca: fs.readFileSync(sslCertPath).toString()
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