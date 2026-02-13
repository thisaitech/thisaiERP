// Page Permissions Service (Self-hosted / REST mode)
// Lightweight localStorage-based permissions.

export interface PagePermissions {
  dashboard: boolean
  sales: boolean
  quotations: boolean
  parties: boolean
  expenses: boolean
  inventory: boolean
  reports: boolean
  banking: boolean
  crm: boolean
  settings: boolean
}

export interface UserPermissions {
  userId: string
  role: 'admin' | 'manager' | 'cashier'
  permissions: PagePermissions
  updatedAt: string
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PagePermissions> = {
  admin: {
    dashboard: true,
    sales: true,
    quotations: true,
    parties: true,
    expenses: true,
    inventory: true,
    reports: true,
    banking: true,
    crm: true,
    settings: true,
  },
  manager: {
    dashboard: true,
    sales: true,
    quotations: true,
    parties: true,
    expenses: true,
    inventory: true,
    reports: true,
    banking: true,
    crm: true,
    settings: false,
  },
  cashier: {
    dashboard: true,
    sales: true,
    quotations: true,
    parties: true,
    expenses: true,
    inventory: true,
    reports: false,
    banking: false,
    crm: false,
    settings: false,
  },
}

const STORAGE_KEY = 'thisai_erp_page_permissions'

const readAll = (): UserPermissions[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? (data as UserPermissions[]) : []
  } catch {
    return []
  }
}

const writeAll = (rows: UserPermissions[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

export const getUserPermissionsSync = (userId: string, role: string): PagePermissions => {
  const row = readAll().find((r) => r.userId === userId)
  if (row?.permissions) return row.permissions
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cashier
}

export const canAccessPage = (userId: string, role: string, pageKey: keyof PagePermissions): boolean => {
  if (role === 'admin') return true
  const perms = getUserPermissionsSync(userId, role)
  return !!perms[pageKey]
}

export const saveUserPermissions = async (userId: string, role: 'admin' | 'manager' | 'cashier', permissions: PagePermissions): Promise<boolean> => {
  try {
    const all = readAll()
    const now = new Date().toISOString()
    const row: UserPermissions = { userId, role, permissions, updatedAt: now }
    const idx = all.findIndex((r) => r.userId === userId)
    if (idx >= 0) all[idx] = row
    else all.push(row)
    writeAll(all)
    return true
  } catch {
    return false
  }
}

export const deleteUserPermissions = async (userId: string): Promise<boolean> => {
  try {
    const all = readAll().filter((r) => r.userId !== userId)
    writeAll(all)
    return true
  } catch {
    return false
  }
}

