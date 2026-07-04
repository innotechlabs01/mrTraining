import { describe, it, expect } from 'vitest';
import { Email } from './email.vo';

describe('Email', () => {
  it('should create a valid email', () => {
    const email = Email.create('test@example.com');
    expect(email.isSuccess).toBe(true);
  });

  it('should fail with invalid email', () => {
    const email = Email.create('not-an-email');
    expect(email.isFailure).toBe(true);
    expect(email.error.code).toBe('INVALID_EMAIL');
  });

  it('should fail with empty string', () => {
    const email = Email.create('');
    expect(email.isFailure).toBe(true);
  });

  it('should return string value via toString()', () => {
    const email = Email.create('test@example.com');
    expect(email.value.toString()).toBe('test@example.com');
  });

  it('should trim whitespace', () => {
    const email = Email.create('  test@example.com  ');
    expect(email.value.toString()).toBe('test@example.com');
  });
});
