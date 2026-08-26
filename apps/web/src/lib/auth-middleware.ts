import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

type AuthenticatedHandler = (
  userId: string,
  request: Request,
) => Promise<NextResponse>

/**
 * Higher-order function that wraps an API route handler with Clerk authentication.
 * Returns 401 if no valid session exists.
 *
 * Usage:
 *   export const GET = withAuth(async (userId, req) => { ... })
 *   export const POST = withAuth(async (userId, req) => { ... })
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return await handler(userId, request)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
