import React, { memo, useCallback } from 'react';
import { Eye, Copy, Check } from 'lucide-react';
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
        "group relative cursor-pointer transition-all duration-200",
        "bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-primary/40",
        "overflow-hidden hover:scale-105 focus-within:ring-2 focus-within:ring-primary"
      )}
      onClick={handleInspect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${isArabic ? 'عرض' : 'View'} ${isArabic ? component.nameAr : component.name}`}
    >
      {/* Compact Header */}
      <div className="p-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-transparent">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0">
              #{String(index + 1).padStart(2, '0')}
            </Badge>
            <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
              {isArabic ? component.nameAr : component.name}
            </h4>
          </div>
          <Badge
            variant={isSearch ? 'default' : 'secondary'}
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0",
              isSearch && "bg-blue-600"
            )}
          >
            {isSearch ? '🔍' : '📋'}
          </Badge>
        </div>
        <p className="text-[11px] text-gray-600 line-clamp-1 mt-0.5">
          {isArabic ? component.descriptionAr : component.description}
        </p>
      </div>

      {/* Compact Preview */}
      <div className="aspect-square bg-gray-50 overflow-hidden border-t border-gray-100 flex items-center justify-center p-2">
        <div className="scale-50 origin-center opacity-90">
          {component.preview}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1 p-2 border-t border-gray-100 bg-gradient-to-t from-gray-50">
        <Button
          size="sm"
          className={cn(
            "flex-1 h-8 text-[11px] font-bold gap-1 rounded px-2",
            "bg-blue-600 hover:bg-blue-700 text-white"
          )}
          onClick={handleInspect}
        >
          <Eye className="w-3 h-3" />
          <span className="hidden sm:inline">{isArabic ? 'معاينة' : 'View'}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-8 w-8 p-0 border rounded",
            "hover:bg-gray-100 transition-all"
          )}
          onClick={handleCopy}
          title={isArabic ? 'نسخ' : 'Copy'}
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-600" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>
    </div>
  );
});

CompactComponentCard.displayName = 'CompactComponentCard';
