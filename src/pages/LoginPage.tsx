import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useI18n } from '../i18n';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const redirectTo = typeof location.state?.from === 'string' ? location.state.from : '/';

  React.useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ email, password });
      toast.success(t('auth.login', 'Login') + ' successful');
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h2>{t('auth.welcomeBack', 'Welcome Back')}</h2>
              <p className="auth-subtitle">{t('auth.loginSubtitle', 'Login to your account')}</p>
            </div>

            <form className="auth-form" onSubmit={onSubmit}>
              {error ? <div className="auth-error-banner">{error}</div> : null}
              <div className="form-group">
                <label htmlFor="login-email">{t('auth.email', 'Email')}</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">{t('auth.password', 'Password')}</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-large auth-submit-btn" disabled={isLoading}>
                {isLoading ? t('common.loading', 'Loading...') : t('auth.login', 'Login')}
              </button>
            </form>

            <p className="auth-footer">
              Don't have an account? <Link to="/register">{t('auth.register', 'Register')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
