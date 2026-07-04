import { Button } from '@/components/shared';

const CTA_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDh96mBeXwzWGFAkZdcJ7I1Or9QB_DZ9X3xNvFHuUVcyVHOwEm9XhiOX7W5EGUFIbuU9VwTWmOTcq4HdjGY_JSDxZT9xMR_b7ns1MHdxkxLw8QKR8N6-WkIgvUCoFZ3NFBy4gSm2x2tJiy-uTBDwsioSMgI2HfdATVFOlmbCC0Cy6L66pDfK6k8sasGquB93UzTLEHAGwltLY1VBK4o1wwDWvHIMA_JTyOgV3CqX2Pu2V9ynlRGaINRZLEzjSjXSFiTT4wyvJFQzVv4';

export function CTASection() {
  return (
    <section className="py-section-gap-lg relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${CTA_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-gutter">
        <div className="max-w-2xl">
          <h2 className="font-display-xl text-4xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-6 text-white">
            Ready to <span className="text-electric-orange">Optimize?</span>
          </h2>
          <p className="text-lg text-on-surface-variant mb-10 font-body-lg">
            Stop guessing. Start measuring. Join the elite community and take control of your
            performance trajectory today.
          </p>
          <Button size="lg" className="tracking-[0.2em]">
            Apply for Membership
          </Button>
        </div>
      </div>
    </section>
  );
}
