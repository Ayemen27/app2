import React from 'react';
import { Eye, Copy, Check } from 'lucide-react';
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
        "bg-white border-2 border-gray-200 hover:border-primary/50",
        "overflow-hidden"
      )}
      onClick={handleInspect}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
      role="button"
      aria-label={`${isArabic ? 'عرض' : 'View'} ${isArabic ? component.nameAr : component.name}`}
    >
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="text-xs font-bold bg-slate-100 border-slate-300 text-slate-700"
            >
              #{String(index + 1).padStart(2, '0')}
            </Badge>
            <Badge 
              variant={isSearch ? 'default' : 'secondary'}
              className={cn(
                "text-xs font-bold px-2.5 py-1",
                isSearch && "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {isSearch ? 'SEARCH' : 'CARD'}
            </Badge>
          </div>
        </div>
        
        <h3 className="font-bold text-base line-clamp-1 text-gray-900 group-hover:text-primary transition-colors">
          {isArabic ? component.nameAr : component.name}
        </h3>
        <p className="text-xs text-gray-600 line-clamp-2 mt-1.5">
          {isArabic ? component.descriptionAr : component.description}
        </p>
      </CardHeader>

      <CardContent className="py-4 px-4">
        <div className={cn(
          "bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-200",
          "group-hover:border-primary/30 transition-all duration-300",
          "aspect-[3/2] flex items-center justify-center p-4"
        )}>
          <div className="scale-75 origin-center">
            {component.preview}
          </div>
        </div>

        {settings.showCode && (
          <div className="mt-3 bg-slate-900 rounded-lg p-2.5 max-h-20 overflow-hidden border border-slate-700">
            <pre className="text-[9px] text-slate-400 overflow-hidden font-mono" dir="ltr">
              <code className="break-words whitespace-pre-wrap">{component.code.tailwind.slice(0, 100)}...</code>
            </pre>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 px-4 pb-4 pt-0">
        <Button
          variant="default"
          size="sm"
          className={cn(
            "flex-1 gap-2 text-xs h-10 font-bold rounded-lg",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "hover:shadow-lg hover:scale-105 transition-all"
          )}
          onClick={handleInspect}
        >
          <Eye className="w-4 h-4" />
          <span>{isArabic ? 'معاينة' : 'Preview'}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 text-xs h-10 font-bold rounded-lg",
            "border-2 hover:bg-gray-100 transition-all"
          )}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600 font-bold">✓</span>
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
