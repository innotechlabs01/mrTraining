import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMessages, sendMessage, type CommunityMessage } from '../../communityService';
import { colors, spacing, radius, fontFamilies } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { ChatIcon, SendIcon } from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.discussionForum;

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MessageRow = React.memo(function MessageRow({ item }: { item: CommunityMessage }) {
  return (
    <View style={styles.messageRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.messageBody}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageName}>{item.userName}</Text>
          <Text style={styles.messageTime}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.messageText}>{item.message}</Text>
      </View>
    </View>
  );
});

function keyExtractor(item: CommunityMessage): string {
  return item.id;
}

function renderMessage({ item }: { item: CommunityMessage }) {
  return <MessageRow item={item} />;
}

export function DiscussionForumScreen() {
  const navigation = useNavigation<Nav>();
  const [inputText, setInputText] = useState('');
  const queryClient = useQueryClient();

  const { data: messages, isLoading, isError, refetch } = useQuery({
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

  const handleSend = useCallback(() => {
    if (canSend) sendMessageMut.mutate(inputText.trim());
  }, [canSend, inputText, sendMessageMut]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t.headerTitle} onBack={() => navigation.goBack()} />

      <View style={styles.topicSection}>
        <ChatIcon size={16} color={colors.textSecondary} />
        <Text style={styles.topicTitle}>{t.conversation}</Text>
      </View>

      {isLoading ? (
        <View style={styles.messagesContent}>
          <Skeleton.List rows={6} height={56} />
        </View>
      ) : (
        <FlashList
          data={messages ?? []}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isError ? (
              <EmptyState
                variant="error"
                title={t.errorTitle}
                message={t.errorMessage}
                onRetry={() => refetch()}
              />
            ) : (
              <EmptyState
                variant="empty"
                title={t.emptyTitle}
                message={t.emptyMessage}
              />
            )
          }
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={t.inputPlaceholder}
          placeholderTextColor={colors.textSecondary}
          style={styles.inputField}
          multiline={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.send}
          disabled={!canSend}
          style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
        >
          <SendIcon size={18} color={colors.base} />
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
