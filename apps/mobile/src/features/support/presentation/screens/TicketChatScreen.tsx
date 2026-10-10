import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../../shared/components/ui/ScreenHeader';
import { Button } from '../../../../../shared/components/ui/Button';
import { supportApi, type SupportTicket, type TicketMessage } from '../../api';
import type { RootStackParamList } from '../../../../../navigation/Navigation';
import { SendIcon, ImageIcon, ChevronRightIcon } from '../../../../../shared/components/icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = { params: { ticketId: string } };

export function TicketChatScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { ticketId } = route.params;
  const flatListRef = useRef<FlatList>(null);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [t, msgs] = await Promise.all([
        supportApi.getTicket(ticketId),
        supportApi.getMessages(ticketId),
      ]);
      setTicket(t);
      setMessages(msgs);
      setUnreadCount(t.unread_count);
    } catch (error) {
      console.error('Load ticket error:', error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const body = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      await supportApi.addMessage(ticketId, { body, image_url: undefined });
      loadData();
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  const handleMarkRead = async () => {
    if (unreadCount > 0) {
      try {
        await supportApi.markRead(ticketId);
        setUnreadCount(0);
        if (ticket) setTicket({ ...ticket, unread_count: 0 });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    }
  };

  useEffect(() => {
    if (unreadCount > 0) {
      handleMarkRead();
    }
  }, [unreadCount]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Ticket" onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={ticket ? `#${ticket.ticket_number} ${ticket.subject}` : 'Ticket'}
        onBack={() => navigation.goBack()}
        right={
          unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={60}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => renderMessage(item)}
          inverted
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Escribe un mensaje..."
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
          />
          <Button
            title=""
            icon={<SendIcon size={20} color={colors.onPrimary} />}
            variant="primary"
            onPress={handleSend}
            disabled={sending || !newMessage.trim()}
            style={styles.sendButton}
            loading={sending}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function renderMessage({ item }: { item: TicketMessage }) {
  const isMine = item.author === 'athlete';
  const time = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es });

  return (
    <View style={[styles.messageWrapper, isMine ? styles.myMessage : styles.otherMessage]}>
      <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
        <Text style={[styles.messageText, isMine ? styles.myText : styles.otherText]}>
          {item.body}
        </Text>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.messageImage} resizeMode="cover" />
        )}
        <Text style={[styles.timestamp, isMine ? styles.myTimestamp : styles.otherTimestamp]}>
          {time}
        </Text>
        {item.read_at && isMine && (
          <Text style={styles.readReceipt}>✓✓ Leído</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBadge: { backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { ...typography.caption, color: colors.onDanger, fontWeight: '600' },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  messageWrapper: { maxWidth: '85%' },
  myMessage: { alignSelf: 'flex-end' },
  otherMessage: { alignSelf: 'flex-start' },
  bubble: { padding: spacing.md, borderRadius: 16, maxWidth: '85%' },
  myBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  messageText: { ...typography.body, lineHeight: 22 },
  myText: { color: colors.onPrimary },
  otherText: { color: colors.text },
  messageImage: { width: 200, height: 200, borderRadius: 8, marginTop: spacing.xs },
  timestamp: { ...typography.caption, marginTop: spacing.xs, opacity: 0.7 },
  myTimestamp: { color: colors.onPrimary, textAlign: 'right' },
  otherTimestamp: { color: colors.textMuted, textAlign: 'left' },
  readReceipt: { ...typography.caption, color: colors.success, marginTop: spacing.xs, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  textInput: { flex: 1, ...typography.body, backgroundColor: colors.base, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44, maxHeight: 120 },
  sendButton: { padding: spacing.sm },
});