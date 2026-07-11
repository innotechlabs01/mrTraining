'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useToday } from '../../hooks/useToday'
import { TimeBlockCard } from '../timeline/TimeBlockCard'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ListChecks,
  FileText,
  UserPlus,
  CreditCard,
  Calendar,
  Radio,
  Settings,
  LifeBuoy,
  ChevronDown,
  ChevronRight,
  Clock,
  X,
  Package,
} from 'lucide-react'

interface NavItemConfig {
  id: string
  label: string
  icon: React.ElementType
  href?: string
  children?: { id: string; label: string; href: string }[]
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/coach' },
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
  {
    id: 'commercial',
    label: 'Comercial',
    icon: Package,
    children: [
      { id: 'planes', label: 'Planes', href: '/coach/planes' },
      { id: 'events', label: 'Eventos', href: '/coach/events' },
      { id: 'live-sessions', label: 'Live Sessions', href: '/coach/live-session' },
      { id: 'ventas', label: 'Ventas / Inventario', href: '/coach/ventas' },
    ],
  },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/coach/settings' },
  { id: 'support', label: 'Soporte', icon: LifeBuoy, href: '/coach/support' },
]

function isChildActive(pathname: string, children: { href: string }[]): boolean {
  return children.some((c) => pathname.startsWith(c.href))
}

function isExactActive(pathname: string, href: string): boolean {
  if (href === '/coach') return pathname === '/coach'
  return pathname.startsWith(href)
}

export function CoachSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { blocks } = useToday()
  const [trainingOpen, setTrainingOpen] = useState(() => isChildActive(pathname, NAV_ITEMS[2].children!))
  const [commercialOpen, setCommercialOpen] = useState(() => isChildActive(pathname, NAV_ITEMS[3].children!))
  const [timelineOpen, setTimelineOpen] = useState(false)

  const currentBlockId = blocks.find((b) => pathname.endsWith(b.id))?.id ?? null

  const handleNav = (href: string) => {
    router.push(href)
    onClose()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/icon/icon_mr.png"
                alt="MR Training"
                className="h-7 w-7 object-contain"
              />
            </div>
            <span className="font-display text-sm font-semibold text-white/90 tracking-wide">
              Coach OS
            </span>
          </div>
        <button onClick={onClose} className="lg:hidden p-1 text-white/40 hover:text-white/70">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            const hasActiveChild = isChildActive(pathname, item.children)
            const isTraining = item.id === 'training'
            const isCommercial = item.id === 'commercial'
            const isOpen = isTraining ? trainingOpen : isCommercial ? commercialOpen : false
            const setOpen = isTraining ? setTrainingOpen : isCommercial ? setCommercialOpen : () => {}
            return (
              <div key={item.id}>
                <button
                  onClick={() => setOpen(!isOpen)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    hasActiveChild
                      ? 'text-brand-primary bg-brand-primary/10'
                      : 'text-white/50 hover:text-white/70 hover:bg-white/5',
                  )}
                >
                  <item.icon size={18} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      'transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="ml-8 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                    {item.children.map((child) => {
                      const active = isExactActive(pathname, child.href)
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNav(child.href)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all',
                            active
                              ? 'text-brand-primary bg-brand-primary/10'
                              : 'text-white/40 hover:text-white/60 hover:bg-white/5',
                          )}
                        >
                          {child.label}
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
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'text-brand-primary bg-brand-primary/10'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5',
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}

        <div className="my-3 mx-3 h-px bg-white/5" />

        <div>
          <button
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            <Clock size={16} />
            <span className="flex-1 text-left text-xs uppercase tracking-wider font-semibold">
              Today's Timeline
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
              {blocks.map((block) => (
                <TimeBlockCard
                  key={block.id}
                  block={block}
                  isActive={block.id === currentBlockId}
                  onClick={() => {
                    router.push(`/coach/today/${block.id}`)
                    onClose()
                  }}
                />
              ))}
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
          'fixed left-0 top-0 w-60 h-screen bg-surface-1 border-r border-white/5 z-30 flex flex-col',
          'transition-transform duration-300 ease-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <SidebarContent />
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  )
}
