import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, X, Settings, RefreshCw, RotateCcw, List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionButton } from './types';

interface SearchToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  actions?: ActionButton[];
  onReset?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  hasActiveFilters?: boolean;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  showViewToggle?: boolean;
  className?: string;
}

export function SearchToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'البحث...',
  showSearch = true,
  actions = [],
  onReset,
  onRefresh,
  isRefreshing = false,
  hasActiveFilters = false,
  viewMode = 'grid',
  onViewModeChange,
  showViewToggle = false,
  className,
}: SearchToolbarProps) {
  const handleClearSearch = useCallback(() => {
    onSearchChange?.('');
  }, [onSearchChange]);

  const defaultActions: ActionButton[] = [
    {
      key: 'settings',
      icon: Settings,
      tooltip: 'إعدادات',
      onClick: () => {},
    }
  ];

  if (showViewToggle && onViewModeChange) {
    defaultActions.push({
      key: 'viewList',
      icon: List,
      tooltip: 'عرض قائمة',
      onClick: () => onViewModeChange('list'),
      variant: viewMode === 'list' ? 'default' : 'ghost',
    });
    defaultActions.push({
      key: 'viewGrid',
      icon: LayoutGrid,
      tooltip: 'عرض شبكة',
      onClick: () => onViewModeChange('grid'),
      variant: viewMode === 'grid' ? 'default' : 'ghost',
    });
  }

  if (onRefresh) {
    defaultActions.push({
      key: 'refresh',
      icon: RefreshCw,
      tooltip: 'تحديث',
      onClick: onRefresh,
      loading: isRefreshing,
    });
  }

  if (onReset) {
    defaultActions.push({
      key: 'reset',
      icon: RotateCcw,
      tooltip: 'إعادة تعيين',
      onClick: onReset,
    });
  }

  const allActions = [...defaultActions, ...actions];

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 bg-gradient-to-l from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl',
      className
    )}>
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1">
          {allActions.map((action) => {
            const Icon = action.icon;
            return (
              <Tooltip key={action.key}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.variant || 'ghost'}
                    size="icon"
                    className={cn(
                      'h-8 w-8 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                      action.loading && 'animate-spin',
                      action.variant === 'default' && 'bg-primary/10 text-primary'
                    )}
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                {action.tooltip && (
                  <TooltipContent side="bottom" className="text-xs">
                    <p>{action.tooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {showSearch && (
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-9 pr-3 pl-8 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            dir="rtl"
          />
          {searchValue ? (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
              onClick={handleClearSearch}
            >
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
            </Button>
          ) : (
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          )}
        </div>
      )}
    </div>
  );
}

export default SearchToolbar;
