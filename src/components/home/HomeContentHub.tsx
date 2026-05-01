import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useI18n } from '../../i18n';
import { resolveMediaUrl } from '../../utils/media';
import './HomeContentHub.css';

interface BlogPostListItem {
  slug: string;
  title: string;
  summary?: string;
  coverImageUrl?: string;
  publishedAt?: string;
}

export const HomeContentHub: React.FC = () => {
  const { lang, t } = useI18n();
  const [blogs, setBlogs] = useState<BlogPostListItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const blogRes = await api.get<{ items: BlogPostListItem[] }>('/blog', { params: { limit: 3 } });
        setBlogs(Array.isArray(blogRes.data.items) ? blogRes.data.items : []);
      } catch {
        setBlogs([]);
      }
    };

    void load();
  }, [lang]);

  const hasBlogs = blogs.length > 0;

  return (
    <section className="home-content-hub">
      <div className="container">
        <div className="hub-grid">
          <article className="hub-card">
            <div className="hub-header">
              <h2>{t('home.latestBlogPosts', 'Latest Blog Posts')}</h2>
              <Link to="/blog" className="hub-link">{t('common.viewAll', 'View all')}</Link>
            </div>
            {hasBlogs ? (
              <div className="hub-blog-list">
                {blogs.map((post) => (
                  <Link key={post.slug} to={`/blog/${post.slug}`} className="hub-blog-item">
                    {resolveMediaUrl(post.coverImageUrl) ? (
                      <img src={resolveMediaUrl(post.coverImageUrl)} alt={post.title} />
                    ) : (
                      <div className="hub-blog-placeholder" />
                    )}
                    <div>
                      <h3>{post.title}</h3>
                      <p>{post.summary || t('home.readLatest', 'Read latest updates from Senel.')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="hub-empty">{t('blog.empty', 'No blog posts available yet.')}</p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
};
