// ═══════════════════════════════════════════════════════
//  AXION Debug Tracker — نظام التتبع الشامل
// ═══════════════════════════════════════════════════════

export type LogSeverity = 'info' | 'warn' | 'error';

export type LogEntry = {
  id: string;
  time: string;
  stage: string;
  data: any;
  severity: LogSeverity;
};

export type ErrorEntry = {
  id: string;
  time: string;
  type: 'js_error' | 'promise_rejection' | 'api_error' | 'console_error' | 'manual';
  severity: 'error' | 'warn';
  message: string;
  stack?: string;
  url?: string;
  status?: number;
  method?: string;
  extra?: any;
};

const MAX_LOG_ENTRIES  = 800;
const MAX_ERR_ENTRIES  = 200;

const _logs:   LogEntry[]   = [];
const _errors: ErrorEntry[] = [];

let _logListeners:   Array<() => void> = [];
let _errorListeners: Array<() => void> = [];

// ─── تفعيل التتبع ────────────────────────────────────────
let _enabled = !!(
  import.meta.env.DEV ||
  import.meta.env.VITE_DEBUG_OVERLAY === 'true' ||
  (typeof window !== 'undefined' && (window as any).Capacitor)
);

if (!_enabled && typeof window !== 'undefined') {
  const proto = window.location?.protocol || '';
  if (proto === 'capacitor:' || proto === 'ionic:') _enabled = true;
  const ua = navigator?.userAgent || '';
  if (/android/i.test(ua) && /wv/i.test(ua)) _enabled = true;
}

// ─── مساعدات ─────────────────────────────────────────────
let _idCounter = 0;
function genId() { return `${Date.now()}-${++_idCounter}`; }

function now() {
  return new Date().toISOString().split('T')[1].replace('Z', '');
}

function notifyLogs()   { _logListeners.forEach(fn   => { try { fn(); } catch {} }); }
function notifyErrors() { _errorListeners.forEach(fn => { try { fn(); } catch {} }); }

function pushLog(stage: string, data: any, severity: LogSeverity = 'info') {
  const entry: LogEntry = { id: genId(), time: now(), stage, data, severity };
  _logs.push(entry);
  if (_logs.length > MAX_LOG_ENTRIES) _logs.splice(0, _logs.length - MAX_LOG_ENTRIES);
  notifyLogs();
}

function pushError(err: Omit<ErrorEntry, 'id' | 'time'>) {
  const entry: ErrorEntry = { id: genId(), time: now(), ...err };
  _errors.push(entry);
  if (_errors.length > MAX_ERR_ENTRIES) _errors.splice(0, _errors.length - MAX_ERR_ENTRIES);
  notifyErrors();
  // سجّله في اللوج أيضاً
  pushLog(`⛔ ${err.type.toUpperCase()}`, { message: err.message, ...(err.url ? { url: err.url, status: err.status } : {}) }, 'error');
}

// ─── API العامة ──────────────────────────────────────────
export function trackLog(stage: string, data: any = {}) {
  if (!_enabled) return;
  const severity: LogSeverity =
    stage.includes('ERROR') || stage.includes('FAIL') ? 'error' :
    stage.includes('WARN') ? 'warn' : 'info';
  pushLog(stage, data, severity);
  console.log(`[TRACK] ${stage}`, typeof data === 'object' ? JSON.stringify(data) : data);
}

export function trackError(message: string, extra?: any) {
  if (!_enabled) return;
  pushError({ type: 'manual', severity: 'error', message, extra });
  console.error(`[TRACK_ERROR] ${message}`, extra);
}

export function trackWarn(message: string, extra?: any) {
  if (!_enabled) return;
  pushError({ type: 'manual', severity: 'warn', message, extra });
  console.warn(`[TRACK_WARN] ${message}`, extra);
}

// ─── اشتراك التغييرات ────────────────────────────────────
export function onLogsChange(fn: () => void) {
  _logListeners.push(fn);
  return () => { _logListeners = _logListeners.filter(l => l !== fn); };
}

export function onErrorsChange(fn: () => void) {
  _errorListeners.push(fn);
  return () => { _errorListeners = _errorListeners.filter(l => l !== fn); };
}

// ─── قراءة البيانات ──────────────────────────────────────
export function getLogs():       LogEntry[]   { return _logs; }
export function getErrors():     ErrorEntry[] { return _errors; }
export function getErrorCount(): number       { return _errors.filter(e => e.severity === 'error').length; }
export function getWarnCount():  number       { return _errors.filter(e => e.severity === 'warn').length; }
export function isDebugEnabled(): boolean     { return _enabled; }
export function setTrackingEnabled(v: boolean) { _enabled = v; }

