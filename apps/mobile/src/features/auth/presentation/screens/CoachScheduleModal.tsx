import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { getAvailability, createAppointment, type AvailabilitySlot, type AppointmentInfo } from '../../schedulingService';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import { CalendarIcon, CloseIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.coachSchedule;

type Props = {
  visible: boolean;
  coachId: string;
  athleteId: string;
  athleteName: string;
  onScheduled: () => void;
  onClose: () => void;
};

function resolveWebBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_WEB_URL;
  const extraUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  return (envUrl || extraUrl || 'http://localhost:3000').replace(/\/$/, '');
}

export function CoachScheduleModal({ visible, coachId, athleteName, onScheduled, onClose }: Props) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [resolvedCoachId, setResolvedCoachId] = useState<string>(coachId || '');
  const [resolvedCoachName, setResolvedCoachName] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<AppointmentInfo | null>(null);

  useEffect(() => {
    if (visible) {
      setBookedAppointment(null);
      setSelectedSlot(null);
      setSelectedDate('');
      fetchAvailability();
    }
  }, [visible, coachId]);

  const fetchAvailability = async () => {
    setFetching(true);
    try {
      const res = await getAvailability(coachId || undefined);
      setAvailability(res.slots);
      if (res.coachId) setResolvedCoachId(res.coachId);
      if (res.coachName) setResolvedCoachName(res.coachName);
    } catch {
      setAvailability([]);
    } finally {
      setFetching(false);
    }
  };

  // Generate next 14 days
  const getUpcomingDays = () => {
    const days = [];
    const now = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      days.push({
        date: `${yyyy}-${mm}-${dd}`,
        dayOfWeek: date.getDay(),
        label: date.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }
    return days;
  };

  const upcomingDays = getUpcomingDays();
  const slotsForDay = selectedDate
    ? availability.filter(s => s.dayOfWeek === new Date(`${selectedDate}T12:00:00`).getDay())
    : [];

  const handleSchedule = async () => {
    if (!selectedSlot || !selectedDate) {
      Alert.alert(t.errorTitle, t.pickDayTimeError);
      return;
    }

    setLoading(true);
    try {
      const created = await createAppointment({
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: `${t.notesPrefix}${athleteName}`,
        title: 'Meet de Onboarding & Explicación de Rutina',
        coachId: resolvedCoachId || coachId || undefined,
      });
      setBookedAppointment(created);
    } catch {
      Alert.alert(t.errorTitle, t.scheduleFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeet = async () => {
    const roomId = bookedAppointment?.meet_room_id;
    if (!roomId) return;
    const meetUrl = `${resolveWebBaseUrl()}/meet/${encodeURIComponent(roomId)}?role=athlete`;
    try {
      await WebBrowser.openBrowserAsync(meetUrl);
    } catch {
      await Linking.openURL(meetUrl);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.modalTitle}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel={texts.common.close} hitSlop={8}>
            <CloseIcon size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {bookedAppointment ? (
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconWrap}>
                <View style={styles.confirmBadge}>
                  <Text style={styles.confirmBadgeText}>✓</Text>
                </View>
              </View>
              <Text style={styles.confirmTitle}>¡Meet P2P Confirmado!</Text>
              <Text style={styles.confirmSubtitle}>
                Tu coach {resolvedCoachName ? `(${resolvedCoachName}) ` : ''}recibió la notificación y ya tienes tu sala interna asignada para explicar tu rutina.
              </Text>
              <View style={styles.confirmDetails}>
                <Text style={styles.confirmDetailRow}>
                  📅 Fecha: {bookedAppointment.start_time.slice(0, 10)}
                </Text>
                <Text style={styles.confirmDetailRow}>
                  ⏰ Horario: {bookedAppointment.start_time.slice(11, 16)} — {bookedAppointment.end_time.slice(11, 16)}
                </Text>
                {bookedAppointment.meet_room_id ? (
                  <Text style={styles.confirmDetailRow}>
                    🎥 Sala P2P: {bookedAppointment.meet_room_id}
                  </Text>
                ) : null}
              </View>
              {bookedAppointment.meet_room_id ? (
                <Pressable style={styles.scheduleBtn} onPress={handleJoinMeet}>
                  <Text style={styles.scheduleBtnText}>Abrir Sala Meet P2P</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.secondaryBtn} onPress={onScheduled}>
                <Text style={styles.secondaryBtnText}>Continuar a mi entrenamiento</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>
                {resolvedCoachName ? `${resolvedCoachName} · ` : ''}
                {t.subtitle}
              </Text>

              {fetching ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>{t.loadingText}</Text>
                </View>
              ) : availability.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconWrap}>
                    <CalendarIcon size={32} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
                  <Text style={styles.emptyText}>{t.emptyText}</Text>
                  <Pressable style={styles.laterBtn} onPress={onScheduled} accessibilityRole="button">
                    <Text style={styles.laterBtnText}>{t.startTraining}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>{t.pickDay}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                    {upcomingDays.map((day) => {
                      const hasSlots = availability.some(s => s.dayOfWeek === day.dayOfWeek);
                      const isSelected = selectedDate === day.date;
                      return (
                        <Pressable
                          key={day.date}
                          style={[styles.dayChip, isSelected && styles.dayChipActive, !hasSlots && styles.dayChipDisabled]}
                          onPress={() => {
                            if (hasSlots) {
                              setSelectedDate(day.date);
                              setSelectedSlot(null);
                            }
                          }}
                          disabled={!hasSlots}
                        >
                          <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{day.label}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {selectedDate && (
                    <>
                      <Text style={styles.sectionTitle}>{t.pickTime}</Text>
                      {slotsForDay.length === 0 ? (
                        <Text style={styles.noSlots}>{t.noSlots}</Text>
                      ) : (
                        <View style={styles.slotsGrid}>
                          {slotsForDay.map((slot) => (
                            <Pressable
                              key={slot.id}
                              style={[styles.slotChip, selectedSlot?.id === slot.id && styles.slotChipActive]}
                              onPress={() => setSelectedSlot(slot)}
                            >
                              <Text style={[styles.slotTime, selectedSlot?.id === slot.id && styles.slotTimeActive]}>
                                {slot.startTime} — {slot.endTime}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {selectedSlot && selectedDate && (
                    <Pressable
                      style={[styles.scheduleBtn, loading && styles.scheduleBtnDisabled]}
                      onPress={handleSchedule}
                      disabled={loading}
                    >
                      <Text style={styles.scheduleBtnText}>
                        {loading ? t.bookingLoading : t.bookButton}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: 0 },
  title: { ...typography.title, color: colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg },
  sectionTitle: { ...typography.bodyStrong, fontSize: typography.body.fontSize, color: colors.text, marginBottom: spacing.sm },
  daysScroll: { marginBottom: spacing.lg },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  dayChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  dayChipDisabled: { opacity: 0.4 },
  dayLabel: { ...typography.bodyStrong, color: colors.text },
  dayLabelActive: { color: colors.primary },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  slotChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  slotChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  slotTime: { ...typography.bodyStrong, color: colors.text },
  slotTimeActive: { color: colors.primary },
  noSlots: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  scheduleBtn: { backgroundColor: colors.primary, height: 52, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm, width: '100%' },
  scheduleBtnDisabled: { opacity: 0.5 },
  scheduleBtnText: { ...typography.bodyStrong, fontSize: typography.body.fontSize, color: colors.base },
  secondaryBtn: { marginTop: spacing.sm, height: 48, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, width: '100%' },
  secondaryBtnText: { ...typography.bodyStrong, color: colors.text },
  confirmCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  confirmIconWrap: { marginBottom: spacing.sm },
  confirmBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: `${colors.success}22`, borderWidth: 2, borderColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  confirmBadgeText: { fontSize: 24, fontWeight: '700', color: colors.success },
  confirmTitle: { ...typography.h3, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  confirmSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
  confirmDetails: { width: '100%', backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.md },
  confirmDetailRow: { ...typography.body, color: colors.text },
  loadingCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  loadingText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
  laterBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  laterBtnText: { ...typography.bodyStrong, color: colors.base },
});
