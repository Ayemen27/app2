import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// دالة تنسيق العملة
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0 ر.س';
  
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

// دالة تنسيق التاريخ
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '--';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '--';
    
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.warn('Error formatting date:', error);
    return '--';
  }
}

// دالة الحصول على التاريخ الحالي بصيغة YYYY-MM-DD
export function getCurrentDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// دالة تنسيق التاريخ والوقت
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '--';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '--';
    
    return format(dateObj, 'yyyy-MM-dd HH:mm');
  } catch (error) {
    console.warn('Error formatting datetime:', error);
    return '--';
  }
}

// دالة تنسيق الرقم
export function formatNumber(num: number | string): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0';
  
  return new Intl.NumberFormat('ar-SA').format(numValue);
}
