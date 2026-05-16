import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  timeout: 10000,
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('customerToken');
    const language = localStorage.getItem('appLanguage') || 'en';

    // Let browser/axios set multipart boundary automatically for FormData uploads
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete (config.headers as Record<string, string>)['Content-Type'];
      }
    } else {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Accept-Language'] = language;
    config.headers['x-lang'] = language;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Make sure we preserve the error for the calling code to handle
    // Don't modify the error object here
    
    // Only redirect on 401 if we're NOT on an auth page AND we have a token
    const isAuthPage = window.location.pathname === '/login' || 
                       window.location.pathname === '/register' ||
                       window.location.pathname === '/forgot-password';
    
    const hasToken = !!localStorage.getItem('customerToken');
    
    if (error.response?.status === 401 && !isAuthPage && hasToken) {
      // Unauthorized with existing token - clear and redirect
      localStorage.removeItem('customerToken');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;