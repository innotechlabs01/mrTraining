import { ClerkProviderClient } from '@/features/auth/components/ClerkProviderClient';

export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProviderClient>{children}</ClerkProviderClient>;
}
