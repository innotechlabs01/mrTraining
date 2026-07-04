import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-surface-container border border-outline-variant/30 shadow-2xl',
            headerTitle: 'text-on-surface',
            headerSubtitle: 'text-muted-gray',
            socialButtonsBlockButton: 'bg-surface-container-highest border-outline-variant/30 text-on-surface hover:bg-surface-bright',
            formFieldLabel: 'text-on-surface',
            formFieldInput: 'bg-surface-container-lowest border-outline-variant text-on-surface',
            dividerLine: 'bg-outline-variant',
            dividerText: 'text-muted-gray',
            formButtonPrimary: 'bg-electric-orange hover:opacity-90',
            footerActionLink: 'text-velocity-blue hover:text-electric-orange',
          },
        }}
      />
    </div>
  );
}
