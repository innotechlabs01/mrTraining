import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { StatsBar } from '@/components/landing/stats-bar';
import { EcosystemSection } from '@/components/landing/ecosystem-section';
import { RoadToElite } from '@/components/landing/road-to-elite';
import { AppShowcase } from '@/components/landing/app-showcase';
import { RunningSection } from '@/components/landing/running-section';
import { CoachesSection } from '@/components/landing/coaches-section';
import { TechAdvantage } from '@/components/landing/tech-advantage';
import { PricingSection } from '@/components/landing/pricing-section';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <StatsBar />
      <EcosystemSection />
      <RoadToElite />
      <AppShowcase />
      <RunningSection />
      <CoachesSection />
      <TechAdvantage />
      <PricingSection />
      <CTASection />
      <Footer />
    </>
  );
}
