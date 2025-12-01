import React, { memo } from 'react';
import { Heart, ExternalLink, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { GallerySettings } from '../shared/types';

interface GalleryFooterProps {
  settings: GallerySettings;
}

export const GalleryFooter = memo(function GalleryFooter({ settings }: GalleryFooterProps) {
  const [, setLocation] = useLocation();
  const isArabic = settings.language === 'ar';

  const handleGoHome = () => {
    setLocation('/');
  };

  return (
    <footer className="border-t-2 border-gray-200 bg-gradient-to-b from-background via-gray-50/50 to-background py-8 mt-12">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left Section - Built With */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span>{isArabic ? '⚙️ صُنع بـ' : '⚙️ Built with'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
              <span>{isArabic ? 'React 18 و Tailwind CSS' : 'React 18 & Tailwind CSS'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>⚡ {isArabic ? 'محسّن للأداء العالي' : 'High Performance'}</span>
            </div>
          </div>

          {/* Center Section - Resources */}
          <div className="flex flex-col gap-3">
            <div className="text-sm font-bold text-foreground">
              {isArabic ? '📚 الموارد' : '📚 Resources'}
            </div>
            <div className="flex flex-col gap-2">
              <a 
                href="https://react.dev" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                {isArabic ? 'توثيق React' : 'React Documentation'}
                <ExternalLink className="w-3 h-3" />
              </a>
              <a 
                href="https://tailwindcss.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                {isArabic ? 'Tailwind CSS' : 'Tailwind CSS'}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Right Section - Info */}
          <div className="flex flex-col gap-3">
            <div className="text-sm font-bold text-foreground">
              {isArabic ? 'ℹ️ معلومات' : 'ℹ️ Info'}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{isArabic ? '📦 الإصدار' : '📦 Version'} 2.0.0</span>
              <span className="text-gray-300">•</span>
              <span>© 2024-2025</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? '✅ متوافق مع WCAG 2.1' : '✅ WCAG 2.1 Compliant'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Bottom Section - Compliance + Action Button */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left flex-1">
            {isArabic 
              ? '🌍 جميع المكونات متوافقة مع معايير الوصولية (WCAG 2.1) وسريعة الاستجابة بالكامل ومحسّنة للأداء.'
              : '🌍 All components are WCAG 2.1 compliant, fully responsive, and performance optimized.'}
          </p>

          <Button
            onClick={handleGoHome}
            className={cn(
              "gap-2 text-sm font-bold whitespace-nowrap",
              "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary",
              "text-white shadow-lg hover:shadow-xl transition-all"
            )}
          >
            <Home className="w-4 h-4" />
            <span>{isArabic ? 'العودة للرئيسية' : 'Back to Home'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
});

GalleryFooter.displayName = 'GalleryFooter';

// Import cn utility
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
