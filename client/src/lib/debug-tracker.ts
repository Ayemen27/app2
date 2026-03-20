type LogEntry = { time: string; stage: string; data: any };

const MAX_LOG_ENTRIES = 500;
const _logs: LogEntry[] = [];
let _listeners: Array<() => void> = [];
let _enabled = !!(import.meta.env.DEV || import.meta.env.VITE_DEBUG_OVERLAY === 'true' || (typeof window !== 'undefined' && (window as any).Capacitor));

if (!_enabled && typeof window !== 'undefined') {
  const proto = window.location?.protocol || '';
  if (proto === 'capacitor:' || proto === 'ionic:') {
    _enabled = true;
  }
  const ua = navigator?.userAgent || '';
  if (/android/i.test(ua) && /wv/i.test(ua)) {
    _enabled = true;
  }
}

function now() {
  return new Date().toISOString().split('T')[1].replace('Z', '');
}

export function trackLog(stage: string, data: any = {}) {
  if (!_enabled) return;
  const entry: LogEntry = { time: now(), stage, data };
  _logs.push(entry);
  if (_logs.length > MAX_LOG_ENTRIES) {
    _logs.splice(0, _logs.length - MAX_LOG_ENTRIES);
  }
  console.log(`[TRACK] ${stage}`, typeof data === 'object' ? JSON.stringify(data) : data);
  _listeners.forEach(fn => { try { fn(); } catch {} });
}

export function getLogs(): LogEntry[] {
  return _logs;
}

export function onLogsChange(fn: () => void) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

export function setTrackingEnabled(v: boolean) {
  _enabled = v;
}

export function getLogsText(): string {
  return _logs.map(e => `[${e.time}] ${e.stage}: ${typeof e.data === 'object' ? JSON.stringify(e.data) : e.data}`).join('\n');
}

if (typeof window !== 'undefined' && _enabled) {
  (window as any).__track = trackLog;
  (window as any).__getLogs = getLogs;
  (window as any).__getLogsText = getLogsText;
}

export function isDebugEnabled() {
  return _enabled;
}

trackLog('MODULE_LOAD', {
  url: typeof window !== 'undefined' ? window.location.href : 'ssr',
  protocol: typeof window !== 'undefined' ? window.location.protocol : 'ssr',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 120) : 'ssr',
  capacitorExists: typeof window !== 'undefined' ? !!(window as any).Capacitor : false,
  capacitorIsNative: typeof window !== 'undefined' ? (window as any).Capacitor?.isNativePlatform?.() : false,
  capacitorPlatform: typeof window !== 'undefined' ? (window as any).Capacitor?.getPlatform?.() : 'N/A',
});
