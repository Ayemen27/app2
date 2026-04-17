import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  getLogs, getErrors, onLogsChange, onErrorsChange,
  getLogsText, isDebugEnabled, clearErrors, clearLogs,
  installGlobalErrorCapture,
  type LogEntry, type ErrorEntry,
} from '@/lib/debug-tracker';

// ─── تثبيت التقاط الأخطاء العالمي ───────────────────────
if (isDebugEnabled()) {
  installGlobalErrorCapture();
}

type TabId = 'logs' | 'errors' | 'api';

const ADMIN_ROLES = ['admin', 'super_admin'];

export function DebugOverlay() {
  const enabled = isDebugEnabled();
  const { user } = useAuth();

  const isAdmin = ADMIN_ROLES.includes(user?.role || '');

  const [visible,  setVisible]  = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('errors');
  const [logs,     setLogs]     = useState<LogEntry[]>(getLogs());
  const [errors,   setErrors]   = useState<ErrorEntry[]>(getErrors());
  const [copied,   setCopied]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tapCount  = useRef(0);
  const tapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !isAdmin) return;
    const u1 = onLogsChange(()   => setLogs([...getLogs()]));
    const u2 = onErrorsChange(() => setErrors([...getErrors()]));
    return () => { u1(); u2(); };
  }, [enabled, isAdmin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, errors, visible, activeTab]);

  // لا تُظهر لغير المسؤولين أو إذا كان التتبع معطلاً
  if (!enabled || !isAdmin) return null;

  // ─── المنطق ───────────────────────────────────────────
  const handleTripleTap = () => {
    tapCount.current++;
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      setVisible(v => !v);
      if (tapTimer.current) clearTimeout(tapTimer.current);
      return;
    }
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 700);
  };

  const handleCopyAll = () => {
    const text = getLogsText();
    const write = (t: string) => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(t).catch(() => fallbackCopy(t));
      } else {
        fallbackCopy(t);
      }
    };
    const fallbackCopy = (t: string) => {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.cssText = 'position:fixed;left:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    };
    write(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── حسابات ───────────────────────────────────────────
  const jsErrors    = errors.filter(e => e.type === 'js_error');
  const promErrors  = errors.filter(e => e.type === 'promise_rejection');
  const apiErrors   = errors.filter(e => e.type === 'api_error');
  const consErrors  = errors.filter(e => e.type === 'console_error');
  const manualErrs  = errors.filter(e => e.type === 'manual');
  const hardErrors  = errors.filter(e => e.severity === 'error');
  const warnErrors  = errors.filter(e => e.severity === 'warn');

  const apiForTab   = apiErrors;
  const coreErrors  = [...jsErrors, ...promErrors, ...consErrors, ...manualErrs];
  const logEntries  = logs;

  const totalBadge = hardErrors.length > 0
    ? `⛔${hardErrors.length}`
    : warnErrors.length > 0
    ? `⚠${warnErrors.length}`
    : `${logs.length}`;

  const badgeColor  = hardErrors.length > 0 ? '#cc0000' : warnErrors.length > 0 ? '#cc7700' : '#333';

  // ─── رنگ‌ها ─────────────────────────────────────────
  const getLogColor = (entry: LogEntry) => {
    if (entry.severity === 'error' || entry.stage.includes('ERROR') || entry.stage.includes('FAIL')) return '#ff5555';
    if (entry.severity === 'warn'  || entry.stage.includes('WARN'))  return '#ffaa33';
    if (entry.stage.includes('OK') || entry.stage.includes('SUCCESS') || entry.stage.includes('COMPLETE')) return '#44cc44';
    if (entry.stage.includes('FETCH') || entry.stage.includes('REQUEST')) return '#44aaff';
    if (entry.stage.includes('RESPONSE')) return '#bb88ff';
    return '#cccccc';
  };

  const getErrTypeLabel = (type: ErrorEntry['type']) => {
    switch (type) {
      case 'js_error':          return 'JS';
      case 'promise_rejection': return 'Promise';
      case 'api_error':         return 'API';
      case 'console_error':     return 'Console';
      case 'manual':            return 'App';
      default:                  return type;
    }
  };

  const getErrTypeColor = (type: ErrorEntry['type']) => {
    switch (type) {
      case 'js_error':          return '#ff4444';
      case 'promise_rejection': return '#ff6644';
      case 'api_error':         return '#ffaa00';
      case 'console_error':     return '#ff5599';
      case 'manual':            return '#cc44ff';
      default:                  return '#999';
    }
  };

  const getStatusColor = (status?: number) => {
    if (!status) return '#999';
    if (status >= 500) return '#ff4444';
    if (status >= 400) return '#ffaa00';
    return '#44cc44';
  };

  // ─── المكوّن المصغّر للخطأ ──────────────────────────
  const ErrorItem = ({ err }: { err: ErrorEntry }) => {
    const [expanded, setExpanded] = useState(false);
    return (
      <div
        style={{
          marginBottom: 4, padding: '4px 6px',
          background: err.severity === 'error' ? '#1a0000' : '#1a1000',
          borderLeft: `3px solid ${err.severity === 'error' ? '#cc2222' : '#cc7700'}`,
          borderRadius: 2, cursor: err.stack ? 'pointer' : 'default',
        }}
        onClick={() => err.stack && setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#666', fontSize: 10 }}>{err.time.substring(0, 12)}</span>
          <span style={{ background: getErrTypeColor(err.type), color: '#000', padding: '0 4px', borderRadius: 2, fontSize: 9, fontWeight: 'bold' }}>
            {getErrTypeLabel(err.type)}
          </span>
          {err.status && (
            <span style={{ color: getStatusColor(err.status), fontWeight: 'bold', fontSize: 10 }}>
              {err.method} {err.status}
            </span>
          )}
          {err.stack && <span style={{ color: '#555', fontSize: 9 }}>▼</span>}
        </div>
        <div style={{ color: err.severity === 'error' ? '#ff8888' : '#ffcc66', fontSize: 11, marginTop: 2, wordBreak: 'break-all' }}>
          {err.message.substring(0, 200)}
        </div>
        {err.url && (
          <div style={{ color: '#888', fontSize: 10, marginTop: 1 }}>
            → {err.url.substring(0, 120)}
          </div>
        )}
        {expanded && err.stack && (
          <pre style={{ color: '#777', fontSize: 9, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 100, overflow: 'auto' }}>
            {err.stack.split('\n').slice(0, 8).join('\n')}
          </pre>
        )}
      </div>
    );
  };

  // ─── تعريف التبويبات ─────────────────────────────────
  const tabs: { id: TabId; label: string; count: number; color: string }[] = [
    { id: 'errors', label: 'أخطاء', count: coreErrors.length, color: coreErrors.filter(e => e.severity==='error').length ? '#cc2222' : '#667' },
    { id: 'api',    label: 'API',   count: apiForTab.length,  color: apiForTab.filter(e => e.severity==='error').length ? '#cc6600' : '#667' },
    { id: 'logs',   label: 'سجلات', count: logEntries.length, color: '#446' },
  ];

  return (
    <>
      {/* ─── زر التفعيل ─── */}
      <div
        onClick={handleTripleTap}
        data-testid="debug-trigger"
        title="3 نقرات لفتح لوحة التتبع (للمسؤولين فقط)"
        style={{
          position: 'fixed', bottom: 8, left: 8, zIndex: 99999,
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: visible ? '#cc0000' : badgeColor,
          opacity: 0.75, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#fff', fontWeight: 'bold',
          border: '1px solid #555', letterSpacing: -0.5,
          userSelect: 'none',
        }}
      >
        {totalBadge}
      </div>

      {/* ─── اللوحة الرئيسية ─── */}
      {visible && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '60vh', zIndex: 99998,
          backgroundColor: '#0a0a0aee',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'monospace', fontSize: 11, color: '#eee',
          borderTop: '2px solid #cc3300',
          backdropFilter: 'blur(4px)',
        }}>
          {/* رأس اللوحة */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 8px', backgroundColor: '#111', borderBottom: '1px solid #222',
            flexShrink: 0,
          }}>
            <span style={{ color: '#cc3300', fontWeight: 'bold', fontSize: 12 }}>
              AXION DEBUG
              {hardErrors.length > 0 && (
                <span style={{ background: '#cc0000', color: '#fff', padding: '1px 5px', borderRadius: 3, marginRight: 6, fontSize: 10 }}>
                  ⛔ {hardErrors.length} خطأ
                </span>
              )}
              {warnErrors.length > 0 && (
                <span style={{ background: '#cc6600', color: '#fff', padding: '1px 5px', borderRadius: 3, marginRight: 4, fontSize: 10 }}>
                  ⚠ {warnErrors.length} تحذير
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleCopyAll}
                style={{ background: copied ? '#226622' : '#333', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}
              >
                {copied ? '✓ تم النسخ' : 'نسخ الكل'}
              </button>
              <button
                onClick={() => { clearErrors(); clearLogs(); }}
                style={{ background: '#441111', color: '#ff8888', border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}
              >
                مسح
              </button>
              <button
                onClick={() => setVisible(false)}
                style={{ background: '#770000', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* التبويبات */}
          <div style={{ display: 'flex', background: '#0d0d0d', borderBottom: '1px solid #222', flexShrink: 0 }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '5px 14px', border: 'none', cursor: 'pointer', fontSize: 11,
                  background: activeTab === tab.id ? '#1a1a1a' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#888',
                  borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    background: tab.color, color: '#fff', borderRadius: 8,
                    padding: '0 5px', fontSize: 9, fontWeight: 'bold',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* المحتوى */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>

            {/* تبويب الأخطاء */}
            {activeTab === 'errors' && (
              <>
                {coreErrors.length === 0 ? (
                  <div style={{ color: '#44aa44', textAlign: 'center', padding: '30px 0' }}>
                    ✓ لا توجد أخطاء
                  </div>
                ) : (
                  <>
                    {/* ملخص */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      {jsErrors.length   > 0 && <span style={{ background: '#300', color: '#f55', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>JS: {jsErrors.length}</span>}
                      {promErrors.length > 0 && <span style={{ background: '#301', color: '#f75', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>Promise: {promErrors.length}</span>}
                      {consErrors.length > 0 && <span style={{ background: '#302', color: '#f59', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>Console: {consErrors.length}</span>}
                      {manualErrs.length > 0 && <span style={{ background: '#203', color: '#c4f', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>App: {manualErrs.length}</span>}
                    </div>
                    {[...coreErrors].reverse().map(err => <ErrorItem key={err.id} err={err} />)}
                  </>
                )}
              </>
            )}

            {/* تبويب API */}
            {activeTab === 'api' && (
              <>
                {apiForTab.length === 0 ? (
                  <div style={{ color: '#44aa44', textAlign: 'center', padding: '30px 0' }}>
                    ✓ لا توجد أخطاء API
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ background: '#300', color: '#f55', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>5xx: {apiForTab.filter(e=>e.status&&e.status>=500).length}</span>
                      <span style={{ background: '#330', color: '#fa0', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>4xx: {apiForTab.filter(e=>e.status&&e.status>=400&&e.status<500).length}</span>
                      <span style={{ background: '#030', color: '#4f4', padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>شبكة: {apiForTab.filter(e=>!e.status).length}</span>
                    </div>
                    {[...apiForTab].reverse().map(err => <ErrorItem key={err.id} err={err} />)}
                  </>
                )}
              </>
            )}

            {/* تبويب السجلات */}
            {activeTab === 'logs' && (
              logEntries.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center', padding: '30px 0' }}>لا توجد سجلات</div>
              ) : (
                [...logEntries].map((log, i) => (
                  <div key={log.id || i} style={{ marginBottom: 2, lineHeight: 1.4, wordBreak: 'break-all' }}>
                    <span style={{ color: '#555' }}>{log.time.substring(0, 12)} </span>
                    <span style={{ color: getLogColor(log), fontWeight: 'bold' }}>{log.stage} </span>
                    <span style={{ color: '#999' }}>
                      {typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)}
                    </span>
                  </div>
                ))
              )
            )}
          </div>

          {/* شريط الحالة السفلي */}
          <div style={{
            padding: '3px 8px', background: '#0d0d0d', borderTop: '1px solid #1a1a1a',
            display: 'flex', gap: 12, fontSize: 10, color: '#555', flexShrink: 0,
          }}>
            <span>📋 سجلات: {logs.length}</span>
            <span style={{ color: hardErrors.length ? '#cc3333' : '#555' }}>⛔ أخطاء: {hardErrors.length}</span>
            <span style={{ color: warnErrors.length ? '#cc6600' : '#555' }}>⚠ تحذيرات: {warnErrors.length}</span>
            <span>🌐 API: {apiErrors.length}</span>
            <span style={{ marginRight: 'auto', color: '#334' }}>للمسؤولين فقط</span>
          </div>
        </div>
      )}
    </>
  );
}
