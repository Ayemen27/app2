import React from 'react';
import { Search, Grid3X3, List, Moon, Sun, Monitor, Download, Code, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GallerySettings } from '../shared/types';

interface GalleryHeaderProps {
  settings: GallerySettings;
  filter: string;
  onFilterChange: (filter: string) => void;
  onToggleViewMode: () => void;
  onToggleTheme: () => void;
  onToggleShowCode: () => void;
  onToggleLanguage: () => void;
  totalCount: number;
}

export function GalleryHeader({
  settings,
  filter,
  onFilterChange,
  onToggleViewMode,
  onToggleTheme,
  onToggleShowCode,
  onToggleLanguage,
  totalCount,
}: GalleryHeaderProps) {
  const themeIcon = settings.theme === 'light' ? Sun : settings.theme === 'dark' ? Moon : Monitor;
  const ThemeIcon = themeIcon;

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {settings.language === 'ar' ? 'معرض المكونات' : 'Component Gallery'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {settings.language === 'ar' 
                    ? `${totalCount} مكون متاح` 
                    : `${totalCount} components available`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={settings.language === 'ar' ? 'بحث في المكونات...' : 'Search components...'}
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
                className="pr-9 h-9"
              />
            </div>

            <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
              <Button
                variant={settings.viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={onToggleViewMode}
                className="h-7 w-7 p-0"
                title={settings.language === 'ar' ? 'عرض شبكي' : 'Grid view'}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={settings.viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={onToggleViewMode}
                className="h-7 w-7 p-0"
                title={settings.language === 'ar' ? 'عرض قائمة' : 'List view'}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant={settings.showCode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onToggleShowCode}
              className="h-9 gap-2"
              title={settings.language === 'ar' ? 'إظهار الكود' : 'Show code'}
            >
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">
                {settings.language === 'ar' ? 'الكود' : 'Code'}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              className="h-9 w-9 p-0"
              title={settings.language === 'ar' ? 'تغيير السمة' : 'Toggle theme'}
            >
              <ThemeIcon className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLanguage}
              className="h-9 w-9 p-0"
              title={settings.language === 'ar' ? 'English' : 'عربي'}
            >
              <Languages className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {settings.language === 'ar' ? 'تصدير' : 'Export'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
