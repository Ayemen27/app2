import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, Calendar, Tag, Percent, Users } from 'lucide-react';
import { SearchState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface SearchDesign6Props {
  state?: SearchState;
  onSearch?: (query: string, filters: Record<string, unknown>) => void;
}

export function SearchDesign6({
  state = 'idle',
  onSearch,
}: SearchDesign6Props) {
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: { from: '', to: '' },
    tags: [] as string[],
    discount: 0,
    assignees: [] as string[],
  });

  const availableTags = ['عاجل', 'مهم', 'معلق', 'مكتمل', 'جديد'];
  const availableAssignees = ['أحمد', 'محمد', 'فاطمة', 'علي', 'سارة'];

  const toggleTag = (tag: string) => {
    setFilters(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }));
  };

  const toggleAssignee = (assignee: string) => {
    setFilters(f => ({
      ...f,
      assignees: f.assignees.includes(assignee) ? f.assignees.filter(a => a !== assignee) : [...f.assignees, assignee]
    }));
  };

  const activeFiltersCount = filters.tags.length + filters.assignees.length + (filters.dateRange.from ? 1 : 0) + (filters.discount > 0 ? 1 : 0);

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center gap-2 bg-white rounded-xl border shadow-sm px-4 py-3">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث..."
          className="flex-1 bg-transparent outline-none text-sm"
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            activeFiltersCount > 0 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>متقدم</span>
          {activeFiltersCount > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{activeFiltersCount}</span>
          )}
        </button>
      </div>

      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} aria-hidden="true" />
          <div 
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advanced-search-title"
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 id="advanced-search-title" className="font-semibold text-lg">بحث متقدم</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  نطاق التاريخ
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={filters.dateRange.from}
                    onChange={(e) => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, from: e.target.value } }))}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.to}
                    onChange={(e) => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, to: e.target.value } }))}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Tag className="w-4 h-4 text-primary" />
                  التصنيفات
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-colors",
                        filters.tags.includes(tag)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Percent className="w-4 h-4 text-primary" />
                  الحد الأدنى للخصم: {filters.discount}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.discount}
                  onChange={(e) => setFilters(f => ({ ...f, discount: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Users className="w-4 h-4 text-primary" />
                  المسؤولين
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableAssignees.map((assignee) => (
                    <button
                      key={assignee}
                      onClick={() => toggleAssignee(assignee)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                        filters.assignees.includes(assignee)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-xs">
                        {assignee[0]}
                      </div>
                      {assignee}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setFilters({ dateRange: { from: '', to: '' }, tags: [], discount: 0, assignees: [] });
                }}
                className="flex-1 py-2.5 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80"
              >
                إعادة ضبط
              </button>
              <button
                onClick={() => {
                  onSearch?.(query, filters);
                  setIsModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
              >
                تطبيق الفلاتر
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const searchDesign6Code = {
  html: `<div class="w-full max-w-xl">
  <div class="flex items-center gap-2 bg-white rounded-xl border px-4 py-3">
    <input type="search" placeholder="بحث..." class="flex-1 outline-none text-sm" />
    <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-primary text-white">
      <svg class="w-4 h-4"><!-- Sliders --></svg>
      <span>متقدم</span>
      <span class="bg-white/20 px-1.5 rounded text-xs">3</span>
    </button>
  </div>
  <!-- Modal -->
  <div class="fixed inset-0 bg-black/50 z-40"></div>
  <div class="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl z-50">
    <!-- Modal content with date range, tags, slider, assignees -->
  </div>
</div>`,
  tailwind: `// Advanced Modal Search - Design #6
<div className="w-full max-w-xl">
  <div className="flex items-center gap-2 bg-white rounded-xl border px-4 py-3">
    <Search className="w-5 h-5 text-muted-foreground" />
    <input type="search" placeholder="بحث..." className="flex-1 outline-none text-sm" />
    <button
      onClick={() => setIsModalOpen(true)}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
        activeFiltersCount > 0 ? "bg-primary text-white" : "bg-muted"
      )}
    >
      <SlidersHorizontal className="w-4 h-4" />
      <span>متقدم</span>
    </button>
  </div>

  {isModalOpen && (
    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl z-50">
      {/* Date range, tags, slider, assignees sections */}
    </div>
  )}
</div>`,
  react: `import { Search, SlidersHorizontal, X, Calendar, Tag, Percent, Users } from 'lucide-react';

function AdvancedModalSearch({ onSearch, filterConfig }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  
  return (
    <>
      <div className="flex items-center gap-2 bg-white rounded-xl border px-4 py-3">
        <input type="search" />
        <button onClick={() => setIsModalOpen(true)}>متقدم</button>
      </div>
      {isModalOpen && <AdvancedFiltersModal onApply={setFilters} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}`,
};
