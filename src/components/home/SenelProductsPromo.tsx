import React from 'react';
import { Link } from 'react-router-dom';
import './SenelProductsPromo.css';

export const SenelProductsPromo: React.FC = () => {
  return (
    <section className="senel-promo-section">
      <div className="container">
        <Link to="/senel-products" className="senel-promo-card">
          <div>
            <p className="senel-promo-tag">Senel Products</p>
            <h2>Our Own Products</h2>
            <p>Explore products created by Senel admin and offered directly by the platform.</p>
          </div>
          <span className="senel-promo-cta">View Senel Product List {'->'}</span>
        </Link>
      </div>
    </section>
  );
};

