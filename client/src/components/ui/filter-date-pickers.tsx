import * as React from "react";
import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function normalizeDate(date: Date | undefined): Date | undefined {
  if (!date) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

export function dateToISOString(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  return format(date, "yyyy-MM-dd");
}

export interface FilterDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showClearButton?: boolean;
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function FilterDatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  disabled = false,
  className,
  showClearButton = true,
  dateFormat = "dd MMMM yyyy",
  minDate,
  maxDate,
}: FilterDatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((date: Date | undefined) => {
    const normalizedDate = normalizeDate(date);
    onChange(normalizedDate);
    // Removed setOpen(false)
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  }, [onChange]);

  const disabledDays = React.useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-right h-9 font-normal group bg-white dark:bg-gray-950 border-gray-200 shadow-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2 flex-1 text-right">
            <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
            <span className="truncate">
              {value ? format(value, dateFormat, { locale: ar }) : placeholder}
            </span>
          </span>
          {showClearButton && value && (
            <X 
              className="h-4 w-4 opacity-50 hover:opacity-100 shrink-0 transition-opacity" 
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto overflow-visible shadow-2xl border-border/40 z-[210]" align="start" dir="rtl">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledDays}
          locale={ar}
          dir="rtl"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface FilterDateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showClearButton?: boolean;
  numberOfMonths?: 1 | 2;
  minDate?: Date;
  maxDate?: Date;
}

export function FilterDateRangePicker({
  value,
  onChange,
  placeholder = "اختر نطاق التاريخ",
  disabled = false,
  className,
  showClearButton = true,
  numberOfMonths = 1,
  minDate,
  maxDate,
}: FilterDateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((range: { from?: Date; to?: Date } | undefined) => {
    const normalizedRange = range ? {
      from: normalizeDate(range.from),
      to: normalizeDate(range.to)
    } : { from: undefined, to: undefined };
    
    onChange(normalizedRange);
    
    if (range?.to) {
      setOpen(false);
    }
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ from: undefined, to: undefined });
  }, [onChange]);

  const disabledDays = React.useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-right h-12 rounded-xl border-border/60 bg-white dark:bg-gray-950 shadow-sm hover:border-primary transition-all",
                !value?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4 opacity-50 shrink-0" />
              <span className="truncate flex-1 font-bold">
                {value?.from ? format(value.from, "yyyy/MM/dd", { locale: ar }) : "من"}
              </span>
            </Button>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-right h-12 rounded-xl border-border/60 bg-white dark:bg-gray-950 shadow-sm hover:border-primary transition-all relative group",
                !value?.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4 opacity-50 shrink-0" />
              <span className="truncate flex-1 font-bold">
                {value?.to ? format(value.to, "yyyy/MM/dd", { locale: ar }) : "إلى"}
              </span>
              {showClearButton && (value?.from || value?.to) && (
                <div 
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={handleClear}
                >
                  <X className="h-3.5 w-3.5" />
                </div>
              )}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border/40 pointer-events-auto overflow-visible z-[210]" align="center" dir="rtl">
          <Calendar
            mode="range"
            selected={value?.from ? { from: value.from, to: value.to } : undefined}
            onSelect={handleSelect as any}
            numberOfMonths={numberOfMonths}
            disabled={disabledDays}
            locale={ar}
            dir="rtl"
            initialFocus
            className="rounded-2xl"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function formatDateForDisplay(date: Date | undefined, dateFormat: string = "dd MMMM yyyy"): string {
  if (!date) return "";
  return format(date, dateFormat, { locale: ar });
}

export function formatDateRangeForDisplay(range: DateRange | undefined): string {
  if (!range?.from) return "";
  
  if (range.to) {
    return `${format(range.from, "dd/MM/yyyy", { locale: ar })} - ${format(range.to, "dd/MM/yyyy", { locale: ar })}`;
  }
  
  return format(range.from, "dd/MM/yyyy", { locale: ar });
}

export function parseDateString(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? undefined : normalizeDate(parsed);
}
