import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../../shared/theme/tokens';
import { CardIcon } from '../../../../shared/components/icons';
import { ListCard } from '../../../../shared/components/ui/ListCard';

type PaymentItem = {
  id: string;
  amount: number;
  date?: string;
  paymentDate?: string;
  createdAt?: string;
  status?: string;
  transactionId?: string;
  reference?: string;
};

type Props = {
  payments: PaymentItem[];
};

function formatCurrency(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function PaymentHistoryList({ payments }: Props) {
  if (payments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ListCard
          title="Sin pagos aún"
          leadingIcon={<CardIcon size={20} color={colors.textSecondary} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {payments.map((p) => {
        const payDate = p.date ?? p.paymentDate ?? p.createdAt ?? '';
        const txn = p.transactionId ?? p.reference ?? p.id ?? '';
        const truncatedTxn = txn.length > 12 ? `${txn.slice(0, 12)}…` : txn;
        const isLast = p.id === payments[payments.length - 1]?.id;

        return (
          <ListCard
            key={p.id}
            title={`${formatCurrency(p.amount)} · ${formatDate(payDate)}`}
            subtitle={truncatedTxn || undefined}
            leadingIcon={<CardIcon size={20} color={colors.textSecondary} />}
            last={isLast}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { gap: spacing.md },
  list: { gap: spacing.sm },
});
