export type AuthStep =
  | 'splash'
  | 'welcome'
  | 'sign-in'
  | 'sign-up'
  | 'forgot-password'
  | 'verify'
  | 'mfa'
  | 'role-selection'
  | 'setup'
  | 'onboarding'
  | 'invitation'
  | 'welcome-dashboard';

export type UserRole = 'coach' | 'parent' | 'strength-coach';

export type MfaMethod = 'authenticator' | 'sms' | 'email';

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
};

export interface AuthFlowState {
  step: AuthStep;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole | null;
  mfaMethod: MfaMethod | null;
  orgId: string | null;
  inviteToken: string | null;
}

export interface OnboardingData {
  sport: string;
  position: string;
  team: string;
  experience: string;
  goals: string[];
  specializations: string[];
  certifications: string[];
}
