import React from "react";
import { AlertTriangle, XCircle, Info, Lightbulb, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
// ValidationError type no longer needed - removing unused import

export type ErrorType = 'error' | 'warning' | 'info' | 'success';

export type EnhancedError = {
  id?: string;
  title: string;
  message: string;
  type: ErrorType;
  suggestion?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  details?: string[];
  code?: string;
  timestamp?: number;
};

export type ErrorDisplayProps = {
  errors: EnhancedError[];
  className?: string;
  maxVisible?: number;
  showTimestamp?: boolean;
  onDismiss?: (errorId: string) => void;
  onActionClick?: (errorId: string, action: EnhancedError['action']) => void;
};

export function EnhancedErrorDisplay({
  errors,
  className,
  maxVisible = 5,
  showTimestamp = false,
  onDismiss,
  onActionClick
}: ErrorDisplayProps) {
  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <ChevronRight className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getErrorStyles = (type: ErrorType) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = Math.max(0, errors.length - maxVisible);

  if (errors.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {visibleErrors.map((error, index) => (
        <div
          key={error.id || index}
          className={cn(
            "border rounded-lg p-4 transition-all duration-300",
            getErrorStyles(error.type),
            "shadow-sm hover:shadow-md"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getErrorIcon(error.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              {/* العنوان والرسالة */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold mb-1">
                    {error.title}
                  </h4>
                  <p className="text-sm leading-relaxed">
                    {error.message}
                  </p>
                </div>
                
                {/* زر الإغلاق */}
                {onDismiss && error.id && (
                  <button
                    onClick={() => onDismiss(error.id!)}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
                    aria-label="إغلاق"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* الاقتراح */}
              {error.suggestion && (
                <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-md border border-current border-opacity-20">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">اقتراح للحل:</p>
                      <p className="text-sm">{error.suggestion}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* التفاصيل الإضافية */}
              {error.details && error.details.length > 0 && (
                <div className="mt-3">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium flex items-center gap-1">
                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                      عرض التفاصيل
                    </summary>
                    <div className="mt-2 pr-5">
                      <ul className="text-sm space-y-1">
                        {error.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-xs mt-1">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </div>
              )}

              {/* زر الإجراء */}
              {error.action && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      error.action!.onClick();
                      if (onActionClick && error.id) {
                        onActionClick(error.id, error.action);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white bg-opacity-80 hover:bg-opacity-100 border border-current border-opacity-30 rounded-md transition-colors"
                  >
                    {error.action.label}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* الوقت ورمز الخطأ */}
              <div className="mt-3 flex items-center justify-between text-xs opacity-75">
                <div className="flex items-center gap-2">
                  {error.code && (
                    <span className="font-mono bg-white bg-opacity-30 px-1 py-0.5 rounded">
                      {error.code}
                    </span>
                  )}
                </div>
                {showTimestamp && error.timestamp && (
                  <span>{formatTimestamp(error.timestamp)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* عرض عدد الأخطاء المخفية */}
      {hiddenCount > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            يوجد {hiddenCount} خطأ إضافي. قم بإصلاح الأخطاء الحالية لعرض المزيد.
          </p>
        </div>
      )}
    </div>
  );
}

// مكون للتحقق الفوري من الحقول
type SimpleValidationError = {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  suggestion?: string;
};

export type FieldValidationDisplayProps = {
  errors: SimpleValidationError[];
  className?: string;
  compact?: boolean;
};

export function FieldValidationDisplay({ 
  errors, 
  className,
  compact = false 
}: FieldValidationDisplayProps) {
  if (errors.length === 0) return null;

  const errorsByType = {
    error: errors.filter(e => e.type === 'error'),
    warning: errors.filter(e => e.type === 'warning'),
    info: errors.filter(e => e.type === 'info')
  };

  if (compact) {
    const mainError = errorsByType.error[0] || errorsByType.warning[0] || errorsByType.info[0];
    if (!mainError) return null;

    return (
      <div className={cn("mt-1", className)}>
        <div className="flex items-center gap-2">
          {getErrorIcon(mainError.type)}
          <span className={cn(
            "text-xs",
            mainError.type === 'error' && "text-red-600",
            mainError.type === 'warning' && "text-yellow-600",
            mainError.type === 'info' && "text-blue-600"
          )}>
            {mainError.message}
          </span>
        </div>
        {mainError.suggestion && (
          <p className="text-xs text-gray-600 mt-1 pr-7">
            💡 {mainError.suggestion}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("mt-2 space-y-1", className)}>
      {Object.entries(errorsByType).map(([type, typeErrors]) => 
        typeErrors.map((error, index) => (
          <div 
            key={`${type}-${index}`}
            className={cn(
              "flex items-start gap-2 text-xs p-2 rounded border",
              error.type === 'error' && "bg-red-50 border-red-200 text-red-700",
              error.type === 'warning' && "bg-yellow-50 border-yellow-200 text-yellow-700",
              error.type === 'info' && "bg-blue-50 border-blue-200 text-blue-700"
            )}
          >
            {getErrorIcon(error.type as ErrorType)}
            <div className="flex-1">
              <p>{error.message}</p>
              {error.suggestion && (
                <p className="mt-1 opacity-75">💡 {error.suggestion}</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// دالة مساعدة لتحويل SimpleValidationError إلى EnhancedError
export function transformValidationErrors(validationErrors: SimpleValidationError[]): EnhancedError[] {
  return validationErrors.map((error, index) => ({
    id: `validation-${index}`,
    title: `خطأ في ${getFieldDisplayName(error.field)}`,
    message: error.message,
    type: error.type as ErrorType,
    suggestion: error.suggestion,
    code: `VALIDATION_${error.field.toUpperCase()}`,
    timestamp: Date.now()
  }));
}

function getFieldDisplayName(fieldName: string): string {
  const fieldNames: Record<string, string> = {
    'project_ids': 'المشاريع المحددة',
    'dateFrom': 'تاريخ البداية',
    'dateTo': 'تاريخ النهاية',
    'dateRange': 'فترة التواريخ',
    'worker_ids': 'العمال المحددين'
  };
  
  return fieldNames[fieldName] || fieldName;
}

function getErrorIcon(type: ErrorType) {
  switch (type) {
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'success':
      return <ChevronRight className="h-4 w-4 text-green-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
}