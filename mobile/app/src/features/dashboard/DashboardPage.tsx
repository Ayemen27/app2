import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getDatabase } from '../../db/rxdb';

interface DashboardStats {
  projects: { total: number; active: number };
  workers: { total: number; active: number };
  attendance: { today: number; total: number };
  pending: number;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    projects: { total: 0, active: 0 },
    workers: { total: 0, active: 0 },
    attendance: { today: 0, total: 0 },
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const db = await getDatabase();
        
        const projects = await db.projects.find().where('isDeleted').eq(false).exec();
        const workers = await db.workers.find().where('isDeleted').eq(false).exec();
        const attendance = await db.attendance.find().where('isDeleted').eq(false).exec();
        
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAttendance = attendance.filter(a => a.toJSON().date === todayStr);
        
        let pendingCount = 0;
        projects.forEach(p => { if (p.toJSON().syncStatus === 'pending') pendingCount++; });
        workers.forEach(w => { if (w.toJSON().syncStatus === 'pending') pendingCount++; });
        attendance.forEach(a => { if (a.toJSON().syncStatus === 'pending') pendingCount++; });

        setStats({
          projects: {
            total: projects.length,
            active: projects.filter(p => p.toJSON().status === 'active').length,
          },
          workers: {
            total: workers.length,
            active: workers.filter(w => w.toJSON().status === 'active').length,
          },
          attendance: {
            today: todayAttendance.length,
            total: attendance.length,
          },
          pending: pendingCount,
        });
      } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2 className="page-title">{t('navigation.dashboard')}</h2>
      </div>

      {stats.pending > 0 && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>⏳</span>
          <span style={{ color: '#92400e' }}>
            {stats.pending} عنصر ينتظر المزامنة
          </span>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div 
          className="stat-card" 
          onClick={() => navigate('/projects')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏗️</div>
          <div className="stat-value">{stats.projects.total}</div>
          <div className="stat-label">المشاريع</div>
          <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>
            {stats.projects.active} نشط
          </div>
        </div>

        <div 
          className="stat-card"
          onClick={() => navigate('/workers')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👷</div>
          <div className="stat-value">{stats.workers.total}</div>
          <div className="stat-label">العمال</div>
          <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>
            {stats.workers.active} نشط
          </div>
        </div>

        <div 
          className="stat-card"
          onClick={() => navigate('/attendance')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
          <div className="stat-value">{stats.attendance.today}</div>
          <div className="stat-label">حضور اليوم</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            إجمالي: {stats.attendance.total}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
          <div className="stat-value" style={{ color: stats.pending > 0 ? '#f59e0b' : '#22c55e' }}>
            {stats.pending > 0 ? stats.pending : '✓'}
          </div>
          <div className="stat-label">
            {stats.pending > 0 ? 'ينتظر المزامنة' : 'متزامن'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
          الوصول السريع
        </h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <button 
            className="btn btn-primary" 
            style={{ justifyContent: 'flex-start', padding: '1rem' }}
            onClick={() => navigate('/attendance')}
          >
            <span style={{ marginLeft: '0.5rem' }}>📋</span>
            تسجيل حضور جديد
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '1rem' }}
            onClick={() => navigate('/projects')}
          >
            <span style={{ marginLeft: '0.5rem' }}>🏗️</span>
            إضافة مشروع جديد
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ justifyContent: 'flex-start', padding: '1rem' }}
            onClick={() => navigate('/workers')}
          >
            <span style={{ marginLeft: '0.5rem' }}>👷</span>
            إضافة عامل جديد
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
