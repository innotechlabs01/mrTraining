/**
 * Push notification registration and alert display for the athlete.
 *
 * - Registers Expo push token on mount
 * - Fetches computed alerts from /alerts via alertService
 * - Shows in-app alerts as toast banners
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { smartClient as apiClient } from '../../infrastructure/api/client';
import { listAlerts } from '../../features/alerts/alertService';
import { mmkv, mmkvRemove } from '../storage/mmkv';

export interface Alert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
}

// Configure notification behavior: show alert even when app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// MMKV key for the backend device id returned by POST /athlete/push-tokens,
// needed to deactivate the token via DELETE /devices/:id on sign-out.
const PUSH_DEVICE_ID_KEY = 'push-device-id';

let registrationFailed = false;
let retryListenerStarted = false;

/** One shared reconnect listener: retries a failed registration when connectivity returns. */
function startReconnectRetry(): void {
  if (retryListenerStarted) return;
  retryListenerStarted = true;
  NetInfo.addEventListener((state) => {
    if (state.isConnected && registrationFailed) {
      registrationFailed = false;
      void registerForPushNotifications();
    }
  });
}

/**
 * Register the Expo push token with the backend.
 * Safe to call multiple times — idempotent. Registration is fire-and-forget;
 * failures are retried automatically on the next reconnect.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // Simulator has no push token.

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Register with backend (fire-and-forget + retry on reconnect).
    apiClient.post('/athlete/push-tokens', {
      token,
      platform: Platform.OS,
    }).then((res) => {
      registrationFailed = false;
      const id = (res.data as { id?: unknown } | undefined)?.id;
      if (typeof id === 'string' && id.length > 0) mmkv.set(PUSH_DEVICE_ID_KEY, id);
    }).catch(() => {
      registrationFailed = true;
      startReconnectRetry();
    });

    return token;
  } catch {
    return null;
  }
}

/**
 * Deactivate this device's push token on the backend (DELETE /devices/:id).
 * Best-effort — call BEFORE Clerk sign-out so the auth token is still valid.
 */
export async function unregisterPushToken(): Promise<void> {
  const deviceId = mmkv.getString(PUSH_DEVICE_ID_KEY);
  if (!deviceId) return;
  try {
    await apiClient.delete(`/athlete/push-tokens/${deviceId}`);
  } catch {
    // Offline or already removed — nothing else to do.
  }
  mmkvRemove(PUSH_DEVICE_ID_KEY);
}

/**
 * Fetch computed alerts for the athlete.
 */
export async function fetchAlerts(): Promise<Alert[]> {
  try {
    const alerts = await listAlerts();
    // Map new Alert DTO to legacy shape expected by callers
    return alerts.map(a => ({
      type: a.type ?? 'general',
      severity: (a.severity as 'low' | 'medium' | 'high') ?? 'low',
      title: a.title,
      message: a.message,
    }));
  } catch {
    return [];
  }
}

/**
 * Show an in-app alert banner.
 */
export function showAlertNotification(alert: Alert) {
  Notifications.scheduleNotificationAsync({
    content: {
      title: alert.title,
      body: alert.message,
      data: { alertType: alert.type },
    },
    trigger: null, // Immediate
  });
}
