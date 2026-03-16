import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { ProductGrid } from '../components/products/ProductGrid';
import { Pagination } from '../components/common/Pagination';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useI18n } from '../i18n';
import './ProductsPage.css';

export const SenelProductsPage: React.FC = () => {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useProducts({
    createdByAdmin: true,
    sort: 'newest',
    page,
    limit: 20,
  });

  return (
    <div className="products-page">
      <div className="container">
        <Breadcrumbs
          items={[
            { label: 'Home', path: '/' },
            { label: t('senel.title', 'Senel Products'), path: '/senel-products' },
          ]}
        />

        <div className="products-header">
          <h1 className="products-title">{t('senel.title', 'Senel Products')}</h1>
          <p className="products-count">{data?.total || 0} {t('products.found', 'products found')}</p>
        </div>

        {isLoading ? (
          <div className="products-loader">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="product-skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="error-state">
            <h3>{t('products.failedLoad', 'Failed to load products')}</h3>
            <p>{t('products.retryLater', 'Please try again later')}</p>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="empty-state">
            <h3>{t('senel.none', 'No Senel products found')}</h3>
          </div>
        ) : (
          <>
            <ProductGrid products={data?.items || []} />
            {(data?.pages || 0) > 1 && (
              <Pagination currentPage={data!.page} totalPages={data!.pages} onPageChange={setPage} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
