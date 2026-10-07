import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { BellIcon, LockIcon, UserIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.settingsScreen;

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();

  const handleDeleteAccount = () => {
    Alert.alert(t.deleteAccountLabel, t.deleteConfirm, [
      { text: texts.common.cancel, style: 'cancel' },
      {
        text: texts.common.delete,
        style: 'destructive',
        onPress: () => Alert.alert('Cuenta eliminada', 'La eliminación de cuenta aún no está disponible.'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScreenHeader title={t.title} onBack={() => navigation.goBack()} />

        <ListCard
          title={t.notificationsLabel}
          subtitle={t.notificationsDesc}
          leadingIcon={<BellIcon size={20} />}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <ListCard
          title={t.passwordLabel}
          subtitle={t.passwordDesc}
          leadingIcon={<LockIcon size={20} />}
          onPress={() => navigation.navigate('PasswordSettings')}
        />
        <ListCard
          title={t.deleteAccountLabel}
          subtitle={t.deleteAccountDesc}
          leadingIcon={<UserIcon size={20} color={colors.error} />}
          onPress={handleDeleteAccount}
          last
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  content: { flex: 1, padding: spacing.md, gap: spacing.sm },
});
