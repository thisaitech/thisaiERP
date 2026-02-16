import { apiGet, apiPost } from './apiClient'

type ListResponse<T> = { data: T[] }

type MigrationSpec = {
  storageKey: string
  apiPath: string
}

const MIGRATION_VERSION = 'v1'

const migrationSpecs: MigrationSpec[] = [
  { storageKey: 'thisai_crm_items', apiPath: '/items' },
  { storageKey: 'thisai_crm_parties', apiPath: '/parties' },
  { storageKey: 'thisai_crm_invoices', apiPath: '/invoices' },
  { storageKey: 'thisai_crm_expenses', apiPath: '/expenses' },
  { storageKey: 'thisai_crm_quotations', apiPath: '/quotations' },
  { storageKey: 'thisai_crm_leads', apiPath: '/leads' },
]

const getMigrationFlagKey = (companyId?: string) =>
  `thisai_legacy_data_migrated_${MIGRATION_VERSION}:${companyId || 'default'}`

const readLegacyRows = (storageKey: string): any[] => {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function migrateLegacyLocalDataToApi(companyId?: string): Promise<{ found: number; migrated: number }> {
  if (typeof window === 'undefined') return { found: 0, migrated: 0 }

  const flagKey = getMigrationFlagKey(companyId)
  if (localStorage.getItem(flagKey) === '1') return { found: 0, migrated: 0 }

  let found = 0
  let migrated = 0

  for (const spec of migrationSpecs) {
    const legacyRows = readLegacyRows(spec.storageKey)
    if (legacyRows.length === 0) continue
    found += legacyRows.length

    let existing: any[] = []
    try {
      const res = await apiGet<ListResponse<any>>(spec.apiPath)
      existing = Array.isArray(res?.data) ? res.data : []
    } catch {
      // If API is not reachable, keep retrying on next app load by not setting migrated flag yet.
      return { found, migrated }
    }

    // If backend already has rows for this entity, skip migration to avoid duplicates.
    if (existing.length > 0) continue

    for (const row of legacyRows) {
      if (!row || typeof row !== 'object') continue
      const payload: any = { ...row }
      if (!payload.id) delete payload.id
      try {
        await apiPost(spec.apiPath, payload)
        migrated += 1
      } catch {
        // Ignore individual row errors and continue.
      }
    }
  }

  localStorage.setItem(flagKey, '1')
  return { found, migrated }
}

