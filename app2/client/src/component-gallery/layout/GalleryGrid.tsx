import React from 'react';
import { PackageOpen } from 'lucide-react';
import { GalleryComponent, GallerySettings } from '../shared/types';
import { ComponentCard } from './ComponentCard';
import { cn, getResponsiveGridCols } from '../shared/utils';

interface GalleryGridProps {
  components: GalleryComponent[];
  settings: GallerySettings;
  onInspect: (component: GalleryComponent) => void;
}

export function GalleryGrid({
  components,
  settings,
  onInspect,
}: GalleryGridProps) {
  const isArabic = settings.language === 'ar';

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <PackageOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {isArabic ? 'لا توجد مكونات' : 'No Components Found'}
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {isArabic 
            ? 'لم يتم العثور على مكونات تطابق معايير البحث. جرب تغيير الفلاتر أو البحث بكلمات مختلفة.'
            : 'No components match your search criteria. Try changing the filters or search with different keywords.'}
        </p>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        settings.viewMode === 'grid' 
          ? `grid gap-4 ${getResponsiveGridCols(settings.columns)}`
          : 'flex flex-col gap-3'
      )}
    >
      {components.map((component, index) => (
        <ComponentCard
          key={component.id}
          component={component}
          settings={settings}
          onInspect={onInspect}
          index={index}
        />
      ))}
    </div>
  );
}
