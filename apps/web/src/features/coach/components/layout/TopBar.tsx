'use client'

import { Bell, Menu } from 'lucide-react'
import { useToday } from '../../hooks/useToday'
import { useMessages } from '../../hooks/useMessages'
import { useCoachPanel } from './CoachPanelContext'

function formatWeekday(dateStr: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
}

const STATUS_COLORS: Record<string, string> = {
  current: 'bg-success',
  upcoming: 'bg-[#9CA3AF]',
  past: 'bg-[#6B7280]',
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { currentBlock, date } = useToday()
  const { unreadCount } = useMessages()
  const { openPanel } = useCoachPanel()

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface-1/80 backdrop-blur-md border-b border-surface-4 z-20 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-surface-3 transition-colors lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-sm font-semibold text-white">Today</h1>
        <span className="text-xs text-[#9CA3AF] hidden sm:inline">{formatWeekday(date)}</span>
      </div>

      <div className="flex items-center gap-3">
        {currentBlock && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-3 border border-surface-5">
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[currentBlock.status]}`} />
            <span className="text-xs text-[#9CA3AF]">{currentBlock.label}</span>
          </div>
        )}

        <button
          type="button"
          className="relative p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-surface-3 transition-colors"
          onClick={() => openPanel('message', {})}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-error text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        <div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white text-xs font-bold"
          aria-hidden="true"
        >
          MR
        </div>
      </div>
    </header>
  )
}
