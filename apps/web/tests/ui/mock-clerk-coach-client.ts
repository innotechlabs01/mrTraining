import { Page } from '@playwright/test';

/**
 * Coach user id used by the client-side Clerk mock. Matches the user
 * provisioned in the Clerk dev instance and used by setup-clerk-coach.
 */
const COACH_CLERK_USER_ID =
  process.env.E2E_COACH_CLERK_USER_ID || 'user_3KTNABTDQC8kDXc0i5kZpUDXHLI';

/**
 * Injects a client-side Clerk mock via Playwright `page.addInitScript()` so it
 * runs BEFORE the page (and ClerkProvider) hydrates.
 *
 * Sets `window.Clerk` to a mock object with a `.load()` method. When
 * `@clerk/nextjs` v6's `loadClerkJS()` runs during hydration it finds
 * `window.Clerk` already present (passes `isClerkProperlyLoaded()`), skips
 * loading the real `clerk.browser.js` from clerk.accounts.dev (avoiding the
 * 307 preflight CORS failure from localhost:3000), calls our `.load()` which
 * populates `session`/`user`/`isSignedIn`, then `hydrateClerkJS()` installs
 * our object as `clerkjs`. `useAuth()` then resolves to
 * `{ isSignedIn: true, isLoaded: true, user, session }` without any client
 * connection to Clerk.
 *
 * Test infrastructure only. No production imports.
 *
 * @param page - Playwright Page instance
 */
export async function mockUseAuth(page: Page): Promise<void> {
  await page.addInitScript(
    (coachUserId: string) => {
      const session = {
        id: 'sess_qa_coach',
        status: 'active',
        user_id: coachUserId,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        expire_at: '2027-01-01T00:00:00.000Z',
        abandon_at: null,
        last_active_at: '2026-01-01T00:00:00.000Z',
        client: { id: 'client_qa' },
        lastActiveToken: {
          jwt: {
            claims: {
              sub: coachUserId,
              sid: 'sess_qa_coach',
              iss: 'https://clerk.accounts.dev',
              aud: coachUserId,
              role: 'coach',
            },
          },
        },
      };

      const user = {
        id: coachUserId,
        email_addresses: [
          {
            id: 'idn_qa',
            email_address: 'innotechlabssas@gmail.com',
            verification: { status: 'verified' },
          },
        ],
        first_name: 'QA',
        last_name: 'Coach',
        username: null,
        gender: null,
        phone_numbers: [],
        profile_image_url: null,
        primary_email_address_id: 'idn_qa',
        primary_phone_number_id: null,
        primary_email_address: 'innotechlabssas@gmail.com',
        two_factor_enabled: false,
        external_accounts: [],
        saml_accounts: [],
        web3_wallets: [],
        password_enabled: true,
        has_mfa_enabled: false,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        last_sign_in_at: '2026-01-01T00:00:00.000Z',
        attributes: {},
        role: 'coach',
        organization_id: null,
        organization_invitation_id: null,
        organization_memberships: [],
      };

      const client = {
        id: 'client_qa',
        session,
        user,
        lastActiveSessionId: session.id,
        organization: null,
        organizationInvitations: [],
        organizationMemberships: [],
        provisioned: true,
      };

      const listeners: Array<(e: unknown) => void> = [];

      interface MockClerk {
        loaded: boolean;
        session: unknown;
        user: unknown;
        isSignedIn: boolean;
        client: unknown;
        organization: unknown;
        __internal_state: unknown;
        telemetry: { record: () => undefined };
        frontendApi: string;
        instanceType: string;
        isStandardBrowser: boolean;
        sdkMetadata: { name: string; version: string; environment: string };
        load(): Promise<void>;
        addListener(listener: (e: unknown) => void): () => void;
      }

      (window as unknown as Record<string, unknown>).Clerk = {
        loaded: false,
        session: null,
        user: null,
        isSignedIn: false,
        client: null,
        organization: null,
        __internal_state: null,
        telemetry: { record: () => undefined },
        frontendApi: '',
        instanceType: 'production',
        isStandardBrowser: true,
        sdkMetadata: {
          name: '@clerk/clerk-react',
          version: '5.61.8',
          environment: 'test',
        },
        async load(): Promise<void> {
          this.loaded = true;
          this.session = session;
          this.user = user;
          this.isSignedIn = true;
          this.client = client;
          // Notify ClerkProvider's auth-state listeners so the React
          // derived state (session/user) flips to signed-in and useAuth()
          // resolves to { isSignedIn: true, isLoaded: true }.
          const authEvent = { session, user, client, organization: null };
          listeners.forEach((l) => l(authEvent));
        },
        addListener(listener: (e: unknown) => void): () => void {
          listeners.push(listener);
          // If already loaded, notify the listener of the current signed-in
          // state. Deferred so setState isn't invoked synchronously inside
          // addListener (it is called from ClerkContextProvider's useEffect).
          if (this.loaded) {
            setTimeout(() => {
              listener({ session, user, client, organization: null });
            }, 0);
          }
          return () => {
            const idx = listeners.indexOf(listener);
            if (idx >= 0) listeners.splice(idx, 1);
          };
        },
        emit(event: unknown): void {
          listeners.forEach((l) => l(event));
        },
      } as MockClerk;
    },
    COACH_CLERK_USER_ID,
  );
}

/**
 * Alias for mockUseAuth, matching the deliverable name in the architect plan.
 */
export const mockClerkCoach = mockUseAuth;
