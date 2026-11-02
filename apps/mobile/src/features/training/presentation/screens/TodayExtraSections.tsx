/**
 * TodayExtraSections — new sections for the Home (Today) tab:
 * LiveSessionsSection (red urgent card), ArticlesCarousel (coach posts),
 * StoreCarousel (featured products). Presentational only.
 */
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { colors, spacing, typography, radius, layout } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Badge } from '../../../../shared/components/ui/Badge';
import { SectionHeader } from '../../../../shared/components/ui/SectionHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { PlusIcon, StoreIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';
import type { StoreProduct } from '../../../store/storeService';

const t = texts.screens.todayScreen;
const tStore = texts.screens.storeScreen;

// --- Live Sessions ---

export function LiveSessionsSection({ sessions, onJoin }: {
  sessions: Array<{ id: string; title: string; time: string; status: string }>;
  onJoin: (id: string) => void;
}) {
  if (sessions.length === 0) return null;
  const live = sessions.filter((s) => s.status === 'live' || s.status === 'in_progress');
  if (live.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t.liveTitle} />
      {live.map((s) => (
        <Pressable key={s.id} onPress={() => onJoin(s.id)} style={({ pressed }) => [pressed && styles.pressed]}>
          <Card style={styles.liveCard}>
            <View style={styles.liveRow}>
              <View style={styles.liveDot}>
                <Text style={styles.liveDotText}>●</Text>
              </View>
              <View style={styles.liveBody}>
                <Text style={styles.liveTitle}>{s.title}</Text>
                <Badge text={t.liveBadge} tone="error" />
              </View>
              <PrimaryButton label={t.liveJoin} onPress={() => onJoin(s.id)} />
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

// --- Articles Carousel (Coach Posts) ---

export function ArticlesCarousel({ posts, onOpen, onSeeAll }: {
  posts: Array<{ id: string; title: string; excerpt?: string; category?: string }>;
  onOpen: (id: string) => void;
  onSeeAll: () => void;
}) {
  if (posts.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        title={t.articlesTitle}
        action={{ label: t.articlesSeeAll, onPress: onSeeAll }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselScroll}
      >
        {posts.map((post) => (
          <Pressable
            key={post.id}
            onPress={() => onOpen(post.id)}
            style={({ pressed }) => [styles.articleCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={post.title}
          >
            <Card style={styles.articleInner}>
              {post.category ? <Badge text={post.category} tone="primary" /> : null}
              <Text style={styles.articleTitle} numberOfLines={3}>
                {post.title}
              </Text>
              {post.excerpt ? (
                <Text style={styles.articleExcerpt} numberOfLines={2}>
                  {post.excerpt}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// --- Store Carousel (Featured Products) ---

export function StoreCarousel({ products, onAdd, onSeeAll }: {
  products: StoreProduct[];
  onAdd: (product: StoreProduct) => void;
  onSeeAll: () => void;
}) {
  const inStock = products.filter((p) => (p.stock ?? 1) > 0).slice(0, 6);
  if (inStock.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t.storeTitle}
        action={{ label: t.storeSeeAll, onPress: onSeeAll }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselScroll}
      >
        {inStock.map((product) => (
          <Pressable
            key={product.id}
            onPress={() => onAdd(product)}
            style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${product.name}, $${product.price}`}
          >
            <Card style={styles.productInner}>
              <View style={styles.productImageArea}>
                {product.image_url ? (
                  <ExpoImage
                    source={{ uri: product.image_url }}
                    style={styles.productImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <StoreIcon size={32} color={colors.textSecondary} />
                )}
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <View style={styles.productBottomRow}>
                <Text style={styles.productPrice}>
                  ${Number(product.price).toFixed(0)}
                </Text>
                <Pressable
                  onPress={() => onAdd(product)}
                  style={styles.productAddBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${tStore.addToCart} ${product.name}`}
                >
                  <PlusIcon size={16} color={colors.base} />
                </Pressable>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },

  // Live
  liveCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    paddingVertical: spacing.md,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  liveDot: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: `${colors.error}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotText: { fontSize: 18, color: colors.error, fontWeight: '700' },
  liveBody: { flex: 1, gap: spacing.xs },
  liveTitle: { ...typography.bodyStrong, color: colors.text, fontSize: 15 },

  // Carousel shared
  carouselScroll: { gap: spacing.md },

  // Articles
  articleCard: { width: 200 },
  articleInner: { minHeight: 140, justifyContent: 'space-between', gap: spacing.xs },
  articleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 19,
  },
  articleExcerpt: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Products
  productCard: { width: 150 },
  productInner: { minHeight: 180, gap: spacing.xs },
  productImageArea: {
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: '100%' },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 17,
    flex: 1,
  },
  productBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: { fontSize: 15, fontWeight: '800', color: colors.primary },
  productAddBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
