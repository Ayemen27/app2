import React, { useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, X, Calendar, DollarSign } from 'lucide-react';
import { SearchState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface SearchDesign3Props {
  state?: SearchState;
  onSearch?: (query: string, filters: Record<string, unknown>) => void;
  placeholder?: string;
}

export function SearchDesign3({
  state = 'idle',
  onSearch,
  placeholder = 'بحث...',
}: SearchDesign3Props) {
  const [query, setQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });

  const statusOptions = ['الكل', 'نشط', 'متوقف', 'مكتمل', 'ملغي'];
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex gap-4 w-full max-w-4xl">
      <aside
        className={cn(
          "bg-white rounded-xl border shadow-sm transition-all duration-300 overflow-hidden",
          isFiltersOpen ? "w-64 p-4" : "w-12 p-2"
        )}
      >
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="flex items-center gap-2 w-full mb-4"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </div>
          {isFiltersOpen && (
            <>
              <span className="font-medium text-sm flex-1 text-right">الفلاتر</span>
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                !isFiltersOpen && "rotate-180"
              )} />
            </>
          )}
        </button>

        {isFiltersOpen && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">الحالة</label>
              <div className="flex flex-wrap gap-1.5">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilters(f => ({ ...f, status: f.status === status ? '' : status }))}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs transition-colors",
                      filters.status === status
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                <Calendar className="w-3.5 h-3.5 inline ml-1" />
                التاريخ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="px-2 py-1.5 text-xs border rounded-md bg-muted/50"
                  placeholder="من"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="px-2 py-1.5 text-xs border rounded-md bg-muted/50"
                  placeholder="إلى"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                <DollarSign className="w-3.5 h-3.5 inline ml-1" />
                المبلغ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(f => ({ ...f, minAmount: e.target.value }))}
                  className="px-2 py-1.5 text-xs border rounded-md bg-muted/50"
                  placeholder="الحد الأدنى"
                />
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(f => ({ ...f, maxAmount: e.target.value }))}
                  className="px-2 py-1.5 text-xs border rounded-md bg-muted/50"
                  placeholder="الحد الأقصى"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex gap-2">
              <button
                onClick={() => onSearch?.(query, filters)}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                تطبيق
              </button>
              <button
                onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '', minAmount: '', maxAmount: '' })}
                className="px-3 py-2 bg-muted text-muted-foreground rounded-lg text-xs hover:bg-muted/80"
              >
                مسح
              </button>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1">
        <div className="flex items-center gap-3 bg-white rounded-xl border shadow-sm p-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-muted rounded-md">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const searchDesign3Code = {
  html: `<div class="flex gap-4 w-full">
  <aside class="bg-white rounded-xl border shadow-sm w-64 p-4">
    <button class="flex items-center gap-2 w-full mb-4">
      <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <svg class="w-4 h-4 text-primary"><!-- Sliders icon --></svg>
      </div>
      <span class="font-medium text-sm flex-1">الفلاتر</span>
      <span class="bg-primary text-white text-xs px-2 py-0.5 rounded-full">3</span>
    </button>
    <!-- Filter sections -->
  </aside>
  <div class="flex-1">
    <div class="flex items-center gap-3 bg-white rounded-xl border p-3">
      <svg class="w-5 h-5"><!-- Search icon --></svg>
      <input type="search" placeholder="بحث..." class="flex-1 outline-none" />
    </div>
  </div>
</div>`,
  tailwind: `// Sidebar Filters - Design #3
<div className="flex gap-4 w-full">
  <aside className={cn(
    "bg-white rounded-xl border shadow-sm transition-all",
    isOpen ? "w-64 p-4" : "w-12 p-2"
  )}>
    <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 w-full">
      <SlidersHorizontal className="w-4 h-4 text-primary" />
      {isOpen && <span>الفلاتر</span>}
    </button>
    {isOpen && (
      <div className="space-y-4 mt-4">
        {/* Status Filter */}
        <div>
          <label className="text-xs font-medium">الحالة</label>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
              <button key={o} className={cn(
                "px-2.5 py-1 rounded-md text-xs",
                selected === o ? "bg-primary text-white" : "bg-muted"
              )}>{o}</button>
            ))}
          </div>
        </div>
        {/* Date & Amount Filters */}
      </div>
    )}
  </aside>
  <div className="flex-1">
    <div className="flex items-center gap-3 bg-white rounded-xl border p-3">
      <Search className="w-5 h-5" />
      <input type="search" className="flex-1 outline-none" />
    </div>
  </div>
</div>`,
  react: `import { Search, SlidersHorizontal } from 'lucide-react';

function SidebarFiltersSearch({ onSearch, filterConfig }) {
  const [isOpen, setIsOpen] = useState(true);
  const [filters, setFilters] = useState({});
  
  return (
    <div className="flex gap-4">
      <aside className={cn("bg-white rounded-xl border", isOpen ? "w-64" : "w-12")}>
        {/* Collapsible filter sidebar */}
      </aside>
      <div className="flex-1">
        <input type="search" />
      </div>
    </div>
  );
}`,
};
