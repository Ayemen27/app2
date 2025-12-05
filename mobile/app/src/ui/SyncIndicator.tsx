import React from 'react';
import type { SyncState } from '../hooks/useSync';

interface SyncIndicatorProps {
  state: SyncState;
  pendingCount?: number;
  onClick?: () => void;
}

const stateConfig: Record<SyncState, { icon: string; color: string; label: string }> = {
  synced: { icon: '✓', color: '#22c55e', label: 'تمت المزامنة' },
  syncing: { icon: '↻', color: '#3b82f6', label: 'جاري المزامنة...' },
  pending: { icon: '↑', color: '#f59e0b', label: 'ينتظر المزامنة' },
  offline: { icon: '✕', color: '#6b7280', label: 'غير متصل' },
  error: { icon: '⚠', color: '#ef4444', label: 'خطأ في المزامنة' },
  conflict: { icon: '!', color: '#eab308', label: 'يوجد تضارب' }
};

export function SyncIndicator({ state, pendingCount = 0, onClick }: SyncIndicatorProps) {
  const config = stateConfig[state];

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: `${config.color}20`,
        cursor: onClick ? 'pointer' : 'default'
      }}
      title={config.label}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: config.color,
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          animation: state === 'syncing' ? 'spin 1s linear infinite' : 'none'
        }}
      >
        {config.icon}
      </span>
      
      {state === 'pending' && pendingCount > 0 && (
        <span
          style={{
            fontSize: '12px',
            color: config.color,
            fontWeight: '600'
          }}
        >
          {pendingCount}
        </span>
      )}
      
      <span
        style={{
          fontSize: '14px',
          color: config.color,
          fontWeight: '500'
        }}
      >
        {config.label}
      </span>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}

export default SyncIndicator;
