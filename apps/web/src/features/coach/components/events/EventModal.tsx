'use client';

import { useState } from 'react';
import { X, Plus, Trash2, ListChecks, FileText, Footprints, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CoachEvent,
  EventFormat,
  EventFormField,
  EventFormFieldKind,
  TrainingMode,
} from '@/features/coach/types';

const FORMATS: { id: EventFormat; label: string; desc: string; icon: typeof ListChecks }[] = [
  { id: 'lista', label: 'Lista', desc: 'Checklist de elementos para los participantes', icon: ListChecks },
  { id: 'formulario', label: 'Formulario', desc: 'Campos personalizados a registrar', icon: FileText },
  { id: 'running', label: 'Running', desc: 'Detalles de la carrera (distancia, ritmo)', icon: Footprints },
];

const TYPES = [
  { value: 'competition', label: 'Competencia' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Otro' },
] as const;

const MODALITIES: { value: TrainingMode; label: string }[] = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'running', label: 'Running' },
];

const STATUSES = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
] as const;

const FIELD_KINDS: { value: EventFormFieldKind; label: string }[] = [
  { value: 'text', label: 'Texto a escribir' },
  { value: 'multiple', label: 'Opciones múltiples' },
  { value: 'select', label: 'Dropdown (selección)' },
];

interface EventModalProps {
  open: boolean;
  event?: CoachEvent | null;
  onClose: () => void;
  onSave: (event: CoachEvent) => void;
}

