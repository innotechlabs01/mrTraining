'use client'

import { cn } from '@/lib/utils'

interface NutritionValue {
  label: string
  value: number
  unit: string
  dailyValue?: number
}

interface NutritionLabelProps {
  title?: string
  values: NutritionValue[]
  className?: string
}

export function NutritionLabel({
  title,
  values,
  className,
}: NutritionLabelProps) {
  return (
    <div className={cn('rounded-xl border border-white/5 bg-surface-1 p-4', className)}>
      {title && (
        <h4 className="text-sm font-semibold text-white mb-3 border-b border-white/5 pb-2">
          {title}
        </h4>
      )}
      <div className="space-y-1.5">
        {values.map((v) => (
          <div key={v.label} className="flex items-center justify-between text-sm">
            <span className="text-white/60">{v.label}</span>
            <span className="text-white font-medium">
              {v.value}{v.unit}
              {v.dailyValue !== undefined && (
                <span className="text-white/40 ml-1">
                  ({v.dailyValue}% DV)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
