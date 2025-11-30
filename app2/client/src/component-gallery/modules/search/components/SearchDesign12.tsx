import { useState } from 'react';
interface Props {
  state?: 'idle' | 'loading' | 'error' | 'focused';
  onSearch?: (query: string) => void;
}
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchDesign12({
  state = 'idle',
  onSearch,
}: Props) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg" role="search" aria-label="بحث متدرج متحرك">
      <div className={cn(
        "relative rounded-xl overflow-hidden transition-all duration-300",
        state === 'loading' && "opacity-70 pointer-events-none",
        state === 'error' && "bg-red-50"
      )}>
        <div className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500",
          isFocused && "opacity-100",
          "bg-gradient-to-r from-primary/10 via-transparent to-primary/5"
        )} />

        <div className="relative flex items-center gap-3 px-5 py-3.5 bg-white rounded-xl border border-border">
          <Search className={cn(
            "w-5 h-5 transition-all duration-300",
            isFocused ? "text-primary scale-110" : "text-muted-foreground scale-100"
          )} />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="ابحث هنا..."
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            aria-label="حقل البحث"
          />

          <button
            type="submit"
            className={cn(
              "px-4 py-1.5 rounded-lg font-medium transition-all duration-300",
              "bg-primary text-white",
              "hover:bg-primary/90 active:scale-95",
              !query && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
            disabled={!query}
            aria-label="بحث"
          >
            بحث
          </button>
        </div>
      </div>
    </form>
  );
}

export const searchDesign12Code = {
  html: `<form class="w-full max-w-lg">
  <div class="relative rounded-xl">
    <div class="flex items-center gap-3 px-5 py-3.5 bg-white rounded-xl border">
      <svg class="w-5 h-5 text-muted-foreground"><!-- Search --></svg>
      <input type="text" placeholder="ابحث هنا..." class="flex-1 bg-transparent outline-none">
      <button class="px-4 py-1.5 rounded-lg font-medium bg-primary text-white">بحث</button>
    </div>
  </div>
</form>`,
  react: `<SearchDesign12 state="idle" onSearch={(q) => console.log(q)} />`,
  notes: 'تصميم متدرج متحرك مع زر بحث فعال',
};