export function EventModal({ open, event, onClose, onSave }: EventModalProps) {
  const isEditing = !!event;

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [date, setDate] = useState(event?.date ?? '');
  const [time, setTime] = useState(event?.time ?? '');
  const [endTime, setEndTime] = useState(event?.endTime ?? '');
  const [type, setType] = useState<CoachEvent['type']>(event?.type ?? 'reunion');
  const [modality, setModality] = useState<TrainingMode>(event?.modality ?? 'presencial');
  const [status, setStatus] = useState<CoachEvent['status']>(event?.status ?? 'scheduled');
  const [location, setLocation] = useState(event?.location ?? '');
  const [isPublic, setIsPublic] = useState(!!event?.public);

  const [format, setFormat] = useState<EventFormat>(event?.format ?? 'lista');
  const [listItems, setListItems] = useState<string[]>(event?.listItems ?? ['']);
  const [formFields, setFormFields] = useState<EventFormField[]>(event?.formFields ?? []);
  const [distanceKm, setDistanceKm] = useState(String(event?.running?.distanceKm ?? ''));
  const [meetingPoint, setMeetingPoint] = useState(event?.running?.meetingPoint ?? '');
  const [pace, setPace] = useState(event?.running?.pace ?? '');

  const [error, setError] = useState('');

  if (!open) return null;

  const updateField = (i: number, patch: Partial<EventFormField>) =>
    setFormFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeField = (i: number) => setFormFields((prev) => prev.filter((_, idx) => idx !== i));
  const addField = () =>
    setFormFields((prev) => [
      ...prev,
      { id: `f-${crypto.randomUUID().slice(0, 6)}`, label: '', kind: 'text', options: [] },
    ]);

  const updateFieldOption = (fi: number, oi: number, val: string) =>
    setFormFields((prev) =>
      prev.map((f, idx) =>
        idx === fi ? { ...f, options: (f.options ?? []).map((o, oidx) => (oidx === oi ? val : o)) } : f,
      ),
    );
  const addFieldOption = (fi: number) =>
    setFormFields((prev) =>
      prev.map((f, idx) => (idx === fi ? { ...f, options: [...(f.options ?? []), ''] } : f)),
    );
  const removeFieldOption = (fi: number, oi: number) =>
    setFormFields((prev) =>
      prev.map((f, idx) => (idx === fi ? { ...f, options: (f.options ?? []).filter((_, oidx) => oidx !== oi) } : f)),
    );

  const handleSave = () => {
    setError('');
    if (!title.trim()) { setError('Ingresa el título del evento'); return; }
    if (!date) { setError('Selecciona una fecha'); return; }

    const result: CoachEvent = {
      id: event?.id ?? `evt-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      date,
      time: time || '12:00 AM',
      endTime: endTime || time || '1:00 AM',
      type,
      modality,
      status,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      athleteIds: [],
      format,
      public: isPublic,
      listItems: format === 'lista' ? listItems.map((s) => s.trim()).filter(Boolean) : undefined,
      formFields: format === 'formulario' ? formFields.filter((f) => f.label.trim()) : undefined,
      running:
        format === 'running'
          ? {
              distanceKm: distanceKm ? Number(distanceKm) : undefined,
              meetingPoint: meetingPoint.trim() || undefined,
              pace: pace.trim() || undefined,
            }
          : undefined,
    };
    onSave(result);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-surface-1 border border-white/10 rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-surface-1 border-b border-white/10">
          <h3 className="text-lg font-display font-bold text-white">
            {isEditing ? 'Editar Evento' : 'Nuevo Evento'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{error}</div>
          )}

          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Carrera 10K Primavera"
                className={inputClass} />
            </div>
            <div>
              <Label>Descripción</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                placeholder="Detalles del evento" className={cn(inputClass, 'resize-none')} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Fecha</Label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label>Inicio</Label>
                <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="8:00 AM" className={inputClass} />
              </div>
              <div>
                <Label>Fin</Label>
                <input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="10:00 AM" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo</Label>
                <select value={type} onChange={(e) => setType(e.target.value as CoachEvent['type'])} className={inputClass}>
                  {TYPES.map((t) => <option key={t.value} value={t.value} className="bg-surface-1">{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Modalidad</Label>
                <select value={modality} onChange={(e) => setModality(e.target.value as TrainingMode)} className={inputClass}>
                  {MODALITIES.map((m) => <option key={m.value} value={m.value} className="bg-surface-1">{m.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Estado</Label>
                <select value={status} onChange={(e) => setStatus(e.target.value as CoachEvent['status'])} className={inputClass}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value} className="bg-surface-1">{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <Label>Ubicación</Label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Parque Central" className={inputClass} />
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-primary" />
                <div>
                  <p className="text-sm font-medium text-white">Disponibilizar link público</p>
                  <p className="text-xs text-white/40">Activa para generar un link de registro abierto a todo público</p>
                </div>
              </div>
              <button onClick={() => setIsPublic((v) => !v)}
                className={cn('w-11 h-6 rounded-full transition-colors relative shrink-0', isPublic ? 'bg-brand-primary' : 'bg-white/15')}>
                <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', isPublic ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>

            <Label>Formato del evento</Label>
            <p className="text-xs text-white/40 mb-2">Define qué verán y registrarán los participantes.</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                const sel = format === f.id;
                return (
                  <button key={f.id} type="button" onClick={() => setFormat(f.id)}
                    className={cn(
                      'flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-colors',
                      sel ? 'border-brand-primary bg-brand-primary/10' : 'border-white/10 hover:border-white/20',
                    )}>
                    <Icon className={cn('w-5 h-5', sel ? 'text-brand-primary' : 'text-white/40')} />
                    <span className={cn('text-sm font-medium', sel ? 'text-white' : 'text-white/60')}>{f.label}</span>
                    <span className="text-[10px] text-white/40 leading-tight">{f.desc}</span>
                  </button>
                );
              })}
            </div>

            {format === 'lista' && (
              <div className="mt-4 space-y-2">
                <Label>Elementos de la lista</Label>
                {listItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={item} onChange={(e) => setListItems((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))}
                      placeholder="Ej: Llevar botella de agua" className={inputClass} />
                    <button onClick={() => setListItems((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-2 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setListItems((prev) => [...prev, ''])}
                  className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
                  <Plus className="w-4 h-4" /> Agregar elemento
                </button>
              </div>
            )}

            {format === 'formulario' && (
              <div className="mt-4 space-y-3">
                <Label>Campos del formulario</Label>
                {formFields.map((f, i) => (
                  <div key={f.id} className="rounded-xl border border-white/10 bg-surface-2 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })}
                        placeholder="Pregunta o campo" className={inputClass} />
                      <button onClick={() => removeField(i)}
                        className="p-2 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <select value={f.kind} onChange={(e) => updateField(i, { kind: e.target.value as EventFormFieldKind })}
                      className={inputClass}>
                      {FIELD_KINDS.map((k) => <option key={k.value} value={k.value} className="bg-surface-1">{k.label}</option>)}
                    </select>
                    {(f.kind === 'multiple' || f.kind === 'select') && (
                      <div className="space-y-1.5 pl-1">
                        {(f.options ?? []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input value={opt} onChange={(e) => updateFieldOption(i, oi, e.target.value)}
                              placeholder="Opción" className={cn(inputClass, 'py-1.5')} />
                            <button onClick={() => removeFieldOption(i, oi)}
                              className="p-1.5 rounded text-white/30 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => addFieldOption(i)}
                          className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary-hover">
                          <Plus className="w-3.5 h-3.5" /> Opción
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addField}
                  className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
                  <Plus className="w-4 h-4" /> Agregar campo
                </button>
              </div>
            )}

            {format === 'running' && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <Label>Distancia (km)</Label>
                  <input type="number" value={distanceKm} min={0} onChange={(e) => setDistanceKm(e.target.value)} placeholder="10" className={inputClass} />
                </div>
                <div>
                  <Label>Ritmo (min/km)</Label>
                  <input value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:30" className={inputClass} />
                </div>
                <div>
                  <Label>Punto de encuentro</Label>
                  <input value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="Puerta 3" className={inputClass} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-surface-1 border-t border-white/10">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-hover transition-colors">
            {isEditing ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-primary transition-colors';

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-white/50 mb-1.5">{children}</label>;
}
