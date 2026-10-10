import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../../shared/components/ui/ScreenHeader';
import { Badge } from '../../../../../shared/components/ui/Badge';
import { ListCard } from '../../../../../shared/components/ui/ListCard';
import { supportApi, type SupportTicket } from '../../api';
import type { RootStackParamList } from '../../../../../navigation/Navigation';
import { ChevronRightIcon } from '../../../../../shared/components/icons';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Tab = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

const STATUS_COLORS: Record<string, string> = {
  open: colors.success,
  in_progress: colors.info,
  resolved: colors.warning,
  closed: colors.textMuted,
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function MyTicketsScreen() {
  const navigation = useNavigation<Nav>();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const fetchTickets = async () => {
    try {
      const data = await supportApi.getMyTickets(tab === 'all' ? undefined : tab);
      setTickets(data);
      // Fetch unread counts for each ticket
      const counts: Record<string, number> = {};
      for (const t of data) {
        if (t.unread_count > 0) {
          counts[t.id] = t.unread_count;
        }
      }
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Fetch tickets error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [tab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const filteredTickets = tickets;

  const renderItem = ({ item }: { item: SupportTicket }) => {
    const unread = unreadCounts[item.id] || 0;
    const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
    const statusLabel = STATUS_LABELS[item.status] || item.status;

    return (
      <ListCard
        key={item.id}
        title={`#${item.ticket_number} ${item.subject}`}
        subtitle={`${item.category} • ${item.priority}`}
        trailing={
          <View style={styles.trailing}>
            <Badge
              variant={item.status === 'open' ? 'success' : item.status === 'in_progress' ? 'info' : 'default'}
              size="sm"
            >
              {statusLabel}
            </Badge>
            {unread > 0 && (
              <Badge variant="danger" size="xs" style={styles.unreadBadge}>
                {unread > 9 ? '9+' : unread}
              </Badge>
            )}
          </View>
        }
        onPress={() => navigation.navigate('TicketChat', { ticketId: item.id })}
      >
        <Text style={styles.meta}>
          #{item.ticket_number} • {new Date(item.created_at).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {item.category} • {item.priority}
        </Text>
      </ListCard>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Mis tickets" onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Mis tickets" onBack={() => navigation.goBack()} />

      <View style={styles.tabBar}>
        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              tab === t && styles.tabActive,
            ]}
          >
            <Text style={[
              styles.tabLabel,
              tab === t ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}>
              {t === 'all' ? 'Todos' : STATUS_LABELS[t] || t}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredTickets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tienes tickets{tab !== 'all' ? ` con estado "${STATUS_LABELS[tab]}"` : ''}.</Text>
            <Text style={styles.emptySubtext}>Pulsa "+" para crear uno nuevo.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { ...typography.caption, color: colors.textSecondary },
  tabLabelActive: { color: colors.onPrimary, fontWeight: '600' },
  tabLabelInactive: { color: colors.textSecondary },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  unreadBadge: { marginLeft: spacing.xs },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { ...typography.bodyStrong, color: colors.text, marginBottom: spacing.xs, textAlign: 'center' },
  emptySubtext: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});