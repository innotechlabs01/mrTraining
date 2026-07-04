import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { MethodologySection } from '@/components/landing/methodology-section';
import { CommunitySection } from '@/components/landing/community-section';
import { EcosystemSection } from '@/components/landing/ecosystem-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <MethodologySection />
      <CommunitySection />
      <EcosystemSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </>
  );
}
