'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCoachProfile, useCoachSections } from '@/features/coach/contexts/CoachProfileContext';
import { COACH_PLAN_CONFIGS, COACH_SECTION_LABELS, COACH_SECTION_ICONS, CoachSectionId } from '@/features/coach/contexts/CoachProfileContext';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export function CoachNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useCoachProfile();
  const sections = useCoachSections();
  const planConfig = COACH_PLAN_CONFIGS.find(p => p.plan === profile?.plan);

  return (
    <nav className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', planConfig?.bgColor)}>
            {planConfig && <planConfig.icon className={cn('w-5 h-5', planConfig.color)} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{profile?.name || 'Coach'}</p>
            <p className="text-xs text-white/50 capitalize">{profile?.plan} coach</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-1">
        {sections.map(section => {
          const Icon = COACH_SECTION_ICONS[section];
          const label = COACH_SECTION_LABELS[section];
           const href = section === 'landing' ? '/' : `/${section === 'today' ? 'coach' : `coach/${section}`}`;
          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <button
              key={section}
              onClick={() => router.push(href)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : '')} />
              <span>{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => router.push('/coach/plan')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>Change Plan</span>
        </button>
      </div>
    </nav>
  );
}