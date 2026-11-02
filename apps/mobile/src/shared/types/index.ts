export type Athlete = {
  id: string;
  name: string;
  avatarUrl: string;
  sport: string;
  email: string;
  phone: string;
  serviceType: string;
  plan: { name: string; price: number; billingPeriod: string };
  schedule: { days: string; time: string };
  startDate: string;
  readiness: { sleep: number; hrv: number; recovery: number; score: number };
  flag?: { type: string; severity: string; message: string };
};

export type WorkoutSession = {
  id: string;
  name: string;
  time: string;
  endTime: string;
  location: string;
  status: string;
};

export type AssignedWorkout = {
  id: string;
  athleteId: string;
  athleteName: string;
  contentId: string;
  contentType: string;
  contentName: string;
  modality: string;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  status: string;
  progress: number;
};

export type RecoveryData = {
  sleep: number;
  hrv: number;
  recovery: number;
  score: number;
  recommendations: string[];
};

export type ApiError = {
  error: string;
  status: number;
};
