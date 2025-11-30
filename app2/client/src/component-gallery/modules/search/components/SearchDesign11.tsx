import { useState } from 'react';
interface Props {
  state?: 'idle' | 'loading' | 'error' | 'focused';
  onSearch?: (query: string) => void;
}
import { cn } from '@/lib/utils';

export function SearchDesign11({
  state = 'idle',
  onSearch,
}: Props) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const dotCount = 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" role="search" aria-label="بحث نقاطي">
      <div className={cn(
        "relative space-y-4",
        state === 'loading' && "opacity-60 pointer-events-none",
        state === 'error' && "opacity-75"
      )}>
        {/* الحقل */}
        <div className={cn(
          "relative group",
          "transition-all duration-300"
        )}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="ابحث..."
            className={cn(
              "w-full px-4 py-3 rounded-lg border-2",
              "bg-white outline-none transition-all",
              "placeholder:text-muted-foreground",
              isFocused ? "border-primary bg-primary/5" : "border-border"
            )}
            aria-label="حقل البحث"
          />
        </div>

        {/* النقاط المؤشرة */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: dotCount }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-500",
                query.length > i
                  ? "bg-primary scale-150"
                  : "bg-muted scale-100"
              )}
              style={{
                animation: state === 'loading'
                  ? `pulse 1s ease-in-out infinite`
                  : 'none',
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </form>
  );
}

export const searchDesign11Code = {
  html: `<form class="w-full max-w-sm">
  <input type="text" placeholder="ابحث..." class="w-full px-4 py-3 rounded-lg border-2">
  <div class="flex items-center justify-center gap-2 mt-4">
    <div class="w-2 h-2 rounded-full bg-primary"></div>
    <div class="w-2 h-2 rounded-full bg-muted"></div>
    <div class="w-2 h-2 rounded-full bg-muted"></div>
  </div>
</form>`,
  react: `<SearchDesign11 state="idle" onSearch={(q) => console.log(q)} />`,
  notes: 'تصميم نقاطي بسيط وأنيق',
};
