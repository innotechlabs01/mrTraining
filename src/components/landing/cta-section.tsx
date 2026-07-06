import { Button } from '@/components/shared';

const CTA_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDh96mBeXwzWGFAkZdcJ7I1Or9QB_DZ9X3xNvFHuUVcyVHOwEm9XhiOX7W5EGUFIbuU9VwTWmOTcq4HdjGY_JSDxZT9xMR_b7ns1MHdxkxLw8QKR8N6-WkIgvUCoFZ3NFBy4gSm2x2tJiy-uTBDwsioSMgI2HfdATVFOlmbCC0Cy6L66pDfK6k8sasGquB93UzTLEHAGwltLY1VBK4o1wwDWvHIMA_JTyOgV3CqX2Pu2V9ynlRGaINRZLEzjSjXSFiTT4wyvJFQzVv4';

export function CTASection() {
  return (
    <section className="py-[120px] relative overflow-hidden bg-[#131315]">
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${CTA_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#131315] via-[#131315]/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display-xl text-4xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-6 text-white">
            The best time to start was <span className="text-[#FF5C00]">Yesterday.</span>
            <br />
            The second best time is <span className="text-[#007AFF]">Now.</span>
          </h2>
          <p className="text-lg text-[#8E8E93] mb-10 font-body-lg">
            Risk-Free 14-Day Performance Evaluation
          </p>
          <Button size="lg" className="tracking-[0.2em]">
            Join the Ecosystem
          </Button>
        </div>
      </div>
    </section>
  );
}
