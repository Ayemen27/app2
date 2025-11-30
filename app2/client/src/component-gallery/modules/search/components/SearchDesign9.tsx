import { useState } from 'react';
import { Search, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
interface SearchDesign9Props {
  state?: 'idle' | 'loading' | 'error' | 'focused';
  onSearch?: (query: string) => void;
}

export function SearchDesign9({
  state = 'idle',
  onSearch,
}: SearchDesign9Props) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg" role="search" aria-label="بحث نيومورفيك">
      <div className={cn(
        "relative rounded-3xl transition-all duration-300",
        "shadow-lg hover:shadow-xl",
        isFocused && "shadow-2xl",
        state === 'loading' && "opacity-70 pointer-events-none",
        state === 'error' && "shadow-red-500/20"
      )}>
        <div className={cn(
          "flex items-center gap-3 px-6 py-4 bg-white rounded-3xl",
          "border-2 border-transparent transition-colors",
          isFocused && "border-primary/20"
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
            placeholder="ابحث عن..."
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            aria-label="حقل البحث"
          />

          <button
            type="button"
            className={cn(
              "p-2.5 rounded-2xl transition-all",
              "hover:bg-muted",
              isFocused && "bg-primary/10"
            )}
            aria-label="تصفية النتائج"
          >
            <Sliders className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </form>
  );
}

export const searchDesign9Code = {
  html: `<form class="w-full max-w-lg">
  <div class="relative rounded-3xl shadow-lg">
    <div class="flex items-center gap-3 px-6 py-4 bg-white rounded-3xl">
      <svg class="w-5 h-5 text-muted-foreground"><!-- Search --></svg>
      <input type="text" placeholder="ابحث عن..." class="flex-1 bg-transparent outline-none">
      <button class="p-2.5 rounded-2xl hover:bg-muted">
        <svg class="w-5 h-5"><!-- Sliders --></svg>
      </button>
    </div>
  </div>
</form>`,
  react: `<SearchDesign9 state="idle" onSearch={(q) => console.log(q)} />`,
  notes: 'تصميم نيومورفيك مع ظلال ناعمة وزوايا مستديرة',
};
