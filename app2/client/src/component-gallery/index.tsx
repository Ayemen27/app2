import React, { useState, useMemo } from 'react';
import { GalleryHeader, GalleryFooter, InspectorPanel, CategoryTabs, GalleryGrid } from './layout';
import { useGallerySettings, useInspector } from './hooks';
import { GalleryComponent, InspectorState, ComponentState } from './shared/types';
import { allComponents, searchComponents, cardComponents } from './data/catalog';

export function ComponentGalleryPage() {
  const { settings, toggleViewMode, toggleTheme, toggleShowCode, toggleLanguage, setColumns } = useGallerySettings();
  const inspector = useInspector();
  
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'search' | 'card'>('all');

  const filteredComponents = useMemo(() => {
    let components: GalleryComponent[] = [];
    
    if (categoryFilter === 'all') {
      components = allComponents;
    } else if (categoryFilter === 'search') {
      components = searchComponents;
    } else {
      components = cardComponents;
    }

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      components = components.filter(c => 
        c.name.toLowerCase().includes(lowerFilter) ||
        c.nameAr.includes(filter) ||
        c.description.toLowerCase().includes(lowerFilter) ||
        c.descriptionAr.includes(filter) ||
        c.tags.some(t => t.toLowerCase().includes(lowerFilter))
      );
    }

    return components;
  }, [categoryFilter, filter]);

  const handleInspect = (component: GalleryComponent) => {
    inspector.openInspector(component);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <GalleryHeader
        settings={settings}
        filter={filter}
        onFilterChange={setFilter}
        onToggleViewMode={toggleViewMode}
        onToggleTheme={toggleTheme}
        onToggleShowCode={toggleShowCode}
        onToggleLanguage={toggleLanguage}
        totalCount={allComponents.length}
      />

      <CategoryTabs
        settings={settings}
        activeCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        searchCount={searchComponents.length}
        cardCount={cardComponents.length}
      />

      <main className="container mx-auto px-4 py-6">
        <GalleryGrid
          components={filteredComponents}
          settings={settings}
          onInspect={handleInspect}
        />
      </main>

      <GalleryFooter settings={settings} />

      <InspectorPanel
        state={inspector}
        settings={settings}
        onClose={inspector.closeInspector}
        onTabChange={inspector.setActiveTab}
        onStateChange={inspector.setCurrentState}
      />
    </div>
  );
}

export default ComponentGalleryPage;
