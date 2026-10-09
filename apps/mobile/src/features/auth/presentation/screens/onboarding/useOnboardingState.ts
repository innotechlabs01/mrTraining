import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  AGE_DEFAULT,
  HEIGHT_DEFAULT_CM,
  HEIGHT_MAX_CM,
  HEIGHT_MAX_FT,
  HEIGHT_MIN_CM,
  HEIGHT_MIN_FT,
  WEIGHT_DEFAULT,
} from './constants';
import type { OnboardingData } from './types';

/**
 * Holds all onboarding step state (step index, form values, modal visibility)
 * plus the derived helpers used by the OnboardingScreen orchestrator and steps.
 */
export function useOnboardingState() {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [sports, setSports] = useState<string[]>([]);
  const [modality, setModality] = useState('');
  const [level, setLevel] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [weight, setWeight] = useState(WEIGHT_DEFAULT);
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LB'>('KG');
  const [age, setAge] = useState(AGE_DEFAULT);
  const [height, setHeight] = useState(HEIGHT_DEFAULT_CM);
  const [heightUnit, setHeightUnit] = useState<'CM' | 'FT'>('CM');
  const [goal, setGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [frequency, setFrequency] = useState(4);
  const [duration, setDuration] = useState(60);
  const [equipment, setEquipment] = useState('');
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? '',
  );
  const [nickname, setNickname] = useState(user?.firstName ?? '');
  const [phone, setPhone] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Pre-fill from Clerk when user loads
  useEffect(() => {
    if (user) {
      if (user.firstName && !firstName) setFirstName(user.firstName);
      if (user.lastName && !lastName) setLastName(user.lastName ?? '');
      const clerkEmail =
        user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? '';
      if (clerkEmail && !email) setEmail(clerkEmail);
      if (user.firstName && !nickname) setNickname(user.firstName);
    }
  }, [user, firstName, lastName, email, nickname]);

  const toggleSport = (item: string) => {
    setSports((list) =>
      list.includes(item) ? list.filter((s) => s !== item) : [...list, item],
    );
  };

  const handleWeightUnitChange = (unit: 'KG' | 'LB') => {
    if (unit === weightUnit) return;
    setWeightUnit(unit);
  };

  const handleHeightUnitChange = (unit: 'CM' | 'FT') => {
    if (unit === heightUnit) return;
    // Convert value between units for continuity
    if (unit === 'FT' && heightUnit === 'CM') {
      const ft = height / 30.48;
      const clamped = Math.min(HEIGHT_MAX_FT, Math.max(HEIGHT_MIN_FT, Math.round(ft * 10) / 10));
      setHeight(clamped);
    } else if (unit === 'CM' && heightUnit === 'FT') {
      const cm = Math.round(height * 30.48);
      const clamped = Math.min(HEIGHT_MAX_CM, Math.max(HEIGHT_MIN_CM, cm));
      setHeight(clamped);
    }
    setHeightUnit(unit);
  };

  const handleProfileNameChange = (text: string) => {
    const parts = text.trim().split(' ');
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' ') ?? '');
  };

  const buildData = (): OnboardingData => ({
    sports,
    modality,
    experienceLevel: level,
    goal,
    sessionsPerWeek: frequency,
    sessionDuration: duration,
    equipment,
    athleteRoutineAccepted: true,
    gender,
    weight,
    weightUnit,
    age,
    height,
    heightUnit,
    activityLevel,
    firstName,
    lastName,
    email,
    nickname,
    phone,
  });

  return {
    user,
    step,
    setStep,
    sports,
    toggleSport,
    modality,
    setModality,
    level,
    setLevel,
    gender,
    setGender,
    weight,
    setWeight,
    weightUnit,
    handleWeightUnitChange,
    age,
    setAge,
    height,
    setHeight,
    heightUnit,
    handleHeightUnitChange,
    goal,
    setGoal,
    activityLevel,
    setActivityLevel,
    frequency,
    setFrequency,
    duration,
    setDuration,
    equipment,
    setEquipment,
    firstName,
    lastName,
    handleProfileNameChange,
    email,
    setEmail,
    nickname,
    setNickname,
    phone,
    setPhone,
    showScheduleModal,
    setShowScheduleModal,
    buildData,
  };
}

export type OnboardingState = ReturnType<typeof useOnboardingState>;
