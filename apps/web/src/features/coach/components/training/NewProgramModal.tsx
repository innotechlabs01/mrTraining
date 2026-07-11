'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Video, Play, Dumbbell, Wifi, Repeat, Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainingMode } from '../../types';

export interface RunningDetails {
  totalDistanceKm?: number;
  weeklyDistanceKm?: number;
  targetPaceMinPerKm?: number; // stored as decimal minutes, e.g. 5.5 = 5:30
  targetHeartRateZone?: 1 | 2 | 3 | 4 | 5;
  elevationGainM?: number;
  terrain?: 'asphalt' | 'trail' | 'track' | 'treadmill';
  cadenceSpm?: number;
  sessionDurationMin?: number;
}

export interface NewProgramData {
  name: string;
  description: string;
  modality: TrainingMode;
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  assignedAthletes: number;
  videoUrl: string;
  running?: RunningDetails;
  presencial?: { location?: string; equipment?: string };
  virtual?: { platform?: string; sessionLink?: string; homeEquipment?: string };
  hibrido?: { inPersonDays?: number; virtualDays?: number };
}

interface NewProgramModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewProgramData) => void;
}

const MODALITIES: { value: TrainingMode; label: string; icon: typeof Dumbbell; hint: string }[] = [
  { value: 'presencial', label: 'Presencial', icon: Dumbbell, hint: 'En gimnasio o campo' },
  { value: 'virtual', label: 'Virtual', icon: Wifi, hint: 'Online en vivo' },
  { value: 'hibrido', label: 'Híbrido', icon: Repeat, hint: 'Presencial + virtual' },
  { value: 'running', label: 'Running', icon: Footprints, hint: 'Por distancia/tiempo' },
];

const LEVELS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

const GOALS = [
  'Fitness general',
  'Fuerza',
  'Resistencia',
  'Pérdida de peso',
  'Preparación para competencia',
  'Técnica',
];

const TERRAINS = [
  { value: 'asphalt', label: 'Asfalto' },
  { value: 'trail', label: 'Sendero (trail)' },
  { value: 'track', label: 'Pista (track)' },
  { value: 'treadmill', label: 'Cinta (treadmill)' },
];

const PLATFORMS = ['Zoom', 'Google Meet', 'Microsoft Teams', 'Otro'];

const HR_ZONES = [
  { value: 1, label: 'Z1 · Recuperación' },
  { value: 2, label: 'Z2 · Aeróbico (base)' },
  { value: 3, label: 'Z3 · Tempo' },
  { value: 4, label: 'Z4 · Umbral' },
  { value: 5, label: 'Z5 · Máximo' },
];

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function formatPace(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (match) return `${match[1]}:${match[2]}`;
  return value;
}

