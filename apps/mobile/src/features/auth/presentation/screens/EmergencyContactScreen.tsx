/**
 * EmergencyContactScreen — single field to update the athlete's emergency
 * contact. Same layout and guardrails as NotificationSettingsScreen.
 */
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { SubScreenHeader } from '../../../../shared/components/ui/SubScreenHeader';
import { useAthleteProfile } from '../../application/useAthleteProfile';

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
      Alert.alert('Error', 'Debes indicar un contacto');
      return;
    }
    if (trimmed.length > 50) {
      Alert.alert('Error', 'Máximo 50 caracteres');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/athlete/profile', { emergencyContact: trimmed });
      await queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
      Alert.alert('Guardado', 'Contacto de emergencia actualizado');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SubScreenHeader title="Contacto de emergencia" />
      <View style={styles.body}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>¿A quién llamar?</Text>
          <Text style={styles.cardSubtitle}>
            Indica el nombre y número. Tu coach puede contactarlo en caso de necesidad.
          </Text>

          <Text style={styles.label}>Contacto</Text>
          <Input
            placeholder="María López · 11-5555-1234"
            value={contact}
            onChangeText={setContact}
            autoCapitalize="sentences"
            autoCorrect={false}
            maxLength={50}
            accessibilityLabel="Contacto de emergencia"
            returnKeyType="done"
          />
          <Text style={styles.hint}>Máximo 50 caracteres</Text>

          <PrimaryButton label="Guardar" onPress={handleSave} disabled={saving} />
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