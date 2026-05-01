import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import './Footer.css';

export const Footer: React.FC = () => {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section footer-brand">
            <h3 className="footer-title">Senel Express</h3>
            <p className="footer-description">{t('footer.description', 'Your trusted B2B wholesale marketplace for bulk purchases worldwide.')}</p>
          </div>

          <div className="footer-section">
            <h4 className="footer-subtitle">{t('footer.quickLinks', 'Quick Links')}</h4>
            <ul className="footer-links">
              <li><Link to="/pages/about">{t('footer.aboutUs', 'About Us')}</Link></li>
              <li><Link to="/pages/contact">{t('cms.contact', 'Contact')}</Link></li>
              <li><Link to="/blog">{t('blog.title', 'Blog')}</Link></li>
              <li><Link to="/pages/faq">{t('cms.faq', 'FAQ')}</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-subtitle">{t('footer.categories', 'Categories')}</h4>
            <ul className="footer-links">
              <li><Link to="/products?q=electronics">{t('footer.electronics', 'Electronics')}</Link></li>
              <li><Link to="/products?q=apparel">{t('footer.apparel', 'Apparel')}</Link></li>
              <li><Link to="/products?q=home%20garden">{t('footer.homeGarden', 'Home & Garden')}</Link></li>
              <li><Link to="/products?q=toys">{t('footer.toys', 'Toys')}</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-subtitle">{t('footer.support', 'Support')}</h4>
            <ul className="footer-links">
              <li><Link to="/pages/help">{t('footer.helpCenter', 'Help Center')}</Link></li>
              <li><Link to="/pages/shipping">{t('footer.shippingInfo', 'Shipping Info')}</Link></li>
              <li><Link to="/pages/returns">{t('cms.returns', 'Returns')}</Link></li>
              <li><Link to="/pages/terms">{t('footer.termsConditions', 'Terms & Conditions')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} Senel Express. {t('footer.allRights', 'All rights reserved.')}</p>
          <div className="footer-bottom-links">
            <Link to="/pages/privacy">{t('footer.privacyPolicy', 'Privacy Policy')}</Link>
            <Link to="/pages/terms">{t('footer.termsService', 'Terms of Service')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
