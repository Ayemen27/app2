import React, { useState, useMemo, Suspense } from 'react';
import { GalleryHeader, GalleryFooter, CategoryTabs } from './layout';
import { ComponentDetailPage } from './layout/ComponentDetailPage';
import { CompactGalleryGrid } from './layout/CompactGalleryGrid';
import { useGallerySettings } from './hooks';
import { useLocation } from 'wouter';
import { GalleryComponent } from './shared/types';
import { allComponents, searchComponents, cardComponents } from './data/catalog';

export function ComponentGalleryPage() {
  const { settings, toggleViewMode, toggleTheme, toggleShowCode, toggleLanguage, setColumns } = useGallerySettings();
  const [, setLocation] = useLocation();
  
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'search' | 'card'>('all');
  const [selectedComponent, setSelectedComponent] = useState<GalleryComponent | null>(null);

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
    setSelectedComponent(component);
  };

  const currentComponentIndex = selectedComponent 
    ? filteredComponents.findIndex(c => c.id === selectedComponent?.id)
    : -1;

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (currentComponentIndex < 0) return;
    
    let nextIndex: number;
    if (direction === 'prev') {
      nextIndex = currentComponentIndex - 1;
    } else {
      nextIndex = currentComponentIndex + 1;
    }

    if (nextIndex >= 0 && nextIndex < filteredComponents.length) {
      setSelectedComponent(filteredComponents[nextIndex]);
    }
  };

  // Show detail page if component is selected
  if (selectedComponent) {
    return (
      <ComponentDetailPage
        component={selectedComponent}
        settings={settings}
        onNavigate={handleNavigate}
        hasPrev={currentComponentIndex > 0}
        hasNext={currentComponentIndex < filteredComponents.length - 1}
      />
    );
  }

  // Show gallery page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
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

      <main className="container mx-auto px-2 md:px-4 py-4 md:py-6">
        <CompactGalleryGrid
          components={filteredComponents}
          settings={settings}
          onInspect={handleInspect}
        />
      </main>

      <GalleryFooter settings={settings} />
    </div>
  );
}

export default ComponentGalleryPage;
