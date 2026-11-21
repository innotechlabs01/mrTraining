'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { WebRTCMeetRoom } from '@/features/coach/components/meet/WebRTCMeetRoom'

export default function MeetRoomPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const roomId = params?.id || 'general'
  const roleParam = searchParams.get('role')
  const role: 'coach' | 'athlete' = roleParam === 'coach' ? 'coach' : 'athlete'

  return (
    <div className="min-h-screen bg-[#07090d] text-white flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">MR Training · Meet P2P</p>
            <h1 className="text-xl font-bold text-white mt-0.5">Sesión de Onboarding & Explicación de Rutina</h1>
          </div>
        </div>

        <WebRTCMeetRoom
          roomId={roomId}
          role={role}
          onClose={() => {
            if (role === 'coach') {
              router.push('/coach/agendamiento')
            } else {
              window.close()
            }
          }}
        />
      </div>
    </div>
  )
}
