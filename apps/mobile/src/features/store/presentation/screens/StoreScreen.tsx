import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listStore, purchaseProduct, type StoreProduct } from '../../storeService';
import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { StoreIcon, PlusIcon } from '../../../../shared/components/icons';

export function StoreScreen() {
  const queryClient = useQueryClient();
  const navigation = useNavigation();

  const { data, isLoading, refetch, isRefetching, isError } = useQuery({
    queryKey: ['athlete-store'],
    queryFn: listStore,
    staleTime: 2 * 60 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (productId: string) => purchaseProduct(productId, 1),
    onSuccess: () => {
      Alert.alert('Éxito', 'Producto agregado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['athlete-store'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'No se pudo completar la compra.';
      Alert.alert('Error', msg);
    },
  });

  const products = data ?? [];
  const isEmpty = !isLoading && !isError && products.length === 0;

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Tienda" onBack={() => navigation.goBack()} />

        {isLoading ? (
          <Skeleton.List rows={4} />
        ) : isError ? (
          <EmptyState
            variant="error"
            title="Ocurrió un error"
            message="No se pudieron cargar los productos."
            actionLabel="Reintentar"
            onAction={() => refetch()}
          />
        ) : isEmpty ? (
          <EmptyState
            variant="empty"
            title="Sin productos todavía"
            message="Tu entrenador va a habilitar productos aquí cuando estén disponibles."
          />
        ) : (
          <View style={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={(id) => purchaseMutation.mutate(id)} pending={purchaseMutation.isPending} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProductCard({
  product,
  onAdd,
  pending,
}: {
  product: StoreProduct;
  onAdd: (id: string) => void;
  pending: boolean;
}) {
  const stock = product.stock ?? 0;
  const outOfStock = stock <= 0;
  return (
    <View style={styles.card}>
      <View style={styles.imageArea}>
        <StoreIcon size={40} color={colors.textSecondary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        {!!product.brand && (
          <Text style={styles.brandText} numberOfLines={1}>
            {product.brand}
          </Text>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>${Number(product.price).toFixed(2)}</Text>
          <Text style={styles.stockText}>Stock: {outOfStock ? '—' : stock}</Text>
        </View>
        <PrimaryButton
          label={outOfStock ? 'Sin stock' : 'Agregar'}
          icon={outOfStock ? undefined : <PlusIcon size={16} color={colors.base} />}
          onPress={() => onAdd(product.id)}
          disabled={pending || outOfStock}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.pagePadding, paddingBottom: 40, gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageArea: {
    height: 120,
    backgroundColor: colors.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: spacing.md, gap: 4 },
  productName: { ...typography.bodyStrong, color: colors.text, fontSize: 14, lineHeight: 18 },
  brandText: { ...typography.caption, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  priceText: { ...typography.title, color: colors.primary, fontSize: 16 },
  stockText: { ...typography.caption, color: colors.textSecondary },
});
