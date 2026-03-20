import { useState, useEffect, useRef } from 'react';
import { getLogs, onLogsChange, getLogsText, isDebugEnabled } from '@/lib/debug-tracker';

export function DebugOverlay() {
  const enabled = isDebugEnabled();
  const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
  const [visible, setVisible] = useState(isCapacitor);
  const [logs, setLogs] = useState(getLogs());
  const scrollRef = useRef<HTMLDivElement>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) return;
    return onLogsChange(() => {
      setLogs([...getLogs()]);
    });
  }, [enabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, visible]);

  if (!enabled) return null;

  const handleTripleTap = () => {
    tapCount.current++;
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      setVisible(v => !v);
      if (tapTimer.current) clearTimeout(tapTimer.current);
      return;
    }
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 600);
  };

  const copyLogs = () => {
    const text = getLogsText();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('تم نسخ السجلات (' + logs.length + ' سطر)');
  };

  const getStageColor = (stage: string) => {
    if (stage.includes('ERROR') || stage.includes('FAIL')) return '#ff4444';
    if (stage.includes('WARN')) return '#ffaa00';
    if (stage.includes('SUCCESS') || stage.includes('OK') || stage.includes('COMPLETE')) return '#44ff44';
    if (stage.includes('FETCH') || stage.includes('REQUEST')) return '#44aaff';
    if (stage.includes('RESPONSE')) return '#aa88ff';
    return '#cccccc';
  };

  return (
    <>
      <div
        onClick={handleTripleTap}
        data-testid="debug-trigger"
        style={{
          position: 'fixed', bottom: 8, left: 8, zIndex: 99999,
          width: 30, height: 30, borderRadius: '50%',
          backgroundColor: visible ? '#ff4444' : '#333',
          opacity: 0.6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', fontWeight: 'bold',
        }}
      >
        {logs.length}
      </div>

      {visible && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '55vh', zIndex: 99998,
          backgroundColor: '#000000ee',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'monospace', fontSize: 11, color: '#eee',
          borderTop: '2px solid #ff6600',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '4px 8px',
            backgroundColor: '#111', borderBottom: '1px solid #333',
          }}>
            <span style={{ color: '#ff6600', fontWeight: 'bold' }}>
              AXION DEBUG ({logs.length})
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyLogs}
                style={{ background: '#333', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                نسخ
              </button>
              <button onClick={() => setVisible(false)}
                style={{ background: '#c00', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                ✕
              </button>
            </div>
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 2, lineHeight: 1.4, wordBreak: 'break-all' }}>
                <span style={{ color: '#666' }}>{log.time.substring(0, 12)} </span>
                <span style={{ color: getStageColor(log.stage), fontWeight: 'bold' }}>{log.stage} </span>
                <span style={{ color: '#aaa' }}>
                  {typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
