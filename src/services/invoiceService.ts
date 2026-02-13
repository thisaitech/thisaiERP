// Invoice/Admission Service (REST backend)

import type { Invoice, ScannedInvoiceData } from '../types'
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient'
import { updateItemStock } from './itemService'

type ListResponse<T> = { data: T[] }
type OneResponse<T> = { data: T }

export async function getInvoices(type?: 'sale' | 'purchase' | 'quote', limit?: number): Promise<Invoice[]> {
  const res = await apiGet<ListResponse<Invoice>>('/invoices')
  let rows = res.data || []
  if (type) rows = rows.filter((r) => (r as any).type === type)

  rows.sort((a: any, b: any) => {
    const da = new Date(a.invoiceDate || a.date || a.createdAt || 0).getTime()
    const db = new Date(b.invoiceDate || b.date || b.createdAt || 0).getTime()
    return db - da
  })

  if (limit && rows.length > limit) rows = rows.slice(0, limit)
  return rows
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const res = await apiGet<OneResponse<Invoice>>(`/invoices/${encodeURIComponent(id)}`)
    return res.data
  } catch {
    return null
  }
}

export async function createInvoice(invoice: Invoice): Promise<Invoice | null> {
  const payload: any = { ...invoice }
  if (!payload.id) delete payload.id

  const now = new Date().toISOString()
  payload.createdAt = payload.createdAt || now
  payload.updatedAt = now

  const res = await apiPost<OneResponse<Invoice>>('/invoices', payload)

  // Seats/stock update for Admissions: subtract course qty.
  try {
    if ((res.data as any).type === 'sale' && Array.isArray((res.data as any).items)) {
      for (const it of (res.data as any).items) {
        if (it?.itemId && typeof it.quantity === 'number') {
          await updateItemStock(it.itemId, it.quantity, 'subtract')
        }
      }
    }
  } catch {
    // Non-fatal.
  }

  return res.data
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<boolean> {
  const existing = await getInvoiceById(id)
  if (!existing) return false
  const merged: any = { ...existing, ...updates, id, updatedAt: new Date().toISOString() }
  await apiPut<OneResponse<Invoice>>(`/invoices/${encodeURIComponent(id)}`, merged)
  return true
}

export async function deleteInvoice(id: string): Promise<boolean> {
  await apiDelete<{ ok: boolean }>(`/invoices/${encodeURIComponent(id)}`)
  return true
}

// Stub: keep legacy callers compiling. Receipt-scanner feature is removed in lightweight build.
export async function processScannedInvoice(_data: ScannedInvoiceData): Promise<Invoice | null> {
  return null
}

