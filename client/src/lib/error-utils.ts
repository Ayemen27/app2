type ErrorCategory = 'validation' | 'network' | 'auth' | 'notFound' | 'server' | 'timeout' | 'abort' | 'unknown';

const ARABIC_MESSAGES: Record<ErrorCategory, string> = {
  validation: 'يرجى التحقق من البيانات المدخلة',
  network: 'خطأ في الاتصال بالشبكة. يرجى المحاولة مرة أخرى',
  auth: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً',
  notFound: 'العنصر المطلوب غير موجود',
  server: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً',
  timeout: 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى',
  abort: 'تم إلغاء العملية',
  unknown: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى',
};

function categorizeError(error: unknown): ErrorCategory {
  if (!error) return 'unknown';

  if (typeof error === 'object' && error !== null) {
    const err = error as any;

    if (err.name === 'ZodError' || Array.isArray(err.issues) || Array.isArray(err.errors)) {
      return 'validation';
    }

    if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
      return 'abort';
    }

    if (err.name === 'TimeoutError' || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return 'timeout';
    }

    if (err instanceof TypeError && typeof err.message === 'string' && err.message.includes('fetch')) {
      return 'network';
    }

    const status = err.status || err.statusCode || err.response?.status;
    if (status) {
      if (status === 401 || status === 403) return 'auth';
      if (status === 404) return 'notFound';
      if (status === 400 || status === 422) return 'validation';
      if (status >= 500) return 'server';
    }

    const msg = String(err.message || '').toLowerCase();
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('net::')) {
      return 'network';
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'timeout';
    }
    if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('jwt')) {
      return 'auth';
    }
  }

  return 'unknown';
}

export function toUserMessage(error: unknown, fallback?: string): string {
  if (!error) return fallback || ARABIC_MESSAGES.unknown;

  const category = categorizeError(error);

  if (category !== 'unknown' && category !== 'server') {
    return ARABIC_MESSAGES[category];
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    const msg = err.message || err.msg || '';

    if (typeof msg === 'string' && msg.length > 0 && msg.length < 200 && !/[{[\]}"']/.test(msg) && !/stack|trace|at\s/i.test(msg)) {
      return fallback || msg;
    }
  }

  return fallback || ARABIC_MESSAGES[category];
}

export function isZodOrValidationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as any;
  return (
    err.name === 'ZodError' ||
    Array.isArray(err.issues) ||
    Array.isArray(err.errors) ||
    (typeof err.message === 'string' && (
      err.message.includes('too_small') ||
      err.message.includes('invalid_string') ||
      err.message.includes('invalid_type')
    ))
  );
}

export function isNonCriticalError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as any;
  const msg = String(err.message || '').toLowerCase();
  return (
    isZodOrValidationError(error) ||
    err.name === 'AbortError' ||
    err.name === 'NavigationError' ||
    msg.includes('cancelled') ||
    msg.includes('canceled') ||
    msg.includes('abort') ||
    msg.includes('navigation') ||
    msg.includes('chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('dynamically imported module')
  );
}
