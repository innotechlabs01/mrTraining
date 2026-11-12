import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic'

const GO_API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';


/**
 * GET /api/coach/subscription/checkout
 *
 * Creates the coach platform subscription and redirects the payer to the
 * Wompi checkout. The payer comes back to the WEB APP (not to this API):
 * the return URLs are built from WEB_APP_URL on the Go API side.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in?redirect_url=/payment/interstitial', request.url));
    }

    const token = await getToken?.();
    if (!token) {
      return NextResponse.redirect(new URL('/sign-in?redirect_url=/payment/interstitial', request.url));
    }

    const planId = request.nextUrl.searchParams.get('planId');
    if (!planId) {
      return NextResponse.redirect(new URL('/payment/interstitial?error=missing_plan', request.url));
    }

    // Call Go API to create coach platform subscription checkout
    const response = await fetch(`${GO_API_URL}/api/v1/coach/subscription/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ plan_id: planId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Coach subscription checkout failed:', error);
      return NextResponse.redirect(
        new URL(`/payment/interstitial?plan=${encodeURIComponent(planId)}&error=checkout_failed`, request.url),
      );
    }

    const data = await response.json();

    if (data.checkoutUrl) {
      // Redirect to Wompi checkout
      return NextResponse.redirect(data.checkoutUrl);
    }

    // Fallback if no checkout URL
    return NextResponse.redirect(
      new URL(`/payment/interstitial?plan=${encodeURIComponent(planId)}&error=no_checkout_url`, request.url),
    );
  } catch (error) {
    console.error('Coach subscription checkout error:', error);
    const planId = request.nextUrl.searchParams.get('planId') ?? '';
    return NextResponse.redirect(
      new URL(`/payment/interstitial?plan=${encodeURIComponent(planId)}&error=server_error`, request.url),
    );
  }
}
