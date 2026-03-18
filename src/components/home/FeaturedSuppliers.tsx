import React from 'react';
import { Link } from 'react-router-dom';
import { useFeaturedSuppliers } from '../../hooks/useFeaturedSuppliers';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { useI18n } from '../../i18n';
import { resolveMediaUrl } from '../../utils/media';
import './FeaturedSuppliers.css';

export const FeaturedSuppliers: React.FC = () => {
  const { t } = useI18n();
  const { data: suppliers, isLoading, error } = useFeaturedSuppliers(4);

  if (isLoading) {
    return (
      <section className="suppliers-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('home.featuredSuppliers', 'Featured Suppliers')}</h2>
          </div>
          <div className="suppliers-loader">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="supplier-skeleton" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="suppliers-section">
        <div className="container">
          <h2>{t('home.featuredSuppliers', 'Featured Suppliers')}</h2>
          <div className="error-message">
            {t('products.failedLoad', 'Failed to load products')}. {t('products.retryLater', 'Please try again later')}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="suppliers-section">
      <div className="container">
        <div className="section-header">
          <h2>{t('home.featuredSuppliers', 'Featured Suppliers')}</h2>
          <Link to="/suppliers" className="view-all-link">
            {t('home.viewAllSuppliers', 'View All Suppliers')} &rarr;
          </Link>
        </div>

        {suppliers?.length ? (
          <div className="suppliers-grid">
            {suppliers.map((supplier) => (
              <Link
                key={supplier.id}
                to={`/vendors/${supplier.storeSlug}`}
                className="supplier-card"
              >
                <div className="supplier-logo">
                  {supplier.logoUrl ? (
                    <img src={resolveMediaUrl(supplier.logoUrl)} alt={supplier.storeName} />
                  ) : (
                    <div className="supplier-placeholder">
                      {supplier.storeName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="supplier-info">
                  <div className="supplier-name-wrapper">
                    <h3 className="supplier-name">{supplier.storeName}</h3>
                    {supplier.isVerifiedBadge && (
                      <CheckBadgeIcon className="verified-badge" />
                    )}
                  </div>

                  {supplier.business && (
                    <p className="supplier-location">
                      {supplier.business.city}, {supplier.business.country}
                    </p>
                  )}

                  <div className="supplier-meta">
                    <span className="supplier-products">
                      {t('suppliers.viewProducts', 'View Products')} &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="error-message">
            No suppliers found
          </div>
        )}
      </div>
    </section>
  );
};
