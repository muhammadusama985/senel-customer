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
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('customerToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
