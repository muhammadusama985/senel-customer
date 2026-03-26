import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import './CategoriesPage.css';

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive?: boolean;
}

export const CategoriesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: categories, isLoading } = useCategories();

  const filteredCategories: Category[] = categories?.filter((category: Category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="categories-page">
      <div className="container">
        <div className="categories-hero">
          <div className="categories-header">
            <span className="categories-kicker">Browse by Collection</span>
            <h1>Product Categories</h1>
            <p>Explore curated category groups and jump straight into the products you need.</p>
          </div>
        </div>

        <div className="categories-search">
          <div className="search-wrapper">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="categories-loader">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="category-skeleton" />
            ))}
          </div>
        ) : (
          <div className="categories-grid">
            {filteredCategories.map((category: Category) => (
              <Link key={category._id} to={`/products?categoryId=${category._id}`} className="category-card">
                <div className="category-card-media">
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt={category.name} className="category-card-image" />
                  ) : (
                    <div className="category-card-placeholder">{category.name.charAt(0)}</div>
                  )}
                </div>
                <div className="category-card-body">
                  <span className="category-card-eyebrow">{category.parentId ? 'Subcategory' : 'Main Category'}</span>
                  <h2 className="category-card-title">{category.name}</h2>
                  <span className="category-card-cta">Explore Products</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && filteredCategories.length === 0 && (
          <div className="no-results">
            <h3>No categories found</h3>
            <p>Try adjusting your search term</p>
          </div>
        )}
      </div>
    </div>
  );
};
