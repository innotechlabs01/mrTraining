import type { SubscriptionStatus } from '@/shared/types';

export interface SubscriptionProps {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}

export class Subscription {
  private constructor(private readonly props: SubscriptionProps) {}

  static create(props: SubscriptionProps): Subscription {
    return new Subscription(props);
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get planId(): string {
    return this.props.planId;
  }
  get status(): SubscriptionStatus {
    return this.props.status;
  }
  get paddleSubscriptionId(): string {
    return this.props.paddleSubscriptionId;
  }
  get paddleCustomerId(): string {
    return this.props.paddleCustomerId;
  }
  get currentPeriodStart(): Date {
    return this.props.currentPeriodStart;
  }
  get currentPeriodEnd(): Date {
    return this.props.currentPeriodEnd;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isActive(): boolean {
    return this.props.status === 'active' || this.props.status === 'trialing';
  }

  toJSON() {
    return {
      ...this.props,
      isActive: this.isActive,
    };
  }
}
