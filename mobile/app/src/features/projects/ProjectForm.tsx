import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ProjectFormProps {
  initialData?: {
    name: string;
    description?: string;
    status?: string;
  };
  onSubmit: (data: { name: string; description?: string; status?: string }) => Promise<void>;
  onClose: () => void;
}

export function ProjectForm({ initialData, onSubmit, onClose }: ProjectFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('اسم المشروع مطلوب');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit({ name: name.trim(), description: description.trim(), status });
    } catch (err) {
      setError('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {initialData ? t('projects.editProject') : t('projects.addProject')}
          </h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label className="input-label">{t('projects.projectName')} *</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="أدخل اسم المشروع"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="input-label">{t('projects.projectDescription')}</label>
              <textarea
                className="input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="وصف المشروع (اختياري)"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="input-label">{t('projects.status')}</label>
              <select
                className="input"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="active">{t('projects.active')}</option>
                <option value="completed">{t('projects.completed')}</option>
                <option value="suspended">{t('projects.suspended')}</option>
                <option value="cancelled">{t('projects.cancelled')}</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الحفظ...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;
