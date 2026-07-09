import { useState } from 'react'

interface ProgressBarProps {
  percentage: number
}

export const ProgressBar = ({ percentage }: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, percentage))
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className="bg-gradient-to-r from-[#38bdf8] to-[#1e40af] h-full transition-all duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
