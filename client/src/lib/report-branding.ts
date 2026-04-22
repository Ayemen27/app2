/**
 * 🎨 المصدر الموحّد لهوية التقارير في العميل
 * Single source of truth for report branding (colors + company info) on the client.
 *
 * يُغذَّى تلقائياً من /api/report-header الخاص بالمستخدم الحالي عبر <ReportBrandingSync/>.
 * جميع دوال التصدير (Excel + PDF + axion-export) تقرأ من هذا المصدر فيُطبَّق
 * تخصيص المستخدم على كل التقارير المُولَّدة في المتصفح بدون أي إعداد إضافي.
 *
 * ⚠️ القيم تُقرأ بشكل sync — تُحدَّث عبر updateBrandingCache() من React Query hook.
 *    لذلك يجب وضع <ReportBrandingSync/> داخل شجرة QueryClientProvider مرة واحدة.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface ReportBranding {
  companyName: string;
  companyNameEn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  footerText: string;
  primaryColor: string;   // #RRGGBB
  secondaryColor: string;
  accentColor: string;
}

export const DEFAULT_BRANDING: ReportBranding = {
  companyName: 'الفتيني للمقاولات العامة والاستشارات الهندسية',
  companyNameEn: 'Al-Fatihi Construction Management System',
  address: '',
  phone: '',
  email: '',
  website: '',
  footerText: '',
  primaryColor: '#1B2A4A',
  secondaryColor: '#2E5090',
  accentColor: '#4A90D9',
};

let _cache: ReportBranding = { ...DEFAULT_BRANDING };

export function getBranding(): ReportBranding {
  return _cache;
}

export function updateBrandingCache(next: Partial<ReportBranding> | null | undefined): void {
  if (!next) {
    _cache = { ...DEFAULT_BRANDING };
    return;
  }
  _cache = {
    companyName: next.companyName || DEFAULT_BRANDING.companyName,
    companyNameEn: next.companyNameEn || DEFAULT_BRANDING.companyNameEn,
    address: next.address ?? '',
    phone: next.phone ?? '',
    email: next.email ?? '',
    website: next.website ?? '',
    footerText: next.footerText ?? '',
    primaryColor: next.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: next.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    accentColor: next.accentColor || DEFAULT_BRANDING.accentColor,
  };
}

/** Helpers لتحويلات الألوان المستخدمة في Excel/PDF. */
export const hexNoHash = (c: string) => (c || '#000000').replace('#', '').toUpperCase();
export const argb = (c: string) => 'FF' + hexNoHash(c);
export const hex = (c: string) => (c?.startsWith('#') ? c : `#${c}`);

/** Map server snake_case payload → client camelCase. */
function mapServerPayload(p: any): Partial<ReportBranding> | null {
  if (!p || typeof p !== 'object') return null;
  return {
    companyName: p.company_name,
    companyNameEn: p.company_name_en,
    address: p.address,
    phone: p.phone,
    email: p.email,
    website: p.website,
    footerText: p.footer_text,
    primaryColor: p.primary_color,
    secondaryColor: p.secondary_color,
    accentColor: p.accent_color,
  };
}

/** React hook: يحمّل الترويسة من الخادم ويُبقي الـ cache محدثاً. */
export function useReportBranding() {
  const query = useQuery<any>({
    queryKey: ['/api/report-header'],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      updateBrandingCache(mapServerPayload(query.data));
    } else if (query.isError) {
      updateBrandingCache(null);
    }
  }, [query.data, query.isError]);

  return query;
}

/** مكوّن صامت يُركَّب مرة واحدة في جذر التطبيق لتفعيل المزامنة. */
export function ReportBrandingSync() {
  useReportBranding();
  return null;
}
