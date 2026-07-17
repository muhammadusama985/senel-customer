import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import api from '../../api/client';
import './VendorInfo.css';

interface VendorInfoProps {
  vendorId: string;
}

interface Vendor {
  id: string;
  storeName: string;
  storeSlug: string;
  isVerifiedBadge: boolean;
  logoUrl?: string;
}

export const VendorInfo: React.FC<VendorInfoProps> = ({ vendorId }) => {
  const { data: vendorData, isLoading } = useQuery({
    queryKey: ['vendor-mini', vendorId],
    queryFn: async () => {
      // Resolve the real vendor name from the product's vendorId by looking
      // it up in the public /shop/vendors listing (the only public vendor
      // endpoint available on the live backend). The product detail page
      // receives only vendorId, so we filter the list client-side.
      const response = await api.get<{ items: Vendor[] }>('/shop/vendors', {
        params: { limit: 200 },
      });
      const items = Array.isArray(response.data.items) ? response.data.items : [];
      const match = items.find((v) => v.id === vendorId);
      if (!match) return null;
      return match;
    },
    enabled: !!vendorId,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  if (!vendorId) return null;

  if (isLoading) {
    return <div className="vendor-info-skeleton">Loading vendor info...</div>;
  }

  // Always render the "Sold by" block so the text never disappears from the
  // product detail page. Use the real vendor when available; otherwise fall
  // back to a placeholder.
  const vendor: Vendor = vendorData || {
    id: vendorId,
    storeName: 'Vendor',
    storeSlug: '',
    isVerifiedBadge: false,
  };

  return (
    <div className="vendor-info">
      <h4>Sold by Vendor</h4>
      <div className="vendor-link">
        {vendor.logoUrl && (
          <img src={vendor.logoUrl} alt={vendor.storeName} className="vendor-logo-small" />
        )}
        <span className="vendor-name">{vendor.storeName}</span>
        {vendor.isVerifiedBadge && (
          <CheckBadgeIcon className="verified-badge-small" />
        )}
      </div>
    </div>
  );
};