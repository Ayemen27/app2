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
  logoUrl: string;
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
  logoUrl: '',
  footerText: '',
  primaryColor: '#15807F',
  secondaryColor: '#0F6B6B',
  accentColor: '#F4A14B',
};

let _cache: ReportBranding = { ...DEFAULT_BRANDING };
let _loadedFromServer = false;
let _inflight: Promise<ReportBranding> | null = null;

export function getBranding(): ReportBranding {
  return _cache;
}

/**
 * يضمن أن cache الترويسة محمّل من الخادم قبل أي تصدير (PDF/Excel).
 * إذا كان محمّلاً بالفعل أو هناك طلب جارٍ يُعاد استخدامه. آمن للاستدعاء المتزامن.
 * يُعيد القيم الافتراضية بصمت في حال الفشل (بدون كسر التصدير).
 */
export async function ensureBrandingLoaded(force = false): Promise<ReportBranding> {
  if (_loadedFromServer && !force) return _cache;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const res = await apiRequest('GET', '/api/report-header');
      const data = await res.json();
      const mapped = mapServerPayload(data);
      if (mapped) updateBrandingCache(mapped);
      _loadedFromServer = true;
    } catch (e) {
      console.warn('[branding] failed to load /api/report-header, using defaults:', (e as Error)?.message);
    } finally {
      _inflight = null;
    }
    return _cache;
  })();
  return _inflight;
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
    logoUrl: next.logoUrl ?? '',
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

/** Map server snake_case payload → client camelCase.
 *  يدعم كلا الشكلين: { success, header: {...} } من /api/report-header، أو الـ header المباشر. */
function mapServerPayload(p: any): Partial<ReportBranding> | null {
  if (!p || typeof p !== 'object') return null;
  const h = p.header && typeof p.header === 'object' ? p.header : p;
  if (!h.company_name && !h.primary_color && !h.logo_url) return null;
  return {
    companyName: h.company_name,
    companyNameEn: h.company_name_en,
    address: h.address,
    phone: h.phone,
    email: h.email,
    website: h.website,
    logoUrl: h.logo_url,
    footerText: h.footer_text,
    primaryColor: h.primary_color,
    secondaryColor: h.secondary_color,
    accentColor: h.accent_color,
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
      _loadedFromServer = true;
    } else if (query.isError) {
      updateBrandingCache(null);
      _loadedFromServer = true;
    }
  }, [query.data, query.isError]);

  return query;
}

/** مكوّن صامت يُركَّب مرة واحدة في جذر التطبيق لتفعيل المزامنة. */
export function ReportBrandingSync() {
  useReportBranding();
  return null;
}
