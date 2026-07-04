export class Result<T, E = Error> {
  private constructor(
    private readonly _value: T | null,
    private readonly _error: E | null,
    private readonly _isSuccess: boolean,
  ) {}

  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(value, null, true);
  }

  static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(null, error, false);
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (!this._isSuccess || this._value === null) {
      throw new Error('Cannot get value from a failed result');
    }
    return this._value;
  }

  get error(): E {
    if (this._isSuccess || this._error === null) {
      throw new Error('Cannot get error from a successful result');
    }
    return this._error;
  }

  fold<R>(onSuccess: (value: T) => R, onFailure: (error: E) => R): R {
    if (this._isSuccess) {
      return onSuccess(this._value as T);
    }
    return onFailure(this._error as E);
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess) {
      return Result.ok(fn(this._value as T));
    }
    return Result.fail(this._error as E);
  }
}
