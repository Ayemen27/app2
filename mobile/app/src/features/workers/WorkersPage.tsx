import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDatabase } from '../../db/rxdb';
import type { Worker } from '../../db/schema';

export function WorkersPage() {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    async function loadWorkers() {
      try {
        const db = await getDatabase();
        const docs = await db.workers.find().where('isDeleted').eq(false).exec();
        let workersList = docs.map(doc => doc.toJSON() as Worker);
        
        if (searchValue) {
          const search = searchValue.toLowerCase();
          workersList = workersList.filter(w => 
            w.name.toLowerCase().includes(search) ||
            w.phone?.includes(search)
          );
        }
        
        workersList.sort((a, b) => b.createdAt - a.createdAt);
        setWorkers(workersList);
      } catch (error) {
        console.error('خطأ في تحميل العمال:', error);
      } finally {
        setLoading(false);
      }
    }

    loadWorkers();
  }, [searchValue]);

  const getWorkerTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      skilled: 'ماهر',
      unskilled: 'عادي',
      supervisor: 'مشرف',
      driver: 'سائق',
      other: 'أخرى',
    };
    return <span className="badge badge-info">{labels[type] || type}</span>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'badge badge-success',
      inactive: 'badge badge-warning',
      terminated: 'badge badge-error',
    };
    const labels: Record<string, string> = {
      active: 'نشط',
      inactive: 'غير نشط',
      terminated: 'منتهي',
    };
    return <span className={styles[status] || 'badge'}>{labels[status] || status}</span>;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري تحميل العمال...</p>
      </div>
    );
  }

  return (
    <div className="workers-page">
      <div className="page-header">
        <h2 className="page-title">{t('workers.title')}</h2>
        <button className="btn btn-primary">+ إضافة</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{workers.length}</div>
          <div className="stat-label">إجمالي العمال</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {workers.filter(w => w.status === 'active').length}
          </div>
          <div className="stat-label">نشط</div>
        </div>
      </div>

      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="بحث في العمال..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <span className="search-icon">🔍</span>
      </div>

      {workers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👷</div>
          <p className="empty-state-text">{t('workers.noWorkers')}</p>
          <button className="btn btn-primary">{t('workers.addWorker')}</button>
        </div>
      ) : (
        <div className="workers-list">
          {workers.map(worker => (
            <div key={worker.id} className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    background: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}>
                    👷
                  </div>
                  <div>
                    <span className="card-title">{worker.name}</span>
                    {worker.phone && (
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                        {worker.phone}
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge(worker.status)}
              </div>
              <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {getWorkerTypeBadge(worker.workerType)}
                  <span style={{ fontWeight: 600, color: '#1e3a5f' }}>
                    {worker.dailyWage.toLocaleString()} ريال/يوم
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab">+</button>
    </div>
  );
}

export default WorkersPage;
