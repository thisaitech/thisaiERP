// Page Permissions Service
// Allows admin to control which pages each user/role can access
// Now syncs with Firebase for cross-device consistency

import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db, isFirebaseReady, COLLECTIONS } from './firebase'

export interface PagePermissions {
  dashboard: boolean
  sales: boolean
  pos: boolean
  purchases: boolean
  quotations: boolean
  parties: boolean
  expenses: boolean
  inventory: boolean
  reports: boolean
  banking: boolean
  crm: boolean
  utilities: boolean
  others: boolean
  settings: boolean
  userManagement: boolean
}

export interface UserPermissions {
  userId: string
  email: string
  role: 'admin' | 'manager' | 'sales' | 'cashier'
  displayName?: string
  permissions: PagePermissions
  updatedAt: string
  updatedBy: string
  companyId?: string
}

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PagePermissions> = {
  admin: {
    dashboard: true,
    sales: true,
    pos: true,
    purchases: true,
    quotations: true,
    parties: true,
    expenses: true,
    inventory: true,
    reports: true,
    banking: true,
    crm: true,
    utilities: true,
    others: true,
    settings: true,
    userManagement: true
  },
  manager: {
    dashboard: true,
    sales: true,
    pos: true,
    purchases: true,
    quotations: true,
    parties: true,
    expenses: true,
    inventory: true,
    reports: true,
    banking: false,
    crm: true,
    utilities: true,
    others: true,
    settings: false,
    userManagement: false
  },
  sales: {
    dashboard: true,
    sales: true,
    pos: true,
    purchases: false,
    quotations: true,
    parties: true,
    expenses: false,
    inventory: false,
    reports: false,
    banking: false,
    crm: true,
    utilities: false,
    others: true,
    settings: false,
    userManagement: false
  },
  cashier: {
    dashboard: true,
    sales: true,
    pos: true,
    purchases: false,
    quotations: true,
    parties: true,
    expenses: false,
    inventory: false,
    reports: false,
    banking: false,
    crm: true,
    utilities: false,
    others: false,
    settings: false,
    userManagement: false
  }
}

// Page info for display
export const PAGE_INFO: { key: keyof PagePermissions; label: string; labelTa: string; path: string }[] = [

  { key: 'sales', label: 'Sales', labelTa: 'விற்பனை', path: '/sales' },
  { key: 'pos', label: 'POS', labelTa: 'பிஓஎஸ்', path: '/pos' },
  { key: 'purchases', label: 'Purchases', labelTa: 'கொள்முதல்', path: '/purchases' },
  { key: 'quotations', label: 'Quotations', labelTa: 'மேற்கோள்கள்', path: '/quotations' },
  { key: 'parties', label: 'Parties', labelTa: 'தரப்பினர்', path: '/parties' },
  { key: 'expenses', label: 'Expenses', labelTa: 'செலவுகள்', path: '/expenses' },
  { key: 'inventory', label: 'Inventory', labelTa: 'சரக்கு', path: '/inventory' },
  { key: 'reports', label: 'Reports', labelTa: 'அறிக்கைகள்', path: '/reports' },
  { key: 'banking', label: 'Banking', labelTa: 'வங்கி', path: '/banking' },
  { key: 'crm', label: 'CRM', labelTa: 'சிஆர்எம்', path: '/crm' },
  { key: 'utilities', label: 'Utilities', labelTa: 'பயன்பாடுகள்', path: '/utilities' },
  { key: 'others', label: 'Others (Challan)', labelTa: 'மற்றவை (சலான்)', path: '/more' },
  { key: 'settings', label: 'Settings', labelTa: 'அமைப்புகள்', path: '/settings' },
  { key: 'userManagement', label: 'User Management', labelTa: 'பயனர் மேலாண்மை', path: '/users' }
]

const STORAGE_KEY = 'thisai_crm_page_permissions'
const PERMISSIONS_COLLECTION = 'user_permissions'

// Helper: get current companyId from stored user
const getCurrentCompanyId = (): string | null => {
  try {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) return null
    const user = JSON.parse(userRaw)
    return user.companyId || null
  } catch {
    return null
  }
}

// Get all user permissions from localStorage (cache)
const getAllFromLocalStorage = (): UserPermissions[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading user permissions from localStorage:', error)
  }
  return []
}

