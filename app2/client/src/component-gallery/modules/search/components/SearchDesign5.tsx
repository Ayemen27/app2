import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Calendar } from 'lucide-react';
import { SearchState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface SearchDesign5Props {
  state?: SearchState;
  onSearch?: (fields: Record<string, string>) => void;
}

export function SearchDesign5({
  state = 'idle',
  onSearch,
}: SearchDesign5Props) {
  const [fields, setFields] = useState({
    name: '',
    location: '',
    priceMin: '',
    priceMax: '',
  });
  const isLoading = state === 'loading';
  const isError = state === 'error';
  const isFocused = state === 'focused';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(fields);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl" role="search" aria-label="بحث متعدد الحقول">
      <div className={cn(
        "bg-white rounded-2xl shadow-lg border p-2 transition-all duration-200",
        isLoading && "opacity-70 pointer-events-none",
        isError && "border-red-500",
        isFocused && "ring-2 ring-primary ring-offset-2"
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={fields.name}
              onChange={(e) => setFields(f => ({ ...f, name: e.target.value }))}
              placeholder="الاسم أو الوصف"
              className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm outline-none focus:bg-muted transition-colors"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={fields.location}
              onChange={(e) => setFields(f => ({ ...f, location: e.target.value }))}
              placeholder="الموقع"
              className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm outline-none focus:bg-muted transition-colors"
            />
          </div>

          <div className="relative flex items-center gap-2 bg-muted/50 rounded-xl px-3">
            <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="number"
              value={fields.priceMin}
              onChange={(e) => setFields(f => ({ ...f, priceMin: e.target.value }))}
              placeholder="من"
              className="w-full py-3 bg-transparent text-sm outline-none"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              value={fields.priceMax}
              onChange={(e) => setFields(f => ({ ...f, priceMax: e.target.value }))}
              placeholder="إلى"
              className="w-full py-3 bg-transparent text-sm outline-none"
            />
          </div>

          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-xl py-3 px-6 font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>بحث</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 px-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button type="button" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>إضافة تاريخ</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setFields({ name: '', location: '', priceMin: '', priceMax: '' })}
          className="text-xs text-primary hover:underline"
        >
          مسح الكل
        </button>
      </div>
    </form>
  );
}

export const searchDesign5Code = {
  html: `<form class="w-full max-w-4xl">
  <div class="bg-white rounded-2xl shadow-lg border p-2">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <div class="relative">
        <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"><!-- Search --></svg>
        <input type="text" placeholder="الاسم" class="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm outline-none" />
      </div>
      <div class="relative">
        <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"><!-- MapPin --></svg>
        <input type="text" placeholder="الموقع" class="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm outline-none" />
      </div>
      <div class="flex items-center gap-2 bg-muted/50 rounded-xl px-3">
        <svg class="w-4 h-4"><!-- DollarSign --></svg>
        <input type="number" placeholder="من" class="w-full py-3 bg-transparent text-sm outline-none" />
        <span>-</span>
        <input type="number" placeholder="إلى" class="w-full py-3 bg-transparent text-sm outline-none" />
      </div>
      <button type="submit" class="bg-primary text-white rounded-xl py-3 px-6 font-medium text-sm">بحث</button>
    </div>
  </div>
</form>`,
  tailwind: `// Multi-field Search - Design #5
<form className="w-full max-w-4xl">
  <div className="bg-white rounded-2xl shadow-lg border p-2">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input placeholder="الاسم" className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm" />
      </div>
      <div className="relative">
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input placeholder="الموقع" className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm" />
      </div>
      <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3">
        <DollarSign className="w-4 h-4" />
        <input type="number" placeholder="من" className="flex-1 py-3 bg-transparent text-sm" />
        <span>-</span>
        <input type="number" placeholder="إلى" className="flex-1 py-3 bg-transparent text-sm" />
      </div>
      <button className="bg-primary text-white rounded-xl py-3 font-medium">بحث</button>
    </div>
  </div>
</form>`,
  react: `import { Search, MapPin, DollarSign } from 'lucide-react';

function MultiFieldSearch({ onSearch, fields: fieldConfig }) {
  const [fields, setFields] = useState({});
  
  return (
    <form onSubmit={() => onSearch(fields)}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 bg-white rounded-2xl shadow-lg p-2">
        {fieldConfig.map((field) => (
          <div key={field.name} className="relative">
            <field.icon className="absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={fields[field.name]}
              onChange={(e) => setFields(f => ({ ...f, [field.name]: e.target.value }))}
            />
          </div>
        ))}
        <button type="submit">بحث</button>
      </div>
    </form>
  );
}`,
};
