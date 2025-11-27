import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
  defaultValue?: string;
}

export interface UnifiedSearchFilterProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onReset?: () => void;
  showResetButton?: boolean;
  className?: string;
  compact?: boolean;
}

export function UnifiedSearchFilter({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'بحث...',
  showSearch = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  showResetButton = true,
  className,
  compact = false,
}: UnifiedSearchFilterProps) {
  const hasActiveFilters = searchValue.length > 0 || 
    Object.entries(filterValues).some(([key, value]) => {
      const filter = filters.find(f => f.key === key);
      return value && value !== 'all' && value !== filter?.defaultValue;
    });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  }, [onSearchChange]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    onFilterChange?.(key, value);
  }, [onFilterChange]);

  const handleReset = useCallback(() => {
    onReset?.();
  }, [onReset]);

  const gridCols = compact 
    ? 'grid-cols-1 sm:grid-cols-2'
    : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(filters.length + (showSearch ? 1 : 0) + (showResetButton ? 1 : 0), 4)}`;

  return (
    <Card className={cn('border-border/50', className)}>
      <CardContent className={cn('p-3 sm:p-4', compact && 'p-2 sm:p-3')}>
        <div className={cn(
          'grid gap-3 sm:gap-4',
          gridCols
        )}>
          {showSearch && (
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-sm font-medium">
                البحث
              </Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={handleSearchChange}
                  className="pr-10 h-9"
                />
              </div>
            </div>
          )}

          {filters.map((filter) => (
            <div key={filter.key} className="space-y-1.5">
              <Label htmlFor={filter.key} className="text-sm font-medium">
                {filter.label}
              </Label>
              <Select 
                value={filterValues[filter.key] || filter.defaultValue || 'all'}
                onValueChange={(value) => handleFilterChange(filter.key, value)}
              >
                <SelectTrigger id={filter.key} className="h-9">
                  <SelectValue placeholder={filter.placeholder || `اختر ${filter.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {showResetButton && (
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className={cn(
                  'w-full h-9 gap-2',
                  hasActiveFilters && 'border-primary/50 text-primary hover:bg-primary/5'
                )}
                onClick={handleReset}
                disabled={!hasActiveFilters}
              >
                {hasActiveFilters ? (
                  <>
                    <X className="h-4 w-4" />
                    مسح الفلاتر
                  </>
                ) : (
                  <>
                    <Filter className="h-4 w-4" />
                    إعادة تعيين
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function useUnifiedFilter<T extends Record<string, string>>(
  initialFilters: T,
  initialSearch: string = ''
) {
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [filterValues, setFilterValues] = useState<T>(initialFilters);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchValue('');
    setFilterValues(initialFilters);
  }, [initialFilters]);

  return {
    searchValue,
    filterValues,
    setSearchValue: handleSearchChange,
    setFilterValue: handleFilterChange,
    reset: handleReset,
    onSearchChange: handleSearchChange,
    onFilterChange: handleFilterChange,
    onReset: handleReset,
  };
}

export const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
];

export const EQUIPMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'out_of_service', label: 'خارج الخدمة' },
  { value: 'inactive', label: 'غير نشط' },
];

export const READ_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'الكل' },
  { value: 'unread', label: 'غير مقروء' },
  { value: 'read', label: 'مقروء' },
];

export default UnifiedSearchFilter;
