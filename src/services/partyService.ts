// Party/Student Service (REST backend)

import type { Party } from '../types'
import { PartyType } from '../types/enums'
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient'

type ListResponse<T> = { data: T[] }
type OneResponse<T> = { data: T }

export async function getParties(type?: 'customer' | 'supplier' | 'both'): Promise<Party[]> {
  const res = await apiGet<ListResponse<Party>>('/parties')
  let parties = res.data || []
  if (type && type !== 'both') {
    parties = parties.filter((p) => p.type === type || p.type === PartyType.BOTH)
  }
  parties.sort((a, b) => (a.name || a.companyName || '').localeCompare(b.name || b.companyName || ''))
  return parties
}

export async function getPartyById(id: string): Promise<Party | null> {
  try {
    const res = await apiGet<OneResponse<Party>>(`/parties/${encodeURIComponent(id)}`)
    return res.data
  } catch {
    return null
  }
}

export async function createParty(party: Party): Promise<Party> {
  const payload: any = { ...party }
  if (!payload.id) delete payload.id
  const res = await apiPost<OneResponse<Party>>('/parties', payload)
  return res.data
}

export async function updateParty(id: string, updates: Partial<Party>): Promise<boolean> {
  const existing = await getPartyById(id)
  if (!existing) return false
  const merged: Party = { ...existing, ...updates, id }
  await apiPut<OneResponse<Party>>(`/parties/${encodeURIComponent(id)}`, merged)
  return true
}

export async function deleteParty(id: string): Promise<boolean> {
  await apiDelete<{ ok: boolean }>(`/parties/${encodeURIComponent(id)}`)
  return true
}

export async function findPartyByName(name: string, type?: 'customer' | 'supplier' | 'both'): Promise<Party | null> {
  if (!name) return null
  const parties = await getParties(type)
  const n = name.trim().toLowerCase()
  return parties.find((p) => (p.name || p.companyName || p.displayName || '').toLowerCase().includes(n)) || null
}

export async function findPartyByPhone(phone: string): Promise<Party | null> {
  if (!phone) return null
  const target = phone.replace(/\D/g, '')
  const parties = await getParties()
  return (
    parties.find((p) => {
      const pp = (p.phone || '').replace(/\D/g, '')
      return pp === target || pp.endsWith(target) || target.endsWith(pp)
    }) || null
  )
}

export async function getPartiesWithOutstanding(type?: 'customer' | 'supplier' | 'both'): Promise<Party[]> {
  // Outstanding is calculated in the UI in several places; keep this as a simple alias for now.
  return getParties(type)
}

// Legacy no-op exports (keep callers compiling; safe to remove once pages are simplified).
export async function findPartyByGSTIN(_gstin: string): Promise<Party | null> {
  return null
}

export async function autoCleanupDuplicates(): Promise<{ removed: number; kept: number }> {
  return { removed: 0, kept: 0 }
}

// Utility used by Sales page (legacy)
export const getPartyName = (party: Party | null | undefined): string => {
  if (!party) return 'Unknown'
  return (party as any).name || (party as any).displayName || (party as any).companyName || 'Unknown'
}

