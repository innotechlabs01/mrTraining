import type { MetricType } from '@/shared/types';

export interface ProgressMetricProps {
  id: string;
  userId: string;
  metricType: MetricType;
  value: number;
  unit: string;
  recordedAt: Date;
}

export class ProgressMetric {
  private constructor(private readonly props: ProgressMetricProps) {}

  static create(props: ProgressMetricProps): ProgressMetric {
    return new ProgressMetric(props);
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get metricType(): MetricType {
    return this.props.metricType;
  }
  get value(): number {
    return this.props.value;
  }
  get unit(): string {
    return this.props.unit;
  }
  get recordedAt(): Date {
    return this.props.recordedAt;
  }

  toJSON() {
    return { ...this.props };
  }
}
