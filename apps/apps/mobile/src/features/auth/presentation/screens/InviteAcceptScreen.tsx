import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../app/Navigation';

const API_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://mrtraining.vercel.app';

type InviteAcceptScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InviteAccept'>;

export function InviteAcceptScreen() {
  const { userId, isSignedIn } = useAuth();
  const navigation = useNavigation<InviteAcceptScreenNavigationProp>();
  const route = useRoute();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'needs_auth'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);

  // Extract token from route params
  useEffect(() => {
    const routeToken = (route.params as { token?: string })?.token;
    if (routeToken) {
      setToken(routeToken);
    }
  }, [route.params]);

  // Handle invite acceptance
  const acceptInvite = useCallback(async (inviteToken: string) => {
    if (!isSignedIn || !userId) {
      setStatus('needs_auth');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch(`${API_URL}/api/athlete/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setStatus('success');
      // Navigate to main app after short delay
      setTimeout(() => {
        navigation.navigate('AthleteTabs');
      }, 1500);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  }, [isSignedIn, userId, navigation]);

  // Process token when available
  useEffect(() => {
    if (token && isSignedIn && userId) {
      acceptInvite(token);
    }
  }, [token, isSignedIn, userId, acceptInvite]);

  // If no token, show error
  useEffect(() => {
    if (!token && status === 'idle') {
      setStatus('error');
      setErrorMessage('No invitation token provided');
    }
  }, [token, status]);

  const handleSignIn = () => {
    navigation.navigate('Auth');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>MR Training</Text>

        {status === 'idle' && (
          <>
            <ActivityIndicator size="large" color="#FF6B00" style={styles.loader} />
            <Text style={styles.title}>Preparing...</Text>
          </>
        )}

        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#FF6B00" style={styles.loader} />
            <Text style={styles.title}>Setting up your account...</Text>
            <Text style={styles.subtitle}>Please wait while we link you to your coach</Text>
          </>
        )}

        {status === 'needs_auth' && (
          <>
            <View style={styles.authIcon}>
              <Text style={styles.authIconText}>🔐</Text>
            </View>
            <Text style={styles.title}>Sign in required</Text>
            <Text style={styles.subtitle}>
              You need to sign in or create an account to accept this invitation
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleSignIn}
            >
              <Text style={styles.buttonText}>Sign In / Sign Up</Text>
            </Pressable>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.successIcon}>
              <Text style={styles.successText}>✓</Text>
            </View>
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>Your account has been linked successfully</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorIcon}>
              <Text style={styles.errorText}>✕</Text>
            </View>
            <Text style={styles.title}>Oops!</Text>
            <Text style={styles.subtitle}>{errorMessage}</Text>
            <Text style={styles.hint}>
              Please contact your coach for a new invitation link
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8C3D',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  loader: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F5F5F7',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#98989D',
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: 14,
    color: '#6E6E73',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#FF6B00',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successText: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '700',
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '700',
  },
  authIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authIconText: {
    fontSize: 32,
  },
});
