import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { listBlogPosts } from '@features/blog/blogService';
import { colors, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { TargetIcon, ChevronRightIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Filter = 'all' | 'entrenamientos' | 'nutricion' | 'salud';

const FILTER_KEYS: Filter[] = ['all', 'entrenamientos', 'nutricion', 'salud'];
const FILTER_LABELS: Record<Filter, string> = {
  all: 'Todos',
  entrenamientos: 'Entrenamientos',
  nutricion: 'Nutrición',
  salud: 'Salud',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ArticlesScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: articles, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: listBlogPosts,
    staleTime: 300_000,
  });

  const mapped = (articles ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.excerpt || a.content?.slice(0, 120) || '',
    category: a.category,
    date: a.createdAt
      ? new Date(a.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
  }));

  // Newest-first order is preserved from the API; the segmented filter further
  // narrows by category when a specific one is selected.
  const filtered = mapped.filter((a) => {
    if (filter === 'all') return true;
    const category = a.category?.toLowerCase() ?? '';
    return category.includes(filter);
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Artículos y consejos" onBack={() => navigation.goBack()} />

      <View style={styles.filterWrap}>
        <SegmentedFilter
          options={FILTER_KEYS.map((k) => ({ key: k, label: FILTER_LABELS[k] }))}
          value={filter}
          onChange={(key) => setFilter(key as Filter)}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton.List rows={5} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="empty"
          title="Sin artículos todavía"
          message="Vuelve más tarde para ver consejos y novedades."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filtered.map((article, i) => (
            <ListCard
              key={article.id}
              title={article.title}
              subtitle={article.description}
              leadingIcon={<TargetIcon size={20} color={colors.textSecondary} />}
              trailing={<ChevronRightIcon size={16} color={colors.textSecondary} />}
              onPress={() => navigation.navigate('ArticleDetail', { id: article.id })}
              last={i === filtered.length - 1}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  filterWrap: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  skeletonWrap: { paddingHorizontal: spacing.md },
  listContent: { padding: spacing.md, gap: spacing.sm },
});
