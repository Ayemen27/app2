import React, { memo, useEffect, useCallback } from 'react';
import { X, Copy, Check, Eye, Code, Settings2, ChevronLeft, ChevronRight, Home } from 'lucide-react';
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
        {/* Header - Compact */}
        <header className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/20 to-transparent sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h2 id="inspector-title" className="font-bold text-sm truncate">
              {isArabic ? component.nameAr : component.name}
            </h2>
            <Badge variant={component.category === 'search' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
              {component.category === 'search' ? '🔍' : '📋'}
            </Badge>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs font-bold border hover:bg-amber-50 hover:border-amber-500"
              title={isArabic ? 'المعرض (Esc)' : 'Gallery (Esc)'}
            >
              <Home className="w-3.5 h-3.5" />
            </Button>

            {hasPrev && (
              <Button
                onClick={() => onNavigate?.('prev')}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border hover:bg-blue-50"
                title={isArabic ? 'السابق' : 'Previous'}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {hasNext && (
              <Button
                onClick={() => onNavigate?.('next')}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border hover:bg-blue-50"
                title={isArabic ? 'التالي' : 'Next'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              onClick={onClose}
              variant="destructive"
              size="sm"
              className="h-8 w-8 p-0 border-2 text-xs font-bold"
              title={isArabic ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Description */}
        <div className="px-3 py-2 border-b text-xs text-muted-foreground line-clamp-2">
          {isArabic ? component.descriptionAr : component.description}
        </div>

        {/* State Selector - Compact */}
        <div className="px-3 py-2 border-b bg-muted/10 flex flex-wrap gap-1">
          {states.map((s) => (
            <Badge
              key={s}
              variant={state.currentState === s ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer text-[10px] font-bold px-2 py-0.5 transition-all',
                state.currentState === s && 'bg-primary/90'
              )}
              onClick={() => onStateChange(s)}
            >
              {s === 'default' ? '○' : s === 'hover' ? '✋' : s === 'focused' ? '👁' : s}
            </Badge>
          ))}
        </div>

        {/* Tabs - Compact */}
        <Tabs
          value={state.activeTab}
          onValueChange={(v) => onTabChange(v as InspectorState['activeTab'])}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-3 mt-2 grid grid-cols-3 gap-1 h-9 bg-muted/50 rounded p-1">
            <TabsTrigger value="preview" className="text-[10px] font-bold gap-1 py-1 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">{isArabic ? 'معاينة' : 'Preview'}</span>
            </TabsTrigger>
            <TabsTrigger value="html" className="text-[10px] font-bold gap-1 py-1 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Code className="w-3 h-3" />
              <span className="hidden sm:inline">HTML</span>
            </TabsTrigger>
            <TabsTrigger value="tailwind" className="text-[10px] font-bold gap-1 py-1 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Settings2 className="w-3 h-3" />
              <span className="hidden sm:inline">CSS</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden mt-2">
            <TabsContent value="preview" className="h-full m-0 p-3 overflow-auto">
              <div className="bg-gradient-to-br from-white via-muted/20 to-muted/30 rounded-lg p-4 min-h-[400px] flex items-center justify-center border-2 border-dashed border-primary/30 shadow-sm">
                <div className="max-w-full">
                  {component.preview}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="html" className="h-full m-0 flex flex-col overflow-hidden p-3">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleCopyCode(component.code.html)}
                className="gap-1.5 text-xs font-bold h-8 mb-2 bg-blue-600 hover:bg-blue-700"
              >
                {copied ? (
                  <><Check className="w-3 h-3" /> {isArabic ? 'تم' : 'Copied'}</>
                ) : (
                  <><Copy className="w-3 h-3" /> {isArabic ? 'نسخ' : 'Copy'}</>
                )}
              </Button>
              <ScrollArea className="flex-1">
                <pre className="bg-slate-900 rounded p-2 text-[10px] border border-slate-700 overflow-x-auto">
                  <code className="text-slate-300 font-mono whitespace-pre-wrap break-words text-[9px]">{component.code.html}</code>
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="tailwind" className="h-full m-0 flex flex-col overflow-hidden p-3">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleCopyCode(component.code.tailwind)}
                className="gap-1.5 text-xs font-bold h-8 mb-2 bg-blue-600 hover:bg-blue-700"
              >
                {copied ? (
                  <><Check className="w-3 h-3" /> {isArabic ? 'تم' : 'Copied'}</>
                ) : (
                  <><Copy className="w-3 h-3" /> {isArabic ? 'نسخ' : 'Copy'}</>
                )}
              </Button>
              <ScrollArea className="flex-1">
                <pre className="bg-slate-900 rounded p-2 text-[10px] border border-slate-700 overflow-x-auto">
                  <code className="text-slate-300 font-mono whitespace-pre-wrap break-words text-[9px]">{component.code.tailwind}</code>
                </pre>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <footer className="px-3 py-1.5 border-t text-center text-[10px] text-muted-foreground bg-muted/5">
          {isArabic ? 'اضغط ESC للإغلاق' : 'Press ESC to close'}
        </footer>
      </aside>
    </>
  );
});

SmartInspectorPanel.displayName = 'SmartInspectorPanel';
