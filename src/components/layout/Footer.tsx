import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section footer-brand">
            <h3 className="footer-title">Senel Express</h3>
            <p className="footer-description">
              Your trusted B2B wholesale marketplace for bulk purchases worldwide.
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-subtitle">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/pages/about">About Us</Link></li>
              <li><Link to="/pages/contact">Contact</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/pages/faq">FAQ</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-subtitle">Categories</h4>
            <ul className="footer-links">
              <li><Link to="/products?q=electronics">Electronics</Link></li>
              <li><Link to="/products?q=apparel">Apparel</Link></li>
              <li><Link to="/products?q=home%20garden">Home &amp; Garden</Link></li>
              <li><Link to="/products?q=toys">Toys</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-subtitle">Support</h4>
            <ul className="footer-links">
              <li><Link to="/pages/help">Help Center</Link></li>
              <li><Link to="/pages/shipping">Shipping Info</Link></li>
              <li><Link to="/pages/returns">Returns</Link></li>
              <li><Link to="/pages/terms">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} Senel Express. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/pages/privacy">Privacy Policy</Link>
            <Link to="/pages/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
