import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../i18n';
import './ProductFilters.css';
import { CategoryFilter } from './CategoryFilter';

interface ProductFiltersProps {
  initialFilters: {
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    minMoq?: string;
    country?: string;
    minRating?: string;
  };
  onFilterChange: (filters: Record<string, string>) => void;
  onClearFilters: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  initialFilters,
  onFilterChange,
  onClearFilters,
}) => {
  const { t } = useI18n();
  const [filters, setFilters] = useState(initialFilters);
  const [priceRange, setPriceRange] = useState({
    min: initialFilters.minPrice || '',
    max: initialFilters.maxPrice || '',
  });

  const countries = ['Germany', 'Turkey', 'France', 'Italy', 'Spain', 'Netherlands'];

  const handleChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange({
      categoryId: filters.categoryId || '',
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      minMoq: filters.minMoq || '',
      country: filters.country || '',
      minRating: filters.minRating || '',
    });
  };

  const handleClear = () => {
    setFilters({});
    setPriceRange({ min: '', max: '' });
    onClearFilters();
  };

  const activeFilterCount = [
    filters.categoryId,
    priceRange.min,
    priceRange.max,
    filters.minMoq,
    filters.country,
    filters.minRating,
  ].filter(Boolean).length;

  return (
    <div className="product-filters">
      <div className="filters-header">
        <h3>{t('products.filters', 'Filters')}</h3>
        {activeFilterCount > 0 && (
          <button className="clear-filters" onClick={handleClear}>
            <XMarkIcon className="icon-small" />
            {t('filters.clearAll', 'Clear all')}
          </button>
        )}
      </div>

      <CategoryFilter
        selectedCategory={filters.categoryId}
        onCategoryChange={(categoryId) => handleChange('categoryId', categoryId)}
      />

      <div className="filter-section">
        <h4 className="filter-title">{t('filters.priceRange', 'Price Range')} (&euro;)</h4>
        <div className="price-range">
          <input
            type="number"
            placeholder="Min"
            value={priceRange.min}
            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
            className="price-input"
            min="0"
          />
          <span className="price-separator">-</span>
          <input
            type="number"
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
            className="price-input"
            min="0"
          />
        </div>
      </div>

      <div className="filter-section">
        <h4 className="filter-title">{t('filters.minOrderQty', 'Minimum Order Quantity')}</h4>
        <input
          type="number"
          placeholder="MOQ"
          value={filters.minMoq || ''}
          onChange={(e) => handleChange('minMoq', e.target.value)}
          className="filter-input"
          min="1"
        />
      </div>

      <div className="filter-section">
        <h4 className="filter-title">{t('filters.vendorRating', 'Vendor Rating')}</h4>
        <select
          value={filters.minRating || ''}
          onChange={(e) => handleChange('minRating', e.target.value)}
          className="filter-select"
        >
          <option value="">{t('filters.anyRating', 'Any Rating')}</option>
          <option value="4.5">4.5+ ⭐</option>
          <option value="4">4.0+ ⭐</option>
          <option value="3.5">3.5+ ⭐</option>
          <option value="3">3.0+ ⭐</option>
        </select>
      </div>

      <div className="filter-section">
        <h4 className="filter-title">{t('filters.country', 'Country')}</h4>
        <select
          value={filters.country || ''}
          onChange={(e) => handleChange('country', e.target.value)}
          className="filter-select"
        >
          <option value="">{t('filters.allCountries', 'All Countries')}</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <button
        className="btn btn-primary apply-filters"
        onClick={applyFilters}
        disabled={activeFilterCount === 0}
      >
        {t('filters.apply', 'Apply Filters')}
      </button>
    </div>
  );
};
