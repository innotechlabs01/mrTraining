import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PencilIcon, UserIcon } from '../../../../../shared/components/icons';
import { colors, radius } from '../../../../../shared/theme/tokens';
import { stepStyles } from './styles';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.profileStep;

type Props = {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  phone: string;
  onNameChange: (fullName: string) => void;
  onNicknameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

export function ProfileStep({
  firstName,
  lastName,
  nickname,
  email,
  phone,
  onNameChange,
  onNicknameChange,
  onEmailChange,
  onPhoneChange,
}: Props) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <View style={stepStyles.choicesInner}>
      <View style={stepStyles.fitBodySubtitleBar}>
        <Text style={stepStyles.fitBodySubtitleText}>
          Completa tus datos para preparar tu plan personalizado.
        </Text>
      </View>

      {/* Avatar placeholder — Figma shows photo with lime pencil badge → MR primary badge */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatarCircle}>
          {initials ? (
            <Text style={styles.avatarInitials}>{initials}</Text>
          ) : (
            <UserIcon size={40} color={colors.textSecondary} />
          )}
        </View>
        <View style={styles.avatarEditBadge}>
          <PencilIcon size={14} color={colors.base} />
        </View>
      </View>

      {/* Full name — combined for Figma compat, splits into first/last for data */}
      <Text style={styles.inputLabel}>{t.fullNameLabel}</Text>
      <View style={styles.inputPill}>
        <TextInput
          value={`${firstName} ${lastName}`.trim()}
          onChangeText={onNameChange}
          placeholder={t.fullNamePlaceholder}
          placeholderTextColor={colors.textSecondary}
          style={styles.inputText}
          autoCapitalize="words"
        />
      </View>

      <Text style={styles.inputLabel}>{t.nicknameLabel}</Text>
      <View style={styles.inputPill}>
        <TextInput
          value={nickname}
          onChangeText={onNicknameChange}
          placeholder={t.nicknamePlaceholder}
          placeholderTextColor={colors.textSecondary}
          style={styles.inputText}
          autoCapitalize="words"
        />
      </View>

      <Text style={styles.inputLabel}>{t.emailLabel}</Text>
      <View style={styles.inputPill}>
        <TextInput
          value={email}
          onChangeText={onEmailChange}
          placeholder="madisons@example.com"
          placeholderTextColor={colors.textSecondary}
          style={styles.inputText}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.inputLabel}>{t.mobileLabel}</Text>
      <View style={styles.inputPill}>
        <TextInput
          value={phone}
          onChangeText={onPhoneChange}
          placeholder="+123 567 89000"
          placeholderTextColor={colors.textSecondary}
          style={styles.inputText}
          keyboardType="phone-pad"
        />
      </View>
      <Text style={stepStyles.rulerHint}>{t.updateLaterHint}</Text>
    </View>
  );
}

// Fill profile — Figma 4.7
const styles = StyleSheet.create({
  avatarWrap: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarInitials: { fontSize: 36, fontWeight: '800', color: colors.text },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 6, marginTop: 6 },
  inputPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  inputText: { fontSize: 15, color: colors.text, fontWeight: '500', padding: 0 },
});
