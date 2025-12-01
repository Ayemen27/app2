import React, { memo, useCallback } from 'react';
import { Home, Copy, Check, Eye, Code, Settings2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { GalleryComponent, GallerySettings, ComponentState } from '../shared/types';
import { useCopyCode } from '../hooks/useCopyCode';
import { cn } from '../shared/utils';

interface ComponentDetailPageProps {
  component: GalleryComponent;
  settings: GallerySettings;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const ComponentDetailPage = memo(function ComponentDetailPage({
  component,
  settings,
  onNavigate,
  hasNext = false,
  hasPrev = false,
}: ComponentDetailPageProps) {
  const [, setLocation] = useLocation();
  const { copied, copy } = useCopyCode();
  const isArabic = settings.language === 'ar';
  const [activeTab, setActiveTab] = React.useState<'preview' | 'html' | 'tailwind'>('preview');
  const [currentState, setCurrentState] = React.useState<ComponentState>('default');

  const states: ComponentState[] = ['default', 'hover', 'focused', 'active', 'disabled', 'loading'];

  const handleCopyCode = useCallback((code: string) => {
    copy(code);
  }, [copy]);

  const handleGoBack = () => {
    setLocation('/component-gallery');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40 flex flex-col">
      {/* ====== UNIFIED HEADER BAR ====== */}
      <header className="sticky top-0 z-40 border-b-2 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent flex flex-col">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-4 gap-3">
          {/* Left: Title + Badge */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {isArabic ? component.nameAr : component.name}
            </h1>
            <Badge 
              variant={component.category === 'search' ? 'default' : 'secondary'} 
              className="text-sm font-bold px-3 py-1.5 flex-shrink-0"
            >
              {component.category === 'search' ? '🔍 Search' : '📋 Card'}
            </Badge>
          </div>

          {/* Right: Action Buttons (All in one row) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Back to Gallery - Big Button */}
            <Button
              onClick={handleGoBack}
              className={cn(
                "h-10 px-4 text-sm font-bold gap-2 rounded-lg",
                "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
                "text-white shadow-md hover:shadow-lg transition-all"
              )}
              title={isArabic ? 'العودة للمعرض' : 'Back to Gallery'}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'عودة' : 'Back'}</span>
            </Button>

            {/* Navigation Arrows */}
            {hasPrev && (
              <Button
                onClick={() => onNavigate?.('prev')}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 border-2 hover:bg-blue-50 hover:border-blue-500 font-bold"
                title={isArabic ? 'السابق' : 'Previous'}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}

            {hasNext && (
              <Button
                onClick={() => onNavigate?.('next')}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 border-2 hover:bg-blue-50 hover:border-blue-500 font-bold"
                title={isArabic ? 'التالي' : 'Next'}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}

            {/* Close Button */}
            <Button
              onClick={handleGoBack}
              variant="destructive"
              size="sm"
              className="h-10 w-10 p-0 border-2 font-bold hover:bg-red-600"
              title={isArabic ? 'إغلاق' : 'Close'}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Description Row */}
        <div className="px-4 pb-3 text-sm text-muted-foreground border-t border-primary/20">
          {isArabic ? component.descriptionAr : component.description}
        </div>

        {/* State Selector Row */}
        <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-primary/20">
          {states.map((s) => (
            <Badge
              key={s}
              variant={currentState === s ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer text-xs font-bold px-3 py-1.5 transition-all hover:border-primary',
                currentState === s && 'bg-primary/90 text-white border-primary'
              )}
              onClick={() => setCurrentState(s)}
            >
              {s === 'default' ? '○ Default' : s === 'hover' ? '✋ Hover' : s === 'focused' ? '👁 Focused' : s === 'active' ? '⚡ Active' : s === 'disabled' ? '⊘ Disabled' : '⟳ Loading'}
            </Badge>
          ))}
        </div>

        {/* Tabs - All in one row at bottom of header */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="m-0 w-full grid grid-cols-3 gap-0 h-12 bg-transparent rounded-none border-t border-primary/20 p-0">
            <TabsTrigger 
              value="preview" 
              className="rounded-none border-b-2 text-sm font-bold gap-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10"
            >
              <Eye className="w-4 h-4" />
              <span>{isArabic ? 'معاينة' : 'Preview'}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="html" 
              className="rounded-none border-b-2 text-sm font-bold gap-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10"
            >
              <Code className="w-4 h-4" />
              <span>HTML</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tailwind" 
              className="rounded-none border-b-2 text-sm font-bold gap-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10"
            >
              <Settings2 className="w-4 h-4" />
              <span>CSS</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* ====== MAIN CONTENT AREA ====== */}
      <main className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full w-full">
          {/* Preview Tab */}
          <TabsContent value="preview" className="h-full m-0 p-6 overflow-auto">
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="bg-white border-2 border-primary/30 rounded-lg p-8 shadow-lg max-w-4xl w-full">
                {component.preview}
              </div>
            </div>
          </TabsContent>

          {/* HTML Tab */}
          <TabsContent value="html" className="h-full m-0 flex flex-col overflow-hidden p-6">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleCopyCode(component.code.html)}
              className="gap-2 font-bold h-10 mb-4 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              {copied ? (
                <><Check className="w-4 h-4" /> {isArabic ? 'تم النسخ' : 'Copied'}</>
              ) : (
                <><Copy className="w-4 h-4" /> {isArabic ? 'نسخ الكود' : 'Copy Code'}</>
              )}
            </Button>
            <ScrollArea className="flex-1 border-2 border-slate-700 rounded-lg overflow-hidden">
              <pre className="bg-slate-900 p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap break-words">
                {component.code.html}
              </pre>
            </ScrollArea>
          </TabsContent>

          {/* CSS Tab */}
          <TabsContent value="tailwind" className="h-full m-0 flex flex-col overflow-hidden p-6">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleCopyCode(component.code.tailwind)}
              className="gap-2 font-bold h-10 mb-4 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              {copied ? (
                <><Check className="w-4 h-4" /> {isArabic ? 'تم النسخ' : 'Copied'}</>
              ) : (
                <><Copy className="w-4 h-4" /> {isArabic ? 'نسخ الكود' : 'Copy Code'}</>
              )}
            </Button>
            <ScrollArea className="flex-1 border-2 border-slate-700 rounded-lg overflow-hidden">
              <pre className="bg-slate-900 p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap break-words">
                {component.code.tailwind}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
});

ComponentDetailPage.displayName = 'ComponentDetailPage';
