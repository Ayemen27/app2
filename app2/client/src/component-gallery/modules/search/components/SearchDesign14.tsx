import { useState } from 'react';
interface Props {
  state?: 'idle' | 'loading' | 'error' | 'focused';
  onSearch?: (query: string) => void;
}
import { Command, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchDesign14({
  state = 'idle',
  onSearch,
}: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const suggestions = [
    'المشاريع الحالية',
    'تقارير يومية',
    'حضور العمال',
    'مصروفات المشروع',
    'الموردين',
  ];

  const filtered = suggestions.filter(s =>
    s.includes(query)
  );

  return (
    <div className="w-full max-w-md" role="search" aria-label="بحث command palette">
      <div className={cn(
        "relative rounded-lg border-2",
        "bg-white transition-all",
        isOpen ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}>
        {/* الإدخال */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Command className="w-5 h-5 text-muted-foreground" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="اكتب أمراً أو ابحث..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
            aria-label="حقل البحث"
            aria-autocomplete="list"
            aria-expanded={isOpen}
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Cmd</kbd>
            <span>K</span>
          </div>
        </div>

        {/* المقترحات */}
        {isOpen && (
          <>
            <div className="border-t" />
            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
              {filtered.length > 0 ? (
                filtered.map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion);
                      setIsOpen(false);
                      onSearch?.(suggestion);
                    }}
                    className={cn(
                      "w-full text-right px-3 py-2 rounded-lg text-sm",
                      "hover:bg-muted transition-colors",
                      "font-medium text-foreground"
                    )}
                    role="option"
                  >
                    {suggestion}
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  لا توجد نتائج
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const searchDesign14Code = {
  html: `<div class="w-full max-w-md relative">
  <div class="flex items-center gap-3 px-4 py-3 rounded-lg border-2 bg-white">
    <svg class="w-5 h-5 text-muted-foreground"><!-- Command --></svg>
    <input type="text" placeholder="اكتب أمراً..." class="flex-1 bg-transparent outline-none text-sm">
    <span class="text-xs text-muted-foreground">Cmd K</span>
  </div>
</div>`,
  react: `<SearchDesign14 state="idle" onSearch={(q) => console.log(q)} />`,
  notes: 'تصميم command palette حديث ومحترف',
};
