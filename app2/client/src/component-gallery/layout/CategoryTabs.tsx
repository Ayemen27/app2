import React from 'react';
import { Search, CreditCard, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GallerySettings } from '../shared/types';
import { cn } from '../shared/utils';

interface CategoryTabsProps {
  settings: GallerySettings;
  activeCategory: 'all' | 'search' | 'card';
  onCategoryChange: (category: 'all' | 'search' | 'card') => void;
  searchCount: number;
  cardCount: number;
}

export function CategoryTabs({
  settings,
  activeCategory,
  onCategoryChange,
  searchCount,
  cardCount,
}: CategoryTabsProps) {
  const isArabic = settings.language === 'ar';

  const categories = [
    {
      id: 'all' as const,
      label: isArabic ? 'الكل' : 'All',
      icon: LayoutGrid,
      count: searchCount + cardCount,
    },
    {
      id: 'search' as const,
      label: isArabic ? 'البحث والفلترة' : 'Search & Filters',
      icon: Search,
      count: searchCount,
    },
    {
      id: 'card' as const,
      label: isArabic ? 'البطاقات' : 'Cards',
      icon: CreditCard,
      count: cardCount,
    },
  ];

  return (
    <div className="border-b bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "gap-2 whitespace-nowrap transition-all",
                activeCategory === cat.id && "shadow-sm"
              )}
            >
              <cat.icon className="w-4 h-4" />
              <span>{cat.label}</span>
              <Badge 
                variant={activeCategory === cat.id ? 'default' : 'secondary'}
                className="text-xs h-5 px-1.5"
              >
                {cat.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
