import React, { useEffect } from 'react';
import { X, Copy, Check, Eye, Code, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
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
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      <aside
        className={cn(
          "fixed z-50 bg-background border-l shadow-2xl",
          "w-full h-full md:w-[500px] lg:w-[600px] xl:w-[700px]",
          "top-0 right-0",
          "transform transition-transform duration-300 ease-in-out",
          state.isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
      >
        <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 via-background to-transparent">
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-9 w-9 p-0 hover:bg-muted rounded-lg"
                title={isArabic ? 'إغلاق' : 'Close'}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex-1 min-w-0">
                <h2 id="inspector-title" className="font-bold text-lg truncate">
                  {isArabic ? component.nameAr : component.name}
                </h2>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {isArabic ? component.descriptionAr : component.description}
                </p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              {hasPrev && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('prev')}
                  className="h-9 w-9 p-0"
                  title={isArabic ? 'السابق' : 'Previous'}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              {hasNext && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('next')}
                  className="h-9 w-9 p-0"
                  title={isArabic ? 'التالي' : 'Next'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-9 w-9 p-0 hover:bg-red-500/10 hover:text-red-600 hidden md:flex"
                title={isArabic ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </header>

          {/* Component Category Badge */}
          <div className="px-4 pt-4 pb-2">
            <Badge 
              variant={component.category === 'search' ? 'default' : 'secondary'}
              className={cn(
                "text-xs font-semibold px-3 py-1",
                component.category === 'search' && "bg-blue-600"
              )}
            >
              {component.category === 'search' 
                ? (isArabic ? '🔍 تصميم بحث' : '🔍 Search Design') 
                : (isArabic ? '📋 تصميم بطاقة' : '📋 Card Design')}
            </Badge>
          </div>

          {/* State Selector */}
          <div className="px-4 pb-3 border-b bg-muted/20">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">
              {isArabic ? 'حالات المكون:' : 'Component States:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {states.map((s) => (
                <Badge
                  key={s}
                  variant={state.currentState === s ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer text-xs font-semibold transition-all hover:scale-105",
                    state.currentState === s && "bg-primary/90"
                  )}
                  onClick={() => onStateChange(s)}
                >
                  {s === 'default' ? '○' : s === 'hover' ? '✋' : s === 'focused' ? '👁' : s === 'active' ? '✓' : s === 'disabled' ? '⊘' : s === 'loading' ? '⟳' : s}
                  {' '}
                  {s}
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
            <TabsList className="mx-4 mt-4 grid grid-cols-4 h-11 bg-muted/50">
              <TabsTrigger value="preview" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-primary/90 data-[state=active]:text-white">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'معاينة' : 'Preview'}</span>
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-primary/90 data-[state=active]:text-white">
                <Code className="w-4 h-4" />
                <span className="hidden sm:inline">HTML</span>
              </TabsTrigger>
              <TabsTrigger value="tailwind" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-primary/90 data-[state=active]:text-white">
                <Code className="w-4 h-4" />
                <span className="hidden sm:inline">CSS</span>
              </TabsTrigger>
              <TabsTrigger value="props" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-primary/90 data-[state=active]:text-white">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'الخصائص' : 'Props'}</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Preview Tab */}
              <TabsContent value="preview" className="h-full m-0 p-4 overflow-auto">
                <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-8 min-h-[300px] flex items-center justify-center border-2 border-dashed border-muted-foreground/30 hover:border-primary/30 transition-colors">
                  <div className="scale-100">
                    {component.preview}
                  </div>
                </div>
              </TabsContent>

              {/* HTML Tab */}
              <TabsContent value="html" className="h-full m-0 flex flex-col">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyCode(component.code.html)}
                  className="m-4 mb-2 gap-1.5 w-fit"
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> {isArabic ? 'تم النسخ!' : 'Copied!'}</>
                  ) : (
                    <><Copy className="w-4 h-4" /> {isArabic ? 'نسخ' : 'Copy'}</>
                  )}
                </Button>
                <ScrollArea className="flex-1">
                  <pre className="bg-slate-900 rounded-lg p-4 text-xs overflow-x-auto m-4 mt-0 border border-slate-700" dir="ltr">
                    <code className="text-slate-300 font-mono whitespace-pre-wrap break-words">{component.code.html}</code>
                  </pre>
                </ScrollArea>
              </TabsContent>

              {/* Tailwind Tab */}
              <TabsContent value="tailwind" className="h-full m-0 flex flex-col">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyCode(component.code.tailwind)}
                  className="m-4 mb-2 gap-1.5 w-fit"
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> {isArabic ? 'تم النسخ!' : 'Copied!'}</>
                  ) : (
                    <><Copy className="w-4 h-4" /> {isArabic ? 'نسخ' : 'Copy'}</>
                  )}
                </Button>
                <ScrollArea className="flex-1">
                  <pre className="bg-slate-900 rounded-lg p-4 text-xs overflow-x-auto m-4 mt-0 border border-slate-700" dir="ltr">
                    <code className="text-slate-300 font-mono whitespace-pre-wrap break-words">{component.code.tailwind}</code>
                  </pre>
                </ScrollArea>
              </TabsContent>

              {/* Props Tab */}
              <TabsContent value="props" className="h-full m-0 p-4">
                <ScrollArea className="h-full">
                  {component.props && component.props.length > 0 ? (
                    <div className="space-y-3 pr-4">
                      {component.props.map((prop, idx) => (
                        <div key={idx} className="bg-muted/40 rounded-xl p-4 border-2 border-muted-foreground/20 hover:border-primary/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-sm font-bold text-primary">{prop.name}</code>
                            <Badge variant="outline" className="text-xs font-mono">{prop.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {isArabic ? prop.descriptionAr : prop.description}
                          </p>
                          {prop.default && (
                            <p className="text-xs mt-2 pt-2 border-t border-muted-foreground/20">
                              <span className="text-muted-foreground font-semibold">
                                {isArabic ? 'الافتراضية:' : 'Default:'}
                              </span>{' '}
                              <code className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">{prop.default}</code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-semibold">
                        {isArabic ? 'لا توجد خصائص' : 'No props'}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </aside>
    </>
  );
}
