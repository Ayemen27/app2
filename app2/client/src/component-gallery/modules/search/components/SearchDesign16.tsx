import { useState } from 'react';
interface Props {
  state?: 'idle' | 'loading' | 'error' | 'focused';
  onSearch?: (query: string) => void;
}
import { Calendar, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchDesign16({
  state = 'idle',
  onSearch,
}: Props) {
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [isFocused, setIsFocused] = useState(false);

  const dateRanges = [
    { id: 'today', label: 'اليوم' },
    { id: 'week', label: 'هذا الأسبوع' },
    { id: 'month', label: 'هذا الشهر' },
    { id: 'year', label: 'هذا العام' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4" role="search" aria-label="بحث بالتاريخ">
      {/* الخط الزمني (Timeline) */}
      <div className="flex items-center justify-between mb-6">
        {dateRanges.map((range, i) => (
          <div key={range.id} className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setDateRange(range.id)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all",
                dateRange === range.id
                  ? "bg-primary text-white ring-4 ring-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {String(i + 1)}
            </button>
            <span className="text-[10px] text-muted-foreground mt-2 whitespace-nowrap">{range.label}</span>
            
            {i < dateRanges.length - 1 && (
              <div className="absolute left-1/2 translate-x-0 w-12 h-1 bg-border -z-10 top-5" />
            )}
          </div>
        ))}
      </div>

      {/* شريط البحث */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border-2",
        "bg-white transition-all",
        isFocused ? "border-primary shadow-lg" : "border-border"
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
          placeholder="ابحث ضمن هذه الفترة..."
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          aria-label="حقل البحث"
        />

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* خط الحالة */}
      <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
        <div className="text-xs text-primary font-medium">
          البحث في {dateRanges.find(r => r.id === dateRange)?.label?.toLowerCase()}
        </div>
      </div>
    </form>
  );
}

export const searchDesign16Code = {
  html: `<form class="w-full max-w-2xl space-y-4">
  <div class="flex items-center justify-between">
    <button class="w-10 h-10 rounded-full bg-primary text-white font-medium">1</button>
    <button class="w-10 h-10 rounded-full bg-muted">2</button>
    <button class="w-10 h-10 rounded-full bg-muted">3</button>
  </div>
  <div class="flex items-center gap-3 px-4 py-3 rounded-xl border-2">
    <svg class="w-5 h-5"><!-- Search --></svg>
    <input type="text" placeholder="ابحث..." class="flex-1 bg-transparent outline-none">
  </div>
</form>`,
  react: `<SearchDesign16 state="idle" onSearch={(q) => console.log(q)} />`,
  notes: 'تصميم بحث بخط زمني مع نطاقات تاريخية',
};
