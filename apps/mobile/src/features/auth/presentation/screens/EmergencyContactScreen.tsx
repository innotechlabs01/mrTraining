/**
 * EmergencyContactScreen — single field to update the athlete's emergency
 * contact. Same layout and guardrails as NotificationSettingsScreen.
 */
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { SubScreenHeader } from '../../../../shared/components/ui/SubScreenHeader';
import { useAthleteProfile } from '../../application/useAthleteProfile';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.emergencyContact;

export function EmergencyContactScreen() {
  const queryClient = useQueryClient();
  const { data: profile } = useAthleteProfile();
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContact(profile?.emergency_contact ?? '');
  }, [profile]);

  const trimmed = contact.trim();

  const handleSave = async () => {
    if (!trimmed) {
      Alert.alert(t.errorTitle, t.contactRequired);
      return;
    }
    if (trimmed.length > 50) {
      Alert.alert(t.errorTitle, t.maxChars);
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/athlete/profile', { emergencyContact: trimmed });
      await queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
      Alert.alert(t.savedTitle, t.savedBody);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.saveFailed;
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SubScreenHeader title={t.headerTitle} />
      <View style={styles.body}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t.whoToCall}</Text>
          <Text style={styles.cardSubtitle}>
            {t.cardSubtitle}
          </Text>

          <Text style={styles.label}>{t.contactLabel}</Text>
          <Input
            placeholder={t.namePlaceholder}
            value={contact}
            onChangeText={setContact}
            autoCapitalize="sentences"
            autoCorrect={false}
            maxLength={50}
            accessibilityLabel={t.headerTitle}
            returnKeyType="done"
          />
          <Text style={styles.hint}>{t.maxChars}</Text>

          <PrimaryButton label={texts.common.save} onPress={handleSave} disabled={saving} />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  body: { flex: 1, justifyContent: 'center' },
  card: { margin: spacing.md, padding: spacing.lg },
  cardTitle: { ...typography.title, color: colors.text },
  cardSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  hint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
});