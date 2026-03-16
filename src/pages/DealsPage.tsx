import React from 'react';
import { ProductCard } from '../components/products/ProductCard';
import { useProducts, useTrendingProducts } from '../hooks/useProducts';
import { useI18n } from '../i18n';
import './DealsPage.css';

export const DealsPage: React.FC = () => {
  const { t } = useI18n();
  const { data: trending = [], isLoading: trendingLoading } = useTrendingProducts(8);
  const { data: lowestPriceData, isLoading: lowestLoading } = useProducts({
    sort: 'price_asc',
    page: 1,
    limit: 8,
  });

  return (
    <div className="deals-page">
      <div className="container">
        <div className="deals-header">
          <h1>{t('deals.title', 'Deals')}</h1>
          <p>{t('deals.subtitle', 'Best moving and lowest price offers from suppliers.')}</p>
        </div>

        <section className="deals-section">
          <h2>{t('deals.trending', 'Trending Offers')}</h2>
          {trendingLoading ? (
            <div className="card">Loading trending deals...</div>
          ) : (
            <div className="deals-grid">
              {trending.map((product: any) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section className="deals-section">
          <h2>{t('deals.lowest', 'Lowest Price Picks')}</h2>
          {lowestLoading ? (
            <div className="card">Loading price picks...</div>
          ) : (
            <div className="deals-grid">
              {(lowestPriceData?.items || []).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
