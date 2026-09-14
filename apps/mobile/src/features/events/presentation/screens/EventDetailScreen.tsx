import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { Input } from '../../../../shared/components/ui/Input';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type EventItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  type?: string;
  modality?: string;
  location?: string;
  description?: string;
  status?: string;
};

type FormField = {
  id: string;
  label: string;
  kind: string;
  options?: unknown;
  required: boolean;
};

type RunningInfo = {
  distanceKm?: string | number;
  pace?: string;
  meetingPoint?: string;
};

type Registration = {
  id: string;
  eventId: string;
  athleteId: string;
  status: 'accepted' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
};

type FormResponse = {
  id: string;
  fieldId: string;
  value: string;
};

type EventDetailData = {
  event: EventItem;
  listItems: string[];
  formFields: FormField[];
  running: RunningInfo | null;
  registration: Registration | null;
  responses: FormResponse[];
};

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

type AnswerPayload = { fieldId: string; value: string };

const SINGLE_KINDS = new Set(['select', 'option']);
const MULTI_KINDS = new Set(['checkbox', 'multi']);

function isSingleKind(kind: string): boolean {
  return SINGLE_KINDS.has(kind);
}

function isMultiKind(kind: string): boolean {
  return MULTI_KINDS.has(kind);
}

function optionsOf(field: FormField): string[] {
  return Array.isArray(field.options)
    ? field.options.filter((o): o is string => typeof o === 'string')
    : [];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function validateRequired(
  formFields: FormField[],
  answers: Record<string, string | string[]>,
): boolean {
  for (const field of formFields) {
    if (!field.required) continue;
    const val = answers[field.id];
    const empty = Array.isArray(val) ? val.length === 0 : !val || String(val).trim() === '';
    if (empty) {
      Alert.alert('Campo requerido', `Por favor completá "${field.label}".`);
      return false;
    }
  }
  return true;
}

function buildAnswers(
  formFields: FormField[],
  answers: Record<string, string | string[]>,
): AnswerPayload[] {
  const out: AnswerPayload[] = [];
  for (const field of formFields) {
    const val = answers[field.id];
    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      // Use a non-colliding delimiter for multi-select values so an option
      // containing a comma (e.g. "Ironman, Beginner") round-trips intact.
      out.push({ fieldId: field.id, value: val.join('\u0001') });
    } else if (typeof val === 'string' && val.trim() !== '') {
      out.push({ fieldId: field.id, value: val });
    }
  }
  return out;
}

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function EventDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<EventDetailData>({
    queryKey: ['event-detail', eventId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/athlete/events/${eventId}`);
      return data as EventDetailData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const initialised = useRef(false);

  useEffect(() => {
    if (!data || initialised.current) return;
    const initial: Record<string, string | string[]> = {};
    for (const field of data.formFields ?? []) {
      const resp = (data.responses ?? []).find((r) => r.fieldId === field.id);
      if (!resp) continue;
      initial[field.id] = isMultiKind(field.kind)
        ? resp.value.split('\u0001').map((s) => s.trim()).filter(Boolean)
        : resp.value;
    }
    setAnswers(initial);
    initialised.current = true;
  }, [data]);

  const respondMutation = useMutation({
    mutationFn: async (payload: {
      status: 'accepted' | 'cancelled';
      answers?: AnswerPayload[];
    }) => {
      const { data } = await apiClient.post(`/athlete/events/${eventId}/respond`, payload);
      return data.registration as Registration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
      Alert.alert('Listo', 'Tu respuesta fue guardada.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar tu respuesta.';
      Alert.alert('Error', msg);
    },
  });

  const setSingle = (fieldId: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));

  const toggleMulti = (fieldId: string, value: string) => {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [fieldId]: next };
    });
  };

  const setText = (fieldId: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));

  const handleAccept = () => {
    if (!data) return;
    if (!validateRequired(data.formFields, answers)) return;
    respondMutation.mutate({
      status: 'accepted',
      answers: buildAnswers(data.formFields, answers),
    });
  };

  const handleCancel = () => {
    respondMutation.mutate({ status: 'cancelled' });
  };

  const renderField = (field: FormField) => {
    const value = answers[field.id];
    if (isSingleKind(field.kind)) {
      return (
        <View style={styles.chipRow}>
          {optionsOf(field).map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={value === opt}
              onPress={() => setSingle(field.id, opt)}
            />
          ))}
        </View>
      );
    }
    if (isMultiKind(field.kind)) {
      const selected = Array.isArray(value) ? value : [];
      return (
        <View style={styles.chipRow}>
          {optionsOf(field).map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={selected.includes(opt)}
              onPress={() => toggleMulti(field.id, opt)}
            />
          ))}
        </View>
      );
    }
    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        onChangeText={(t) => setText(field.id, t)}
        placeholder={field.kind === 'number' ? 'Número' : 'Ingresa tu respuesta'}
        keyboardType={field.kind === 'number' ? 'numeric' : 'default'}
        accessibilityLabel={field.label}
      />
    );
  };

  const ev = data?.event;
  const status = data?.registration?.status;
  const hasLoaded = !isLoading && !isError && !!data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={ev?.title ?? 'Evento'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <EmptyState variant="loading" message="Cargando evento..." />
        ) : isError || !data ? (
          <EmptyState variant="error" message="No se pudo cargar el evento" onRetry={refetch} />
        ) : (
          <View style={styles.body}>
            <Card style={styles.card}>
              <View style={styles.metaRow}>
                {ev?.type ? <Badge text={ev.type} tone="primary" /> : null}
              </View>
              <Text style={styles.cardTitle}>{ev?.title}</Text>
              <Text style={styles.meta}>
                {formatDate(ev?.date)}
                {ev?.time ? ` · ${ev.time}` : ''}
                {ev?.endTime ? ` - ${ev.endTime}` : ''}
              </Text>
              {ev?.modality ? <Text style={styles.meta}>Modalidad: {ev.modality}</Text> : null}
              {ev?.location ? <Text style={styles.meta}>{ev.location}</Text> : null}
              {ev?.description ? <Text style={styles.description}>{ev.description}</Text> : null}
            </Card>

            {!!data.listItems.length && (
              <Card style={styles.card}>
                <Text style={styles.cardSectionTitle}>Contenido</Text>
                {data.listItems.map((item, idx) => (
                  <View key={`${item}-${idx}`} style={styles.bulletRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </Card>
            )}

            {data.running && (
              <Card style={styles.card}>
                <Text style={styles.cardSectionTitle}>Números</Text>
                {data.running.distanceKm != null ? (
                  <Text style={styles.meta}>Distancia: {data.running.distanceKm} km</Text>
                ) : null}
                {data.running.pace ? <Text style={styles.meta}>Ritmo: {data.running.pace}</Text> : null}
                {data.running.meetingPoint ? (
                  <Text style={styles.meta}>Encuentro: {data.running.meetingPoint}</Text>
                ) : null}
              </Card>
            )}

            {!!data.formFields.length && (
              <Card style={styles.card}>
                <Text style={styles.cardSectionTitle}>Inscripción</Text>
                {data.formFields.map((field) => (
                  <View key={field.id} style={styles.field}>
                    <Text style={styles.fieldLabel}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </Text>
                    {renderField(field)}
                  </View>
                ))}
              </Card>
            )}

            {hasLoaded && (
              <View style={styles.cta}>
                {status === 'accepted' ? (
                  <View style={styles.ctaStack}>
                    <Badge text="Confirmado" tone="success" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar asistencia"
                      disabled={respondMutation.isPending}
                      onPress={handleCancel}
                      style={({ pressed }) => [
                        styles.secondaryBtn,
                        pressed && styles.secondaryBtnPressed,
                        respondMutation.isPending && styles.secondaryBtnDisabled,
                      ]}
                    >
                      <Text style={styles.secondaryBtnText}>Cancelar asistencia</Text>
                    </Pressable>
                  </View>
                ) : (
                  <PrimaryButton
                    label={status === 'cancelled' ? 'Aceptar de nuevo' : 'Aceptar evento'}
                    onPress={handleAccept}
                    disabled={respondMutation.isPending}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.lg, paddingBottom: 140 },
  body: { gap: spacing.sm },
  card: { gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.title, color: colors.text },
  meta: { ...typography.body, color: colors.textSecondary },
  description: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  cardSectionTitle: { ...typography.label, color: colors.primary },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  bulletText: { ...typography.body, color: colors.text, flex: 1 },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
  chipLabelSelected: { color: colors.base },
  cta: { marginTop: spacing.md },
  ctaStack: { gap: spacing.sm },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: spacing.lg * 2,
    paddingHorizontal: spacing.lg,
  },
  secondaryBtnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  secondaryBtnDisabled: { opacity: 0.5 },
  secondaryBtnText: { ...typography.bodyStrong, color: colors.text },
});
