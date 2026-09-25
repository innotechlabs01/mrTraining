/**
 * PersonalDataScreen — editable identity (name/last name/email) plus a
 * read-only digest of the athlete's recorded stats (weight/age/height/birthday).
 */
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-expo';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, radius, spacing, typography } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import { SubScreenHeader } from '../../../../shared/components/ui/SubScreenHeader';
import { useAthleteProfile } from '../../application/useAthleteProfile';

export function PersonalDataScreen() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: profile } = useAthleteProfile();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.firstName) setFirstName(user.firstName);
    if (user?.lastName) setLastName(user.lastName);
  }, [user?.firstName, user?.lastName]);

  const email = user?.emailAddresses?.[0]?.emailAddress ?? profile?.email ?? '—';
  const weight = profile?.weight != null ? String(profile.weight).replace(/\s?[Kk][Gg]\s?$/i, '').trim() + ' Kg' : '—';
  const age = profile?.age != null ? String(profile.age) : '—';
  const height = profile?.height != null ? String(profile.height).replace(/\s?[Cc][Mm]\s?$/i, '').trim() + ' cm' : '—';
  const birthday = profile?.birthday ? `Cumpleaños: ${profile.birthday}` : null;

  const handleSave = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      Alert.alert('Error', 'El nombre y el apellido son obligatorios');
      return;
    }
    if (fn.length < 2 || ln.length < 2) {
      Alert.alert('Error', 'El nombre debe tener al menos 2 caracteres');
      return;
    }
    setSaving(true);
    try {
      if (user) {
        await user.update({ firstName: fn, lastName: ln });
      }
      await apiClient.put('/athlete/profile', { firstName: fn, lastName: ln });
      await queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
      Alert.alert('Éxito', 'Tu perfil se ha actualizado');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el perfil';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const stats: Array<{ label: string; value: string }> = [
    { label: 'Peso', value: weight },
    { label: 'Edad', value: age },
    { label: 'Altura', value: height },
  ];
  if (birthday) stats.push({ label: 'Cumpleaños', value: birthday.replace('Cumpleaños: ', '') });

  return (
    <View style={styles.container}>
      <SubScreenHeader title="Información personal" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Tus datos</Text>
          <Text style={styles.cardSubtitle}>El nombre aparece en toda la app</Text>

          <Text style={styles.label}>Nombre</Text>
          <Input
            placeholder="Juan"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel="Nombre"
            returnKeyType="next"
          />

          <Text style={styles.label}>Apellido</Text>
          <Input
            placeholder="Doe"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel="Apellido"
            returnKeyType="next"
          />

          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnlyWrap}>
            <Text style={styles.readOnlyText} numberOfLines={1}>
              {email}
            </Text>
            <Text style={styles.readOnlyHint}>Solo lectura</Text>
          </View>

          <PrimaryButton label="Guardar" onPress={handleSave} disabled={saving} />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Datos registrados</Text>
          <Text style={styles.cardSubtitle}>Los actualiza tu coach</Text>
          {stats.map((s, i) => (
            <View key={s.label}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{s.label}</Text>
                <Text style={styles.infoValue}>{s.value}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  card: { padding: spacing.lg },
  cardTitle: { ...typography.title, color: colors.text },
  cardSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.sm },
  label: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  readOnlyWrap: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    minHeight: spacing.lg * 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.85,
  },
  readOnlyText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  readOnlyHint: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border },
  infoLabel: { ...typography.body, color: colors.textSecondary },
  infoValue: { ...typography.body, color: colors.text, fontWeight: '600' },
});