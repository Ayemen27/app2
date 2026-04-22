/**
 * 🎨 الهوية البصرية الموحدة لجميع تقارير AXION
 * Single source of truth for brand identity across all export templates (Excel + PDF + UI).
 * Inspired by enterprise standards (Google, Microsoft, Atlassian) — clean navy/slate palette
 * with accessible contrast ratios (WCAG AA+).
 */

export const BRAND = {
  company: {
    name: 'الفتيني للمقاولات العامة والاستشارات الهندسية',
    nameEn: 'Al-Fatihi Contracting & Engineering Consultancy',
    address: 'الجمهورية اليمنية',
    phone: '+967 XXX XXX XXX',
    email: 'info@alfatihi.com',
    website: 'www.alfatihi.com',
  },

  colors: {
    mainBlue: '1E3A8A',
    mainBlueDark: '1E2A6B',
    accentBlue: '3B82F6',
    slateHeader: '334155',
    slateMid: '475569',
    slateLight: '64748B',

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
  },
} as const;

export const hex = (c: string) => `#${c}`;
export const argb = (c: string) => `FF${c}`;
