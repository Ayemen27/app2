import React, { memo, useEffect, useCallback } from 'react';
import { X, Copy, Check, Eye, Code, Settings2, ChevronLeft, ChevronRight, Home, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InspectorState, ComponentState, GallerySettings } from '../shared/types';
import { useCopyCode } from '../hooks/useCopyCode';
import { cn } from '../shared/utils';

interface SmartInspectorPanelProps {
  state: InspectorState;
  settings: GallerySettings;
  onClose: () => void;
  onTabChange: (tab: InspectorState['activeTab']) => void;
  onStateChange: (state: ComponentState) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const SmartInspectorPanel = memo(function SmartInspectorPanel({
  state,
  settings,
  onClose,
  onTabChange,
  onStateChange,
  onNavigate,
  hasNext = false,
  hasPrev = false,
}: SmartInspectorPanelProps) {
  const { copied, copy } = useCopyCode();
  const isArabic = settings.language === 'ar';

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (state.isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [state.isOpen, onClose]);

  const handleCopyCode = useCallback((code: string) => {
    copy(code);
  }, [copy]);

  if (!state.isOpen || !state.selectedComponent) return null;

  const component = state.selectedComponent;
  const states: ComponentState[] = ['default', 'hover', 'focused', 'active', 'disabled', 'loading'];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        role="presentation"
      />

      <aside
        className={cn(
          "fixed z-50 bg-background h-full",
          "right-0 top-0",
          "w-full md:w-[480px] lg:w-[600px]",
          "transform transition-transform duration-300 ease-out flex flex-col",
          "border-l-2 border-primary shadow-2xl overflow-hidden",
          state.isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
      >
        {/* ====== SINGLE UNIFIED HEADER BAR ====== */}
        <header className="flex flex-col border-b bg-gradient-to-r from-primary/15 via-primary/10 to-transparent sticky top-0 z-10">
          {/* Top Control Bar */}
          <div className="flex items-center justify-between p-3 gap-2">
            {/* Left: Title + Badge */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 id="inspector-title" className="font-bold text-sm truncate">
                {isArabic ? component.nameAr : component.name}
              </h2>
              <Badge variant={component.category === 'search' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                {component.category === 'search' ? '🔍' : '📋'}
              </Badge>
            </div>

            {/* Right: Action Buttons (All in one row) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Back to Gallery - Big Button */}
              <Button
                onClick={onClose}
                className={cn(
                  "h-9 px-3 text-xs font-bold gap-1.5 rounded-lg",
                  "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
                  "text-white shadow-md hover:shadow-lg transition-all"
                )}
                title={isArabic ? 'العودة للمعرض (Esc)' : 'Back to Gallery (Esc)'}
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
                  className="h-9 w-9 p-0 border-2 hover:bg-blue-50 hover:border-blue-500 font-bold"
                  title={isArabic ? 'السابق' : 'Previous'}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}

              {hasNext && (
                <Button
                  onClick={() => onNavigate?.('next')}
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 border-2 hover:bg-blue-50 hover:border-blue-500 font-bold"
                  title={isArabic ? 'التالي' : 'Next'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}

              {/* Close Button */}
              <Button
                onClick={onClose}
                variant="destructive"
                size="sm"
                className="h-9 w-9 p-0 border-2 text-xs font-bold hover:bg-red-600"
                title={isArabic ? 'إغلاق (Esc)' : 'Close (Esc)'}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Description Row */}
          <div className="px-3 pb-2 text-xs text-muted-foreground line-clamp-1 border-t border-primary/20">
            {isArabic ? component.descriptionAr : component.description}
          </div>

          {/* State Selector Row */}
          <div className="px-3 pb-2 flex flex-wrap gap-1 border-t border-primary/20">
            {states.map((s) => (
              <Badge
                key={s}
                variant={state.currentState === s ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer text-[10px] font-bold px-2 py-0.5 transition-all hover:border-primary',
                  state.currentState === s && 'bg-primary/90 text-white border-primary'
                )}
                onClick={() => onStateChange(s)}
              >
                {s === 'default' ? '○' : s === 'hover' ? '✋' : s === 'focused' ? '👁' : s === 'active' ? '⚡' : s === 'disabled' ? '⊘' : '⟳'}
              </Badge>
            ))}
          </div>

          {/* Tabs - All in one row at bottom of header */}
          <Tabs
            value={state.activeTab}
            onValueChange={(v) => onTabChange(v as InspectorState['activeTab'])}
            className="w-full border-t border-primary/20"
          >
            <TabsList className="m-0 w-full grid grid-cols-3 gap-0 h-10 bg-transparent rounded-none border-0 p-0">
              <TabsTrigger 
                value="preview" 
                className="rounded-none border-b-2 text-xs font-bold gap-1 data-[state=active]:border-primary data-[state=active]:bg-primary/10"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isArabic ? 'معاينة' : 'Preview'}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="html" 
                className="rounded-none border-b-2 text-xs font-bold gap-1 data-[state=active]:border-primary data-[state=active]:bg-primary/10"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">HTML</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tailwind" 
                className="rounded-none border-b-2 text-xs font-bold gap-1 data-[state=active]:border-primary data-[state=active]:bg-primary/10"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSS</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {/* ====== CONTENT AREA ====== */}
        <Tabs
          value={state.activeTab}
          onValueChange={(v) => onTabChange(v as InspectorState['activeTab'])}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="preview" className="h-full m-0 p-4 overflow-auto">
              <div className="bg-gradient-to-br from-white via-muted/20 to-muted/30 rounded-lg p-6 min-h-[500px] flex items-center justify-center border-2 border-dashed border-primary/30 shadow-sm">
                <div className="max-w-full">
                  {component.preview}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="html" className="h-full m-0 flex flex-col overflow-hidden p-4">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleCopyCode(component.code.html)}
                className="gap-1.5 text-xs font-bold h-9 mb-3 bg-blue-600 hover:bg-blue-700 w-full"
              >
                {copied ? (
                  <><Check className="w-4 h-4" /> {isArabic ? 'تم النسخ' : 'Copied'}</>
                ) : (
                  <><Copy className="w-4 h-4" /> {isArabic ? 'نسخ الكود' : 'Copy Code'}</>
                )}
              </Button>
              <ScrollArea className="flex-1">
                <pre className="bg-slate-900 rounded p-3 text-[10px] border border-slate-700 overflow-x-auto">
                  <code className="text-slate-300 font-mono whitespace-pre-wrap break-words text-[9px]">{component.code.html}</code>
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="tailwind" className="h-full m-0 flex flex-col overflow-hidden p-4">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleCopyCode(component.code.tailwind)}
                className="gap-1.5 text-xs font-bold h-9 mb-3 bg-blue-600 hover:bg-blue-700 w-full"
              >
                {copied ? (
                  <><Check className="w-4 h-4" /> {isArabic ? 'تم النسخ' : 'Copied'}</>
                ) : (
                  <><Copy className="w-4 h-4" /> {isArabic ? 'نسخ الكود' : 'Copy Code'}</>
                )}
              </Button>
              <ScrollArea className="flex-1">
                <pre className="bg-slate-900 rounded p-3 text-[10px] border border-slate-700 overflow-x-auto">
                  <code className="text-slate-300 font-mono whitespace-pre-wrap break-words text-[9px]">{component.code.tailwind}</code>
                </pre>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <footer className="px-4 py-2 border-t text-center text-xs text-muted-foreground bg-muted/5">
          <div className="flex items-center justify-center gap-1">
            <Info className="w-3 h-3" />
            <span>{isArabic ? 'اضغط ESC للعودة' : 'Press ESC to go back'}</span>
          </div>
        </footer>
      </aside>
    </>
  );
});

SmartInspectorPanel.displayName = 'SmartInspectorPanel';
