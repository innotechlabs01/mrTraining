'use client';

import { useState } from 'react';
import { X, Plus, Trash2, ListChecks, FileText, Footprints, Globe, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CoachEvent,
  EventFormat,
  EventFormField,
  EventFormFieldKind,
  TrainingMode,
} from '@/features/coach/types';

const FORMATS: { id: EventFormat; label: string; desc: string; icon: typeof ListChecks }[] = [
  { id: 'running', label: 'Carrera / Running', desc: 'Distancia, categorías, ritmo, desnivel y ruta', icon: Footprints },
  { id: 'formulario', label: 'Formulario', desc: 'Campos personalizados de registro', icon: FileText },
  { id: 'lista', label: 'Lista', desc: 'Checklist de elementos para participantes', icon: ListChecks },
];

const TYPES = [
  { value: 'carrera', label: 'Carrera / Running' },
  { value: 'competition', label: 'Competencia' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Otro' },
] as const;

const MODALITIES: { value: TrainingMode; label: string }[] = [
  { value: 'running', label: 'Running' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hibrido', label: 'Híbrido' },
];

const FIELD_KINDS: { value: EventFormFieldKind; label: string }[] = [
  { value: 'text', label: 'Texto a escribir' },
  { value: 'multiple', label: 'Opciones múltiples' },
  { value: 'select', label: 'Dropdown (selección)' },
];

const PRESET_RACE_CATEGORIES = ['3K', '5K', '10K', '15K', '21K', '42K'];

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
  const [type, setType] = useState<CoachEvent['type']>(event?.type ?? 'carrera');
  const [modality, setModality] = useState<TrainingMode>(event?.modality ?? 'running');
  const [status] = useState<CoachEvent['status']>(event?.status ?? 'scheduled');
  const [location, setLocation] = useState(event?.location ?? '');
  const [isPublic, setIsPublic] = useState(event ? !!event.public : true);

  // Parámetros de inscripción generales
  const [maxCapacity, setMaxCapacity] = useState(event?.maxCapacity ? String(event.maxCapacity) : '');
  const [priceAmount, setPriceAmount] = useState(event?.priceCents ? String(Math.round(event.priceCents / 100)) : '');
  const [currency, setCurrency] = useState(event?.currency ?? 'COP');
  const [registrationDeadline, setRegistrationDeadline] = useState(event?.registrationDeadline ?? '');

  // Formato + detalles
  const [format, setFormat] = useState<EventFormat>(event?.format ?? 'running');
  const [listItems, setListItems] = useState<string[]>(event?.listItems?.length ? event.listItems : ['']);
  const [formFields, setFormFields] = useState<EventFormField[]>(event?.formFields ?? []);

  // Parámetros específicos de carrera / running
  const [distanceKm, setDistanceKm] = useState(event?.running?.distanceKm != null ? String(event.running.distanceKm) : '');
  const [meetingPoint, setMeetingPoint] = useState(event?.running?.meetingPoint ?? '');
  const [pace, setPace] = useState(event?.running?.pace ?? '');
  const [elevationM, setElevationM] = useState(event?.running?.elevationM != null ? String(event.running.elevationM) : '');
  const [routeUrl, setRouteUrl] = useState(event?.running?.routeUrl ?? '');
  const [categories, setCategories] = useState<string[]>(event?.running?.categories ?? []);
  const [customCategory, setCustomCategory] = useState('');

  const [error, setError] = useState('');

  if (!open) return null;

  const handleTypeChange = (nextType: CoachEvent['type']) => {
    setType(nextType);
    if (nextType === 'carrera') {
      setFormat('running');
      setModality('running');
    }
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const addCustomCategory = () => {
    const clean = customCategory.trim();
    if (!clean) return;
    if (!categories.includes(clean)) {
      setCategories((prev) => [...prev, clean]);
    }
    setCustomCategory('');
  };

  const addRaceFormPreset = () => {
    const existingLabels = new Set(formFields.map((f) => f.label.toLowerCase()));
    const allPresets: EventFormField[] = [
      {
        id: `f-${crypto.randomUUID().slice(0, 6)}`,
        label: 'Talla de camiseta',
        kind: 'select',
        options: ['XS', 'S', 'M', 'L', 'XL'],
        required: true,
      },
      {
        id: `f-${crypto.randomUUID().slice(0, 6)}`,
        label: 'Contacto de emergencia (Nombre y teléfono)',
        kind: 'text',
        options: [],
        required: true,
      },
      {
        id: `f-${crypto.randomUUID().slice(0, 6)}`,
        label: 'Grupo sanguíneo / RH',
        kind: 'select',
        options: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
        required: false,
      },
    ];
    const presets = allPresets.filter((p) => !existingLabels.has(p.label.toLowerCase()));
    if (presets.length > 0) {
      setFormFields((prev) => [...prev, ...presets]);
    }
  };

  const updateField = (i: number, patch: Partial<EventFormField>) =>
    setFormFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeField = (i: number) => setFormFields((prev) => prev.filter((_, idx) => idx !== i));
  const addField = () =>
    setFormFields((prev) => [
      ...prev,
      { id: `f-${crypto.randomUUID().slice(0, 6)}`, label: '', kind: 'text', options: [], required: false },
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
    if (maxCapacity && (Number(maxCapacity) <= 0 || !Number.isInteger(Number(maxCapacity)))) {
      setError('El cupo máximo debe ser un número entero mayor a 0');
      return;
    }

    const cleanedFields = formFields
      .filter((f) => f.label.trim())
      .map((f) => ({
        ...f,
        label: f.label.trim(),
        options: (f.options ?? []).map((o) => o.trim()).filter(Boolean),
      }));

    const result: CoachEvent = {
      id: event?.id ?? `evt-${crypto.randomUUID().slice(0, 8)}`,
      title: title.trim(),
      date,
      time: time || '06:00',
      endTime: endTime || time || '09:00',
      type,
      modality,
      status,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      athleteIds: event?.athleteIds ?? [],
      format,
      public: isPublic,
      maxCapacity: maxCapacity ? Number(maxCapacity) : undefined,
      priceCents: priceAmount ? Math.round(Number(priceAmount) * 100) : 0,
      currency,
      registrationDeadline: registrationDeadline || undefined,
      acceptedCount: event?.acceptedCount ?? 0,
      listItems: format === 'lista' ? listItems.map((s) => s.trim()).filter(Boolean) : undefined,
      formFields: format === 'formulario' || format === 'running' ? cleanedFields : undefined,
      running:
        format === 'running'
          ? {
              distanceKm: distanceKm ? Number(distanceKm) : undefined,
              meetingPoint: meetingPoint.trim() || undefined,
              pace: pace.trim() || undefined,
              categories: categories.length > 0 ? categories : undefined,
              elevationM: elevationM ? Number(elevationM) : undefined,
              routeUrl: routeUrl.trim() || undefined,
            }
          : undefined,
    };
    onSave(result);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-1 border border-white/10 rounded-lg shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-surface-1 border-b border-white/10">
          <h3 className="text-lg font-display font-bold text-white">
            {isEditing ? 'Editar Evento' : 'Nuevo Evento / Carrera'}
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
              <Label>Título *</Label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Carrera 10K Primavera MR Training"
                className={inputClass} />
            </div>
            <div>
              <Label>Descripción</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                placeholder="Incluye hidratación, kit, recorrido, premios o indicaciones clave..." className={cn(inputClass, 'resize-none')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Fecha del evento *</Label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label>Hora inicio</Label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label>Hora fin</Label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo de evento</Label>
                <select value={type} onChange={(e) => handleTypeChange(e.target.value as CoachEvent['type'])} className={inputClass}>
                  {TYPES.map((t) => <option key={t.value} value={t.value} className="bg-surface-1">{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Modalidad</Label>
                <select value={modality} onChange={(e) => setModality(e.target.value as TrainingMode)} className={inputClass}>
                  {MODALITIES.map((m) => <option key={m.value} value={m.value} className="bg-surface-1">{m.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <Label>Ubicación / Ciudad</Label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Parque Simón Bolívar, Bogotá" className={inputClass} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Cupo máximo (opcional)</Label>
                <input type="number" min={1} value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} placeholder="Ilimitado" className={inputClass} />
              </div>
              <div>
                <Label>Inscripción ({currency}, 0 = Gratis)</Label>
                <div className="flex gap-1.5">
                  <input type="number" min={0} value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} placeholder="0" className={inputClass} />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={cn(inputClass, 'w-20 shrink-0')}>
                    <option value="COP" className="bg-surface-1">COP</option>
                    <option value="USD" className="bg-surface-1">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Cierre de inscripciones</Label>
                <input type="date" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-surface-2 border border-white/10">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-brand-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Abierto al público (link compartible)</p>
                  <p className="text-xs text-white/40">Personas externas sin cuenta pueden confirmar asistencia y aparecerán en tu lista de inscritos</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsPublic((v) => !v)}
                className={cn('w-11 h-6 rounded-full transition-colors relative shrink-0', isPublic ? 'bg-brand-primary' : 'bg-white/15')}>
                <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', isPublic ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>

            <Label>Formato del evento</Label>
            <p className="text-xs text-white/40 mb-2">Define los parámetros específicos que verán tus atletas y el público externo.</p>
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

            {format === 'running' && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Distancia principal (km)</Label>
                    <input type="number" step="0.1" value={distanceKm} min={0} onChange={(e) => setDistanceKm(e.target.value)} placeholder="10" className={inputClass} />
                  </div>
                  <div>
                    <Label>Ritmo objetivo (min/km)</Label>
                    <input value={pace} onChange={(e) => setPace(e.target.value)} placeholder="5:30" className={inputClass} />
                  </div>
                  <div>
                    <Label>Desnivel positivo (m)</Label>
                    <input type="number" min={0} value={elevationM} onChange={(e) => setElevationM(e.target.value)} placeholder="150" className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Punto de encuentro / Salida</Label>
                    <input value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="Entrada Puerta 3" className={inputClass} />
                  </div>
                  <div>
                    <Label>Link de ruta / mapa (opcional)</Label>
                    <input value={routeUrl} onChange={(e) => setRouteUrl(e.target.value)} placeholder="https://www.strava.com/routes/..." className={inputClass} />
                  </div>
                </div>

                <div>
                  <Label>Categorías / Distancias disponibles</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_RACE_CATEGORIES.map((cat) => {
                      const active = categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                            active
                              ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                              : 'border-white/10 bg-surface-2 text-white/50 hover:border-white/25',
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                    {categories
                      .filter((c) => !PRESET_RACE_CATEGORIES.includes(c))
                      .map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className="px-3 py-1 rounded-full text-xs font-medium border border-amber-400 bg-amber-500/20 text-amber-300"
                        >
                          {cat} ×
                        </button>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); } }}
                      placeholder="Otra categoría (ej: Kids 1K, Trail 12K)"
                      className={cn(inputClass, 'py-1.5 text-xs')}
                    />
                    <button
                      type="button"
                      onClick={addCustomCategory}
                      className="px-3 py-1.5 rounded-lg bg-surface-2 border border-white/10 text-xs text-white/70 hover:text-white shrink-0"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {format === 'lista' && (
              <div className="mt-4 space-y-2">
                <Label>Elementos de la lista</Label>
                {listItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={item} onChange={(e) => setListItems((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))}
                      placeholder="Ej: Llevar botella de agua" className={inputClass} />
                    <button type="button" onClick={() => setListItems((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-2 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setListItems((prev) => [...prev, ''])}
                  className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
                  <Plus className="w-4 h-4" /> Agregar elemento
                </button>
              </div>
            )}

            {(format === 'formulario' || format === 'running') && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label>{format === 'running' ? 'Preguntas de inscripción de la carrera (opcional)' : 'Campos del formulario'}</Label>
                    <p className="text-[11px] text-white/40 -mt-1">Los externos siempre ingresan Nombre, Email y Teléfono.</p>
                  </div>
                  {format === 'running' && (
                    <button
                      type="button"
                      onClick={addRaceFormPreset}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Plantilla carrera
                    </button>
                  )}
                </div>

                {formFields.map((f, i) => (
                  <div key={f.id} className="rounded-xl border border-white/10 bg-surface-2 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })}
                        placeholder="Pregunta o campo (ej: Talla de camiseta)" className={inputClass} />
                      <button type="button" onClick={() => removeField(i)}
                        className="p-2 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <select value={f.kind} onChange={(e) => updateField(i, { kind: e.target.value as EventFormFieldKind })}
                        className={inputClass}>
                        {FIELD_KINDS.map((k) => <option key={k.value} value={k.value} className="bg-surface-1">{k.label}</option>)}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-white/60 shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!f.required}
                          onChange={(e) => updateField(i, { required: e.target.checked })}
                          className="rounded border-white/20"
                        />
                        Obligatorio
                      </label>
                    </div>
                    {(f.kind === 'multiple' || f.kind === 'select') && (
                      <div className="space-y-1.5 pl-1">
                        {(f.options ?? []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input value={opt} onChange={(e) => updateFieldOption(i, oi, e.target.value)}
                              placeholder="Opción" className={cn(inputClass, 'py-1.5')} />
                            <button type="button" onClick={() => removeFieldOption(i, oi)}
                              className="p-1.5 rounded text-white/30 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addFieldOption(i)}
                          className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary-hover">
                          <Plus className="w-3.5 h-3.5" /> Opción
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addField}
                  className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover transition-colors">
                  <Plus className="w-4 h-4" /> Agregar campo
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-surface-1 border-t border-white/10">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors">Cancelar</button>
          <button type="button" onClick={handleSave}
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
