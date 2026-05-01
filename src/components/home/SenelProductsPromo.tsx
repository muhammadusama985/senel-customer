import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import './SenelProductsPromo.css';

export const SenelProductsPromo: React.FC = () => {
  const { t } = useI18n();
  return (
    <section className="senel-promo-section">
      <div className="container">
        <Link to="/senel-products" className="senel-promo-card">
          <div>
            <p className="senel-promo-tag">{t('senel.tag', 'Senel Products')}</p>
            <h2>{t('senel.ownProducts', 'Our Own Products')}</h2>
            <p>{t('senel.description', 'Explore products created by Senel admin and offered directly by the platform.')}</p>
          </div>
          <span className="senel-promo-cta">{t('senel.viewList', 'View Senel Product List')} {'->'}</span>
        </Link>
      </div>
    </section>
  );
};
