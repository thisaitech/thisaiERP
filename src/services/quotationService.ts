// Quotation Service (REST backend)

import { apiDelete, apiGet, apiPost, apiPut } from './apiClient'

export interface QuotationItem {
  id: string
  description: string
  hsn?: string
  quantity: number
  unit: string
  rate: number
  amount: number
  taxRate: number
  tax: number
  discount?: number
}

export interface Quotation {
  id: string
  quotationNumber: string
  quotationDate: string
  validUntil: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'

  partyId: string
  partyName: string
  partyGSTIN?: string
  partyPhone?: string
  partyEmail?: string
  partyAddress?: string
  partyCity?: string
  partyState?: string
  partyStateCode?: string

  items: QuotationItem[]

  subtotal: number
  discount: number
  taxAmount: number
  grandTotal: number

  notes?: string
  termsAndConditions?: string
  paymentTerms?: string

  sentDate?: string
  acceptedDate?: string
  rejectedDate?: string
  convertedToInvoiceId?: string
  convertedDate?: string

  createdAt: string
  updatedAt: string
  createdBy: string
}

type ListResponse<T> = { data: T[] }
type OneResponse<T> = { data: T }

export function generateQuotationNumber(prefix: string = 'QUO'): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${yy}${mm}-${rand}`
}

export async function getQuotations(): Promise<Quotation[]> {
  const res = await apiGet<ListResponse<Quotation>>('/quotations')
  const rows = res.data || []
  rows.sort((a, b) => (b.quotationDate || '').localeCompare(a.quotationDate || ''))
  return rows
}

export async function createQuotation(quotation: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quotation | null> {
  const now = new Date().toISOString()
  const payload: any = {
    ...quotation,
    createdAt: now,
    updatedAt: now,
  }
  const res = await apiPost<OneResponse<Quotation>>('/quotations', payload)
  return res.data
}

export async function updateQuotation(id: string, updates: Partial<Quotation>): Promise<boolean> {
  const now = new Date().toISOString()
  const payload: any = { ...updates, id, updatedAt: now }
  await apiPut<OneResponse<Quotation>>(`/quotations/${encodeURIComponent(id)}`, payload)
  return true
}

export async function deleteQuotation(id: string): Promise<boolean> {
  await apiDelete<{ ok: boolean }>(`/quotations/${encodeURIComponent(id)}`)
  return true
}

