import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.articlesScreen;

type Filter = 'all' | 'entrenamientos' | 'nutricion' | 'salud';

const FILTER_KEYS: Filter[] = ['all', 'entrenamientos', 'nutricion', 'salud'];
const FILTER_LABELS: Record<Filter, string> = {
  all: t.filterAll,
  entrenamientos: t.filterTraining,
  nutricion: t.filterNutrition,
  salud: t.filterHealth,
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

type MappedArticle = {
  id: string;
  title: string;
  description: string;
  category?: string;
  date: string;
};

function articleKeyExtractor(item: MappedArticle): string {
  return item.id;
}

export function ArticlesScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: articles, isLoading, isError, refetch } = useQuery({
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

  const renderArticle = useCallback(
    ({ item: article, index }: { item: MappedArticle; index: number }) => (
      <ListCard
        title={article.title}
        subtitle={article.description}
        leadingIcon={<TargetIcon size={20} color={colors.textSecondary} />}
        trailing={<ChevronRightIcon size={16} color={colors.textSecondary} />}
        onPress={() => navigation.navigate('ArticleDetail', { id: article.id })}
        last={index === filtered.length - 1}
      />
    ),
    [navigation, filtered.length],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t.headerTitle} onBack={() => navigation.goBack()} />

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
        isError ? (
          <EmptyState
            variant="error"
            title={t.errorTitle}
            message={t.errorMessage}
            onRetry={() => refetch()}
          />
        ) : (
          <EmptyState
            variant="empty"
            title={t.emptyTitle}
            message={t.emptyMessage}
          />
        )
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderArticle}
          keyExtractor={articleKeyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
