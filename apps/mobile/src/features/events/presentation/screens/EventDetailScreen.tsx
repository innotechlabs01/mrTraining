import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { EventInfoCard } from '../components/EventInfoCard';
import { EventListItemsCard } from '../components/EventListItemsCard';
import { EventRegistrationForm } from '../components/EventRegistrationForm';
import { EventResponseCta } from '../components/EventResponseCta';
import { EventRunningInfoCard } from '../components/EventRunningInfoCard';
import {
  isMultiKind,
  type AnswerPayload,
  type EventDetailData,
  type FormField,
  type Registration,
} from '../components/eventDetailTypes';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.eventDetail;

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

function validateRequired(
  formFields: FormField[],
  answers: Record<string, string | string[]>,
): boolean {
  for (const field of formFields) {
    if (!field.required) continue;
    const val = answers[field.id];
    const empty = Array.isArray(val) ? val.length === 0 : !val || String(val).trim() === '';
    if (empty) {
      Alert.alert(t.requiredField, t.requiredBody.replace('{field}', field.label));
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
      Alert.alert(t.savedTitle, t.savedBody);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t.saveFailed;
      Alert.alert(t.errorTitle, msg);
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

  const ev = data?.event;
  const status = data?.registration?.status;
  const hasLoaded = !isLoading && !isError && !!data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={ev?.title ?? t.headerTitle} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <EmptyState variant="loading" message={t.loading} />
        ) : isError || !data ? (
          <EmptyState variant="error" message={t.loadError} onRetry={refetch} />
        ) : (
          <View style={styles.body}>
            <EventInfoCard event={ev} />

            {!!data.listItems.length && (
              <EventListItemsCard items={data.listItems} />
            )}

            {data.running && (
              <EventRunningInfoCard running={data.running} />
            )}

            {!!data.formFields.length && (
              <EventRegistrationForm
                fields={data.formFields}
                answers={answers}
                onSetSingle={setSingle}
                onToggleMulti={toggleMulti}
                onSetText={setText}
              />
            )}

            {hasLoaded && (
              <EventResponseCta
                status={status}
                pending={respondMutation.isPending}
                onAccept={handleAccept}
                onCancel={handleCancel}
              />
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
});
