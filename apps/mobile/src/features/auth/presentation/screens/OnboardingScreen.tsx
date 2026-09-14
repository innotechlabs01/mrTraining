import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { colors, radius, spacing, fontFamilies } from '../../../../shared/theme/tokens';
import { onboardingHeroes } from '../../../../shared/theme/onboardingImages';
import {
  CheckIcon,
  TargetIcon,
  CalendarIcon,
  UserIcon,
  ChevronRightIcon,
  PencilIcon,
} from '../../../../shared/components/icons';
import { OptionRow } from '../components/onboarding/OptionRow';
import {
  SPORTS,
  MODALITIES,
  GOALS,
  LEVELS,
  FREQUENCIES,
  DURATIONS,
  EQUIPMENT_OPTIONS,
  STEP_TITLES,
  HERO_HEADINGS,
  type OptionIcon,
} from '../components/onboarding/options';
import { CoachScheduleModal } from './CoachScheduleModal';

type Props = {
  onComplete: (data: OnboardingData) => void;
};

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

const STEP_COUNT = 13;

const WEIGHT_MIN = 40;
const WEIGHT_MAX = 150;
const WEIGHT_DEFAULT = 75;
const RULER_ITEM_WIDTH = 52;

// Age constants — Figma How Old shows 26-30 centered on 28
const AGE_MIN = 16;
const AGE_MAX = 80;
const AGE_DEFAULT = 28;

// Height constants
const HEIGHT_MIN_CM = 120;
const HEIGHT_MAX_CM = 220;
const HEIGHT_DEFAULT_CM = 165;
const HEIGHT_MIN_FT = 4;
const HEIGHT_MAX_FT = 7;
const HEIGHT_RULER_ITEM_WIDTH = 52;

/**
 * Renders a summary row value with a leading option icon (replaces inline emoji).
 */
function SummaryOption({ option }: { option: { label: string; icon: OptionIcon } | undefined }) {
  if (!option) {
    return <Text style={styles.summaryVal}>—</Text>;
  }
  const Icon = option.icon;
  return (
    <View style={styles.summaryValRow}>
      <Icon size={14} color={colors.textSecondary} />
      <Text style={styles.summaryVal}>{option.label}</Text>
    </View>
  );
}

