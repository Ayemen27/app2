import { useState, useMemo } from 'react';
import { GalleryComponent, GalleryCatalog, SearchDesign, CardDesign } from '../shared/types';

const defaultCatalog: GalleryCatalog = {
  searchDesigns: [],
  cardDesigns: [],
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};

export function useGalleryCatalog() {
  const [catalog, setCatalog] = useState<GalleryCatalog>(defaultCatalog);
  const [filter, setFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'search' | 'card'>('all');

  const registerSearchDesign = (design: SearchDesign) => {
    setCatalog(prev => ({
      ...prev,
      searchDesigns: [...prev.searchDesigns.filter(d => d.id !== design.id), design],
      lastUpdated: new Date().toISOString(),
    }));
  };

  const registerCardDesign = (design: CardDesign) => {
    setCatalog(prev => ({
      ...prev,
      cardDesigns: [...prev.cardDesigns.filter(d => d.id !== design.id), design],
      lastUpdated: new Date().toISOString(),
    }));
  };

  const filteredSearchDesigns = useMemo(() => {
    if (!filter && categoryFilter === 'all') return catalog.searchDesigns;
    if (categoryFilter === 'card') return [];
    
    return catalog.searchDesigns.filter(design => 
      design.name.toLowerCase().includes(filter.toLowerCase()) ||
      design.nameAr.includes(filter) ||
      design.description.toLowerCase().includes(filter.toLowerCase())
    );
  }, [catalog.searchDesigns, filter, categoryFilter]);

  const filteredCardDesigns = useMemo(() => {
    if (!filter && categoryFilter === 'all') return catalog.cardDesigns;
    if (categoryFilter === 'search') return [];
    
    return catalog.cardDesigns.filter(design => 
      design.name.toLowerCase().includes(filter.toLowerCase()) ||
      design.nameAr.includes(filter) ||
      design.description.toLowerCase().includes(filter.toLowerCase())
    );
  }, [catalog.cardDesigns, filter, categoryFilter]);

  const allComponents = useMemo(() => {
    return [
      ...filteredSearchDesigns.map(d => ({ ...d, category: 'search' as const })),
      ...filteredCardDesigns.map(d => ({ ...d, category: 'card' as const })),
    ];
  }, [filteredSearchDesigns, filteredCardDesigns]);

  return {
    catalog,
    searchDesigns: filteredSearchDesigns,
    cardDesigns: filteredCardDesigns,
    allComponents,
    filter,
    setFilter,
    categoryFilter,
    setCategoryFilter,
    registerSearchDesign,
    registerCardDesign,
    totalCount: catalog.searchDesigns.length + catalog.cardDesigns.length,
  };
}
