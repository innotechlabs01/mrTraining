import { useState, useEffect, useRef } from 'react'

interface AudioPlayerProps {
  playlist: string[]
}

export const AudioPlayer = ({ playlist }: AudioPlayerProps) => {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = playlist[current]
    if (playing) audio.play().catch(() => {})
    else audio.pause()
  }, [current, playing, playlist])

  const next = () => setCurrent((i) => (i + 1) % playlist.length)
  const prev = () => setCurrent((i) => (i - 1 + playlist.length) % playlist.length)

  return (
    <div className="flex items-center gap-3 mt-4">
      <button onClick={prev} className="p-2 rounded bg-white/10 hover:bg-white/20" disabled={playlist.length <= 1}>
        ◀︎
      </button>
      <button onClick={() => setPlaying((p) => !p)} className="p-2 rounded bg-white/10 hover:bg-white/20">
        {playing ? '❚❚' : '►'}
      </button>
      <button onClick={next} className="p-2 rounded bg-white/10 hover:bg-white/20" disabled={playlist.length <= 1}>
        ▶︎
      </button>
      <audio ref={audioRef} controls={false} muted={false} />
    </div>
  )
}
