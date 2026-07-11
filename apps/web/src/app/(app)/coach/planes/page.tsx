'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Plus, Users as UsersIcon, Dumbbell, Pencil, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/features/coach/types'
import { usePlans } from '@/features/coach/hooks/usePlans'
import { isPlanDiscountActive, getPlanDiscountedPrice, getPlanDiscountAmount, formatDiscountLabel } from '@/features/coach/utils/planDiscount'
import { PlanModal } from '@/features/coach/components/plans/PlanModal'

export default function CoachPlanesPage() {
  const { plans, upsertPlan } = usePlans()
  const [editing, setEditing] = useState<Plan | null>(null)
  const [showNew, setShowNew] = useState(false)

  const openModal = (plan: Plan | null) => {
    if (plan) setEditing(plan)
    else setShowNew(true)
  }

  const handleSave = (plan: Plan) => {
    upsertPlan(plan)
    setEditing(null)
    setShowNew(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Planes y Precios</h1>
          <p className="text-sm text-white/40 mt-1">Gestiona tus planes de suscripción</p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan, i) => {
          const discountActive = isPlanDiscountActive(plan)
          const finalPrice = getPlanDiscountedPrice(plan)
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                'relative rounded-2xl border bg-surface-1 p-5 flex flex-col',
                plan.isActive ? 'border-white/10' : 'border-white/5 opacity-60',
              )}
            >
              <button
                onClick={() => openModal(plan)}
                className="absolute top-3 right-3 p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Editar plan"
              >
                <Pencil size={14} />
              </button>

              {discountActive && (
                <div className="absolute -top-2.5 right-12 px-2 py-0.5 rounded-full bg-brand-primary text-[10px] font-bold text-white">
                  {formatDiscountLabel(plan)}
                </div>
              )}
              {plan.billingPeriod === 'yearly' && !discountActive && (
                <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-brand-primary text-[10px] font-bold text-white">
                  Ahorra 20%
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                <p className="text-xs text-white/40 mt-1">{plan.description}</p>
              </div>

              <div className="mt-4 mb-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white font-display">${finalPrice}</span>
                {discountActive && (
                  <span className="text-sm text-white/30 line-through">${plan.price}</span>
                )}
                <span className="text-xs text-white/30 ml-auto">
                  /{plan.billingPeriod === 'monthly' ? 'mes' : plan.billingPeriod === 'yearly' ? 'año' : 'trimestre'}
                </span>
              </div>

              {discountActive && (
                <div className="mb-3 flex items-center gap-1.5 text-[11px] text-green-400">
                  <Tag size={11} />
                  {plan.discount?.label}
                  {plan.discount?.validUntil && (
                    <span className="text-white/30">
                      · hasta {new Date(plan.discount.validUntil).toLocaleDateString('es')}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={12} className="text-green-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-white/50">{f}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <UsersIcon size={12} />
                  {plan.maxAthletes} atletas máx
                </div>
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Dumbbell size={12} />
                  {plan.maxSessionsPerWeek} sesiones/sem
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {plan.trainingMode.map((m) => (
                    <span key={m} className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                      m === 'presencial' ? 'bg-green-500/10 text-green-400' :
                      m === 'virtual' ? 'bg-blue-500/10 text-blue-400' :
                      m === 'hibrido' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-amber-500/10 text-amber-400',
                    )}>
                      {m}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-white/40 font-medium mt-2">
                  {plan.athleteCount} atletas en este plan
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <PlanModal open={!!editing || showNew} plan={editing} onClose={() => { setEditing(null); setShowNew(false) }} onSave={handleSave} />
    </div>
  )
}
