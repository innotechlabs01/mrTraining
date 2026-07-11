'use client';

import { useState } from 'react';
import { ListChecks, FileText, Footprints, CheckCircle2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CoachEvent, EventFormField } from '@/features/coach/types';

export function EventFormatBody({ event }: { event: CoachEvent }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  const toggleCheck = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  const setField = (id: string, val: string | string[]) => setFormValues((prev) => ({ ...prev, [id]: val }));

  return (
    <div className="space-y-5">
      {event.format === 'lista' && (
        <Section icon={<ListChecks className="w-4 h-4" />} title="Lista de elementos">
          <div className="space-y-2">
            {(event.listItems ?? []).map((item, i) => (
              <button key={i} onClick={() => toggleCheck(i)}
                className="flex items-center gap-3 w-full text-left p-2.5 rounded-lg border border-white/5 bg-surface-2 hover:border-white/10 transition-colors">
                <span className={cn('w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                  checked[i] ? 'bg-brand-primary border-brand-primary' : 'border-white/20')}>
                  {checked[i] && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className={cn('text-sm', checked[i] ? 'text-white/40 line-through' : 'text-white/80')}>{item}</span>
              </button>
            ))}
            {(event.listItems ?? []).length === 0 && <Empty>No hay elementos en la lista.</Empty>}
          </div>
        </Section>
      )}

      {event.format === 'formulario' && (
        <Section icon={<FileText className="w-4 h-4" />} title="Formulario de registro">
          {submitted ? (
            <div className="flex items-center gap-2 text-sm text-green-400 p-3 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-5 h-5" /> Registro enviado correctamente
            </div>
          ) : (
            <div className="space-y-3">
              {(event.formFields ?? []).map((f) => (
                <FormFieldRenderer key={f.id} field={f} value={formValues[f.id]} onChange={(v) => setField(f.id, v)} />
              ))}
              {(event.formFields ?? []).length === 0 && <Empty>Este formulario no tiene campos.</Empty>}
              {(event.formFields ?? []).length > 0 && (
                <button onClick={() => setSubmitted(true)}
                  className="w-full py-2.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors">
                  Enviar registro
                </button>
              )}
            </div>
          )}
        </Section>
      )}

      {event.format === 'running' && (
        <Section icon={<Footprints className="w-4 h-4" />} title="Detalles de la carrera">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Distancia" value={event.running?.distanceKm ? `${event.running.distanceKm} km` : '—'} />
            <Stat label="Ritmo" value={event.running?.pace ?? '—'} />
            <Stat label="Punto" value={event.running?.meetingPoint ?? '—'} />
          </div>
          <div className="mt-3 h-24 rounded-xl border border-white/10 bg-gradient-to-r from-brand-primary/15 via-surface-2 to-cyan-500/15 flex items-center justify-center text-xs text-white/40">
            Ruta / mapa de la carrera
          </div>
        </Section>
      )}
    </div>
  );
}

export function FormFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: EventFormField;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  if (field.kind === 'text') {
    return (
      <div>
        <Label>{field.label}</Label>
        <input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Escribe aquí"
          className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary" />
      </div>
    );
  }
  if (field.kind === 'select') {
    return (
      <div>
        <Label>{field.label}</Label>
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-primary">
          <option value="" className="bg-surface-1">Selecciona una opción</option>
          {(field.options ?? []).map((o, i) => <option key={i} value={o} className="bg-surface-1">{o}</option>)}
        </select>
      </div>
    );
  }
  const selected = (value as string[]) ?? [];
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  return (
    <div>
      <Label>{field.label}</Label>
      <div className="space-y-1.5">
        {(field.options ?? []).map((opt, i) => {
          const on = selected.includes(opt);
          return (
            <button key={i} type="button" onClick={() => toggle(opt)}
              className={cn('flex items-center gap-2.5 w-full text-left p-2 rounded-lg border text-sm transition-colors',
                on ? 'border-brand-primary bg-brand-primary/10 text-white' : 'border-white/10 bg-surface-2 text-white/60 hover:border-white/20')}>
              <span className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', on ? 'bg-brand-primary border-brand-primary' : 'border-white/30')}>
                {on && <Check className="w-3 h-3 text-white" />}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium text-white/40 mb-2">
        <span className="text-brand-primary">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 border border-white/10 px-3 py-2.5 text-center">
      <p className="text-[10px] text-white/40 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-white/30 italic">{children}</p>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-white/50 mb-1.5">{children}</label>;
}
