import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
};

const { width: screenW } = Dimensions.get('window');

const SPORTS = [
  { id: 'gym', label: 'Gym', emoji: '🏋️', desc: 'Strength & hypertrophy' },
  { id: 'running', label: 'Running', emoji: '🏃', desc: 'Speed & endurance' },
  { id: 'crossfit', label: 'CrossFit', emoji: '💪', desc: 'Functional fitness' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊', desc: 'Full body cardio' },
  { id: 'cycling', label: 'Cycling', emoji: '🚴', desc: 'Power & stamina' },
  { id: 'tennis', label: 'Tennis', emoji: '🎾', desc: 'Agility & focus' },
  { id: 'yoga', label: 'Yoga', emoji: '🧘', desc: 'Flexibility & mind' },
  { id: 'soccer', label: 'Soccer', emoji: '⚽', desc: 'Speed & teamwork' },
];

const MODALITIES = [
  { id: 'presencial', label: 'Presencial', emoji: '🏢', desc: 'Train at the gym or with your coach in person' },
  { id: 'hibrido', label: 'Hibrido', emoji: '🔄', desc: 'Mix of in-person sessions and remote coaching' },
  { id: 'virtual', label: 'Virtual', emoji: '📱', desc: 'Fully remote with digital workout plans' },
];

const GOALS = [
  { id: 'strength', label: 'Get Stronger', emoji: '💪', desc: 'Build muscle, increase your lifts, gain power' },
  { id: 'weight-loss', label: 'Lose Weight', emoji: '🔥', desc: 'Burn fat, improve body composition, get lean' },
  { id: 'endurance', label: 'Build Endurance', emoji: '🫀', desc: 'Run longer, swim farther, last longer' },
  { id: 'performance', label: 'Performance', emoji: '🏆', desc: 'Compete, set PRs, reach peak condition' },
  { id: 'health', label: 'General Health', emoji: '✨', desc: 'Stay active, feel better, prevent injury' },
];

const LEVELS = [
  { id: 'beginner', label: 'Beginner', emoji: '🌱', desc: 'New to structured training or returning after a break' },
  { id: 'intermediate', label: 'Intermediate', emoji: '🌿', desc: '1-2 years of consistent training experience' },
  { id: 'advanced', label: 'Advanced', emoji: '🌳', desc: '3+ years, comfortable with complex programming' },
];

const FREQUENCIES = [2, 3, 4, 5, 6, 7];
const DURATIONS = [30, 45, 60, 90];
const EQUIPMENT_OPTIONS = [
  { id: 'full-gym', label: 'Full Gym', emoji: '🏋️‍♂️', desc: 'Barbells, machines, cables, everything' },
  { id: 'basic', label: 'Basic', emoji: '🪫', desc: 'Dumbbells, bands, pull-up bar' },
  { id: 'minimal', label: 'Minimal', emoji: '🏠', desc: 'Resistance bands, yoga mat' },
  { id: 'bodyweight', label: 'Bodyweight', emoji: '🧘', desc: 'No equipment, just your body' },
];

const STEP_TITLES = ['Your Sport', 'How & Level', 'Your Goal', 'Schedule', 'Equipment', 'Your Plan', 'Your Choice'];
const STEP_COUNT = 7;

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [sports, setSports] = useState<string[]>([]);
  const [modality, setModality] = useState('');
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [frequency, setFrequency] = useState(4);
  const [duration, setDuration] = useState(60);
  const [equipment, setEquipment] = useState('');
  const [showModal, setShowModal] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEP_COUNT,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const toggle = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((s) => s !== item) : [...list, item]);
  };

  const canNext = () => {
    if (step === 0) return sports.length > 0;
    if (step === 1) return modality !== '' && level !== '';
    if (step === 2) return goal !== '';
    if (step === 3) return true;
    if (step === 4) return equipment !== '';
    return true;
  };

  const goNext = () => {
    if (step < STEP_COUNT - 1) setStep((s) => s + 1);
    else onComplete({ sports, modality, experienceLevel: level, goal, sessionsPerWeek: frequency, sessionDuration: duration, equipment });
  };

  const goBack = () => { if (step > 0) setStep((s) => s - 1); };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.stepLabel}>{step + 1} of {STEP_COUNT}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{STEP_TITLES[step]}</Text>

        {/* STEP 0: Sports */}
        {step === 0 && (
          <View style={styles.grid2}>
            {SPORTS.map((s) => {
              const active = sports.includes(s.id);
              return (
                <Pressable key={s.id} onPress={() => toggle(sports, s.id, setSports)}
                  style={[styles.sportCard, active && styles.sportCardActive]}>
                  <Text style={styles.sportEmoji}>{s.emoji}</Text>
                  <Text style={[styles.sportLabel, active && styles.sportLabelActive]}>{s.label}</Text>
                  <Text style={styles.sportDesc}>{s.desc}</Text>
                  {active && <View style={styles.activeDot}><Text style={styles.activeDotText}>✓</Text></View>}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* STEP 1: Modality + Level */}
        {step === 1 && (
          <View>
            <Text style={styles.subtitle}>How do you train?</Text>
            {MODALITIES.map((m) => (
              <Pressable key={m.id} onPress={() => setModality(m.id)}
                style={[styles.optionRow, modality === m.id && styles.optionRowActive]}>
                <Text style={styles.optionEmoji}>{m.emoji}</Text>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, modality === m.id && styles.optionLabelActive]}>{m.label}</Text>
                  <Text style={styles.optionDesc}>{m.desc}</Text>
                </View>
                {modality === m.id && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
            <Text style={[styles.subtitle, { marginTop: 32 }]}>Your experience level</Text>
            {LEVELS.map((l) => (
              <Pressable key={l.id} onPress={() => setLevel(l.id)}
                style={[styles.optionRow, level === l.id && styles.optionRowActive]}>
                <Text style={styles.optionEmoji}>{l.emoji}</Text>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, level === l.id && styles.optionLabelActive]}>{l.label}</Text>
                  <Text style={styles.optionDesc}>{l.desc}</Text>
                </View>
                {level === l.id && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        )}

        {/* STEP 2: Goal */}
        {step === 2 && (
          <View>
            {GOALS.map((g) => (
              <Pressable key={g.id} onPress={() => setGoal(g.id)}
                style={[styles.goalCard, goal === g.id && styles.goalCardActive]}>
                <View style={[styles.goalIcon, goal === g.id && styles.goalIconActive]}>
                  <Text style={styles.goalEmoji}>{g.emoji}</Text>
                </View>
                <View style={styles.goalContent}>
                  <Text style={[styles.goalLabel, goal === g.id && styles.goalLabelActive]}>{g.label}</Text>
                  <Text style={styles.goalDesc}>{g.desc}</Text>
                </View>
                {goal === g.id && <View style={styles.goalCheck}><Text style={styles.checkText}>✓</Text></View>}
              </Pressable>
            ))}
          </View>
        )}

        {/* STEP 3: Frequency + Duration */}
        {step === 3 && (
          <View>
            <Text style={styles.subtitle}>How many days per week?</Text>
            <View style={styles.chipRow}>
              {FREQUENCIES.map((f) => (
                <Pressable key={f} onPress={() => setFrequency(f)}
                  style={[styles.freqChip, frequency === f && styles.freqChipActive]}>
                  <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>{f}</Text>
                  <Text style={[styles.freqSub, frequency === f && styles.freqSubActive]}>days</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.freqBar}>
              {FREQUENCIES.map((f) => (
                <View key={f} style={[styles.freqBarDot, frequency >= f && styles.freqBarDotActive]} />
              ))}
            </View>

            <Text style={[styles.subtitle, { marginTop: 36 }]}>Session duration</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => (
                <Pressable key={d} onPress={() => setDuration(d)}
                  style={[styles.durChip, duration === d && styles.durChipActive]}>
                  <Text style={[styles.durText, duration === d && styles.durTextActive]}>{d}</Text>
                  <Text style={[styles.durSub, duration === d && styles.durSubActive]}>min</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* STEP 4: Equipment */}
        {step === 4 && (
          <View>
            <Text style={styles.subtitle}>What equipment do you have?</Text>
            {EQUIPMENT_OPTIONS.map((e) => (
              <Pressable key={e.id} onPress={() => setEquipment(e.id)}
                style={[styles.optionRow, equipment === e.id && styles.optionRowActive]}>
                <Text style={styles.optionEmoji}>{e.emoji}</Text>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, equipment === e.id && styles.optionLabelActive]}>{e.label}</Text>
                  <Text style={styles.optionDesc}>{e.desc}</Text>
                </View>
                {equipment === e.id && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        )}

        {/* STEP 5: Summary */}
        {step === 5 && (
          <View>
            <View style={styles.summaryHero}>
              <Text style={styles.summaryEmoji}>🎯</Text>
              <Text style={styles.summaryTitle}>Your Personalized Plan</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Sports</Text>
                <View style={styles.summaryChips}>
                  {sports.map((s) => {
                    const sport = SPORTS.find((x) => x.id === s);
                    return <View key={s} style={styles.miniChip}><Text style={styles.miniChipText}>{sport?.emoji} {sport?.label}</Text></View>;
                  })}
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Modality</Text>
                <Text style={styles.summaryVal}>{MODALITIES.find((m) => m.id === modality)?.emoji} {MODALITIES.find((m) => m.id === modality)?.label}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Level</Text>
                <Text style={styles.summaryVal}>{LEVELS.find((l) => l.id === level)?.emoji} {LEVELS.find((l) => l.id === level)?.label}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Goal</Text>
                <Text style={styles.summaryVal}>{GOALS.find((g) => g.id === goal)?.emoji} {GOALS.find((g) => g.id === goal)?.label}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Schedule</Text>
                <Text style={styles.summaryVal}>{frequency}x/week · {duration} min</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Equipment</Text>
                <Text style={styles.summaryVal}>{EQUIPMENT_OPTIONS.find((e) => e.id === equipment)?.emoji} {EQUIPMENT_OPTIONS.find((e) => e.id === equipment)?.label}</Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 6: Your Choice */}
        {step === 6 && (
          <View>
            <Text style={styles.subtitle}>We have created a routine based on your profile.</Text>
            <Text style={styles.desc}>What would you like to do?</Text>

            <Pressable onPress={() => setShowModal(true)}
              style={[styles.choiceCard, { borderColor: '#FF8C3D30' }]}>
              <View style={styles.choiceIcon}><Text style={styles.choiceEmoji}>📅</Text></View>
              <View style={styles.choiceContent}>
                <Text style={styles.choiceTitle}>Schedule with your Coach</Text>
                <Text style={styles.choiceDesc}>Book a video call to review and personalize your routine together</Text>
              </View>
              <Text style={styles.choiceArrow}>→</Text>
            </Pressable>

            <Pressable onPress={() => onComplete({ sports, modality, experienceLevel: level, goal, sessionsPerWeek: frequency, sessionDuration: duration, equipment, athleteRoutineAccepted: true } as OnboardingData)}
              style={styles.choiceCard}>
              <View style={styles.choiceIcon}><Text style={styles.choiceEmoji}>✅</Text></View>
              <View style={styles.choiceContent}>
                <Text style={styles.choiceTitle}>Accept System Routine</Text>
                <Text style={styles.choiceDesc}>Start training immediately with the AI-generated plan</Text>
              </View>
              <Text style={styles.choiceArrow}>→</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable onPress={goNext} style={[styles.nextBtn, !canNext() && styles.nextDisabled]} disabled={!canNext()}>
          <Text style={styles.nextText}>{step === STEP_COUNT - 1 ? 'Create My Plan' : 'Continue'}</Text>
        </Pressable>
        {step > 0 && (
          <Pressable onPress={goBack} style={styles.backLink}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        )}
      </View>

      <CoachScheduleModal
        visible={showModal}
        coachId=""
        athleteId=""
        athleteName=""
        onboardingData={{ sports, modality, goal, experienceLevel: level, sessionsPerWeek: frequency, sessionDuration: duration, equipment }}
        onScheduled={() => { setShowModal(false); onComplete({ sports, modality, experienceLevel: level, goal, sessionsPerWeek: frequency, sessionDuration: duration, equipment }); }}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { paddingHorizontal: 24, paddingTop: 8 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#1C1C1E', overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#FF8C3D' },
  stepLabel: { fontSize: 12, color: '#98989D', fontWeight: '600', textAlign: 'right' },
  scroll: { padding: 24, flexGrow: 1 },
  title: { fontSize: 30, fontWeight: '800', color: '#F5F5F7', marginBottom: 24 },
  subtitle: { fontSize: 17, fontWeight: '700', color: '#F5F5F7', marginBottom: 16 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sportCard: {
    width: (screenW - 68) / 2, padding: 18, borderRadius: 18,
    backgroundColor: '#1C1C1E', borderWidth: 1.5, borderColor: '#1C1C1E',
    alignItems: 'center', position: 'relative',
  },
  sportCardActive: { borderColor: '#FF8C3D', backgroundColor: '#FF8C3D10' },
  sportEmoji: { fontSize: 32, marginBottom: 8 },
  sportLabel: { fontSize: 15, fontWeight: '700', color: '#98989D' },
  sportLabelActive: { color: '#FF8C3D' },
  sportDesc: { fontSize: 11, color: '#6E6E73', marginTop: 2, textAlign: 'center' },
  activeDot: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF8C3D', justifyContent: 'center', alignItems: 'center' },
  activeDotText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18,
    borderRadius: 16, borderWidth: 1.5, borderColor: '#1C1C1E',
    backgroundColor: '#1C1C1E', marginBottom: 10,
  },
  optionRowActive: { borderColor: '#FF8C3D', backgroundColor: '#FF8C3D08' },
  optionEmoji: { fontSize: 28 },
  optionContent: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: '#F5F5F7' },
  optionLabelActive: { color: '#FF8C3D' },
  optionDesc: { fontSize: 13, color: '#6E6E73', marginTop: 2 },
  check: { fontSize: 20, color: '#FF8C3D', fontWeight: '700' },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20,
    borderRadius: 18, borderWidth: 1.5, borderColor: '#1C1C1E',
    backgroundColor: '#1C1C1E', marginBottom: 12,
  },
  goalCardActive: { borderColor: '#FF8C3D', backgroundColor: '#FF8C3D08' },
  goalIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FF8C3D10', justifyContent: 'center', alignItems: 'center' },
  goalIconActive: { backgroundColor: '#FF8C3D20' },
  goalEmoji: { fontSize: 26 },
  goalContent: { flex: 1 },
  goalLabel: { fontSize: 17, fontWeight: '700', color: '#F5F5F7' },
  goalLabelActive: { color: '#FF8C3D' },
  goalDesc: { fontSize: 13, color: '#6E6E73', marginTop: 2 },
  goalCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FF8C3D', justifyContent: 'center', alignItems: 'center' },
  checkText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 10 },
  freqChip: {
    width: 52, height: 72, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1C1C1E', borderWidth: 1.5, borderColor: '#1C1C1E',
  },
  freqChipActive: { borderColor: '#FF8C3D', backgroundColor: '#FF8C3D10' },
  freqText: { fontSize: 20, fontWeight: '800', color: '#98989D' },
  freqTextActive: { color: '#FF8C3D' },
  freqSub: { fontSize: 10, color: '#6E6E73', marginTop: 2 },
  freqSubActive: { color: '#FF8C3D' },
  freqBar: { flexDirection: 'row', gap: 7, marginTop: 16, paddingHorizontal: 2 },
  freqBarDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#1C1C1E' },
  freqBarDotActive: { backgroundColor: '#FF8C3D' },
  durChip: {
    flex: 1, height: 72, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1C1C1E', borderWidth: 1.5, borderColor: '#1C1C1E',
  },
  durChipActive: { borderColor: '#FF8C3D', backgroundColor: '#FF8C3D10' },
  durText: { fontSize: 20, fontWeight: '800', color: '#98989D' },
  durTextActive: { color: '#FF8C3D' },
  durSub: { fontSize: 10, color: '#6E6E73', marginTop: 2 },
  durSubActive: { color: '#FF8C3D' },
  summaryHero: { alignItems: 'center', marginBottom: 28 },
  summaryEmoji: { fontSize: 48, marginBottom: 12 },
  summaryTitle: { fontSize: 24, fontWeight: '800', color: '#F5F5F7' },
  summaryCard: { backgroundColor: '#1C1C1E', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#38383A' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12 },
  summaryDivider: { height: 1, backgroundColor: '#38383A' },
  summaryKey: { fontSize: 15, color: '#98989D', fontWeight: '600', width: 90 },
  summaryVal: { fontSize: 15, color: '#F5F5F7', fontWeight: '600', flex: 1, textAlign: 'right' },
  summaryChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FF8C3D10' },
  miniChipText: { fontSize: 12, color: '#FF8C3D', fontWeight: '600' },
  bottom: { padding: 24, paddingBottom: 40, alignItems: 'center', backgroundColor: '#000' },
  nextBtn: { width: '100%', height: 56, borderRadius: 18, backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center' },
  nextDisabled: { opacity: 0.35 },
  nextText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  backLink: { paddingVertical: 8, marginTop: 4 },
  backText: { fontSize: 15, color: '#98989D', fontWeight: '600' },
  desc: { fontSize: 15, color: #98989D, marginBottom: 24, lineHeight: 22 },
  choiceCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 18, borderWidth: 1.5, borderColor: "#1C1C1E", backgroundColor: "#1C1C1E", marginBottom: 12 },
  choiceIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FF8C3D10", justifyContent: "center", alignItems: "center" },
  choiceEmoji: { fontSize: 24 },
  choiceContent: { flex: 1 },
  choiceTitle: { fontSize: 16, fontWeight: "700", color: "#F5F5F7", marginBottom: 2 },
  choiceDesc: { fontSize: 13, color: "#6E6E73", lineHeight: 18 },
  choiceArrow: { fontSize: 20, color: "#FF8C3D", fontWeight: "600" },
});
