import { DomainError } from '@/shared/lib/errors';
import { Result } from '@/shared/lib/result';

export class Price {
  private constructor(public readonly cents: number) {}

  static fromCents(cents: number): Result<Price, DomainError> {
    if (!Number.isInteger(cents) || cents <= 0) {
      return Result.fail(
        new DomainError('Price must be a positive integer in cents', 'INVALID_PRICE'),
      );
    }
    return Result.ok(new Price(cents));
  }

  get dollars(): number {
    return this.cents / 100;
  }

  format(currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(this.dollars);
  }
}
