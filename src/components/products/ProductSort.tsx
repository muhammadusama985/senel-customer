import React from 'react';
import './ProductSort.css';

interface ProductSortProps {
  currentSort: string;
  onSortChange: (sort: string) => void;
}

export const ProductSort: React.FC<ProductSortProps> = ({
  currentSort,
  onSortChange,
}) => {
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ];

  return (
    <div className="product-sort">
      <label htmlFor="sort-select" className="sort-label">
        Sort by:
      </label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={(e) => onSortChange(e.target.value)}
        className="sort-select"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};