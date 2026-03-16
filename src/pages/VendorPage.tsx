import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useVendor, useVendorProducts } from '../hooks/useVendor';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ProductGrid } from '../components/products/ProductGrid';
import { Pagination } from '../components/common/Pagination';
import './VendorPage.css';

export const VendorPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const [isPreferred, setIsPreferred] = useState(false);
  const { user } = useAuthStore();

  const { data: vendor, isLoading: vendorLoading } = useVendor(slug || '');
  const { data: productsData, isLoading: productsLoading } = useVendorProducts(slug || '', page);

  useEffect(() => {
    if (!user || !vendor?._id) return;
    api
      .get<{ isPreferred: boolean }>(`/preferred-suppliers/me/${vendor._id}/exists`)
      .then((response) => setIsPreferred(Boolean(response.data.isPreferred)))
      .catch(() => {});
  }, [user, vendor?._id]);

  const togglePreferred = async () => {
    if (!user) {
      toast.error('Please login to save suppliers');
      return;
    }
    if (!vendor?._id) return;

    try {
      if (isPreferred) {
        await api.delete(`/preferred-suppliers/me/${vendor._id}`);
        setIsPreferred(false);
        toast.success('Supplier removed');
      } else {
        await api.post('/preferred-suppliers/me', { vendorId: vendor._id });
        setIsPreferred(true);
        toast.success('Supplier saved');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update supplier');
    }
  };

  if (vendorLoading) {
    return (
      <div className="vendor-page-loading">
        <div className="container">
          <div className="vendor-skeleton">
            <div className="skeleton-banner" />
            <div className="skeleton-info" />
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="vendor-page-error">
        <div className="container">
          <div className="error-state">
            <h2>Vendor Not Found</h2>
            <p>The vendor you are looking for does not exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div className="container">
        <Breadcrumbs
          items={[
            { label: 'Home', path: '/' },
            { label: 'Suppliers', path: '/suppliers' },
            { label: vendor.storeName, path: `/vendors/${vendor.storeSlug}` },
          ]}
        />

        <div className="vendor-header">
          {vendor.bannerUrl ? (
            <div className="vendor-banner">
              <img src={vendor.bannerUrl} alt={vendor.storeName} />
            </div>
          ) : (
            <div className="vendor-banner-placeholder" />
          )}

          <div className="vendor-info">
            <div className="vendor-logo-wrapper">
              {vendor.logoUrl ? (
                <img src={vendor.logoUrl} alt={vendor.storeName} className="vendor-logo" />
              ) : (
                <div className="vendor-logo-placeholder">{vendor.storeName.charAt(0)}</div>
              )}
            </div>

            <div className="vendor-details">
              <div className="vendor-name-wrapper">
                <h1 className="vendor-name">{vendor.storeName}</h1>
                {vendor.isVerifiedBadge && <CheckBadgeIcon className="verified-badge-large" />}
              </div>

              {vendor.description && <p className="vendor-description">{vendor.description}</p>}

              {vendor.business && (
                <div className="vendor-location">
                  {vendor.business.city}, {vendor.business.country}
                </div>
              )}

              <button className="btn btn-outline preferred-btn" onClick={togglePreferred}>
                {isPreferred ? 'Remove Preferred Supplier' : 'Save as Preferred Supplier'}
              </button>
            </div>
          </div>
        </div>

        <section className="vendor-products">
          <h2>Products from {vendor.storeName}</h2>

          {productsLoading ? (
            <div className="products-loader">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="product-skeleton" />
              ))}
            </div>
          ) : productsData?.items && productsData.items.length > 0 ? (
            <>
              <ProductGrid products={productsData.items} />
              {productsData.pages > 1 && (
                <Pagination
                  currentPage={productsData.page}
                  totalPages={productsData.pages}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="no-products">
              <p>No products available from this vendor yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
