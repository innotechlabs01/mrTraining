import type { PlanTier, UserRole } from '@/shared/types';

export interface UserProps {
  id: string;
  clerkId: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }
  get clerkId(): string {
    return this.props.clerkId;
  }
  get email(): string {
    return this.props.email;
  }
  get fullName(): string {
    return this.props.fullName;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get planTier(): PlanTier {
    if (this.props.role === 'admin') return 'pro';
    return (this.props.role as PlanTier) || 'starter';
  }

  canAccess(tier: PlanTier): boolean {
    const tiers: PlanTier[] = ['starter', 'elite', 'pro'];
    return tiers.indexOf(this.planTier) >= tiers.indexOf(tier);
  }

  toJSON() {
    return { ...this.props };
  }
}
