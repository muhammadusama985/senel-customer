import React, { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import './CategoryFilter.css';

interface CategoryFilterProps {
  selectedCategory?: string;
  onCategoryChange: (categoryId: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  const { data: categories, isLoading } = useCategories();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  if (isLoading) {
    return <div className="category-filter-skeleton">Loading categories...</div>;
  }

  const topLevelCategories = categories?.filter(cat => !cat.parentId) || [];

  const renderCategory = (category: any, depth: number = 0) => {
    const hasChildren = categories?.some(c => c.parentId === category._id);
    const isExpanded = expandedCategories.has(category._id);
    const isSelected = selectedCategory === category._id;

    return (
      <div key={category._id} className="category-item">
        <div 
          className={`category-row ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
        >
          {hasChildren && (
            <button
              className="expand-button"
              onClick={() => toggleCategory(category._id)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDownIcon className="icon-small" />
              ) : (
                <ChevronRightIcon className="icon-small" />
              )}
            </button>
          )}
          <button
            className="category-name"
            onClick={() => onCategoryChange(category._id)}
          >
            {category.name}
          </button>
        </div>

        {isExpanded && hasChildren && (
          <div className="category-children">
            {categories
              ?.filter(c => c.parentId === category._id)
              .map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="category-filter">
      <h4 className="filter-title">Categories</h4>
      <div className="category-list">
        <div className="category-item">
          <div className="category-row">
            <button
              className={`category-name ${!selectedCategory ? 'selected' : ''}`}
              onClick={() => onCategoryChange('')}
            >
              All Categories
            </button>
          </div>
        </div>
        {topLevelCategories.map(cat => renderCategory(cat))}
      </div>
    </div>
  );
};