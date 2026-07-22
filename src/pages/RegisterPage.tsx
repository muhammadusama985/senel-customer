import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BuildingOfficeIcon, UserIcon, EnvelopeIcon, LockClosedIcon, ExclamationCircleIcon, CheckCircleIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';
import './RegisterPage.css';

// Helper to extract error message
const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.issues?.[0]?.message) return error.response.data.issues[0].message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return 'Registration failed. Please try again.';
};

// Map Zod-style API field issues to a per-field error object.
// Returns an empty object if the API didn't return any field-level issues,
// so the existing top-level banner + toast can still handle general errors.
// Returns one of: "weak" | "medium" | "strong" | "" (empty when no password).
function getPasswordStrength(pwd: string): "weak" | "medium" | "strong" | "" {
  if (!pwd) return "";
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[a-z]/.test(pwd)) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

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

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const { t, lang } = useI18n();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    contactPhone: '',
    taxId: '',
    country: '',
    city: '',
    addressLine: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  // Controls the full-card beautiful success screen shown after a successful
  // registration. Replaces the form view so the user can't accidentally
  // re-submit, and auto-navigates to /login after a short pause.
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.companyName) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.country) {
      newErrors.country = 'Country is required';
    }

    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setServerSuccess('');

    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting.');
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        contactPhone: formData.contactPhone,
        taxId: formData.taxId,
        country: formData.country,
        city: formData.city,
        addressLine: formData.addressLine,
        preferredLanguage: lang,
      });
      
      // Show the beautiful on-screen success message and a toast as well.
      setServerSuccess('Registration successful! Welcome aboard.');
      setShowSuccessScreen(true);
      toast.success('Registration successful! Welcome aboard.');

      // Navigate after a short delay so the user has time to read the
      // success card. They can also click "Continue to Login" to go sooner.
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3500);
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);

      // Map any field-level API issues back onto the matching inputs.
      // Only the matching field shows a red border; data in the other
      // fields is left intact so the user can correct just that one field.
      const apiFieldErrors = extractFieldErrors(error);
      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        // Still surface a top-level message in case the user missed it
        setServerError(errorMsg);
      } else {
        setServerError(errorMsg);
      }
      toast.error(errorMsg);
    }
  };

  return (
    <div className="register-page">
      <div className="container">
        <div className="register-container">
          <div className="register-card">
            {showSuccessScreen ? (
              <div className="register-success-screen" role="status" aria-live="polite">
                <div className="register-success-icon-wrap">
                  <div className="register-success-icon-ring" />
                  <div className="register-success-icon-circle">
                    <CheckCircleIcon className="register-success-check" />
                  </div>
                </div>

                <div className="register-success-eyebrow">
                  <SparklesIcon className="register-success-spark" />
                  <span>All set</span>
                </div>

                <h2 className="register-success-title">
                  Welcome aboard!
                </h2>

                <p className="register-success-message">
                  Your Senel Express buyer account has been created
                  successfully. A verification email is on its way to
                  {' '}<strong>{formData.email}</strong>.
                </p>

                <div className="register-success-steps">
                  <div className="register-success-step">
                    <span className="register-success-step-num">1</span>
                    <span>Check your inbox to verify your email address.</span>
                  </div>
                  <div className="register-success-step">
                    <span className="register-success-step-num">2</span>
                    <span>Sign in with the credentials you just created.</span>
                  </div>
                  <div className="register-success-step">
                    <span className="register-success-step-num">3</span>
                    <span>Start browsing the marketplace and place your first order.</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-large register-success-btn"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Continue to Login
                  <ArrowRightIcon className="register-success-btn-icon" />
                </button>

                <p className="register-success-foot">
                  Redirecting automatically in a few seconds...
                </p>
              </div>
            ) : (
              <>
                <div className="register-header">
                  <h2>{t('auth.createAccount', 'Create Account')}</h2>
                  <p>{t('auth.registerSubtitle', 'Join Senel Express as a business buyer')}</p>
                </div>

            {serverSuccess && (
              <div className="register-success-banner">
                <CheckCircleIcon className="alert-icon" />
                <span>{serverSuccess}</span>
              </div>
            )}

            {serverError && (
              <div className="register-server-error">
                <ExclamationCircleIcon className="alert-icon" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">
                    <UserIcon className="input-icon" />
                    {t('auth.firstName', 'First Name')}
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                    className={errors.firstName ? 'error' : ''}
                  />
                  {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">
                    <UserIcon className="input-icon" />
                    {t('auth.lastName', 'Last Name')}
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                    className={errors.lastName ? 'error' : ''}
                  />
                  {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="companyName">
                  <BuildingOfficeIcon className="input-icon" />
                  {t('auth.companyName', 'Company Name')}
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter your company name"
                  className={errors.companyName ? 'error' : ''}
                />
                {errors.companyName && <span className="error-message">{errors.companyName}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactPhone">
                    <BuildingOfficeIcon className="input-icon" />
                    {t('auth.contactPhone', 'Contact Phone')}
                  </label>
                  <input
                    type="text"
                    id="contactPhone"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    placeholder="Enter contact phone"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="taxId">
                    <BuildingOfficeIcon className="input-icon" />
                    {t('auth.taxId', 'Tax ID')}
                  </label>
                  <input
                    type="text"
                    id="taxId"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="Enter tax identifier"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country">
                    <BuildingOfficeIcon className="input-icon" />
                    {t('auth.country', 'Country')}
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Enter country"
                    className={errors.country ? 'error' : ''}
                  />
                  {errors.country && <span className="error-message">{errors.country}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="city">
                    <BuildingOfficeIcon className="input-icon" />
                    {t('auth.city', 'City')}
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                    className={errors.city ? 'error' : ''}
                  />
                  {errors.city && <span className="error-message">{errors.city}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="addressLine">
                  <BuildingOfficeIcon className="input-icon" />
                  {t('auth.addressLine', 'Address')}
                </label>
                <input
                  type="text"
                  id="addressLine"
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleChange}
                  placeholder="Enter business address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <EnvelopeIcon className="input-icon" />
                  {t('auth.email', 'Email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <LockClosedIcon className="input-icon" />
                  {t('auth.password', 'Password')}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password (min 8 characters)"
                  className={errors.password ? 'error' : ''}
                />
                {(() => {
                  const strength = getPasswordStrength(formData.password);
                  if (!strength) return null;
                  const colors = { weak: "#dc2626", medium: "#f59e0b", strong: "#16a34a" };
                  const labels = { weak: "Weak", medium: "Medium", strong: "Strong" };
                  return (
                    <span style={{ fontSize: "0.8rem", color: colors[strength], marginTop: "0.25rem", display: "block" }}>
                      Password strength: <strong>{labels[strength]}</strong>
                    </span>
                  );
                })()}
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <LockClosedIcon className="input-icon" />
                  {t('auth.confirmPassword', 'Confirm Password')}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? 'error' : ''}
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>

              <div className="terms-agreement">
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large register-btn"
                disabled={isLoading}
              >
                {isLoading ? t('common.loading', 'Loading...') : t('auth.createAccount', 'Create Account')}
                </button>
            </form>

                <div className="register-footer">
                  <p>
                    Already have an account? <Link to="/login">Sign in</Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;