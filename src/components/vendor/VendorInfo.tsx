import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import api from '../../api/client';
import './VendorInfo.css';

interface VendorInfoProps {
  vendorId?: string;
}

interface Vendor {
  id: string;
  storeName: string;
  storeSlug: string;
  isVerifiedBadge: boolean;
  logoUrl?: string;
}

export const VendorInfo: React.FC<VendorInfoProps> = ({ vendorId }) => {
  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor-mini', vendorId],
    queryFn: async () => {
      const response = await api.get<{ vendor: Vendor }>(`/shop/vendors/by-id/${vendorId}`);
      return response.data.vendor;
    },
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000,
  });

  if (!vendorId) return null;

  if (isLoading) {
    return <div className="vendor-info-skeleton">Loading vendor info...</div>;
  }

  if (!vendor) return null;

  return (
    <div className="vendor-info">
      <h4>Sold by</h4>
      <Link to={`/vendors/${vendor.storeSlug}`} className="vendor-link">
        {vendor.logoUrl && (
          <img src={vendor.logoUrl} alt={vendor.storeName} className="vendor-logo-small" />
        )}
        <span className="vendor-name">{vendor.storeName}</span>
        {vendor.isVerifiedBadge && (
          <CheckBadgeIcon className="verified-badge-small" />
        )}
      </Link>
    </div>
  );
};