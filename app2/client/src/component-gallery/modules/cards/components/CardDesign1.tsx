import React from 'react';
import { User, Phone, MoreVertical, MapPin, Clock } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface CardDesign1Props {
  state?: CardState;
  data?: {
    name: string;
    role: string;
    hourlyRate: number;
    status: 'active' | 'paused' | 'offline';
    location?: string;
    avatar?: string;
    progress?: number;
  };
  onAction?: (action: string) => void;
}

export function CardDesign1({
  state = 'normal',
  data = {
    name: 'أحمد محمد',
    role: 'نجار',
    hourlyRate: 45,
    status: 'active',
    location: 'الموقع A',
    progress: 0.75,
  },
  onAction,
}: CardDesign1Props) {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    offline: 'bg-gray-100 text-gray-700',
  };

  const statusLabels = {
    active: 'نشط',
    paused: 'متوقف',
    offline: 'غير متصل',
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-3 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        state === 'selected' && "ring-2 ring-primary bg-primary/5",
        state === 'disabled' && "opacity-50 pointer-events-none",
        state === 'loading' && "animate-pulse"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {data.avatar ? (
            <img
              src={data.avatar}
              alt={data.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className={cn(
            "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white",
            data.status === 'active' ? 'bg-green-500' : data.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-400'
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm truncate">{data.name}</h4>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap",
              statusColors[data.status]
            )}>
              {statusLabels[data.status]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{data.role}</span>
            <span>•</span>
            <span className="font-medium text-primary">{data.hourlyRate}$/ساعة</span>
          </div>
          {data.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" />
              <span>{data.location}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => onAction?.('menu')}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {data.progress !== undefined && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">التقدم اليومي</span>
            <span className="font-medium">{Math.round(data.progress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${data.progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const cardDesign1Code = {
  html: `<div class="bg-white rounded-xl border p-3 hover:shadow-md transition-all">
  <div class="flex items-center gap-3">
    <div class="relative">
      <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
        <svg class="w-6 h-6 text-primary"><!-- User --></svg>
      </div>
      <div class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-500"></div>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between gap-2">
        <h4 class="font-semibold text-sm truncate">أحمد محمد</h4>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">نشط</span>
      </div>
      <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
        <span>نجار</span>
        <span>•</span>
        <span class="font-medium text-primary">45$/ساعة</span>
      </div>
    </div>
    <button class="p-1.5 hover:bg-muted rounded-lg">
      <svg class="w-4 h-4"><!-- MoreVertical --></svg>
    </button>
  </div>
  <div class="mt-3 pt-3 border-t">
    <div class="flex items-center justify-between text-xs mb-1.5">
      <span class="text-muted-foreground">التقدم اليومي</span>
      <span class="font-medium">75%</span>
    </div>
    <div class="h-1.5 bg-muted rounded-full overflow-hidden">
      <div class="h-full bg-primary rounded-full" style="width: 75%"></div>
    </div>
  </div>
</div>`,
  tailwind: `// Worker Card - Design #1
<div className={cn(
  "bg-white rounded-xl border p-3 transition-all duration-200",
  "hover:shadow-md hover:-translate-y-0.5",
  isSelected && "ring-2 ring-primary bg-primary/5"
)}>
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
        <User className="w-6 h-6 text-primary" />
      </div>
      <div className={cn(
        "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white",
        status === 'active' ? 'bg-green-500' : 'bg-gray-400'
      )} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm truncate">{name}</h4>
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700">{statusLabel}</span>
      </div>
      <div className="text-xs text-muted-foreground">{role} • {hourlyRate}$/ساعة</div>
    </div>
    <button className="p-1.5 hover:bg-muted rounded-lg">
      <MoreVertical className="w-4 h-4" />
    </button>
  </div>
  {progress !== undefined && (
    <div className="mt-3 pt-3 border-t">
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: \`\${progress * 100}%\` }} />
      </div>
    </div>
  )}
</div>`,
  react: `import { User, MoreVertical, MapPin } from 'lucide-react';

function WorkerCard({ data, onAction }) {
  return (
    <div className="bg-white rounded-xl border p-3 hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className={cn("absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white", statusColor)} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{data.name}</h4>
          <p className="text-xs text-muted-foreground">{data.role} • {data.hourlyRate}$/ساعة</p>
        </div>
        <button onClick={() => onAction('menu')}><MoreVertical className="w-4 h-4" /></button>
      </div>
    </div>
  );
}`,
};
