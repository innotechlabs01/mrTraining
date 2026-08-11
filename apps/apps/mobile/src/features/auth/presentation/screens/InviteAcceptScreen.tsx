import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable, TextInput } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/Navigation';

const API_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://mrtraining.vercel.app';

type InviteAcceptNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InviteAccept'>;

export function InviteAcceptScreen() {
  const { userId, isSignedIn } = useAuth();
  const navigation = useNavigation<InviteAcceptNavigationProp>();
  const route = useRoute();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'needs_auth'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [coachName, setCoachName] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    const routeCode = (route.params as { code?: string })?.code;
    if (routeCode) {
      setCode(routeCode);
      setManualCode(routeCode);
    }
  }, [route.params]);

  const acceptInvite = useCallback(async (coachCode: string) => {
    if (!isSignedIn || !userId) {
      setStatus('needs_auth');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch(`${API_URL}/api/athlete/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coachCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setCoachName(data.coachName || '');
      setStatus('success');
      setTimeout(() => {
        navigation.navigate('AthleteTabs');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  }, [isSignedIn, userId, navigation]);

  useEffect(() => {
    if (code && isSignedIn && userId) {
      acceptInvite(code);
    }
  }, [code, isSignedIn, userId, acceptInvite]);

  const handleSignIn = () => {
    navigation.navigate('Auth', { code: (code ?? manualCode) || undefined });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>MR Training</Text>

        {status === 'idle' && (code ? (
          <>
            <ActivityIndicator size="large" color="#FF6B00" style={styles.loader} />
            <Text style={styles.title}>Preparing...</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Conecta con tu coach</Text>
            <Text style={styles.subtitle}>
              Ingresa o pega el código que te compartió tu coach
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. MR-A3X9"
              placeholderTextColor="#6E6E73"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoCorrect={false}
              testID="invite-code-input"
            />
            <Pressable
              style={({ pressed }) => [
                styles.button,
                !manualCode.trim() && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              disabled={!manualCode.trim()}
              onPress={() => acceptInvite(manualCode.trim())}
            >
              <Text style={styles.buttonText}>Conectar con mi coach</Text>
            </Pressable>
          </>
        ))}

        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#FF6B00" style={styles.loader} />
            <Text style={styles.title}>Connecting to your coach...</Text>
            <Text style={styles.subtitle}>Please wait while we set up your account</Text>
          </>
        )}

        {status === 'needs_auth' && (
          <>
            <View style={styles.authIcon}>
              <Text style={styles.authIconText}>🔐</Text>
            </View>
            <Text style={styles.title}>Sign in required</Text>
            <Text style={styles.subtitle}>
              Create an account or sign in to connect with your coach
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
            <Text style={styles.subtitle}>
              {coachName
                ? `You are now connected to ${coachName}`
                : 'Your account has been linked successfully'}
            </Text>
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
              Please ask your coach for a valid invitation code
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  brand: { fontSize: 14, fontWeight: '700', color: '#FF8C3D', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32 },
  loader: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#F5F5F7', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#98989D', textAlign: 'center', lineHeight: 22 },
  hint: { fontSize: 14, color: '#6E6E73', textAlign: 'center', marginTop: 16, lineHeight: 20 },
  button: { backgroundColor: '#FF6B00', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: 24, width: '100%' },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  input: { backgroundColor: '#1C1C1E', height: 52, borderRadius: 12, paddingHorizontal: 16, color: '#F5F5F7', fontSize: 18, fontWeight: '600', letterSpacing: 2, textAlign: 'center', width: '100%', marginTop: 24 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successText: { fontSize: 32, color: '#FFF', fontWeight: '700' },
  errorIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  errorText: { fontSize: 32, color: '#FFF', fontWeight: '700' },
  authIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  authIconText: { fontSize: 32 },
});
