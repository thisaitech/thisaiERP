import { apiDelete, apiGet, apiPost, apiPut } from './apiClient'

export type EnquiryType = 'training' | 'it'

export type VisitorSource =
  | 'walk_in'
  | 'website'
  | 'referral'
  | 'social_media'
  | 'advertisement'
  | 'phone'
  | 'other'

export interface Visitor {
  id: string
  name: string
  phone: string
  address: string
  enquiryType: EnquiryType
  course?: string
  profession?: string
  source: VisitorSource
  sourceDetail?: string
  notes?: string
  visitDate: string
  createdAt: string
  updatedAt: string
}

type ListResponse<T> = { data: T[] }
type OneResponse<T> = { data: T }

export const ENQUIRY_TYPE_LABELS: Record<EnquiryType, string> = {
  training: 'Training',
  it: 'IT Services',
}

export const SOURCE_LABELS: Record<VisitorSource, string> = {
  walk_in: 'Walk-in',
  website: 'Website',
  referral: 'Referral',
  social_media: 'Social Media',
  advertisement: 'Advertisement',
  phone: 'Phone Call',
  other: 'Other',
}

export async function getVisitors(): Promise<Visitor[]> {
  const res = await apiGet<ListResponse<Visitor>>('/visitors')
  const rows = res.data || []
  rows.sort((a, b) => (b.visitDate || b.updatedAt || '').localeCompare(a.visitDate || a.updatedAt || ''))
  return rows
}

export async function createVisitor(
  visitor: Omit<Visitor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Visitor> {
  const now = new Date().toISOString()
  const payload = { ...visitor, createdAt: now, updatedAt: now }
  const res = await apiPost<OneResponse<Visitor>>('/visitors', payload)
  return res.data
}

export async function updateVisitor(id: string, updates: Partial<Visitor>): Promise<Visitor> {
  const now = new Date().toISOString()
  const payload = { ...updates, id, updatedAt: now }
  const res = await apiPut<OneResponse<Visitor>>(`/visitors/${encodeURIComponent(id)}`, payload)
  return res.data
}

export async function deleteVisitor(id: string): Promise<void> {
  await apiDelete<{ ok: boolean }>(`/visitors/${encodeURIComponent(id)}`)
}
