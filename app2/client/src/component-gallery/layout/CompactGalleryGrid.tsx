import React, { memo, useMemo } from 'react';
import { GalleryComponent, GallerySettings } from '../shared/types';
import { CompactComponentCard } from './CompactComponentCard';
import { cn } from '../shared/utils';

interface CompactGalleryGridProps {
  components: GalleryComponent[];
  settings: GallerySettings;
  onInspect: (component: GalleryComponent) => void;
}

export const CompactGalleryGrid = memo(function CompactGalleryGrid({
  components,
  settings,
  onInspect,
}: CompactGalleryGridProps) {
  const gridCols = useMemo(() => {
    const colMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    };
    return colMap[settings.columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
  }, [settings.columns]);

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-semibold">
            {settings.language === 'ar' ? 'لا توجد مكونات' : 'No Components Found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-6 p-4',
        gridCols,
        'md:gap-6 md:p-6',
        'lg:gap-6 lg:p-8'
      )}
      role="region"
      aria-label="Component gallery"
    >
      {components.map((component, index) => (
        <CompactComponentCard
          key={component.id}
          component={component}
          settings={settings}
          onInspect={onInspect}
          index={index}
        />
      ))}
    </div>
  );
});

CompactGalleryGrid.displayName = 'CompactGalleryGrid';
