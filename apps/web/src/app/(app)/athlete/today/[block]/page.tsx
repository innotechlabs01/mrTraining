import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { AthleteBlockId } from '@/features/athlete/types'
import { LiveWorkout } from '@/components/LiveWorkout/LiveWorkout';

const VALID_BLOCKS: AthleteBlockId[] = ['morning', 'workout', 'recovery', 'nutrition', 'community', 'night']

const MorningCheckin = dynamic(
  () => import('@/features/athlete').then((m) => ({ default: m.MorningCheckin })),
  { ssr: false },
)

const WorkoutSession = dynamic(
  () => import('@/features/athlete').then((m) => ({ default: m.WorkoutSession })),
  { ssr: false },
)

const RecoveryHub = dynamic(
  () => import('@/features/athlete').then((m) => ({ default: m.RecoveryHub })),
  { ssr: false },
)

const NutritionTracker = dynamic(
  () => import('@/features/athlete').then((m) => ({ default: m.NutritionTracker })),
  { ssr: false },
)

const CommunityFeed = dynamic(
  () => import('@/features/athlete').then((m) => ({ default: m.CommunityFeed })),
  { ssr: false },
)

const NightSummary = dynamic(
  () => import('@/features/athlete').then((m) => ({ default: m.NightSummary })),
  { ssr: false },
)

const BLOCK_COMPONENTS: Record<AthleteBlockId, React.ComponentType> = {
  morning: MorningCheckin,
  workout: LiveWorkout,
  recovery: RecoveryHub,
  nutrition: NutritionTracker,
  community: CommunityFeed,
  night: NightSummary,
}

function BlockSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-white/5 rounded-lg w-1/2" />
      <div className="h-32 bg-white/5 rounded-xl" />
      <div className="h-48 bg-white/5 rounded-xl" />
    </div>
  )
}

export default function BlockPage({ params }: { params: { block: string } }) {
  const blockId = params.block as AthleteBlockId

  if (!VALID_BLOCKS.includes(blockId)) {
    redirect('/athlete/today/morning')
  }

  const Component = BLOCK_COMPONENTS[blockId]

  return (
    <Suspense fallback={<BlockSkeleton />}>
      <Component />
    </Suspense>
  )
}
