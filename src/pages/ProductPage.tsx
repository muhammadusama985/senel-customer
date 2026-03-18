import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductFilters } from '../components/products/ProductFilters';
import { ProductSort } from '../components/products/ProductSort';
import { Pagination } from '../components/common/Pagination';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../i18n';
import './ProductsPage.css';

export const ProductsPage: React.FC = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Parse URL params
  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentSort = searchParams.get('sort') as any || 'newest';
  const currentQ = searchParams.get('q') || '';
const currentCategory = searchParams.get('categoryId') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentMinMoq = searchParams.get('minMoq') || '';
  const currentCountry = searchParams.get('country') || '';
  const currentMinRating = searchParams.get('minRating') || '';

  // Fetch products with filters
  const { data, isLoading, error } = useProducts({
  q: currentQ,
  categoryId: currentCategory, // This now passes the ID, not slug
  minPrice: currentMinPrice ? parseFloat(currentMinPrice) : undefined,
  maxPrice: currentMaxPrice ? parseFloat(currentMaxPrice) : undefined,
  minMoq: currentMinMoq ? parseInt(currentMinMoq) : undefined,
  country: currentCountry,
  minRating: currentMinRating ? parseFloat(currentMinRating) : undefined,
  sort: currentSort,
  page: currentPage,
});

  // Update URL when filters change
  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    // Reset to page 1 when filters change
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSortChange = (sort: string) => {
    updateFilters({ sort });
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page: page.toString() });
  };

  const clearFilters = () => {
    setSearchParams({});
    setIsMobileFilterOpen(false);
  };

  return (
    <div className="products-page">
      <div className="container">
        <Breadcrumbs 
          items={[
            { label: 'Home', path: '/' },
            { label: 'Products', path: '/products' }
          ]}
        />

        <div className="products-header">
          <h1 className="products-title">
            {currentQ ? `${t('products.searchResults', 'Search Results for')} "${currentQ}"` : t('products.title', 'All Products')}
          </h1>
          <p className="products-count">{data?.total || 0} {t('products.found', 'products found')}</p>
        </div>

        {/* Mobile Filter Toggle */}
        <button 
          className="mobile-filter-toggle"
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
        >
          <FunnelIcon className="icon" />
          {t('products.filters', 'Filters')}
        </button>

        <div className="products-layout">
          {/* Filters Sidebar */}
          <aside className={`products-sidebar ${isMobileFilterOpen ? 'open' : ''}`}>
            <ProductFilters
              initialFilters={{
                categoryId: currentCategory,
                minPrice: currentMinPrice,
                maxPrice: currentMaxPrice,
                minMoq: currentMinMoq,
                country: currentCountry,
                minRating: currentMinRating,
              }}
              onFilterChange={updateFilters}
              onClearFilters={clearFilters}
            />
          </aside>

          {/* Main Content */}
          <main className="products-main">
            <div className="products-toolbar">
              <ProductSort 
                currentSort={currentSort} 
                onSortChange={handleSortChange}
              />
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
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  {t('products.retry', 'Retry')}
                </button>
              </div>
            ) : data?.items.length === 0 ? (
              <div className="empty-state">
                <h3>{t('products.none', 'No products found')}</h3>
                <p>{t('products.tryAdjust', 'Try adjusting your filters or search query')}</p>
                <button 
                  className="btn btn-primary"
                  onClick={clearFilters}
                >
                  {t('products.clearFilters', 'Clear Filters')}
                </button>
              </div>
            ) : (
              <>
                <ProductGrid products={data?.items || []} />
                
                {data && data.pages > 1 && (
                  <Pagination
                    currentPage={data.page}
                    totalPages={data.pages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </main>
        </div>

        {/* Mobile Filter Overlay */}
        {isMobileFilterOpen && (
          <div 
            className="mobile-filter-overlay"
            onClick={() => setIsMobileFilterOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
