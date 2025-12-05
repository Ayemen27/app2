import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import i18n, { initializeI18n } from './i18n';
import { createDatabase } from './db/rxdb';
import { useSync } from './hooks/useSync';
import { SyncIndicator } from './ui/SyncIndicator';

import { ProjectsPage } from './features/projects/ProjectsPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { WorkersPage } from './features/workers/WorkersPage';
import { AttendancePage } from './features/attendance/AttendancePage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LoginPage } from './features/auth/LoginPage';

import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  const { syncState, pendingCount, sync } = useSync();

  return (
    <div className="app-container" dir="rtl">
      <header className="app-header">
        <h1 className="app-title">إدارة مشاريع البناء</h1>
        <SyncIndicator 
          state={syncState} 
          pendingCount={pendingCount} 
          onClick={sync} 
        />
      </header>
      <main className="app-main">
        {children}
      </main>
      <nav className="app-nav">
        <Link to="/dashboard" className="nav-item">الرئيسية</Link>
        <Link to="/projects" className="nav-item">المشاريع</Link>
        <Link to="/workers" className="nav-item">العمال</Link>
        <Link to="/attendance" className="nav-item">الحضور</Link>
      </nav>
    </div>
  );
}

function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initializeI18n();
    
    async function initDb() {
      try {
        await createDatabase();
        setIsDbReady(true);
        console.log('✅ [App] التطبيق جاهز');
      } catch (error) {
        console.error('❌ [App] خطأ في تهيئة قاعدة البيانات:', error);
        setDbError(String(error));
      }
    }
    
    initDb();
  }, []);

  if (dbError) {
    return (
      <div className="error-container" dir="rtl">
        <h2>خطأ في تحميل التطبيق</h2>
        <p>{dbError}</p>
        <button onClick={() => window.location.reload()}>إعادة المحاولة</button>
      </div>
    );
  }

  if (!isDbReady) {
    return (
      <div className="loading-container" dir="rtl">
        <div className="loading-spinner" />
        <p>جاري تحميل التطبيق...</p>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/workers" element={<WorkersPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
            </Routes>
          </AppLayout>
        </HashRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

export default App;
