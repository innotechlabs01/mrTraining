import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { getBlogPost } from '@features/blog/blogService';
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ArticleRoute = RouteProp<RootStackParamList, 'ArticleDetail'>;

export function ArticleDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ArticleRoute>();
  const { id } = route.params;

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ['blog-post', id],
    queryFn: () => getBlogPost(id),
    staleTime: 300_000,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Artículo" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.loading}>
          <Skeleton.List rows={4} />
        </View>
      ) : isError || !article ? (
        <EmptyState
          variant="error"
          title="No se pudo cargar"
          message="El artículo no está disponible."
          onRetry={() => navigation.goBack()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{article.title}</Text>

          {!!article.category && (
            <View style={styles.metaRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{article.category}</Text>
              </View>
              {article.publishedAt ? (
                <Text style={styles.date}>
                  {new Date(article.publishedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              ) : null}
            </View>
          )}

          {!!article.excerpt && <Text style={styles.excerpt}>{article.excerpt}</Text>}

          <Text style={styles.body}>{article.content}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  loading: { padding: spacing.md },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { ...typography.h2, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    backgroundColor: 'rgba(200, 255, 0, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  date: { ...typography.bodySmall, color: colors.textSecondary },
  excerpt: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic' },
  body: { ...typography.body, color: colors.text, lineHeight: 24 },
});