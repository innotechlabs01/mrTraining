import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { getAvailability, createAppointment } from '../../schedulingService';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import { CalendarIcon, CloseIcon } from '../../../../shared/components/icons';

type Props = {
  visible: boolean;
  coachId: string;
  athleteId: string;
  athleteName: string;
  onScheduled: () => void;
  onClose: () => void;
};

type AvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

  // Generate next 14 days
  const getUpcomingDays = () => {
    const days = [];
    const now = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay(),
        label: date.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }
    return days;
  };

export function CoachScheduleModal({ visible, coachId, athleteId, athleteName, onScheduled, onClose }: Props) {
  const { isSignedIn } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (visible && coachId) {
      fetchAvailability();
    }
  }, [visible, coachId]);

  const fetchAvailability = async () => {
    setFetching(true);
    try {
      const slots = await getAvailability();
      setAvailability(slots);
    } catch {
      // Coach might not have set availability yet
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
      days.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay(),
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }
    return days;
  };

  const upcomingDays = getUpcomingDays();
  const slotsForDay = selectedDate
    ? availability.filter(s => s.dayOfWeek === new Date(selectedDate).getDay())
    : [];

  const handleSchedule = async () => {
    if (!selectedSlot || !selectedDate) {
      Alert.alert('Error', 'Elige un día y un horario.');
      return;
    }

    setLoading(true);
    try {
      await createAppointment({
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: `Consulta de onboarding para ${athleteName}`,
      });
      Alert.alert('Reservado', 'Tu consulta fue agendada. Revisa tu correo para más detalles.', [
        { text: 'OK', onPress: onScheduled },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo agendar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Agendar consulta</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
            <CloseIcon size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>
            Reserva una llamada con tu entrenador para revisar tu plan y comenzar.
          </Text>

          {fetching ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
            </View>
          ) : availability.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <CalendarIcon size={32} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>Sin disponibilidad</Text>
              <Text style={styles.emptyText}>Tu entrenador aún no configuró su agenda. Puedes comenzar a entrenar ahora y agendar más adelante.</Text>
              <Pressable style={styles.laterBtn} onPress={onScheduled} accessibilityRole="button">
                <Text style={styles.laterBtnText}>Comenzar a entrenar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Elige un día</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                {upcomingDays.map((day) => {
                  const hasSlots = availability.some(s => s.dayOfWeek === day.dayOfWeek);
                  const isSelected = selectedDate === day.date;
                  return (
                    <Pressable
                      key={day.date}
                      style={[styles.dayChip, isSelected && styles.dayChipActive, !hasSlots && styles.dayChipDisabled]}
                      onPress={() => hasSlots && setSelectedDate(day.date)}
                      disabled={!hasSlots}
                    >
                      <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{day.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedDate && (
                <>
                  <Text style={styles.sectionTitle}>Elige un horario</Text>
                  {slotsForDay.length === 0 ? (
                    <Text style={styles.noSlots}>Sin horarios disponibles para este día</Text>
                  ) : (
                    <View style={styles.slotsGrid}>
                      {slotsForDay.map((slot) => (
                        <Pressable
                          key={slot.id}
                          style={[styles.slotChip, selectedSlot?.id === slot.id && styles.slotChipActive]}
                          onPress={() => setSelectedSlot(slot)}
                        >
                          <Text style={[styles.slotTime, selectedSlot?.id === slot.id && styles.slotTimeActive]}>
                            {slot.startTime}
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
                    {loading ? 'Reservando...' : 'Reservar consulta'}
                  </Text>
                </Pressable>
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
  title: { ...typography.title, fontSize: 22, color: colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg },
  sectionTitle: { ...typography.bodyStrong, fontSize: 16, color: colors.text, marginBottom: spacing.sm },
  daysScroll: { marginBottom: spacing.lg },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  dayChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  dayChipDisabled: { opacity: 0.4 },
  dayLabel: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
  dayLabelActive: { color: colors.primary },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  slotChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  slotChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  slotTime: { ...typography.bodyStrong, fontSize: 15, color: colors.text },
  slotTimeActive: { color: colors.primary },
  noSlots: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  scheduleBtn: { backgroundColor: colors.primary, height: 52, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  scheduleBtnDisabled: { opacity: 0.5 },
  scheduleBtnText: { ...typography.bodyStrong, fontSize: 16, color: colors.base },
  loadingCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  loadingText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { ...typography.title, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
  laterBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  laterBtnText: { ...typography.bodyStrong, fontSize: 15, color: colors.base },
});
