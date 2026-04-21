/**
 * 🔒 قفل تنفيذ موحّد للمزامنة عبر التبويبات
 * يستخدم Web Locks API (مدعوم في كل المتصفحات الحديثة + WebView على Android/iOS)
 *
 * الهدف: منع race condition بين:
 *   - sync.ts (المحرّك الرئيسي)
 *   - silent-sync.ts (المزامنة الخلفية)
 *   - تبويبات متعددة من نفس المستخدم
 *
 * عند غياب Web Locks (متصفحات قديمة جداً أو SSR)، يتراجع لقفل وعد مشترك في الذاكرة.
 */

const LOCK_PREFIX = 'binarjoin:sync:';
const memoryLocks = new Map<string, Promise<unknown>>();

export interface MutexOptions {
  /** إذا true، يعود فوراً بدل الانتظار عند وجود قفل */
  ifAvailable?: boolean;
  /** مهلة قصوى بالـ ms لانتظار القفل (الافتراضي: لا مهلة) */
  timeoutMs?: number;
}

export class MutexBusyError extends Error {
  constructor(name: string) {
    super(`القفل '${name}' مشغول`);
    this.name = 'MutexBusyError';
  }
}

export class MutexTimeoutError extends Error {
  constructor(name: string, ms: number) {
    super(`انتهت مهلة انتظار القفل '${name}' بعد ${ms}ms`);
    this.name = 'MutexTimeoutError';
  }
}

function hasWebLocks(): boolean {
  return typeof navigator !== 'undefined'
    && typeof (navigator as any).locks?.request === 'function';
}

async function withWebLock<T>(
  name: string,
  opts: MutexOptions,
  fn: () => Promise<T>
): Promise<T> {
  const fullName = LOCK_PREFIX + name;
  const lockOpts: any = {};
  if (opts.ifAvailable) lockOpts.ifAvailable = true;
  if (opts.timeoutMs && opts.timeoutMs > 0) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    lockOpts.signal = ctrl.signal;
    try {
      return await (navigator as any).locks.request(fullName, lockOpts, async (lock: any) => {
        if (opts.ifAvailable && !lock) throw new MutexBusyError(name);
        return await fn();
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new MutexTimeoutError(name, opts.timeoutMs!);
      throw err;
    } finally {
      clearTimeout(t);
    }
  }
  return await (navigator as any).locks.request(fullName, lockOpts, async (lock: any) => {
    if (opts.ifAvailable && !lock) throw new MutexBusyError(name);
    return await fn();
  });
}

async function withMemoryLock<T>(
  name: string,
  opts: MutexOptions,
  fn: () => Promise<T>
): Promise<T> {
  const existing = memoryLocks.get(name);
  if (existing) {
    if (opts.ifAvailable) throw new MutexBusyError(name);
    if (opts.timeoutMs && opts.timeoutMs > 0) {
      await Promise.race([
        existing.catch(() => {}),
        new Promise((_, rej) => setTimeout(() => rej(new MutexTimeoutError(name, opts.timeoutMs!)), opts.timeoutMs)),
      ]);
    } else {
      await existing.catch(() => {});
    }
  }
  const p = (async () => fn())();
  memoryLocks.set(name, p);
  try {
    return await p;
  } finally {
    if (memoryLocks.get(name) === p) memoryLocks.delete(name);
  }
}

/**
 * نفّذ `fn` تحت قفل اسمي. إذا كان `ifAvailable` true ولم يكن القفل متاحاً
 * يرمي MutexBusyError دون انتظار.
 */
export async function withMutex<T>(
  name: string,
  fn: () => Promise<T>,
  opts: MutexOptions = {}
): Promise<T> {
  if (hasWebLocks()) return withWebLock(name, opts, fn);
  return withMemoryLock(name, opts, fn);
}

/** أسماء أقفال موحّدة لتجنّب الأخطاء الإملائية */
export const SYNC_LOCKS = {
  OUTBOX_FLUSH: 'outbox-flush',
  TOKEN_REFRESH: 'token-refresh',
  PULL: 'pull',
  INITIAL_PULL: 'initial-pull',
} as const;
