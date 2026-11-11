'use client'

import { useUser } from '@clerk/nextjs'

interface MembershipStatus {
  skip_subscription: boolean
  updated_at: string
}

export function useMembershipStatus(): { status: 'active' | 'omitted'; loading: boolean } {
  const { user } = useUser()

  const membershipStatus = (user?.publicMetadata as { membership_status?: MembershipStatus } | undefined)?.membership_status

  const loading = !user || membershipStatus === undefined

  const status = membershipStatus?.skip_subscription ? 'omitted' : 'active'

  return { status, loading }
}