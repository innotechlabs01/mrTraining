import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-expo';

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
          style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.8 }]}
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
  content: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 48 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF8C3D', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, lineHeight: 28, color: '#F5F5F7', fontWeight: '700' },
  email: { fontSize: 17, color: '#98989D', marginTop: 4, marginBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#38383A' },
  statValue: { fontSize: 20, color: '#FF8C3D', fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#98989D', marginTop: 4 },
  signOutButton: { backgroundColor: '#FF3B30', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  signOutText: { fontSize: 16, color: '#FFF', fontWeight: '600' },
});
