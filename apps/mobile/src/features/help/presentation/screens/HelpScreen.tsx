import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { SegmentedFilter } from '../../../../shared/components/ui/SegmentedFilter';
import { ListCard } from '../../../../shared/components/ui/ListCard';
import { Card } from '../../../../shared/components/ui/Card';
import {
  HelpIcon,
  ChatIcon,
  TargetIcon,
  ChevronRightIcon,
} from '../../../../shared/components/icons';
import type { RootStackParamList } from '../../../../navigation/Navigation';

type HelpTab = 'faq' | 'contact';

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
  { icon: <ChatIcon size={20} />, label: 'Atención al cliente', url: 'mailto:support@mr-training.com' },
  { icon: <TargetIcon size={20} />, label: 'Sitio web', url: 'https://mr-training.com' },
];

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: '¿Cómo restablezco mi contraseña?',
    answer:
      'Andá a Configuración > Contraseña y seguí las instrucciones. Se envía un enlace de restablecimiento a tu correo registrado.',
  },
  {
    id: '2',
    question: '¿Cómo contacto a mi entrenador?',
    answer:
      'Usá la función de mensajería dentro de tu plan de entrenamiento. Andá a la pestaña de Entrenador y enviá un mensaje directamente.',
  },
  {
    id: '3',
    question: '¿Puedo cambiar mi horario de entrenamiento?',
    answer:
      'Sí. Andá a Perfil > Horario de entrenamiento para elegir los días y el horario que prefieras.',
  },
  {
    id: '4',
    question: '¿Cómo cancelo mi membresía?',
    answer:
      'Abre tu Perfil y toca Membresía para gestionar tu plan. Puedes cancelar antes del próximo ciclo de facturación.',
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
      Alert.alert(row.label, 'Próximamente');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(row.url);
      if (canOpen) await Linking.openURL(row.url);
      else Alert.alert(row.label, 'No se pudo abrir este enlace.');
    } catch {
      Alert.alert(row.label, 'Algo salió mal. Intenta de nuevo.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Ayuda" onBack={() => navigation.goBack()} />

      <View style={styles.tabRow}>
        <SegmentedFilter
          options={[
            { key: 'faq', label: 'Preguntas' },
            { key: 'contact', label: 'Contacto' },
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
});
