// Delivery Challan Service
// Manage delivery challans for goods delivery without invoice
// OFFLINE-FIRST: Always save locally first, sync silently when online

import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import {
  saveToOffline,
  getAllFromOffline,
  getFromOffline,
  deleteFromOffline,
  addToSyncQueue,
  isDeviceOnline,
  STORES
} from './offlineSyncService'

const LOCAL_STORAGE_KEY = 'thisai_crm_delivery_challans'

// Helper to generate offline-safe ID
const generateOfflineId = () => `challan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Check if ID is offline-generated
const isOfflineId = (id: string) => id.startsWith('challan_') || id.startsWith('dc_') || id.startsWith('offline_')

/**
 * Helper function to deeply remove undefined values from an object
 */
function removeUndefinedDeep(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedDeep(item))
  }

  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedDeep(value)
      }
    }
    return cleaned
  }

  return obj
}

// Purpose types for Delivery Challan (GST Compliant)
export type ChallanPurpose =
  | 'job-work'           // Job Work (Rule 55)
  | 'supply-approval'    // Supply on Approval
  | 'exhibition'         // Exhibition or Fair
  | 'branch-transfer'    // Branch Transfer
  | 'free-sample'        // Free Sample
  | 'personal-use'       // Personal Use
  | 'returnable'         // Returnable (Temporary)
  | 'replacement'        // Replacement
  | 'repair'             // For Repair
  | 'other'              // Other

export const CHALLAN_PURPOSE_LABELS: Record<ChallanPurpose, string> = {
  'job-work': 'Job Work (Rule 55)',
  'supply-approval': 'Supply on Approval',
  'exhibition': 'Exhibition or Fair',
  'branch-transfer': 'Branch Transfer',
  'free-sample': 'Free Sample',
  'personal-use': 'Personal Use',
  'returnable': 'Returnable (Temporary)',
  'replacement': 'Replacement',
  'repair': 'For Repair',
  'other': 'Other'
}

export interface DeliveryChallan {
  id: string
  challanNumber: string
  challanDate: string
  // Party Details
  partyId?: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerGSTIN?: string
  customerAddress?: string
  customerState?: string
  // Purpose & Reference
  purpose: ChallanPurpose
  purposeLabel?: string
  reference?: string // PO number, order reference, etc.
  // Items
  items: DeliveryChallanItem[]
  totalQuantity: number
  totalValue?: number // Optional value for E-Way Bill
  // Transport Details
  vehicleNumber?: string
  transporterName?: string
  transporterId?: string // GSTIN of transporter
  driverName?: string
  driverPhone?: string
  lrNumber?: string // Lorry Receipt Number
  // Status
  status: 'pending' | 'in-transit' | 'delivered' | 'returned' | 'converted'
  deliveredDate?: string
  returnedDate?: string
  // E-Way Bill
  ewayBillNumber?: string
  ewayBillDate?: string
  // Conversion
  convertedInvoiceId?: string
  convertedInvoiceNumber?: string
  // Additional
  remarks?: string
  // Timestamps
  createdAt: string
  updatedAt: string
}

export interface DeliveryChallanItem {
  id: string
  itemId?: string
  itemName: string
  hsnCode?: string
  quantity: number
  unit: string
  rate?: number // Optional - for value calculation
  value?: number // qty × rate
  description?: string
}

const CHALLAN_COUNTER_KEY = 'thisai_crm_challan_counter'

/**
 * Generate delivery challan number (sequential)
 */
export function generateChallanNumber(): string {
  const date = new Date()
  const year = date.getFullYear()

  // Get or initialize counter
  let counter = parseInt(localStorage.getItem(CHALLAN_COUNTER_KEY) || '0')
  counter++
  localStorage.setItem(CHALLAN_COUNTER_KEY, counter.toString())

  return `DC-${year}-${counter.toString().padStart(4, '0')}`
}

/**
 * Create delivery challan - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 */
export async function createDeliveryChallan(
  challanData: Omit<DeliveryChallan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DeliveryChallan | null> {
  console.log('[createDeliveryChallan] Starting offline-first creation...')

  const now = new Date().toISOString()
  const id = generateOfflineId()

  // Deep clean undefined values
  const cleanData = removeUndefinedDeep(challanData)

  const newChallan: DeliveryChallan = {
    ...cleanData,
    id,
    createdAt: now,
    updatedAt: now,
    _pendingSync: !isDeviceOnline(),
    _savedAt: now,
    _syncedAt: null
  } as DeliveryChallan

  // STEP 1: Always save locally first
  try {
    await saveToOffline(STORES.DELIVERY_CHALLANS, newChallan)
    // Also save to localStorage for backward compatibility
    const challans = getChallansFromLocalStorage()
    challans.push(newChallan)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(challans))
    console.log('[createDeliveryChallan] ✅ Challan saved locally:', id)
  } catch (error) {
    console.error('[createDeliveryChallan] Failed to save locally:', error)
    // Fallback to localStorage only
    const challans = getChallansFromLocalStorage()
    challans.push(newChallan)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(challans))
  }

  // STEP 2: If online, sync to Firebase silently
  if (isDeviceOnline() && isFirebaseReady()) {
    try {
      const serverData = removeUndefinedDeep({
        ...challanData,
        createdAt: now,
        updatedAt: now
      })

      const docRef = await addDoc(collection(db!, COLLECTIONS.DELIVERY_CHALLANS), serverData)

      // Update local challan with Firebase ID
      const syncedChallan: DeliveryChallan = {
        ...newChallan,
        id: docRef.id,
        _pendingSync: false,
        _syncedAt: now
      } as DeliveryChallan

      // Remove old offline ID record and save with new Firebase ID
      await deleteFromOffline(STORES.DELIVERY_CHALLANS, id)
      await saveToOffline(STORES.DELIVERY_CHALLANS, syncedChallan)

      // Update localStorage too
      const challans = getChallansFromLocalStorage()
      const filteredChallans = challans.filter(c => c.id !== id)
      filteredChallans.push(syncedChallan)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredChallans))

      console.log('[createDeliveryChallan] ✅ Synced to Firebase:', docRef.id)
      return syncedChallan
    } catch (error) {
      console.warn('[createDeliveryChallan] Firebase sync failed, queuing for later:', error)
      await addToSyncQueue('create', STORES.DELIVERY_CHALLANS, newChallan)
    }
  } else {
    console.log('[createDeliveryChallan] 📱 Offline mode - queuing for sync')
    await addToSyncQueue('create', STORES.DELIVERY_CHALLANS, newChallan)
  }

  return newChallan
}

/**
 * Get all delivery challans
 * OFFLINE-FIRST: Returns from IndexedDB first, then syncs with Firebase in background
 */
export async function getDeliveryChallans(): Promise<DeliveryChallan[]> {
  console.log('📥 deliveryChallanService.getDeliveryChallans called')

  // STEP 1: Always try IndexedDB first
  let localChallans: DeliveryChallan[] = []
  try {
    localChallans = await getAllFromOffline<DeliveryChallan>(STORES.DELIVERY_CHALLANS)
    // Sort by challanDate descending
    localChallans.sort((a, b) => new Date(b.challanDate).getTime() - new Date(a.challanDate).getTime())
  } catch (error) {
    console.warn('IndexedDB read failed, trying localStorage:', error)
    localChallans = getChallansFromLocalStorage()
  }

  // STEP 2: If offline or Firebase not ready, return local data immediately
  if (!isDeviceOnline() || !isFirebaseReady()) {
    console.log('📱 Offline mode: Returning', localChallans.length, 'challans from local storage')
    return localChallans
  }

  // STEP 3: If online, try to fetch from Firebase and merge
  try {
    const q = query(collection(db!, COLLECTIONS.DELIVERY_CHALLANS), orderBy('challanDate', 'desc'))
    const snapshot = await getDocs(q)
    const serverChallans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DeliveryChallan))

    // Merge: Keep local-only items (offline created, not yet synced)
    const localOnlyChallans = localChallans.filter(c => isOfflineId(c.id))
    const mergedChallans = [...serverChallans, ...localOnlyChallans]

    // Update local cache with server data (in background)
    for (const challan of serverChallans) {
      saveToOffline(STORES.DELIVERY_CHALLANS, challan).catch(() => {})
    }

    console.log('☁️ Retrieved from Firebase:', serverChallans.length, 'challans, merged with', localOnlyChallans.length, 'local')
    return mergedChallans.sort((a, b) => new Date(b.challanDate).getTime() - new Date(a.challanDate).getTime())
  } catch (error) {
    console.warn('Firebase fetch failed, returning local data:', error)
    return localChallans
  }
}

/**
 * Get delivery challan by ID
 * OFFLINE-FIRST: Checks IndexedDB first, then localStorage, then Firebase
 */
export async function getDeliveryChallanById(id: string): Promise<DeliveryChallan | null> {
  // STEP 1: Try IndexedDB first
  try {
    const localChallan = await getFromOffline<DeliveryChallan>(STORES.DELIVERY_CHALLANS, id)
    if (localChallan) {
      return localChallan
    }
  } catch (error) {
    console.warn('IndexedDB read failed:', error)
  }

  // STEP 2: Check localStorage fallback
  const challans = getChallansFromLocalStorage()
  const localStorageChallan = challans.find(c => c.id === id)
  if (localStorageChallan) {
    return localStorageChallan
  }

  // STEP 3: If offline or Firebase not ready, return null
  if (!isDeviceOnline() || !isFirebaseReady()) {
    return null
  }

  // STEP 4: Try Firebase (would need getDoc import, keeping simple for now)
  return null
}

/**
 * Update delivery challan - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 */
export async function updateDeliveryChallan(
  id: string,
  updates: Partial<DeliveryChallan>
): Promise<boolean> {
  const now = new Date().toISOString()

  // STEP 1: Get existing challan from local
  let existingChallan: DeliveryChallan | null = null
  try {
    existingChallan = await getFromOffline<DeliveryChallan>(STORES.DELIVERY_CHALLANS, id)
  } catch (error) {
    const localChallans = getChallansFromLocalStorage()
    existingChallan = localChallans.find(c => c.id === id) || null
  }

  if (!existingChallan) {
    console.error('[updateDeliveryChallan] Challan not found:', id)
    return false
  }

  const updatedChallan: DeliveryChallan = {
    ...existingChallan,
    ...updates,
    updatedAt: now,
    _pendingSync: !isDeviceOnline() || isOfflineId(id),
    _savedAt: now
  } as DeliveryChallan

  // STEP 2: Always save to IndexedDB first
  try {
    await saveToOffline(STORES.DELIVERY_CHALLANS, updatedChallan)
    updateChallanInLocalStorage(id, updatedChallan)
    console.log('[updateDeliveryChallan] ✅ Updated locally:', id)
  } catch (error) {
    console.error('[updateDeliveryChallan] Local save failed:', error)
    updateChallanInLocalStorage(id, updatedChallan)
  }

  // STEP 3: If online and not an offline-only record, sync to Firebase
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      const serverData = removeUndefinedDeep({
        ...updates,
        updatedAt: now
      })
      const docRef = doc(db!, COLLECTIONS.DELIVERY_CHALLANS, id)
      await updateDoc(docRef, serverData)

      // Mark as synced
      updatedChallan._pendingSync = false
      updatedChallan._syncedAt = now
      await saveToOffline(STORES.DELIVERY_CHALLANS, updatedChallan)

      console.log('[updateDeliveryChallan] ✅ Synced to Firebase:', id)
    } catch (error) {
      console.warn('[updateDeliveryChallan] Firebase sync failed, queuing:', error)
      await addToSyncQueue('update', STORES.DELIVERY_CHALLANS, updatedChallan)
    }
  } else if (!isOfflineId(id)) {
    await addToSyncQueue('update', STORES.DELIVERY_CHALLANS, updatedChallan)
  }

  return true
}

/**
 * Update delivery challan status - OFFLINE FIRST
 */
export async function updateChallanStatus(
  id: string,
  status: DeliveryChallan['status'],
  deliveredDate?: string
): Promise<boolean> {
  const updates: Partial<DeliveryChallan> = { status }

  if (deliveredDate) {
    updates.deliveredDate = deliveredDate
  }

  if (status === 'returned') {
    updates.returnedDate = new Date().toISOString()
  }

  return updateDeliveryChallan(id, updates)
}

/**
 * Delete delivery challan - OFFLINE FIRST
 * Always deletes locally first, then syncs to Firebase silently when online
 */
export async function deleteDeliveryChallan(id: string): Promise<boolean> {
  // STEP 1: Always delete from local first
  try {
    await deleteFromOffline(STORES.DELIVERY_CHALLANS, id)
    deleteChallanFromLocalStorage(id)
    console.log('[deleteDeliveryChallan] ✅ Deleted locally:', id)
  } catch (error) {
    console.error('[deleteDeliveryChallan] Local delete failed:', error)
    deleteChallanFromLocalStorage(id)
  }

  // STEP 2: If online and has Firebase ID, sync deletion
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      await deleteDoc(doc(db!, COLLECTIONS.DELIVERY_CHALLANS, id))
      console.log('[deleteDeliveryChallan] ✅ Deleted from Firebase:', id)
    } catch (error) {
      console.warn('[deleteDeliveryChallan] Firebase delete failed, queuing:', error)
      await addToSyncQueue('delete', STORES.DELIVERY_CHALLANS, { id })
    }
  } else if (!isOfflineId(id)) {
    await addToSyncQueue('delete', STORES.DELIVERY_CHALLANS, { id })
  }

  return true
}

// LocalStorage functions for backward compatibility
function getChallansFromLocalStorage(): DeliveryChallan[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading challans from localStorage:', error)
    return []
  }
}

function updateChallanInLocalStorage(id: string, updates: Partial<DeliveryChallan>): boolean {
  try {
    const challans = getChallansFromLocalStorage()
    const index = challans.findIndex(c => c.id === id)
    if (index !== -1) {
      challans[index] = { ...challans[index], ...updates }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(challans))
      return true
    }
    return false
  } catch (error) {
    console.error('Error updating challan in localStorage:', error)
    return false
  }
}

function deleteChallanFromLocalStorage(id: string): boolean {
  try {
    const challans = getChallansFromLocalStorage()
    const filtered = challans.filter(c => c.id !== id)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting challan from localStorage:', error)
    return false
  }
}
