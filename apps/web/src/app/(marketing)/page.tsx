import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymHero } from '@/components/iron-gym/hero';
import { IronGymStats } from '@/components/iron-gym/stats';
import { IronGymWhyChooseUs } from '@/components/iron-gym/why-choose-us';
import { IronGymAbout } from '@/components/iron-gym/about';
import { IronGymTrainers } from '@/components/iron-gym/trainers';
import { IronGymPlans } from '@/components/iron-gym/plans';
import { IronGymTestimonials } from '@/components/iron-gym/testimonials';
import { IronGymFooter } from '@/components/iron-gym/footer';

export default function MarketingPage() {
  return (
    <main>
      <IronGymNavbar />
      <IronGymHero />
      <IronGymStats />
      <IronGymWhyChooseUs />
      <IronGymAbout />
      <IronGymTrainers />
      <IronGymPlans />
      <IronGymTestimonials />
      <IronGymFooter />
    </main>
  );
}
