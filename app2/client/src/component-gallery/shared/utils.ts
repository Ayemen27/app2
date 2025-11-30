import { ComponentState, CardState, SearchState } from './types';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  return new Promise((resolve, reject) => {
    document.execCommand('copy') ? resolve() : reject();
    textArea.remove();
  });
}

export function formatCode(code: string, language: 'html' | 'css' | 'jsx'): string {
  let formatted = code.trim();
  
  if (language === 'html' || language === 'jsx') {
    formatted = formatted
      .replace(/></g, '>\n<')
      .replace(/\n\s*\n/g, '\n');
  }
  
  return formatted;
}

export function generateId(prefix: string = 'cmp'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function getStateClasses(state: ComponentState | CardState | SearchState): string {
  const stateClassMap: Record<string, string> = {
    default: '',
    idle: '',
    normal: '',
    hover: 'hover:shadow-lg hover:-translate-y-0.5',
    focused: 'ring-2 ring-primary ring-offset-2',
    active: 'bg-primary/10',
    disabled: 'opacity-50 pointer-events-none cursor-not-allowed',
    loading: 'animate-pulse',
    error: 'border-red-500 ring-red-200',
    success: 'border-green-500 ring-green-200',
    selected: 'bg-primary/5 border-primary',
    typing: 'ring-2 ring-primary',
    'no-results': '',
  };
  
  return stateClassMap[state] || '';
}

export function getResponsiveGridCols(columns: number): string {
  const colsMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
  };
  
  return colsMap[columns] || colsMap[4];
}

export function highlightCode(code: string, language: string): string {
  const keywords = {
    html: ['class', 'id', 'src', 'alt', 'href', 'type', 'placeholder', 'aria-label', 'role'],
    jsx: ['className', 'onClick', 'onChange', 'onSubmit', 'useState', 'useEffect', 'return', 'export', 'import', 'from', 'const', 'let', 'function'],
    css: ['hover', 'focus', 'active', 'disabled', '@media', '@keyframes'],
  };
  
  return code;
}

export function getArabicNumber(num: number): string {
  const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNums[parseInt(d)] || d).join('');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
  }).format(amount);
}

export const keyboardNavigation = {
  handleArrowKeys: (
    event: React.KeyboardEvent,
    currentIndex: number,
    maxIndex: number,
    onNavigate: (index: number) => void
  ) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault();
        onNavigate(currentIndex < maxIndex ? currentIndex + 1 : 0);
        break;
      case 'ArrowUp':
      case 'ArrowRight':
        event.preventDefault();
        onNavigate(currentIndex > 0 ? currentIndex - 1 : maxIndex);
        break;
      case 'Home':
        event.preventDefault();
        onNavigate(0);
        break;
      case 'End':
        event.preventDefault();
        onNavigate(maxIndex);
        break;
    }
  },
  
  handleEscape: (event: React.KeyboardEvent, onClose: () => void) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  },
  
  handleEnter: (event: React.KeyboardEvent, onSubmit: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  },
};
