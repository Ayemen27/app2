/**
 * نظام تشفير البيانات الحساسة في التخزين المحلي
 */

/**
 * حقول حساسة يجب تشفيرها
 */
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'ssn', 'bankAccount'];

/**
 * دالة مساعدة لتحويل النص إلى Base64 يدعم UTF-8
 */
function utf8_to_b64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      }));
  } catch (e) {
    return btoa(str);
  }
}

/**
 * دالة مساعدة لفك Base64 يدعم UTF-8
 */
function b64_to_utf8(str: string): string {
  try {
    return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    return atob(str);
  }
}

/**
 * تشفير بسيط باستخدام base64 يدعم العربية
 */
export function encryptValue(value: string): string {
  try {
    if (!value) return value;
    return utf8_to_b64(value);
  } catch (error) {
    console.warn('⚠️ [Encryption] فشل التشفير:', error);
    return value;
  }
}

/**
 * فك تشفير القيمة
 */
export function decryptValue(encryptedValue: string): string {
  try {
    if (!encryptedValue) return encryptedValue;
    return b64_to_utf8(encryptedValue);
  } catch (error) {
    console.warn('⚠️ [Encryption] فشل فك التشفير:', error);
    return encryptedValue;
  }
}

/**
 * شفر السجل - شفر الحقول الحساسة
 */
export function encryptRecord(record: any): any {
  if (!record) return record;

  const encrypted: any = { ...record };

  for (const field of SENSITIVE_FIELDS) {
    if (field in encrypted && typeof encrypted[field] === 'string') {
      encrypted[field] = encryptValue(encrypted[field]);
    }
  }

  return encrypted;
}

/**
 * فك تشفير السجل
 */
export function decryptRecord(record: any): any {
  if (!record) return record;

  const decrypted: any = { ...record };

  for (const field of SENSITIVE_FIELDS) {
    if (field in decrypted && typeof decrypted[field] === 'string') {
      decrypted[field] = decryptValue(decrypted[field]);
    }
  }

  return decrypted;
}

/**
 * تحقق من وجود حقول حساسة في السجل
 */
export function hasSensitiveFields(record: any): boolean {
  if (!record) return false;
  return SENSITIVE_FIELDS.some(field => field in record);
}

/**
 * احصل على الحقول الحساسة الموجودة
 */
export function getSensitiveFields(record: any): string[] {
  if (!record) return [];
  return SENSITIVE_FIELDS.filter(field => field in record);
}

/**
 * شفر كائن معقد بشكل عميق
 */
export function deepEncrypt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return SENSITIVE_FIELDS.some(f => obj.includes(f)) ? encryptValue(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepEncrypt(item));
  }

  if (typeof obj === 'object') {
    const encrypted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      encrypted[key] = SENSITIVE_FIELDS.includes(key) && typeof value === 'string'
        ? encryptValue(value)
        : deepEncrypt(value);
    }
    return encrypted;
  }

  return obj;
}

/**
 * فك تشفير كائن معقد بشكل عميق
 */
export function deepDecrypt(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => deepDecrypt(item));
  }

  if (typeof obj === 'object') {
    const decrypted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      decrypted[key] = SENSITIVE_FIELDS.includes(key) && typeof value === 'string'
        ? decryptValue(value)
        : deepDecrypt(value);
    }
    return decrypted;
  }

  return obj;
}
