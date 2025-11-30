import React, { useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { SearchState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface SearchDesign2Props {
  state?: SearchState;
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function SearchDesign2({
  state = 'idle',
  onSearch,
  placeholder = 'ابحث في المشاريع، العمال، الموردين...',
}: SearchDesign2Props) {
  const [query, setQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['الكل']);

  const filters = ['الكل', 'مشاريع', 'عمال', 'موردين', 'مصروفات'];

  const toggleFilter = (filter: string) => {
    if (filter === 'الكل') {
      setSelectedFilters(['الكل']);
    } else {
      setSelectedFilters(prev => {
        const newFilters = prev.filter(f => f !== 'الكل');
        if (prev.includes(filter)) {
          const result = newFilters.filter(f => f !== filter);
          return result.length === 0 ? ['الكل'] : result;
        }
        return [...newFilters, filter];
      });
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div
        className={cn(
          "bg-white rounded-2xl shadow-lg border p-4 transition-all duration-200",
          state === 'focused' && "shadow-xl ring-2 ring-primary/20"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Search className="w-5 h-5 text-primary" />
          </div>
          
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-base"
            aria-label="بحث"
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => onSearch?.(query)}
          >
            بحث
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t overflow-x-auto scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                selectedFilters.includes(filter)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {selectedFilters.length > 0 && !selectedFilters.includes('الكل') && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selectedFilters.length} فلاتر مُطبّقة
            </span>
            <button
              onClick={() => setSelectedFilters(['الكل'])}
              className="text-xs text-primary hover:underline"
            >
              مسح الكل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const searchDesign2Code = {
  html: `<div class="bg-white rounded-2xl shadow-lg border p-4">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
      <svg class="w-5 h-5 text-primary"><!-- Search icon --></svg>
    </div>
    <input type="search" placeholder="ابحث في المشاريع..." class="flex-1 bg-transparent outline-none text-base" />
    <button class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">بحث</button>
  </div>
  <div class="flex items-center gap-2 mt-4 pt-4 border-t">
    <button class="px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-white">الكل</button>
    <button class="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">مشاريع</button>
    <button class="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">عمال</button>
  </div>
</div>`,
  tailwind: `// Card Style Search - Design #2
<div className="bg-white rounded-2xl shadow-lg border p-4">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
      <Search className="w-5 h-5 text-primary" />
    </div>
    <input
      type="search"
      placeholder="ابحث في المشاريع، العمال..."
      className="flex-1 bg-transparent outline-none text-base"
    />
    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
      بحث
    </button>
  </div>
  <div className="flex items-center gap-2 mt-4 pt-4 border-t overflow-x-auto">
    {filters.map((filter) => (
      <button
        key={filter}
        className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
          isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
        )}
      >
        {filter}
      </button>
    ))}
  </div>
</div>`,
  react: `import { Search, X } from 'lucide-react';

function CardStyleSearch({ onSearch, filters = ['الكل', 'مشاريع', 'عمال'] }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(['الكل']);
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
        <button onClick={() => onSearch(query)}>بحث</button>
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t">
        {filters.map((f) => (
          <button key={f} onClick={() => toggleFilter(f)}>{f}</button>
        ))}
      </div>
    </div>
  );
}`,
};
