'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Mail, MapPin } from 'lucide-react';
import { WhatsAppIcon } from './icons';
import type { LandingContact } from './data';

export function ContactSection({ contact }: { contact: LandingContact }) {
  const t = useTranslations('common');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/marketing/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error('request failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="ig-section ig-contact" id="contact">
      <div className="ig-container">
        <div className="ig-section-head">
          <h2 className="ig-h2">
            <span className="accent">{t('landing.contact.titleA')}</span> {t('landing.contact.titleB')}
          </h2>
          <p className="ig-lede">{t('landing.contact.lede')}</p>
        </div>

        <div className="ig-contact-card">
          <div className="ig-contact-info">
            <h3>{t('landing.contact.heading')}</h3>
            <p>{t('landing.contact.copy')}</p>

            <div className="ig-contact-methods">
              {contact.whatsapp && (
                <a className="ig-contact-method" href={contact.whatsapp} target="_blank" rel="noreferrer">
                  <WhatsAppIcon />
                  <div>
                    <span>{t('landing.contact.whatsappLabel')}</span>
                    <strong>{t('landing.contact.whatsappStrong')}</strong>
                  </div>
                </a>
              )}
              {contact.email && (
                <a className="ig-contact-method" href={`mailto:${contact.email}`}>
                  <Mail size={18} />
                  <div>
                    <span>{t('landing.contact.emailLabel')}</span>
                    <strong>{contact.email}</strong>
                  </div>
                </a>
              )}
              {contact.city && (
                <div className="ig-contact-method">
                  <MapPin size={18} />
                  <div>
                    <span>{t('landing.contact.cityLabel')}</span>
                    <strong>{contact.city}</strong>
                  </div>
                </div>
              )}
            </div>

            {Array.isArray(contact.socialLinks) && contact.socialLinks.length > 0 && (
              <div className="ig-contact-socials">
                {contact.socialLinks.map((s) => (
                  <a key={s.label} className="ig-contact-social" href={s.href} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            {status === 'sent' ? (
              <div className="ig-form-status is-success" role="status">
                {t('landing.contact.form.success')}
                {contact.whatsapp && (
                  <a href={contact.whatsapp} target="_blank" rel="noreferrer">
                    {' '}
                    {t('landing.contact.form.whatsapp')}
                  </a>
                )}
              </div>
            ) : (
              <form className="ig-form" onSubmit={submit}>
                <input
                  type="text"
                  placeholder={t('landing.contact.form.name')}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  name="name"
                  autoComplete="name"
                />
                <input
                  type="email"
                  placeholder={t('landing.contact.form.email')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  name="email"
                  autoComplete="email"
                />
                <textarea
                  placeholder={t('landing.contact.form.message')}
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  name="message"
                />
                <button className="ig-btn ig-btn-solid" type="submit" disabled={status === 'sending'}>
                  {status === 'sending'
                    ? t('landing.contact.form.sending')
                    : t('landing.contact.form.submit')}
                </button>
                {status === 'error' && (
                  <div className="ig-form-status is-error" role="alert">
                    {t('landing.contact.form.error')}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}