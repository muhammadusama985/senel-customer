import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';
import { User, LoginCredentials, RegisterData } from '../types/user';
import { useCartStore } from './cartStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', credentials);
          const { accessToken, user } = response.data;
          
          // Store both token and user in localStorage
          localStorage.setItem('customerToken', accessToken);
          localStorage.setItem('customerUser', JSON.stringify(user));
          
          // Update store state
          set({ user, token: accessToken, isLoading: false });
          
          // Sync cart to server
          await useCartStore.getState().syncGuestCartToServer();
        } catch (error: any) {
          // Extract message from various possible locations
          let errorMessage = 'Login failed';
          
          if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.response?.data?.issues?.[0]?.message) {
            errorMessage = error.response.data.issues[0].message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          console.log('AuthStore login error:', errorMessage, error);
          
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          
          // Re-throw the original error so the component can handle it
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const sanitized = Object.fromEntries(
            Object.entries({
              ...data,
              role: 'customer',
            }).filter(([, value]) => {
              if (value === undefined || value === null) return false;
              if (typeof value === 'string') return value.trim().length > 0;
              return true;
            })
          );
          await api.post('/auth/register', sanitized);
          set({ user: null, token: null, isLoading: false, error: null });
        } catch (error: any) {
          const issues = Array.isArray(error?.response?.data?.issues) ? error.response.data.issues : [];
          const firstIssue = issues[0]?.message;
          set({ 
            error: firstIssue || error.response?.data?.message || 'Registration failed', 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerUser');
        useCartStore.getState().resetLocalCart();
        set({ user: null, token: null, error: null });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('customerToken');
        const savedUser = localStorage.getItem('customerUser');
        
        // If we have a saved user, use it immediately (optimistic UI)
        if (savedUser) {
          try {
            const user = JSON.parse(savedUser);
            set({ user, token, isLoading: false });
          } catch {
            localStorage.removeItem('customerUser');
          }
        }
        
        if (!token) {
          set({ user: null, token: null, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me');
          const user = response.data.user;
          
          // Update saved user data
          localStorage.setItem('customerUser', JSON.stringify(user));
          set({ user, token, isLoading: false });
          
          // Fetch cart for logged in user
          useCartStore.getState().fetchCart();
        } catch (error: any) {
          // If token is invalid (401), clear everything
          if (error?.response?.status === 401) {
            localStorage.removeItem('customerToken');
            localStorage.removeItem('customerUser');
            set({ user: null, token: null, isLoading: false });
          } else {
            // For other errors (network issue etc), keep the saved user
            set({ isLoading: false });
          }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);