export default function NewProgramModal({ open, onClose, onSave }: NewProgramModalProps) {
  const [modality, setModality] = useState<TrainingMode>('presencial');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [goal, setGoal] = useState(GOALS[0]);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [assignedAthletes, setAssignedAthletes] = useState(1);
  const [videoUrl, setVideoUrl] = useState('');

  // running
  const [totalDistanceKm, setTotalDistanceKm] = useState('');
  const [weeklyDistanceKm, setWeeklyDistanceKm] = useState('');
  const [pace, setPace] = useState('');
  const [hrZone, setHrZone] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [elevationGainM, setElevationGainM] = useState('');
  const [terrain, setTerrain] = useState<'asphalt' | 'trail' | 'track' | 'treadmill'>('asphalt');
  const [cadenceSpm, setCadenceSpm] = useState('');
  const [sessionDurationMin, setSessionDurationMin] = useState('');

  // presencial
  const [location, setLocation] = useState('');
  const [equipment, setEquipment] = useState('');

  // virtual
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [sessionLink, setSessionLink] = useState('');
  const [homeEquipment, setHomeEquipment] = useState('');

  // hibrido
  const [inPersonDays, setInPersonDays] = useState(2);
  const [virtualDays, setVirtualDays] = useState(1);

  const youTubeId = getYouTubeId(videoUrl);
  const valid = name.trim().length > 0;

  const reset = () => {
    setModality('presencial');
    setName('');
    setDescription('');
    setLevel('beginner');
    setGoal(GOALS[0]);
    setDurationWeeks(4);
    setSessionsPerWeek(3);
    setAssignedAthletes(1);
    setVideoUrl('');
    setTotalDistanceKm('');
    setWeeklyDistanceKm('');
    setPace('');
    setHrZone(2);
    setElevationGainM('');
    setTerrain('asphalt');
    setCadenceSpm('');
    setSessionDurationMin('');
    setLocation('');
    setEquipment('');
    setPlatform(PLATFORMS[0]);
    setSessionLink('');
    setHomeEquipment('');
    setInPersonDays(2);
    setVirtualDays(1);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!valid) return;

    const data: NewProgramData = {
      name: name.trim(),
      description: description.trim(),
      modality,
      level,
      goal,
      durationWeeks,
      sessionsPerWeek,
      assignedAthletes,
      videoUrl: videoUrl.trim(),
    };

    if (modality === 'running') {
      const running: RunningDetails = {};
      if (totalDistanceKm) running.totalDistanceKm = Number(totalDistanceKm);
      if (weeklyDistanceKm) running.weeklyDistanceKm = Number(weeklyDistanceKm);
      if (pace) {
        const [m, s] = pace.split(':').map(Number);
        if (!Number.isNaN(m)) running.targetPaceMinPerKm = m + (Number.isNaN(s) ? 0 : s) / 60;
      }
      running.targetHeartRateZone = hrZone;
      if (elevationGainM) running.elevationGainM = Number(elevationGainM);
      running.terrain = terrain;
      if (cadenceSpm) running.cadenceSpm = Number(cadenceSpm);
      if (sessionDurationMin) running.sessionDurationMin = Number(sessionDurationMin);
      data.running = running;
    }

    if (modality === 'presencial') {
      data.presencial = { location: location.trim() || undefined, equipment: equipment.trim() || undefined };
    }
    if (modality === 'virtual') {
      data.virtual = {
        platform,
        sessionLink: sessionLink.trim() || undefined,
        homeEquipment: homeEquipment.trim() || undefined,
      };
    }
    if (modality === 'hibrido') {
      data.hibrido = { inPersonDays, virtualDays };
    }

    onSave(data);
    reset();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl bg-surface-2 rounded-xl border border-white/10 max-h-[88vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-semibold font-display">Nuevo Programa</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-surface-5 text-secondary hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
          {/* Modality */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] mb-2">
              Modalidad
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MODALITIES.map((m) => {
                const selected = modality === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setModality(m.value)}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
                      selected
                        ? 'border-brand-primary/40 bg-brand-primary/10'
                        : 'border-white/10 hover:border-white/20',
                    )}
                  >
                    <m.icon
                      className={cn('w-5 h-5', selected ? 'text-brand-primary' : 'text-secondary')}
                    />
                    <span className={cn('text-sm font-medium', selected ? 'text-white' : 'text-secondary')}>
                      {m.label}
                    </span>
                    <span className="text-[10px] text-[#6B7280] leading-tight">{m.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Common */}
          <div className="space-y-4">
            <div>
              <Field label="Nombre del programa *">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Base Running - Maratón"
                  className={inputClass}
                />
              </Field>
            </div>

            <div>
              <Field label="Descripción">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo y enfoque del programa"
                  rows={2}
                  className={cn(inputClass, 'resize-none')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nivel">
                <Select value={level} onChange={(v) => setLevel(v as typeof level)} options={LEVELS} />
              </Field>
              <Field label="Objetivo">
                <Select value={goal} onChange={setGoal} options={GOALS.map((g) => ({ value: g, label: g }))} />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Duración (sem)">
                <NumberInput value={durationWeeks} onChange={(v) => setDurationWeeks(Number(v))} min={1} />
              </Field>
              <Field label="Sesiones/sem">
                <NumberInput value={sessionsPerWeek} onChange={(v) => setSessionsPerWeek(Number(v))} min={1} max={7} />
              </Field>
              <Field label="Atletas">
                <NumberInput value={assignedAthletes} onChange={(v) => setAssignedAthletes(Number(v))} min={1} />
              </Field>
            </div>
          </div>

          {/* Video — all modalities */}
          <div className="rounded-lg border border-white/10 bg-surface-1 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-brand-primary" />
              <p className="text-sm font-medium text-white">Video del programa</p>
            </div>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... (opcional)"
              className={inputClass}
            />
            {youTubeId && (
              <div className="relative aspect-video rounded-md overflow-hidden bg-black">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youTubeId}`}
                  title="Vista previa del video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {/* Running-specific */}
          {modality === 'running' && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                Datos de running
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Distancia total (km)">
                  <NumberInput value={totalDistanceKm} onChange={setTotalDistanceKm} min={0} step="0.1" />
                </Field>
                <Field label="Distancia semanal (km)">
                  <NumberInput value={weeklyDistanceKm} onChange={setWeeklyDistanceKm} min={0} step="0.1" />
                </Field>
                <Field label="Ritmo objetivo (min:seg /km)">
                  <input
                    value={pace}
                    onChange={(e) => setPace(formatPace(e.target.value))}
                    placeholder="5:30"
                    className={inputClass}
                  />
                </Field>
                <Field label="Duración de sesión (min)">
                  <NumberInput value={sessionDurationMin} onChange={setSessionDurationMin} min={0} />
                </Field>
                <Field label="Ganancia de elevación (m)">
                  <NumberInput value={elevationGainM} onChange={setElevationGainM} min={0} />
                </Field>
                <Field label="Cadencia (spm)">
                  <NumberInput value={cadenceSpm} onChange={setCadenceSpm} min={0} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Zona de FC objetivo">
                  <Select
                    value={String(hrZone)}
                    onChange={(v) => setHrZone(Number(v) as 1 | 2 | 3 | 4 | 5)}
                    options={HR_ZONES.map((z) => ({ value: String(z.value), label: z.label }))}
                  />
                </Field>
                <Field label="Terreno">
                  <Select
                    value={terrain}
                    onChange={(v) => setTerrain(v as typeof terrain)}
                    options={TERRAINS}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Presencial-specific */}
          {modality === 'presencial' && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-400">
                Datos presenciales
              </p>
              <Field label="Ubicación">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Gimnasio A, Pista de atletismo"
                  className={inputClass}
                />
              </Field>
              <Field label="Equipo necesario">
                <input
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="Ej: Barras, mancuernas, peso corporal"
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {/* Virtual-specific */}
          {modality === 'virtual' && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                Datos virtuales
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plataforma">
                  <Select value={platform} onChange={setPlatform} options={PLATFORMS.map((p) => ({ value: p, label: p }))} />
                </Field>
                <Field label="Enlace de sesión">
                  <input
                    value={sessionLink}
                    onChange={(e) => setSessionLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Equipo en casa">
                <input
                  value={homeEquipment}
                  onChange={(e) => setHomeEquipment(e.target.value)}
                  placeholder="Ej: Mancuernas ajustables, banda elástica"
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {/* Hibrido-specific */}
          {modality === 'hibrido' && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-400">
                Distribución híbrida
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Días presenciales / sem">
                  <NumberInput value={inPersonDays} onChange={(v) => setInPersonDays(Number(v))} min={0} max={7} />
                </Field>
                <Field label="Días virtuales / sem">
                  <NumberInput value={virtualDays} onChange={(v) => setVirtualDays(Number(v))} min={0} max={7} />
                </Field>
              </div>
              <p className="text-xs text-[#6B7280]">
                Total: {inPersonDays + virtualDays} días/sem
                {inPersonDays + virtualDays !== sessionsPerWeek && (
                  <span className="text-amber-400"> · no coincide con “Sesiones/sem” ({sessionsPerWeek})</span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 h-11 rounded-md font-medium text-sm bg-surface-5 text-secondary hover:bg-surface-6 transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={!valid}
            onClick={handleSave}
            className={cn(
              'flex-1 h-11 rounded-md font-semibold text-sm transition-colors',
              valid
                ? 'bg-brand-primary hover:bg-brand-primary-hover text-white'
                : 'bg-surface-5 text-[#6B7280] cursor-not-allowed',
            )}
          >
            Crear Programa
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const inputClass =
  'w-full bg-surface-4 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-brand-primary/50 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-[#6B7280] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, 'appearance-none')}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface-4 text-white">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number | string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}
