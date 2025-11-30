import { useState } from 'react';
interface Props {
  state?: 'idle' | 'loading' | 'error' | 'focused';
  onSearch?: (query: string) => void;
}
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchDesign10({
  state = 'idle',
  onSearch,
}: Props) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <form className="w-full max-w-md" role="search" aria-label="بحث glassmorphism">
      <div className={cn(
        "relative backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300",
        "border border-white/30",
        "bg-white/10 hover:bg-white/20",
        isFocused && "bg-white/30 border-white/50 shadow-lg shadow-primary/20",
        state === 'loading' && "opacity-70",
        state === 'error' && "border-red-400/50 bg-red-50/10"
      )}>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <Search className={cn(
            "w-5 h-5 transition-colors",
            isFocused ? "text-primary" : "text-white/70"
          )} />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="ابحث..."
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white/50"
            aria-label="حقل البحث"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="مسح البحث"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export const searchDesign10Code = {
  html: `<form class="w-full max-w-md">
  <div class="backdrop-blur-md rounded-2xl border border-white/30 bg-white/10">
    <div class="flex items-center gap-3 px-5 py-3.5">
      <svg class="w-5 h-5 text-white/70"><!-- Search --></svg>
      <input type="text" placeholder="ابحث..." class="flex-1 bg-transparent outline-none text-white">
      <button class="p-1 hover:bg-white/20 rounded-lg">
        <svg class="w-4 h-4"><!-- X --></svg>
      </button>
    </div>
  </div>
</form>`,
  react: `<SearchDesign10 state="idle" onSearch={(q) => console.log(q)} />`,
  notes: 'تصميم Glassmorphism مع خلفية ضبابية شفافة',
};
