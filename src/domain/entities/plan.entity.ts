import type { PlanTier } from '@/shared/types';

export interface PlanProps {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceAnnual: number | null;
  features: string[];
  stripePriceIdMonthly: string;
  stripePriceIdAnnual: string | null;
  isFeatured: boolean;
  sortOrder: number;
}

export class Plan {
  private constructor(private readonly props: PlanProps) {}

  static create(props: PlanProps): Plan {
    return new Plan(props);
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get slug(): string { return this.props.slug; }
  get priceMonthly(): number { return this.props.priceMonthly; }
  get priceAnnual(): number | null { return this.props.priceAnnual; }
  get features(): string[] { return this.props.features; }
  get stripePriceIdMonthly(): string { return this.props.stripePriceIdMonthly; }
  get stripePriceIdAnnual(): string | null { return this.props.stripePriceIdAnnual; }
  get isFeatured(): boolean { return this.props.isFeatured; }
  get sortOrder(): number { return this.props.sortOrder; }

  get tier(): PlanTier {
    return this.props.slug as PlanTier;
  }

  get monthlyPriceFormatted(): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(this.props.priceMonthly / 100);
  }

  toJSON() {
    return {
      ...this.props,
      monthlyPriceFormatted: this.monthlyPriceFormatted,
    };
  }
}
