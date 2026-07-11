'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Dumbbell, Clock, Users, Filter, Video, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainingMode } from '@/features/coach/types';
import NewProgramModal, { type NewProgramData, type RunningDetails } from '@/features/coach/components/training/NewProgramModal';

interface Program {
  id: string;
  name: string;
  description: string;
  modality: TrainingMode;
  duration: string;
  sessionsPerWeek: number;
  athleteCount: number;
  isActive: boolean;
  level?: 'beginner' | 'intermediate' | 'advanced';
  goal?: string;
  videoUrl?: string;
  running?: RunningDetails;
  presencial?: { location?: string; equipment?: string };
  virtual?: { platform?: string; sessionLink?: string; homeEquipment?: string };
  hibrido?: { inPersonDays?: number; virtualDays?: number };
}

const MOCK_PROGRAMS: Program[] = [
  {
    id: 'prog-1',
    name: 'Velocidad - Fase 2',
    description: 'Programa avanzado de velocidad con trabajo de starts y aceleración',
    modality: 'presencial',
    duration: '4 semanas',
    sessionsPerWeek: 3,
    athleteCount: 4,
    isActive: true,
    level: 'advanced',
    goal: 'Preparación para competencia',
    presencial: { location: 'Pista de atletismo', equipment: 'Salidas, conos, cronómetro' },
  },
  {
    id: 'prog-2',
    name: 'Base Running - Maratón',
    description: 'Preparación base para maratón con volumen progresivo',
    modality: 'running',
    duration: '12 semanas',
    sessionsPerWeek: 5,
    athleteCount: 3,
    isActive: true,
    level: 'intermediate',
    goal: 'Resistencia',
    running: { totalDistanceKm: 480, weeklyDistanceKm: 40, targetPaceMinPerKm: 5.5, targetHeartRateZone: 2, elevationGainM: 120, terrain: 'asphalt', cadenceSpm: 175, sessionDurationMin: 70 },
  },
  {
    id: 'prog-3',
    name: 'Full Body HIIT',
    description: 'Circuito de alta intensidad combinando fuerza y cardio',
    modality: 'hibrido',
    duration: '6 semanas',
    sessionsPerWeek: 4,
    athleteCount: 7,
    isActive: true,
    level: 'beginner',
    goal: 'Pérdida de peso',
    hibrido: { inPersonDays: 2, virtualDays: 2 },
  },
  {
    id: 'prog-4',
    name: 'Técnica de nado',
    description: 'Corrección de técnica y drills específicos',
    modality: 'virtual',
    duration: '8 semanas',
    sessionsPerWeek: 3,
    athleteCount: 2,
    isActive: false,
    level: 'intermediate',
    goal: 'Técnica',
    virtual: { platform: 'Zoom', homeEquipment: 'Pull buoy, aletas' },
  },
];

const MODALITY_FILTERS: { label: string; value: TrainingMode | 'all' }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Virtual', value: 'virtual' },
  { label: 'Presencial', value: 'presencial' },
  { label: 'Híbrido', value: 'hibrido' },
  { label: 'Running', value: 'running' },
];

const MODALITY_STYLE: Record<TrainingMode, string> = {
  presencial: 'bg-green-500/10 text-green-400',
  virtual: 'bg-blue-500/10 text-blue-400',
  hibrido: 'bg-purple-500/10 text-purple-400',
  running: 'bg-amber-500/10 text-amber-400',
};

function formatPace(minPerKm?: number): string | null {
  if (minPerKm === undefined) return null;
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CoachProgramsPage() {
  const [filter, setFilter] = useState<TrainingMode | 'all'>('all');
  const [programs, setPrograms] = useState<Program[]>(MOCK_PROGRAMS);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = filter === 'all' ? programs : programs.filter((p) => p.modality === filter);

  const handleSave = (data: NewProgramData) => {
    const newProgram: Program = {
      id: `prog-${Date.now()}`,
      name: data.name,
      description: data.description,
      modality: data.modality,
      duration: `${data.durationWeeks} semanas`,
      sessionsPerWeek: data.sessionsPerWeek,
      athleteCount: data.assignedAthletes,
      isActive: true,
      level: data.level,
      goal: data.goal,
      videoUrl: data.videoUrl,
      running: data.running,
      presencial: data.presencial,
      virtual: data.virtual,
      hibrido: data.hibrido,
    };
    setPrograms((prev) => [newProgram, ...prev]);
    setModalOpen(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Programas</h1>
          <p className="text-sm text-white/40 mt-1">{programs.length} programas creados</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo Programa
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {MODALITY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filter === f.value
                ? 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary'
                : 'border-white/10 text-white/40 hover:border-white/20',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((program, i) => {
          const pace = formatPace(program.running?.targetPaceMinPerKm);
          return (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/5 bg-surface-1 p-5 hover:border-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{program.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{program.description}</p>
                </div>
                <span className={cn('shrink-0 px-2 py-0.5 rounded text-[10px] font-medium', MODALITY_STYLE[program.modality])}>
                  {program.modality}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-white/30 mb-3">
                <span className="flex items-center gap-1"><Clock size={12} />{program.duration}</span>
                <span className="flex items-center gap-1"><Dumbbell size={12} />{program.sessionsPerWeek}/sem</span>
                <span className="flex items-center gap-1"><Users size={12} />{program.athleteCount} atletas</span>
                {program.level && <span className="capitalize">{program.level}</span>}
                {program.videoUrl && (
                  <span className="flex items-center gap-1 text-brand-primary"><Video size={12} />video</span>
                )}
              </div>

              {program.modality === 'running' && program.running && (
                <div className="flex flex-wrap gap-1.5">
                  {program.running.totalDistanceKm && (
                    <Chip label={`${program.running.totalDistanceKm} km total`} />
                  )}
                  {program.running.weeklyDistanceKm && (
                    <Chip label={`${program.running.weeklyDistanceKm} km/sem`} />
                  )}
                  {pace && <Chip label={`${pace} /km`} />}
                  {program.running.elevationGainM && (
                    <Chip label={`+${program.running.elevationGainM} m`} />
                  )}
                  {program.running.cadenceSpm && (
                    <Chip label={`${program.running.cadenceSpm} spm`} />
                  )}
                  {program.running.targetHeartRateZone && (
                    <Chip label={`Z${program.running.targetHeartRateZone}`} />
                  )}
                </div>
              )}

              {program.modality === 'hibrido' && program.hibrido && (
                <div className="flex flex-wrap gap-1.5">
                  <Chip label={`${program.hibrido.inPersonDays ?? 0} presencial`} />
                  <Chip label={`${program.hibrido.virtualDays ?? 0} virtual`} />
                </div>
              )}

              {program.modality === 'virtual' && program.virtual?.platform && (
                <div className="flex flex-wrap gap-1.5">
                  <Chip label={program.virtual.platform} />
                  {program.virtual.homeEquipment && <Chip label={program.virtual.homeEquipment} />}
                </div>
              )}

              {program.modality === 'presencial' && program.presencial?.location && (
                <div className="flex flex-wrap gap-1.5">
                  <Chip label={program.presencial.location} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <NewProgramModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-surface-3 text-[11px] text-white/50">{label}</span>
  );
}
