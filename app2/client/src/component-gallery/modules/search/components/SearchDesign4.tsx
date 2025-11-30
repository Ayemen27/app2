import React, { useState, useEffect } from 'react';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { SearchState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface SearchDesign4Props {
  state?: SearchState;
  onSearch?: (query: string) => void;
  placeholder?: string;
  resultCount?: number;
}

export function SearchDesign4({
  state = 'idle',
  onSearch,
  placeholder = 'بحث سريع...',
  resultCount = 0,
}: SearchDesign4Props) {
  const [query, setQuery] = useState('');
  const [isSticky, setIsSticky] = useState(false);
  const [activeFilter, setActiveFilter] = useState('الكل');

  const filters = ['الكل', 'اليوم', 'هذا الأسبوع', 'هذا الشهر'];

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "w-full transition-all duration-300",
        isSticky && "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md shadow-lg py-2"
      )}
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex-1 flex items-center gap-2 bg-white rounded-xl border shadow-sm transition-all",
              isSticky ? "px-3 py-2" : "px-4 py-3"
            )}
          >
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 hover:bg-muted rounded-md">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            
            {resultCount > 0 && (
              <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-md">
                {resultCount} نتيجة
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-white rounded-xl border shadow-sm p-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                  activeFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            className={cn(
              "flex items-center gap-2 bg-white border rounded-xl shadow-sm transition-all",
              isSticky ? "px-3 py-2" : "px-4 py-3"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">المزيد</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {isSticky && query && (
          <div className="mt-2 text-xs text-muted-foreground">
            جاري البحث عن "{query}" في {activeFilter}
          </div>
        )}
      </div>
    </div>
  );
}

export const searchDesign4Code = {
  html: `<div class="w-full sticky top-0 z-50 bg-background/95 backdrop-blur-md shadow-lg py-2">
  <div class="max-w-4xl mx-auto px-4">
    <div class="flex items-center gap-3">
      <div class="flex-1 flex items-center gap-2 bg-white rounded-xl border px-3 py-2">
        <svg class="w-5 h-5"><!-- Search --></svg>
        <input type="search" placeholder="بحث سريع..." class="flex-1 outline-none text-sm" />
        <div class="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md">23 نتيجة</div>
      </div>
      <div class="flex items-center gap-1 bg-white rounded-xl border p-1">
        <button class="px-3 py-1.5 rounded-lg text-xs bg-primary text-white">الكل</button>
        <button class="px-3 py-1.5 rounded-lg text-xs text-muted-foreground">اليوم</button>
      </div>
      <button class="flex items-center gap-2 bg-white border rounded-xl px-3 py-2">
        <svg class="w-4 h-4"><!-- Filter --></svg>
        <span class="text-sm">المزيد</span>
      </button>
    </div>
  </div>
</div>`,
  tailwind: `// Floating Filter Bar - Design #4
<div className={cn(
  "w-full transition-all duration-300",
  isSticky && "fixed top-0 z-50 bg-background/95 backdrop-blur-md shadow-lg py-2"
)}>
  <div className="max-w-4xl mx-auto px-4">
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center gap-2 bg-white rounded-xl border px-3 py-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
        {resultCount > 0 && (
          <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md">
            {resultCount} نتيجة
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 bg-white rounded-xl border p-1">
        {filters.map((f) => (
          <button key={f} className={cn(
            "px-3 py-1.5 rounded-lg text-xs",
            active === f ? "bg-primary text-white" : "text-muted-foreground"
          )}>{f}</button>
        ))}
      </div>
    </div>
  </div>
</div>`,
  react: `import { Search, Filter, ChevronDown } from 'lucide-react';

function FloatingFilterBar({ onSearch, filters, resultCount }) {
  const [isSticky, setIsSticky] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className={cn("w-full", isSticky && "fixed top-0 z-50 backdrop-blur-md")}>
      {/* Search bar with result count badge */}
    </div>
  );
}`,
};
