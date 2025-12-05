import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getWorker, deleteWorker, updateWorker } from './repo';
import { getWorkerAttendanceSummary } from '../attendance/repo';
import type { Worker } from '../../db/schema';

interface AttendanceSummary {
  totalDays: number;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  lastAttendance: string | null;
}

export function WorkerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [worker, setWorker] = useState<Worker | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    workerType: '' as Worker['workerType'],
    dailyWage: 0,
    status: '' as Worker['status'],
    notes: '',
  });

  const loadWorker = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getWorker(id);
      setWorker(data);
      
      if (data) {
        setEditForm({
          name: data.name,
          phone: data.phone || '',
          workerType: data.workerType,
          dailyWage: data.dailyWage,
          status: data.status,
          notes: data.notes || '',
        });
        
        const summary = await getWorkerAttendanceSummary(id);
        setAttendanceSummary(summary);
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات العامل:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorker();
  }, [loadWorker]);

  const handleUpdate = async () => {
    if (!worker) return;
    
    try {
      await updateWorker({
        id: worker.id,
        name: editForm.name,
        phone: editForm.phone || undefined,
        workerType: editForm.workerType,
        dailyWage: editForm.dailyWage,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });
      setShowEditForm(false);
      loadWorker();
    } catch (error) {
      console.error('خطأ في تحديث بيانات العامل:', error);
    }
  };

  const handleDelete = async () => {
    if (!worker) return;
    
    try {
      await deleteWorker(worker.id);
      navigate('/workers');
    } catch (error) {
      console.error('خطأ في حذف العامل:', error);
    }
  };

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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + ' ريال';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري تحميل بيانات العامل...</p>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <p className="empty-state-text">العامل غير موجود</p>
        <button className="btn btn-primary" onClick={() => navigate('/workers')}>
          العودة لقائمة العمال
        </button>
      </div>
    );
  }

  return (
    <div className="worker-detail-page">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/workers')}
          style={{ padding: '0.5rem 0.75rem' }}
        >
          → رجوع
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: 48, 
              height: 48, 
              borderRadius: '50%', 
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              👷
            </div>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                {worker.name}
              </h2>
              {getWorkerTypeBadge(worker.workerType)}
            </div>
          </div>
          {getStatusBadge(worker.status)}
        </div>
        
        <div className="card-content">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>الأجر اليومي:</span>
              <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatCurrency(worker.dailyWage)}</span>
            </div>
            
            {worker.phone && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>رقم الهاتف:</span>
                <span dir="ltr">{worker.phone}</span>
              </div>
            )}
            
            {worker.nationalId && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>رقم الهوية:</span>
                <span dir="ltr">{worker.nationalId}</span>
              </div>
            )}
            
            {worker.startDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>تاريخ البدء:</span>
                <span>{worker.startDate}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>تاريخ الإضافة:</span>
              <span>{formatDate(worker.createdAt)}</span>
            </div>
            
            {worker.notes && (
              <div>
                <span style={{ color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>ملاحظات:</span>
                <p style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  {worker.notes}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ color: '#6b7280' }}>حالة المزامنة:</span>
              <span className={worker.syncStatus === 'synced' ? 'badge badge-success' : 'badge badge-warning'}>
                {worker.syncStatus === 'synced' ? 'متزامن' : worker.syncStatus === 'pending' ? 'ينتظر' : worker.syncStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {attendanceSummary && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <h3 className="card-title">📊 إحصائيات الحضور</h3>
          </div>
          <div className="card-content">
            <div className="stats-grid" style={{ marginBottom: '0.75rem' }}>
              <div className="stat-card" style={{ background: '#dbeafe' }}>
                <div className="stat-value" style={{ color: '#1e40af' }}>{attendanceSummary.totalDays}</div>
                <div className="stat-label">أيام العمل</div>
              </div>
              <div className="stat-card" style={{ background: '#dcfce7' }}>
                <div className="stat-value" style={{ color: '#166534' }}>{attendanceSummary.totalEarned.toLocaleString()}</div>
                <div className="stat-label">إجمالي المستحق</div>
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-card" style={{ background: '#fef3c7' }}>
                <div className="stat-value" style={{ color: '#92400e' }}>{attendanceSummary.totalPaid.toLocaleString()}</div>
                <div className="stat-label">المدفوع</div>
              </div>
              <div className="stat-card" style={{ background: attendanceSummary.balance > 0 ? '#fee2e2' : '#dcfce7' }}>
                <div className="stat-value" style={{ color: attendanceSummary.balance > 0 ? '#991b1b' : '#166534' }}>
                  {attendanceSummary.balance.toLocaleString()}
                </div>
                <div className="stat-label">{attendanceSummary.balance > 0 ? 'المتبقي' : 'تمت التسوية'}</div>
              </div>
            </div>
            {attendanceSummary.lastAttendance && (
              <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                آخر حضور: {attendanceSummary.lastAttendance}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button 
          className="btn btn-primary" 
          style={{ flex: 1 }}
          onClick={() => setShowEditForm(true)}
        >
          ✏️ تعديل
        </button>
        <button 
          className="btn btn-danger"
          style={{ flex: 1 }}
          onClick={() => setShowDeleteConfirm(true)}
        >
          🗑️ حذف
        </button>
      </div>

      {showEditForm && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">تعديل بيانات العامل</h3>
              <button 
                onClick={() => setShowEditForm(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="input-label">الاسم *</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="input-label">رقم الهاتف</label>
                <input
                  type="tel"
                  className="input"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  dir="ltr"
                />
              </div>
              
              <div className="form-group">
                <label className="input-label">نوع العامل *</label>
                <select
                  className="input"
                  value={editForm.workerType}
                  onChange={e => setEditForm({ ...editForm, workerType: e.target.value as Worker['workerType'] })}
                >
                  <option value="skilled">ماهر</option>
                  <option value="unskilled">عادي</option>
                  <option value="supervisor">مشرف</option>
                  <option value="driver">سائق</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="input-label">الأجر اليومي (ريال) *</label>
                <input
                  type="number"
                  className="input"
                  value={editForm.dailyWage}
                  onChange={e => setEditForm({ ...editForm, dailyWage: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="form-group">
                <label className="input-label">الحالة *</label>
                <select
                  className="input"
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value as Worker['status'] })}
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="terminated">منتهي</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="input-label">ملاحظات</label>
                <textarea
                  className="input"
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowEditForm(false)}
              >
                إلغاء
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={!editForm.name || editForm.dailyWage <= 0}
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">تأكيد الحذف</h3>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                هل أنت متأكد من حذف العامل "{worker.name}"؟
              </p>
              <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                ⚠️ سيتم حذف العامل من القائمة ولكن يمكن استعادته لاحقاً
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                إلغاء
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDelete}
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerDetailPage;
