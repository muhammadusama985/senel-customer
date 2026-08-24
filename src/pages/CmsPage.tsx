import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import api from '../api/client';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useI18n } from '../i18n';
import { useTranslatedData } from '../hooks/useTranslatedData';
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
  const { t } = useI18n();
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
  }, [pageSlug, t]);

  // Translate CMS page title + content in the browser. Translating HTML
  // content is safe here because the translator preserves text and skips
  // tags (it only swaps visible strings). Page metadata (slug, route)
  // stays as-is via the `shouldTranslate` whitelist.
  const translatedPage = useTranslatedData(page);
  const safePage = translatedPage ?? page;

  const title = safePage?.title || t(`cms.${pageSlug}`, pageSlug || 'Page');

  // Context-aware empty-state copy based on the page slug. The user wants
  // the message to reflect the title of the page they clicked (e.g. "No
  // contact", "No shipping", "No returns") instead of a generic "Page not
  // found" for every CMS page.
  const emptyCopy = (() => {
    const key = (safePage?.slug || pageSlug || '').toLowerCase();
    switch (key) {
      case 'contact':
        return t('cms.emptyContact', 'No contact information available yet.');
      case 'shipping':
        return t('cms.emptyShipping', 'No shipping information available yet.');
      case 'returns':
        return t('cms.emptyReturns', 'No returns information available yet.');
      case 'about':
        return t('cms.emptyAbout', 'No about information available yet.');
      case 'faq':
        return t('cms.emptyFaq', 'No FAQ entries available yet.');
      case 'help':
        return t('cms.emptyHelp', 'No help content available yet.');
      case 'terms':
        return t('cms.emptyTerms', 'No terms available yet.');
      case 'privacy':
        return t('cms.emptyPrivacy', 'No privacy policy available yet.');
      default:
        return t('cms.emptyGeneric', 'No data present yet.');
    }
  })();

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
          ) : error || !safePage || !safePage.content?.trim() ? (
            <div>
              <h1>{title}</h1>
              <p className="muted">{emptyCopy}</p>
            </div>
          ) : (
            <>
              <h1>{safePage?.title}</h1>
              <div
                className="cms-html"
                dangerouslySetInnerHTML={{ __html: safePage?.content || '' }}
              />
            </>
          )}
        </article>
      </div>
    </div>
  );
};
