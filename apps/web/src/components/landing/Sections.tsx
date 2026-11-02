'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Book, Clock, Package } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ArrowLeftIcon, ArrowRightIcon, StarIcon } from './icons';
import type { BlogPost, LandingReason, LandingTestimonial, Plan, Product } from './data';
import { FALLBACK_ABOUT, FALLBACK_REASONS, FALLBACK_TESTIMONIALS, mediaUrl, pick } from './data';
import type { LandingBrand } from './data';

// ---------------------------------------------------------------------------
// Cómo Entrenamos — 4 reasons
// ---------------------------------------------------------------------------

export function WhySection({ reasons }: { reasons: LandingReason[] }) {
  const t = useTranslations('common');
  const list = Array.isArray(reasons) ? reasons : [];
  const fallbackCount = FALLBACK_REASONS.length;

  return (
    <section className="ig-section ig-why">
      <div className="ig-container">
        <div className="ig-section-head">
          <h2 className="ig-h2">
            <span className="accent">{t('landing.why.titleA')}</span> {t('landing.why.titleB')}
          </h2>
          <p className="ig-lede">{t('landing.why.lede')}</p>
        </div>
        <div className="ig-reasons-grid">
          {list.map((r, i) => {
            const fb = FALLBACK_REASONS[i];
            const title =
              i < fallbackCount
                ? pick(r.title, fb.title, t(`landing.why.reasons.${i}.title`))
                : r.title;
            const copy =
              i < fallbackCount
                ? pick(r.copy, fb.copy, t(`landing.why.reasons.${i}.copy`))
                : r.copy;
            return (
              <div className="ig-reason" key={i}>
                <div className="ig-reason-n">{r.n}</div>
                <h3 className="ig-reason-title">{title}</h3>
                <p className="ig-reason-copy">{copy}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// About — Sobre MAO
// ---------------------------------------------------------------------------

export function AboutSection({ brand }: { brand: LandingBrand }) {
  const t = useTranslations('common');
  const copy = Array.isArray(brand.aboutCopy) ? brand.aboutCopy : FALLBACK_ABOUT.copy;
  const eyebrow = pick(brand.aboutTitle, FALLBACK_ABOUT.eyebrow, t('landing.about.eyebrow'));
  const photoAlt = pick(brand.aboutPhotoAlt, FALLBACK_ABOUT.photoAlt, t('landing.about.photoAlt'));

  return (
    <section className="ig-section" id="about">
      <div className="ig-container ig-exp-grid">
        <div className="ig-exp-text">
          <div className="ig-eyebrow">{eyebrow}</div>
          {copy.map((paragraph, i) => {
            const fb = FALLBACK_ABOUT.copy[i];
            const text =
              i < FALLBACK_ABOUT.copy.length && fb
                ? pick(paragraph, fb, t(`landing.about.copy.${i}`))
                : paragraph;
            return <p key={i}>{text}</p>;
          })}
        </div>
        <div className="ig-exp-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(brand.aboutPhoto)} alt={photoAlt} />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Asesoría Online — 6-step process
// ---------------------------------------------------------------------------

const ASESORIA_STEPS = [0, 1, 2, 3, 4, 5] as const;

export function AsesoriaSection() {
  const t = useTranslations('common');

  return (
    <section className="ig-section ig-asesoria" id="asesoria">
      <div className="ig-container">
        <div className="ig-section-head">
          <h2 className="ig-section-title">{t('landing.asesoria.title')}</h2>
          <p className="ig-section-subtitle">{t('landing.asesoria.subtitle')}</p>
        </div>

        <div className="ig-asesoria-intro">
          <div className="ig-asesoria-intro-text">
            <h3>{t('landing.asesoria.heading')}</h3>
            <p>{t('landing.asesoria.p1')}</p>
            <p>{t('landing.asesoria.p2')}</p>
            <a href="#planes" className="ig-btn ig-btn-solid">
              {t('landing.asesoria.cta')}
            </a>
          </div>
          <div className="ig-asesoria-for">
            <h4>{t('landing.asesoria.forTitle')}</h4>
            <ul>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i}>{t(`landing.asesoria.for.${i}`)}</li>
              ))}
            </ul>
          </div>
        </div>

        <h3 className="ig-asesoria-steps-title">{t('landing.asesoria.stepsTitle')}</h3>
        <div className="ig-asesoria-steps">
          {ASESORIA_STEPS.map((i) => (
            <div key={i} className="ig-asesoria-step">
              <div className="ig-asesoria-step-n">{t(`landing.asesoria.steps.${i}.n`)}</div>
              <h4 className="ig-asesoria-step-title">{t(`landing.asesoria.steps.${i}.title`)}</h4>
              <p className="ig-asesoria-step-desc">{t(`landing.asesoria.steps.${i}.desc`)}</p>
            </div>
          ))}
        </div>

        <div className="ig-asesoria-cta">
          <p>{t('landing.asesoria.ctaTitle')}</p>
          <a href="#contact" className="ig-btn ig-btn-solid">
            {t('landing.asesoria.ctaButton')}
          </a>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Planes — from /api/marketing/plans
// ---------------------------------------------------------------------------

export function PlansSection({ plans, hydrated }: { plans: Plan[]; hydrated: boolean }) {
  const t = useTranslations('common');

  return (
    <section className="ig-section" id="planes">
      <div className="ig-container">
        <div className="ig-section-head">
          <h2 className="ig-section-title">{t('landing.plans.title')}</h2>
          <p className="ig-section-subtitle">{t('landing.plans.subtitle')}</p>
        </div>

        {!hydrated ? (
          <div className="ig-loading">
            <div className="ig-spinner" role="status" aria-label={t('landing.loading')} />
          </div>
        ) : plans.length === 0 ? (
          <p className="ig-empty">{t('landing.plans.empty')}</p>
        ) : (
          <div className="ig-grid ig-plans-grid">
            {plans.map((plan) => (
              <div key={plan.id} className="ig-card ig-plan-card">
                <div className="ig-plan-header">
                  <h3 className="ig-plan-name">{plan.name}</h3>
                  <p className="ig-plan-price">
                    ${plan.price}
                    <span className="ig-plan-currency">
                      /{plan.billingPeriod || t('landing.plans.per')}
                    </span>
                  </p>
                </div>
                {plan.description && <p className="ig-plan-desc">{plan.description}</p>}
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <ul className="ig-plan-features">
                    {plan.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/planes?id=${plan.id}`}
                  className="ig-btn ig-btn-outline"
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  {t('landing.plans.choose')}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonials — carousel
// ---------------------------------------------------------------------------

export function TestimonialsSection({
  testimonials,
  index,
  onPrev,
  onNext,
  onSelect,
}: {
  testimonials: LandingTestimonial[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations('common');
  const list = Array.isArray(testimonials) ? testimonials : [];
  if (list.length === 0) return null;
  const current = list[Math.max(0, Math.min(index, list.length - 1))];
  const fb = index < FALLBACK_TESTIMONIALS.length ? FALLBACK_TESTIMONIALS[index] : undefined;
  const quote = fb ? pick(current.quote, fb.quote, t(`landing.testimonials.quote.${index}`)) : current.quote;
  const name = fb ? pick(current.name, fb.name, t(`landing.testimonials.name.${index}`)) : current.name;

  return (
    <section className="ig-section ig-testi" id="testimonials">
      <div className="ig-container">
        <h2 className="ig-h2">
          {t('landing.testimonials.titleA')} <span className="accent">{t('landing.testimonials.titleB')}</span>
        </h2>
        <p className="ig-testi-quote">&ldquo;{quote}&rdquo;</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <StarIcon key={i} />
          ))}
        </div>
        <div className="ig-testi-name">{name}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ig-testi-avatar" src={current?.photo ? mediaUrl(current.photo) : `https://i.pravatar.cc/120?img=${12 + (index % 50)}`} alt={name} />
        <div className="ig-testi-nav">
          <button onClick={onPrev} aria-label={t('landing.testimonials.previous')}>
            <ArrowLeftIcon />
          </button>
          <button onClick={onNext} aria-label={t('landing.testimonials.next')}>
            <ArrowRightIcon />
          </button>
        </div>
        <div className="ig-dots">
          {list.map((_, i) => (
            <button
              key={i}
              className={i === index ? 'active' : ''}
              onClick={() => onSelect(i)}
              aria-label={`${t('landing.testimonials.show')} ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tienda — products from /api/marketing/products
// ---------------------------------------------------------------------------

export function StoreSection({ products, hydrated }: { products: Product[]; hydrated: boolean }) {
  const t = useTranslations('common');
  const list = Array.isArray(products) ? products : [];

  return (
    <section className="ig-section" id="tienda">
      <div className="ig-container">
        <div className="ig-section-head">
          <h2 className="ig-section-title">{t('landing.store.title')}</h2>
          <p className="ig-section-subtitle">{t('landing.store.copy')}</p>
        </div>

        {!hydrated ? (
          <div className="ig-loading">
            <div className="ig-spinner" role="status" aria-label={t('landing.loading')} />
          </div>
        ) : list.length === 0 ? (
          <p className="ig-empty">{t('landing.store.empty')}</p>
        ) : (
          <div className="ig-grid ig-product-grid">
            {list.map((product) => (
              <div key={product.id} className="ig-card ig-product-card">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="ig-product-img" />
                ) : (
                  <div className="ig-product-img ig-product-img-placeholder">
                    <Package size={24} />
                  </div>
                )}
                <div className="ig-product-body">
                  <h3 className="ig-product-name">{product.name}</h3>
                  {product.category && <span className="ig-tag">{product.category}</span>}
                  {product.description && <p className="ig-product-desc">{product.description}</p>}
                  <div className="ig-product-price">${Number(product.price).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Blog — posts from /api/marketing/blog
// ---------------------------------------------------------------------------

function readMinutes(content: string | undefined): number {
  if (!content) return 1;
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

export function BlogSection({ posts, hydrated }: { posts: BlogPost[]; hydrated: boolean }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const list = Array.isArray(posts) ? posts : [];
  const dateFmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <section className="ig-section" id="blog">
      <div className="ig-container">
        <div className="ig-section-head">
          <h2 className="ig-section-title">{t('landing.blog.title')}</h2>
          <p className="ig-section-subtitle">{t('landing.blog.subtitle')}</p>
        </div>

        {!hydrated ? (
          <div className="ig-loading">
            <div className="ig-spinner" role="status" aria-label={t('landing.loading')} />
          </div>
        ) : list.length === 0 ? (
          <p className="ig-empty">{t('landing.blog.empty')}</p>
        ) : (
          <div className="ig-grid ig-blog-grid">
            {list.map((post) => (
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
                  <h3 className="ig-blog-title">{post.title}</h3>
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
    </section>
  );
}