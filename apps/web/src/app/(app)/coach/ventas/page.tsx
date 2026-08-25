'use client'

import { useState, useMemo } from 'react'
import { useProducts } from '@/features/coach/hooks/useProducts'
import { useSales } from '@/features/coach/hooks/useSales'
import { ProductDialog } from '@/features/coach/components/ui/ProductDialog'
import type { Product } from '@/features/coach/types'
import {
  Package,
  AlertTriangle,
  Trash2,
  Edit,
  Plus,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  ArrowUpDown,
  Search,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

function DashboardCard({
  index = 0,
  className,
  children,
}: {
  index?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/5 bg-surface-1 p-5 transition-colors hover:border-white/10',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

function MetricCard({
  index,
  title,
  value,
  display,
  icon: Icon,
  accent,
  trend,
  trendLabel,
}: {
  index: number
  title: string
  value: number
  display: (n: number) => string
  icon: React.ElementType
  accent: string
  trend?: number
  trendLabel?: string
}) {
  return (
    <DashboardCard index={index}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{title}</p>
          <p className="text-2xl font-bold font-display text-white tabular-nums">{display(value)}</p>
          {trend !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold bg-green-500/15 text-green-400">
              <TrendingUp size={11} /> +{trend}% {trendLabel && <span className="text-white/30">{trendLabel}</span>}
            </span>
          )}
        </div>
        <div className={cn('shrink-0 rounded-xl p-2.5', accent)}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </DashboardCard>
  )
}

export default function SalesPage() {
  const { products, hydrated, addProduct, updateProduct, removeProduct, adjustStock } = useProducts()
  const { registerSale, getAggregatedToday, sales } = useSales()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>(null)

  const handleStockChange = (p: Product, delta: number) => {
    if (delta > 0) {
      const saleData = {
        productId: p.id,
        productName: p.name,
        brand: p.brand,
        quantity: delta,
        unitPrice: p.price,
        unitReceived: p.received,
      }
      registerSale(saleData)
      adjustStock(p.id, delta)
      toast.success(`Venta registrada: ${p.name} x${delta} → $${saleData.quantity * saleData.unitPrice}`)
    } else {
      adjustStock(p.id, delta)
      toast.success(`Stock actualizado: ${p.name} → ${p.stock + delta}`)
    }
  }

  const filtered = useMemo(() => {
    let result = products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(search.toLowerCase())
    )

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  }, [products, search, sortConfig])

  const todayAggregated = hydrated ? getAggregatedToday() : []
  const todayRevenue = todayAggregated.reduce((sum, item) => sum + item.total, 0)
  const todayUnits = todayAggregated.reduce((sum, item) => sum + item.quantity, 0)
  const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold).length
  const outOfStockCount = products.filter((p) => p.stock <= 0).length

  const handleSave = (p: Product) => {
    if (editing) {
      updateProduct(editing.id, p)
      toast.success(`Producto "${p.name}" actualizado`)
    } else {
      addProduct(p)
      toast.success(`Producto "${p.name}" agregado`)
    }
    setEditing(null)
  }

  const handleEdit = (p: Product) => {
    setEditing(p)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    const p = products.find((p) => p.id === id)
    removeProduct(id)
    if (p) toast.success(`Producto "${p.name}" eliminado`)
  }

  const handleSort = (key: keyof Product) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Ventas / Inventario</h1>
          <p className="text-white/50 text-sm">Gestiona productos y registra ventas del día.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
        >
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          index={0}
          title="Ventas hoy"
          value={todayRevenue}
          display={(n) => `$${n.toFixed(2)}`}
          icon={ShoppingCart}
          accent="bg-emerald-500/20 text-emerald-400"
          trend={todayUnits > 0 ? Math.round((todayUnits / Math.max(1, products.length)) * 100) : 0}
          trendLabel="unidades"
        />
        <MetricCard
          index={1}
          title="Unidades vendidas"
          value={todayUnits}
          display={(n) => `${n}`}
          icon={Package}
          accent="bg-blue-500/20 text-blue-400"
        />
        <MetricCard
          index={2}
          title="Bajo stock"
          value={lowStockCount}
          display={(n) => `${n}`}
          icon={AlertTriangle}
          accent="bg-amber-500/20 text-amber-400"
        />
        <MetricCard
          index={3}
          title="Sin stock"
          value={outOfStockCount}
          display={(n) => `${n}`}
          icon={AlertTriangle}
          accent={outOfStockCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}
        />
      </div>

      {/* Products Section */}
      <DashboardCard index={0} className="p-0">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 size-4" />
            <input
              placeholder="Buscar por nombre o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'table' ? 'bg-brand-primary/20 text-brand-primary' : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              )}
            >
              <ArrowUpDown size={16} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'cards' ? 'bg-brand-primary/20 text-brand-primary' : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              )}
            >
              <BarChart3 size={16} />
            </button>
            <Filter className="text-white/40 size-4" />
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase text-white/40">
                  <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                    Producto {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('brand')}>
                    Marca {sortConfig?.key === 'brand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('price')}>
                    P. Venta {sortConfig?.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('received')}>
                    P. Recibido {sortConfig?.key === 'received' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('stock')}>
                    Stock {sortConfig?.key === 'stock' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-white/70">{p.brand || '—'}</td>
                    <td className="px-4 py-3 text-white/70 tabular-nums">${p.price}</td>
                    <td className="px-4 py-3 text-white/70 tabular-nums">${p.received}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStockChange(p, -1)}
                          disabled={p.stock <= 0}
                          className="w-6 h-6 rounded bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <span className={cn('tabular-nums', p.stock <= p.lowStockThreshold ? 'text-amber-400 font-semibold' : 'text-white/80')}>{p.stock}</span>
                        <button
                          onClick={() => handleStockChange(p, 1)}
                          className="w-6 h-6 rounded bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.stock <= 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-500/15 text-red-400">
                          <AlertTriangle size={10} />
                          Sin stock
                        </span>
                      ) : p.stock <= p.lowStockThreshold ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-400">
                          <AlertTriangle size={10} />
                          Bajo stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                          <Package size={10} />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/15 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-white/50">
                      <Package className="mx-auto mb-2 size-8 text-white/20" />
                      <p className="text-sm">Sin productos registrados.</p>
                      <p className="text-[11px] mt-1">Haz clic en &quot;Nuevo producto&quot; para empezar.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium text-white truncate">{p.name}</p>
                    <p className="text-[11px] text-white/40">{p.brand || 'Sin marca'}</p>
                  </div>
                  {p.stock <= 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-400">
                      <AlertTriangle size={8} />
                      Sin stock
                    </span>
                  ) : p.stock <= p.lowStockThreshold ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400">
                      <AlertTriangle size={8} />
                      Bajo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                      <Package size={8} />
                      OK
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStockChange(p, -1)}
                      disabled={p.stock <= 0}
                      className="w-7 h-7 rounded bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className={cn('tabular-nums font-medium text-lg', p.stock <= p.lowStockThreshold ? 'text-amber-400' : 'text-white')}>{p.stock}</span>
                    <button
                      onClick={() => handleStockChange(p, 1)}
                      className="w-7 h-7 rounded bg-white/10 text-white/60 hover:bg-white/20 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/40">P. Venta</p>
                    <p className="text-white font-medium">${p.price}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                  <div className="text-right flex-1">
                    <p className="text-xs text-white/40">P. Recibido</p>
                    <p className="text-white font-medium">${p.received}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-1.5 text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/15 rounded-lg"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-white/50">
                <Package className="mb-2 size-10 text-white/20" />
                <p className="text-sm">Sin productos registrados.</p>
                <p className="text-[11px] mt-1">Haz clic en &quot;Nuevo producto&quot; para empezar.</p>
              </div>
            )}
          </div>
        )}
      </DashboardCard>

      <ProductDialog
        open={dialogOpen}
        initial={editing}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setEditing(null)
        }}
        onSave={handleSave}
      />
    </div>
  )
}