import React from 'react';
import { Eye, Code, Copy, Check, ExternalLink } from 'lucide-react';
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

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-1",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        settings.viewMode === 'list' && "flex flex-row items-center"
      )}
      onClick={handleInspect}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
      role="button"
      aria-label={`${isArabic ? 'عرض' : 'View'} ${isArabic ? component.nameAr : component.name}`}
    >
      <CardHeader className={cn(
        "pb-2",
        settings.viewMode === 'list' && "flex-shrink-0 w-48"
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              #{String(index + 1).padStart(2, '0')}
            </Badge>
            <Badge 
              variant={component.category === 'search' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {component.category === 'search' 
                ? (isArabic ? 'بحث' : 'Search') 
                : (isArabic ? 'بطاقة' : 'Card')}
            </Badge>
          </div>
        </div>
        <h3 className="font-semibold text-sm mt-2 line-clamp-1">
          {isArabic ? component.nameAr : component.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {isArabic ? component.descriptionAr : component.description}
        </p>
      </CardHeader>

      <CardContent className={cn(
        "pt-0",
        settings.viewMode === 'list' ? "flex-1 py-3" : "pb-3"
      )}>
        <div className={cn(
          "bg-muted/40 rounded-lg overflow-hidden border-2 border-dashed border-transparent",
          "group-hover:border-primary/20 transition-colors",
          settings.viewMode === 'list' ? "h-16" : "aspect-[16/10]"
        )}>
          <div className="w-full h-full flex items-center justify-center p-3 scale-75 origin-center">
            {component.preview}
          </div>
        </div>
        
        {settings.showCode && settings.viewMode !== 'list' && (
          <div className="mt-2 bg-muted/30 rounded-lg p-2 max-h-24 overflow-hidden">
            <pre className="text-[10px] text-muted-foreground overflow-hidden" dir="ltr">
              <code>{component.code.tailwind.slice(0, 150)}...</code>
            </pre>
          </div>
        )}
      </CardContent>

      <CardFooter className={cn(
        "pt-0 gap-2",
        settings.viewMode === 'list' && "flex-shrink-0"
      )}>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs h-8"
          onClick={handleInspect}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isArabic ? 'معاينة' : 'Preview'}</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{copied ? (isArabic ? 'تم!' : 'Done!') : (isArabic ? 'نسخ' : 'Copy')}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
