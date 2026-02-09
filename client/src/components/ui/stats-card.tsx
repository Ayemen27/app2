import { Card, CardContent } from "@/components/ui/card";
// @ts-ignore
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatsCardProps {
  title?: string;
  label?: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "orange" | "red" | "purple" | "teal" | "indigo" | "emerald" | "amber" | "gray";
  gradient?: string;
  iconBg?: string;
  iconColor?: string;
  formatter?: (value: number) => string;
  format?: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  "data-testid"?: string;
}

const colorVariants = {
  blue: {
    border: "border-l-blue-500",
    text: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  green: {
    border: "border-l-green-500",
    text: "text-green-600",
    bg: "bg-green-50 dark:bg-green-900/20",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400"
  },
  orange: {
    border: "border-l-orange-500",
    text: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400"
  },
  red: {
    border: "border-l-red-500",
    text: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/20",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400"
  },
  purple: {
    border: "border-l-purple-500",
    text: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400"
  },
  teal: {
    border: "border-l-teal-500",
    text: "text-teal-600",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400"
  },
  indigo: {
    border: "border-l-indigo-500",
    text: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400"
  },
  emerald: {
    border: "border-l-emerald-500",
    text: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400"
  },
  amber: {
    border: "border-l-amber-500",
    text: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
  gray: {
    border: "border-l-gray-500",
    text: "text-gray-600",
    bg: "bg-gray-50 dark:bg-gray-900/20",
    iconBg: "bg-gray-100 dark:bg-gray-900/30",
    iconColor: "text-gray-600 dark:text-gray-400"
  },
  rose: {
    border: "border-l-rose-500",
    text: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400"
  }
};

export function StatsCard({ 
  title,
  label,
  value, 
  icon: Icon, 
  color = "blue",
  gradient,
  iconBg,
  iconColor,
  formatter, 
  className = "",
  "data-testid": dataTestId
}: StatsCardProps) {
  // استخدام الخصائص المخصصة أو الألوان الافتراضية
  const colors = color && colorVariants[color] ? colorVariants[color] : colorVariants.blue;
  const displayLabel = label || title || '';
  
  // تنظيف القيمة قبل العرض مع حماية أقوى ومحسنة
  const cleanValue = () => {
    if (value === undefined || value === null) return '0';
    
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return '0';
      
      // فحص القيم غير المنطقية (أكبر من 100 مليار)
      if (Math.abs(value) > 100000000000) {
        console.warn('⚠️ [StatsCard] قيمة رقمية غير منطقية:', value);
        return '0';
      }
      
      const cleanedValue = Math.max(0, value);
      return formatter ? formatter(cleanedValue) : cleanedValue.toLocaleString('en-US');
    }
    
    const stringValue = value.toString().trim();
    
    // فحوصات محسنة للأنماط المشبوهة
    
    // 1. الأرقام المتكررة المشبوهة (مثل 162162162)
    if (stringValue.match(/^(\d{1,3})\1{2,}$/)) {
      console.warn('⚠️ [StatsCard] نمط متكرر مشبوه:', stringValue);
      return '0';
    }
    
    // 2. تكرار نفس الرقم أكثر من 5 مرات (مثل 1111111)
    if (stringValue.match(/^(\d)\1{5,}$/)) {
      console.warn('⚠️ [StatsCard] تكرار رقم واحد:', stringValue);
      return '0';
    }
    
    // 3. أرقام طويلة جداً (أكثر من 12 رقم)
    if (stringValue.length > 12 && stringValue.match(/^\d+$/)) {
      console.warn('⚠️ [StatsCard] رقم طويل غير منطقي:', stringValue);
      return '0';
    }
    
    // 4. فحص الأنماط المشبوهة الإضافية
    const suspiciousPatterns = [
      /^(\d{2,3})\1{3,}$/, // تكرار مجموعات أرقام
      /^0+[1-9]0+$/, // أصفار مع رقم في المنتصف
      /^(123|234|345|456|567|678|789|012|098|987|876|765|654|543|432|321){3,}$/ // تسلسلات متكررة
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(stringValue)) {
        console.warn('⚠️ [StatsCard] نمط مشبوه آخر:', stringValue);
        return '0';
      }
    }
    
    // تنظيف الأرقام وإعادة تنسيقها
    const cleanedNumber = stringValue.replace(/[^\d.-]/g, '');
    
    if (!cleanedNumber || cleanedNumber === '' || cleanedNumber === '-') {
      return '0';
    }
    
    const parsed = parseFloat(cleanedNumber);
    
    if (!isNaN(parsed) && isFinite(parsed)) {
      // فحص القيم غير المنطقية مرة أخرى
      if (Math.abs(parsed) > 100000000000) {
        console.warn('⚠️ [StatsCard] قيمة محولة غير منطقية:', parsed);
        return '0';
      }
      
      const finalValue = Math.max(0, parsed);
      
      // فحص إضافي للتأكد من عدم وجود أعداد صحيحة كبيرة جداً بشكل غير منطقي
      if (Number.isInteger(finalValue) && finalValue > 1000000 && displayLabel.includes('عامل')) {
        console.warn('⚠️ [StatsCard] عدد عمال غير منطقي:', finalValue);
        return '0';
      }
      
      return finalValue.toLocaleString('en-US');
    }
    
    return '0';
  };
  
  const displayValue = cleanValue();
  
  const needsTooltip = displayLabel.length > 15;

  const LabelWithTooltip = ({ children }: { children: React.ReactNode }) => {
    if (!needsTooltip) return <>{children}</>;
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-center">
            <p className="text-xs">{displayLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // إذا كانت هناك خصائص مخصصة (gradient, iconBg, iconColor) استخدمها
  if (gradient || iconBg || iconColor) {
    return (
      <div className="flex gap-2">
        <div className={cn("w-8 h-8 md:w-9 md:h-9 rounded-lg flex-shrink-0 flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-4 w-4 md:h-5 md:w-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <LabelWithTooltip>
            <p 
              className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-snug break-words"
              style={{ 
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
              title={displayLabel}
            >
              {displayLabel}
            </p>
          </LabelWithTooltip>
          <p 
            className="text-xs md:text-sm font-bold text-slate-900 dark:text-white leading-tight break-words"
            style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)' }}
          >
            {displayValue}
          </p>
        </div>
      </div>
    );
  }
  
  // الاستايل الافتراضي المحسن - ارتفاع ثابت موحد احترافي
  return (
    <Card className={cn(
      colors.border, 
      colors.bg, 
      "border-l-4 border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-[75px] sm:h-[100px] rounded-xl sm:rounded-2xl overflow-hidden shadow-sm"
    )}>
      <CardContent className="p-2 sm:p-4 flex flex-col justify-center h-full bg-gradient-to-br from-white/10 to-transparent">
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          <div className="flex-1 min-w-0">
            <LabelWithTooltip>
              <p className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-tight truncate mb-0.5">
                {displayLabel}
              </p>
            </LabelWithTooltip>
            <p className={cn("text-xl font-bold font-mono tracking-tighter leading-none", colors.text)}>
              {displayValue}
            </p>
          </div>
          <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ring-2 sm:ring-4 ring-white/50 dark:ring-black/10", colors.iconBg)}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", colors.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {children}
    </div>
  );
}