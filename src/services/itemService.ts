// Item/Course Service (REST backend)

import type { Item, InvoiceItem } from '../types'
import { ItemTaxPreference, ItemUnit } from '../types/enums'
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient'

type ListResponse<T> = { data: T[] }
type OneResponse<T> = { data: T }

export async function getItems(): Promise<Item[]> {
  const res = await apiGet<ListResponse<Item>>('/items')
  return res.data || []
}

export async function getItemById(id: string): Promise<Item | null> {
  try {
    const res = await apiGet<OneResponse<Item>>(`/items/${encodeURIComponent(id)}`)
    return res.data
  } catch {
    return null
  }
}

export async function createItem(item: Item): Promise<Item> {
  const payload: any = { ...item }
  if (!payload.id) delete payload.id
  const res = await apiPost<OneResponse<Item>>('/items', payload)
  return res.data
}

export async function updateItem(id: string, updates: Partial<Item>): Promise<boolean> {
  const existing = await getItemById(id)
  if (!existing) return false
  const merged: Item = { ...existing, ...updates, id }
  await apiPut<OneResponse<Item>>(`/items/${encodeURIComponent(id)}`, merged)
  return true
}

export async function deleteItem(id: string): Promise<boolean> {
  await apiDelete<{ ok: boolean }>(`/items/${encodeURIComponent(id)}`)
  return true
}

export async function findItemByHSN(hsnCode: string): Promise<Item | null> {
  if (!hsnCode) return null
  const items = await getItems()
  return items.find((i) => (i.hsnCode || '').trim() === hsnCode.trim()) || null
}

export async function findItemByBarcode(barcode: string): Promise<Item | null> {
  if (!barcode) return null
  const items = await getItems()
  return items.find((i) => (i.barcode || '').trim() === barcode.trim()) || null
}

export async function findItemByName(name: string): Promise<Item | null> {
  if (!name) return null
  const items = await getItems()
  const n = name.trim().toLowerCase()
  return items.find((i) => i.name?.toLowerCase() === n) || items.find((i) => i.name?.toLowerCase().includes(n)) || null
}

// Seats/stock update. For training centers, "stock" = available seats.
export async function updateItemStock(id: string, quantity: number, operation: 'add' | 'subtract'): Promise<boolean> {
  const item = await getItemById(id)
  if (!item) return false
  const delta = operation === 'add' ? quantity : -quantity
  const nextStock = Math.max(0, (item.stock || 0) + delta)
  return updateItem(id, { stock: nextStock })
}

// Optional helper used by some legacy invoice flows.
export async function findOrCreateItemFromInvoice(invoiceItem: InvoiceItem): Promise<Item | null> {
  const existing = invoiceItem.itemId ? await getItemById(invoiceItem.itemId) : await findItemByName(invoiceItem.itemName)
  if (existing) return existing

  // Minimal course auto-create (kept intentionally small).
  if (!invoiceItem.itemName) return null
  const now = new Date().toISOString()
  const newId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const newItem: Item = {
    id: newId,
    name: invoiceItem.itemName,
    itemCode: '',
    category: 'General',
    sellingPrice: invoiceItem.rate || 0,
    purchasePrice: invoiceItem.purchasePrice || 0,
    unit: (invoiceItem.unit as ItemUnit) || ItemUnit.PCS,
    taxPreference: ItemTaxPreference.TAXABLE,
    tax: { cgst: 0, sgst: 0, igst: 0 },
    stock: 0,
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  return createItem(newItem)
}
