/**
 * 🎯 Canonical JSON — تسلسل ثابت يتجاهل ترتيب الحقول
 * يُستخدم في كشف النزاع لتجنّب false-positives بسبب ترتيب الكائنات.
 *
 * بديل خفيف لـ json-stable-stringify بدون اعتماديات إضافية.
 */

export function canonicalStringify(value: unknown): string {
  return stringify(value);
}

function stringify(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'null';
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v as number) ? String(v) : 'null';
  if (t === 'boolean') return String(v);
  if (t === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) {
    return '[' + v.map(stringify).join(',') + ']';
  }
  if (t === 'object') {
    const keys = Object.keys(v as object).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const val = (v as Record<string, unknown>)[k];
      if (val === undefined) continue;
      parts.push(JSON.stringify(k) + ':' + stringify(val));
    }
    return '{' + parts.join(',') + '}';
  }
  return 'null';
}

/** مقارنة عميقة باستخدام canonical JSON */
export function deepEqualCanonical(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return canonicalStringify(a) === canonicalStringify(b);
}

/**
 * Deep merge آمن (يدمج الكائنات المتداخلة بدلاً من استبدالها)
 * - المصفوفات تُستبدل (لا تُدمج لتجنّب التكرار غير المتوقع)
 * - null/undefined من المصدر تُتجاهل
 * - الأنواع المختلفة → تُستبدل بقيمة المصدر (source)
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  if (source === null || source === undefined) return target;
  if (typeof target !== 'object' || target === null) return source as T;
  if (typeof source !== 'object') return source as T;
  if (Array.isArray(source) || Array.isArray(target)) return source as T;

  const out: any = { ...(target as any) };
  for (const key of Object.keys(source as any)) {
    const sv = (source as any)[key];
    if (sv === undefined) continue;
    const tv = (target as any)[key];
    if (
      tv && sv && typeof tv === 'object' && typeof sv === 'object'
      && !Array.isArray(tv) && !Array.isArray(sv)
    ) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out as T;
}
