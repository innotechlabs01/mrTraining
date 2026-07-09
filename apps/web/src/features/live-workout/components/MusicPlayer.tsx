'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, Music2, Volume2 } from 'lucide-react'
import type { MusicTrack } from '../types'
import { cn } from '@/lib/utils'

interface MusicPlayerProps {
  playlist: MusicTrack[]
  /** Dim the player visually when the coach is delivering a cue. */
  muted?: boolean
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function MusicPlayer({ playlist, muted = false }: MusicPlayerProps) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const track = playlist[index]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    audio.src = track.url
    if (playing) audio.play().catch(() => {})
    else audio.pause()
  }, [track, playing])

  useEffect(() => {
    if (!playing || !track) return
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + 1
        if (next >= track.durationSec) {
          setIndex((i) => (i + 1) % playlist.length)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [playing, track, playlist.length])

  const next = () => {
    setIndex((i) => (i + 1) % playlist.length)
    setProgress(0)
  }
  const prev = () => {
    if (progress > 3) {
      setProgress(0)
      return
    }
    setIndex((i) => (i - 1 + playlist.length) % playlist.length)
    setProgress(0)
  }

  const pct = track ? Math.min(100, (progress / track.durationSec) * 100) : 0

  return (
    <div className={cn('rounded-3xl border border-white/5 bg-surface-1 p-4 transition-opacity', muted && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/30 to-orange-500/20">
          <div className="absolute inset-0 flex items-end justify-center gap-0.5 p-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-white/70"
                animate={playing ? { height: ['30%', '90%', '45%', '75%', '30%'] } : { height: '25%' }}
                transition={{ duration: 0.9, repeat: playing ? Infinity : 0, delay: i * 0.12 }}
                style={{ height: '25%' }}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{track?.title ?? 'No track'}</p>
          <p className="truncate text-xs text-white/40">
            {track?.artist} {track ? `· ${track.bpm} BPM` : ''}
          </p>
        </div>

        <button onClick={prev} className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white" aria-label="Previous track">
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/25 transition-transform active:scale-95"
          aria-label={playing ? 'Pause music' : 'Play music'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={next} className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white" aria-label="Next track">
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="font-mono text-[10px] text-white/30">{formatTime(progress)}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-orange-400" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
        </div>
        <span className="font-mono text-[10px] text-white/30">{track ? formatTime(track.durationSec) : '0:00'}</span>
        <Music2 className="h-3 w-3 text-white/30" />
      </div>

      <audio ref={audioRef} muted={muted} />
    </div>
  )
}
