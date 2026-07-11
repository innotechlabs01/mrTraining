import { HeroSection } from '@/components/ui-ux-pro-max/hero';
import { TrustBarSection } from '@/components/ui-ux-pro-max/trust-bar';
import { FeaturesSection } from '@/components/ui-ux-pro-max/features';
import { HowItWorksSection } from '@/components/ui-ux-pro-max/how-it-works';
import { IntegrationsSection } from '@/components/ui-ux-pro-max/integrations';
import { TestimonialsSection } from '@/components/ui-ux-pro-max/testimonials';
import { PricingSection } from '@/components/ui-ux-pro-max/pricing';
import { FaqSection } from '@/components/ui-ux-pro-max/faq';
import { CtaSection } from '@/components/ui-ux-pro-max/cta';
import { FooterSection } from '@/components/ui-ux-pro-max/footer';

export default function UiUxProMaxPage() {
  return (
    <>
      <HeroSection />
      <TrustBarSection />
      <FeaturesSection />
      <HowItWorksSection />
      <IntegrationsSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <FooterSection />
    </>
  );
}
