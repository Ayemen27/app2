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
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      6: 'grid-cols-6',
    };
    return colMap[settings.columns] || 'grid-cols-3';
  }, [settings.columns]);

  return (
    <div
      className={cn(
        'grid gap-3 p-4',
        gridCols,
        'md:gap-4 md:p-6',
        'lg:gap-4',
        'auto-rows-fr'
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
