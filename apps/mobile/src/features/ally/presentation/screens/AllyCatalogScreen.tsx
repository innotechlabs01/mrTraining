/**
 * AllyCatalogScreen — Catálogo de productos y servicios de aliados disponibles.
 * Permite al atleta navegar por el catálogo de un aliado y comprar productos o reservar servicios.
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

type AllyCatalogNavProp = NativeStackNavigationProp<RootStackParamList, 'AllyCatalog'>;

const t = {
  catalogTitle: 'Catálogo del Aliado',
  productsTitle: 'Productos',
  servicesTitle: 'Servicios',
  buy: 'Comprar',
  reserve: 'Reservar',
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
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
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
          <Skeleton.List rows={4} height={120} />
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
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t.catalogTitle} onBack={() => navigation.goBack()} />

        {products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.productsTitle}</Text>
            {products.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => handleBuyProduct(product)}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>{product.name}</Text>
                <Text style={styles.cardDesc}>{product.description}</Text>
                <Text style={styles.cardPrice}>
                  ${(product.priceCents / 100).toFixed(2)} {product.currency}
                </Text>
                <PrimaryButton label={t.buy} variant="outline" style={styles.buyButton} onPress={() => {}} />
              </Pressable>
            ))}
          </View>
        )}

        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.servicesTitle}</Text>
            {services.map((service) => (
              <Pressable
                key={service.id}
                onPress={() => handleReserveService(service)}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>{service.name}</Text>
                <Text style={styles.cardDesc}>{service.description}</Text>
                <Text style={styles.cardPrice}>
                  ${(service.priceCents / 100).toFixed(2)} {service.currency}
                </Text>
                <PrimaryButton label={t.reserve} variant="outline" style={styles.buyButton} onPress={() => {}} />
              </Pressable>
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
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cardPrice: {
    ...typography.bodyBold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  buyButton: {
    alignSelf: 'flex-start',
  },
});
