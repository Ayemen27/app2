import React from 'react';
import { Info, ChevronLeft, X, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface CardDesign6Props {
  state?: CardState;
  data?: {
    title: string;
    description: string;
    type: 'info' | 'tip' | 'warning' | 'success';
    actionLabel?: string;
    dismissible?: boolean;
  };
  onAction?: () => void;
  onDismiss?: () => void;
}

export function CardDesign6({
  state = 'normal',
  data = {
    title: 'معلومة مهمة',
    description: 'هذا نص توضيحي يمكن استخدامه لعرض معلومات أو نصائح أو تحذيرات للمستخدم.',
    type: 'info',
    actionLabel: 'معرفة المزيد',
    dismissible: true,
  },
  onAction,
  onDismiss,
}: CardDesign6Props) {
  const typeConfig = {
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      textColor: 'text-blue-700',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
    },
    tip: {
      icon: Lightbulb,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      textColor: 'text-amber-700',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      textColor: 'text-red-700',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
    success: {
      icon: CheckCircle2,
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      textColor: 'text-green-700',
      buttonBg: 'bg-green-600 hover:bg-green-700',
    },
  };

  const config = typeConfig[data.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        config.bg,
        config.border,
        state === 'selected' && "ring-2 ring-primary",
        state === 'disabled' && "opacity-50 pointer-events-none",
        state === 'loading' && "animate-pulse"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          config.iconColor,
          data.type === 'info' ? 'bg-blue-100' : 
          data.type === 'tip' ? 'bg-amber-100' : 
          data.type === 'warning' ? 'bg-red-100' : 'bg-green-100'
        )}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn("font-semibold text-sm", config.titleColor)}>
              {data.title}
            </h4>
            {data.dismissible && (
              <button
                onClick={onDismiss}
                className={cn(
                  "p-1 rounded-lg transition-colors hover:bg-black/5",
                  config.iconColor
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className={cn("text-sm mt-1", config.textColor)}>
            {data.description}
          </p>

          {data.actionLabel && (
            <button
              onClick={onAction}
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors",
                config.buttonBg
              )}
            >
              {data.actionLabel}
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const cardDesign6Code = {
  html: `<div class="rounded-xl border p-4 bg-blue-50 border-blue-200">
  <div class="flex items-start gap-3">
    <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
      <svg class="w-5 h-5"><!-- Info --></svg>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <h4 class="font-semibold text-sm text-blue-900">معلومة مهمة</h4>
        <button class="p-1 rounded-lg hover:bg-black/5 text-blue-600">
          <svg class="w-4 h-4"><!-- X --></svg>
        </button>
      </div>
      <p class="text-sm mt-1 text-blue-700">هذا نص توضيحي يمكن استخدامه لعرض معلومات أو نصائح.</p>
      <button class="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
        معرفة المزيد
        <svg class="w-4 h-4"><!-- ChevronLeft --></svg>
      </button>
    </div>
  </div>
</div>`,
  tailwind: `// Generic Info Card - Design #6
<div className={cn(
  "rounded-xl border p-4",
  config.bg,
  config.border
)}>
  <div className="flex items-start gap-3">
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.iconColor, iconBg)}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <h4 className={cn("font-semibold text-sm", config.titleColor)}>{title}</h4>
        {dismissible && (
          <button onClick={onDismiss} className={cn("p-1 rounded-lg hover:bg-black/5", config.iconColor)}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className={cn("text-sm mt-1", config.textColor)}>{description}</p>
      {actionLabel && (
        <button onClick={onAction} className={cn("mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white", config.buttonBg)}>
          {actionLabel}
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
</div>`,
  react: `import { Info, Lightbulb, AlertTriangle, CheckCircle2, X, ChevronLeft } from 'lucide-react';

const typeConfig = {
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600' },
  tip: { icon: Lightbulb, bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600' },
  warning: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-600' },
  success: { icon: CheckCircle2, bg: 'bg-green-50', border: 'border-green-200', iconColor: 'text-green-600' },
};

function GenericInfoCard({ data, onAction, onDismiss }) {
  const config = typeConfig[data.type];
  const Icon = config.icon;
  
  return (
    <div className={cn("rounded-xl border p-4", config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5", config.iconColor)} />
        <div className="flex-1">
          <h4>{data.title}</h4>
          <p className="text-sm mt-1">{data.description}</p>
          {data.actionLabel && <button onClick={onAction}>{data.actionLabel}</button>}
        </div>
        {data.dismissible && <button onClick={onDismiss}><X /></button>}
      </div>
    </div>
  );
}`,
};
