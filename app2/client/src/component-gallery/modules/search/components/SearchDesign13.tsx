import { useState } from 'react';
interface Props {
  state?: 'idle' | 'loading' | 'error' | 'focused';
  onSearch?: (query: string) => void;
}
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchDesign13({
  state = 'idle',
  onSearch,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const availableFilters = [
    { id: 'recent', label: 'الأحدث' },
    { id: 'popular', label: 'الأكثر شهرة' },
    { id: 'expensive', label: 'الأغلى' },
    { id: 'cheap', label: 'الأرخص' },
  ];

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  return (
    <div className="w-full max-w-2xl space-y-3" role="search" aria-label="بحث بالشرائح">
      {/* شريط البحث */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border-2",
        "bg-white transition-all",
        isFocused ? "border-primary" : "border-border"
      )}>
        <Search className={cn(
          "w-5 h-5 transition-colors",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="ابحث..."
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          aria-label="حقل البحث"
        />
      </div>

      {/* الشرائح */}
      <div className="flex flex-wrap gap-2">
        {availableFilters.map(filter => (
          <button
            key={filter.id}
            type="button"
            onClick={() => toggleFilter(filter.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "border-2 whitespace-nowrap",
              selectedFilters.includes(filter.id)
                ? "border-primary bg-primary text-white"
                : "border-border bg-white hover:border-primary/50"
            )}
            aria-pressed={selectedFilters.includes(filter.id)}
            aria-label={`تصفية: ${filter.label}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* الشرائح المختارة */}
      {selectedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {selectedFilters.map(filterId => {
            const filter = availableFilters.find(f => f.id === filterId);
            return filter ? (
              <div
                key={filterId}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30"
              >
                <span className="text-sm font-medium text-primary">{filter.label}</span>
                <button
                  type="button"
                  onClick={() => toggleFilter(filterId)}
                  className="hover:bg-primary/20 rounded p-0.5"
                  aria-label={`إزالة ${filter.label}`}
                >
                  <X className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export const searchDesign13Code = {
  html: `<div class="w-full max-w-2xl space-y-3">
  <div class="flex items-center gap-3 px-4 py-3 rounded-lg border-2">
    <svg class="w-5 h-5"><!-- Search --></svg>
    <input type="text" placeholder="ابحث..." class="flex-1 bg-transparent outline-none">
  </div>
  <div class="flex flex-wrap gap-2">
    <button class="px-3 py-1.5 rounded-full border-2">الأحدث</button>
    <button class="px-3 py-1.5 rounded-full border-2 bg-primary text-white">الأكثر شهرة</button>
  </div>
</div>`,
  react: `<SearchDesign13 state="idle" onSearch={(q) => console.log(q)} />`,
  notes: 'تصميم بحث متقدم مع شرائح فلترة قابلة للاختيار',
};
