import React from 'react';
import { Eye, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { GalleryComponent, GallerySettings } from '../shared/types';
import { useCopyCode } from '../hooks/useCopyCode';
import { cn } from '../shared/utils';

interface ComponentCardProps {
  component: GalleryComponent;
  settings: GallerySettings;
  onInspect: (component: GalleryComponent) => void;
  index: number;
}

export function ComponentCard({
  component,
  settings,
  onInspect,
  index,
}: ComponentCardProps) {
  const { copied, copy } = useCopyCode();
  const isArabic = settings.language === 'ar';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copy(component.code.tailwind);
  };

  const handleInspect = () => {
    onInspect(component);
  };

  const isSearch = component.category === 'search';

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300",
        "hover:shadow-2xl hover:-translate-y-2",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        "bg-gradient-to-br from-white to-muted/5",
        "border-2 hover:border-primary/30",
        settings.viewMode === 'list' && "flex flex-row items-center"
      )}
      onClick={handleInspect}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
      role="button"
      aria-label={`${isArabic ? 'عرض' : 'View'} ${isArabic ? component.nameAr : component.name}`}
    >
      <CardHeader className={cn(
        "pb-3",
        settings.viewMode === 'list' && "flex-shrink-0 w-48"
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="text-xs font-mono bg-primary/10 text-primary border-primary/30"
            >
              #{String(index + 1).padStart(2, '0')}
            </Badge>
            <Badge 
              variant={isSearch ? 'default' : 'secondary'}
              className={cn(
                "text-xs font-semibold",
                isSearch && "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isSearch 
                ? (isArabic ? '🔍 بحث' : '🔍 Search') 
                : (isArabic ? '📋 بطاقة' : '📋 Card')}
            </Badge>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <h3 className="font-bold text-sm mt-2 line-clamp-1 group-hover:text-primary transition-colors">
          {isArabic ? component.nameAr : component.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {isArabic ? component.descriptionAr : component.description}
        </p>
      </CardHeader>

      <CardContent className={cn(
        "pt-0",
        settings.viewMode === 'list' ? "flex-1 py-3" : "pb-4"
      )}>
        <div className={cn(
          "bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl overflow-hidden border-2",
          "border-dashed border-muted-foreground/30 group-hover:border-primary/40",
          "transition-all duration-300",
          settings.viewMode === 'list' ? "h-20" : "aspect-[3/2]"
        )}>
          <div className={cn(
            "w-full h-full flex items-center justify-center p-4",
            "bg-gradient-to-br from-white/40 to-transparent",
            settings.viewMode === 'list' ? "scale-60 origin-center" : "scale-75 origin-center"
          )}>
            {component.preview}
          </div>
        </div>

        {settings.showCode && settings.viewMode !== 'list' && (
          <div className="mt-3 bg-slate-900 rounded-lg p-2.5 max-h-20 overflow-hidden border border-slate-700">
            <pre className="text-[10px] text-slate-300 overflow-hidden font-mono" dir="ltr">
              <code>{component.code.tailwind.slice(0, 120)}...</code>
            </pre>
          </div>
        )}
      </CardContent>

      <CardFooter className={cn(
        "pt-0 gap-2",
        settings.viewMode === 'list' && "flex-shrink-0"
      )}>
        <Button
          variant="default"
          size="sm"
          className={cn(
            "flex-1 gap-1.5 text-xs h-9 font-semibold",
            "bg-gradient-to-r from-primary to-primary/90",
            "hover:shadow-lg hover:scale-105 transition-all",
            isSearch && "from-blue-600 to-blue-700"
          )}
          onClick={handleInspect}
        >
          <Eye className="w-4 h-4" />
          <span>{isArabic ? 'معاينة' : 'Preview'}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-9 font-semibold hover:bg-muted/80"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="hidden sm:inline text-green-600">{isArabic ? '✓' : '✓'}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'نسخ' : 'Copy'}</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
