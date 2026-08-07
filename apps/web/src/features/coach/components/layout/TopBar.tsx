'use client'

import { Bell, Menu, LogOut, Clock } from 'lucide-react'
import { useToday } from '../../hooks/useToday'
import { useMessages } from '../../hooks/useMessages'
import { useAuth } from '@/features/auth/contexts/MockAuthContext'
import { useCoachPanel } from './CoachPanelContext'
import { ThemeToggle } from './ThemeToggle'

function formatWeekday(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
}

const STATUS_COLORS: Record<string, string> = {
  current: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
  upcoming: 'bg-white/30',
  past: 'bg-white/15',
}

export function TopBar({ onMenuClick, user }: { onMenuClick: () => void; user: { name: string; initials: string } | null }) {
  const { currentBlock } = useToday()
  const { unreadCount } = useMessages()
  const { openPanel } = useCoachPanel()
  const { logout } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface-1/85 backdrop-blur-xl border-b border-surface-3 z-20 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-all active:scale-95 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="hidden lg:block w-16" />
        <h1 className="text-sm font-semibold text-text-primary tracking-tight">Today</h1>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-text-muted">
          <Clock size={12} />
          {formatWeekday()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {currentBlock && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-surface-3">
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[currentBlock.status]}`} />
            <span className="text-xs text-text-secondary font-medium">{currentBlock.label}</span>
            <span className="text-[10px] text-text-muted">{currentBlock.time}</span>
          </div>
        )}

        <ThemeToggle />

        <button
          type="button"
          className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-all active:scale-95"
          onClick={() => openPanel('message', {})}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 pl-1 border-l border-surface-3">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-surface-2"
            title={user?.name ?? 'Coach'}
          >
            {user?.initials ?? 'MR'}
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
            aria-label="Cerrar sesion"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}
