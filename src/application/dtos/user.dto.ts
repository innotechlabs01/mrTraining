import type { User } from '@/domain/entities';
import type { UserRole } from '@/shared/types';

export interface UserDTO {
  id: string;
  clerkId: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  planTier: string;
}

export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    planTier: user.planTier,
  };
}
