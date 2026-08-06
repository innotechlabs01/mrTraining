import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { apiClient } from '../../../../infrastructure/api/client';

type Props = {
  visible: boolean;
  coachId: string;
  athleteId: string;
  athleteName: string;
  onboardingData: Record<string, unknown>;
  onScheduled: () => void;
  onClose: () => void;
};

type Slot = { date: string; startTime: string; endTime: string };

type Availability = { dayOfWeek: number; startTime: string; endTime: string };

export function CoachScheduleModal({ visible, coachId, athleteId, athleteName, onboardingData, onScheduled, onClose }: Props) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setFetching(true);
    apiClient.get('/coach-availability')
      .then(({ data }) => {
        const avail = data as Availability[];
        setAvailability(avail || []);
        if (!avail?.length) {
          Alert.alert('No Disponible', 'Tu coach aun no ha configurado sus horarios. Intenta aceptar la rutina del sistema por ahora.', [{ text: 'Entendido', onPress: onClose }]);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'No se pudo cargar la disponibilidad.');
      })
      .finally(() => setFetching(false));
  }, [visible]);

  // Generate next 14 days
  const today = new Date();
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1);
    return { date: d.toISOString().split('T')[0], dayOfWeek: d.getDay() };
  });

  // Filter days that the coach has availability for
  const availableDays = next14Days.filter((d) =>
    availability.some((a) => a.dayOfWeek === d.dayOfWeek),
  );

  // Generate time slots for selected date
  const filteredSlots: Slot[] = (() => {
    if (!selectedDate) return [];
    const dayOfWeek = new Date(`${selectedDate}T00:00:00`).getDay();
    const daySlots = availability.filter((a) => a.dayOfWeek === dayOfWeek);
    return daySlots.map((s) => ({
      date: selectedDate,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
  })();

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    try {
      await apiClient.post('/appointments', {
        athleteId,
        athleteName,
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        ...onboardingData,
      });
      onScheduled();
    } catch {
      Alert.alert('Error', 'No se pudo agendar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (fetching) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Agenda tu cita</Text>
          <Pressable onPress={onClose}><Text style={styles.closeBtn}>✕</Text></Pressable>
        </View>

        <Text style={styles.subtitle}>Selecciona un dia</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
          {availableDays.length === 0 ? (
            <Text style={styles.noData}>No hay dias disponibles. Tu coach debe configurar sus horarios.</Text>
          ) : (
            availableDays.map((d) => (
              <Pressable
                key={d.date}
                onPress={() => { setSelectedDate(d.date); setSelectedSlot(null); }}
                style={[styles.dateChip, selectedDate === d.date && styles.dateChipActive]}
              >
                <Text style={[styles.dateText, selectedDate === d.date && styles.dateTextActive]}>
                  {formatDate(d.date)}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        {selectedDate && filteredSlots.length > 0 && (
          <>
            <Text style={styles.subtitle}>Horarios disponibles</Text>
            <ScrollView style={styles.slotList}>
              {filteredSlots.map((s, i) => (
                <Pressable
                  key={`${s.date}-${s.startTime}-${i}`}
                  onPress={() => setSelectedSlot(s)}
                  style={[styles.slotRow, selectedSlot === s && styles.slotRowActive]}
                >
                  <View style={styles.slotInfo}>
                    <Text style={[styles.slotTime, selectedSlot === s && styles.slotTimeActive]}>
                      {s.startTime} — {s.endTime}
                    </Text>
                    <Text style={styles.slotDuration}>30 min video call</Text>
                  </View>
                  {selectedSlot === s && <Text style={styles.check}>✓</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {selectedDate && filteredSlots.length === 0 && (
          <View style={styles.emptyDay}>
            <Text style={styles.noData}>Sin horarios para este dia</Text>
          </View>
        )}

        <View style={styles.bottom}>
          <Pressable
            onPress={handleConfirm}
            disabled={!selectedSlot || loading}
            style={[styles.confirmBtn, (!selectedSlot || loading) && styles.confirmDisabled]}
          >
            <Text style={styles.confirmText}>
              {loading ? 'Agendando...' : 'Confirmar Cita'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#98989D', marginTop: 12, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#F5F5F7' },
  closeBtn: { fontSize: 22, color: '#98989D', padding: 4 },
  subtitle: { fontSize: 15, fontWeight: '700', color: '#F5F5F7', marginBottom: 12, marginTop: 16 },
  dateRow: { marginBottom: 8 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#1C1C1E', marginRight: 10, borderWidth: 1.5, borderColor: '#1C1C1E' },
  dateChipActive: { borderColor: '#FF8C3D', backgroundColor: '#FF8C3D10' },
  dateText: { fontSize: 13, color: '#98989D', fontWeight: '600' },
  dateTextActive: { color: '#FF8C3D' },
  noData: { color: '#98989D', fontSize: 14, paddingVertical: 20 },
  slotList: { flex: 1 },
  slotRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 14, backgroundColor: '#1C1C1E', marginBottom: 8, borderWidth: 1.5, borderColor: '#1C1C1E' },
  slotRowActive: { borderColor: '#FF8C3D', backgroundColor: '#FF8C3D08' },
  slotInfo: { flex: 1 },
  slotTime: { fontSize: 16, fontWeight: '600', color: '#F5F5F7' },
  slotTimeActive: { color: '#FF8C3D' },
  slotDuration: { fontSize: 12, color: '#6E6E73', marginTop: 2 },
  check: { fontSize: 18, color: '#FF8C3D', fontWeight: '700' },
  emptyDay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottom: { paddingTop: 16 },
  confirmBtn: { height: 52, borderRadius: 16, backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center' },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
