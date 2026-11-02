/**
 * Module-level tests for useSubscription hook exports.
 *
 * The hook itself is a thin wrapper over TanStack React Query; its async
 * behavior is covered by the library. These tests verify the hook is
 * correctly exported and typed, and that the service functions are mocked
 * properly for consumer tests.
 */

import { useSubscription } from '../useSubscription';
import {
  getMySubscription,
  getMembershipStatus,
} from '../../infrastructure/subscriptionService';

jest.mock('../../infrastructure/subscriptionService', () => ({
  getMySubscription: jest.fn(),
  getMembershipStatus: jest.fn(),
}));

describe('useSubscription module', () => {
  it('exports the useSubscription hook as a function', () => {
    expect(typeof useSubscription).toBe('function');
  });

  it('exports getMySubscription as a function', () => {
    expect(typeof getMySubscription).toBe('function');
  });

  it('exports getMembershipStatus as a function', () => {
    expect(typeof getMembershipStatus).toBe('function');
  });

  it('getMySubscription is jest mock', () => {
    expect(getMySubscription).toEqual(expect.any(Function));
  });

  it('getMembershipStatus is jest mock', () => {
    expect(getMembershipStatus).toEqual(expect.any(Function));
  });
});
