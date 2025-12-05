import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getProject, updateProject, deleteProject } from './repo';
import type { Project } from '../../db/schema';
import { ProjectForm } from './ProjectForm';

export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getProject(id);
      setProject(data);
    } catch (error) {
      console.error('خطأ في تحميل المشروع:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleUpdate = async (data: { name: string; description?: string; status?: string }) => {
    if (!project) return;
    
    try {
      await updateProject({
        id: project.id,
        name: data.name,
        description: data.description,
        status: data.status as any,
      });
      setShowEditForm(false);
      loadProject();
    } catch (error) {
      console.error('خطأ في تحديث المشروع:', error);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    
    try {
      await deleteProject(project.id);
      navigate('/projects');
    } catch (error) {
      console.error('خطأ في حذف المشروع:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'badge badge-success',
      completed: 'badge badge-info',
      suspended: 'badge badge-warning',
      cancelled: 'badge badge-error',
    };
    const labels: Record<string, string> = {
      active: 'نشط',
      completed: 'مكتمل',
      suspended: 'متوقف',
      cancelled: 'ملغي',
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <p className="empty-state-text">المشروع غير موجود</p>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          العودة للمشاريع
        </button>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/projects')}
          style={{ padding: '0.5rem 0.75rem' }}
        >
          → رجوع
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <h2 className="card-title" style={{ fontSize: '1.25rem' }}>{project.name}</h2>
          {getStatusBadge(project.status)}
        </div>
        
        <div className="card-content">
          {project.description && (
            <p style={{ marginBottom: '1rem', color: '#374151' }}>{project.description}</p>
          )}
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>تاريخ الإنشاء:</span>
              <span>{formatDate(project.createdAt)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>آخر تحديث:</span>
              <span>{formatDate(project.updatedAt)}</span>
            </div>
            
            {project.budget && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>الميزانية:</span>
                <span style={{ fontWeight: 600 }}>{project.budget.toLocaleString()} ريال</span>
              </div>
            )}
            
            {project.startDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>تاريخ البداية:</span>
                <span>{project.startDate}</span>
              </div>
            )}
            
            {project.endDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>تاريخ النهاية:</span>
                <span>{project.endDate}</span>
              </div>
            )}
            
            {project.notes && (
              <div>
                <span style={{ color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>ملاحظات:</span>
                <p style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  {project.notes}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ color: '#6b7280' }}>حالة المزامنة:</span>
              <span className={project.syncStatus === 'synced' ? 'badge badge-success' : 'badge badge-warning'}>
                {project.syncStatus === 'synced' ? 'متزامن' : project.syncStatus === 'pending' ? 'ينتظر' : project.syncStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

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
        <ProjectForm
          initialData={{
            name: project.name,
            description: project.description,
            status: project.status,
          }}
          onSubmit={handleUpdate}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">تأكيد الحذف</h3>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                هل أنت متأكد من حذف المشروع "{project.name}"؟
              </p>
              <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                ⚠️ لن يمكن التراجع عن هذا الإجراء
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

export default ProjectDetailPage;
