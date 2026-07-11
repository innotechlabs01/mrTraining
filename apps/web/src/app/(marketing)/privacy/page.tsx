import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-3xl mx-auto space-y-10">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-2">Privacy Policy</h1>
        <p className="text-white/60">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-invert max-w-none">
          <h2>1. Data We Collect</h2>
          <p>Account info (name, email), athlete data you enter (performance, health, biometrics), usage analytics, and device data from connected wearables.</p>

          <h2>2. How We Use It</h2>
          <p>To provide the platform, generate AI programs, send notifications, improve features, and comply with legal obligations. We never sell data.</p>

          <h2>3. Data Sharing</h2>
          <p>Only with your consent (integrations), subprocessors (AWS, Vercel, SendGrid under DPA), or legal requirement.</p>

          <h2>4. Your Rights</h2>
          <p>Access, rectify, delete, restrict, port, and object. Email hello@mrtraining.com.</p>

          <h2>5. Retention</h2>
          <p>Account data: while active + 30 days after deletion. Athlete data: per coach instruction or 2 years inactivity.</p>

          <h2>6. Security</h2>
          <p>Encryption at rest (AES-256) and in transit (TLS 1.3). SOC 2 Type II infrastructure. Regular penetration testing.</p>

          <h2>7. International Transfers</h2>
          <p>Standard Contractual Clauses for non-EEA transfers.</p>

          <h2>8. Contact</h2>
          <p>hello@mrtraining.com</p>
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}