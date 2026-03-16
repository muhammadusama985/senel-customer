import { useVendorsList } from './useVendor';

export const useFeaturedSuppliers = (limit: number = 4) => {
  const query = useVendorsList({ verified: true, page: 1, limit });
  return {
    ...query,
    data: query.data?.items || [],
  };
};
