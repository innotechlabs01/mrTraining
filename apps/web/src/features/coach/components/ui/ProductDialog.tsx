'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Product } from '@/features/coach/types'
import Image from 'next/image'
import { X, Camera, Trash2, Package, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductDialogProps {
  open: boolean
  initial?: Product | null
  onOpenChange: (open: boolean) => void
  onSave: (p: Product) => void
}

export function ProductDialog({ open, initial, onOpenChange, onSave }: ProductDialogProps) {
  const [name, setName] = useState(initial?.name || '')
  const [brand, setBrand] = useState(initial?.brand || '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '')
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl || null)
  const [price, setPrice] = useState(initial?.price || 0)
  const [received, setReceived] = useState(initial?.received || 0)
  const [stock, setStock] = useState(initial?.stock || 0)
  const [lowStockThreshold, setLowStockThreshold] = useState(initial?.lowStockThreshold || 1)
  const [description, setDescription] = useState(initial?.description || '')
  const [category, setCategory] = useState(initial?.category || '')
  const [isShop, setIsShop] = useState(initial?.isShop || false)
  const [isDragging, setIsDragging] = useState(false)

  if (!open) return null

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten imágenes')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen debe ser menor a 2MB')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setImagePreview(result)
        setImageUrl(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen debe ser menor a 2MB')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setImagePreview(result)
        setImageUrl(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageUrl('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = initial?.id || `prod_${Date.now()}`
    const createdAt = initial?.createdAt || new Date().toISOString()
    const gross = Math.max(price, received)
    onSave({
      id,
      name,
      brand,
      imageUrl: imageUrl || undefined,
      price,
      received,
      gross,
      stock,
      lowStockThreshold,
      description,
      category,
      isShop,
      createdAt,
    })
    onOpenChange(false)
    // reset fields
    setName('')
    setBrand('')
    setImageUrl('')
    setImagePreview(null)
    setPrice(0)
    setReceived(0)
    setStock(0)
    setLowStockThreshold(1)
  }

  const margin = price > 0 ? ((price - received) / price) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-surface-1 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-primary/15 p-2 text-brand-primary">
              <Package size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {initial ? 'Editar producto' : 'Nuevo producto'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Image + Basic Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Image Upload Area */}
            <div
              className={cn(
                'relative rounded-xl border-2 border-dashed transition-all',
                isDragging ? 'border-brand-primary/50 bg-brand-primary/5' : 'border-white/10 hover:border-white/20',
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="product-image"
              />
              <label htmlFor="product-image" className="block cursor-pointer">
                {imagePreview ? (
                  <div className="relative aspect-square">
                    <Image
                      src={imagePreview}
                      alt={name || 'Producto'}
                      fill
                      className="rounded-xl object-cover"
                      sizes="200px"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 rounded-full bg-red-500/80 p-1 text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="aspect-square flex flex-col items-center justify-center gap-2 p-6 text-white/40">
                    <Camera size={32} />
                    <span className="text-sm font-medium">Añadir imagen</span>
                    <span className="text-[11px]">Arrastra o haz clic · Max 2MB</span>
                  </div>
                )}
              </label>
            </div>

            {/* Basic Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white/40">Nombre *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Proteína Whey 2kg"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40">Marca</label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="ej. Optimum Nutrition"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
           </div>

          {/* Right: Pricing + Stock + Shop */}
          <div className="lg:col-span-2 space-y-4">
            {/* Description + Category + Shop toggle */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <h4 className="text-sm font-semibold text-white/80 mb-3">Detalles del producto</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white/40">Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el producto, su uso y beneficios..."
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none resize-y"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/40">Categoría</label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="ej. Accesorios, Ropa, Suplementos"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isShop}
                        onChange={(e) => setIsShop(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm text-white/70">Mostrar en tienda pública</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-white/80 mb-3">
                <DollarSign size={16} className="text-brand-primary" />
                Precios y Margen
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/40">Precio de venta *</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.01}
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/40">Precio recibido *</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.01}
                      value={received}
                      onChange={(e) => setReceived(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Margin indicator */}
              {price > 0 && received > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-brand-primary/10 to-emerald-500/10 border border-white/5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Margen bruto</span>
                    <span className="font-bold text-emerald-400 tabular-nums">{margin.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(margin, 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-gradient-to-r from-brand-primary to-emerald-500"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">
                    Ganancia por unidad: <span className="text-white font-medium tabular-nums">${(price - received).toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Stock Card */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-white/80 mb-3">
                <AlertTriangle size={16} className="text-amber-400" />
                Inventario
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/40">Stock actual *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/40">Umbral stock bajo</label>
                  <input
                    type="number"
                    min={1}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 1)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Stock Status Preview */}
              <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 text-sm">
                  {stock <= 0 ? (
                    <>
                      <CheckCircle className="text-red-400" size={16} />
                      <span className="text-red-400 font-medium">Sin stock</span>
                    </>
                  ) : stock <= lowStockThreshold ? (
                    <>
                      <AlertTriangle className="text-amber-400" size={16} />
                      <span className="text-amber-400 font-medium">Bajo stock (≤ {lowStockThreshold})</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="text-emerald-400" size={16} />
                      <span className="text-emerald-400 font-medium">Stock OK</span>
                    </>
                  )}
                  <span className="ml-auto text-white/50 tabular-nums">{stock} unidades</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors"
          >
            {initial ? 'Actualizar' : 'Crear producto'}
          </button>
        </div>
      </motion.form>
    </div>
  )
}