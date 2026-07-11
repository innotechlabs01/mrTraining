import { MockAuthProvider } from '@/features/auth/contexts/MockAuthContext'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <MockAuthProvider>{children}</MockAuthProvider>
}
