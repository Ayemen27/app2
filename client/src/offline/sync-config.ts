/**
 * إعدادات المزامنة المشتركة بين silent-sync و sync
 * [T003] يضمن نفس السلوك في كل أماكن المزامنة
 */
export const SYNC_CONFIG = {
  // الحد الأقصى لمحاولات المزامنة قبل النقل لـ DLQ
  maxRetries: 8,
  // التأخير الأساسي لـ exponential backoff (ميلي ثانية)
  baseDelayMs: 500,
  // الحد الأقصى للتأخير بين محاولات (ميلي ثانية)
  maxDelayMs: 60000,
  // معامل العشوائية (jitter) لتفادي الـ thundering herd
  jitterFactor: 0.3,
  // أكواد HTTP التي لا يجب إعادة المحاولة عليها (أخطاء عميل دائمة)
  nonRetryableStatuses: [400, 401, 403, 404, 422] as number[],
} as const;

/**
 * حساب تأخير backoff الأسي مع cap
 */
export function calculateBackoffDelay(retryCount: number): number {
  const exponentialDelay = SYNC_CONFIG.baseDelayMs * Math.pow(2, retryCount);
  const cappedDelay = Math.min(exponentialDelay, SYNC_CONFIG.maxDelayMs);
  return Math.max(0, Math.round(cappedDelay));
}

/**
 * هل يستحق هذا الخطأ إعادة المحاولة؟
 */
export function isRetryableError(statusCode: number): boolean {
  // 409 = تعارض، يحتاج تدخل يدوي
  if (statusCode === 409) return false;
  return !SYNC_CONFIG.nonRetryableStatuses.includes(statusCode);
}
