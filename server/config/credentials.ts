/**
 * 🔐 مدير بيانات الاعتماد الآمن
 * جميع البيانات الحساسة يجب تحميلها من متغيرات البيئة (Secrets)
 */

/**
 * المفاتيح المطلوبة - يتم تحميلها من متغيرات البيئة فقط
 * 
 * 🔗 قواعد البيانات (بترتيب الأولوية):
 * 1. DATABASE_URL_CENTRAL - القاعدة المركزية الرئيسية
 * 2. DATABASE_URL_RAILWAY - قاعدة Railway
 * 3. DATABASE_URL - القاعدة الافتراضية (Replit)
 */
type CredentialKey = 
  | 'JWT_ACCESS_SECRET'
  | 'JWT_REFRESH_SECRET'
  | 'ENCRYPTION_KEY'
  | 'DATABASE_URL'
  | 'DATABASE_URL_CENTRAL'
  | 'DATABASE_URL_RAILWAY'
  | 'NODE_ENV';

// القيم الافتراضية للإعدادات غير الحساسة فقط
const DEFAULT_VALUES: Partial<Record<CredentialKey, string>> = {
  NODE_ENV: 'development',
};

/**
 * الحصول على قيمة من متغيرات البيئة
 * @param key - اسم المفتاح
 * @returns قيمة المفتاح أو سلسلة فارغة
 */
export function getCredential(key: CredentialKey): string {
  // تحميل من متغيرات البيئة
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }
  
  // استخدام القيمة الافتراضية إذا كانت متاحة
  const defaultValue = DEFAULT_VALUES[key];
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  const criticalKeys: CredentialKey[] = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  if (isProduction && criticalKeys.includes(key)) {
    throw new Error(`🚨 [Credentials FATAL] Missing required credential "${key}" in production environment`);
  }

  return '';
}

/**
 * التحقق من وجود جميع المتغيرات المطلوبة
 */
export function validateRequiredCredentials(): { 
  isValid: boolean; 
  missing: string[] 
} {
  const required: CredentialKey[] = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL'
  ];
  
  const missing = required.filter(key => !getCredential(key));
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

