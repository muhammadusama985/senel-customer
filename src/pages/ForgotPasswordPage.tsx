import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useI18n } from '../i18n';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import './LoginPage.css';

// Parse Zod-style API field issues → field map (returns {} if none).
const extractFieldErrors = (error: any): Record<string, string> => {
  const issues = error?.response?.data?.issues;
  if (!Array.isArray(issues) || issues.length === 0) return {};
  const out: Record<string, string> = {};
  issues.forEach((issue: any) => {
    const path = Array.isArray(issue?.path) ? issue.path[0] : issue?.path;
    if (path && issue?.message && !out[path]) {
      out[String(path)] = String(issue.message);
    }
  });
  return out;
};

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Per-field errors so only the offending placeholder gets a red border;
  // data in the other inputs is NOT cleared on a single-field issue.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Per-field client validation
    if (!email.trim()) {
      setFieldErrors({ email: 'Email is required' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setFieldErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      toast.success(response.data?.message || 'Password reset code sent to your email');
      setStep('otp');
    } catch (err: any) {
      const apiFieldErrors = extractFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
      }
      const errorMsg = err.response?.data?.message || 'Failed to send reset code. Please check your email address.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password/resend', { email });
      toast.success('New code sent to your email');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Per-field client validation — only the offending field gets a red border.
    // Form data (email, otp, newPassword) is NOT cleared.
    const localErrors: Record<string, string> = {};
    if (!otp.trim()) localErrors.otp = 'Verification code is required';
    if (!newPassword) {
      localErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      localErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (!confirmPassword) {
      localErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword && newPassword !== confirmPassword) {
      localErrors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password/reset', {
        email,
        otp,
        newPassword,
      });
      toast.success('Password reset successfully');
      setStep('success');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const apiFieldErrors = extractFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
      }
      const errorMsg = err.response?.data?.message || 'Failed to reset password';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h2>
                {step === 'email' && 'Forgot Password'}
                {step === 'otp' && 'Enter Reset Code'}
                {step === 'success' && 'Password Reset Complete'}
              </h2>
              <p className="auth-subtitle">
                {step === 'email' && 'Enter your email to receive a reset code'}
                {step === 'otp' && 'Check your email for the verification code'}
                {step === 'success' && 'You can now login with your new password'}
              </p>
            </div>

            {error && (
              <div className="auth-error-banner">
                <ExclamationCircleIcon className="alert-icon" />
                <span>{error}</span>
              </div>
            )}

            {step === 'email' && (
              <form className="auth-form" onSubmit={handleSendCode} noValidate>
                <div className="form-group">
                  <label htmlFor="forgot-email">{t('auth.email', 'Email')}</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) clearFieldError('email');
                    }}
                    placeholder="Enter your email"
                    className={fieldErrors.email ? 'error' : ''}
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                  {fieldErrors.email && (
                    <span className="error-message">{fieldErrors.email}</span>
                  )}
                </div>

                <button type="submit" className="btn btn-primary btn-large auth-submit-btn" disabled={loading}>
                  {loading ? t('common.loading', 'Loading...') : 'Send Reset Code'}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form className="auth-form" onSubmit={handleResetPassword} noValidate>
                <div className="form-group">
                  <label htmlFor="reset-code">Verification Code</label>
                  <input
                    id="reset-code"
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      if (fieldErrors.otp) clearFieldError('otp');
                    }}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className={fieldErrors.otp ? 'error' : ''}
                    aria-invalid={Boolean(fieldErrors.otp)}
                  />
                  {fieldErrors.otp && (
                    <span className="error-message">{fieldErrors.otp}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (fieldErrors.newPassword) clearFieldError('newPassword');
                    }}
                    placeholder="Enter new password (min 8 characters)"
                    className={fieldErrors.newPassword ? 'error' : ''}
                    aria-invalid={Boolean(fieldErrors.newPassword)}
                  />
                  {fieldErrors.newPassword && (
                    <span className="error-message">{fieldErrors.newPassword}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm New Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) clearFieldError('confirmPassword');
                    }}
                    placeholder="Confirm new password"
                    className={fieldErrors.confirmPassword ? 'error' : ''}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  />
                  {fieldErrors.confirmPassword && (
                    <span className="error-message">{fieldErrors.confirmPassword}</span>
                  )}
                </div>

                <button type="submit" className="btn btn-primary btn-large auth-submit-btn" disabled={loading}>
                  {loading ? t('common.loading', 'Loading...') : 'Reset Password'}
                </button>

                <button
                  type="button"
                  className="btn btn-link"
                  onClick={handleResendCode}
                  disabled={loading}
                  style={{ marginTop: '10px', background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Didn't receive code? Resend
                </button>
              </form>
            )}

            {step === 'success' && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: 'green', fontSize: '48px', marginBottom: '20px' }}>✓</div>
                <p style={{ marginBottom: '20px' }}>Your password has been reset successfully.</p>
                <p style={{ color: '#666', fontSize: '14px' }}>Redirecting to login...</p>
              </div>
            )}

            <p className="auth-footer">
              Remember your password? <Link to="/login">{t('auth.login', 'Login')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;