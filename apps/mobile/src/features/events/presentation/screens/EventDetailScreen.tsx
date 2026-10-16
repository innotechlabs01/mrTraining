
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, layout, spacing } from '../../../../shared/theme/tokens';
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

type ResponseStatus = 'accepted' | 'cancelled';
type AnswerValue = string | string[];
type AnswersMap = Record<string, AnswerValue>;

type RawObject = Record<string, unknown>;

const MULTI_VALUE_SEPARATOR = '\u0001';

const eventDetailKey = (eventId: string | number) =>
  ['event-detail', eventId] as const;

const eventResponseKey = ['events'] as const;

function isObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getApiMessage(error: unknown, fallback: string): string {
  if (isObject(error)) {
    const response = error.response;

    if (isObject(response) && isObject(response.data)) {
      const body = response.data;

      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }

      if (typeof body.error === 'string' && body.error.trim()) {
        return body.error;
      }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function normalizeResponseItem(value: unknown): {
  fieldId: string;
  value: string;
} | null {
  if (!isObject(value)) return null;

  const fieldId = value.fieldId ?? value.field_id;
  const answer = value.value;

  if (typeof fieldId !== 'string' || typeof answer !== 'string') {
    return null;
  }

  return { fieldId, value: answer };
}

/**
 * Supports both direct JSON responses and common Go API envelopes:
 * { event, ... }, { data: { event, ... } }, or { data: { data: ... } }.
 */
function unwrapDetailResponse(value: unknown): RawObject {
  if (!isObject(value)) {
    throw new Error('El servidor devolvió una respuesta inválida.');
  }

  let current = value;

  for (let i = 0; i < 2; i += 1) {
    if (isObject(current.data)) {
      current = current.data;
      continue;
    }

    break;
  }

  return current;
}

function normalizeEventDetail(value: unknown): EventDetailData {
  const raw = unwrapDetailResponse(value);

  const rawEvent = raw.event;
  if (!isObject(rawEvent)) {
    throw new Error('No se encontró la información del evento.');
  }

  const rawFields = raw.form_fields ?? raw.formFields ?? [];
  const rawItems = raw.list_items ?? raw.listItems ?? [];
  const rawResponses = raw.responses ?? [];
  const rawRegistration = raw.registration ?? null;
  const rawRunning = raw.running ?? null;

  const formFields = Array.isArray(rawFields)
    ? (rawFields as FormField[])
    : [];

  const listItems = Array.isArray(rawItems)
    ? rawItems.filter((item): item is string => typeof item === 'string')
    : [];

  const responses = Array.isArray(rawResponses)
    ? rawResponses
        .map(normalizeResponseItem)
        .filter(
          (
            item,
          ): item is { fieldId: string; value: string } => item !== null,
        )
    : [];

  return {
    ...(raw as unknown as EventDetailData),
    event: rawEvent as unknown as EventDetailData['event'],
    listItems,
    formFields,
    responses,
    registration: isObject(rawRegistration)
      ? (rawRegistration as unknown as Registration)
      : null,
    running: isObject(rawRunning)
      ? (rawRunning as unknown as EventDetailData['running'])
      : null,
  };
}

function createInitialAnswers(data: EventDetailData): AnswersMap {
  const answers: AnswersMap = {};

  for (const field of data.formFields ?? []) {
    const response = data.responses?.find(
      (item) => item.fieldId === field.id,
    );

    if (!response) continue;

    if (isMultiKind(field.kind)) {
      answers[field.id] = response.value
        .split(MULTI_VALUE_SEPARATOR)
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      answers[field.id] = response.value;
    }
  }

  return answers;
}

function validateRequired(
  fields: FormField[],
  answers: AnswersMap,
): boolean {
  for (const field of fields) {
    if (!field.required) continue;

    const value = answers[field.id];

    const isEmpty = Array.isArray(value)
      ? value.every((item) => !item.trim())
      : typeof value !== 'string' || value.trim().length === 0;

    if (isEmpty) {
      Alert.alert(
        t.requiredField,
        t.requiredBody.replace('{field}', field.label),
      );

      return false;
    }
  }

  return true;
}

function buildAnswers(
  fields: FormField[],
  answers: AnswersMap,
): AnswerPayload[] {
  const result: AnswerPayload[] = [];

  for (const field of fields) {
    const value = answers[field.id];

    if (Array.isArray(value)) {
      const selected = value.filter((item) => item.trim().length > 0);

      if (selected.length > 0) {
        result.push({
          fieldId: field.id,
          value: selected.join(MULTI_VALUE_SEPARATOR),
        });
      }

      continue;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      result.push({
        fieldId: field.id,
        value: value.trim(),
      });
    }
  }

  return result;
}

export function EventDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<AnswersMap>({});
  const initializedEventId = useRef<string | null>(null);

  const queryKey = eventDetailKey(eventId);
  const eventIdKey = String(eventId);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<EventDetailData>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get(
        `/athlete/events/${encodeURIComponent(String(eventId))}`,
      );

      return normalizeEventDetail(response.data);
    },
    staleTime: 60 * 1000,
  });

  // Reset local form state when navigating to another event.
  useEffect(() => {
    initializedEventId.current = null;
    setAnswers({});
  }, [eventIdKey]);

  // Initialize from saved responses once per event. A background refetch
  // must not overwrite answers the athlete is currently editing.
  useEffect(() => {
    if (!data || initializedEventId.current === eventIdKey) return;

    setAnswers(createInitialAnswers(data));
    initializedEventId.current = eventIdKey;
  }, [data, eventIdKey]);

  const respondMutation = useMutation({
    mutationFn: async (payload: {
      status: ResponseStatus;
      answers?: AnswerPayload[];
    }): Promise<Registration | null> => {
      const response = await apiClient.post(
        `/athlete/events/${encodeURIComponent(String(eventId))}/respond`,
        payload,
      );

      const body = isObject(response.data) ? response.data : {};
      const registration = body.registration;

      return isObject(registration)
        ? (registration as unknown as Registration)
        : null;
    },

    onSuccess: async (registration) => {
      // Update the detail immediately when the API returns the registration.
      if (registration) {
        queryClient.setQueryData<EventDetailData>(queryKey, (current) => {
          if (!current) return current;

          return {
            ...current,
            registration,
          };
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: eventResponseKey }),
      ]);

      Alert.alert(t.savedTitle, t.savedBody);
    },

    onError: (mutationError: unknown) => {
      Alert.alert(
        t.errorTitle,
        getApiMessage(mutationError, t.saveFailed),
      );
    },
  });

  const setSingle = useCallback((fieldId: string, value: string) => {
    setAnswers((previous) => ({
      ...previous,
      [fieldId]: value,
    }));
  }, []);

  const setText = useCallback((fieldId: string, value: string) => {
    setAnswers((previous) => ({
      ...previous,
      [fieldId]: value,
    }));
  }, []);

  const toggleMulti = useCallback((fieldId: string, value: string) => {
    setAnswers((previous) => {
      const currentValue = previous[fieldId];
      const current = Array.isArray(currentValue) ? currentValue : [];

      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return {
        ...previous,
        [fieldId]: next,
      };
    });
  }, []);

  const handleAccept = useCallback(() => {
    if (!data || respondMutation.isPending) return;

    if (!validateRequired(data.formFields ?? [], answers)) return;

    respondMutation.mutate({
      status: 'accepted',
      answers: buildAnswers(data.formFields ?? [], answers),
    });
  }, [answers, data, respondMutation]);

  const handleCancel = useCallback(() => {
    if (!data || respondMutation.isPending) return;

    Alert.alert(
      'Cancelar participación',
      '¿Quieres cancelar tu participación en este evento?',
      [
        {
          text: 'Volver',
          style: 'cancel',
        },
        {
          text: 'Cancelar participación',
          style: 'destructive',
          onPress: () => {
            respondMutation.mutate({ status: 'cancelled' });
          },
        },
      ],
    );
  }, [data, respondMutation]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const event = data?.event;
  const registrationStatus = data?.registration?.status;

  const showLoading = isLoading && !data;
  const showError = (isError || !data) && !showLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title={event?.title ?? t.headerTitle}
        onBack={handleBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={isRefetching}
        onScrollBeginDrag={() => {
          // Intentionally empty: preserves the existing ScrollView behavior.
        }}
      >
        {showLoading ? (
          <EmptyState variant="loading" message={t.loading} />
        ) : showError ? (
          <EmptyState
            variant="error"
            message={
              error
                ? getApiMessage(error, t.loadError)
                : t.loadError
            }
            onRetry={() => {
              void refetch();
            }}
          />
        ) : data && event ? (
          <View style={styles.body}>
            <EventInfoCard event={event} />

            {data.listItems.length > 0 ? (
              <EventListItemsCard items={data.listItems} />
            ) : null}

            {data.running ? (
              <EventRunningInfoCard running={data.running} />
            ) : null}

            {data.formFields.length > 0 ? (
              <EventRegistrationForm
                fields={data.formFields}
                answers={answers}
                onSetSingle={setSingle}
                onToggleMulti={toggleMulti}
                onSetText={setText}
              />
            ) : null}

            <EventResponseCta
              status={registrationStatus}
              pending={respondMutation.isPending}
              onAccept={handleAccept}
              onCancel={handleCancel}
            />
          </View>
        ) : (
          <EmptyState
            variant="error"
            message={t.loadError}
            onRetry={() => {
              void refetch();
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  content: {
    flexGrow: 1,
    padding: layout.pagePadding,
    paddingBottom: 140,
  },
  body: {
    gap: spacing.sm,
  },
});
