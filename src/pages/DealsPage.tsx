import React from 'react';
import { ProductCard } from '../components/products/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useI18n } from '../i18n';
import './DealsPage.css';

export const DealsPage: React.FC = () => {
  const { t } = useI18n();
  const { data: hotProductsData, isLoading } = useProducts({
    featured: true,
    sort: 'newest',
    page: 1,
    limit: 12,
  });

  return (
    <div className="deals-page">
      <div className="container">
        <div className="deals-header">
          <h1>{t('deals.title', 'Hot Products')}</h1>
          <p>{t('deals.subtitle', 'Browse admin-approved hot products from the platform.')}</p>
        </div>

        <section className="deals-section">
          <h2>{t('deals.hotList', 'Hot Products')}</h2>
          {isLoading ? (
            <div className="card">Loading hot products...</div>
          ) : (hotProductsData?.items || []).length === 0 ? (
            <div className="card">No hot products available right now.</div>
          ) : (
            <div className="deals-grid">
              {(hotProductsData?.items || []).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
