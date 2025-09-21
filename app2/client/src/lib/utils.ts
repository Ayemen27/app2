import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return "0 ر.ي";

  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numValue)) return "0 ر.ي";

  // استخدام الأرقام الإنجليزية للحسابات والعرض الصحيح
  return `${numValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} ر.ي`;
};

export const formatDate = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  if (isNaN(date.getTime())) {
    return 'تاريخ غير صالح';
  }

  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

// دالة جديدة لتنسيق الأرقام بالإنجليزية
export const formatNumber = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined) return "0";

  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return "0";

  // إزالة الأصفار الزائدة وتنسيق بالأرقام الإنجليزية
  if (numValue === 0) return "0";

  // تنسيق الأرقام بفواصل الآلاف للأعداد الكبيرة
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: numValue % 1 === 0 ? 0 : 2
  });
};

export function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
}

export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function calculateWorkHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;

  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);

  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

export function formatYemeniPhone(phone: string): string {
  if (!phone) return "";
  // تنسيق أرقام الهواتف اليمنية (مثال: +967-1-234567 أو 777-123-456)
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.startsWith('967')) {
    // رقم دولي
    return `+967-${cleanPhone.slice(3, 4)}-${cleanPhone.slice(4)}`;
  } else if (cleanPhone.length === 9) {
    // رقم محلي
    return `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
  } else if (cleanPhone.length === 7) {
    // رقم أرضي
    return `${cleanPhone.slice(0, 1)}-${cleanPhone.slice(1)}`;
  }

  return phone;
}

export function generateYemeniPhoneExample(): string {
  const prefixes = ['77', '73', '71', '70'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 9000000) + 1000000;
  return `${prefix}${number}`;
}

// Storage utilities for autocomplete data
export const autocompleteKeys = {
  // Worker transfers
  SENDER_NAMES: 'senderNames',
  RECIPIENT_NAMES: 'recipientNames',
  RECIPIENT_PHONES: 'recipientPhones',

  // Material purchases
  SUPPLIER_NAMES: 'supplierNames',
  MATERIAL_CATEGORIES: 'materialCategories',
  MATERIAL_UNITS: 'materialUnits',
  MATERIAL_NAMES: 'materialNames',
  INVOICE_NUMBERS: 'invoiceNumbers',

  // Transportation
  TRANSPORT_DESCRIPTIONS: 'transportDescriptions',

  // Fund transfers
  TRANSFER_NUMBERS: 'transferNumbers',
  FUND_TRANSFER_TYPES: 'fundTransferTypes',

  // Worker attendance
  WORK_DESCRIPTIONS: 'workDescriptions',

  // Projects and Workers
  PROJECT_NAMES: 'projectNames',
  WORKER_NAMES: 'workerNames',

  // General
  NOTES: 'generalNotes',
  PHONE_NUMBERS: 'phoneNumbers',
} as const;

// Note: Autocomplete functionality has been migrated to database storage
// Old localStorage-based autocomplete functions have been removed