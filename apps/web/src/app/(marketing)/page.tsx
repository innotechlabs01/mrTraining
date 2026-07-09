import dynamic from 'next/dynamic';

const LandingNav = dynamic(
  () => import('@/components/landing/nav').then(m => m.LandingNav),
  { ssr: false }
);
const HeroSection = dynamic(
  () => import('@/components/landing/hero').then(m => m.HeroSection),
  { ssr: false }
);
const StorytellingSection = dynamic(
  () => import('@/components/landing/storytelling').then(m => m.StorytellingSection),
  { ssr: false }
);
const ProblemSection = dynamic(
  () => import('@/components/landing/problem').then(m => m.ProblemSection),
  { ssr: false }
);
const TransformationSection = dynamic(
  () => import('@/components/landing/transformation').then(m => m.TransformationSection),
  { ssr: false }
);
const AICoachSection = dynamic(
  () => import('@/components/landing/ai-coach').then(m => m.AICoachSection),
  { ssr: false }
);
const FeaturesSection = dynamic(
  () => import('@/components/landing/features').then(m => m.FeaturesSection),
  { ssr: false }
);
const AthleteJourneySection = dynamic(
  () => import('@/components/landing/athlete-journey').then(m => m.AthleteJourneySection),
  { ssr: false }
);
const CoachJourneySection = dynamic(
  () => import('@/components/landing/athlete-journey').then(m => m.CoachJourneySection),
  { ssr: false }
);
const CommunitySection = dynamic(
  () => import('@/components/landing/community').then(m => m.CommunitySection),
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
const FinalCTASection = dynamic(
  () => import('@/components/landing/final-cta').then(m => m.FinalCTASection),
  { ssr: false }
);
const FooterSection = dynamic(
  () => import('@/components/landing/footer').then(m => m.FooterSection),
  { ssr: false }
);

function SectionFallback() {
  return (
    <div className="w-full h-[400px] bg-surface-1 animate-pulse flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <StorytellingSection />
        <ProblemSection />
        <TransformationSection />
        <AICoachSection />
        <FeaturesSection />
        <AthleteJourneySection />
        <CoachJourneySection />
        <CommunitySection />
        <EventsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </>
  );
}