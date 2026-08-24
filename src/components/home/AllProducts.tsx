import React from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard } from '../products/ProductCard';
import { useI18n } from '../../i18n';
import './AllProducts.css';

export const AllProducts: React.FC = () => {
  const { t } = useI18n();
  const { data, isLoading, error } = useProducts({
    sort: 'newest',
    limit: 12,
    page: 1,
  });
  const products = data?.items || [];

  if (isLoading && products.length === 0) {
    return (
      <section className="all-products-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('home.allProducts', 'All Products')}</h2>
          </div>
          <div className="all-products-loader">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="product-skeleton" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Only fall back to the error/empty states when we don't already have
  // products on screen. With `keepPreviousData` enabled in useProducts, a
  // language change keeps the previous (already-fetched) products visible
  // while the new translated batch is being requested. If that request
  // happens to fail (e.g. the backend Google-Translate round-trip times
  // out), we don't want to wipe the existing products off the page and
  // show a "Failed to load products" banner — that would make the home
  // screen flicker into an error state on every language switch. Instead
  // we just keep rendering whatever products we still have.
  if (error && products.length === 0) {
    return (
      <section className="all-products-section">
        <div className="container">
          <h2>{t('home.allProducts', 'All Products')}</h2>
          <div className="error-message">
            {t('products.failedLoad', 'Failed to load products')}.{' '}
            {t('products.retryLater', 'Please try again later')}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="all-products-section">
      <div className="container">
        <div className="section-header">
          <h2>{t('home.allProducts', 'All Products')}</h2>
          <Link to="/products" className="view-all-link">
            {t('home.viewAllProducts', 'View All Products')} &rarr;
          </Link>
        </div>

        {products.length ? (
          <div
            className="all-products-bar"
            role="list"
            aria-label={t('home.allProducts', 'All Products')}
          >
            {products.map((product) => (
              <div key={product._id} className="all-products-item" role="listitem">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="error-message">
            {t('products.none', 'No products found')}
          </div>
        )}
      </div>
    </section>
  );
};