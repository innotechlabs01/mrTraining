'use client'

import { motion } from 'framer-motion'
import { Users, PartyPopper, MessageCircle } from 'lucide-react'
import { useCommunity } from '@/features/athlete/hooks/useExtra'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const postVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function FeedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-white/5 rounded-xl w-1/3" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-white/5 rounded-2xl" />
      ))}
    </div>
  )
}

const typeStyles = {
  announcement: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  achievement: 'bg-green-500/10 text-green-400 border-green-500/20',
  message: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export default function CommunityFeed() {
  const { posts, loading, error, cheer } = useCommunity()

  if (loading) return <FeedSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="w-10 h-10 text-red-400/50 mb-4" />
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <p className="text-white/40 text-xs">We&apos;ll try again in a moment</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <PartyPopper className="w-10 h-10 text-orange-400/50 mb-4" />
        <p className="text-white font-semibold text-lg mb-1">Welcome to the team!</p>
        <p className="text-white/40 text-sm max-w-xs">
          Your teammates will start posting here. Be the first to say hello!
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={postVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Community</h1>
          <p className="text-sm text-white/40 mt-1">Team updates & messages</p>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} className="space-y-3">
        {posts.map((post) => (
          <motion.div
            key={post.id}
            variants={postVariants}
            layout
            className="bg-surface-1 rounded-2xl p-5 border border-white/5"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                {post.author.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{post.author}</p>
                  <span className={cn(
                    'text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border',
                    typeStyles[post.type]
                  )}>
                    {post.type}
                  </span>
                </div>
                <p className="text-xs text-white/30 mt-0.5">{post.timestamp}</p>
              </div>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">{post.content}</p>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => cheer(post.id)}
                className={cn(
                  'flex items-center gap-1.5 text-xs transition-all',
                  post.cheered ? 'text-orange-400' : 'text-white/30 hover:text-white/50'
                )}
              >
                <motion.span
                  key={post.cheered ? 'cheered' : 'uncheered'}
                  initial={post.cheered ? { scale: 1.5 } : false}
                  animate={{ scale: 1 }}
                >
                  {post.cheered ? '🔥' : '💬'}
                </motion.span>
                <span>{post.likes}</span>
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={postVariants}
        className="flex justify-center pt-2"
      >
        <a
          href="/athlete/today/night"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-400 active:scale-[0.97] transition-all"
        >
          End Your Day
          <span className="text-lg">→</span>
        </a>
      </motion.div>
    </motion.div>
  )
}
