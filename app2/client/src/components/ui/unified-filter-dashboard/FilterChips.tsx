import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { X, ChevronDown, Filter, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { FilterConfig } from './types';

interface FilterChipsProps {
  filters: FilterConfig[];
  filterValues: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onReset?: () => void;
  showAllFiltersButton?: boolean;
  onShowAllFilters?: () => void;
  className?: string;
}

function DatePickerFilter({
  value,
  onChange,
  placeholder = 'اختر التاريخ',
}: {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-right h-9 font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          {value ? format(value, 'yyyy/MM/dd', { locale: ar }) : placeholder}
          <Calendar className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value?: { from?: Date; to?: Date };
  onChange: (range: { from?: Date; to?: Date }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-right h-9 font-normal',
            !value?.from && 'text-muted-foreground'
          )}
        >
          {value?.from ? (
            value.to ? (
              `${format(value.from, 'MM/dd', { locale: ar })} - ${format(value.to, 'MM/dd', { locale: ar })}`
            ) : (
              format(value.from, 'yyyy/MM/dd', { locale: ar })
            )
          ) : (
            'اختر نطاق التاريخ'
          )}
          <Calendar className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="range"
          selected={value?.from ? { from: value.from, to: value.to } : undefined}
          onSelect={(range: any) => {
            onChange(range || { from: undefined, to: undefined });
            if (range?.to) setOpen(false);
          }}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function FilterChips({
  filters,
  filterValues,
  onFilterChange,
  onReset,
  showAllFiltersButton = true,
  className,
}: FilterChipsProps) {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const getActiveFilters = () => {
    return filters.filter(filter => {
      const value = filterValues[filter.key];
      if (filter.type === 'date') return value instanceof Date;
      if (filter.type === 'date-range') return value?.from || value?.to;
      return value && value !== 'all' && value !== filter.defaultValue;
    });
  };

  const activeFilters = getActiveFilters();

  const getFilterDisplayValue = (filter: FilterConfig): string => {
    const value = filterValues[filter.key];
    if (filter.type === 'date' && value instanceof Date) {
      return format(value, 'yyyy/MM/dd', { locale: ar });
    }
    if (filter.type === 'date-range') {
      if (value?.from && value?.to) {
        return `${format(value.from, 'MM/dd')} - ${format(value.to, 'MM/dd')}`;
      }
      if (value?.from) {
        return `من ${format(value.from, 'MM/dd')}`;
      }
    }
    const option = filter.options?.find(o => o.value === value);
    return option?.label || value;
  };

  const handleRemoveFilter = (filter: FilterConfig) => {
    if (filter.type === 'date' || filter.type === 'date-range') {
      onFilterChange(filter.key, undefined);
    } else {
      onFilterChange(filter.key, filter.defaultValue || 'all');
    }
  };

  const renderFilterInput = (filter: FilterConfig) => {
    const value = filterValues[filter.key];

    switch (filter.type) {
      case 'date':
        return (
          <DatePickerFilter
            value={value}
            onChange={(date) => onFilterChange(filter.key, date)}
            placeholder={filter.placeholder}
          />
        );
      case 'date-range':
        return (
          <DateRangeFilter
            value={value}
            onChange={(range) => onFilterChange(filter.key, range)}
          />
        );
      default:
        return (
          <Select
            value={value || filter.defaultValue || 'all'}
            onValueChange={(v) => onFilterChange(filter.key, v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={filter.placeholder || filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1.5 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-full cursor-default transition-colors"
            >
              <span className="font-medium">
                {getFilterDisplayValue(filter)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFilter(filter);
                }}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors mr-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {showAllFiltersButton && (
        <div className="flex justify-start">
          <Popover open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-primary gap-1 h-7 text-xs px-2"
              >
                عرض جميع الفلاتر
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    خيارات الفلترة
                  </h4>
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {activeFilters.length} نشط
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {filters.map((filter) => (
                    <div key={filter.key} className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">
                        {filter.label}
                      </Label>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>

                {activeFilters.length > 0 && onReset && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onReset();
                      setIsFilterPanelOpen(false);
                    }}
                    className="w-full gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
                  >
                    <X className="h-4 w-4" />
                    مسح جميع الفلاتر
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

export default FilterChips;
