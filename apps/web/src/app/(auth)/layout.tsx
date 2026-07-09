import { ClerkProvider } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#FF6B00',
          colorBackground: '#0A0B0D',
          colorText: '#FFFFFF',
          colorTextSecondary: '#9CA3AF',
          colorInputBackground: '#141416',
          colorInputText: '#FFFFFF',
          borderRadius: '8px',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
