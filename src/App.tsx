import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { useWishlistStore } from './store/wishlistStore';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProductsPage } from './pages/ProductPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { VendorPage } from './pages/VendorPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { WishlistPage } from './pages/WishlistPage';
import { OrdersPage } from './pages/OrdersPage';
import { AccountPage } from './pages/AccountPage';
import { DealsPage } from './pages/DealsPage';
import { SenelProductsPage } from './pages/SenelProductsPage';
import { CmsPage } from './pages/CmsPage';
import { BlogListPage } from './pages/BlogListPage';
import { BlogDetailPage } from './pages/BlogDetailPage';
import './App.css';
import { VendorsListPage } from './pages/VendorsListPage';
import { CategoriesPage } from './pages/CategoriesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  const { checkAuth, isLoading } = useAuthStore();
  const { fetchWishlist } = useWishlistStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ErrorBoundary>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/senel-products" element={<SenelProductsPage />} />
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              <Route path="/pages/:slug" element={<CmsPage />} />
              <Route path="/about" element={<CmsPage />} />
              <Route path="/contact" element={<CmsPage />} />
              <Route path="/faq" element={<CmsPage />} />
              <Route path="/help" element={<CmsPage />} />
              <Route path="/shipping" element={<CmsPage />} />
              <Route path="/returns" element={<CmsPage />} />
              <Route path="/terms" element={<CmsPage />} />
              <Route path="/privacy" element={<CmsPage />} />
              <Route path="/vendors/:slug" element={<VendorPage />} />
              <Route path="/suppliers" element={<VendorsListPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
            </Routes>
          </Layout>
        </ErrorBoundary>
      </Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
