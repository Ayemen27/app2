import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { listProjects, createProject, countProjects } from './repo';
import type { Project } from '../../db/schema';
import { ProjectForm } from './ProjectForm';

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, suspended: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsList, projectStats] = await Promise.all([
        listProjects({ status: statusFilter, search: searchValue }),
        countProjects(),
      ]);
      setProjects(projectsList);
      setStats(projectStats);
    } catch (error) {
      console.error('خطأ في تحميل المشاريع:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchValue]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleCreateProject = async (data: { name: string; description?: string; status?: string }) => {
    try {
      await createProject({
        name: data.name,
        description: data.description,
        status: data.status as any || 'active',
      });
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error('خطأ في إنشاء المشروع:', error);
    }
  };

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
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

  const getSyncBadge = (syncStatus: string) => {
    if (syncStatus === 'synced') return null;
    const styles: Record<string, string> = {
      pending: 'sync-badge sync-pending',
      syncing: 'sync-badge sync-pending',
      error: 'sync-badge sync-error',
      conflict: 'sync-badge sync-error',
    };
    const labels: Record<string, string> = {
      pending: '↑',
      syncing: '⟳',
      error: '!',
      conflict: '⚡',
    };
    return <span className={styles[syncStatus]}>{labels[syncStatus]}</span>;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-SA');
  };

  if (loading && projects.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>جاري تحميل المشاريع...</p>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <h2 className="page-title">{t('projects.title')}</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + إضافة
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">إجمالي</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#22c55e' }}>{stats.active}</div>
          <div className="stat-label">نشط</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.completed}</div>
          <div className="stat-label">مكتمل</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.pending}</div>
          <div className="stat-label">ينتظر المزامنة</div>
        </div>
      </div>

      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="بحث في المشاريع..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className="filter-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
        {['all', 'active', 'completed', 'suspended'].map(status => (
          <button
            key={status}
            className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'الكل' : status === 'active' ? 'نشط' : status === 'completed' ? 'مكتمل' : 'متوقف'}
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <p className="empty-state-text">{t('projects.noProjects')}</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            {t('projects.addProject')}
          </button>
        </div>
      ) : (
        <div className="projects-list">
          {projects.map(project => (
            <div
              key={project.id}
              className="card"
              onClick={() => handleProjectClick(project)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="card-title">{project.name}</span>
                  {getSyncBadge(project.syncStatus)}
                </div>
                {getStatusBadge(project.status)}
              </div>
              <div className="card-content">
                {project.description && (
                  <p style={{ marginBottom: '0.5rem', color: '#64748b' }}>{project.description}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>تاريخ الإنشاء: {formatDate(project.createdAt)}</span>
                  {project.budget && <span>الميزانية: {project.budget.toLocaleString()} ريال</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setShowForm(true)}>+</button>

      {showForm && (
        <ProjectForm
          onSubmit={handleCreateProject}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default ProjectsPage;
