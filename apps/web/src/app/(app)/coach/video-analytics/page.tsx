'use client'

import { FormMetricsDashboard } from '@/features/coach/components/form-metrics/FormMetricsDashboard'

export default function FormMetricsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Form Analytics</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Analiza la forma de tus atletas — tendencias, mejoras y áreas de mejora por ejercicio.
        </p>
      </div>
      <FormMetricsDashboard />
    </div>
  )
}
