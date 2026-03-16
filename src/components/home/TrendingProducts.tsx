import React from 'react';
import { Link } from 'react-router-dom';
import { useTrendingProducts } from '../../hooks/useTrendingProducts';
import { ProductCard } from '../products/ProductCard';
import { useI18n } from '../../i18n';
import './TrendingProduct.css';

export const TrendingProducts: React.FC = () => {
  const { t } = useI18n();
  const { data: products, isLoading, error } = useTrendingProducts(8);

  if (isLoading) {
    return (
      <section className="trending-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('home.trendingProducts', 'Trending Products')}</h2>
          </div>
          <div className="products-loader">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="product-skeleton" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="trending-section">
        <div className="container">
          <h2>{t('home.trendingProducts', 'Trending Products')}</h2>
          <div className="error-message">
            {t('products.failedLoad', 'Failed to load products')}. {t('products.retryLater', 'Please try again later')}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="trending-section">
      <div className="container">
        <div className="section-header">
          <h2>{t('home.trendingProducts', 'Trending Products')}</h2>
          <Link to="/products" className="view-all-link">
            {t('home.viewAllProducts', 'View All Products')} &rarr;
          </Link>
        </div>

        <div className="products-grid">
          {products?.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
