import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { useI18n } from '../i18n';
import { resolveMediaUrl } from '../utils/media';
import './BlogDetailPage.css';

interface BlogPost {
  slug: string;
  title: string;
  summary?: string;
  content: string;
  coverImageUrl?: string;
  publishedAt?: string;
  authorName?: string;
}

export const BlogDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { lang, t } = useI18n();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<{ post: BlogPost }>(`/blog/${slug}`);
        setPost(response.data.post || null);
      } catch (err: any) {
        setPost(null);
        setError(err.response?.data?.message || t('blog.notFound', 'Blog post not found'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [lang, slug, t]);

  return (
    <div className="blog-detail-page">
      <div className="container">
        <Breadcrumbs
          items={[
            { label: t('nav.home', 'Home'), path: '/' },
            { label: t('blog.title', 'Blog'), path: '/blog' },
            { label: post?.title || slug, path: `/blog/${slug}` },
          ]}
        />

        <article className="card blog-detail-card">
          {loading ? (
            <p>{t('blog.loadingPost', 'Loading post...')}</p>
          ) : error ? (
            <p>{error}</p>
          ) : (
            <>
              <h1>{post?.title}</h1>
              <p className="muted">
                {post?.authorName || 'Senel'} {post?.publishedAt ? `• ${new Date(post.publishedAt).toLocaleDateString()}` : ''}
              </p>
              {post?.coverImageUrl && <img src={resolveMediaUrl(post.coverImageUrl)} alt={post.title} className="blog-detail-cover" />}
              <div
                className="blog-html"
                dangerouslySetInnerHTML={{ __html: post?.content || '' }}
              />
            </>
          )}
        </article>
      </div>
    </div>
  );
};
