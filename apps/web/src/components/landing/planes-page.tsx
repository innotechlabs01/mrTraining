'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Header } from './page-shell';
import './landing.css';
import type { Plan } from './data';
import { fetchPublicPlans } from './data';

export default function PlanesPage() {
  const t = useTranslations('common');
  const searchParams = useSearchParams();
  const selected = searchParams.get('id');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicPlans().then((items) => {
      if (cancelled) return;
      setPlans(items);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="ig-root">
      <Header activeKey="plans" />
      <main className="ig-page-main">
        <div className="ig-container">
          <div className="ig-section-head">
            <h1 className="ig-section-title">{t('landing.plans.title')}</h1>
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
                <div
                  key={plan.id}
                  className={`ig-card ig-plan-card ${plan.id === selected ? 'ig-plan-card-selected' : ''}`}
                >
                  <div className="ig-plan-header">
                    <h2 className="ig-plan-name">{plan.name}</h2>
                    <p className="ig-plan-price">
                      ${plan.price}
                      <span className="ig-plan-currency">/{plan.billingPeriod || t('landing.plans.per')}</span>
                    </p>
                    {plan.currency && <span className="ig-tag">{plan.currency}</span>}
                  </div>
                  {plan.description && <p className="ig-plan-desc">{plan.description}</p>}
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <ul className="ig-plan-features">
                      {plan.features.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}