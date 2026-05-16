import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';

export const GoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        toast.error('Google login cancelled');
        navigate('/login');
        return;
      }

      if (!code) {
        toast.error('Invalid callback');
        navigate('/login');
        return;
      }

      try {
        // Send the code to backend to exchange for tokens
        const response = await api.post('/auth/google/callback', { code });
        const { accessToken, user } = response.data;

        // Store token and user
        localStorage.setItem('customerToken', accessToken);
        localStorage.setItem('customerUser', JSON.stringify(user));
        
        // Notify other components
        window.dispatchEvent(new Event('storage'));
        
        toast.success('Login successful!');
        navigate('/');
      } catch (err: any) {
        console.error('Google callback error:', err);
        toast.error(err.response?.data?.message || 'Google login failed');
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3', 
          borderTop: '4px solid #3498db', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Completing Google login...</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoogleCallbackPage;