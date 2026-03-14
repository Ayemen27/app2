import type { Request, Response, NextFunction } from "express";
import { logger } from "./logging.js";

interface TrackedRequest extends Request {
  id?: string;
}

export class AppError extends Error {
  status: number; 
  code: string; 
  details?: unknown;
  
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message); 
    this.status = status; 
    this.code = code; 
    this.details = details;
  }
}

export class AuthError extends AppError {
  constructor(message = "غير مصرح") { 
    super(401, "AUTH_ERROR", message); 
  }
}

export class ValidationError extends AppError {
  constructor(message = "بيانات غير صالحة", details?: unknown) { 
    super(400, "VALIDATION_ERROR", message, details); 
  }
}

export class NotFoundError extends AppError {
  constructor(message = "غير موجود") { 
    super(404, "NOT_FOUND", message); 
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "خطأ في خدمة خارجية") { 
    super(502, "EXTERNAL_SERVICE_ERROR", message); 
  }
}

// معالج الأخطاء العام
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const errObj = err as Record<string, unknown> | null;
  const status = (errObj?.status as number) ?? 500;
  const code   = (errObj?.code as string)   ?? "INTERNAL_ERROR";
  const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
  const body = {
    ok: false,
    code,
    message,
    requestId: (req as TrackedRequest).id,
    details: process.env.NODE_ENV === "production" ? undefined : (errObj?.details as string) ?? String(err),
  };
  
  if (status >= 500) {
    logger.error({ err, requestId: (req as TrackedRequest).id }, "Unhandled error");
  } else {
    logger.warn({ err, requestId: (req as TrackedRequest).id }, "Handled error");
  }
  
  res.status(status).json(body);
}