import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckBadgeIcon, HeartIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useVendorsList } from '../hooks/useVendor';
import { Pagination } from '../components/common/Pagination';
import { useI18n } from '../i18n';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import toast from 'react-hot-toast';
import './VendorListPage.css';

export const VendorsListPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [preferredIds, setPreferredIds] = useState<Set<string>>(new Set());
  const [updatingVendorId, setUpdatingVendorId] = useState<string | null>(null);

  const query = useVendorsList({
    q: searchTerm || undefined,
    page,
    limit: 12,
  });

  const vendors = query.data?.items || [];
  const pages = query.data?.pages || 1;

  const hasResults = useMemo(() => vendors.length > 0, [vendors.length]);

  useEffect(() => {
    if (!user) {
      setPreferredIds(new Set());
      return;
    }

    api
      .get<{ items: Array<{ vendorId: string }> }>('/preferred-suppliers/me')
      .then((response) => {
        const ids = new Set((response.data.items || []).map((item) => String(item.vendorId)));
        setPreferredIds(ids);
      })
      .catch(() => {});
  }, [user]);

  const togglePreferred = async (event: React.MouseEvent, vendorId: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast.error('Please login to save suppliers');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    try {
      setUpdatingVendorId(vendorId);
      if (preferredIds.has(vendorId)) {
        await api.delete(`/preferred-suppliers/me/${vendorId}`);
        setPreferredIds((prev) => {
          const next = new Set(prev);
          next.delete(vendorId);
          return next;
        });
        toast.success('Supplier removed');
      } else {
        await api.post('/preferred-suppliers/me', { vendorId });
        setPreferredIds((prev) => new Set(prev).add(vendorId));
        toast.success('Supplier saved');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update supplier');
    } finally {
      setUpdatingVendorId(null);
    }
  };

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
                    <div className="vendor-card-title-wrap">
                      <h3 className="vendor-card-name">{vendor.storeName}</h3>
                      {vendor.isVerifiedBadge && <CheckBadgeIcon className="verified-badge" />}
                    </div>
                    <button
                      className={`vendor-preferred-btn ${preferredIds.has(vendor.id) ? 'active' : ''}`}
                      onClick={(event) => void togglePreferred(event, vendor.id)}
                      aria-label={preferredIds.has(vendor.id) ? 'Remove preferred supplier' : 'Save preferred supplier'}
                      disabled={updatingVendorId === vendor.id}
                    >
                      {preferredIds.has(vendor.id) ? <HeartSolidIcon /> : <HeartIcon />}
                    </button>
                  </div>

                  {vendor.description && <p className="vendor-card-description">{vendor.description}</p>}

                  {vendor.business && (
                    <div className="vendor-card-location">
                      {vendor.business.city}, {vendor.business.country}
                    </div>
                  )}

                  <div className="vendor-card-footer">
                    {preferredIds.has(vendor.id) ? (
                      <span className="preferred-pill">Preferred Supplier</span>
                    ) : null}
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
