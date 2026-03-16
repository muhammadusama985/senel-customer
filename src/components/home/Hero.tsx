import React, { useEffect, useMemo, useState } from 'react';
import { useBanners } from '../../hooks/useBanners';
import { useI18n } from '../../i18n';
import { resolveMediaUrl } from '../../utils/media';
import './Hero.css';

export const Hero: React.FC = () => {
  const { t } = useI18n();
  const { data: banners = [] } = useBanners();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    setIndex(0);
  }, [banners.length]);

  const activeBanner = useMemo(() => banners[index], [banners, index]);
  const heroImageUrl = resolveMediaUrl(activeBanner?.imageUrl);
  const heroBackground = heroImageUrl
    ? {
        backgroundImage: `linear-gradient(110deg, rgba(7, 9, 20, 0.78) 0%, rgba(7, 9, 20, 0.45) 40%, rgba(7, 9, 20, 0.2) 100%), url(${heroImageUrl})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }
    : undefined;

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-shell" style={heroBackground}>
          <div className="hero-corner-note">
            <span className="hero-corner-store">Senel Store</span>
          </div>
          <div className="hero-content-card">
            <div className="hero-content">
            <h1 className="hero-title">
              {activeBanner?.title || t('home.buyWholesale', 'Buy Wholesale.')}
              <br />
              {activeBanner?.subtitle || t('home.fastTrusted', 'Fast. Trusted.')}
            </h1>

            <p className="hero-subtitle">
              {t('home.sourceBulk', 'Source products in bulk from reliable suppliers around the world.')}
            </p>
            </div>
          </div>

          {banners.length > 1 && (
            <div className="hero-dots" aria-label="Banners">
              {banners.map((banner, dotIndex) => (
                <button
                  key={banner.id || String(dotIndex)}
                  type="button"
                  className={`hero-dot ${dotIndex === index ? 'active' : ''}`}
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Go to banner ${dotIndex + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
