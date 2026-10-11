import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUser } from '@clerk/clerk-expo';
import { colors, layout, spacing, typography } from '../../../../shared/theme/tokens';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { EyeIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.passwordSettings;

type Nav = NativeStackNavigationProp<RootStackParamList>;

type PasswordField = 'current' | 'new' | 'confirm';

export function PasswordSettingsScreen() {
  const navigation = useNavigation<Nav>();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState<Set<PasswordField>>(new Set());
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t.errorTitle, t.completeAll);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t.errorTitle, t.mismatch);
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t.errorTitle, t.tooShort);
      return;
    }

    setLoading(true);
    try {
      await user?.updatePassword({ currentPassword, newPassword });
      Alert.alert(t.successTitle, t.successBody);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.updateFailed;
      Alert.alert(t.errorTitle, message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(t.forgotTitle, t.forgotBody);
  };

  const toggleVisible = (field: PasswordField) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const passwordField = (label: string, field: PasswordField, value: string, onChange: (v: string) => void) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Input
          value={value}
          onChangeText={onChange}
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!visible.has(field)}
          accessibilityLabel={label}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mostrar u ocultar ${label.toLowerCase()}`}
          hitSlop={12}
          onPress={() => toggleVisible(field)}
          style={styles.eyeButton}
        >
          <EyeIcon size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title={t.headerTitle} onBack={() => navigation.goBack()} />
        <View style={styles.body}>
          <Text style={styles.hint}>{t.subtitle}</Text>
          {passwordField(t.currentLabel, 'current', currentPassword, setCurrentPassword)}
          {passwordField(t.newLabel, 'new', newPassword, setNewPassword)}
          {passwordField(t.confirmLabel, 'confirm', confirmPassword, setConfirmPassword)}
          <PrimaryButton
            label={loading ? t.saving : t.submit}
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading}
          />
          <Pressable accessibilityRole="button" onPress={handleForgotPassword} style={styles.forgotLink} hitSlop={8}>
            <Text style={styles.forgotText}>{t.forgotText}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  flex: { flex: 1 },
  body: { padding: spacing.lg, gap: spacing.lg },
  hint: { ...typography.bodySmall, color: colors.textSecondary },
  field: { gap: spacing.sm },
  label: { ...typography.overline, color: colors.textSecondary },
  inputWrap: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1 },
  eyeButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  forgotLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  forgotText: { ...typography.body, color: colors.textSecondary },
});
