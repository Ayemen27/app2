
import { defineConfig } from "drizzle-kit";

// التحقق من وجود DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL غير موجود في متغيرات البيئة");
  throw new Error("DATABASE_URL is required. Please set it in your environment variables");
}

// استخراج معلومات الاتصال من DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
console.log("🔧 استخدام قاعدة البيانات:", databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

// تحديد إعدادات SSL بناءً على نوع الاتصال
function getSSLConfig() {
  const url = databaseUrl.toLowerCase();
  
  // إذا كان الاتصال محلي، لا نحتاج SSL
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return false;
  }
  
  // للاتصالات الخارجية، نستخدم SSL مع تجاهل الشهادات غير الموثوقة
  return {
    rejectUnauthorized: false
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
  // إعدادات إضافية للأداء والاستقرار
  schemaFilter: ["public"],
  tablesFilter: ["*"],
  // تمكين التتبع المفصل للعمليات
  breakpoints: true
});
