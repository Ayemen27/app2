/**
 * Per-request report header context using AsyncLocalStorage.
 * Lets report generators read the calling user's branding (company name,
 * colors, footer) without threading it through every template signature.
 *
 * SECURITY: routes MUST call withReportHeader(header, () => generate(...))
 * with the header fetched for the AUTHENTICATED user (req.user.user_id).
 * Never accept user_id from request body.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface ReportHeader {
  company_name: string;
  company_name_en?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  footer_text?: string | null;
  primary_color: string;   // hex like #1B2A4A
  secondary_color: string;
  accent_color: string;
}

export const DEFAULT_REPORT_HEADER: ReportHeader = {
  company_name: 'الفتيني للمقاولات العامة والاستشارات الهندسية',
  company_name_en: 'Al-Fatihi Construction Management System',
  address: null,
  phone: null,
  email: null,
  website: null,
  footer_text: null,
  primary_color: '#1B2A4A',
  secondary_color: '#2E5090',
  accent_color: '#4A90D9',
};

const storage = new AsyncLocalStorage<ReportHeader>();

export function withReportHeader<T>(header: ReportHeader | null | undefined, fn: () => T): T {
  return storage.run(header || DEFAULT_REPORT_HEADER, fn);
}

export function currentReportHeader(): ReportHeader {
  return storage.getStore() || DEFAULT_REPORT_HEADER;
}

/** Convert "#RRGGBB" → "FFRRGGBB" for ExcelJS argb format. */
export function hexToArgb(hex: string): string {
  const clean = (hex || '').replace('#', '').toUpperCase();
  if (clean.length === 6) return 'FF' + clean;
  if (clean.length === 8) return clean;
  return 'FF1B2A4A';
}
