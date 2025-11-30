import React from 'react';
import { Heart, ExternalLink, Github } from 'lucide-react';
import { GallerySettings } from '../shared/types';

interface GalleryFooterProps {
  settings: GallerySettings;
}

export function GalleryFooter({ settings }: GalleryFooterProps) {
  const isArabic = settings.language === 'ar';

  return (
    <footer className="border-t bg-muted/30 py-6 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {isArabic ? 'صُنع بـ' : 'Built with'}
            </span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>
              {isArabic ? 'باستخدام React و Tailwind CSS' : 'using React & Tailwind CSS'}
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a 
              href="#usage" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {isArabic ? 'طريقة الاستخدام' : 'How to Use'}
            </a>
            <a 
              href="#docs" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {isArabic ? 'التوثيق' : 'Documentation'}
              <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href="#license" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isArabic ? 'الترخيص' : 'License'}
            </a>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{isArabic ? 'الإصدار' : 'Version'} 1.0.0</span>
            <span>•</span>
            <span>© 2024</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
          <p>
            {isArabic 
              ? 'جميع المكونات متوافقة مع معايير الوصولية (WCAG 2.1) ومتجاوبة بالكامل.'
              : 'All components are WCAG 2.1 compliant and fully responsive.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
