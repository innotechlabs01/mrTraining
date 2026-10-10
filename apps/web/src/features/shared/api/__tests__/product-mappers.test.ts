import { mapGoProduct, toGoProduct, mapGoSale, toGoSale } from '../client'
import type { GoProduct, GoSale } from '../client'

describe('mapGoProduct (Go snake_case -> web camelCase)', () => {
  it('maps description, category, is_shop and image_url (edit dialog round-trip)', () => {
    const go: GoProduct = {
      id: 'p1',
      name: 'Whey',
      brand: 'ON',
      image_url: 'data:image/png;base64,abc',
      price: 49.99,
      received: 30,
      gross: 49.99,
      stock: 10,
      low_stock_threshold: 2,
      description: 'Proteína de suero',
      category: 'Suplementos',
      is_shop: true,
      created_at: '2026-01-01T00:00:00Z',
    }
    const p = mapGoProduct(go)
    expect(p.description).toBe('Proteína de suero')
    expect(p.category).toBe('Suplementos')
    expect(p.isShop).toBe(true)
    expect(p.imageUrl).toBe('data:image/png;base64,abc')
    expect(p.lowStockThreshold).toBe(2)
    expect(p.createdAt).toBe('2026-01-01T00:00:00Z')
  })

  it('defaults isShop to false when the flag is absent', () => {
    const p = mapGoProduct({ id: 'p2', name: 'X', price: 1, received: 0, gross: 1, stock: 0, low_stock_threshold: 5, created_at: '' })
    expect(p.isShop).toBe(false)
    expect(p.description).toBeUndefined()
  })
})

describe('toGoProduct (web camelCase -> Go snake_case)', () => {
  it('maps all editable fields including is_shop=false and image', () => {
    const out = toGoProduct({
      name: 'Whey',
      imageUrl: 'data:image/png;base64,abc',
      description: 'desc',
      category: 'Ropa',
      isShop: false,
      price: 10,
      received: 5,
      gross: 10,
      stock: 0,
      lowStockThreshold: 1,
    })
    expect(out).toEqual({
      name: 'Whey',
      image_url: 'data:image/png;base64,abc',
      description: 'desc',
      category: 'Ropa',
      is_shop: false,
      price: 10,
      received: 5,
      gross: 10,
      stock: 0,
      low_stock_threshold: 1,
    })
  })

  it('omits undefined fields (partial update semantics)', () => {
    expect(toGoProduct({ name: 'X' })).toEqual({ name: 'X' })
  })
})

describe('sale mappers', () => {
  it('mapGoSale normalizes snake_case', () => {
    const s: GoSale = {
      id: 's1', product_id: 'p1', product_name: 'Whey', brand: 'ON',
      quantity: 2, unit_price: 50, unit_received: 30, total: 100,
      date: '2026-01-01', created_at: '2026-01-01T00:00:00Z',
    }
    const sale = mapGoSale(s)
    expect(sale.productId).toBe('p1')
    expect(sale.productName).toBe('Whey')
    expect(sale.unitPrice).toBe(50)
    expect(sale.unitReceived).toBe(30)
  })

  it('toGoSale converts to snake_case', () => {
    const out = toGoSale({
      productId: 'p1', productName: 'Whey', brand: 'ON',
      quantity: 2, unitPrice: 50, unitReceived: 30, total: 100,
      date: '2026-01-01',
    })
    expect(out).toEqual({
      product_id: 'p1', product_name: 'Whey', brand: 'ON',
      quantity: 2, unit_price: 50, unit_received: 30, total: 100,
      date: '2026-01-01',
    })
  })
})
