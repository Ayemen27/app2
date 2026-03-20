type LogEntry = { time: string; stage: string; data: any };

const _logs: LogEntry[] = [];
let _listeners: Array<() => void> = [];
let _enabled = true;

function now() {
  return new Date().toISOString().split('T')[1].replace('Z', '');
}

export function trackLog(stage: string, data: any = {}) {
  if (!_enabled) return;
  const entry: LogEntry = { time: now(), stage, data };
  _logs.push(entry);
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

if (typeof window !== 'undefined') {
  (window as any).__track = trackLog;
  (window as any).__getLogs = getLogs;
  (window as any).__getLogsText = getLogsText;
}

trackLog('MODULE_LOAD', {
  url: typeof window !== 'undefined' ? window.location.href : 'ssr',
  protocol: typeof window !== 'undefined' ? window.location.protocol : 'ssr',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 120) : 'ssr',
  capacitorExists: typeof window !== 'undefined' ? !!(window as any).Capacitor : false,
  capacitorIsNative: typeof window !== 'undefined' ? (window as any).Capacitor?.isNativePlatform?.() : false,
  capacitorPlatform: typeof window !== 'undefined' ? (window as any).Capacitor?.getPlatform?.() : 'N/A',
});
