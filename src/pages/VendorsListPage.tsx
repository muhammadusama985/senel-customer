import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckBadgeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useVendorsList } from '../hooks/useVendor';
import { Pagination } from '../components/common/Pagination';
import { useI18n } from '../i18n';
import './VendorListPage.css';

export const VendorsListPage: React.FC = () => {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const query = useVendorsList({
    q: searchTerm || undefined,
    page,
    limit: 12,
  });

  const vendors = query.data?.items || [];
  const pages = query.data?.pages || 1;

  const hasResults = useMemo(() => vendors.length > 0, [vendors.length]);

  return (
    <div className="vendors-list-page">
      <div className="container">
        <div className="vendors-header">
          <h1>{t('suppliers.title', 'Suppliers')}</h1>
          <p>{t('suppliers.subtitle', 'Discover trusted suppliers and wholesale partners')}</p>
        </div>

        <div className="vendors-search">
          <div className="search-wrapper">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder={t('suppliers.search', 'Search suppliers by name, description, or country...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="search-input"
            />
          </div>
        </div>

        {query.isLoading ? (
          <div className="vendors-loader">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="vendor-skeleton" />
            ))}
          </div>
        ) : (
          <div className="vendors-grid">
            {vendors.map((vendor) => (
              <Link key={vendor.id} to={`/vendors/${vendor.storeSlug}`} className="vendor-card">
                <div className="vendor-card-logo">
                  {vendor.logoUrl ? (
                    <img src={vendor.logoUrl} alt={vendor.storeName} />
                  ) : (
                    <div className="vendor-logo-placeholder">{vendor.storeName.charAt(0)}</div>
                  )}
                </div>

                <div className="vendor-card-info">
                  <div className="vendor-card-header">
                    <h3 className="vendor-card-name">{vendor.storeName}</h3>
                    {vendor.isVerifiedBadge && <CheckBadgeIcon className="verified-badge" />}
                  </div>

                  {vendor.description && <p className="vendor-card-description">{vendor.description}</p>}

                  {vendor.business && (
                    <div className="vendor-card-location">
                      {vendor.business.city}, {vendor.business.country}
                    </div>
                  )}

                  <div className="vendor-card-footer">
                    <span className="view-products">{t('suppliers.viewProducts', 'View Products')} {'->'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!query.isLoading && !hasResults && (
          <div className="no-results">
            <h3>{t('suppliers.noResults', 'No suppliers found')}</h3>
            <p>{t('suppliers.tryAdjust', 'Try adjusting your search criteria')}</p>
          </div>
        )}

        {!query.isLoading && hasResults && pages > 1 && (
          <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
};
