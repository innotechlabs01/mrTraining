/**
 * AllyOperationsScreen — Historial de operaciones del atleta.
 * Muestra órdenes y reservas realizadas con aliados, con posibilidad de ver detalles.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type AllyNav = NativeStackNavigationProp<RootStackParamList>;
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';

type AllyOperationsNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'AllyOperations'
>;

const t = {
  operationsTitle: 'Mis Operaciones',
  subtitle: 'Órdenes y reservas con tus aliados',
  loading: 'Cargando operaciones...',
  empty: 'No tienes operaciones aún.',
  error: 'Error',
  errorBody: 'No se pudieron cargar las operaciones.',
  order: 'Orden',
  reservation: 'Reserva',
  statusCompleted: 'Completado',
  statusPending: 'Pendiente',
  statusCancelled: 'Cancelado',
} as const;

type Operation = {
  id: string;
  type: 'order' | 'reservation' | 'redemption';
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
};

export function AllyOperationsScreen() {
  const navigation = useNavigation<AllyNav>();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Conectar a GET /api/v1/athlete/operations cuando exista en el Go API.
      // Por ahora devolvemos datos de ejemplo para que el flujo funcione.
      setOperations([
        {
          id: 'op-001',
          type: 'order',
          status: 'completed',
          totalCents: 15000,
          currency: 'COP',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'op-002',
          type: 'reservation',
          status: 'pending',
          totalCents: 30000,
          currency: 'COP',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.errorBody;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number, currency: string) => {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t.operationsTitle} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content}>
          <Skeleton.List rows={3} height={80} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t.operationsTitle} onBack={() => navigation.goBack()} />
        <EmptyState variant="error" title={t.error} message={error} />
      </SafeAreaView>
    );
  }

  if (operations.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t.operationsTitle} onBack={() => navigation.goBack()} />
        <EmptyState variant="empty" title={t.empty} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t.operationsTitle} onBack={() => navigation.goBack()} />
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        {operations.map((op) => (
          <Pressable
            key={op.id}
            onPress={() => {
              Alert.alert(
                op.type === 'order' ? t.order : t.reservation,
                `Estado: ${op.status}\nTotal: ${formatAmount(op.totalCents, op.currency)}\nFecha: ${formatDate(op.createdAt)}`
              );
            }}
            style={styles.operationRow}
          >
            <View style={styles.opInfo}>
              <Text style={styles.opType}>
                {op.type === 'order' ? t.order : t.reservation}
              </Text>
              <Text style={styles.opDate}>{formatDate(op.createdAt)}</Text>
            </View>
            <View style={styles.opAmount}>
              <Text style={styles.opAmountText}>{formatAmount(op.totalCents, op.currency)}</Text>
              <Text
                style={[styles.opStatus, { color: statusColor(op.status) }]}
              >
                {op.status === 'completed'
                  ? t.statusCompleted
                  : op.status === 'pending'
                    ? t.statusPending
                    : t.statusCancelled}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.pagePadding, gap: spacing.lg },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  operationRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opInfo: { gap: spacing.xs },
  opType: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  opDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  opAmount: { gap: spacing.xs },
  opAmountText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  opStatus: {
    ...typography.caption,
    fontWeight: '600',
  },
});
