import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../../shared/components/ui/ScreenHeader';
import { Button } from '../../../../../shared/components/ui/Button';
import { Input } from '../../../../../shared/components/ui/Input';
import { Select } from '../../../../../shared/components/ui/Select';
import { supportApi, type CreateTicketRequest } from '../../api';
import type { RootStackParamList } from '../../../../../navigation/Navigation';

const CATEGORIES = [
  { value: 'problem', label: 'Problema técnico' },
  { value: 'question', label: 'Pregunta general' },
  { value: 'feature', label: 'Sugerencia / Feature' },
  { value: 'billing', label: 'Facturación / Pagos' },
  { value: 'technical', label: 'Error en la app' },
  { value: 'other', label: 'Otro' },
];

const PRIORITIES = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CreateTicketScreen() {
  const navigation = useNavigation<Nav>();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('problem');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'El asunto es obligatorio');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Error', 'El mensaje es obligatorio');
      return;
    }

    setLoading(true);
    try {
      await supportApi.createTicket({
        subject: subject.trim(),
        body: body.trim(),
        category,
        priority,
      });
      Alert.alert('Ticket creado', 'Tu ticket ha sido enviado. El equipo de soporte te responderá pronto.');
      navigation.goBack();
    } catch (error) {
      console.error('Create ticket error:', error);
      Alert.alert('Error', 'No se pudo crear el ticket. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Nuevo ticket" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.scrollContainer}
        keyboardVerticalOffset={60}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Asunto *</Text>
          <Input
            value={subject}
            onChangeText={setSubject}
            placeholder="Describe brevemente el problema"
            style={styles.input}
            maxLength={100}
          />

          <Text style={styles.sectionLabel}>Categoría</Text>
          <Select
            value={category}
            onValueChange={setCategory}
            options={CATEGORIES}
            style={styles.select}
          />

          <Text style={styles.sectionLabel}>Prioridad</Text>
          <Select
            value={priority}
            onValueChange={setPriority}
            options={PRIORITIES}
            style={styles.select}
          />

          <Text style={styles.sectionLabel}>Mensaje *</Text>
          <Input
            value={body}
            onChangeText={setBody}
            placeholder="Describe el problema con detalle..."
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          <View style={styles.buttonRow}>
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={styles.button}
            />
            <Button
              title={loading ? 'Enviando...' : 'Enviar ticket'}
              variant="primary"
              onPress={handleSubmit}
              disabled={loading}
              style={styles.button}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scrollContainer: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.bodyStrong, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.lg },
  input: { marginBottom: spacing.md },
  textArea: { minHeight: 140, paddingTop: spacing.sm },
  select: { marginBottom: spacing.md },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.xl },
  button: { flex: 1 },
});