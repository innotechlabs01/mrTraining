import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors, fontFamilies, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ArrowLeftIcon, BellIcon, SearchIcon, UserIcon } from '../../../../shared/components/icons';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

type NotificationTab = 'reminders' | 'system';

type NotificationItem = {
  id: string;
  title: string;
  date: string;
  read: boolean;
  group: 'today' | 'yesterday' | 'older';
};

const GROUP_LABELS: Record<NotificationItem['group'], string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  older: 'Anteriores',
};

const TABS: { key: NotificationTab; label: string }[] = [
  { key: 'reminders', label: 'Recordatorios' },
  { key: 'system', label: 'Sistema' },
];

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getGroup(dateStr: string): NotificationItem['group'] {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'today';
  if (diffDays < 2) return 'yesterday';
  return 'older';
}

function NotificationCard({ item }: { item: NotificationItem }) {
  return (
    <View style={[styles.card, !item.read && styles.cardUnread]}>
      <View style={styles.cardIconCircle}>
        <BellIcon size={18} color={colors.text} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardDate}>{item.date}</Text>
      </View>
    </View>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<NotificationTab>('reminders');

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/notifications');
      return (data?.notifications ?? data?.data ?? []) as Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        read: boolean;
        createdAt: string;
      }>;
    },
    staleTime: 30_000,
  });

  const allItems: NotificationItem[] = (notifications ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    date: n.createdAt,
    read: n.read,
    group: getGroup(n.createdAt),
  }));

  const filtered = allItems.filter((n) => {
    if (tab === 'reminders') return !n.id.startsWith('sys-');
    return true;
  });

  const groups = filtered.reduce<Record<string, NotificationItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const groupOrder: NotificationItem['group'][] = ['today', 'yesterday', 'older'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backButton}
        >
          <ArrowLeftIcon size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={styles.headerRight}>
          <Pressable accessibilityLabel="Buscar" onPress={() => navigation.navigate('Search')} style={styles.iconButton}>
            <SearchIcon size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityLabel="Perfil" onPress={() => undefined} style={styles.iconButton}>
            <UserIcon size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <SegmentedFilter options={TABS} value={tab} onChange={(k) => setTab(k as NotificationTab)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Skeleton.List rows={5} height={72} />
        ) : filtered.length === 0 ? (
          <EmptyState variant="empty" title="No tienes notificaciones" message="Las notificaciones nuevas aparecerán aquí." />
        ) : (
          groupOrder.map((groupKey) => {
            const items = groups[groupKey];
            if (!items || items.length === 0) return null;
            return (
              <View key={groupKey} style={styles.groupSection}>
                <Text style={styles.groupLabel}>{GROUP_LABELS[groupKey]}</Text>
                {items.map((item) => (
                  <NotificationCard key={item.id} item={item} />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.primary,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.md, paddingBottom: 48, gap: spacing.lg },
  groupSection: { gap: spacing.sm },
  groupLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    paddingHorizontal: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardUnread: { borderColor: colors.primary },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 18 },
  cardDate: { ...typography.caption, color: colors.textSecondary, fontSize: 12 },
});
