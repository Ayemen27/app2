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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-right h-9 font-normal group",
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
      <PopoverContent className="w-auto p-0" align="start" dir="rtl">
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
  numberOfMonths = 2,
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
    // If only 'from' is selected, it stays open because of the condition above
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ from: undefined, to: undefined });
  }, [onChange]);

  const formatRangeDisplay = () => {
    if (!value?.from) return placeholder;
    
    if (value.to) {
      return `${format(value.from, "dd MMM", { locale: ar })} - ${format(value.to, "dd MMM", { locale: ar })}`;
    }
    
    return format(value.from, "dd MMMM yyyy", { locale: ar });
  };

  const disabledDays = React.useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-right h-9 font-normal group",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2 flex-1 text-right">
            <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
            <span className="truncate">{formatRangeDisplay()}</span>
          </span>
          {showClearButton && (value?.from || value?.to) && (
            <X 
              className="h-4 w-4 opacity-50 hover:opacity-100 shrink-0 transition-opacity" 
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" dir="rtl">
        <Calendar
          mode="range"
          selected={value?.from ? { from: value.from, to: value.to } : undefined}
          onSelect={handleSelect as any}
          numberOfMonths={numberOfMonths}
          disabled={disabledDays}
          locale={ar}
          dir="rtl"
          initialFocus
        />
      </PopoverContent>
    </Popover>
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
