import { AuthProvider } from '@/features/auth/contexts/MockAuthContext'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
