import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AthleteTabParamList } from '../../../../navigation/AthleteTabs';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { smartClient as apiClient } from '../../../../infrastructure/api/client';
import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';
import { Card } from '../../../../shared/components/ui/Card';
import { Input } from '../../../../shared/components/ui/Input';
import { PrimaryButton } from '../../../../shared/components/ui/PrimaryButton';
import {
  MembershipIcon,
  StoreIcon,
  BarbellIcon,
  UserIcon,
  StarIcon,
  LockIcon,
  GearIcon,
  HelpIcon,
  LogoutIcon,
  CheckIcon,
  MapPinIcon,
  ChatIcon,
  ChevronRightIcon,
} from '../../../../shared/components/icons';

type AthleteProfile = {
  id: string;
  name: string;
  sport: string;
  email: string;
  plan: { name: string; price: number };
  schedule: { days: string; time: string };
  schedule_days?: string;
  schedule_time?: string;
  readiness: { score: number };
  modality?: string;
  service_type?: string;
  serviceType?: string;
  emergency_contact?: string;
  weight?: number | string;
  age?: number | string;
  height?: number | string;
  birthday?: string;
};

type Modality = 'virtual' | 'hibrido' | 'presencial';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'L', tue: 'M', wed: 'M', thu: 'J', fri: 'V', sat: 'S', sun: 'D',
};
const DAY_FULL: Record<string, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo',
};

function normalizeModality(value: unknown): Modality {
  const v = String(value ?? '').toLowerCase().trim();
  if (v === 'hibrido' || v === 'híbrido' || v === 'hybrid') return 'hibrido';
  if (v === 'presencial' || v === 'onsite' || v === 'in_person') return 'presencial';
  return 'virtual';
}

