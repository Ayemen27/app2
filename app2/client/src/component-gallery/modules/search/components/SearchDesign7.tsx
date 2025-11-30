import React, { useState } from 'react';
import { Search, X, Plus, Sparkles } from 'lucide-react';
import { SearchState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface SearchDesign7Props {
  state?: SearchState;
  onSearch?: (tags: string[]) => void;
}

export function SearchDesign7({
  state = 'idle',
  onSearch,
}: SearchDesign7Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [showInput, setShowInput] = useState(false);

  const suggestedTags = [
    { id: '1', label: 'عاجل', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { id: '2', label: 'مهم', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { id: '3', label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
    { id: '4', label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { id: '5', label: 'مكتمل', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { id: '6', label: 'ملغي', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
    { id: '7', label: 'مراجعة', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { id: '8', label: 'موافق عليه', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  ];

  const toggleTag = (label: string) => {
    setSelectedTags(prev => 
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
      setShowInput(false);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl shadow-lg border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">اختر التصنيفات للبحث</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4" role="listbox" aria-label="اختر التصنيفات" aria-multiselectable="true">
          {suggestedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              role="option"
              aria-selected={selectedTags.includes(tag.label)}
              onClick={() => toggleTag(tag.label)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                tag.color,
                selectedTags.includes(tag.label) && "ring-2 ring-offset-2 ring-primary"
              )}
            >
              {tag.label}
            </button>
          ))}
          
          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              className="px-3 py-1.5 rounded-full text-sm font-medium border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                placeholder="اسم التصنيف..."
                className="px-3 py-1.5 rounded-full text-sm border focus:ring-2 focus:ring-primary outline-none w-32"
                autoFocus
              />
              <button
                onClick={addCustomTag}
                className="p-1.5 rounded-full bg-primary text-primary-foreground"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowInput(false)}
                className="p-1.5 rounded-full bg-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {selectedTags.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">التصنيفات المُختارة ({selectedTags.length})</span>
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-primary hover:underline"
              >
                مسح الكل
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => onSearch?.(selectedTags)}
              className="w-full mt-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              بحث بالتصنيفات
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const searchDesign7Code = {
  html: `<div class="bg-white rounded-2xl shadow-lg border p-4">
  <div class="flex items-center gap-2 mb-4">
    <svg class="w-5 h-5 text-primary"><!-- Sparkles --></svg>
    <span class="text-sm font-medium">اختر التصنيفات للبحث</span>
  </div>
  <div class="flex flex-wrap gap-2">
    <button class="px-3 py-1.5 rounded-full text-sm bg-red-100 text-red-700">عاجل</button>
    <button class="px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-700 ring-2 ring-primary">قيد التنفيذ</button>
    <button class="px-3 py-1.5 rounded-full text-sm border-2 border-dashed flex items-center gap-1">
      <svg class="w-3.5 h-3.5"><!-- Plus --></svg>
      إضافة
    </button>
  </div>
  <div class="pt-4 border-t mt-4">
    <div class="flex flex-wrap gap-2">
      <div class="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
        <span>قيد التنفيذ</span>
        <button><svg class="w-3 h-3"><!-- X --></svg></button>
      </div>
    </div>
    <button class="w-full mt-4 py-2.5 bg-primary text-white rounded-xl font-medium">بحث بالتصنيفات</button>
  </div>
</div>`,
  tailwind: `// Tag-driven Search - Design #7
<div className="bg-white rounded-2xl shadow-lg border p-4">
  <div className="flex items-center gap-2 mb-4">
    <Sparkles className="w-5 h-5 text-primary" />
    <span className="text-sm font-medium">اختر التصنيفات للبحث</span>
  </div>
  <div className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <button
        key={tag.id}
        onClick={() => toggleTag(tag.label)}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium",
          tag.color,
          isSelected && "ring-2 ring-offset-2 ring-primary"
        )}
      >
        {tag.label}
      </button>
    ))}
    <button className="px-3 py-1.5 rounded-full text-sm border-2 border-dashed flex items-center gap-1">
      <Plus className="w-3.5 h-3.5" />
      إضافة
    </button>
  </div>
  {selectedTags.length > 0 && (
    <div className="pt-4 border-t mt-4">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full">
            {tag}
            <button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <button className="w-full mt-4 py-2.5 bg-primary text-white rounded-xl">بحث</button>
    </div>
  )}
</div>`,
  react: `import { Sparkles, Plus, X, Search } from 'lucide-react';

function TagDrivenSearch({ onSearch, suggestedTags }) {
  const [selectedTags, setSelectedTags] = useState([]);
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-4">
      <div className="flex flex-wrap gap-2">
        {suggestedTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag)}
            className={cn(tag.color, isSelected && "ring-2 ring-primary")}
          >
            {tag.label}
          </button>
        ))}
      </div>
      {selectedTags.length > 0 && (
        <button onClick={() => onSearch(selectedTags)}>بحث بالتصنيفات</button>
      )}
    </div>
  );
}`,
};
