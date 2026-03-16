import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
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
  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor-mini', vendorId],
    queryFn: async () => {
      // You might need an endpoint to get vendor by ID
      // For now, we'll use a placeholder
      return { 
        id: vendorId, 
        storeName: 'Vendor', 
        storeSlug: 'vendor',
        isVerifiedBadge: false 
      } as Vendor;
    },
    enabled: !!vendorId,
  });

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
