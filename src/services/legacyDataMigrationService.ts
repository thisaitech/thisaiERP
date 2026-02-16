import { apiGet, apiPost } from './apiClient'

type ListResponse<T> = { data: T[] }

type MigrationSpec = {
  storageKey: string
  apiPath: string
}

const MIGRATION_VERSION = 'v2'

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
  let hadErrors = false

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

    // Import only missing rows by ID so partial datasets can still be recovered.
    const existingIds = new Set(
      existing
        .map((row) => row?.id)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    )

    for (const row of legacyRows) {
      if (!row || typeof row !== 'object') continue
      const payload: any = { ...row }
      const rowId = typeof payload.id === 'string' ? payload.id : undefined
      if (rowId && existingIds.has(rowId)) continue

      // Let backend generate an id when legacy id is missing/invalid.
      if (!rowId || rowId.trim().length === 0) delete payload.id

      try {
        const created = await apiPost<any>(spec.apiPath, payload)
        const createdId = created?.data?.id || created?.id || payload.id
        if (typeof createdId === 'string' && createdId.trim().length > 0) {
          existingIds.add(createdId)
        }
        migrated += 1
      } catch {
        // Keep going for other rows and retry in future app loads.
        hadErrors = true
      }
    }
  }

  if (!hadErrors) {
    localStorage.setItem(flagKey, '1')
  }
  return { found, migrated }
}
