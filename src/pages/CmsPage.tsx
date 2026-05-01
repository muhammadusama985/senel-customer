import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import api from '../api/client';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useI18n } from '../i18n';
import './CmsPage.css';

interface CmsPageData {
  slug: string;
  title: string;
  content: string;
}

const aliasToSlug: Record<string, string> = {
  about: 'about',
  contact: 'contact',
  faq: 'faq',
  help: 'help',
  shipping: 'shipping',
  returns: 'returns',
  terms: 'terms',
  privacy: 'privacy',
};

export const CmsPage: React.FC = () => {
  const location = useLocation();
  const { slug = '' } = useParams<{ slug: string }>();
  const { lang, t } = useI18n();
  const [page, setPage] = useState<CmsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pageSlug = useMemo(() => {
    if (slug) return slug;
    const segment = location.pathname.replace(/^\/+/, '').split('/')[0] || '';
    return segment;
  }, [location.pathname, slug]);

  useEffect(() => {
    const mappedSlug = aliasToSlug[pageSlug] || pageSlug;
    if (!mappedSlug) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<{ page: CmsPageData }>(`/pages/${mappedSlug}`);
        setPage(response.data.page || null);
      } catch (err: any) {
        setPage(null);
        setError(err.response?.data?.message || t('cms.notFound', 'Page not found'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [lang, pageSlug, t]);

  const title = page?.title || t(`cms.${pageSlug}`, pageSlug || 'Page');

  return (
    <div className="cms-page">
      <div className="container">
        <Breadcrumbs
          items={[
            { label: t('nav.home', 'Home'), path: '/' },
            { label: title, path: `/pages/${pageSlug}` },
          ]}
        />

        <article className="card cms-content">
          {loading ? (
            <p>{t('cms.loading', 'Loading content...')}</p>
          ) : error ? (
            <div>
              <h1>{title}</h1>
              <p className="muted">{error}</p>
            </div>
          ) : (
            <>
              <h1>{page?.title}</h1>
              <div
                className="cms-html"
                dangerouslySetInnerHTML={{ __html: page?.content || '' }}
              />
            </>
          )}
        </article>
      </div>
    </div>
  );
};
