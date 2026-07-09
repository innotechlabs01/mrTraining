import { Heart } from 'lucide-react'

interface RecoveryMetricsProps {
  sleepHours: number | null
  sleepQuality: string
  hrv: number | null
  stress: number | null
  hydration: number | null
  recoveryScore: number | null
  aiRec: string
}

export default function RecoveryMetrics({ sleepHours, sleepQuality, hrv, stress, hydration, recoveryScore, aiRec }: RecoveryMetricsProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-red-400" />
          <span className="text-xs text-white/50 font-medium">Sleep</span>
        </div>
        <p className="text-sm text-white/70">
          {sleepHours ? `${sleepHours} hrs (${sleepQuality})` : 'Loading…' }
        </p>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-red-400" />
          <span className="text-xs text-white/50 font-medium">HRV</span>
        </div>
        <p className="text-sm text-white/70">{hrv !== null ? `${hrv}` : 'Loading…'}</p>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-red-400" />
          <span className="text-xs text-white/50 font-medium">Stress</span>
        </div>
        <p className="text-sm text-white/70">{stress !== null ? `${stress}` : 'Loading…'}</p>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-white/50 font-medium">Hydration</span>
        </div>
        <p className="text-sm text-white/70">{hydration !== null ? `${hydration}%` : 'Loading…'}</p>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-green-400" />
          <span className="text-xs text-white/50 font-medium">Recovery Score</span>
        </div>
        <p className="text-sm text-white/70">{recoveryScore !== null ? `${recoveryScore}` : 'Loading…'}</p>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-white/50 font-medium">AI Recommendation</span>
        </div>
        <p className="text-sm text-white/70">{aiRec || 'Loading…'}</p>
      </div>
    </>
  )
}
