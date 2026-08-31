import { getDB, generateId } from './db'

// ============== Products ==============

export async function getProducts(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM products WHERE coach_id = ? ORDER BY name',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, name: r.name, brand: r.brand || '', imageUrl: r.image_url || '',
    price: r.price, received: r.received, gross: r.gross,
    stock: r.stock, lowStockThreshold: r.low_stock_threshold, createdAt: r.created_at,
  }))
}

export async function saveProduct(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  const existing = await db.execute('SELECT id FROM products WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE products SET name=?, brand=?, image_url=?, price=?, received=?, gross=?, stock=?, low_stock_threshold=?, description=?, category=?, is_shop=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [data.name, data.brand || '', data.imageUrl || '', data.price, data.received, data.gross, data.stock || 0, data.lowStockThreshold || 5, data.description || '', data.category || '', data.isShop ? 1 : 0, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO products (id, name, brand, image_url, price, received, gross, stock, low_stock_threshold, description, category, is_shop, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, data.name, data.brand || '', data.imageUrl || '', data.price, data.received, data.gross, data.stock || 0, data.lowStockThreshold || 5, data.description || '', data.category || '', data.isShop ? 1 : 0, coachId],
    )
  }
  return id
}

export async function deleteProduct(coachId: string, productId: string) {
  const db = getDB()
  await db.execute('DELETE FROM products WHERE id = ? AND coach_id = ?', [productId, coachId])
}

// ============== Sales ==============

export async function getSales(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM sales WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, productId: r.product_id, productName: r.product_name, brand: r.brand || '',
    quantity: r.quantity, unitPrice: r.unit_price, unitReceived: r.unit_received,
    total: r.total, date: r.date, createdAt: r.created_at,
  }))
}

export async function saveSale(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  await db.execute(
    'INSERT INTO sales (id, product_id, product_name, brand, quantity, unit_price, unit_received, total, date, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, data.productId, data.productName, data.brand || '', data.quantity, data.unitPrice, data.unitReceived, data.total, data.date, coachId],
  )
  const product = await db.execute('SELECT stock FROM products WHERE id = ?', [data.productId as string])
  if (product.rows.length > 0) {
    const newStock = Math.max(0, (product.rows[0].stock as number) - (data.quantity as number))
    await db.execute('UPDATE products SET stock = ? WHERE id = ?', [newStock, data.productId])
  }
  return id
}

export async function deleteSale(coachId: string, saleId: string) {
  const db = getDB()
  await db.execute('DELETE FROM sales WHERE id = ? AND coach_id = ?', [saleId, coachId])
}
