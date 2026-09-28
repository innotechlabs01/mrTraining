# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/auth.setup.ts >> authenticate as coach
- Location: tests/api/auth.setup.ts:7:6

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="identifier"], input[name="email"], input[type="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e7]:
      - img "MR Training" [ref=e8]
      - generic [ref=e11]: TRAINING
    - generic [ref=e12]:
      - generic [ref=e13]:
        - heading "Welcome back" [level=1] [ref=e14]
        - paragraph [ref=e15]: Sign in to your MR Training account
      - generic [ref=e18]:
        - paragraph [ref=e19]: "I am a:"
        - button "Coach Manage athletes & create programs" [ref=e21] [cursor=pointer]:
          - generic [ref=e25]: Coach
          - generic [ref=e26]: Manage athletes & create programs
  - region "Notifications alt+T"
  - alert [ref=e27]
```

# Test source

```ts
  1   | import { test, expect, type APIRequestContext } from '@playwright/test';
  2   | 
  3   | const GO_API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';
  4   | const WEB_API_URL = 'http://localhost:3000';
  5   | 
  6   | export interface TestUser {
  7   |   email: string;
  8   |   password: string;
  9   |   role: 'coach' | 'athlete';
  10  | }
  11  | 
  12  | export const testUsers: TestUser[] = [
  13  |   { email: 'coach@test.com', password: 'test123', role: 'coach' },
  14  |   { email: 'athlete@test.com', password: 'test123', role: 'athlete' },
  15  | ];
  16  | 
  17  | /**
  18  |  * Get Clerk token by signing in via the sign-in page.
  19  |  * This uses Playwright's browser context to perform actual sign-in.
  20  |  */
  21  | export async function getClerkTokenViaBrowser(page: import('@playwright/test').Page, user: TestUser): Promise<string> {
  22  |   await page.goto(`${WEB_API_URL}/sign-in`);
  23  |   await page.waitForLoadState('networkidle');
  24  |   
  25  |   // Fill sign-in form
> 26  |   await page.fill('input[name="identifier"], input[name="email"], input[type="email"]', user.email);
      |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  27  |   await page.fill('input[name="password"], input[type="password"]', user.password);
  28  |   
  29  |   // Submit form
  30  |   await page.click('button[type="submit"]');
  31  |   
  32  |   // Wait for redirect to coach dashboard
  33  |   await page.waitForURL(/\/coach/, { timeout: 15000 });
  34  |   
  35  |   // Get the Clerk token from the browser
  36  |   const token = await page.evaluate(async () => {
  37  |     const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
  38  |     if (clerk?.session?.getToken) {
  39  |       return await clerk.session.getToken();
  40  |     }
  41  |     return localStorage.getItem('mr-training-auth-token');
  42  |   });
  43  |   
  44  |   if (!token) {
  45  |     throw new Error('Failed to get Clerk token');
  46  |   }
  47  |   
  48  |   return token;
  49  | }
  50  | 
  51  | /**
  52  |  * Get Clerk token for API tests by using the test endpoint.
  53  |  * This requires the user to be already signed in via browser.
  54  |  */
  55  | export async function getClerkTokenViaAPI(request: APIRequestContext): Promise<string> {
  56  |   const response = await request.get(`${WEB_API_URL}/api/test/auth-token`);
  57  |   if (!response.ok()) {
  58  |     throw new Error(`Failed to get auth token: ${response.status()}`);
  59  |   }
  60  |   const data = await response.json();
  61  |   return data.token;
  62  | }
  63  | 
  64  | export async function createAuthenticatedContext(
  65  |   request: APIRequestContext,
  66  |   user: TestUser
  67  | ): Promise<{ request: APIRequestContext; token: string }> {
  68  |   const token = await getClerkTokenViaAPI(request);
  69  |   const authenticatedRequest = request;
  70  |   return { request: authenticatedRequest, token };
  71  | }
  72  | 
  73  | export async function goApiRequest(
  74  |   request: APIRequestContext,
  75  |   token: string,
  76  |   method: string,
  77  |   path: string,
  78  |   data?: unknown
  79  | ) {
  80  |   return request.fetch(`${GO_API_URL}/api/v1${path}`, {
  81  |     method,
  82  |     headers: {
  83  |       'Content-Type': 'application/json',
  84  |       Authorization: `Bearer ${token}`,
  85  |     },
  86  |     data,
  87  |   });
  88  | }
  89  | 
  90  | export async function webApiRequest(
  91  |   request: APIRequestContext,
  92  |   token: string,
  93  |   method: string,
  94  |   path: string,
  95  |   data?: unknown
  96  | ) {
  97  |   return request.fetch(`${WEB_API_URL}${path}`, {
  98  |     method,
  99  |     headers: {
  100 |       'Content-Type': 'application/json',
  101 |       Authorization: `Bearer ${token}`,
  102 |     },
  103 |     data,
  104 |   });
  105 | }
  106 | 
  107 | export async function checkGoApiHealth(): Promise<boolean> {
  108 |   try {
  109 |     const response = await fetch(`${GO_API_URL}/health`);
  110 |     return response.ok;
  111 |   } catch {
  112 |     return false;
  113 |   }
  114 | }
  115 | 
  116 | export async function checkWebApiHealth(): Promise<boolean> {
  117 |   try {
  118 |     const response = await fetch(`${WEB_API_URL}/api/health`);
  119 |     return response.ok;
  120 |   } catch {
  121 |     return false;
  122 |   }
  123 | }
```