const MODALITY_OPTIONS: Array<{ key: Modality; label: string; icon: React.ReactElement }> = [
  { key: 'virtual', label: 'Virtual', icon: <ChatIcon size={18} color={colors.primary} /> },
  { key: 'hibrido', label: 'Híbrido', icon: <StarIcon size={18} color={colors.primary} /> },
  { key: 'presencial', label: 'Presencial', icon: <MapPinIcon size={18} color={colors.primary} /> },
];

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<AthleteTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const { signOut } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const openMembership = () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Membership');
  const openStore = () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Store');
  const openImport = () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('ImportHistory');
  const openFavorites = () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Favorites');
  const openSettings = () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Settings');
  const openHelp = () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('Help');

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName
        ? user.firstName[0].toUpperCase()
        : 'AT';

  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['athlete-profile'],
    queryFn: async () => {
      const { data } = await apiClient.get('/athlete/profile');
      // Go backend returns { user: {...}, athlete_profile: {...} } — unwrap
      return (data?.athlete_profile ?? data?.profile ?? data?.user ?? data ?? null) as AthleteProfile | null;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Derived header data — real values only; '—' when missing (no invented fallbacks)
  const displayName =
    (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null) ??
    (profile?.name || '') ??
    '—';
  const displayEmail = email || profile?.email || '—';
  const birthdayRaw = (profile as AthleteProfile | null)?.birthday ?? null;
  const birthdayText = birthdayRaw ? `Cumpleaños: ${birthdayRaw}` : null;

  // Stats — pull from profile if available, else honest '—' (never mock values)
  const weightRaw = (profile as unknown as Record<string, unknown>)?.weight as number | string | undefined;
  const ageRaw = (profile as unknown as Record<string, unknown>)?.age as number | string | undefined;
  const heightRaw = (profile as unknown as Record<string, unknown>)?.height as number | string | undefined;
  const statsWeight =
    weightRaw != null && weightRaw !== ''
      ? String(weightRaw).replace(/\s?[Kk][Gg]\s?$/i, '').trim() + ' Kg'
      : '—';
  const statsAge = ageRaw != null && ageRaw !== '' ? String(ageRaw) : '—';
  const statsAgeSub = 'Años';
  const statsHeight =
    heightRaw != null && heightRaw !== ''
      ? String(heightRaw).replace(/\s?[Cc][Mm]\s?$/i, '').trim() + ' cm'
      : '—';

  // Personal info local state
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);

  // Modality local state — default virtual for new users
  const [modality, setModality] = useState<Modality>('virtual');
  const [modalitySaving, setModalitySaving] = useState<Modality | null>(null);

  // Emergency contact local state
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencySaving, setEmergencySaving] = useState(false);

  // Schedule local state
  const [scheduleDays, setScheduleDays] = useState<Set<string>>(new Set());
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // Sync Clerk user names when they load
  useEffect(() => {
    if (user?.firstName) setFirstName(user.firstName);
    if (user?.lastName) setLastName(user.lastName);
  }, [user?.firstName, user?.lastName]);

  // Sync modality + schedule + emergency contact from profile when available
  useEffect(() => {
    if (profile) {
      const raw = profile.modality ?? profile.service_type ?? profile.serviceType;
      setModality(normalizeModality(raw));
      setEmergencyContact(profile.emergency_contact ?? '');
      const rawDays = profile.schedule_days ?? profile.schedule?.days ?? '';
      const daySet = new Set<string>();
      if (rawDays) {
        rawDays.split(',').map((d: string) => d.trim().toLowerCase()).forEach((d: string) => {
          const match = DAY_KEYS.find(k => k === d || DAY_FULL[k]?.toLowerCase() === d);
          if (match) daySet.add(match);
        });
      }
      setScheduleDays(daySet);
      setScheduleTime(profile.schedule_time ?? profile.schedule?.time ?? '');
    } else {
      setModality('virtual');
      setEmergencyContact('');
      setScheduleDays(new Set());
      setScheduleTime('');
    }
  }, [profile]);

  const handleSavePersonalInfo = async () => {
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

  const handleModalitySelect = async (next: Modality) => {
    if (next === modality) return;
    const prev = modality;
    setModality(next);
    setModalitySaving(next);
    try {
      await apiClient.put('/athlete/profile', { modality: next });
      await queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
    } catch (err: unknown) {
      setModality(prev);
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el modo de entrenamiento';
      Alert.alert('Error', msg);
    } finally {
      setModalitySaving(null);
    }
  };

  const handleSaveEmergency = async () => {
    setEmergencySaving(true);
    try {
      await apiClient.put('/athlete/profile', { emergencyContact });
      await queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
      Alert.alert('Guardado', 'Contacto de emergencia actualizado');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar';
      Alert.alert('Error', msg);
    } finally {
      setEmergencySaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setScheduleDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleSaveSchedule = async () => {
    setScheduleSaving(true);
    try {
      const daysStr = Array.from(scheduleDays).join(',');
      await apiClient.put('/athlete/profile', { scheduleDays: daysStr, scheduleTime: scheduleTime });
      await queryClient.invalidateQueries({ queryKey: ['athlete-profile'] });
      Alert.alert('Guardado', 'Horario de entrenamiento actualizado');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar';
      Alert.alert('Error', msg);
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar Sesión', '¿Seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handlePrivacyPolicy = async () => {
    const url = 'https://mr-training.com/privacy';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else Alert.alert('Política de Privacidad', 'Próximamente');
    } catch {
      Alert.alert('Política de Privacidad', 'Próximamente');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          {/* Header: solid primary background — FitBody layout, MR palette */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{initials}</Text>
            </View>
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.headerEmail} numberOfLines={1}>
              {displayEmail}
            </Text>
            {birthdayText ? (
              <Text style={styles.headerBirthday} numberOfLines={1}>
                {birthdayText}
              </Text>
            ) : null}
          </View>

          {/* Stats card: floating overlap */}
          <View style={styles.statsCard}>
            <View style={styles.statsCol}>
              <Text style={styles.statsValue} numberOfLines={1}>
                {statsWeight}
              </Text>
              <Text style={styles.statsLabel}>Peso</Text>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsCol}>
              <Text style={styles.statsValue} numberOfLines={1}>
                {statsAge}
              </Text>
              <Text style={styles.statsLabel}>{statsAgeSub}</Text>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsCol}>
              <Text style={styles.statsValue} numberOfLines={1}>
                {statsHeight}
              </Text>
              <Text style={styles.statsLabel}>Altura</Text>
            </View>
          </View>

          {/* Menu list: single Card with list items */}
          <Card style={styles.menuCard}>
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={() => Alert.alert('Perfil', 'Sección de información personal más abajo')}
              accessibilityRole="button"
              accessibilityLabel="Perfil"
            >
              <View style={styles.menuIconCircle}>
                <UserIcon size={18} color={colors.base} />
              </View>
              <Text style={styles.menuLabel}>Perfil</Text>
              <ChevronRightIcon size={20} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.menuSeparator} />
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={openFavorites}
              accessibilityRole="button"
              accessibilityLabel="Favoritos"
            >
              <View style={styles.menuIconCircle}>
                <StarIcon size={18} color={colors.base} />
              </View>
              <Text style={styles.menuLabel}>Favoritos</Text>
              <ChevronRightIcon size={20} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.menuSeparator} />
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={handlePrivacyPolicy}
              accessibilityRole="button"
              accessibilityLabel="Política de Privacidad"
            >
              <View style={styles.menuIconCircle}>
                <LockIcon size={18} color={colors.base} />
              </View>
              <Text style={styles.menuLabel}>Política de Privacidad</Text>
              <ChevronRightIcon size={20} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.menuSeparator} />
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={openSettings}
              accessibilityRole="button"
              accessibilityLabel="Ajustes"
            >
              <View style={styles.menuIconCircle}>
                <GearIcon size={18} color={colors.base} />
              </View>
              <Text style={styles.menuLabel}>Ajustes</Text>
              <ChevronRightIcon size={20} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.menuSeparator} />
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={openHelp}
              accessibilityRole="button"
              accessibilityLabel="Ayuda"
            >
              <View style={styles.menuIconCircle}>
                <HelpIcon size={18} color={colors.base} />
              </View>
              <Text style={styles.menuLabel}>Ayuda</Text>
              <ChevronRightIcon size={20} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.menuSeparator} />
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Cerrar Sesión"
            >
              <View style={styles.menuIconCircle}>
                <LogoutIcon size={18} color={colors.base} />
              </View>
              <Text style={styles.menuLabel}>Cerrar Sesión</Text>
              <ChevronRightIcon size={20} color={colors.textSecondary} />
            </Pressable>
          </Card>

          {/* Existing functional cards — preserved below menu list */}
          <View style={styles.existingCardsWrap}>
            {/* Entry cards: Membership / Store / Import */}
            <Card style={styles.entryCard}>
              <MembershipIcon size={24} color={colors.primary} />
              <View style={styles.entryText}>
                <Text style={styles.entryTitle}>Membresía</Text>
                <Text style={styles.entrySub}>Administra tu plan, pagos y estado</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir membresía" onPress={openMembership} style={styles.entryCta}>
                <Text style={styles.entryCtaText}>Abrir</Text>
              </Pressable>
            </Card>
            <Card style={styles.entryCard}>
              <StoreIcon size={24} color={colors.primary} />
              <View style={styles.entryText}>
                <Text style={styles.entryTitle}>Tienda</Text>
                <Text style={styles.entrySub}>Explora el equipo seleccionado por tu coach</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir tienda" onPress={openStore} style={styles.entryCta}>
                <Text style={styles.entryCtaText}>Abrir</Text>
              </Pressable>
            </Card>
            <Card style={styles.entryCard}>
              <BarbellIcon size={24} color={colors.primary} />
              <View style={styles.entryText}>
                <Text style={styles.entryTitle}>Importar historial</Text>
                <Text style={styles.entrySub}>Importa tus entrenamientos de Strong, Hevy o FitNotes</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir importación de historial" onPress={openImport} style={styles.entryCta}>
                <Text style={styles.entryCtaText}>Abrir</Text>
              </Pressable>
            </Card>

            {/* Card 1: Personal Info */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Información Personal</Text>
              <Text style={styles.cardSubtitle}>Actualiza tus datos personales</Text>

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
                  {email || '—'}
                </Text>
                <Text style={styles.readOnlyHint}>Solo lectura</Text>
              </View>

              <PrimaryButton label="Guardar" onPress={handleSavePersonalInfo} disabled={saving} />
            </Card>

            {/* Card 2: Training Mode */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Modo de Entrenamiento</Text>
              <Text style={styles.cardSubtitle}>Elige cómo entrenas con tu coach</Text>

              <View style={styles.segmentedRow}>
                {MODALITY_OPTIONS.map((opt) => {
                  const selected = modality === opt.key;
                  const isSaving = modalitySaving === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={({ pressed }) => [
                        styles.pill,
                        selected ? styles.pillSelected : styles.pillUnselected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleModalitySelect(opt.key)}
                      disabled={!!modalitySaving}
                      accessibilityLabel={`Modalidad ${opt.label}`}
                      accessibilityState={{ selected }}
                    >
                      <View style={styles.pillIconView}>{opt.icon}</View>
                      <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>
                        {opt.label}
                      </Text>
                      {isSaving ? (
                        <ActivityIndicator size="small" color={selected ? colors.base : colors.primary} style={styles.pillLoader} />
                      ) : selected ? (
                        <CheckIcon size={14} color={selected ? colors.base : colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.modalityHint}>
                Actual: <Text style={styles.modalityHintStrong}>{MODALITY_OPTIONS.find((o) => o.key === modality)?.label ?? 'Virtual'}</Text>
              </Text>
            </Card>

            {/* Card: Training Schedule */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Horario de Entrenamiento</Text>
              <Text style={styles.cardSubtitle}>Elige los días y el horario</Text>

              <View style={styles.dayRow}>
                {DAY_KEYS.map((day) => {
                  const selected = scheduleDays.has(day);
                  return (
                    <Pressable
                      key={day}
                      style={({ pressed }) => [
                        styles.dayChip,
                        selected ? styles.dayChipSelected : styles.dayChipUnselected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => toggleDay(day)}
                      accessibilityLabel={DAY_FULL[day]}
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                        {DAY_LABELS[day]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Horario</Text>
              <Input
                placeholder="08:00"
                value={scheduleTime}
                onChangeText={setScheduleTime}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                accessibilityLabel="Horario"
              />

              <PrimaryButton label="Guardar Horario" onPress={handleSaveSchedule} disabled={scheduleSaving} />
            </Card>

            {/* Card: Emergency Contact */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Contacto de Emergencia</Text>
              <Text style={styles.cardSubtitle}>Nombre y teléfono de tu contacto</Text>

              <Input
                placeholder="Nombre — Teléfono"
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Contacto de emergencia"
              />

              <PrimaryButton label="Guardar Contacto" onPress={handleSaveEmergency} disabled={emergencySaving} />
            </Card>

            {/* Card 3: Membership / Plan */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Membresía</Text>
              <Text style={styles.cardSubtitle}>Tu plan actual</Text>
              {profileLoading ? (
                <ActivityIndicator color={colors.primary} style={styles.membershipLoader} />
              ) : profile ? (
                <View style={styles.membershipContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Plan</Text>
                    <Text style={styles.infoValue}>{profile.plan?.name || 'Sin plan'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Deporte</Text>
                    <Text style={styles.infoValue}>{profile.sport || '—'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Horario</Text>
                    <Text style={styles.infoValue}>
                      {(() => {
                        const days = profile.schedule_days ?? profile.schedule?.days ?? '';
                        const time = profile.schedule_time ?? profile.schedule?.time ?? '';
                        if (!days && !time) return '—';
                        const expanded = days.split(',').map((d: string) => {
                          const key = d.trim().toLowerCase();
                          return DAY_FULL[key] ?? d.trim();
                        }).filter(Boolean).join(', ');
                        return `${expanded}${time ? ' · ' + time : ''}`;
                      })()}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Emergencia</Text>
                    <Text style={styles.infoValue}>{profile.emergency_contact || '—'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Recuperación</Text>
                    <Text style={[styles.infoValue, { color: colors.primary }]}>
                      {profile.readiness?.score ?? '—'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>No hay información de membresía</Text>
              )}
            </Card>

            {/* Card 4: Actions */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Acciones</Text>
              <Pressable
                style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
                onPress={handleSignOut}
                accessibilityLabel="Cerrar sesión de tu cuenta"
                accessibilityRole="button"
              >
                <Text style={styles.signOutText}>Cerrar Sesión</Text>
              </Pressable>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  // New FitBody header — MR palette
  header: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 220,
  },
  headerTitle: { ...typography.title, color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.md },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarLargeText: { ...typography.title, color: colors.text, fontSize: 28 },
  headerName: { ...typography.title, color: '#FFFFFF', marginTop: spacing.md, textAlign: 'center' },
  headerEmail: { ...typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2, textAlign: 'center' },
  headerBirthday: { ...typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2, textAlign: 'center' },
  // Stats floating overlap
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginTop: -28,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  statsCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: 2 },
  statsValue: { ...typography.bodyStrong, color: '#FFFFFF', textAlign: 'center', fontSize: 14 },
  statsLabel: { ...typography.caption, color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 11 },
  statsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: spacing.sm },
  // Menu list card
  menuCard: { padding: 0, marginHorizontal: spacing.md, marginTop: spacing.md, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconText: { fontSize: 14, color: '#FFFFFF', textAlign: 'center' },
  menuLabel: { flex: 1, ...typography.bodyStrong, color: colors.text },
  menuChevron: { fontSize: 20, color: colors.primary, fontWeight: '600' },
  menuSeparator: { height: 1, backgroundColor: colors.border, marginLeft: 56 + spacing.md },
  // Existing functional cards wrap
  existingCardsWrap: { padding: spacing.md, gap: spacing.md, marginTop: spacing.md },
  card: { padding: spacing.lg },
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryText: { flex: 1, gap: 2 },
  entryTitle: { ...typography.bodyStrong, color: colors.text },
  entrySub: { ...typography.caption, color: colors.textSecondary },
  entryCta: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}22`,
  },
  entryCtaText: { ...typography.label, color: colors.primary },
  cardTitle: { ...typography.title, color: colors.text },
  cardSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
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
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  segmentedRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  pill: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 72,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillUnselected: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
  pillIconView: { marginBottom: 2 },
  pillText: { ...typography.caption, fontWeight: '700', textAlign: 'center' },
  pillTextSelected: { color: colors.base },
  pillTextUnselected: { color: colors.text },
  pillCheck: { fontSize: 12, color: colors.base, fontWeight: '700', marginTop: 2 },
  pillLoader: { marginTop: 2 },
  modalityHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  modalityHintStrong: { color: colors.text, fontWeight: '600' },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipUnselected: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  dayChipText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  dayChipTextSelected: {
    color: colors.base,
  },
  membershipContent: { gap: 0 },
  membershipLoader: { marginTop: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border },
  infoLabel: { ...typography.body, color: colors.textSecondary },
  infoValue: { ...typography.body, color: colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  emptyText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  signOutButton: {
    backgroundColor: colors.error,
    minHeight: spacing.lg * 2,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  signOutText: { ...typography.bodyStrong, color: colors.text },
});
