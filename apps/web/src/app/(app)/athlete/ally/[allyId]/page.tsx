'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ShoppingCart,
  Package,
  AlertCircle,
  MapPin,
  Store,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AllyProduct {
  id: string
  ally_id: string
  name: string
  description: string
  image_url?: string
  price_cents: number
  currency: string
  stock: number
  active: boolean
  created_at: string
  updated_at: string
}

interface ProductCardProps {
  product: AllyProduct
  onPurchase: (p: AllyProduct) => void
}

function ProductCard({ product, onPurchase }: ProductCardProps) {
  const priceDisplay = (product.price_cents / 100).toLocaleString('es-CO', {
    style: 'currency',
    currency: product.currency === 'USD' ? 'USD' : 'COP',
  })

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-white/10 bg-white/5 p-5 overflow-hidden transition-all',
        product.stock <= 0 ? 'border-rose-500/30 bg-rose-500/10' : '',
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4 text-brand-primary" />
            <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider">
              Producto
            </span>
          </div>
          {product.stock <= 0 && (
            <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
              Sin stock
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs text-white/40 mt-1 line-clamp-2">
          {product.description || 'Sin descripción disponible'}
        </p>

        <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-white">{priceDisplay}</span>
            {product.stock > 0 && (
              <span className="text-xs text-white/50 ml-1">/{product.currency}</span>
            )}
          </div>
          {product.stock > 0 ? (
            <button
              onClick={() => onPurchase(product)}
              disabled={product.stock <= 0}
              className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-primary/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed transition-colors"
            >
              <ShoppingCart size={12} /> Comprar
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/40 border border-white/10 cursor-not-allowed"
            >
              Agotado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AllyProductPage() {
  const params = useParams<{ allyId: string }>()
  const router = useRouter()
  const allyId = params.allyId!

  const [products, setProducts] = useState<AllyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  const handlePurchase = useCallback(
    async (product: AllyProduct) => {
      if (purchasing === product.id) return
      setPurchasing(product.id)

      try {
        const res = await fetch(
          `/api/athlete/ally/products/${product.id}/purchase`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 1 }),
          },
        )

        if (!res.ok) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.error || 'Error al comprar')
        }

        await res.json()
        toast.success(`Compra realizada: ${product.name} — Comisión generada`)
        setPurchasing(null)
        router.refresh()
      } catch (err: any) {
        setPurchasing(null)
        toast.error(err.message || 'No se pudo completar la compra')
      }
    },
    [purchasing, router],
  )

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const productsRes = await fetch(
          `/api/athlete/ally/${allyId}/products`,
        )
        const productsData: AllyProduct[] = await productsRes.json()

        if (!cancelled) {
          setProducts(productsData)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [allyId])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Producto de Aliado</h1>
          <Link
            href="/athlete"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-xs font-medium text-white/90 hover:bg-white/20"
          >
            <ChevronLeft size={14} /> Volver a aliados
          </Link>
        </div>
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
          <Link
            href="/athlete"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-xs font-medium text-white/90 hover:bg-white/20 mb-4"
          >
            <ChevronLeft size={14} /> Volver a aliados
          </Link>
          <h1 className="text-2xl font-bold text-white">Tienda del Aliado</h1>
          <p className="text-white/50 text-sm">
            Productos disponibles para compra directa
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-xs font-medium text-white/90">
          <Store className="w-5 h-5 text-brand-primary" />
          <span>Aliado seleccionado</span>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-12 text-center border border-white/5">
          <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-medium">Sin productos disponibles</h3>
          <p className="text-white/50 text-sm mt-1">
            Este aliado no tiene productos activos en este momento.
          </p>
          <Link
            href="/athlete"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-sm font-medium text-white hover:bg-brand-primary/90"
          >
            <ShoppingCart size={14} /> Ver otros aliados
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPurchase={handlePurchase}
            />
          ))}
        </div>
      )}
    </div>
  )
}
