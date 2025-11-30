import React from 'react';
import { Folder, Calendar, Users, MoreVertical, Clock } from 'lucide-react';
import { CardState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface CardDesign3Props {
  state?: CardState;
  data?: {
    title: string;
    progress: number;
    dueDate: string;
    team: { name: string; avatar?: string }[];
    status: 'on-track' | 'at-risk' | 'delayed' | 'completed';
    tasksCompleted: number;
    tasksTotal: number;
  };
  onAction?: (action: string) => void;
}

export function CardDesign3({
  state = 'normal',
  data = {
    title: 'مشروع البناء السكني',
    progress: 0.65,
    dueDate: '2024-03-15',
    team: [
      { name: 'أحمد' },
      { name: 'محمد' },
      { name: 'فاطمة' },
    ],
    status: 'on-track',
    tasksCompleted: 13,
    tasksTotal: 20,
  },
  onAction,
}: CardDesign3Props) {
  const statusColors = {
    'on-track': 'text-green-600 bg-green-100',
    'at-risk': 'text-yellow-600 bg-yellow-100',
    'delayed': 'text-red-600 bg-red-100',
    'completed': 'text-blue-600 bg-blue-100',
  };

  const statusLabels = {
    'on-track': 'في المسار',
    'at-risk': 'في خطر',
    'delayed': 'متأخر',
    'completed': 'مكتمل',
  };

  const progressColor = data.status === 'delayed' ? 'bg-red-500' : data.status === 'at-risk' ? 'bg-yellow-500' : 'bg-primary';

  const getDaysRemaining = () => {
    const today = new Date();
    const due = new Date(data.dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        state === 'selected' && "ring-2 ring-primary bg-primary/5",
        state === 'disabled' && "opacity-50 pointer-events-none",
        state === 'loading' && "animate-pulse"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Folder className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{data.title}</h4>
            <span className={cn(
              "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mt-1",
              statusColors[data.status]
            )}>
              {statusLabels[data.status]}
            </span>
          </div>
        </div>
        <button
          onClick={() => onAction?.('menu')}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">التقدم</span>
          <span className="font-medium">{Math.round(data.progress * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressColor)}
            style={{ width: `${data.progress * 100}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {data.tasksCompleted} من {data.tasksTotal} مهمة مكتملة
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center -space-x-2 space-x-reverse">
          {data.team.slice(0, 3).map((member, idx) => (
            <div
              key={idx}
              className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-[10px] font-medium text-primary border-2 border-white"
              title={member.name}
            >
              {member.name[0]}
            </div>
          ))}
          {data.team.length > 3 && (
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground border-2 border-white">
              +{data.team.length - 3}
            </div>
          )}
        </div>

        <div className={cn(
          "flex items-center gap-1 text-xs",
          daysRemaining < 0 ? "text-red-600" : daysRemaining < 7 ? "text-yellow-600" : "text-muted-foreground"
        )}>
          <Clock className="w-3.5 h-3.5" />
          <span>
            {daysRemaining < 0 
              ? `متأخر ${Math.abs(daysRemaining)} يوم` 
              : daysRemaining === 0 
              ? 'اليوم' 
              : `${daysRemaining} يوم متبقي`}
          </span>
        </div>
      </div>
    </div>
  );
}

export const cardDesign3Code = {
  html: `<div class="bg-white rounded-xl border p-4 hover:shadow-md transition-all">
  <div class="flex items-start justify-between gap-3 mb-3">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <svg class="w-5 h-5 text-primary"><!-- Folder --></svg>
      </div>
      <div>
        <h4 class="font-semibold text-sm">مشروع البناء السكني</h4>
        <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-600 mt-1">في المسار</span>
      </div>
    </div>
    <button class="p-1.5 hover:bg-muted rounded-lg"><svg class="w-4 h-4"><!-- MoreVertical --></svg></button>
  </div>
  <div class="mb-3">
    <div class="flex items-center justify-between text-xs mb-1.5">
      <span class="text-muted-foreground">التقدم</span>
      <span class="font-medium">65%</span>
    </div>
    <div class="h-2 bg-muted rounded-full overflow-hidden">
      <div class="h-full bg-primary rounded-full" style="width: 65%"></div>
    </div>
    <div class="text-[10px] text-muted-foreground mt-1">13 من 20 مهمة مكتملة</div>
  </div>
  <div class="flex items-center justify-between pt-3 border-t">
    <div class="flex items-center -space-x-2 space-x-reverse">
      <div class="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 text-[10px] font-medium border-2 border-white">أ</div>
    </div>
    <div class="flex items-center gap-1 text-xs text-muted-foreground">
      <svg class="w-3.5 h-3.5"><!-- Clock --></svg>
      <span>45 يوم متبقي</span>
    </div>
  </div>
</div>`,
  tailwind: `// Project Card - Design #3
<div className="bg-white rounded-xl border p-4 hover:shadow-md transition-all">
  <div className="flex items-start justify-between gap-3 mb-3">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Folder className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px]", statusColors[status])}>
          {statusLabels[status]}
        </span>
      </div>
    </div>
  </div>
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1.5">
      <span>التقدم</span>
      <span>{Math.round(progress * 100)}%</span>
    </div>
    <div className="h-2 bg-muted rounded-full">
      <div className={cn("h-full rounded-full", progressColor)} style={{ width: \`\${progress * 100}%\` }} />
    </div>
  </div>
  <div className="flex items-center justify-between pt-3 border-t">
    <div className="flex -space-x-2 space-x-reverse">
      {team.map((m) => <div className="w-7 h-7 rounded-full bg-primary/30">{m.name[0]}</div>)}
    </div>
    <div className="flex items-center gap-1 text-xs">
      <Clock className="w-3.5 h-3.5" />
      {daysRemaining} يوم متبقي
    </div>
  </div>
</div>`,
  react: `import { Folder, Clock, MoreVertical } from 'lucide-react';

function ProjectCard({ data }) {
  const daysRemaining = getDaysRemaining(data.dueDate);
  
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <Folder className="w-5 h-5 text-primary" />
        <div>
          <h4>{data.title}</h4>
          <span className={statusColors[data.status]}>{statusLabels[data.status]}</span>
        </div>
      </div>
      <div className="my-3">
        <div className="h-2 bg-muted rounded-full">
          <div style={{ width: \`\${data.progress * 100}%\` }} />
        </div>
      </div>
      <div className="flex justify-between">
        <AvatarGroup members={data.team} />
        <span>{daysRemaining} يوم متبقي</span>
      </div>
    </div>
  );
}`,
};
