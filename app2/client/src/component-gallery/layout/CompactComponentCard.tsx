import React, { memo, useCallback } from 'react';
import { Eye, Copy, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GalleryComponent, GallerySettings } from '../shared/types';
import { useCopyCode } from '../hooks/useCopyCode';
import { cn } from '../shared/utils';

interface CompactComponentCardProps {
  component: GalleryComponent;
  settings: GallerySettings;
  onInspect: (component: GalleryComponent) => void;
  index: number;
}

export const CompactComponentCard = memo(function CompactComponentCard({
  component,
  settings,
  onInspect,
  index,
}: CompactComponentCardProps) {
  const { copied, copy } = useCopyCode();
  const isArabic = settings.language === 'ar';
  const isSearch = component.category === 'search';

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    copy(component.code.tailwind);
  }, [component.code.tailwind, copy]);

  const handleInspect = useCallback(() => {
    onInspect(component);
  }, [component, onInspect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInspect();
  }, [handleInspect]);

  return (
    <div
      className={cn(
        "group relative cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200 rounded-xl",
        "hover:shadow-xl hover:border-primary hover:scale-105 hover:-translate-y-1",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        "overflow-hidden"
      )}
      onClick={handleInspect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${isArabic ? 'عرض' : 'View'} ${isArabic ? component.nameAr : component.name}`}
    >
      {/* Badge Corner */}
      <div className="absolute top-2 right-2 z-10">
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] font-bold px-2 py-1 bg-white/90 backdrop-blur border-primary/50",
            "group-hover:bg-primary group-hover:text-white transition-all"
          )}
        >
          #{String(index + 1).padStart(2, '0')}
        </Badge>
      </div>

      {/* Header */}
      <div className="p-3 border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 via-gray-50 to-transparent">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h4 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
            {isArabic ? component.nameAr : component.name}
          </h4>
          <Badge
            variant={isSearch ? 'default' : 'secondary'}
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 flex-shrink-0 whitespace-nowrap",
              isSearch && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isSearch ? '🔍' : '📋'}
          </Badge>
        </div>
        <p className="text-[11px] text-gray-600 line-clamp-2 leading-tight">
          {isArabic ? component.descriptionAr : component.description}
        </p>
      </div>

      {/* Preview Container */}
      <div className="relative aspect-square bg-gradient-to-br from-white via-gray-50 to-gray-100 overflow-hidden border-t-2 border-gray-100 flex items-center justify-center p-2.5">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br from-primary to-primary/20" />
        <div className="scale-[0.65] origin-center">
          {component.preview}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex gap-2 p-2.5 border-t-2 border-gray-100 bg-gradient-to-t from-gray-50 to-white">
        <Button
          size="sm"
          className={cn(
            "flex-1 h-9 text-[11px] font-bold gap-1.5 rounded-lg",
            "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
            "text-white shadow-md hover:shadow-lg transition-all"
          )}
          onClick={handleInspect}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">{isArabic ? 'معاينة' : 'Preview'}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-9 w-9 p-0 border-2 rounded-lg",
            "hover:bg-gray-100 hover:border-primary transition-all font-bold"
          )}
          onClick={handleCopy}
          title={isArabic ? 'نسخ الكود' : 'Copy code'}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Lightning Icon on Hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute top-2 left-2">
          <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
});

CompactComponentCard.displayName = 'CompactComponentCard';
