/**
 * Push notification registration and alert display for the athlete.
 *
 * - Registers Expo push token on mount
 * - Fetches computed alerts from /alerts via alertService
 * - Shows in-app alerts as toast banners
 */
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { smartClient as apiClient } from '../../infrastructure/api/client';
import { listAlerts } from '../../features/alerts/alertService';

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

/**
 * Register the Expo push token with the backend.
 * Safe to call multiple times — idempotent.
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

    // Register with backend (fire-and-forget).
    apiClient.post('/athlete/push-tokens', {
      token,
      platform: Platform.OS,
    }).catch(() => {});

    return token;
  } catch {
    return null;
  }
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
