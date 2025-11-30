import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, MoreVertical, Flag } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface CardDesign5Props {
  state?: CardState;
  data?: {
    title: string;
    description?: string;
    timeAgo: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    dueTime?: string;
    assignee?: string;
  };
  onAction?: (action: string) => void;
  onToggle?: () => void;
}

export function CardDesign5({
  state = 'normal',
  data = {
    title: 'مراجعة تقرير المشروع',
    description: 'مراجعة التقرير الأسبوعي للمشروع وإرساله للإدارة',
    timeAgo: 'منذ ساعتين',
    priority: 'high',
    status: 'in-progress',
    dueTime: '4:00 مساءً',
    assignee: 'أحمد',
  },
  onAction,
  onToggle,
}: CardDesign5Props) {
  const priorityColors = {
    high: 'text-red-500',
    medium: 'text-yellow-500',
    low: 'text-green-500',
  };

  const priorityLabels = {
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
  };

  const statusIcons = {
    pending: Circle,
    'in-progress': Clock,
    completed: CheckCircle2,
    blocked: AlertCircle,
  };

  const statusColors = {
    pending: 'text-muted-foreground',
    'in-progress': 'text-blue-500',
    completed: 'text-green-500',
    blocked: 'text-red-500',
  };

  const StatusIcon = statusIcons[data.status];

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-3 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        state === 'selected' && "ring-2 ring-primary bg-primary/5",
        state === 'disabled' && "opacity-50 pointer-events-none",
        state === 'loading' && "animate-pulse",
        data.status === 'completed' && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 flex-shrink-0 transition-colors",
            statusColors[data.status]
          )}
        >
          <StatusIcon className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn(
                "font-medium text-sm",
                data.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {data.title}
              </h4>
              {data.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {data.description}
                </p>
              )}
            </div>
            <button
              onClick={() => onAction?.('menu')}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {data.timeAgo}
            </span>

            <span className={cn(
              "flex items-center gap-1 text-[10px] font-medium",
              priorityColors[data.priority]
            )}>
              <Flag className="w-3 h-3" />
              {priorityLabels[data.priority]}
            </span>

            {data.dueTime && data.status !== 'completed' && (
              <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                الموعد: {data.dueTime}
              </span>
            )}

            {data.assignee && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground mr-auto">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-medium text-primary">
                  {data.assignee[0]}
                </div>
                {data.assignee}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const cardDesign5Code = {
  html: `<div class="bg-white rounded-xl border p-3 hover:shadow-md transition-all">
  <div class="flex items-start gap-3">
    <button class="mt-0.5 text-blue-500">
      <svg class="w-5 h-5"><!-- Clock (in-progress) --></svg>
    </button>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h4 class="font-medium text-sm">مراجعة تقرير المشروع</h4>
          <p class="text-xs text-muted-foreground mt-0.5 line-clamp-1">مراجعة التقرير الأسبوعي</p>
        </div>
        <button class="p-1 hover:bg-muted rounded"><svg class="w-4 h-4"><!-- MoreVertical --></svg></button>
      </div>
      <div class="flex items-center gap-3 mt-2 flex-wrap">
        <span class="flex items-center gap-1 text-[10px] text-muted-foreground">
          <svg class="w-3 h-3"><!-- Clock --></svg>
          منذ ساعتين
        </span>
        <span class="flex items-center gap-1 text-[10px] font-medium text-red-500">
          <svg class="w-3 h-3"><!-- Flag --></svg>
          عالية
        </span>
        <span class="text-[10px] px-1.5 py-0.5 bg-muted rounded">الموعد: 4:00 مساءً</span>
        <span class="flex items-center gap-1 text-[10px] text-muted-foreground mr-auto">
          <div class="w-4 h-4 rounded-full bg-primary/20 text-[8px] font-medium text-primary">أ</div>
          أحمد
        </span>
      </div>
    </div>
  </div>
</div>`,
  tailwind: `// Activity/Task Card - Design #5
<div className={cn(
  "bg-white rounded-xl border p-3 hover:shadow-md transition-all",
  status === 'completed' && "opacity-60"
)}>
  <div className="flex items-start gap-3">
    <button onClick={onToggle} className={statusColors[status]}>
      <StatusIcon className="w-5 h-5" />
    </button>
    <div className="flex-1 min-w-0">
      <h4 className={cn("font-medium text-sm", status === 'completed' && "line-through text-muted-foreground")}>
        {title}
      </h4>
      {description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />{timeAgo}
        </span>
        <span className={cn("flex items-center gap-1 text-[10px] font-medium", priorityColors[priority])}>
          <Flag className="w-3 h-3" />{priorityLabels[priority]}
        </span>
        {dueTime && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">الموعد: {dueTime}</span>}
        {assignee && (
          <span className="flex items-center gap-1 text-[10px] mr-auto">
            <div className="w-4 h-4 rounded-full bg-primary/20">{assignee[0]}</div>
            {assignee}
          </span>
        )}
      </div>
    </div>
  </div>
</div>`,
  react: `import { CheckCircle2, Circle, Clock, AlertCircle, Flag, MoreVertical } from 'lucide-react';

function ActivityCard({ data, onToggle }) {
  const StatusIcon = statusIcons[data.status];
  
  return (
    <div className={cn("bg-white rounded-xl border p-3", data.status === 'completed' && "opacity-60")}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className={statusColors[data.status]}>
          <StatusIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h4 className={cn("font-medium", data.status === 'completed' && "line-through")}>{data.title}</h4>
          <div className="flex gap-3 mt-2">
            <span>{data.timeAgo}</span>
            <span className={priorityColors[data.priority]}>{priorityLabels[data.priority]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}`,
};
