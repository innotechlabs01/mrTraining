import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymHero } from '@/components/iron-gym/hero';
import { IronGymWhyChooseUs } from '@/components/iron-gym/why-choose-us';
import { IronGymAbout } from '@/components/iron-gym/about';
import { IronGymTrainers } from '@/components/iron-gym/trainers';
import { IronGymTestimonials } from '@/components/iron-gym/testimonials';
import { IronGymCta } from '@/components/iron-gym/cta';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function MarketingPage() {
  return (
    <main className="bg-black">
      <IronGymNavbar />
      <IronGymHero />
      <IronGymWhyChooseUs />
      <IronGymAbout />
      <IronGymTrainers />
      <IronGymTestimonials />
      <IronGymCta />
      <IronGymFooter />
    </main>
  );
}
