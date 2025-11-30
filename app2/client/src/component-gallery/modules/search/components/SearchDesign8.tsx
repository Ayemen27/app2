import React, { useState, useEffect } from 'react';
import { Search, Mic, MicOff, X, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { SearchState } from '../../../shared/types';
import { cn } from '../../../shared/utils';

interface SearchDesign8Props {
  state?: SearchState;
  onSearch?: (query: string) => void;
}

export function SearchDesign8({
  state = 'idle',
  onSearch,
}: SearchDesign8Props) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(['مشروع البناء', 'عمال النجارة', 'مصروفات الشهر']);
  const [trendingSearches] = useState(['تقارير يومية', 'حضور العمال', 'فواتير الموردين']);
  const isLoading = state === 'loading';
  const isError = state === 'error';

  const handleVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setQuery('نتيجة البحث الصوتي');
      }, 2000);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      setRecentSearches(prev => [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5));
      onSearch?.(searchQuery);
      setIsFocused(false);
    }
  };

  const removeRecentSearch = (search: string) => {
    setRecentSearches(prev => prev.filter(s => s !== search));
  };

  return (
    <div className="w-full max-w-xl relative" role="search" aria-label="بحث صوتي">
      <div
        className={cn(
          "flex items-center gap-3 bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 px-4 py-3",
          isFocused && "border-primary shadow-lg shadow-primary/10",
          isListening && "border-red-500 bg-red-50",
          isLoading && "opacity-70 pointer-events-none",
          isError && "border-red-500"
        )}
      >
        <Search className={cn(
          "w-5 h-5 transition-colors",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} />
        
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
          placeholder={isListening ? "جاري الاستماع..." : "ابحث أو استخدم الصوت..."}
          className="flex-1 bg-transparent outline-none text-sm"
          disabled={isListening}
        />

        {query && !isListening && (
          <button
            onClick={() => setQuery('')}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        <button
          onClick={handleVoiceSearch}
          disabled={isListening}
          className={cn(
            "p-2.5 rounded-xl transition-all",
            isListening 
              ? "bg-red-500 text-white animate-pulse" 
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>

      {isFocused && !isListening && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border shadow-xl z-50 overflow-hidden">
          {recentSearches.length > 0 && (
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  عمليات البحث الأخيرة
                </div>
                <button
                  onClick={() => setRecentSearches([])}
                  className="text-xs text-primary hover:underline"
                >
                  مسح الكل
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between group px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <button
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                      className="flex-1 text-sm text-right"
                    >
                      {search}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(search);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10 rounded"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              الأكثر بحثاً
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(search);
                    handleSearch(search);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  {search}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isListening && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border shadow-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
            <Mic className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm font-medium">جاري الاستماع...</p>
          <p className="text-xs text-muted-foreground mt-1">تحدث الآن</p>
          <button
            onClick={() => setIsListening(false)}
            className="mt-4 px-4 py-2 bg-muted rounded-lg text-sm"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
}

export const searchDesign8Code = {
  html: `<div class="w-full max-w-xl relative">
  <div class="flex items-center gap-3 bg-white rounded-2xl border-2 shadow-sm px-4 py-3 focus-within:border-primary">
    <svg class="w-5 h-5"><!-- Search --></svg>
    <input type="search" placeholder="ابحث أو استخدم الصوت..." class="flex-1 outline-none text-sm" />
    <button class="p-2.5 rounded-xl bg-primary/10 text-primary">
      <svg class="w-5 h-5"><!-- Mic --></svg>
    </button>
  </div>
  <!-- Dropdown with recent & trending -->
  <div class="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border shadow-xl">
    <div class="p-3 border-b">
      <div class="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <svg class="w-3.5 h-3.5"><!-- Clock --></svg>
        عمليات البحث الأخيرة
      </div>
      <!-- Recent search items -->
    </div>
    <div class="p-3">
      <div class="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <svg class="w-3.5 h-3.5"><!-- TrendingUp --></svg>
        الأكثر بحثاً
      </div>
      <!-- Trending tags -->
    </div>
  </div>
</div>`,
  tailwind: `// Voice Search + Recent - Design #8
<div className="w-full max-w-xl relative">
  <div className={cn(
    "flex items-center gap-3 bg-white rounded-2xl border-2 px-4 py-3",
    isFocused && "border-primary shadow-lg",
    isListening && "border-red-500 bg-red-50"
  )}>
    <Search className="w-5 h-5" />
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onFocus={() => setIsFocused(true)}
      placeholder={isListening ? "جاري الاستماع..." : "ابحث..."}
      className="flex-1 outline-none text-sm"
    />
    <button
      onClick={handleVoiceSearch}
      className={cn(
        "p-2.5 rounded-xl",
        isListening ? "bg-red-500 text-white animate-pulse" : "bg-primary/10 text-primary"
      )}
    >
      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  </div>

  {isFocused && (
    <div className="absolute top-full mt-2 bg-white rounded-2xl border shadow-xl z-50">
      {/* Recent searches */}
      {/* Trending searches */}
    </div>
  )}
</div>`,
  react: `import { Search, Mic, MicOff, Clock, TrendingUp, Sparkles } from 'lucide-react';

function VoiceSearchWithRecent({ onSearch }) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.onresult = (event) => {
        setQuery(event.results[0][0].transcript);
      };
      recognition.start();
      setIsListening(true);
    }
  };
  
  return (
    <div className="relative">
      <div className="flex items-center gap-3 bg-white rounded-2xl border-2 px-4 py-3">
        <Search className="w-5 h-5" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
        <button onClick={handleVoiceSearch}>
          {isListening ? <MicOff /> : <Mic />}
        </button>
      </div>
      {/* Recent + Trending dropdown */}
    </div>
  );
}`,
};
