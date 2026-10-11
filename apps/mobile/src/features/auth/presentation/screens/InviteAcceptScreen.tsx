import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable, TextInput } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import { LockIcon, CheckIcon, CloseIcon } from '../../../../shared/components/icons';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.inviteAccept;

type InviteAcceptNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InviteAccept'>;
type InviteAcceptRouteProp = RouteProp<RootStackParamList, 'InviteAccept'>;

export function InviteAcceptScreen() {
  const { isSignedIn } = useAuth();
  const navigation = useNavigation<InviteAcceptNavigationProp>();
  const route = useRoute<InviteAcceptRouteProp>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'needs_auth'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [coachName, setCoachName] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const routeCode = route.params?.code;
    if (routeCode) {
      setCode(routeCode);
      setManualCode(routeCode);
    }
  }, [route.params]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const acceptInvite = useCallback(async (coachCode: string) => {
    if (!isSignedIn) {
      setStatus('needs_auth');
      return;
    }

    // Validate code format
    if (!coachCode.trim() || coachCode.length < 4) {
      setStatus('error');
      setErrorMessage(t.invalidCode);
      return;
    }

    setStatus('loading');

    try {
      const { data } = await apiClient.post('/athlete/accept-invite', {
        code: coachCode.trim(),
      });

      setCoachName(data.coachName || '');
      setStatus('success');
      timeoutRef.current = setTimeout(() => {
        navigation.navigate('AthleteTabs');
      }, 2000);
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : t.acceptFailed;
      setErrorMessage(message);
    }
  }, [isSignedIn, navigation]);

  useEffect(() => {
    if (code && isSignedIn) {
      acceptInvite(code);
    } else if (code && !isSignedIn) {
      setStatus('needs_auth');
    }
  }, [code, isSignedIn, acceptInvite]);

  const handleSignIn = () => {
    navigation.navigate('Auth', { code: (code ?? manualCode) || undefined });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>MR TRAINING</Text>

        {status === 'idle' && (code ? (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            <Text style={styles.title}>{t.preparingTitle}</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>
              {t.subtitle}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t.codePlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel={t.codeA11y}
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
              <Text style={styles.buttonText}>{t.connectButton}</Text>
            </Pressable>
          </>
        ))}

        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            <Text style={styles.title}>{t.connectingTitle}</Text>
            <Text style={styles.subtitle}>{t.connectingSubtitle}</Text>
          </>
        )}

        {status === 'needs_auth' && (
          <>
            <View style={styles.authIcon}>
              <LockIcon size={28} color={colors.textSecondary} />
            </View>
            <Text style={styles.title}>{t.signInRequiredTitle}</Text>
            <Text style={styles.subtitle}>
              {t.signInRequiredSubtitle}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleSignIn}
            >
              <Text style={styles.buttonText}>{t.signInButton}</Text>
            </Pressable>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.successIcon}>
              <CheckIcon size={28} color={colors.text} />
            </View>
            <Text style={styles.title}>{t.welcomeTitle}</Text>
            <Text style={styles.subtitle}>
              {coachName
                ? t.connectedWith.replace('{name}', coachName)
                : t.linkedFallback}
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorIcon}>
              <CloseIcon size={28} color={colors.text} />
            </View>
            <Text style={styles.title}>{t.errorTitle}</Text>
            <Text style={styles.subtitle}>{errorMessage}</Text>
            <Text style={styles.hint}>
              {t.errorHint}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  brand: { ...typography.label, fontSize: 14, color: colors.primary, marginBottom: spacing.xl },
  loader: { marginBottom: spacing.lg },
  title: { ...typography.title, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body, fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  hint: { ...typography.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 20 },
  button: { backgroundColor: colors.primary, height: 52, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg, width: '100%' },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonText: { ...typography.bodyStrong, fontSize: 16, color: colors.base },
  input: { backgroundColor: colors.surface, height: 52, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, fontSize: 18, fontWeight: '600', letterSpacing: 2, textAlign: 'center', width: '100%', marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border },
  successIcon: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  successText: { fontSize: 32, color: colors.text, fontWeight: '700' },
  errorIcon: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  errorText: { fontSize: 32, color: colors.text, fontWeight: '700' },
  authIcon: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  authIconText: { fontSize: 32 },
});
