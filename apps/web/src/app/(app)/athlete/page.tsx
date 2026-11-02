'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, ShoppingCart, Store, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AllySummary {
  relationship_id: string
  coach_id: string
  ally_id: string
  legal_name: string
  commercial_name: string
  category: string
  status: string
}

interface AllyCardProps {
  ally: AllySummary
}

function AllyCard({ ally }: AllyCardProps) {
  return (
    <Link
      href={`/athlete/ally/${ally.ally_id}`}
      className="group relative w-64 rounded-xl border border-white/10 bg-white/5 p-4 overflow-hidden transition-all hover:border-white/20 hover:bg-white/10"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="relative z-10 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-5 h-5 text-brand-primary" />
          <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">
            {ally.category}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors">
          {ally.commercial_name}
        </h3>
        <p className="text-xs text-white/40 mt-1 line-clamp-2">
          {ally.legal_name}
        </p>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs font-medium text-white">
            {ally.status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
          <ChevronRight size={14} className="text-white/40 group-hover:text-white transition-colors" />
        </div>
      </div>
    </Link>
  )
}

export default function AthleteHomePage() {
  const [allies, setAllies] = useState<AllySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/athlete/allies')
      .then((r) => r.json())
      .then((data: AllySummary[]) => {
        if (!cancelled) {
          setAllies(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Tienda de Aliados</h1>
        <p className="text-white/50">Descubre productos y servicios de tus aliados</p>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-white/10 rounded" />
          <div className="h-8 w-1/2 bg-white/10 rounded" />
          <div className="h-8 w-3/4 bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tienda de Aliados</h1>
          <p className="text-white/50">
            Productos y servicios de tus aliados vinculados
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-xs font-medium text-white/90">
          <MapPin size={14} />
          {allies.length} aliado{allies.length !== 1 ? 's' : ''} disponible{allies.length !== 1 ? 's' : ''}
        </div>
      </div>

      {allies.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-12 text-center border border-white/5">
          <Store className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-medium">No hay aliados disponibles</h3>
          <p className="text-white/50 text-sm mt-1">
            Tu coach aún no tiene aliados vinculados. Pronto podrás ver productos aquí.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">
                Aliados destacados
              </h2>
              <span className="text-xs text-brand-primary font-medium">
                Desliza para ver más
              </span>
            </div>
            <div
              className="flex gap-4 overflow-x-auto snap-x pb-2"
              style={{ scrollbarWidth: 'none' }}
            >
              {allies.map((ally) => (
                <AllyCard key={ally.ally_id} ally={ally} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">
              ¿Cómo funciona?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <ShoppingCart className="w-6 h-6 text-brand-primary mb-2" />
                <h3 className="text-sm font-bold text-white">Explora aliados</h3>
                <p className="text-xs text-white/50 mt-1">
                  Desliza y haz click en cualquier aliado para ver sus productos.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-2">
                  1
                </div>
                <h3 className="text-sm font-bold text-white">Compra directa</h3>
                <p className="text-xs text-white/50 mt-1">
                  Selecciona cantidad y compra directamente desde el aliado.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                  2
                </div>
                <h3 className="text-sm font-bold text-white">Tu coach gana comisión</h3>
                <p className="text-xs text-white/50 mt-1">
                  Cada compra genera una comisión para tu coach automáticamente.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
