/**
 * 🎨 ثوابت العلامة التجارية — proxy على المصدر الموحّد report-branding.ts
 *
 * حافظنا على هذا الملف لتوافق الاستهلاك القديم (`BRAND.colors.*`, `hex(...)`, `argb(...)`)،
 * لكن جميع القيم الآن تُشتق من إعدادات المستخدم الحالية المخزّنة في cache المتصفح.
 */

import { getBranding, hexNoHash } from './report-branding';

export const BRAND = {
  get company() {
    const b = getBranding();
    return {
      name: b.companyName,
      nameEn: b.companyNameEn,
      address: b.address,
      phone: b.phone,
      email: b.email,
      website: b.website,
    };
  },

  get colors() {
    const b = getBranding();
    return {
      // ألوان مشتقة من إعدادات المستخدم
      mainBlue: hexNoHash(b.primaryColor),
      mainBlueDark: hexNoHash(b.primaryColor),
      accentBlue: hexNoHash(b.accentColor),
      slateHeader: hexNoHash(b.secondaryColor),
      slateMid: '475569',
      slateLight: '64748B',

      // ألوان دلالية ثابتة (نجاح/خطأ/تحذير/خلفيات)
      emeraldGreen: '10B981',
      emeraldDark: '059669',
      emeraldLight: 'ECFDF5',
      roseRed: 'F43F5E',
      roseDark: 'BE123C',
      roseLight: 'FEE2E2',
      amberWarn: 'F59E0B',
      amberLight: 'FEF3C7',

      bgAlt: 'EFF6FF',
      bgZebra: 'F8FAFC',
      border: 'E2E8F0',
      borderMid: 'CBD5E1',

      white: 'FFFFFF',
      black: '0F172A',
      gray: '64748B',
    };
  },
};

export const hex = (c: string) => `#${c}`;
export const argb = (c: string) => `FF${c}`;
