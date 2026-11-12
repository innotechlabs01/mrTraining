/**
 * AllyCatalogScreen — Catálogo de productos y servicios de aliados disponibles.
 * Layout estilo Rappi: imagen cuadrada, título, descripción, precio y CTA primario.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  RefreshControl,
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
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import {
  listAllyProducts,
  listAllyServices,
  createOrder,
  createReservation,
  type AllyProduct,
  type AllyService,
} from '../../services/allyService';

const t = {
  catalogTitle: 'Catálogo del Aliado',
  subtitle: 'Productos y servicios disponibles',
  productsTitle: 'Productos',
  servicesTitle: 'Servicios',
  buy: 'Agregar',
  reserve: 'Reservar',
  unit: '1 x',
  loading: 'Cargando catálogo...',
  empty: 'No hay productos ni servicios disponibles.',
  buySuccess: 'Compra iniciada',
  buySuccessBody: 'Completa el pago para finalizar tu pedido.',
  reserveSuccess: 'Reserva iniciada',
  reserveSuccessBody: 'Completa el pago para confirmar tu reserva.',
  error: 'Error',
  errorBody: 'No se pudo completar la operación. Intenta de nuevo.',
} as const;

export function AllyCatalogScreen() {
  const navigation = useNavigation<AllyNav>();
  const [products, setProducts] = useState<AllyProduct[]>([]);
  const [services, setServices] = useState<AllyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [productsData, servicesData] = await Promise.all([
        listAllyProducts(),
        listAllyServices(),
      ]);
      setProducts(productsData);
      setServices(servicesData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el catálogo';
      setError(msg);
      setProducts([]);
      setServices([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleBuyProduct = async (product: AllyProduct) => {
    try {
      await createOrder({
        allyId: product.allyId,
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethodId: '',
      });
      Alert.alert(t.buySuccess, t.buySuccessBody);
      Linking.openURL(`https://mobile.innotechlabssas.lat/buy/${product.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.errorBody;
      Alert.alert(t.error, msg);
    }
  };

  const handleReserveService = async (service: AllyService) => {
    try {
      await createReservation({
        allyId: service.allyId,
        serviceId: service.id,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 3600000).toISOString(),
      });
      Alert.alert(t.reserveSuccess, t.reserveSuccessBody);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.errorBody;
      Alert.alert(t.error, msg);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t.catalogTitle} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content}>
          <Skeleton.List rows={5} height={104} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t.catalogTitle} onBack={() => navigation.goBack()} />
        <EmptyState variant="error" title={t.error} message={error} />
      </SafeAreaView>
    );
  }

  const isEmpty = products.length === 0 && services.length === 0;
  if (isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t.catalogTitle} onBack={() => navigation.goBack()} />
        <EmptyState variant="empty" title={t.empty} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t.catalogTitle} subtitle={t.subtitle} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCatalog(true)}
            tintColor={colors.primary}
          />
        }
      >
        {products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.productsTitle}</Text>
            {products.map((product) => (
              <View key={product.id} style={styles.card}>
                <View style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{product.description}</Text>
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.cardUnit}>{t.unit}</Text>
                      <Text style={styles.cardPrice}>
                        ${(product.priceCents / 100).toFixed(2)} {product.currency}
                      </Text>
                    </View>
                    <PrimaryButton
                      label={t.buy}
                      variant="primary"
                      size="md"
                      fullWidth={false}
                      style={styles.ctaButton}
                      onPress={() => handleBuyProduct(product)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.servicesTitle}</Text>
            {services.map((service) => (
              <View key={service.id} style={styles.card}>
                <View style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{service.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{service.description}</Text>
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.cardUnit}>{t.unit}</Text>
                      <Text style={styles.cardPrice}>
                        ${(service.priceCents / 100).toFixed(2)} {service.currency}
                      </Text>
                    </View>
                    <PrimaryButton
                      label={t.reserve}
                      variant="primary"
                      size="md"
                      fullWidth={false}
                      style={styles.ctaButton}
                      onPress={() => handleReserveService(service)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.pagePadding, gap: spacing.lg },
  section: { gap: spacing.md },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardImage: {
    width: 92,
    height: 92,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
  },
  cardBody: { flex: 1, gap: spacing.xs },
  cardTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 16,
  },
  cardDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  cardFooter: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardUnit: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardPrice: {
    ...typography.h3,
    color: colors.primary,
    fontSize: 20,
    marginTop: 2,
  },
  ctaButton: {
    alignSelf: 'flex-end',
    minWidth: 96,
  },
});
