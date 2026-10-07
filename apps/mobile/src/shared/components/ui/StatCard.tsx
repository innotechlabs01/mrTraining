import React from 'react';
import { MetricCard } from './MetricCard';

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  loading?: boolean;
};

/**
 * @deprecated Use MetricCard (size="lg") instead.
 * Kept as an alias so existing consumers keep working; renders the MetricCard lg variant.
 */
export function StatCard({ label, value, unit, loading = false }: Props) {
  return <MetricCard label={label} value={value} unit={unit} size="lg" loading={loading} />;
}
