import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      
      navigate('/dashboard');
    } catch (err) {
      setError('فشل تسجيل الدخول. تحقق من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏗️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e3a5f' }}>
            إدارة مشاريع البناء
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            {t('auth.welcomeBack')}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="input-label">{t('auth.email')}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@company.com"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>

          <div className="form-group">
            <label className="input-label">{t('auth.password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
            disabled={loading}
          >
            {loading ? 'جاري الدخول...' : t('auth.loginButton')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="#" style={{ color: '#1e3a5f', textDecoration: 'none' }}>
            {t('auth.forgotPassword')}
          </a>
        </p>
      </div>

      <p style={{ textAlign: 'center', marginTop: '2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
        تطبيق إدارة مشاريع البناء © 2025
      </p>
    </div>
  );
}

export default LoginPage;
