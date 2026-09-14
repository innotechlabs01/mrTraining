import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMessages, sendMessage } from '../../communityService';
import { colors, spacing, radius, typography, fontFamilies } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { ChatIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DiscussionForumScreen() {
  const navigation = useNavigation<Nav>();
  const [inputText, setInputText] = useState('');
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['community-messages'],
    queryFn: () => listMessages('default'),
    staleTime: 10_000,
  });

  const sendMessageMut = useMutation({
    mutationFn: async (text: string) => sendMessage('default', text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-messages'] });
      setInputText('');
    },
  });

  const canSend = inputText.trim().length > 0 && !sendMessageMut.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Foro de discusión" onBack={() => navigation.goBack()} />

      <View style={styles.topicSection}>
        <ChatIcon size={16} color={colors.textSecondary} />
        <Text style={styles.topicTitle}>Conversación</Text>
      </View>

      <ScrollView contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Skeleton.List rows={6} height={56} />
        ) : (messages ?? []).length === 0 ? (
          <EmptyState
            variant="empty"
            title="Sin mensajes todavía"
            message="Iniciá la conversación con un mensaje."
          />
        ) : (
          (messages ?? []).map((m) => (
            <View key={m.id} style={styles.messageRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{m.userName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.messageBody}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageName}>{m.userName}</Text>
                  <Text style={styles.messageTime}>{formatTimeAgo(m.createdAt)}</Text>
                </View>
                <Text style={styles.messageText}>{m.message}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.textSecondary}
          style={styles.inputField}
          multiline={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          disabled={!canSend}
          style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed, !canSend && styles.sendButtonDisabled]}
          onPress={() => {
            if (canSend) sendMessageMut.mutate(inputText.trim());
          }}
        >
          <Text style={styles.sendIcon}>{'➤'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  topicSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topicTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  messagesContent: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  messageRow: { flexDirection: 'row', gap: spacing.sm },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fontFamilies.bodyBold, fontSize: 14, color: colors.base },
  messageBody: { flex: 1, gap: 4 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  messageName: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, color: colors.textSecondary },
  messageTime: { fontFamily: fontFamilies.bodyMedium, fontSize: 11, color: colors.textSecondary },
  messageText: { fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 22, color: colors.text },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingLeft: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  inputField: { flex: 1, fontFamily: fontFamilies.body, fontSize: 15, color: colors.text },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  sendButtonPressed: { backgroundColor: colors.primaryPressed },
  sendButtonDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 14, color: colors.base },
});

export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}
