import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useI18n } from '../i18n';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import './LoginPage.css';

// Helper to extract error message from various error formats
const getErrorMessage = (error: any): string => {
  // Log for debugging
  console.log('Login error:', error);

  // Handle axios error format (axios wraps the response)
  // The error from axios typically has:
  // - error.response: the response object
  // - error.response.status: HTTP status code
  // - error.response.data: response body

  const response = error?.response;
  const status = response?.status;
  const data = response?.data;

  // Check for specific status codes
  if (status === 401) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (status === 403) {
    return 'Your account is not active. Please contact support.';
  }

  // Check for message in response data (most common)
  if (data?.message) {
    return data.message;
  }

  // Check for Zod validation issues (array format)
  if (Array.isArray(data?.issues) && data.issues.length > 0) {
    return data.issues[0].message;
  }

  // Check for error string in data
  if (typeof data?.error === 'string') {
    return data.error;
  }

  // Check for message in error object itself
  if (error?.message) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
};

// Extract per-field errors from Zod-style API responses.
// Returns an empty object if no field-specific errors are found (so the
// general banner can still show a friendly top-level message).
const extractFieldErrors = (error: any): Record<string, string> => {
  const issues = error?.response?.data?.issues;
  if (!Array.isArray(issues) || issues.length === 0) {
    return {};
  }
  const fieldErrors: Record<string, string> = {};
  issues.forEach((issue: any) => {
    const path = Array.isArray(issue?.path) ? issue.path[0] : issue?.path;
    if (path && issue?.message && !fieldErrors[path]) {
      fieldErrors[String(path)] = String(issue.message);
    }
  });
  return fieldErrors;
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { login } = useAuthStore();
  const { syncGuestCartToServer } = useCartStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const redirectTo = '/';

  // Keep form data intact on error; only clear inline field errors as the
  // user edits those specific fields (other fields keep their data).
  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // Get Google OAuth URL from backend
      const response = await api.get('/auth/google');
      const { authUrl, message } = response.data;
      
      if (!authUrl) {
        toast.error(message || 'Google login is not configured. Please contact support.');
        setGoogleLoading(false);
        return;
      }

      // Redirect to Google OAuth
      window.location.href = authUrl;
      
    } catch (error: any) {
      console.error('Google login error:', error);
      const errorMsg = getErrorMessage(error);
      const message = error.response?.data?.message || '';
      if (message.includes('not configured')) {
        toast.error('Google login is not available. Please use email login instead.');
      } else {
        toast.error(errorMsg);
      }
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setFieldErrors({});

    // Client-side per-field validation: surface a red border + message
    // under only the offending field(s). Form data is NOT cleared.
    const localErrors: Record<string, string> = {};
    if (!email.trim()) {
      localErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      localErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      localErrors.password = 'Password is required';
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Use the store's login method which properly updates state
      await login({ email, password });

      // Sync cart to server after successful login
      await syncGuestCartToServer();

      toast.success(t('auth.loginSuccess', 'Login successful'));

      // Force a complete page reload to ensure all components pick up the new auth state
      window.location.href = redirectTo;
    } catch (error: any) {
      // Default fallback message
      let errorMsg = 'Login failed. Please check your email and password.';

      // Check for message on the error object itself (set by authStore)
      if (error?.message) {
        errorMsg = error.message;
      }
      // Check for response data message
      else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      // Check for 401 status code
      else if (error?.response?.status === 401) {
        errorMsg = 'Invalid email or password. Please check your credentials.';
      }
      // Check for Zod validation issues
      else if (Array.isArray(error?.response?.data?.issues) && error.response.data.issues.length > 0) {
        errorMsg = error.response.data.issues[0].message;
      }

      // Map API-reported field errors to specific inputs (e.g. "email taken").
      // Only the matching field shows a red border; data in other fields is preserved.
      const apiFieldErrors = extractFieldErrors(error);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
      }

      // Set error for banner
      setLoginError(errorMsg);

      // Show toast notification
      toast.error(errorMsg);

      // Reset loading state
      setIsLoading(false);
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

            {loginError && (
              <div className="auth-error-banner">
                <ExclamationCircleIcon className="alert-icon" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Google Login Button */}
            <button 
              type="button" 
              className="btn btn-google"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px 16px',
                marginBottom: '20px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                opacity: googleLoading ? 0.7 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.705-1.567 2.692-3.874 2.692-6.614z" fill="#4285F4"/>
                <path d="M9.003 18c2.43 0 4.467-.805 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9.003 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 3.999l3.007-2.292z" fill="#FBBC05"/>
                <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.253c.708-2.127 2.692-3.673 5.039-3.673z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0',
              color: '#666',
              fontSize: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
              <span style={{ padding: '0 10px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
            </div>

            <form className="auth-form" onSubmit={onSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="login-email">{t('auth.email', 'Email')}</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email || fieldErrors.email) clearFieldError('email');
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  placeholder="Enter your email"
                  className={fieldErrors.email ? 'error' : ''}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                />
                {fieldErrors.email && (
                  <span id="login-email-error" className="error-message">{fieldErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="login-password" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {t('auth.password', 'Password')}
                  <Link
                    to="/forgot-password"
                    style={{ fontSize: '12px', fontWeight: 'normal', color: '#1976d2' }}
                  >
                    Forgot Password?
                  </Link>
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password || fieldErrors.password) clearFieldError('password');
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  placeholder="Enter your password"
                  className={fieldErrors.password ? 'error' : ''}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                />
                {fieldErrors.password && (
                  <span id="login-password-error" className="error-message">{fieldErrors.password}</span>
                )}
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

export default LoginPage;