'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useToday } from '../../hooks/useToday'
import { TimeBlockCard } from '../timeline/TimeBlockCard'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  X,
  Clock,
  Circle,
  Home,
  Users,
  Dumbbell,
  ShoppingCart,
  CreditCard,
  Activity,
  Calendar,
  HelpCircle,
} from 'lucide-react'

interface NavItemConfig {
  id: string
  label: string
  icon: React.ElementType
  href?: string
  children?: { id: string; label: string; href: string }[]
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/coach' },
  { id: 'users', label: 'Usuarios', icon: Users, href: '/coach/users' },
  {
    id: 'training',
    label: 'Training',
    icon: Dumbbell,
    children: [
      { id: 'training-workouts', label: 'Workouts', href: '/coach/workouts/exercises' },
      { id: 'training-programs', label: 'Programas', href: '/coach/training/programs' },
      { id: 'training-asignar', label: 'Asignar', href: '/coach/training/asignar' },
    ],
  },
  { id: 'events', label: 'Eventos', icon: Calendar, href: '/coach/events' },
  { id: 'planes', label: 'Planes', icon: CreditCard, href: '/coach/planes' },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart, href: '/coach/ventas' },
  { id: 'live-sessions', label: 'Sesiones en Vivo', icon: Activity, href: '/coach/live-session' },
  { id: 'support', label: 'Soporte', icon: HelpCircle, href: '/coach/support' },
]

function isChildActive(pathname: string, children: { href: string }[]): boolean {
  return children.some((c) => pathname.startsWith(c.href))
}

function isExactActive(pathname: string, href: string): boolean {
  if (href === '/coach') return pathname === '/coach' || pathname === '/coach/'
  return pathname.startsWith(href)
}

export function CoachSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { blocks, isLoading: timelineLoading } = useToday()

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    NAV_ITEMS.forEach(item => {
      if (item.children) {
        initial[item.id] = isChildActive(pathname, item.children)
      }
    })
    return initial
  })
  const [timelineOpen, setTimelineOpen] = useState(false)

  const currentBlockId = blocks.find((b) => pathname.endsWith(b.id))?.id ?? null

  const handleNav = (href: string) => {
    router.push(href)
    onClose()
  }

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const activeBg = 'bg-brand-primary/15 text-brand-primary ring-1 ring-brand-primary/20'
  const hoverBg = 'text-text-secondary hover:text-text-primary hover:bg-surface-3'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 ring-1 ring-brand-primary/20 shadow-lg shadow-brand-primary/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/icon/icon_mr.png"
              alt="MR Training"
              className="h-7 w-7 object-contain"
            />
          </div>
          <span className="font-display text-sm font-semibold text-text-primary tracking-wide">
            Coach OS
          </span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-3 transition-colors">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            const hasActiveChild = isChildActive(pathname, item.children)
            const isOpen = openMenus[item.id] ?? false
            return (
              <div key={item.id}>
                <button
                  onClick={() => toggleMenu(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    hasActiveChild
                      ? activeBg
                      : hoverBg,
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                    hasActiveChild ? 'bg-brand-primary/20 text-brand-primary' : 'bg-surface-3 text-text-muted group-hover:text-text-secondary',
                  )}>
                    <item.icon size={17} />
                  </div>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      'transition-transform duration-200 text-text-muted',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="ml-5 mt-0.5 mb-1 space-y-0.5 border-l-2 border-surface-3 pl-3">
                    {item.children.map((child) => {
                      const active = isExactActive(pathname, child.href)
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNav(child.href)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                            active
                              ? 'text-brand-primary bg-brand-primary/10 font-medium'
                              : 'text-text-muted hover:text-text-secondary hover:bg-surface-3',
                          )}
                        >
                          {active && <div className="w-1 h-1 rounded-full bg-brand-primary" />}
                          <span className={active ? 'ml-0' : 'ml-3'}>{child.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const active = isExactActive(pathname, item.href!)
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.href!)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active ? activeBg : hoverBg,
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                active ? 'bg-brand-primary/20 text-brand-primary' : 'bg-surface-3 text-text-muted',
              )}>
                <item.icon size={17} />
              </div>
              <span>{item.label}</span>
            </button>
          )
        })}

        <div className="my-3 mx-2 h-px bg-gradient-to-r from-transparent via-surface-3 to-transparent" />

        <div>
          <button
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text-secondary hover:bg-surface-3 transition-all duration-200"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-3 text-text-muted">
              <Clock size={15} />
            </div>
            <span className="flex-1 text-left text-xs uppercase tracking-wider font-semibold">
              Today&apos;s Timeline
            </span>
            <ChevronDown
              size={14}
              className={cn(
                'transition-transform duration-200',
                timelineOpen && 'rotate-180',
              )}
            />
          </button>
          {timelineOpen && (
            <div className="mt-1 space-y-0.5">
              {timelineLoading ? (
                <div className="flex justify-center py-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                </div>
              ) : blocks.length === 0 ? (
                <div className="px-4 py-3 text-center">
                  <Circle size={14} className="mx-auto mb-1 text-text-muted" />
                  <p className="text-xs text-text-muted">No blocks configured</p>
                </div>
              ) : (
                blocks.map((block) => (
                  <TimeBlockCard
                    key={block.id}
                    block={block}
                    isActive={block.id === currentBlockId}
                    onClick={() => {
                      router.push(`/coach/today/${block.id}`)
                      onClose()
                    }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 w-64 h-screen bg-surface-1 border-r border-surface-3 z-30 flex flex-col',
          'transition-transform duration-300 ease-out lg:translate-x-0 shadow-lg shadow-black/10',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <SidebarContent />
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  )
}
