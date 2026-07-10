import { HeroSection } from '@/components/ui-ux-pro-max/hero';
import { FeaturesSection } from '@/components/ui-ux-pro-max/features';
import { HowItWorksSection } from '@/components/ui-ux-pro-max/how-it-works';
import { IntegrationsSection } from '@/components/ui-ux-pro-max/integrations';
import { PricingSection } from '@/components/ui-ux-pro-max/pricing';
import { CtaSection } from '@/components/ui-ux-pro-max/cta';
import { FooterSection } from '@/components/ui-ux-pro-max/footer';

export default function UiUxProMaxPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <IntegrationsSection />
      <PricingSection />
      <CtaSection />
      <FooterSection />
    </>
  );
}
