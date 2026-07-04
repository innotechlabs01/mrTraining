import { describe, it, expect } from 'vitest';
import { Price } from './price.vo';

describe('Price', () => {
  it('should create a valid price from cents', () => {
    const price = Price.fromCents(9900);
    expect(price.isSuccess).toBe(true);
    expect(price.value.cents).toBe(9900);
    expect(price.value.dollars).toBe(99);
  });

  it('should fail with negative cents', () => {
    const price = Price.fromCents(-100);
    expect(price.isFailure).toBe(true);
  });

  it('should fail with zero cents', () => {
    const price = Price.fromCents(0);
    expect(price.isFailure).toBe(true);
  });

  it('should format as currency', () => {
    const price = Price.fromCents(19900);
    expect(price.value.format()).toBe('$199.00');
  });

  it('should format large amounts', () => {
    const price = Price.fromCents(34900);
    expect(price.value.format()).toBe('$349.00');
  });
});
