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

  const parentCategories: Category[] = filteredCategories.filter((c: Category) => !c.parentId) || [];
  const childCategories: Category[] = filteredCategories.filter((c: Category) => c.parentId) || [];

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
            {parentCategories.map((category: Category) => {
              const subcategories: Category[] = childCategories.filter(
                (c: Category) => c.parentId === category._id
              );
              
              return (
                <div key={category._id} className="category-section">
                  <Link to={`/products?categoryId=${category._id}`} className="category-main">
                    <div>
                      <h2 className="category-main-title">{category.name}</h2>
                      <span className="category-count">{subcategories.length} subcategories</span>
                    </div>
                    <span className="category-arrow">&rarr;</span>
                  </Link>
                  
                  {subcategories.length > 0 && (
                    <div className="subcategories-grid">
                      {subcategories.slice(0, 4).map((sub: Category) => (
                        <Link
                          key={sub._id}
                          to={`/products?categoryId=${sub._id}`}
                          className="subcategory-card"
                        >
                          {sub.imageUrl && (
                            <img src={sub.imageUrl} alt={sub.name} className="subcategory-image" />
                          )}
                          <span className="subcategory-name">{sub.name}</span>
                        </Link>
                      ))}
                      {subcategories.length > 4 && (
                        <Link
                          to={`/products?categoryId=${category._id}`}
                          className="subcategory-card view-all"
                        >
                          <span className="view-all-text">+{subcategories.length - 4} more</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
