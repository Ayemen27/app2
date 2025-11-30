import React, { useEffect } from 'react';
import { X, Copy, Check, Eye, Code, Settings2, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InspectorState, ComponentState, GallerySettings } from '../shared/types';
import { useCopyCode } from '../hooks/useCopyCode';
import { cn } from '../shared/utils';

interface InspectorPanelProps {
  state: InspectorState;
  settings: GallerySettings;
  onClose: () => void;
  onTabChange: (tab: InspectorState['activeTab']) => void;
  onStateChange: (state: ComponentState) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function InspectorPanel({
  state,
  settings,
  onClose,
  onTabChange,
  onStateChange,
  onNavigate,
  hasNext = false,
  hasPrev = false,
}: InspectorPanelProps) {
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

  if (!state.isOpen || !state.selectedComponent) return null;

  const component = state.selectedComponent;
  const states: ComponentState[] = ['default', 'hover', 'focused', 'active', 'disabled', 'loading'];

  const handleCopyCode = (code: string) => {
    copy(code);
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <aside
        className={cn(
          "fixed z-50 bg-background",
          "w-full h-full md:w-[520px] lg:w-[640px] xl:w-[760px]",
          "top-0 right-0",
          "transform transition-transform duration-300 ease-in-out flex flex-col",
          "border-l-4 border-primary shadow-2xl",
          state.isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
      >
        {/* Header with Close & Navigation Buttons */}
        <header className="flex items-center justify-between p-4 border-b-2 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h2 id="inspector-title" className="font-bold text-lg truncate">
              {isArabic ? component.nameAr : component.name}
            </h2>
            <Badge 
              variant={component.category === 'search' ? 'default' : 'secondary'}
              className={cn(
                "text-xs font-bold flex-shrink-0",
                component.category === 'search' && "bg-blue-600"
              )}
            >
              {component.category === 'search' ? '🔍' : '📋'}
            </Badge>
          </div>

          {/* Navigation Controls - Clear & Visible */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className={cn(
                "h-10 px-3 font-semibold border-2 hover:bg-amber-50 hover:border-amber-500 hover:text-amber-700",
                "transition-all duration-200"
              )}
              title={isArabic ? 'الرجوع للمعرض (Esc)' : 'Back to Gallery (Esc)'}
            >
              <Home className="w-4 h-4" />
              <span className="text-xs font-bold">{isArabic ? 'المعرض' : 'Gallery'}</span>
            </Button>

            {hasPrev && (
              <Button
                onClick={() => onNavigate?.('prev')}
                variant="outline"
                size="sm"
                className={cn(
                  "h-10 px-3 font-semibold border-2 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700",
                  "transition-all duration-200"
                )}
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
                className={cn(
                  "h-10 px-3 font-semibold border-2 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700",
                  "transition-all duration-200"
                )}
                title={isArabic ? 'التالي' : 'Next'}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}

            <Button
              onClick={onClose}
              variant="destructive"
              size="sm"
              className={cn(
                "h-10 w-10 p-0 font-bold border-2 hidden md:flex",
                "hover:bg-red-600 hover:border-red-700",
                "transition-all duration-200"
              )}
              title={isArabic ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Component Info */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {isArabic ? component.descriptionAr : component.description}
          </p>
        </div>

        {/* State Selector - Compact */}
        <div className="px-4 py-3 border-b bg-muted/20">
          <p className="text-xs font-bold text-muted-foreground mb-2">
            {isArabic ? 'حالات المكون:' : 'States:'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {states.map((s) => (
              <Badge
                key={s}
                variant={state.currentState === s ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer text-xs font-semibold px-2.5 py-1.5 transition-all hover:scale-110",
                  state.currentState === s && "bg-primary/90 text-white shadow-md"
                )}
                onClick={() => onStateChange(s)}
              >
                {s === 'default' ? '○' : s === 'hover' ? '✋' : s === 'focused' ? '👁' : s === 'active' ? '✓' : s === 'disabled' ? '⊘' : s === 'loading' ? '⟳' : s}
              </Badge>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs 
          value={state.activeTab} 
          onValueChange={(v) => onTabChange(v as InspectorState['activeTab'])}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-3 grid grid-cols-4 h-10 bg-muted/60 rounded-lg p-1">
            <TabsTrigger value="preview" className="text-xs font-bold gap-1 data-[state=active]:bg-primary/90 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'معاينة' : 'Preview'}</span>
            </TabsTrigger>
            <TabsTrigger value="html" className="text-xs font-bold gap-1 data-[state=active]:bg-primary/90 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">HTML</span>
            </TabsTrigger>
            <TabsTrigger value="tailwind" className="text-xs font-bold gap-1 data-[state=active]:bg-primary/90 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">CSS</span>
            </TabsTrigger>
            <TabsTrigger value="props" className="text-xs font-bold gap-1 data-[state=active]:bg-primary/90 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'الخصائص' : 'Props'}</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            {/* Preview Tab - Large & Clear */}
            <TabsContent value="preview" className="h-full m-0 p-5 overflow-auto">
              <div className="bg-gradient-to-br from-white via-muted/30 to-muted/50 rounded-2xl p-8 min-h-[500px] flex items-center justify-center border-4 border-dashed border-primary/40 shadow-inner">
                <div className="max-w-full">
                  {component.preview}
                </div>
              </div>
            </TabsContent>

            {/* HTML Tab */}
            <TabsContent value="html" className="h-full m-0 flex flex-col overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleCopyCode(component.code.html)}
                  className={cn(
                    "gap-2 text-xs font-bold h-9",
                    "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> {isArabic ? 'تم النسخ!' : 'Copied!'}</>
                  ) : (
                    <><Copy className="w-4 h-4" /> {isArabic ? 'نسخ الكود' : 'Copy Code'}</>
                  )}
                </Button>
              </div>
              <ScrollArea className="flex-1 px-4">
                <pre className="bg-slate-900 rounded-lg p-4 text-xs overflow-x-auto border-2 border-slate-700 pb-4" dir="ltr">
                  <code className="text-slate-300 font-mono whitespace-pre-wrap break-words text-[11px] leading-relaxed">{component.code.html}</code>
                </pre>
              </ScrollArea>
            </TabsContent>

            {/* Tailwind Tab */}
            <TabsContent value="tailwind" className="h-full m-0 flex flex-col overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleCopyCode(component.code.tailwind)}
                  className={cn(
                    "gap-2 text-xs font-bold h-9",
                    "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> {isArabic ? 'تم النسخ!' : 'Copied!'}</>
                  ) : (
                    <><Copy className="w-4 h-4" /> {isArabic ? 'نسخ الكود' : 'Copy Code'}</>
                  )}
                </Button>
              </div>
              <ScrollArea className="flex-1 px-4">
                <pre className="bg-slate-900 rounded-lg p-4 text-xs overflow-x-auto border-2 border-slate-700 pb-4" dir="ltr">
                  <code className="text-slate-300 font-mono whitespace-pre-wrap break-words text-[11px] leading-relaxed">{component.code.tailwind}</code>
                </pre>
              </ScrollArea>
            </TabsContent>

            {/* Props Tab */}
            <TabsContent value="props" className="h-full m-0 p-4 overflow-hidden">
              <ScrollArea className="h-full pr-3">
                {component.props && component.props.length > 0 ? (
                  <div className="space-y-3">
                    {component.props.map((prop, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-xl p-3.5 border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <code className="text-sm font-bold text-primary">{prop.name}</code>
                          <Badge variant="outline" className="text-xs font-mono flex-shrink-0">{prop.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isArabic ? prop.descriptionAr : prop.description}
                        </p>
                        {prop.default && (
                          <p className="text-xs mt-2 pt-2 border-t border-muted-foreground/30">
                            <span className="text-muted-foreground font-semibold">
                              {isArabic ? 'الافتراضية:' : 'Default:'}
                            </span>{' '}
                            <code className="bg-slate-900 text-slate-300 px-2 py-1 rounded text-[10px] font-mono inline-block mt-1">{prop.default}</code>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-16">
                    <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold opacity-60">
                      {isArabic ? 'لا توجد خصائص' : 'No props'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Info */}
        <footer className="px-4 py-2 border-t bg-muted/20 text-center text-xs text-muted-foreground">
          <p>{isArabic ? 'اضغط ESC للإغلاق' : 'Press ESC to close'}</p>
        </footer>
      </aside>
    </>
  );
}
