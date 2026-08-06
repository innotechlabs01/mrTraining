import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  membership: {
    id: string; planName: string; planPrice: number;
    paymentDueDate: string; currentPeriodEnd: string;
    athleteId: string; coachId: string;
  };
};

export function PaymentScreen({ membership }: Props) {
  const handlePay = async () => {
    Alert.alert('Pagar Membresia', `Pagar $${membership.planPrice} USD por ${membership.planName}. Abrira Paddle checkout.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Pagar ahora', onPress: () => Alert.alert('Pago', 'Redirigiendo a Paddle checkout...') },
    ]);
  };

  const handleContactCoach = () => {
    Alert.alert('Contactar Coach', 'Habla con tu coach para resolver el pago.', [{ text: 'Entendido' }]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}><Text style={styles.iconText}>🔒</Text></View>
        <Text style={styles.title}>Membresia Vencida</Text>
        <Text style={styles.subtitle}>
          Tu plan <Text style={styles.highlight}>{membership.planName}</Text> vencio el{' '}
          {formatDate(membership.currentPeriodEnd || membership.paymentDueDate)}.
          {'\n'}Realiza el pago para continuar.
        </Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan</Text>
            <Text style={styles.infoValue}>{membership.planName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monto</Text>
            <Text style={styles.infoValue}>${membership.planPrice} USD</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vencimiento</Text>
            <Text style={styles.infoValue}>{formatDate(membership.paymentDueDate)}</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.8 }]} onPress={handlePay}>
          <Text style={styles.payText}>Pagar ${membership.planPrice} USD</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.8 }]} onPress={handleContactCoach}>
          <Text style={styles.contactText}>Contactar a mi Coach</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF3B3020', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  iconText: { fontSize: 36 },
  title: { fontSize: 28, color: '#F5F5F7', fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#98989D', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  highlight: { color: '#FF8C3D', fontWeight: '600' },
  infoCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#FF3B3040' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  divider: { height: 1, backgroundColor: '#38383A' },
  infoLabel: { fontSize: 15, color: '#98989D' },
  infoValue: { fontSize: 15, color: '#F5F5F7', fontWeight: '600' },
  payBtn: { backgroundColor: '#FF6B00', height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  payText: { fontSize: 17, color: '#FFF', fontWeight: '700' },
  contactBtn: { backgroundColor: '#1C1C1E', height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#38383A' },
  contactText: { fontSize: 17, color: '#F5F5F7', fontWeight: '600' },
});
