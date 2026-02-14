// Lead/CRM Service (REST backend)

import { apiDelete, apiGet, apiPost, apiPut } from './apiClient'

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'lost'
export type LeadStage =
  | 'lead_created'
  | 'qualified'
  | 'site_visit_scheduled'
  | 'requirements_collected'
  | 'drawing_prepared'
  | 'quotation_sent'
  | 'negotiation'
  | 'confirmed'
  | 'waiting'
  | 'lost'

export interface Lead {
  id: string
  name: string
  phone?: string
  email?: string
  status: LeadStatus
  stage?: LeadStage
  notes?: string
  expectedValue?: number
  nextFollowUpAt?: string
  lastActivityTitle?: string
  lastActivityAt?: string
  createdAt: string
  updatedAt: string
}

type ListResponse<T> = { data: T[] }
type OneResponse<T> = { data: T }

export async function getLeads(): Promise<Lead[]> {
  const res = await apiGet<ListResponse<Lead>>('/leads')
  const rows = res.data || []
  rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  return rows
}

export async function createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
  const now = new Date().toISOString()
  const payload: any = { ...lead, createdAt: now, updatedAt: now }
  const res = await apiPost<OneResponse<Lead>>('/leads', payload)
  return res.data
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const now = new Date().toISOString()
  const payload: any = { ...updates, id, updatedAt: now }
  const res = await apiPut<OneResponse<Lead>>(`/leads/${encodeURIComponent(id)}`, payload)
  return res.data
}

export async function deleteLead(id: string): Promise<void> {
  await apiDelete<{ ok: boolean }>(`/leads/${encodeURIComponent(id)}`)
}