export function clearErrors() {
  _errors.splice(0, _errors.length);
  notifyErrors();
}

export function clearLogs() {
  _logs.splice(0, _logs.length);
  notifyLogs();
}

export function getLogsText(): string {
  const logLines = _logs.map(e =>
    `[${e.time}] [${e.severity.toUpperCase()}] ${e.stage}: ${
      typeof e.data === 'object' ? JSON.stringify(e.data) : e.data
    }`
  );
  const errLines = _errors.length
    ? ['\n═══ ERRORS ═══', ..._errors.map(e =>
        `[${e.time}] [${e.type}] ${e.message}${e.stack ? '\n  ' + e.stack.split('\n').slice(0,3).join('\n  ') : ''}${e.url ? `\n  → ${e.method || 'GET'} ${e.url} (${e.status})` : ''}`
      )]
    : [];
  return [...logLines, ...errLines].join('\n');
}

// ═══════════════════════════════════════════════════════
//  التقاط الأخطاء التلقائي
// ═══════════════════════════════════════════════════════
let _globalErrorsInstalled = false;

export function installGlobalErrorCapture() {
  if (!_enabled || _globalErrorsInstalled || typeof window === 'undefined') return;
  _globalErrorsInstalled = true;

  // 1. أخطاء JavaScript غير المُعالَجة
  const prevOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    pushError({
      type: 'js_error',
      severity: 'error',
      message: String(message),
      stack: error?.stack,
      extra: { source, lineno, colno },
    });
    return prevOnError ? prevOnError.call(this, message, source, lineno, colno, error) : false;
  };

  // 2. Promise rejections غير المُعالَجة
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    pushError({
      type: 'promise_rejection',
      severity: 'error',
      message: reason?.message || String(reason) || 'Unhandled Promise Rejection',
      stack: reason?.stack,
    });
  });

  // 3. console.error التقاط
  const origConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    origConsoleError(...args);
    const msg = args.map(a => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    if (msg.includes('[TRACK') || msg.includes('[TRACK_ERROR]')) return; // تجنب التكرار
    pushError({ type: 'console_error', severity: 'error', message: msg.substring(0, 500) });
  };

  // 4. Fetch interceptor — يلتقط أخطاء HTTP
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
    const method = (typeof args[1] === 'object' ? args[1]?.method : undefined) || 'GET';
    const isApiCall = url.includes('/api/');
    try {
      const res = await origFetch(...args);
      if (isApiCall && !res.ok && res.status >= 400 && res.status !== 401) {
        // نسخ الـ response لقراءة الـ body بدون استهلاكه
        const clone = res.clone();
        clone.text().then(body => {
          let parsedMsg = '';
          try { parsedMsg = JSON.parse(body)?.message || body.substring(0, 200); }
          catch { parsedMsg = body.substring(0, 200); }
          pushError({
            type: 'api_error',
            severity: res.status >= 500 ? 'error' : 'warn',
            message: parsedMsg || `HTTP ${res.status}`,
            url: url.substring(0, 200),
            status: res.status,
            method,
          });
        }).catch(() => {
          pushError({
            type: 'api_error',
            severity: res.status >= 500 ? 'error' : 'warn',
            message: `HTTP ${res.status}`,
            url: url.substring(0, 200),
            status: res.status,
            method,
          });
        });
      }
      return res;
    } catch (err: any) {
      if (isApiCall) {
        pushError({
          type: 'api_error',
          severity: 'error',
          message: err?.message || 'Network Error',
          url: url.substring(0, 200),
          method,
          stack: err?.stack,
        });
      }
      throw err;
    }
  };
}

// ─── تعريض للنافذة ───────────────────────────────────────
if (typeof window !== 'undefined' && _enabled) {
  (window as any).__track       = trackLog;
  (window as any).__trackError  = trackError;
  (window as any).__getLogs     = getLogs;
  (window as any).__getErrors   = getErrors;
  (window as any).__getLogsText = getLogsText;
}

// ─── سجل أول رسالة ──────────────────────────────────────
trackLog('MODULE_LOAD', {
  url:             typeof window !== 'undefined' ? window.location.href : 'ssr',
  protocol:        typeof window !== 'undefined' ? window.location.protocol : 'ssr',
  userAgent:       typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 120) : 'ssr',
  capacitorExists: typeof window !== 'undefined' ? !!(window as any).Capacitor : false,
});
