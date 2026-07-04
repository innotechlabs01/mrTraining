import { Result } from '@/shared/lib/result';
import { DomainError } from '@/shared/lib/errors';

export class Email {
  private constructor(private readonly value: string) {}

  static create(input: string): Result<Email, DomainError> {
    const trimmed = input.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return Result.fail(new DomainError('Invalid email address', 'INVALID_EMAIL'));
    }
    return Result.ok(new Email(trimmed.toLowerCase()));
  }

  toString(): string {
    return this.value;
  }
}
