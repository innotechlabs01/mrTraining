import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onboardingHeroes } from '../../../../shared/theme/onboardingImages';
import { HERO_HEADINGS, STEP_TITLES } from '../components/onboarding/options';
import { CoachScheduleModal } from './CoachScheduleModal';
import { screenStyles as styles } from './onboarding/screenStyles';
import { ActivityStep } from './onboarding/ActivityStep';
import { AgeStep } from './onboarding/AgeStep';
import { STEP_COUNT } from './onboarding/constants';
import { EquipmentStep } from './onboarding/EquipmentStep';
import { FinalChoiceStep } from './onboarding/FinalChoiceStep';
import { FrequencyDurationStep } from './onboarding/FrequencyDurationStep';
import { GenderStep } from './onboarding/GenderStep';
import { GoalStep } from './onboarding/GoalStep';
import { HeightStep } from './onboarding/HeightStep';
import { ModalityLevelStep } from './onboarding/ModalityLevelStep';
import { ProfileStep } from './onboarding/ProfileStep';
import { SportsStep } from './onboarding/SportsStep';
import { SummaryStep } from './onboarding/SummaryStep';
import { WeightStep } from './onboarding/WeightStep';
import { useOnboardingState } from './onboarding/useOnboardingState';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.onboardingScreen;
import type { OnboardingScreenProps } from './onboarding/types';

export type { OnboardingData } from './onboarding/types';

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { height: screenH } = useWindowDimensions();
  const state = useOnboardingState();
  const { step, setStep, user, showScheduleModal, setShowScheduleModal, buildData } = state;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEP_COUNT,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const canNext = () => {
    if (step === 0) return state.sports.length > 0;
    if (step === 1) return state.modality !== '' && state.level !== '';
    if (step === 2) return state.gender !== '';
    if (step === 3) return true; // weight always has a default
    if (step === 4) return true; // age default valid
    if (step === 5) return true; // height default valid
    if (step === 6) return state.goal !== '';
    if (step === 7) return state.activityLevel !== '';
    if (step === 8) return true;
    if (step === 9) return state.equipment !== '';
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Hero area — top 45% */}
      <View style={[styles.heroArea, { height: heroHeight }]}>
        <ExpoImage
          source={{ uri: onboardingHeroes[step] ?? onboardingHeroes[0] }}
          style={[StyleSheet.absoluteFill, styles.heroImage]}
          placeholderContentFit="cover"
          contentFit="cover"
          cachePolicy="disk"
          transition={200}
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
          {step === 0 && <SportsStep selected={state.sports} onToggle={state.toggleSport} />}
          {step === 1 && (
            <ModalityLevelStep
              modality={state.modality}
              level={state.level}
              onModalityChange={state.setModality}
              onLevelChange={state.setLevel}
            />
          )}
          {step === 2 && <GenderStep gender={state.gender} onChange={state.setGender} />}
          {step === 3 && (
            <WeightStep
              weight={state.weight}
              weightUnit={state.weightUnit}
              onUnitChange={state.handleWeightUnitChange}
              onWeightChange={state.setWeight}
            />
          )}
          {step === 4 && <AgeStep age={state.age} onAgeChange={state.setAge} />}
          {step === 5 && (
            <HeightStep
              height={state.height}
              heightUnit={state.heightUnit}
              onUnitChange={state.handleHeightUnitChange}
              onHeightChange={state.setHeight}
            />
          )}
          {step === 6 && <GoalStep goal={state.goal} onGoalChange={state.setGoal} />}
          {step === 7 && (
            <ActivityStep
              activityLevel={state.activityLevel}
              onActivityLevelChange={state.setActivityLevel}
            />
          )}
          {step === 8 && (
            <FrequencyDurationStep
              frequency={state.frequency}
              duration={state.duration}
              onFrequencyChange={state.setFrequency}
              onDurationChange={state.setDuration}
            />
          )}
          {step === 9 && (
            <EquipmentStep equipment={state.equipment} onEquipmentChange={state.setEquipment} />
          )}
          {step === 10 && (
            <ProfileStep
              firstName={state.firstName}
              lastName={state.lastName}
              nickname={state.nickname}
              email={state.email}
              phone={state.phone}
              onNameChange={state.handleProfileNameChange}
              onNicknameChange={state.setNickname}
              onEmailChange={state.setEmail}
              onPhoneChange={state.setPhone}
            />
          )}
          {step === 11 && <SummaryStep data={buildData()} />}
          {step === 12 && (
            <FinalChoiceStep
              onSchedule={() => setShowScheduleModal(true)}
              onAccept={() => onComplete(buildData())}
            />
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      {/* Bottom pill button */}
      <View style={styles.bottom}>
        <Pressable
          onPress={goNext}
          disabled={!canNext()}
          style={[
            styles.nextBtn,
            isLastStep ? styles.nextBtnPrimary : styles.nextBtnOutline,
            !canNext() && styles.nextDisabled,
          ]}
        >
          <Text
            style={[styles.nextText, isLastStep ? styles.nextTextPrimary : styles.nextTextOutline]}
          >
            {isLastStep ? t.complete : t.next}
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
        athleteName={user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : t.athleteFallback}
        onScheduled={() => {
          setShowScheduleModal(false);
          onComplete(buildData());
        }}
        onClose={() => setShowScheduleModal(false)}
      />
    </SafeAreaView>
  );
}
