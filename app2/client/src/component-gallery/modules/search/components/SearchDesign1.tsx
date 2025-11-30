import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { SearchState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface SearchDesign1Props {
  state?: SearchState;
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function SearchDesign1({
  state = 'idle',
  onSearch,
  placeholder = 'ابحث هنا...',
}: SearchDesign1Props) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch?.('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div
        className={cn(
          "flex items-center gap-2 bg-white rounded-full shadow-sm border transition-all duration-200",
          "px-4 py-2",
          isFocused && "ring-2 ring-primary ring-offset-2 shadow-md",
          state === 'loading' && "opacity-70 pointer-events-none",
          state === 'error' && "border-red-500 ring-red-200",
          state === 'focused' && "ring-2 ring-primary ring-offset-2 shadow-md"
        )}
        role="search"
        aria-label="شريط البحث"
      >
        <Search className={cn(
          "w-5 h-5 transition-colors",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} />
        
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={state === 'loading'}
          className={cn(
            "flex-1 bg-transparent border-none outline-none text-sm",
            "placeholder:text-muted-foreground/70"
          )}
          aria-label="بحث"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-muted rounded-full transition-colors"
            aria-label="مسح البحث"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        <div className="w-px h-6 bg-border" />

        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>فلترة</span>
        </button>
      </div>

      {state === 'loading' && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          جاري البحث...
        </div>
      )}
    </form>
  );
}

export const searchDesign1Code = {
  html: `<form class="w-full max-w-xl">
  <div class="flex items-center gap-2 bg-white rounded-full shadow-sm border px-4 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
    <svg class="w-5 h-5 text-muted-foreground"><!-- Search icon --></svg>
    <input type="search" placeholder="ابحث هنا..." class="flex-1 bg-transparent border-none outline-none text-sm" aria-label="بحث" />
    <button type="button" class="p-1 hover:bg-muted rounded-full">
      <svg class="w-4 h-4"><!-- X icon --></svg>
    </button>
    <div class="w-px h-6 bg-border"></div>
    <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-full">
      <svg class="w-3.5 h-3.5"><!-- Filter icon --></svg>
      <span>فلترة</span>
    </button>
  </div>
</form>`,
  tailwind: `// Minimal Inline Search - Design #1
<div className="flex items-center gap-2 bg-white rounded-full shadow-sm border px-4 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all">
  <Search className="w-5 h-5 text-muted-foreground" />
  <input
    type="search"
    placeholder="ابحث هنا..."
    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/70"
    aria-label="بحث"
  />
  <button className="p-1 hover:bg-muted rounded-full">
    <X className="w-4 h-4 text-muted-foreground" />
  </button>
  <div className="w-px h-6 bg-border" />
  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-full">
    <Filter className="w-3.5 h-3.5" />
    <span>فلترة</span>
  </button>
</div>`,
  react: `import { Search, X, Filter } from 'lucide-react';

function MinimalInlineSearch({ onSearch, placeholder = "ابحث هنا..." }) {
  const [query, setQuery] = useState('');
  
  return (
    <div className="flex items-center gap-2 bg-white rounded-full shadow-sm border px-4 py-2 focus-within:ring-2 focus-within:ring-primary">
      <Search className="w-5 h-5 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm"
      />
      {query && (
        <button onClick={() => setQuery('')}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}`,
};
