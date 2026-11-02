export type OnboardingData = {
  sports: string[];
  modality: string;
  experienceLevel: string;
  goal: string;
  sessionsPerWeek: number;
  sessionDuration: number;
  equipment: string;
  athleteRoutineAccepted?: boolean;
  gender?: 'male' | 'female' | '';
  weight?: number;
  weightUnit?: 'KG' | 'LB';
  age?: number;
  height?: number;
  heightUnit?: 'CM' | 'FT';
  activityLevel?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  nickname?: string;
  phone?: string;
};

export type OnboardingScreenProps = {
  onComplete: (data: OnboardingData) => void;
};
