import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, layout, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { BellIcon, LockIcon, UserIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { createHealthBridge } from '../../../../infrastructure/health';

const t = texts.screens.settingsScreen;

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const [watchStatus, setWatchStatus] = useState<string>('Verificando…');
  const [garminStatus, setGarminStatus] = useState<string>('Verificando…');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void (async () => {
      const local = createHealthBridge();
      if (local) {
        const ok = await local.isAvailable();
        setWatchStatus(ok ? 'Disponible en este dispositivo' : 'No disponible');
      } else {
        setWatchStatus('No disponible');
      }
      const garmin = createHealthBridge('garmin');
      const connected = garmin ? await garmin.isAvailable() : false;
      setGarminStatus(connected ? 'Conectado' : 'No conectado');
    })();
  }, []);

  const handleSyncGarmin = async () => {
    setSyncing(true);
    try {
      const { data } = await apiClient.post('/athlete/running/providers/garmin/sync');
      const synced =
        (data as { sessions_synced?: number })?.sessions_synced ??
        (data as { data?: { sessions_synced?: number } })?.data?.sessions_synced ??
        0;
      Alert.alert('Garmin', `Sincronización completa: ${synced} sesiones importadas.`);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.message ??
        'No se pudo sincronizar Garmin. Verificá que la cuenta esté conectada.';
      Alert.alert('Garmin', message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(t.deleteAccountLabel, t.deleteConfirm, [
      { text: texts.common.cancel, style: 'cancel' },
      {
        text: texts.common.delete,
        style: 'destructive',
        onPress: () => Alert.alert('Cuenta eliminada', 'La eliminación de cuenta aún no está disponible.'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScreenHeader title={t.title} onBack={() => navigation.goBack()} />

        <ListCard
          title={t.notificationsLabel}
          subtitle={t.notificationsDesc}
          leadingIcon={<BellIcon size={20} />}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <ListCard
          title={t.passwordLabel}
          subtitle={t.passwordDesc}
          leadingIcon={<LockIcon size={20} />}
          onPress={() => navigation.navigate('PasswordSettings')}
        />
        <Text style={styles.sectionLabel}>Wearables</Text>
        <ListCard
          title="Apple Watch / Health Connect"
          subtitle={watchStatus}
          leadingIcon={<BellIcon size={20} />}
        />
        <ListCard
          title={syncing ? 'Sincronizando Garmin…' : 'Garmin'}
          subtitle={garminStatus}
          leadingIcon={<BellIcon size={20} />}
          onPress={() => void handleSyncGarmin()}
        />
        <ListCard
          title={t.deleteAccountLabel}
          subtitle={t.deleteAccountDesc}
          leadingIcon={<UserIcon size={20} color={colors.error} />}
          onPress={handleDeleteAccount}
          last
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { flex: 1, padding: layout.pagePadding, gap: spacing.sm },
  sectionLabel: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
