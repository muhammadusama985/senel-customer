import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import './Breadcrumbs.css';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="breadcrumbs-item">
              {item.path && !isLast ? (
                <Link to={item.path} className="breadcrumbs-link">
                  {item.label}
                </Link>
              ) : (
                <span className={`breadcrumbs-text ${isLast ? 'current' : ''}`}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRightIcon className="breadcrumbs-separator" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};