export function OnboardingScreen({ onComplete }: Props) {
  const { height: screenH, width: screenW } = useWindowDimensions();
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
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rulerRef = useRef<ScrollView>(null);
  const ageRulerRef = useRef<ScrollView>(null);
  const heightRulerRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEP_COUNT,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  // Keep weight ruler centered
  useEffect(() => {
    if (step === 3 && rulerRef.current) {
      const index = weight - WEIGHT_MIN;
      const x = Math.max(0, index * RULER_ITEM_WIDTH);
      setTimeout(() => rulerRef.current?.scrollTo({ x, animated: true }), 80);
    }
  }, [step, weight]);

  // Keep age ruler centered when entering age step
  useEffect(() => {
    if (step === 4 && ageRulerRef.current) {
      const index = age - AGE_MIN;
      const x = Math.max(0, index * RULER_ITEM_WIDTH);
      setTimeout(() => ageRulerRef.current?.scrollTo({ x, animated: true }), 80);
    }
  }, [step, age]);

  // Keep height ruler centered when entering height step
  useEffect(() => {
    if (step === 5 && heightRulerRef.current) {
      const isCM = heightUnit === 'CM';
      const min = isCM ? HEIGHT_MIN_CM : HEIGHT_MIN_FT;
      const index = height - min;
      const x = Math.max(0, index * HEIGHT_RULER_ITEM_WIDTH);
      setTimeout(() => heightRulerRef.current?.scrollTo({ x, animated: true }), 80);
    }
  }, [step, height, heightUnit]);

  // Pre-fill from Clerk when user loads
  useEffect(() => {
    if (user) {
      if (user.firstName && !firstName) setFirstName(user.firstName);
      if (user.lastName && !lastName) setLastName(user.lastName ?? '');
      const clerkEmail = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? '';
      if (clerkEmail && !email) setEmail(clerkEmail);
      if (user.firstName && !nickname) setNickname(user.firstName);
    }
  }, [user, firstName, lastName, email, nickname]);

  const toggle = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((s) => s !== item) : [...list, item]);
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

  const clampWeight = (v: number) => Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, v));
  const clampAge = (v: number) => Math.min(AGE_MAX, Math.max(AGE_MIN, v));
  const clampHeight = (v: number) => {
    if (heightUnit === 'CM') return Math.min(HEIGHT_MAX_CM, Math.max(HEIGHT_MIN_CM, v));
    // FT mode: step 0.5? keep 1 decimal
    const rounded = Math.round(v * 10) / 10;
    return Math.min(HEIGHT_MAX_FT, Math.max(HEIGHT_MIN_FT, rounded));
  };

  const formatHeightDisplay = (value: number, unit: 'CM' | 'FT') => {
    if (unit === 'CM') return { number: String(value), unitLabel: 'CM' };
    // Show FT as e.g. 5.4 or 5'5"
    const totalInches = Math.round(value * 12);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    // If wants decimal style, alternative: return { number: value.toFixed(1), unitLabel: 'FT' }
    // Use imperial style:
    return { number: `${ft}'${inch}"`, unitLabel: '' };
  };

  const heightDisplay = formatHeightDisplay(height, heightUnit);

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

  const canNext = () => {
    if (step === 0) return sports.length > 0;
    if (step === 1) return modality !== '' && level !== '';
    if (step === 2) return gender !== '';
    if (step === 3) return true; // weight always has a default
    if (step === 4) return true; // age default valid
    if (step === 5) return true; // height default valid
    if (step === 6) return goal !== '';
    if (step === 7) return activityLevel !== '';
    if (step === 8) return true;
    if (step === 9) return equipment !== '';
    if (step === 10) return true; // profile optional; could validate email format if needed
    return true;
  };

  const goNext = () => {
    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete(buildData());
    }
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const heroHeight = Math.round(screenH * 0.45);
  const isLastStep = step === STEP_COUNT - 1;
  const rulerPadding = Math.round(screenW / 2 - RULER_ITEM_WIDTH / 2 - spacing.lg);
  const heightRulerPadding = Math.round(screenW / 2 - HEIGHT_RULER_ITEM_WIDTH / 2 - spacing.lg);
  const heightRulerLength = HEIGHT_MAX_CM - HEIGHT_MIN_CM + 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Hero area — top 45% */}
      <View style={[styles.heroArea, { height: heroHeight }]}>
        <Image
          source={{ uri: onboardingHeroes[step] ?? onboardingHeroes[0] }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroHeading}>{HERO_HEADINGS[step]}</Text>
          <Text style={styles.heroSubtitle}>{STEP_TITLES[step]}</Text>
        </View>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: STEP_COUNT }).map((_, idx) => (
          <View
            key={idx}
            style={[styles.dot, idx === step ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* Choices area — scrollable, rounded top, MR palette */}
      <View style={styles.choicesWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 0: Sports */}
          {step === 0 && (
            <View style={styles.choicesInner}>
              {SPORTS.map((s) => (
                <OptionRow
                  key={s.id}
                  icon={s.icon}
                  label={s.label}
                  desc={s.desc}
                  active={sports.includes(s.id)}
                  onPress={() => toggle(sports, s.id, setSports)}
                />
              ))}
            </View>
          )}

          {/* STEP 1: Modality + Level */}
          {step === 1 && (
            <View style={styles.choicesInner}>
              <Text style={styles.sectionTitle}>¿Cómo entrenás?</Text>
              {MODALITIES.map((m) => (
                <OptionRow
                  key={m.id}
                  icon={m.icon}
                  label={m.label}
                  desc={m.desc}
                  active={modality === m.id}
                  onPress={() => setModality(m.id)}
                />
              ))}
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Tu nivel de experiencia</Text>
              {LEVELS.map((l) => (
                <OptionRow
                  key={l.id}
                  icon={l.icon}
                  label={l.label}
                  desc={l.desc}
                  active={level === l.id}
                  onPress={() => setLevel(l.id)}
                />
              ))}
            </View>
          )}

          {/* STEP 2: Gender — two 140px circles, MR palette */}
          {step === 2 && (
            <View style={styles.choicesInner}>
              <View style={styles.fitBodySubtitleBar}>
                <Text style={styles.fitBodySubtitleText}>
                  Elige la opción con la que te identificas. Esta información nos ayuda a
                  personalizar tu plan.
                </Text>
              </View>

              <View style={styles.genderRow}>
                <Pressable
                  onPress={() => setGender('male')}
                  style={styles.genderItem}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar masculino"
                >
                  <View
                    style={[
                      styles.genderCircle,
                      gender === 'male' ? styles.genderCircleSelected : styles.genderCircleUnselected,
                    ]}
                  >
                    <UserIcon
                      size={64}
                      color={gender === 'male' ? colors.base : colors.text}
                    />
                  </View>
                  <Text
                    style={[
                      styles.genderLabel,
                      gender === 'male' && styles.genderLabelSelected,
                    ]}
                  >
                    Masculino
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setGender('female')}
                  style={styles.genderItem}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar femenino"
                >
                  <View
                    style={[
                      styles.genderCircle,
                      gender === 'female' ? styles.genderCircleSelected : styles.genderCircleUnselected,
                    ]}
                  >
                    <UserIcon
                      size={64}
                      color={gender === 'female' ? colors.base : colors.text}
                    />
                  </View>
                  <Text
                    style={[
                      styles.genderLabel,
                      gender === 'female' && styles.genderLabelSelected,
                    ]}
                  >
                    Femenino
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* STEP 3: Weight — KG/LB toggle + ruler + large display, MR palette */}
          {step === 3 && (
            <View style={styles.choicesInner}>
              <View style={styles.fitBodySubtitleBar}>
                <Text style={styles.fitBodySubtitleText}>
                  Registra tu peso para personalizar tu plan.
                </Text>
              </View>

              <View style={styles.unitToggleContainer}>
                <Pressable
                  onPress={() => handleWeightUnitChange('KG')}
                  style={[styles.unitToggleBtn, weightUnit === 'KG' && styles.unitToggleBtnActive]}
                >
                  <Text style={[styles.unitToggleText, weightUnit === 'KG' && styles.unitToggleTextActive]}>KG</Text>
                </Pressable>
                <View style={styles.unitToggleDivider} />
                <Pressable
                  onPress={() => handleWeightUnitChange('LB')}
                  style={[styles.unitToggleBtn, weightUnit === 'LB' && styles.unitToggleBtnActive]}
                >
                  <Text style={[styles.unitToggleText, weightUnit === 'LB' && styles.unitToggleTextActive]}>LB</Text>
                </Pressable>
              </View>

              <View style={styles.weightDisplayRow}>
                <Pressable
                  onPress={() => setWeight((w) => clampWeight(w - 1))}
                  style={styles.weightArrowBtn}
                  hitSlop={12}
                >
                  <Text style={styles.weightArrowText}>−</Text>
                </Pressable>

                <View style={styles.weightValueBox}>
                  <Text style={styles.weightNumber}>{weight}</Text>
                  <Text style={styles.weightUnitLabel}>{weightUnit}</Text>
                </View>

                <Pressable
                  onPress={() => setWeight((w) => clampWeight(w + 1))}
                  style={styles.weightArrowBtn}
                  hitSlop={12}
                >
                  <Text style={styles.weightArrowText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.rulerIndicatorWrap}>
                <View style={styles.rulerTriangle} />
              </View>

              <View style={styles.rulerBar}>
                <View style={styles.rulerCenterLine} />
                <ScrollView
                  ref={rulerRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={RULER_ITEM_WIDTH}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingHorizontal: rulerPadding }}
                  onMomentumScrollEnd={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(x / RULER_ITEM_WIDTH);
                    const next = clampWeight(WEIGHT_MIN + idx);
                    if (next !== weight) setWeight(next);
                  }}
                >
                  {Array.from({ length: WEIGHT_MAX - WEIGHT_MIN + 1 }, (_, i) => {
                    const v = WEIGHT_MIN + i;
                    const isSelected = v === weight;
                    const isMajor = v % 5 === 0;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => setWeight(v)}
                        style={styles.rulerItem}
                      >
                        <Text
                          style={[
                            styles.rulerNumber,
                            isSelected ? styles.rulerNumberSelected : styles.rulerNumberUnselected,
                            isMajor && !isSelected ? styles.rulerNumberMajor : null,
                          ]}
                        >
                          {v}
                        </Text>
                        <View
                          style={[
                            styles.rulerTick,
                            isMajor ? styles.rulerTickMajor : styles.rulerTickMinor,
                            isSelected && styles.rulerTickSelected,
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <Text style={styles.rulerHint}>Tap a number or use + / − to adjust</Text>
            </View>
          )}

          {/* STEP 4: Age — horizontal ruler like Figma 4.2, MR palette */}
          {step === 4 && (
            <View style={styles.choicesInner}>
              <View style={styles.fitBodySubtitleBar}>
                <Text style={styles.fitBodySubtitleText}>
                  Indica tu edad para adaptar la intensidad de tu plan de entrenamiento.
                </Text>
              </View>

              <View style={styles.weightDisplayRow}>
                <Pressable
                  onPress={() => setAge((a) => clampAge(a - 1))}
                  style={styles.weightArrowBtn}
                  hitSlop={12}
                >
                  <Text style={styles.weightArrowText}>−</Text>
                </Pressable>
                <View style={styles.weightValueBox}>
                  <Text style={styles.weightNumber}>{age}</Text>
                  <Text style={styles.weightUnitLabel}>yrs</Text>
                </View>
                <Pressable
                  onPress={() => setAge((a) => clampAge(a + 1))}
                  style={styles.weightArrowBtn}
                  hitSlop={12}
                >
                  <Text style={styles.weightArrowText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.rulerIndicatorWrap}>
                <View style={styles.rulerTriangle} />
              </View>

              <View style={styles.rulerBar}>
                <View style={styles.rulerCenterLine} />
                <ScrollView
                  ref={ageRulerRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={RULER_ITEM_WIDTH}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingHorizontal: rulerPadding }}
                  onMomentumScrollEnd={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(x / RULER_ITEM_WIDTH);
                    const next = clampAge(AGE_MIN + idx);
                    if (next !== age) setAge(next);
                  }}
                >
                  {Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => {
                    const v = AGE_MIN + i;
                    const isSelected = v === age;
                    const isMajor = v % 5 === 0;
                    return (
                      <Pressable key={v} onPress={() => setAge(v)} style={styles.rulerItem}>
                        <Text
                          style={[
                            styles.rulerNumber,
                            isSelected ? styles.rulerNumberSelected : styles.rulerNumberUnselected,
                            isMajor && !isSelected ? styles.rulerNumberMajor : null,
                          ]}
                        >
                          {v}
                        </Text>
                        <View
                          style={[
                            styles.rulerTick,
                            isMajor ? styles.rulerTickMajor : styles.rulerTickMinor,
                            isSelected && styles.rulerTickSelected,
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <Text style={styles.rulerHint}>Slide the ruler or tap to select your age (16–80)</Text>
            </View>
          )}

          {/* STEP 5: Height — CM/FT toggle + large display + horizontal ruler (Figma vertical adapted to horizontal for mobile) */}
          {step === 5 && (
            <View style={styles.choicesInner}>
              <View style={styles.fitBodySubtitleBar}>
                <Text style={styles.fitBodySubtitleText}>
                  Indica tu altura para calcular tus métricas con precisión.
                </Text>
              </View>

              <View style={styles.unitToggleContainer}>
                <Pressable
                  onPress={() => handleHeightUnitChange('CM')}
                  style={[styles.unitToggleBtn, heightUnit === 'CM' && styles.unitToggleBtnActive]}
                >
                  <Text style={[styles.unitToggleText, heightUnit === 'CM' && styles.unitToggleTextActive]}>CM</Text>
                </Pressable>
                <View style={styles.unitToggleDivider} />
                <Pressable
                  onPress={() => handleHeightUnitChange('FT')}
                  style={[styles.unitToggleBtn, heightUnit === 'FT' && styles.unitToggleBtnActive]}
                >
                  <Text style={[styles.unitToggleText, heightUnit === 'FT' && styles.unitToggleTextActive]}>FT</Text>
                </Pressable>
              </View>

              <View style={styles.weightDisplayRow}>
                <Pressable
                  onPress={() =>
                    setHeight((h) => clampHeight(heightUnit === 'CM' ? (h as number) - 1 : (h as number) - 0.1))
                  }
                  style={styles.weightArrowBtn}
                  hitSlop={12}
                >
                  <Text style={styles.weightArrowText}>−</Text>
                </Pressable>
                <View style={styles.weightValueBox}>
                  <Text style={styles.weightNumber}>{heightDisplay.number}</Text>
                  {heightDisplay.unitLabel ? (
                    <Text style={styles.weightUnitLabel}>{heightDisplay.unitLabel}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() =>
                    setHeight((h) => clampHeight(heightUnit === 'CM' ? (h as number) + 1 : (h as number) + 0.1))
                  }
                  style={styles.weightArrowBtn}
                  hitSlop={12}
                >
                  <Text style={styles.weightArrowText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.rulerIndicatorWrap}>
                <View style={styles.rulerTriangle} />
                {/* side arrow hint for Figma vertical style - hidden on horizontal, but keep triangle on top like Figma 4.2 */}
              </View>

              <View style={styles.rulerBar}>
                <View style={styles.rulerCenterLine} />
                {heightUnit === 'CM' ? (
                  <ScrollView
                    ref={heightRulerRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={HEIGHT_RULER_ITEM_WIDTH}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: heightRulerPadding }}
                    onMomentumScrollEnd={(e) => {
                      const x = e.nativeEvent.contentOffset.x;
                      const idx = Math.round(x / HEIGHT_RULER_ITEM_WIDTH);
                      const next = clampHeight(HEIGHT_MIN_CM + idx);
                      if (next !== height) setHeight(next);
                    }}
                  >
                    {Array.from({ length: heightRulerLength }, (_, i) => {
                      const v = HEIGHT_MIN_CM + i;
                      const isSelected = v === height;
                      const isMajor = v % 5 === 0;
                      return (
                        <Pressable key={v} onPress={() => setHeight(v)} style={styles.rulerItem}>
                          <Text
                            style={[
                              styles.rulerNumber,
                              isSelected ? styles.rulerNumberSelected : styles.rulerNumberUnselected,
                              isMajor && !isSelected ? styles.rulerNumberMajor : null,
                            ]}
                          >
                            {v}
                          </Text>
                          <View
                            style={[
                              styles.rulerTick,
                              isMajor ? styles.rulerTickMajor : styles.rulerTickMinor,
                              isSelected && styles.rulerTickSelected,
                            ]}
                          />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <ScrollView
                    ref={heightRulerRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={HEIGHT_RULER_ITEM_WIDTH}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: heightRulerPadding }}
                    onMomentumScrollEnd={(e) => {
                      const x = e.nativeEvent.contentOffset.x;
                      const idx = Math.round(x / HEIGHT_RULER_ITEM_WIDTH);
                      // FT decimal steps of 0.1 from 4.0 to 7.0 => 31 values
                      const count = Math.round((HEIGHT_MAX_FT - HEIGHT_MIN_FT) * 10) + 1;
                      const nextIdx = Math.min(count - 1, Math.max(0, idx));
                      const next = clampHeight(HEIGHT_MIN_FT + nextIdx * 0.1);
                      if (next !== height) setHeight(next);
                    }}
                  >
                    {Array.from(
                      { length: Math.round((HEIGHT_MAX_FT - HEIGHT_MIN_FT) * 10) + 1 },
                      (_, i) => {
                        const v = Math.round((HEIGHT_MIN_FT + i * 0.1) * 10) / 10;
                        const isSelected = Math.abs(v - (height as number)) < 0.05;
                        const isMajor = Number.isInteger(v) || Math.abs(v * 10) % 5 === 0;
                        return (
                          <Pressable key={v} onPress={() => setHeight(v)} style={styles.rulerItem}>
                            <Text
                              style={[
                                styles.rulerNumber,
                                isSelected ? styles.rulerNumberSelected : styles.rulerNumberUnselected,
                                isMajor && !isSelected ? styles.rulerNumberMajor : null,
                              ]}
                            >
                              {v.toFixed(1)}
                            </Text>
                            <View
                              style={[
                                styles.rulerTick,
                                isMajor ? styles.rulerTickMajor : styles.rulerTickMinor,
                                isSelected && styles.rulerTickSelected,
                              ]}
                            />
                          </Pressable>
                        );
                      },
                    )}
                  </ScrollView>
                )}
              </View>
              <Text style={styles.rulerHint}>
                {heightUnit === 'CM' ? 'Tap or slide to select 120–220 cm' : 'Tap or slide to select 4.0–7.0 ft'}
              </Text>
              {/* Vertical ruler homage to Figma 4.4 — compact visual aid, not primary interaction */}
              <View style={styles.heightVerticalHint}>
                <View style={styles.heightVerticalBar}>
                  <View style={styles.heightVerticalTicks}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.heightVerticalTick,
                          i % 3 === 0 ? styles.heightVerticalTickMajor : styles.heightVerticalTickMinor,
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.heightVerticalIndicatorLine} />
                </View>
                <View style={styles.heightVerticalArrowWrap}>
                  <View style={styles.heightVerticalArrow} />
                </View>
                <Text style={styles.heightVerticalLabel}>{heightUnit === 'CM' ? `${height} cm` : `${(height as number).toFixed(1)} ft`}</Text>
              </View>
            </View>
          )}

          {/* STEP 6: Goal — Figma 4.5 style: 5 white pills with radio, MR primary when selected */}
          {step === 6 && (
            <View style={styles.choicesInner}>
              <View style={styles.fitBodySubtitleBar}>
                <Text style={styles.fitBodySubtitleText}>
                  Elige el objetivo principal que guiará tu entrenamiento.
                </Text>
              </View>
              {GOALS.map((g) => {
                const active = goal === g.id;
                const GoalIcon = g.icon;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGoal(g.id)}
                    style={[styles.goalPill, active && styles.goalPillActive]}
                  >
                    <View style={styles.goalPillLeft}>
                      <GoalIcon size={22} color={active ? colors.base : colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.goalPillLabel, active && styles.goalPillLabelActive]}>{g.label}</Text>
                        <Text style={styles.goalPillDesc}>{g.desc}</Text>
                      </View>
                    </View>
                    <View style={[styles.goalRadio, active && styles.goalRadioActive]}>
                      {active ? <View style={styles.goalRadioInner} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* STEP 7: Physical Activity Level — Figma 4.6 style: 3 centered pills, MR primary when selected */}
          {step === 7 && (
            <View style={styles.choicesInner}>
              <View style={styles.fitBodySubtitleBar}>
                <Text style={styles.fitBodySubtitleText}>
                  Selecciona tu nivel de actividad física habitual.
                </Text>
              </View>
              {LEVELS.map((l) => {
                const active = activityLevel === l.id;
                const LevelIcon = l.icon;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => setActivityLevel(l.id)}
                    style={[styles.activityPill, active && styles.activityPillActive]}
                  >
                    <LevelIcon size={22} color={active ? colors.base : colors.primary} />
                    <Text style={[styles.activityPillLabel, active && styles.activityPillTextActive]}>{l.label}</Text>
                    <Text style={[styles.activityPillDesc, active && styles.activityPillDescActive]}>{l.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* STEP 8: Frequency + Duration (was 3) */}
          {step === 8 && (
            <View style={styles.choicesInner}>
              <Text style={styles.sectionTitle}>How many days per week?</Text>
              <View style={styles.chipRow}>
                {FREQUENCIES.map((f) => {
                  const active = frequency === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setFrequency(f)}
                      style={[styles.freqChip, active && styles.freqChipActive]}
                    >
                      <Text style={[styles.freqText, active && styles.freqTextActive]}>{f}</Text>
                      <Text style={[styles.freqSub, active && styles.freqSubActive]}>days</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.freqBar}>
                {FREQUENCIES.map((f) => (
                  <View key={f} style={[styles.freqBarDot, frequency >= f && styles.freqBarDotActive]} />
                ))}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Session duration</Text>
              <View style={styles.chipRow}>
                {DURATIONS.map((d) => {
                  const active = duration === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDuration(d)}
                      style={[styles.durChip, active && styles.durChipActive]}
                    >
                      <Text style={[styles.durText, active && styles.durTextActive]}>{d}</Text>
                      <Text style={[styles.durSub, active && styles.durSubActive]}>min</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 9: Equipment (was 4) */}
          {step === 9 && (
            <View style={styles.choicesInner}>
              <Text style={styles.sectionTitle}>What equipment do you have?</Text>
              {EQUIPMENT_OPTIONS.map((e) => {
                const active = equipment === e.id;
                const EquipmentIcon = e.icon;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => setEquipment(e.id)}
                    style={[styles.choiceCard, active && styles.choiceCardActive]}
                  >
                    <EquipmentIcon size={24} color={active ? colors.primary : colors.textSecondary} />
                    <View style={styles.choiceContent}>
                      <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>{e.label}</Text>
                      <Text style={styles.choiceDesc}>{e.desc}</Text>
                    </View>
                    {active ? (
                      <View style={styles.checkCircle}>
                        <CheckIcon size={12} color={colors.base} />
                      </View>
                    ) : (
                      <View style={styles.checkCircleInactive} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* STEP 10: Fill Your Profile — Figma 4.7 style, MR palette */}
          {step === 10 && (
            <View style={styles.choicesInner}>
              <View style={styles.fitBodySubtitleBar}>
                <Text style={styles.fitBodySubtitleText}>
                  Completa tus datos para preparar tu plan personalizado.
                </Text>
              </View>

              {/* Avatar placeholder — Figma shows photo with lime pencil badge → MR primary badge */}
              <View style={styles.avatarWrap}>
                <View style={styles.avatarCircle}>
                  {(() => {
                    const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
                    return initials ? (
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    ) : (
                      <UserIcon size={40} color={colors.textSecondary} />
                    );
                  })()}
                </View>
                <View style={styles.avatarEditBadge}>
                  <PencilIcon size={14} color={colors.base} />
                </View>
              </View>

              {/* Full name — combined for Figma compat, splits into first/last for data */}
              <Text style={styles.inputLabel}>Full name</Text>
              <View style={styles.inputPill}>
                <TextInput
                  value={`${firstName} ${lastName}`.trim()}
                  onChangeText={(t) => {
                    const parts = t.trim().split(' ');
                    setFirstName(parts[0] ?? '');
                    setLastName(parts.slice(1).join(' ') ?? '');
                  }}
                  placeholder="Madison Smith"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.inputText}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>Nickname</Text>
              <View style={styles.inputPill}>
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="Madison"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.inputText}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputPill}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="madisons@example.com"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.inputText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View style={styles.inputPill}>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+123 567 89000"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.inputText}
                  keyboardType="phone-pad"
                />
              </View>
              <Text style={styles.rulerHint}>You can update these details later in your profile.</Text>
            </View>
          )}

          {/* STEP 11: Summary */}
          {step === 11 && (
            <View style={styles.choicesInner}>
              <View style={styles.summaryHero}>
                <View style={{ marginBottom: 12 }}>
                  <TargetIcon size={48} color={colors.primary} />
                </View>
                <Text style={styles.summaryTitle}>Your Personalized Plan</Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Sports</Text>
                  <View style={styles.summaryChips}>
                    {sports.map((s) => {
                      const sport = SPORTS.find((x) => x.id === s);
                      const SportIcon = sport?.icon;
                      return (
                        <View key={s} style={styles.miniChip}>
                          {SportIcon ? <SportIcon size={14} color={colors.primary} /> : null}
                          <Text style={styles.miniChipText}>{sport?.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Modality</Text>
                  <SummaryOption option={MODALITIES.find((m) => m.id === modality)} />
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Level</Text>
                  <SummaryOption option={LEVELS.find((l) => l.id === level)} />
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Gender</Text>
                  <Text style={styles.summaryVal}>{gender ? (gender === 'male' ? 'Masculino' : 'Femenino') : '—'}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Weight</Text>
                  <Text style={styles.summaryVal}>
                    {weight} {weightUnit}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Age</Text>
                  <Text style={styles.summaryVal}>{age} yrs</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Height</Text>
                  <Text style={styles.summaryVal}>
                    {heightUnit === 'CM' ? `${height} CM` : `${(height as number).toFixed(1)} FT`}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Goal</Text>
                  <SummaryOption option={GOALS.find((g) => g.id === goal)} />
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Activity</Text>
                  <SummaryOption option={LEVELS.find((l) => l.id === activityLevel)} />
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Schedule</Text>
                  <Text style={styles.summaryVal}>
                    {frequency}x/week · {duration} min
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Equipment</Text>
                  <SummaryOption option={EQUIPMENT_OPTIONS.find((e) => e.id === equipment)} />
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Profile</Text>
                  <Text style={styles.summaryVal} numberOfLines={2}>
                    {[firstName, lastName].filter(Boolean).join(' ') || '—'}
                    {email ? ` · ${email}` : ''}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* STEP 12: Your Choice */}
          {step === 12 && (
            <View style={styles.choicesInner}>
              <Text style={styles.sectionTitle}>We have created a routine based on your profile.</Text>
              <Text style={styles.desc}>What would you like to do?</Text>

              <Pressable
                onPress={() => setShowScheduleModal(true)}
                style={[styles.choiceCard, { borderColor: `${colors.primary}30` }]}
              >
                <View style={styles.choiceIconBox}>
                  <CalendarIcon size={24} color={colors.primary} />
                </View>
                <View style={styles.choiceContent}>
                  <Text style={styles.choiceLabel}>Schedule with your Coach</Text>
                  <Text style={styles.choiceDesc}>Book a call to review and personalize your routine together</Text>
                </View>
                <ChevronRightIcon size={20} color={colors.primary} />
              </Pressable>

              <Pressable onPress={() => onComplete(buildData())} style={styles.choiceCard}>
                <View style={styles.choiceIconBox}>
                  <CheckIcon size={24} color={colors.primary} />
                </View>
                <View style={styles.choiceContent}>
                  <Text style={styles.choiceLabel}>Accept System Routine</Text>
                  <Text style={styles.choiceDesc}>Start training immediately with the AI-generated plan</Text>
                </View>
                <ChevronRightIcon size={20} color={colors.primary} />
              </Pressable>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      {/* Bottom pill button */}
      <View style={styles.bottom}>
        <Pressable
          onPress={goNext}
          disabled={!canNext()}
          style={[styles.nextBtn, isLastStep ? styles.nextBtnPrimary : styles.nextBtnOutline, !canNext() && styles.nextDisabled]}
        >
          <Text style={[styles.nextText, isLastStep ? styles.nextTextPrimary : styles.nextTextOutline]}>
            {isLastStep ? 'Complete' : 'Next'}
          </Text>
        </Pressable>
        {0 < step && step < STEP_COUNT - 1 && (
          <Pressable onPress={() => setStep(STEP_COUNT - 1)} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
        {step > 0 && (
          <Pressable onPress={goBack} style={styles.backLink}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        )}
      </View>

      <CoachScheduleModal
        visible={showScheduleModal}
        coachId=""
        athleteId={user?.id ?? ''}
        athleteName={user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Athlete'}
        onScheduled={() => {
          setShowScheduleModal(false);
          onComplete(buildData());
        }}
        onClose={() => setShowScheduleModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  // Hero — top 45%
  heroArea: {
    width: '100%',
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,15,14,0.58)',
  },
  heroContent: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroHeading: {
    fontFamily: fontFamilies.displayBlack,
    fontSize: 24,
    lineHeight: 28.8,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    marginTop: 8,
    fontFamily: fontFamilies.heading,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    opacity: 0.85,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.base,
  },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.border },
  // Choices wrapper — rounded top, MR palette
  choicesWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.lg, flexGrow: 1 },
  choicesInner: { gap: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  // Choice cards — FitBody structure, MR palette
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  choiceCardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}14`,
  },
  choiceEmoji: { fontSize: 32, width: 40, textAlign: 'center' },
  choiceContent: { flex: 1 },
  choiceLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  choiceLabelActive: { color: colors.primary },
  choiceDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleInactive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  checkText: { color: colors.base, fontSize: 12, fontWeight: '700' },
  // FitBody lila subtitle bar → MR surfaceRaised
  fitBodySubtitleBar: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  fitBodySubtitleText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Gender — two 140px circles, MR palette (lime → primary, gray → surfaceRaised)
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 24,
    paddingVertical: 12,
  },
  genderItem: { alignItems: 'center', gap: 12 },
  genderCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  genderCircleUnselected: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  genderCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderSymbol: { fontSize: 64, lineHeight: 72, fontWeight: '400' },
  genderSymbolUnselected: { color: colors.text },
  genderSymbolSelected: { color: colors.base },
  genderLabel: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  genderLabelSelected: { color: colors.primary },
  // Weight / Age / Height — KG/LB toggle, display, ruler
  unitToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    gap: 0,
  },
  unitToggleBtn: {
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitToggleBtnActive: { backgroundColor: colors.primary },
  unitToggleText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  unitToggleTextActive: { color: colors.base },
  unitToggleDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 },
  weightDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 8,
  },
  weightArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightArrowText: { fontSize: 22, fontWeight: '700', color: colors.text, lineHeight: 24 },
  weightValueBox: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minWidth: 120, justifyContent: 'center' },
  weightNumber: {
    fontFamily: fontFamilies.displayBlack,
    fontSize: 48,
    lineHeight: 48,
    color: colors.text,
    fontWeight: '900',
  },
  weightUnitLabel: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  rulerIndicatorWrap: { alignItems: 'center', height: 12, marginBottom: 0, marginTop: 8 },
  rulerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
  },
  rulerBar: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    marginTop: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  rulerCenterLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.primary,
    opacity: 0.9,
    zIndex: 0,
  },
  rulerItem: { width: 52, alignItems: 'center', justifyContent: 'flex-start', gap: 6, zIndex: 1 },
  rulerNumber: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  rulerNumberUnselected: { color: colors.textSecondary, fontSize: 13, opacity: 0.9 },
  rulerNumberMajor: { color: colors.text, opacity: 0.7 },
  rulerNumberSelected: { color: colors.primary, fontSize: 32, fontWeight: '900', lineHeight: 32 },
  rulerTick: { borderRadius: 1, backgroundColor: colors.border },
  rulerTickMinor: { width: 1.5, height: 10, opacity: 0.6 },
  rulerTickMajor: { width: 1.5, height: 18, backgroundColor: colors.textSecondary, opacity: 0.9 },
  rulerTickSelected: { backgroundColor: colors.primary, width: 2, height: 22, opacity: 1 },
  rulerHint: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 10, opacity: 0.8 },
  // Height vertical homage to Figma 4.4
  heightVerticalHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 10,
  },
  heightVerticalBar: {
    width: 48,
    height: 88,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heightVerticalTicks: {
    gap: 6,
    alignItems: 'center',
  },
  heightVerticalTick: { borderRadius: 1, backgroundColor: colors.border },
  heightVerticalTickMinor: { width: 12, height: 1.5, opacity: 0.6 },
  heightVerticalTickMajor: { width: 20, height: 1.5, backgroundColor: colors.textSecondary, opacity: 0.9 },
  heightVerticalIndicatorLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    marginTop: -1,
    backgroundColor: colors.primary,
    opacity: 0.9,
  },
  heightVerticalArrowWrap: { justifyContent: 'center' },
  heightVerticalArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.primary,
    borderLeftWidth: 0,
  },
  heightVerticalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  // Goal pills — Figma 4.5 style: white pill → MR surfaceRaised, radio on right, primary when selected
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    marginBottom: 10,
  },
  goalPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goalPillLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  goalPillEmoji: { fontSize: 20, width: 24, textAlign: 'center' },
  goalPillLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  goalPillLabelActive: { color: colors.base },
  goalPillDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 14 },
  goalRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalRadioActive: { borderColor: colors.base, backgroundColor: colors.base },
  goalRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  // Activity pills — Figma 4.6 style: 3 centered pills, white → primary when selected (Advance in Figma is lime)
  activityPill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    marginBottom: 12,
  },
  activityPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activityPillEmoji: { fontSize: 18 },
  activityPillLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  activityPillTextActive: { color: colors.base },
  activityPillDesc: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 16, paddingHorizontal: 12 },
  activityPillDescActive: { color: `${colors.base}CC` },
  // Fill profile — Figma 4.7
  avatarWrap: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarInitials: { fontSize: 36, fontWeight: '800', color: colors.text },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarEditIcon: { fontSize: 14, color: colors.base, fontWeight: '700' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 6, marginTop: 6 },
  inputPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  inputText: { fontSize: 15, color: colors.text, fontWeight: '500', padding: 0 },
  // Chips — frequency / duration
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  freqChip: {
    width: 52,
    height: 72,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freqChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
  freqText: { fontSize: 20, fontWeight: '800', color: colors.textSecondary },
  freqTextActive: { color: colors.primary },
  freqSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  freqSubActive: { color: colors.primary },
  freqBar: { flexDirection: 'row', gap: 7, marginTop: 16, paddingHorizontal: 2 },
  freqBarDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  freqBarDotActive: { backgroundColor: colors.primary },
  durChip: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
  durText: { fontSize: 20, fontWeight: '800', color: colors.textSecondary },
  durTextActive: { color: colors.primary },
  durSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  durSubActive: { color: colors.primary },
  // Summary
  summaryHero: { alignItems: 'center', marginBottom: 20 },
  summaryEmoji: { fontSize: 48, marginBottom: 12 },
  summaryTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  summaryCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  summaryDivider: { height: 1, backgroundColor: colors.border },
  summaryKey: { fontSize: 14, color: colors.textSecondary, fontWeight: '600', width: 90 },
  summaryVal: { fontSize: 14, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  summaryValRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  summaryChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${colors.primary}14`,
  },
  miniChipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  // Bottom pill button
  bottom: {
    padding: spacing.lg,
    paddingBottom: 32,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    width: 200,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
  },
  nextBtnOutline: { backgroundColor: 'transparent', borderColor: colors.border },
  nextBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  nextText: { fontSize: 16, fontWeight: '700' },
  nextTextOutline: { color: colors.text },
  nextTextPrimary: { color: colors.base },
  nextDisabled: { opacity: 0.35 },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 },
  skipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  backLink: { paddingVertical: 8, marginTop: 2 },
  backText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  desc: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  choiceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}14`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceEmojiLarge: { fontSize: 22 },
  choiceArrow: { fontSize: 18, color: colors.primary, fontWeight: '600', marginLeft: 4 },
});
