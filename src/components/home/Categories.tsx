import React from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { useI18n } from '../../i18n';
import { resolveMediaUrl } from '../../utils/media';
import './Categories.css';

interface Category {
  _id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

export const Categories: React.FC = () => {
  const { t } = useI18n();
  const { data: categories, isLoading } = useCategories(8);

  if (isLoading) {
    return (
      <section className="categories-section">
        <div className="container">
          <h2>{t('home.trendingCategories', 'Trending Categories')}</h2>
          <div className="categories-loader">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="category-skeleton" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="categories-section">
      <div className="container">
        <div className="section-header">
          <h2>{t('home.trendingCategories', 'Trending Categories')}</h2>
          <Link to="/categories" className="view-all-link">
            {t('home.viewAllCategories', 'View All Categories')} &rarr;
          </Link>
        </div>

        {categories?.length ? (
          <div className="categories-bar" role="list" aria-label="Trending categories">
            {categories.map((category: Category) => (
              <Link
                key={category._id}
                to={`/products?categoryId=${category._id}`}
                className="category-card"
                role="listitem"
              >
                <div className="category-image">
                  {category.imageUrl ? (
                    <img src={resolveMediaUrl(category.imageUrl)} alt={category.name} />
                  ) : (
                    <div className="category-placeholder">
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="category-copy">
                  <h3 className="category-name">{category.name}</h3>
                  <span className="category-link-text">{t('home.exploreCategory', 'Explore Category')}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="error-message">
            No categories found
          </div>
        )}
      </div>
    </section>
  );
};
