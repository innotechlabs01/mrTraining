import type React from 'react';
import {
  BarbellIcon,
  BuildingIcon,
  CyclingIcon,
  DeviceIcon,
  DumbbellIcon,
  FireIcon,
  HeartPulseIcon,
  HomeIcon,
  RefreshIcon,
  RunningIcon,
  SoccerIcon,
  SwimmingIcon,
  TargetIcon,
  TennisIcon,
  TrophyIcon,
  UserIcon,
  YogaIcon,
  type IconProps,
} from '../../../../../shared/components/icons';

export type OptionIcon = React.ComponentType<IconProps>;

export type SportOption = { id: string; label: string; desc: string; icon: OptionIcon };
export type SelectOption = { id: string; label: string; desc: string; icon: OptionIcon };
export type GoalOption = { id: string; label: string; desc: string; icon: OptionIcon };
export type LevelOption = { id: string; label: string; desc: string; icon: OptionIcon };
export type ModalityOption = { id: string; label: string; desc: string; icon: OptionIcon };
export type EquipmentOption = { id: string; label: string; desc: string; icon: OptionIcon };

export const SPORTS: SportOption[] = [
  { id: 'gym', label: 'Gimnasio', desc: 'Fuerza e hipertrofia', icon: DumbbellIcon },
  { id: 'running', label: 'Correr', desc: 'Velocidad y resistencia', icon: RunningIcon },
  { id: 'crossfit', label: 'CrossFit', desc: 'Entrenamiento funcional', icon: DumbbellIcon },
  { id: 'swimming', label: 'Natación', desc: 'Cardio de cuerpo completo', icon: SwimmingIcon },
  { id: 'cycling', label: 'Ciclismo', desc: 'Potencia y resistencia', icon: CyclingIcon },
  { id: 'tennis', label: 'Tenis', desc: 'Agilidad y foco', icon: TennisIcon },
  { id: 'yoga', label: 'Yoga', desc: 'Flexibilidad y mente', icon: YogaIcon },
  { id: 'soccer', label: 'Fútbol', desc: 'Velocidad y trabajo en equipo', icon: SoccerIcon },
];

export const MODALITIES: ModalityOption[] = [
  { id: 'in-person', label: 'Presencial', desc: 'Entrena en el gimnasio o con tu coach en persona', icon: BuildingIcon },
  { id: 'hybrid', label: 'Híbrido', desc: 'Combinas sesiones presenciales con seguimiento remoto', icon: RefreshIcon },
  { id: 'virtual', label: 'Virtual', desc: 'Totalmente remoto con planes digitales', icon: DeviceIcon },
];

export const GOALS: GoalOption[] = [
  { id: 'strength', label: 'Ganar fuerza', desc: 'Desarrollar músculo e incrementar tu fuerza', icon: DumbbellIcon },
  { id: 'weight-loss', label: 'Perder peso', desc: 'Quemar grasa y mejorar tu composición corporal', icon: FireIcon },
  { id: 'endurance', label: 'Resistencia', desc: 'Correr y entrenar por más tiempo', icon: RunningIcon },
  { id: 'performance', label: 'Rendimiento', desc: 'Competir, lograr marcas y estar en plena forma', icon: TrophyIcon },
  { id: 'health', label: 'Salud general', desc: 'Mantente activo, siéntete mejor y evita lesiones', icon: HeartPulseIcon },
];

export const LEVELS: LevelOption[] = [
  { id: 'beginner', label: 'Principiante', desc: 'Nuevo en el entrenamiento o vuelvo después de una pausa', icon: UserIcon },
  { id: 'intermediate', label: 'Intermedio', desc: 'Uno a dos años de entrenamiento constante', icon: TargetIcon },
  { id: 'advanced', label: 'Avanzado', desc: 'Más de tres años, cómodo con programación compleja', icon: TrophyIcon },
];

export const FREQUENCIES = [2, 3, 4, 5, 6, 7];
export const DURATIONS = [30, 45, 60, 90];

export const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  { id: 'full-gym', label: 'Gimnasio completo', desc: 'Barras, máquinas, poleas y todo lo necesario', icon: BarbellIcon },
  { id: 'basic', label: 'Básico', desc: 'Mancuernas, bandas y barra de dominadas', icon: DumbbellIcon },
  { id: 'minimal', label: 'Mínimo', desc: 'Bandas de resistencia y colchoneta', icon: HomeIcon },
  { id: 'bodyweight', label: 'Peso corporal', desc: 'Sin equipamiento, solo tu cuerpo', icon: UserIcon },
];

export const STEP_TITLES = [
  'Tu deporte',
  'Cómo y nivel',
  '¿Cuál es tu género?',
  '¿Cuál es tu peso?',
  '¿Cuántos años tienes?',
  '¿Cuál es tu altura?',
  '¿Cuál es tu objetivo?',
  'Nivel de actividad',
  'Horario',
  'Equipamiento',
  'Completa tu perfil',
  'Tu plan',
  'Tu elección',
];

export const HERO_HEADINGS = [
  'LA CONSTANCIA ES LA CLAVE',
  'CONSTRUYE TU CAMINO',
  '¿CUÁL ES TU GÉNERO?',
  '¿CUÁL ES TU PESO?',
  '¿CUÁNTOS AÑOS TIENES?',
  '¿CUÁL ES TU ALTURA?',
  '¿CUÁL ES TU OBJETIVO?',
  'NIVEL DE ACTIVIDAD',
  'MANTÉN LA CONSTANCIA',
  'ENTRENA EN CUALQUIER LUGAR',
  'COMPLETA TU PERFIL',
  'TU PLAN TE ESPERA',
  'COMIENZA TU CAMINO',
];
