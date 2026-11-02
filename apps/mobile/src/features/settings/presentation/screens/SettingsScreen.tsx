import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text, Platform, Switch } from 'react-native';
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
import { createHealthBridge, getRecordedDevices, syncAllFromDevice } from '../../../../infrastructure/health';
import type { RecordingDevice } from '../../../../infrastructure/health/devices';
import type { HealthBridge } from '../../../../infrastructure/health/types';
import { parseHeartRateMeasurement, parseBatteryLevel, identifyPeripheralFromBytes } from '../../../../infrastructure/bluetooth/ble-service';



const t = texts.screens.settingsScreen;

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const [watchStatus, setWatchStatus] = useState<string>('Verificando…');
  const [watchLastSync, setWatchLastSync] = useState<string | null>(null);
  const [garminStatus, setGarminStatus] = useState<string>('Verificando…');
  const [garminLastSync, setGarminLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<'watch' | 'garmin' | null>(null);
  // Devices that actually recorded runs — the names come from the watch
  // metadata, never from a guess about which watch the athlete owns.
  const [watchName, setWatchName] = useState<string | null>(null);
  const [garminName, setGarminName] = useState<string | null>(null);

  const watchChannel = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  // BLE state
  const [bleConnecting, setBleConnecting] = useState<boolean>(false);
  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);
  const [bleStatus, setBleStatus] = useState<string>('No escaneado');

  useEffect(() => {
    void (async () => {
      const local = createHealthBridge();
      if (local) {
        const ok = await local.isAvailable();
        const granted = ok ? await local.hasPermissions() : false;
        setWatchStatus(
          ok
            ? granted
              ? `Conectado vía ${watchChannel} · runs y salud se sincronizan`
              : 'Permiso pendiente: tocá para autorizar'
            : 'No disponible en este dispositivo',
        );
      } else {
        setWatchStatus('No disponible en este dispositivo');
      }

      const devices: RecordingDevice[] = await getRecordedDevices();
      const appleWatch = devices.find(d => d.source === 'apple_watch');
      const garmin = devices.find(d => d.source === 'garmin');
      if (appleWatch) setWatchName(appleWatch.name);
      if (garmin) setGarminName(garmin.name);

      const garminBridge = createHealthBridge('garmin');
      const connected = garminBridge ? await garminBridge.isAvailable() : false;
      setGarminStatus(connected ? 'Conectado vía Garmin Connect' : 'No conectado');
      if (!connected && garmin) setGarminName(garmin.name);

      // Track last sync timestamps from device metadata
      const now = new Date().toLocaleString();
      if (appleWatch) setWatchLastSync(now);
      if (garmin) setGarminLastSync(now);
    })();
  }, [watchChannel]);



  /**
   * Manual sync for the Apple Watch / Health Connect side. Pulls the runs the
   * watch recorded plus health metrics, and reports which devices they came
   * from so the athlete sees the watch really was identified.
   */
  const handleSyncWatch = async () => {
    const bridge: HealthBridge | null = createHealthBridge();
    if (!bridge) {
      Alert.alert('Wearables', 'Este dispositivo no puede leer datos de salud.');
      return;
    }
    setSyncing('watch');
    try {
      if (!(await bridge.hasPermissions())) {
        const granted = await bridge.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Wearables',
            'Necesitamos permiso de lectura de entrenamientos y salud para importar tus carreras.',
          );
          return;
        }
      }

      const { workouts } = await syncAllFromDevice(bridge);
      if (!workouts.ok) {
        Alert.alert('Wearables', 'No se pudo leer los entrenamientos del reloj.');
        setWatchStatus('Error de sincronización');
        setWatchLastSync(null);
        return;
      }

      const appleWatch = workouts.deviceList.find(d => d.source === 'apple_watch');
      if (appleWatch) setWatchName(appleWatch.name);
      const now = new Date().toLocaleString();
      setWatchLastSync(now);
      const deviceLabel = workouts.devices.length > 0 ? workouts.devices.join(', ') : 'sin reloj detectado';
      setWatchStatus(`Conectado vía ${watchChannel} · ${deviceLabel}`);
      Alert.alert(
        'Wearables',
        workouts.imported > 0
          ? `${workouts.imported} carrera(s) importadas desde ${deviceLabel}.`
          : `Todo al día (${deviceLabel}).`,
      );
    } catch {
      Alert.alert('Wearables', 'No se pudo sincronizar. Intentá de nuevo.');
      setWatchLastSync(null);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncGarmin = async () => {
    setSyncing('garmin');
    try {
      const { data } = await apiClient.post('/athlete/running/providers/garmin/sync');
      const synced =
        (data as { sessions_synced?: number })?.sessions_synced ??
        (data as { data?: { sessions_synced?: number } })?.data?.sessions_synced ??
        0;
      // The Garmin model is stored per session by the API import, so read it
      // back instead of labelling the row with a made-up name.
      const deviceName = await detectGarminDeviceName();
      if (deviceName) setGarminName(deviceName);
      const now = new Date().toLocaleString();
      setGarminLastSync(now);
      setGarminStatus(`Conectado vía Garmin Connect · ${deviceName ?? 'sincronizado'}`);
      Alert.alert(
        'Garmin',
        synced > 0
          ? `${synced} carrera(s) importadas${deviceName ? ` desde ${deviceName}` : ''}.`
          : `Todo al día${deviceName ? ` (${deviceName})` : ''}.`,
      );
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.message ??
        'No se pudo sincronizar Garmin. Verificá que la cuenta esté conectada.';
      Alert.alert('Garmin', message);
      setGarminLastSync(null);
    } finally {
      setSyncing(null);
    }
  };

  /** Most recent Garmin watch that produced a session, per the API. */
  async function detectGarminDeviceName(): Promise<string | null> {
    try {
      const { data } = await apiClient.get('/athlete/running/sessions', { params: { limit: 20 } });
      const body = data as
        | { data?: Array<{ source?: string; device_name?: string }> }
        | Array<{ source?: string; device_name?: string }>
        | undefined;
      const sessions = Array.isArray(body) ? body : body?.data ?? [];
      const garmin = sessions.find(s => s.source === 'garmin' && s.device_name);
      return garmin?.device_name ?? null;
    } catch {
      return null;
    }
  }

  const handleBleConnect = () => {
    // BLE scanning pending native module compatibility
    Alert.alert('Bluetooth', 'Escaneo BLE pending - use la app nativa para emparejar tu reloj.');
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
          title={
            syncing === 'watch'
              ? 'Sincronizando Apple Watch…'
              : watchName
                ? `Apple Watch · ${watchName}`
                : 'Apple Watch'
          }
          subtitle={
            watchStatus
              ? watchLastSync
                ? `${watchStatus} · ${watchLastSync}`
                : watchStatus
              : 'Sin datos de sincronización'
          }
          leadingIcon={<BellIcon size={20} />}
          onPress={() => void handleSyncWatch()}
        />
        <ListCard
          title={
            syncing === 'garmin'
              ? 'Sincronizando Garmin…'
              : garminName
                ? `Garmin · ${garminName}`
                : 'Garmin'
          }
          subtitle={
            garminStatus
              ? garminLastSync
                ? `${garminStatus} · ${garminLastSync}`
                : garminStatus
              : 'Sin datos de sincronización'
          }
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
        <ListCard
          title={
            bleConnecting
              ? 'Conectando por Bluetooth…'
              : bleDeviceName
                ? `Bluetooth · ${bleDeviceName}`
                : 'Bluetooth'
          }
          subtitle={bleStatus}
          leadingIcon={<BellIcon size={20} />}
          onPress={() => void handleBleConnect()}
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
