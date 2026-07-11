'use client';

import { IronGymNavbar } from '@/components/iron-gym/navbar';
import { IronGymHero } from '@/components/iron-gym/hero';
import { IronGymStats } from '@/components/iron-gym/stats';
import { IronGymWhyChooseUs } from '@/components/iron-gym/why-choose-us';
import { IronGymAbout } from '@/components/iron-gym/about';
import { IronGymTrainers } from '@/components/iron-gym/trainers';
import { IronGymPlans } from '@/components/iron-gym/plans';
import { IronGymTestimonials } from '@/components/iron-gym/testimonials';
import { IronGymFooter } from '@/components/iron-gym/footer';
import { IronGymServices } from '@/components/iron-gym/services';
import { IronGymPrograms } from '@/components/iron-gym/programs';
import { IronGymSupport } from '@/components/iron-gym/support';
import { IronGymMore } from '@/components/iron-gym/more';

export default function MarketingPage() {
  return (
    <main>
      <IronGymNavbar />
      <IronGymHero />
      <IronGymStats />
      <IronGymWhyChooseUs />
      <IronGymAbout />
      <IronGymServices />
      <IronGymPrograms />
      <IronGymTrainers />
      <IronGymPlans />
      <IronGymTestimonials />
      <IronGymSupport />
      <IronGymMore />
      <IronGymFooter />
    </main>
  );
}