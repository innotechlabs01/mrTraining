import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { Card } from '../../../../shared/components/ui/Card';
import {
  ChatIcon,
  TargetIcon,
  ChevronRightIcon,
  TicketIcon,
} from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { texts } from '../../../../shared/i18n/texts';

const t = texts.screens.helpScreen;

type HelpTab = 'faq' | 'contact' | 'myTickets';

type ContactRow = {
  icon: React.ReactNode;
  label: string;
  url?: string;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

const CONTACT_ROWS: ContactRow[] = [
  { icon: <ChatIcon size={20} />, label: t.supportLabel, url: 'mailto:support@mr-training.com' },
  { icon: <TargetIcon size={20} />, label: t.websiteLabel, url: 'https://mr-training.com' },
];

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: t.faqPassword,
    answer: t.faqPasswordAnswer,
  },
  {
    id: '2',
    question: t.faqCoach,
    answer: t.faqCoachAnswer,
  },
  {
    id: '3',
    question: t.faqSchedule,
    answer: t.faqScheduleAnswer,
  },
  {
    id: '4',
    question: t.faqCancel,
    answer: t.faqCancelAnswer,
  },
];

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HelpScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<HelpTab>('faq');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleContactPress = async (row: ContactRow) => {
    if (!row.url) {
      Alert.alert(row.label, t.comingSoon);
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(row.url);
      if (canOpen) await Linking.openURL(row.url);
      else Alert.alert(row.label, t.openFailed);
    } catch {
      Alert.alert(row.label, t.genericError);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t.title} onBack={() => navigation.goBack()} />

      <View style={styles.tabRow}>
        <SegmentedFilter
          options={[
            { key: 'faq', label: t.tabFaq },
            { key: 'contact', label: t.tabContact },
            { key: 'myTickets', label: t.tabMyTickets },
          ]}
          value={tab}
          onChange={(key) => setTab(key as HelpTab)}
        />
      </View>

      <View style={styles.bodyWrap}>
        {tab === 'faq' ? (
          <Card style={styles.card}>
            {FAQ_DATA.map((item, i) => {
              const expanded = expandedId === item.id;
              return (
                <React.Fragment key={item.id}>
                  <Pressable
                    style={({ pressed }) => [styles.faqRow, pressed && styles.pressed]}
                    onPress={() => toggleFaq(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={item.question}
                    accessibilityState={{ expanded }}
                  >
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <ChevronRightIcon
                      size={18}
                      color={colors.primary}
                    />
                  </Pressable>
                  {expanded ? (
                    <View style={styles.faqAnswerWrap}>
                      <Text style={styles.faqAnswer}>{item.answer}</Text>
                    </View>
                  ) : null}
                  {i < FAQ_DATA.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              );
            })}
          </Card>
        ) : tab === 'myTickets' ? (
          <View style={styles.myTicketsWrap}>
            <Pressable
              style={styles.myTicketsCard}
              onPress={() => navigation.navigate('MyTickets')}
              accessibilityRole="button"
              accessibilityLabel={t.tabMyTickets}
            >
              <View style={styles.myTicketsHeader}>
                <TicketIcon size={24} color={colors.primary} />
                <View style={styles.myTicketsInfo}>
                  <Text style={styles.myTicketsTitle}>{t.tabMyTickets}</Text>
                  <Text style={styles.myTicketsSubtitle}>
                    Gestiona tus tickets de soporte, crea nuevos y chatea con el equipo.
                  </Text>
                </View>
                <ChevronRightIcon size={20} color={colors.textMuted} />
              </View>
            </Pressable>
            <View style={styles.contactList}>
              {CONTACT_ROWS.map((row) => (
                <ListCard
                  key={row.label}
                  title={row.label}
                  leadingIcon={row.icon}
                  onPress={() => handleContactPress(row)}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.contactList}>
            {CONTACT_ROWS.map((row) => (
              <ListCard
                key={row.label}
                title={row.label}
                leadingIcon={row.icon}
                onPress={() => handleContactPress(row)}
              />
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  tabRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  bodyWrap: { flex: 1, padding: spacing.md },
  card: { padding: 0, overflow: 'hidden' },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.md,
  },
  faqQuestion: { flex: 1, ...typography.bodyStrong, color: colors.text },
  faqAnswerWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  faqAnswer: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.md },
  contactList: { gap: spacing.sm },
  pressed: { opacity: 0.8 },
  myTicketsWrap: { flex: 1 },
  myTicketsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  myTicketsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  myTicketsInfo: { flex: 1 },
  myTicketsTitle: { ...typography.bodyStrong, color: colors.text },
  myTicketsSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  contactList: { gap: spacing.sm },
});

export default HelpScreen;