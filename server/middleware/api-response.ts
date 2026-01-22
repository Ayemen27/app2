import { Response, Request, NextFunction } from 'express';

/**
 * Standard API Response Structure (2026 Best Practices)
 */
export interface ApiResponse<T = any> {
  success: boolean;
  status: 'success' | 'error';
  message: string;
  data: T | null;
  metadata?: {
    timestamp: string;
    processingTime?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    [key: string]: any;
  };
  errors?: ApiErrorDetail[] | null;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string | number;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Global Error Handler Middleware
 */
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'حدث خطأ داخلي في الخادم';
  
  const response: ApiResponse = {
    success: false,
    status: 'error',
    message: message,
    data: null,
    metadata: {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    },
    errors: err.errors || [{ message: message, code: err.code || 'INTERNAL_SERVER_ERROR' }]
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    (response.metadata as any).stack = err.stack;
  }

  console.error(`❌ [API-ERROR] ${req.method} ${req.path}:`, err);
  res.status(statusCode).json(response);
};

/**
 * Response Formatter Utility
 */
export const sendSuccess = (res: Response, data: any, message: string = 'تمت العملية بنجاح', metadata: any = {}, statusCode: number = 200) => {
  const response: ApiResponse = {
    success: true,
    status: 'success',
    message,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
  return res.status(statusCode).json(response);
};

export const sendError = (res: Response, message: string, statusCode: number = 400, errors: ApiErrorDetail[] | null = null) => {
  const response: ApiResponse = {
    success: false,
    status: 'error',
    message,
    data: null,
    metadata: {
      timestamp: new Date().toISOString()
    },
    errors
  };
  return res.status(statusCode).json(response);
};
