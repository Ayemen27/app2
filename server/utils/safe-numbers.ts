export function safeParseNum(val: any, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  const str = String(val).replace(/,/g, '').trim();
  if (str === '' || str.toLowerCase() === 'nan' || str.toLowerCase().includes('infinity')) return fallback;
  const n = Number(str);
  return Number.isFinite(n) ? n : fallback;
}

export function safeParseAmount(val: any, context?: string): number {
  const n = safeParseNum(val, NaN);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid amount${context ? ` (${context})` : ''}: received "${val}" which is not a valid number`);
  }
  return n;
}
