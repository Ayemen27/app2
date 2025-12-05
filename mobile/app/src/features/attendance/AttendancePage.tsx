import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDatabase } from '../../db/rxdb';
import type { WorkerAttendance } from '../../db/schema';

export function AttendancePage() {
  const { t } = useTranslation();
  const [attendance, setAttendance] = useState<WorkerAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttendance() {
      try {
        const db = await getDatabase();
        const docs = await db.attendance.find().where('isDeleted').eq(false).exec();
        const list = docs.map(doc => doc.toJSON() as WorkerAttendance);
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAttendance(list);
      } catch (error) {
        console.error('خطأ في تحميل الحضور:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = attendance.filter(a => a.date === todayStr).length;
  const totalWorkDays = attendance.reduce((sum, a) => sum + a.workDays, 0);
  const totalPaid = attendance.reduce((sum, a) => sum + a.paidAmount, 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري تحميل الحضور...</p>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h2 className="page-title">{t('attendance.title')}</h2>
        <button className="btn btn-primary">+ تسجيل</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{todayCount}</div>
          <div className="stat-label">حضور اليوم</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{attendance.length}</div>
          <div className="stat-label">إجمالي السجلات</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalWorkDays}</div>
          <div className="stat-label">أيام العمل</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {totalPaid.toLocaleString()}
          </div>
          <div className="stat-label">المدفوع (ريال)</div>
        </div>
      </div>

      {attendance.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">{t('attendance.noAttendance')}</p>
          <button className="btn btn-primary">{t('attendance.recordAttendance')}</button>
        </div>
      ) : (
        <div className="attendance-list">
          {attendance.map(record => (
            <div key={record.id} className="card">
              <div className="card-header">
                <span className="card-title">{formatDate(record.date)}</span>
                <span className={record.syncStatus === 'synced' ? 'badge badge-success' : 'badge badge-warning'}>
                  {record.syncStatus === 'synced' ? '✓' : '↑'}
                </span>
              </div>
              <div className="card-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e3a5f' }}>{record.workDays}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>أيام</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e3a5f' }}>{record.dailyWage}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>الأجر</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#22c55e' }}>{record.paidAmount}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>المدفوع</div>
                  </div>
                </div>
                {record.notes && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    📝 {record.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab">+</button>
    </div>
  );
}

export default AttendancePage;
