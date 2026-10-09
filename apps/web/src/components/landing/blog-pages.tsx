'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Book, Clock } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Header } from './page-shell';
import './landing.css';
import type { BlogPost } from './data';
import { fetchPublicBlogPost, fetchPublicBlogPosts } from './data';

function readMinutes(content: string | undefined): number {
  if (!content) return 1;
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

// ---------------------------------------------------------------------------
// /blog — list of published posts
// ---------------------------------------------------------------------------

export function BlogListPage() {
  const t = useTranslations('common');
  const locale = useLocale();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const dateFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    let cancelled = false;
    fetchPublicBlogPosts().then((items) => {
      if (cancelled) return;
      setPosts(items);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="ig-root">
      <Header activeKey="blog" />
      <main className="ig-page-main">
        <div className="ig-container">
          <div className="ig-section-head">
            <h1 className="ig-section-title">{t('landing.blog.title')}</h1>
            <p className="ig-section-subtitle">{t('landing.blog.subtitle')}</p>
          </div>

          {!hydrated ? (
            <div className="ig-loading">
              <div className="ig-spinner" role="status" aria-label={t('landing.loading')} />
            </div>
          ) : posts.length === 0 ? (
            <p className="ig-empty">{t('landing.blog.empty')}</p>
          ) : (
            <div className="ig-grid ig-blog-grid">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="ig-card ig-blog-card">
                  {post.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.coverImageUrl} alt={post.title} className="ig-blog-img" />
                  ) : (
                    <div className="ig-blog-img ig-blog-img-placeholder">
                      <Book size={24} />
                    </div>
                  )}
                  <div className="ig-blog-body">
                    {post.coachName && <span className="ig-tag">{post.coachName}</span>}
                    <h2 className="ig-blog-title">{post.title}</h2>
                    <p className="ig-blog-excerpt">{post.excerpt}</p>
                    <div className="ig-blog-meta">
                      <span>
                        <Clock size={12} /> {t('landing.blog.readTime', { n: readMinutes(post.content) })}
                      </span>
                      {post.publishedAt && <span>{dateFmt.format(new Date(post.publishedAt))}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// /blog/[slug] — single post
// ---------------------------------------------------------------------------

export function BlogPostPage({ slug }: { slug: string }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const dateFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    let cancelled = false;
    fetchPublicBlogPost(slug).then((item) => {
      if (cancelled) return;
      setPost(item);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="ig-root">
      <Header activeKey="blog" />
      <main className="ig-page-main">
        <div className="ig-container">
          <Link href="/blog" className="ig-page-back">
            {t('landing.blog.back')}
          </Link>

          {post === undefined ? (
            <div className="ig-loading">
              <div className="ig-spinner" role="status" aria-label={t('landing.loading')} />
            </div>
          ) : post === null ? (
            <p className="ig-empty">{t('landing.blog.notFound')}</p>
          ) : (
            <>
              <article>
                <header className="ig-post-head">
                  <h1 className="ig-post-title">{post.title}</h1>
                  <div className="ig-post-meta">
                    {post.coachName && <span>{post.coachName}</span>}
                    {post.publishedAt && <span>{dateFmt.format(new Date(post.publishedAt))}</span>}
                    <span>{t('landing.blog.readTime', { n: readMinutes(post.content) })}</span>
                  </div>
                </header>
                {post.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.coverImageUrl} alt={post.title} className="ig-post-cover" />
                )}
                {post.content && (
                  <div
                    className="ig-post-body"
                    // Coach-authored content from the app's own API
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                )}
              </article>
            </>
          )}
        </div>
      </main>
    </div>
  );
}