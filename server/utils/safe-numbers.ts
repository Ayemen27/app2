export function safeParseNum(val: any, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  const str = String(val).replace(/,/g, '').trim();
  if (str === '' || str.toLowerCase() === 'nan' || str.toLowerCase().includes('infinity')) return fallback;
  const n = Number(str);
  return Number.isFinite(n) ? n : fallback;
}
