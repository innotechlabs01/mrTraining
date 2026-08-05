'use client';

import { useState, useEffect, useCallback } from 'react';

interface LandingData {
  version: number;
  navLinks: string[];
  stats: { value: string; label: string }[];
  reasons: { n: string; title: string; copy: string }[];
  trainers: { name: string; seed: string }[];
  testimonials: { quote: string; name: string; seed: string }[];
  updatedAt: string;
}

export default function LandingAdminPage() {
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch('/api/landing');
      const d = await r.json();
      setData(d);
    } catch {
      setMsg('Error loading content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/landing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error('Save failed');
      const updated = await r.json();
      setData(updated);
      setMsg('Landing content updated successfully');
    } catch {
      setMsg('Error saving content');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof LandingData>(key: K, value: LandingData[K]) => {
    if (!data) return;
    setData({ ...data, [key]: value });
  };

  const updateStat = (idx: number, field: 'value' | 'label', val: string) => {
    if (!data) return;
    const stats = [...data.stats];
    stats[idx] = { ...stats[idx], [field]: val };
    updateField('stats', stats);
  };

  const updateReason = (idx: number, field: keyof LandingData['reasons'][number], val: string) => {
    if (!data) return;
    const reasons = [...data.reasons];
    reasons[idx] = { ...reasons[idx], [field]: val };
    updateField('reasons', reasons);
  };

  const updateTrainer = (idx: number, field: 'name' | 'seed', val: string) => {
    if (!data) return;
    const trainers = [...data.trainers];
    trainers[idx] = { ...trainers[idx], [field]: val };
    updateField('trainers', trainers);
  };

  const updateTestimonial = (idx: number, field: 'quote' | 'name' | 'seed', val: string) => {
    if (!data) return;
    const testimonials = [...data.testimonials];
    testimonials[idx] = { ...testimonials[idx], [field]: val };
    updateField('testimonials', testimonials);
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  if (!data) {
    return (
      <div className='flex items-center justify-center min-h-screen text-text-primary'>
        Failed to load landing content
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold text-text-primary'>Landing Page Editor</h1>
        <div className='flex items-center gap-3'>
          <span className='text-xs text-text-muted'>
            v{data.version} &middot; Updated {new Date(data.updatedAt).toLocaleString()}
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className='px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/80 disabled:opacity-50'
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.startsWith('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
          {msg}
        </div>
      )}

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold text-text-primary'>Navigation Links</h2>
        <div className='flex flex-wrap gap-2'>
          {data.navLinks.map((link, i) => (
            <input
              key={i}
              value={link}
              onChange={(e) => {
                const links = [...data.navLinks];
                links[i] = e.target.value;
                updateField('navLinks', links);
              }}
              className='px-3 py-1.5 bg-surface-1 border border-surface-3 rounded-lg text-sm text-text-primary'
            />
          ))}
        </div>
      </section>

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold text-text-primary'>Stats</h2>
        {data.stats.map((s, i) => (
          <div key={i} className='flex gap-3 items-center'>
            <input
              value={s.value}
              onChange={(e) => updateStat(i, 'value', e.target.value)}
              placeholder='Value'
              className='flex-1 px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-sm text-text-primary'
            />
            <input
              value={s.label}
              onChange={(e) => updateStat(i, 'label', e.target.value)}
              placeholder='Label'
              className='flex-1 px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-sm text-text-primary'
            />
          </div>
        ))}
      </section>

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold text-text-primary'>Reasons (Why Choose Us)</h2>
        {data.reasons.map((r, i) => (
          <div key={i} className='flex gap-3 items-start p-3 bg-surface-1 rounded-lg border border-surface-3'>
            <input
              value={r.n}
              onChange={(e) => updateReason(i, 'n', e.target.value)}
              placeholder='Number'
              className='w-12 px-2 py-1.5 bg-surface-2 border border-surface-3 rounded text-sm text-text-primary'
            />
            <div className='flex-1 space-y-2'>
              <input
                value={r.title}
                onChange={(e) => updateReason(i, 'title', e.target.value)}
                placeholder='Title'
                className='w-full px-3 py-1.5 bg-surface-2 border border-surface-3 rounded text-sm text-text-primary'
              />
              <textarea
                value={r.copy}
                onChange={(e) => updateReason(i, 'copy', e.target.value)}
                placeholder='Description'
                rows={2}
                className='w-full px-3 py-1.5 bg-surface-2 border border-surface-3 rounded text-sm text-text-primary'
              />
            </div>
          </div>
        ))}
      </section>

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold text-text-primary'>Trainers</h2>
        {data.trainers.map((t, i) => (
          <div key={i} className='flex gap-3 items-center'>
            <input
              value={t.name}
              onChange={(e) => updateTrainer(i, 'name', e.target.value)}
              placeholder='Name'
              className='flex-1 px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-sm text-text-primary'
            />
            <input
              value={t.seed}
              onChange={(e) => updateTrainer(i, 'seed', e.target.value)}
              placeholder='Image seed'
              className='flex-1 px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-sm text-text-primary'
            />
          </div>
        ))}
      </section>

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold text-text-primary'>Testimonials</h2>
        {data.testimonials.map((t, i) => (
          <div key={i} className='flex gap-3 items-start p-3 bg-surface-1 rounded-lg border border-surface-3'>
            <div className='flex-1 space-y-2'>
              <textarea
                value={t.quote}
                onChange={(e) => updateTestimonial(i, 'quote', e.target.value)}
                placeholder='Quote'
                rows={2}
                className='w-full px-3 py-1.5 bg-surface-2 border border-surface-3 rounded text-sm text-text-primary'
              />
              <input
                value={t.name}
                onChange={(e) => updateTestimonial(i, 'name', e.target.value)}
                placeholder='Name'
                className='w-full px-3 py-1.5 bg-surface-2 border border-surface-3 rounded text-sm text-text-primary'
              />
              <input
                value={t.seed}
                onChange={(e) => updateTestimonial(i, 'seed', e.target.value)}
                placeholder='Image seed'
                className='w-full px-3 py-1.5 bg-surface-2 border border-surface-3 rounded text-sm text-text-primary'
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}