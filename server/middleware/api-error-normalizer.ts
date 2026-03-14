import { Request, Response, NextFunction } from 'express';

const isProduction = () => process.env.NODE_ENV === 'production';

const GENERIC_ERROR_AR = 'حدث خطأ داخلي في الخادم';

const SENSITIVE_PATTERNS = [
  /password/i, /secret/i, /token/i, /key/i,
  /ECONNREFUSED/i, /ETIMEDOUT/i, /ENOTFOUND/i,
  /relation ".*" does not exist/i,
  /column ".*" does not exist/i,
  /duplicate key/i,
  /syntax error/i,
  /stack trace/i,
  /at\s+\w+\s+\(/,
  /node_modules/i,
  /\.ts:\d+/,
  /\.js:\d+/,
];

function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
}

function sanitizeErrorMessage(message: unknown, statusCode: number): string {
  if (!message || typeof message !== 'string') return GENERIC_ERROR_AR;

  if (!isProduction()) return message;

  if (statusCode >= 500) return GENERIC_ERROR_AR;

  if (containsSensitiveInfo(message)) return GENERIC_ERROR_AR;

  return message;
}

function sanitizeResponseBody(body: any, statusCode: number): any {
  if (!body || typeof body !== 'object') return body;
  if (statusCode < 400) return body;

  const sanitized = { ...body };

  if ('error' in sanitized && typeof sanitized.error === 'string') {
    sanitized.error = sanitizeErrorMessage(sanitized.error, statusCode);
  }

  if ('message' in sanitized && typeof sanitized.message === 'string' && statusCode >= 500) {
    sanitized.message = sanitizeErrorMessage(sanitized.message, statusCode);
  }

  if ('errors' in sanitized && Array.isArray(sanitized.errors)) {
    sanitized.errors = sanitized.errors.map((e: any) => {
      if (typeof e === 'string') return sanitizeErrorMessage(e, statusCode);
      if (e && typeof e === 'object' && typeof e.message === 'string') {
        return { ...e, message: sanitizeErrorMessage(e.message, statusCode) };
      }
      return e;
    });
  }

  if ('stack' in sanitized && isProduction()) {
    delete sanitized.stack;
  }

  if ('details' in sanitized && isProduction() && statusCode >= 500) {
    delete sanitized.details;
  }

  return sanitized;
}

export function apiErrorNormalizer(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    const sanitized = sanitizeResponseBody(body, res.statusCode);
    return originalJson(sanitized);
  };

  next();
}
