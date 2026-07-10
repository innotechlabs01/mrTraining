import dynamic from 'next/dynamic';

const LandingNav = dynamic(
  () => import('@/components/landing/nav').then(m => m.LandingNav),
  { ssr: false }
);
const HeroSection = dynamic(
  () => import('@/components/landing/hero').then(m => m.HeroSection),
  { ssr: false }
);
const PromoMarquee = dynamic(
  () => import('@/components/landing/promo-marquee').then(m => m.PromoMarquee),
  { ssr: false }
);
const AthleteJourneySection = dynamic(
  () => import('@/components/landing/athlete-journey').then(m => m.AthleteJourneySection),
  { ssr: false }
);
const StorytellingSection = dynamic(
  () => import('@/components/landing/storytelling').then(m => m.StorytellingSection),
  { ssr: false }
);
const TransformationSection = dynamic(
  () => import('@/components/landing/transformation').then(m => m.TransformationSection),
  { ssr: false }
);
const ChallengeSection = dynamic(
  () => import('@/components/landing/challenge').then(m => m.ChallengeSection),
  { ssr: false }
);
const FeaturesSection = dynamic(
  () => import('@/components/landing/features').then(m => m.FeaturesSection),
  { ssr: false }
);
const EventsSection = dynamic(
  () => import('@/components/landing/events').then(m => m.EventsSection),
  { ssr: false }
);
const TestimonialsSection = dynamic(
  () => import('@/components/landing/testimonials').then(m => m.TestimonialsSection),
  { ssr: false }
);
const PricingSection = dynamic(
  () => import('@/components/landing/pricing').then(m => m.PricingSection),
  { ssr: false }
);
const FAQSection = dynamic(
  () => import('@/components/landing/faq').then(m => m.FAQSection),
  { ssr: false }
);
const FinalCTACSection = dynamic(
  () => import('@/components/landing/final-cta').then(m => m.FinalCTACSection),
  { ssr: false }
);
const FooterSection = dynamic(
  () => import('@/components/landing/footer').then(m => m.FooterSection),
  { ssr: false }
);

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <PromoMarquee />
        <AthleteJourneySection />
        <StorytellingSection />
        <TransformationSection />
        <ChallengeSection />
        <FeaturesSection />
        <EventsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <FinalCTACSection />
      </main>
      <FooterSection />
    </>
  );
}
