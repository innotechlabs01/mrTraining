import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-react-native';
import { tokens, typography } from '@shared/theme';

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'AT';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.emailAddresses[0]?.emailAddress}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>85</Text>
            <Text style={styles.statLabel}>Readiness</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>7</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]}
          onPress={() => signOut()}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, alignItems: 'center', padding: tokens.spacing.lg, paddingTop: tokens.spacing.xxl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF8C3D', justifyContent: 'center', alignItems: 'center', marginBottom: tokens.spacing.md },
  avatarText: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  name: { ...typography.title2, color: '#F5F5F7', fontWeight: '700' },
  email: { ...typography.body, color: '#98989D', marginTop: tokens.spacing.xs, marginBottom: tokens.spacing.xl },
  statsRow: { flexDirection: 'row', gap: tokens.spacing.sm, width: '100%', marginBottom: tokens.spacing.xl },
  statCard: { flex: 1, backgroundColor: '#1C1C1E', borderRadius: tokens.radius.md, padding: tokens.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#38383A' },
  statValue: { ...typography.title3, color: '#FF8C3D', fontWeight: '700' },
  statLabel: { ...typography.caption, color: '#98989D', marginTop: 4 },
  signOutButton: { backgroundColor: '#FF3B30', height: 48, borderRadius: tokens.radius.md, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.spacing.xl },
  buttonPressed: { opacity: 0.8 },
  signOutText: { ...typography.callout, color: '#FFF', fontWeight: '600' },
});
