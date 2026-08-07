'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Share2 } from 'lucide-react'
import { useUser } from '@clerk/nextjs'

interface InviteAthleteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InviteAthleteModal({ isOpen, onClose }: InviteAthleteModalProps) {
  const { user } = useUser()
  const [copied, setCopied] = useState(false)
  const [coachCode, setCoachCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true)
      fetch('/api/coach/profile')
        .then(res => res.json())
        .then(data => {
          const coach = data?.coach
          setCoachCode(coach?.coach_code || coach?.coachCode || '')
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [isOpen, user])

  const webInviteUrl = process.env.NEXT_PUBLIC_WEB_INVITE_URL || 'https://mr-training.vercel.app/invite'

  const inviteLink = coachCode
    ? `${webInviteUrl}?code=${coachCode}`
    : ''

  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = inviteLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my MR Training team',
          text: `Use my code ${coachCode} to join my team on MR Training`,
          url: inviteLink,
        })
      } catch {}
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-surface-1 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-bold text-white">Invite Athlete</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mx-auto" />
              <p className="text-sm text-white/40 mt-3">Loading your code...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-surface-2 border border-white/5 rounded-xl p-4 text-center">
                <p className="text-xs text-white/40 mb-2">Your coach code</p>
                <p className="text-3xl font-mono font-bold text-brand-primary tracking-widest">
                  {coachCode}
                </p>
              </div>

              <div className="bg-surface-2 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-white/40 mb-2">Share this link with your athlete</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-white/70 bg-surface-1 px-3 py-2 rounded-lg overflow-hidden overflow-ellipsis whitespace-nowrap">
                    {inviteLink}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-surface-1 border border-white/5 hover:border-brand-primary/30 transition-all"
                    title="Copy link"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/40" />}
                  </button>
                </div>
              </div>

              <div className="bg-surface-2 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-white/40 mb-3">How it works</p>
                <ol className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Share the link or code with your athlete</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Athlete downloads the app and enters the code</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>They are automatically linked to your team</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary/90 transition-colors"
              >
                <Share2 size={16} />
                Share invitation
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