// Save to localStorage (cache)
const saveToLocalStorage = (permissions: UserPermissions[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

// Get all user permissions (with Firebase sync)
export const getAllUserPermissions = async (): Promise<UserPermissions[]> => {
  // Try Firebase first
  if (isFirebaseReady() && db) {
    try {
      const companyId = getCurrentCompanyId()
      const permissionsRef = collection(db, PERMISSIONS_COLLECTION)

      let q = permissionsRef
      if (companyId) {
        q = query(permissionsRef, where('companyId', '==', companyId)) as any
      }

      const snapshot = await getDocs(q)
      const permissions: UserPermissions[] = []
      snapshot.forEach((doc) => {
        permissions.push({ ...doc.data(), userId: doc.id } as UserPermissions)
      })

      // Update local cache
      saveToLocalStorage(permissions)
      return permissions
    } catch (error) {
      console.error('Error fetching permissions from Firebase:', error)
    }
  }

  // Fallback to localStorage
  return getAllFromLocalStorage()
}

// Synchronous version for quick access (uses cache)
export const getAllUserPermissionsSync = (): UserPermissions[] => {
  return getAllFromLocalStorage()
}

// Get permissions for a specific user
export const getUserPermissions = async (userId: string, role: string): Promise<PagePermissions> => {
  try {
    // Try Firebase first
    if (isFirebaseReady() && db) {
      const docRef = doc(db, PERMISSIONS_COLLECTION, userId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as UserPermissions
        // Update local cache
        const allPerms = getAllFromLocalStorage()
        const existingIdx = allPerms.findIndex(p => p.userId === userId)
        if (existingIdx >= 0) {
          allPerms[existingIdx] = data
        } else {
          allPerms.push(data)
        }
        saveToLocalStorage(allPerms)
        return data.permissions
      }
    }

    // Check localStorage cache
    const allPermissions = getAllFromLocalStorage()
    const userPermission = allPermissions.find(p => p.userId === userId)

    if (userPermission) {
      return userPermission.permissions
    }

    // Fall back to role defaults
    return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cashier
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cashier
  }
}

// Synchronous version for quick access (uses cache only)
export const getUserPermissionsSync = (userId: string, role: string): PagePermissions => {
  try {
    const allPermissions = getAllFromLocalStorage()
    const userPermission = allPermissions.find(p => p.userId === userId)

    if (userPermission) {
      return userPermission.permissions
    }

    return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cashier
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cashier
  }
}

// Save permissions for a specific user (syncs to Firebase)
export const saveUserPermissions = async (
  userId: string,
  email: string,
  role: 'admin' | 'manager' | 'cashier',
  permissions: PagePermissions,
  updatedBy: string,
  displayName?: string
): Promise<boolean> => {
  try {
    const companyId = getCurrentCompanyId()

    const newPermission: UserPermissions = {
      userId,
      email,
      role,
      displayName,
      permissions,
      updatedAt: new Date().toISOString(),
      updatedBy,
      companyId: companyId || undefined
    }

    // Save to Firebase
    if (isFirebaseReady() && db) {
      const docRef = doc(db, PERMISSIONS_COLLECTION, userId)
      await setDoc(docRef, newPermission)
    }

    // Update localStorage cache
    const allPermissions = getAllFromLocalStorage()
    const existingIndex = allPermissions.findIndex(p => p.userId === userId)

    if (existingIndex >= 0) {
      allPermissions[existingIndex] = newPermission
    } else {
      allPermissions.push(newPermission)
    }

    saveToLocalStorage(allPermissions)
    return true
  } catch (error) {
    console.error('Error saving user permissions:', error)
    return false
  }
}

// Delete permissions for a specific user (reverts to role defaults)
export const deleteUserPermissions = async (userId: string): Promise<boolean> => {
  try {
    // Delete from Firebase
    if (isFirebaseReady() && db) {
      const docRef = doc(db, PERMISSIONS_COLLECTION, userId)
      await deleteDoc(docRef)
    }

    // Update localStorage cache
    const allPermissions = getAllFromLocalStorage()
    const filtered = allPermissions.filter(p => p.userId !== userId)
    saveToLocalStorage(filtered)
    return true
  } catch (error) {
    console.error('Error deleting user permissions:', error)
    return false
  }
}

// Check if user can access a specific page (synchronous for route guards)
export const canAccessPage = (userId: string, role: string, pageKey: keyof PagePermissions): boolean => {
  // Admin always has full access
  if (role === 'admin') {
    return true
  }

  const permissions = getUserPermissionsSync(userId, role)
  return permissions[pageKey] ?? false
}

// Get list of accessible pages for a user
export const getAccessiblePages = (userId: string, role: string): string[] => {
  // Admin always has full access
  if (role === 'admin') {
    return PAGE_INFO.map(p => p.path)
  }

  const permissions = getUserPermissionsSync(userId, role)
  return PAGE_INFO
    .filter(page => permissions[page.key])
    .map(page => page.path)
}

// Reset user permissions to role defaults
export const resetToRoleDefaults = async (userId: string): Promise<boolean> => {
  return deleteUserPermissions(userId)
}

// Sync local permissions to Firebase (for migration)
export const syncLocalToFirebase = async (): Promise<{ synced: number; errors: number }> => {
  let synced = 0
  let errors = 0

  if (!isFirebaseReady() || !db) {
    return { synced, errors: 1 }
  }

  const localPermissions = getAllFromLocalStorage()
  const companyId = getCurrentCompanyId()

  for (const perm of localPermissions) {
    try {
      const docRef = doc(db, PERMISSIONS_COLLECTION, perm.userId)
      await setDoc(docRef, {
        ...perm,
        companyId: companyId || perm.companyId
      })
      synced++
    } catch (error) {
      console.error(`Error syncing permissions for ${perm.userId}:`, error)
      errors++
    }
  }

  return { synced, errors }
}
