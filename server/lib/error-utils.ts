interface SafeErrorResponse {
  success: false;
  message: string;
  code?: string;
}

const SAFE_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'البيانات المدخلة غير صحيحة',
  NOT_FOUND: 'العنصر المطلوب غير موجود',
  UNAUTHORIZED: 'غير مصرح بالوصول',
  FORBIDDEN: 'ليس لديك صلاحية لهذا الإجراء',
  CONFLICT: 'تعارض في البيانات. يرجى تحديث الصفحة',
  SERVER_ERROR: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً',
};

export function sanitizeApiError(error: unknown, statusCode?: number): SafeErrorResponse {
  const code = resolveCode(error, statusCode);
  return {
    success: false,
    message: SAFE_MESSAGES[code] || SAFE_MESSAGES.SERVER_ERROR,
    code,
  };
}

function resolveCode(error: unknown, statusCode?: number): string {
  if (statusCode === 400 || statusCode === 422) return 'VALIDATION_ERROR';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';

  if (error && typeof error === 'object') {
    const err = error as any;
    if (err.name === 'ZodError' || Array.isArray(err.issues)) return 'VALIDATION_ERROR';
    if (err.code === 'P2025') return 'NOT_FOUND';
    if (err.code === 'P2002') return 'CONFLICT';
  }

  return 'SERVER_ERROR';
}

export function sanitizeZodErrors(zodError: any): string {
  if (!zodError || !Array.isArray(zodError.issues)) {
    return SAFE_MESSAGES.VALIDATION_ERROR;
  }
  const fields = zodError.issues
    .map((i: any) => i.path?.join('.'))
    .filter(Boolean)
    .slice(0, 5);
  if (fields.length === 0) return SAFE_MESSAGES.VALIDATION_ERROR;
  return `أخطاء في الحقول: ${fields.join('، ')}`;
}
