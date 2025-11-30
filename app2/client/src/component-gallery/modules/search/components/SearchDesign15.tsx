import { useState } from 'react';
interface Props {
  state?: 'idle' | 'loading' | 'error' | 'focused';
  onSearch?: (query: string) => void;
}
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchDesign15({
  state = 'idle',
  onSearch,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isFocused, setIsFocused] = useState(false);

  const types = [
    { id: 'all', label: 'الكل' },
    { id: 'projects', label: 'مشاريع' },
    { id: 'workers', label: 'عمال' },
    { id: 'expenses', label: 'مصروفات' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-3" role="search" aria-label="بحث مقسم">
      {/* الفلاتر العلوية */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2 flex-1 overflow-x-auto pb-1">
          {types.map(type => (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedType(type.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                selectedType === type.id
                  ? "bg-primary text-white font-medium"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
              aria-pressed={selectedType === type.id}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* البحث */}
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
          placeholder={`ابحث في ${types.find(t => t.id === selectedType)?.label}...`}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          aria-label="حقل البحث"
        />
      </div>

      {/* معاينة النتائج */}
      {query && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="text-xs text-muted-foreground mb-2">معاينة النتائج</div>
          <div className="space-y-2">
            {['نتيجة 1', 'نتيجة 2', 'نتيجة 3'].map((result, i) => (
              <div key={i} className="px-3 py-2 rounded bg-white/50 text-sm font-medium text-foreground">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export const searchDesign15Code = {
  html: `<form class="w-full max-w-2xl space-y-3">
  <div class="flex items-center gap-2">
    <div class="flex gap-2">
      <button class="px-3 py-1.5 rounded-full text-sm bg-primary text-white">الكل</button>
      <button class="px-3 py-1.5 rounded-full text-sm bg-muted">مشاريع</button>
    </div>
  </div>
  <div class="flex items-center gap-3 px-4 py-3 rounded-xl border-2">
    <svg class="w-5 h-5"><!-- Search --></svg>
    <input type="text" placeholder="ابحث..." class="flex-1 bg-transparent outline-none">
  </div>
</form>`,
  react: `<SearchDesign15 state="idle" onSearch={(q) => console.log(q)} />`,
  notes: 'تصميم مقسم مع فلاتر ومعاينة',
};
