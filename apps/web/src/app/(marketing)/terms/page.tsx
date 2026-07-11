import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <IronGymNavbar />
      <section className="pt-32 pb-16 px-6 max-w-3xl mx-auto space-y-10">
        <h1 className="text-4xl lg:text-5xl font-bold font-display text-white mb-2">Terms of Service</h1>
        <p className="text-white/60">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-invert max-w-none">
          <h2>1. Acceptance</h2>
          <p>By using MR Training, you agree to these Terms. If you disagree, do not use the platform.</p>

          <h2>2. Accounts</h2>
          <p>You are responsible for credentials and activity. Must be 18+. One account per person.</p>

          <h2>3. Coach Responsibilities</h2>
          <p>You are responsible for programs you assign, athlete safety, and compliance with local laws. MR Training provides tools, not medical advice.</p>

          <h2>4. Subscriptions</h2>
          <p>Monthly/annual billing. Cancel anytime. No refunds for partial months. Prices may change with 30 days notice.</p>

          <h2>5. Intellectual Property</h2>
          <p>You own your content. MR Training owns the platform. You grant us a license to host/process your content.</p>

          <h2>6. Prohibited Uses</h2>
          <p>No illegal activity, reverse engineering, scraping, spam, or transmitting malware.</p>

          <h2>7. Disclaimer</h2>
          <p>Platform provided "as is". No warranty of uninterrupted or error-free service. Not a substitute for professional medical advice.</p>

          <h2>8. Limitation of Liability</h2>
          <p>Max liability: fees paid in last 12 months. No liability for indirect, incidental, or consequential damages.</p>

          <h2>9. Termination</h2>
          <p>We may suspend/terminate for breach. You may delete account anytime.</p>

          <h2>10. Governing Law</h2>
          <p>Delaware, USA. Exclusive jurisdiction: Delaware courts.</p>

          <h2>11. Changes</h2>
          <p>We may update Terms. Material changes notified via email/in-app 30 days prior.</p>

          <h2>12. Contact</h2>
          <p>hello@mrtraining.com</p>
        </div>
      </section>
      <IronGymFooter />
    </main>
  );
}