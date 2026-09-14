import { Linking, Pressable, View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { TrackedVideoPlayer } from '../components/TrackedVideoPlayer';
import { RunningRouteView } from '../components/RunningRouteView';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSeconds: number | null;
  sortOrder: number;
  notes: string | null;
  videoUrl?: string | null;
  gpsRoute?: string | null;
  mode?: string;
  phase?: string;
};

type Workout = {
  id: string;
  athleteId: string;
  contentName: string;
  status: string;
  progress: number;
};

type WorkoutDetailData = {
  workout: Workout;
  exercises: Exercise[];
};

type PrescriptionExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg?: number | null;
  restSeconds?: number | null;
  sortOrder: number;
  notes?: string | null;
  mode?: string;
  phase?: string;
  videoUrl?: string | null;
  gpsRoute?: string | null;
  bodyPart?: string;
  muscleGroups?: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

export function WorkoutDetailScreen({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const queryClient = useQueryClient();

  const { data: workoutData, isLoading: loading1, isError: error1 } = useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/athlete/workouts/${workoutId}`);
      return data as { workout: Workout; exercises?: any[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: prescriptionData,
    isLoading: loading2,
    isError: error2,
  } = useQuery({
    queryKey: ['workout-prescription', workoutId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/athlete/workouts/${workoutId}/prescription`);
      return data as { data: PrescriptionExercise[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Transform prescription exercises to screen Exercise type
  const exercises: Exercise[] = prescriptionData?.data?.map((ex) => ({
    id: ex.id,
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    weightKg: ex.weightKg ?? null,
    restSeconds: ex.restSeconds ?? null,
    sortOrder: ex.sortOrder,
    notes: ex.notes ?? '',
    videoUrl: ex.videoUrl ?? undefined,
    gpsRoute: ex.gpsRoute ?? undefined,
    mode: ex.mode,
    phase: ex.phase,
  })) || [];

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/athlete/workouts/${workoutId}/session`);
      return data.session as { id: string };
    },
    onSuccess: (session) => {
      navigation.navigate('WorkoutExecution', { sessionId: session.id, workoutId });
    },
    onError: (err) => {
      console.error('Failed to start session:', err);
      Alert.alert('Could not start workout', 'Please try again.');
    },
  });

  const isLoading = loading1 || loading2;
  const hasExercises = exercises.length > 0;
  const athleteId = workoutData?.workout.athleteId ?? '';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={workoutData?.workout.contentName ?? 'Workout'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
              queryClient.invalidateQueries({ queryKey: ['workout-prescription', workoutId] });
            }}
            tintColor={colors.primary}
          />
        }>
        {isLoading ? (
          <EmptyState variant="loading" />
        ) : workoutData === null || error1 || error2 ? (
          <EmptyState
            variant="error"
            message="Could not load workout"
            onRetry={() => {
              queryClient.invalidateQueries({ queryKey: ['workout-detail', workoutId] });
              queryClient.invalidateQueries({ queryKey: ['workout-prescription', workoutId] });
            }}
          />
        ) : hasExercises ? (
          <>
            {exercises.map((ex) => (
              <Card key={ex.id} style={styles.card}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseSetReps}>
                  {ex.sets} × {ex.reps}
                </Text>
                <View style={styles.metaRow}>
                  {ex.weightKg !== null && ex.weightKg !== undefined ? (
                    <Text style={styles.meta}>${ex.weightKg} kg</Text>
                  ) : null}
                  {ex.restSeconds !== null && ex.restSeconds !== undefined ? (
                    <Text style={styles.meta}>${ex.restSeconds}s rest</Text>
                  ) : null}
                </View>
                {ex.videoUrl ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <TrackedVideoPlayer
                      videoUrl={ex.videoUrl}
                      exerciseId={ex.id}
                      athleteId={athleteId}
                    />
                  </View>
                ) : null}
                {ex.gpsRoute ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <RunningRouteView gpsRoute={ex.gpsRoute} />
                  </View>
                ) : null}
              </Card>
            ))}
            <View style={styles.cta}>
              <PrimaryButton
                label="Comenzar"
                onPress={() => startSessionMutation.mutate()}
                disabled={startSessionMutation.isPending}
              />
            </View>
          </>
        ) : (
          <EmptyState variant="empty" message="No exercises found" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.lg, paddingBottom: 100 },
  card: { marginBottom: spacing.sm, gap: spacing.xs },
  exerciseName: { ...typography.bodyStrong, color: colors.text },
  exerciseSetReps: { ...typography.body, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', gap: spacing.md },
  meta: { ...typography.caption, color: colors.textSecondary },
  cta: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});