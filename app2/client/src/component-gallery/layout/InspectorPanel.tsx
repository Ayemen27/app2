import React, { useEffect } from 'react';
import { X, Copy, Check, Eye, Code, FileJson, Settings2, ChevronLeft } from 'lucide-react';
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
}

export function InspectorPanel({
  state,
  settings,
  onClose,
  onTabChange,
  onStateChange,
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
          "fixed z-50 bg-background border-r shadow-xl",
          "w-full h-full md:w-[480px] lg:w-[560px] xl:w-[640px]",
          "top-0 right-0",
          "transform transition-transform duration-300 ease-in-out",
          state.isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 id="inspector-title" className="font-semibold text-lg">
                  {isArabic ? component.nameAr : component.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? component.descriptionAr : component.description}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hidden md:flex"
            >
              <X className="w-4 h-4" />
            </Button>
          </header>

          <div className="p-4 border-b bg-muted/20">
            <p className="text-xs text-muted-foreground mb-2">
              {isArabic ? 'حالة المكون:' : 'Component State:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {states.map((s) => (
                <Badge
                  key={s}
                  variant={state.currentState === s ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => onStateChange(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <Tabs 
            value={state.activeTab} 
            onValueChange={(v) => onTabChange(v as InspectorState['activeTab'])}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mx-4 mt-4 grid grid-cols-4 h-10">
              <TabsTrigger value="preview" className="gap-1.5 text-xs">
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isArabic ? 'معاينة' : 'Preview'}</span>
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-1.5 text-xs">
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">HTML</span>
              </TabsTrigger>
              <TabsTrigger value="tailwind" className="gap-1.5 text-xs">
                <Code className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tailwind</span>
              </TabsTrigger>
              <TabsTrigger value="props" className="gap-1.5 text-xs">
                <Settings2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isArabic ? 'الخصائص' : 'Props'}</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="preview" className="h-full m-0 p-4">
                <div className="bg-muted/30 rounded-xl p-6 min-h-[200px] flex items-center justify-center border-2 border-dashed">
                  {component.preview}
                </div>
              </TabsContent>

              <TabsContent value="html" className="h-full m-0">
                <div className="relative h-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyCode(component.code.html)}
                    className="absolute top-4 left-4 z-10 gap-1.5"
                  >
                    {copied ? (
                      <><Check className="w-3.5 h-3.5" /> {isArabic ? 'تم النسخ!' : 'Copied!'}</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> {isArabic ? 'نسخ' : 'Copy'}</>
                    )}
                  </Button>
                  <ScrollArea className="h-full p-4">
                    <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto" dir="ltr">
                      <code className="text-foreground font-mono">{component.code.html}</code>
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="tailwind" className="h-full m-0">
                <div className="relative h-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyCode(component.code.tailwind)}
                    className="absolute top-4 left-4 z-10 gap-1.5"
                  >
                    {copied ? (
                      <><Check className="w-3.5 h-3.5" /> {isArabic ? 'تم النسخ!' : 'Copied!'}</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> {isArabic ? 'نسخ' : 'Copy'}</>
                    )}
                  </Button>
                  <ScrollArea className="h-full p-4">
                    <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto" dir="ltr">
                      <code className="text-foreground font-mono">{component.code.tailwind}</code>
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="props" className="h-full m-0 p-4">
                <ScrollArea className="h-full">
                  {component.props && component.props.length > 0 ? (
                    <div className="space-y-3">
                      {component.props.map((prop, idx) => (
                        <div key={idx} className="bg-muted/30 rounded-lg p-3 border">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-sm font-semibold text-primary">{prop.name}</code>
                            <Badge variant="outline" className="text-xs">{prop.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isArabic ? prop.descriptionAr : prop.description}
                          </p>
                          {prop.default && (
                            <p className="text-xs mt-1">
                              <span className="text-muted-foreground">
                                {isArabic ? 'القيمة الافتراضية:' : 'Default:'}
                              </span>{' '}
                              <code className="bg-muted px-1 rounded">{prop.default}</code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {isArabic ? 'لا توجد خصائص لهذا المكون' : 'No props for this component'}
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
