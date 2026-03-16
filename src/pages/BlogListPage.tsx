import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { resolveMediaUrl } from '../utils/media';
import './BlogListPage.css';

interface BlogPostListItem {
  slug: string;
  title: string;
  summary?: string;
  coverImageUrl?: string;
  publishedAt?: string;
  authorName?: string;
}

export const BlogListPage: React.FC = () => {
  const [items, setItems] = useState<BlogPostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<{ items: BlogPostListItem[] }>('/blog');
        setItems(Array.isArray(response.data.items) ? response.data.items : []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load blog');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="blog-list-page">
      <div className="container">
        <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Blog', path: '/blog' }]} />
        <div className="blog-list-header">
          <h1>Blog</h1>
          <p>Updates, guides and marketplace insights.</p>
        </div>

        {loading ? (
          <div className="card">Loading blog posts...</div>
        ) : error ? (
          <div className="card">{error}</div>
        ) : items.length === 0 ? (
          <div className="card">No blog posts available.</div>
        ) : (
          <div className="blog-grid">
            {items.map((post) => (
              <article className="card blog-item" key={post.slug}>
                {post.coverImageUrl && (
                  <img src={resolveMediaUrl(post.coverImageUrl)} alt={post.title} className="blog-cover" />
                )}
                <h3>{post.title}</h3>
                <p className="muted">{post.summary || ''}</p>
                <p className="muted">
                  {post.authorName || 'Senel'} {post.publishedAt ? `• ${new Date(post.publishedAt).toLocaleDateString()}` : ''}
                </p>
                <Link className="btn btn-outline" to={`/blog/${post.slug}`}>
                  Read
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
