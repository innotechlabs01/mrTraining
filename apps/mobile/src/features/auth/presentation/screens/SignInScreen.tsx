import React from 'react';
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { colors } from '../../../../shared/theme/tokens';
import { SignInTopBar } from './signin/SignInTopBar';
import { SignInHero } from './signin/SignInHero';
import { SignInFormSection } from './signin/SignInFormSection';
import { SignInActions } from './signin/SignInActions';
import { useSignInForm } from './signin/useSignInForm';

type AuthNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;
type AuthRouteProp = RouteProp<RootStackParamList, 'Auth'>;

export function SignInScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<AuthRouteProp>();
  const form = useSignInForm({
    initialCode: route.params?.code,
    initialMode: route.params?.mode,
    getOnboardingData: () => route.params?.onboardingData,
  });
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <SignInTopBar
            mode={form.mode}
            canGoBack={canGoBack}
            onBack={() => navigation.goBack()}
          />
          <SignInHero mode={form.mode} />
          <SignInFormSection
            mode={form.mode}
            email={form.email}
            fullName={form.fullName}
            password={form.password}
            confirmPassword={form.confirmPassword}
            coachCode={form.coachCode}
            onEmailChange={form.setEmail}
            onFullNameChange={form.setFullName}
            onPasswordChange={form.setPassword}
            onConfirmPasswordChange={form.setConfirmPassword}
            onCoachCodeChange={form.setCoachCode}
          />
          <SignInActions
            mode={form.mode}
            loading={form.loading}
            isLoaded={form.isLoaded}
            onSubmit={form.handleSubmit}
            onToggleMode={form.toggleMode}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: colors.base },
});
