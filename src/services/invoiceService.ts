// Invoice/Bill Service
// CRUD operations and business logic for invoices
// Offline-first: Always save locally first, sync silently when online

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import type { Invoice, ScannedInvoiceData } from '../types'
import { findOrCreatePartyFromInvoice } from './partyService'
import { findOrCreateItemFromInvoice, updateItemStock } from './itemService'
import { calculateGST, calculateInvoiceTotals } from './taxCalculations'
import { createInvoiceLedgerEntry } from './ledgerService'
import {
  saveToOffline,
  getAllFromOffline,
  getFromOffline,
  deleteFromOffline,
  addToSyncQueue,
  registerSyncCallback,
  isDeviceOnline,
  STORES
} from './offlineSyncService'

/**
 * Recursively removes undefined values from an object
 * Firebase doesn't accept undefined values in documents
 */
function sanitizeForFirebase(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirebase(item)).filter(item => item !== undefined)
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const sanitizedValue = sanitizeForFirebase(value)
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue
        }
      }
    }
    return sanitized
  }
  
  return obj
}

const LOCAL_STORAGE_KEY = 'thisai_crm_invoices'

// Helper: get current companyId from stored user (for multi-tenant scoping)
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

// Helper: get current user info (for role-based filtering)
const getCurrentUserInfo = (): { uid: string; role: string; companyId: string } | null => {
  try {
    const userRaw = localStorage.getItem('user')
    if (!userRaw) return null
    const user = JSON.parse(userRaw)
    return {
      uid: user.uid || null,
      role: user.role || 'cashier',
      companyId: user.companyId || null
    }
  } catch {
    return null
  }
}

// Helper: filter invoices based on user role
// - Cashier: only sees their own invoices (createdByUserId matches)
// - Manager/Admin: sees all company invoices
const filterByUserRole = (invoices: Invoice[], userInfo: { uid: string; role: string } | null): Invoice[] => {
  if (!userInfo) return invoices

  // Admin and Manager see all invoices
  if (userInfo.role === 'admin' || userInfo.role === 'manager') {
    return invoices
  }

  // Cashier only sees their own invoices
  if (userInfo.role === 'cashier') {
    return invoices.filter(inv => {
      const createdBy = (inv as any).createdByUserId
      // Show invoice if: created by this user OR no createdByUserId (legacy data)
      return !createdBy || createdBy === userInfo.uid
    })
  }

  return invoices
}

// Pagination interface for scalable data fetching
export interface PaginationOptions {
  limit?: number
  offset?: number
  cursor?: string // For cursor-based pagination
  sortBy?: 'invoiceDate' | 'createdAt' | 'invoiceNumber'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  hasMore: boolean
  nextCursor?: string
  prevCursor?: string
}

/**
 * Get all invoices (with optional type filter) - OFFLINE FIRST
 * Returns from IndexedDB first, then syncs with Firebase in background
 * NOTE: Uses simple Firebase query + client-side filtering to avoid composite index issues
 */
export async function getInvoices(type?: 'sale' | 'purchase' | 'quote', limit?: number): Promise<Invoice[]> {
  console.log('📥 invoiceService.getInvoices called, type:', type)

  // Helper to check if ID is offline-generated
  const isOfflineId = (id: string) => id.startsWith('invoice_') || id.startsWith('offline_')

  // STEP 1: Always try IndexedDB first (instant, works offline)
  let localInvoices: Invoice[] = []
  try {
    localInvoices = await getAllFromOffline<Invoice>(STORES.INVOICES)
    // Filter by type if specified
    if (type) {
      localInvoices = localInvoices.filter(inv => inv.type === type)
    }
    // Sort by invoiceDate descending
    localInvoices.sort((a, b) => {
      const dateA = new Date((a as any).invoiceDate || (a as any).createdAt || 0).getTime()
      const dateB = new Date((b as any).invoiceDate || (b as any).createdAt || 0).getTime()
      return dateB - dateA
    })
    // Apply limit if specified
    if (limit && localInvoices.length > limit) {
      localInvoices = localInvoices.slice(0, limit)
    }
    console.log('[getInvoices] Found', localInvoices.length, 'invoices in IndexedDB')
  } catch (error) {
    console.warn('[getInvoices] IndexedDB read failed, trying localStorage:', error)
    localInvoices = getInvoicesFromLocalStorage(type, limit)
  }

  // STEP 2: If offline or Firebase not ready, return local data immediately
  if (!isDeviceOnline() || !isFirebaseReady()) {
    // Apply role-based filtering even for offline data
    const userInfo = getCurrentUserInfo()
    if (userInfo) {
      localInvoices = filterByUserRole(localInvoices, userInfo)
    }
    console.log('📱 Offline mode: Returning', localInvoices.length, 'invoices from local storage (role:', userInfo?.role || 'unknown', ')')
    return localInvoices
  }

  // STEP 3: If online, try to fetch from Firebase and merge
  const invoicesRef = collection(db!, COLLECTIONS.INVOICES)
  const companyId = getCurrentCompanyId()

  try {
    // Use simple query to avoid composite index issues
    // Fetch all invoices and filter client-side
    console.log('[getInvoices] Fetching from Firebase (simple query)...')
    const snapshot = await getDocs(invoicesRef)

    let serverInvoices = snapshot.docs.map(docToInvoice)
    console.log('[getInvoices] Raw Firebase response:', serverInvoices.length, 'invoices')

    // Debug: Log items for converted invoices
    serverInvoices.forEach(inv => {
      if ((inv as any).convertedFrom || (inv as any).invoiceNumber?.includes('INV/2025-26/38')) {
        console.log('🔍 [getInvoices] Converted invoice from Firebase:', (inv as any).invoiceNumber)
        console.log('🔍 [getInvoices] Items:', (inv as any).items)
        console.log('🔍 [getInvoices] Items isArray:', Array.isArray((inv as any).items))
        console.log('🔍 [getInvoices] Items length:', (inv as any).items?.length)
      }
    })

    // Client-side filtering for type
    if (type) {
      serverInvoices = serverInvoices.filter(inv => inv.type === type)
      console.log('[getInvoices] After type filter:', serverInvoices.length, 'invoices')
    }

    // Client-side filtering for companyId
    // IMPORTANT: Show data if companyId matches OR if data has no companyId (legacy data)
    // This prevents data from "disappearing" due to companyId mismatch
    if (companyId) {
      const beforeFilter = serverInvoices.length
      serverInvoices = serverInvoices.filter(inv => {
        const invCompanyId = (inv as any).companyId
        // Show if: no companyId on invoice (legacy) OR companyId matches
        return !invCompanyId || invCompanyId === companyId
      })
      console.log('[getInvoices] After companyId filter:', serverInvoices.length, 'of', beforeFilter, 'invoices (companyId:', companyId, ')')
    }

    // Role-based filtering: Cashiers only see their own invoices
    const userInfo = getCurrentUserInfo()
    if (userInfo) {
      const beforeRoleFilter = serverInvoices.length
      serverInvoices = filterByUserRole(serverInvoices, userInfo)
      console.log('[getInvoices] After role filter:', serverInvoices.length, 'of', beforeRoleFilter, 'invoices (role:', userInfo.role, ')')
    }

    // Client-side sorting by invoiceDate descending
    serverInvoices.sort((a, b) => {
      const dateA = new Date((a as any).invoiceDate || (a as any).createdAt || 0).getTime()
      const dateB = new Date((b as any).invoiceDate || (b as any).createdAt || 0).getTime()
      return dateB - dateA
    })

    // Apply limit after filtering
    if (limit && serverInvoices.length > limit) {
      serverInvoices = serverInvoices.slice(0, limit)
    }

    // Merge: Keep local-only items (offline created, not yet synced)
    const localOnlyInvoices = localInvoices.filter(inv => isOfflineId(inv.id))
    const mergedInvoices = [...serverInvoices, ...localOnlyInvoices]

    // Update local cache with server data (in background)
    for (const invoice of serverInvoices) {
      saveToOffline(STORES.INVOICES, invoice).catch(() => {})
    }

    console.log('☁️ Retrieved from Firebase:', serverInvoices.length, 'invoices, merged with', localOnlyInvoices.length, 'local')

    // Sort merged results
    mergedInvoices.sort((a, b) => {
      const dateA = new Date((a as any).invoiceDate || (a as any).createdAt || 0).getTime()
      const dateB = new Date((b as any).invoiceDate || (b as any).createdAt || 0).getTime()
      return dateB - dateA
    })

    return limit ? mergedInvoices.slice(0, limit) : mergedInvoices
  } catch (error) {
    console.warn('[getInvoices] Firebase fetch failed, returning local data:', error)
    return localInvoices
  }
}

/**
 * Get invoices with pagination - SCALABLE VERSION
 * Uses cursor-based pagination for better performance with large datasets
 */
export async function getInvoicesPaginated(
  type?: 'sale' | 'purchase' | 'quote',
  options: PaginationOptions = {}
): Promise<PaginatedResult<Invoice>> {
  const {
    limit = 20,
    cursor,
    sortBy = 'invoiceDate',
    sortOrder = 'desc'
  } = options

  console.log('📥 getInvoicesPaginated called', { type, limit, cursor, sortBy, sortOrder })

  // STEP 1: Try IndexedDB first for offline support
  let localInvoices: Invoice[] = []
  try {
    localInvoices = await getAllFromOffline<Invoice>(STORES.INVOICES)

    // Apply filters
    if (type) {
      localInvoices = localInvoices.filter(inv => inv.type === type)
    }

    // Apply sorting
    localInvoices.sort((a, b) => {
      const aValue = (a as any)[sortBy] || (a as any).createdAt || 0
      const bValue = (b as any)[sortBy] || (b as any).createdAt || 0

      const comparison = sortOrder === 'desc'
        ? new Date(bValue).getTime() - new Date(aValue).getTime()
        : new Date(aValue).getTime() - new Date(bValue).getTime()

      return comparison
    })

    // Apply cursor-based pagination
    let startIndex = 0
    if (cursor) {
      const cursorIndex = localInvoices.findIndex(inv => inv.id === cursor)
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1
      }
    }

    const paginatedData = localInvoices.slice(startIndex, startIndex + limit)
    const hasMore = startIndex + limit < localInvoices.length
    const nextCursor = hasMore && paginatedData.length > 0
      ? paginatedData[paginatedData.length - 1].id
      : undefined

    return {
      data: paginatedData,
      total: localInvoices.length,
      hasMore,
      nextCursor
    }
  } catch (error) {
    console.warn('[getInvoicesPaginated] IndexedDB failed:', error)
  }

  // STEP 2: If offline or Firebase not ready, return local data
  if (!isDeviceOnline() || !isFirebaseReady()) {
    return {
      data: localInvoices.slice(0, limit),
      total: localInvoices.length,
      hasMore: localInvoices.length > limit
    }
  }

  // STEP 3: Fetch from Firebase with pagination
  try {
    const invoicesRef = collection(db!, COLLECTIONS.INVOICES)
    const companyId = getCurrentCompanyId()

    const snapshot = await getDocs(invoicesRef)
    let serverInvoices = snapshot.docs.map(docToInvoice)

    // Apply company filtering - show data with matching companyId OR no companyId (legacy)
    if (companyId) {
      serverInvoices = serverInvoices.filter(inv => {
        const invCompanyId = (inv as any).companyId
        return !invCompanyId || invCompanyId === companyId
      })
    }

    // Role-based filtering: Cashiers only see their own invoices
    const userInfo = getCurrentUserInfo()
    if (userInfo) {
      serverInvoices = filterByUserRole(serverInvoices, userInfo)
    }

    // Apply type filtering
    if (type) {
      serverInvoices = serverInvoices.filter(inv => inv.type === type)
    }

    // Apply sorting
    serverInvoices.sort((a, b) => {
      const aValue = (a as any)[sortBy] || (a as any).createdAt || 0
      const bValue = (b as any)[sortBy] || (b as any).createdAt || 0

      const comparison = sortOrder === 'desc'
        ? new Date(bValue).getTime() - new Date(aValue).getTime()
        : new Date(aValue).getTime() - new Date(bValue).getTime()

      return comparison
    })

    // Apply cursor-based pagination
    let startIndex = 0
    if (cursor) {
      const cursorIndex = serverInvoices.findIndex(inv => inv.id === cursor)
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1
      }
    }

    const paginatedData = serverInvoices.slice(startIndex, startIndex + limit)
    const hasMore = startIndex + limit < serverInvoices.length
    const nextCursor = hasMore && paginatedData.length > 0
      ? paginatedData[paginatedData.length - 1].id
      : undefined

    // Update local cache asynchronously
    paginatedData.forEach(invoice => {
      saveToOffline(STORES.INVOICES, invoice).catch(() => {})
    })

    return {
      data: paginatedData,
      total: serverInvoices.length,
      hasMore,
      nextCursor
    }
  } catch (error) {
    console.warn('[getInvoicesPaginated] Firebase fetch failed:', error)
    // Fallback to local data
    return {
      data: localInvoices.slice(0, limit),
      total: localInvoices.length,
      hasMore: localInvoices.length > limit
    }
  }
}

/**
 * Get invoice by ID - OFFLINE FIRST
 * Checks IndexedDB first, then localStorage, then Firebase
 */
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  console.log('[getInvoiceById] Looking for invoice:', id)

  // STEP 1: Try IndexedDB first (instant, works offline)
  try {
    const localInvoice = await getFromOffline<Invoice>(STORES.INVOICES, id)
    if (localInvoice) {
      console.log('[getInvoiceById] Found in IndexedDB:', id)
      console.log('[getInvoiceById] IndexedDB invoice items:', (localInvoice as any).items)
      console.log('[getInvoiceById] IndexedDB invoice items isArray:', Array.isArray((localInvoice as any).items))
      return localInvoice
    }
  } catch (error) {
    console.warn('[getInvoiceById] IndexedDB read failed:', error)
  }

  // STEP 2: Check localStorage fallback
  const invoices = getInvoicesFromLocalStorage()
  console.log('[getInvoiceById] localStorage invoices count:', invoices.length)
  const localStorageInvoice = invoices.find(i => i.id === id)
  if (localStorageInvoice) {
    console.log('[getInvoiceById] Found in localStorage:', id)
    console.log('[getInvoiceById] localStorage invoice items:', (localStorageInvoice as any).items)
    console.log('[getInvoiceById] localStorage invoice items isArray:', Array.isArray((localStorageInvoice as any).items))
    return localStorageInvoice
  }

  console.log('[getInvoiceById] Not found in IndexedDB or localStorage, checking Firebase...')

  // STEP 3: If offline or Firebase not ready, return null
  if (!isDeviceOnline() || !isFirebaseReady()) {
    console.log('[getInvoiceById] Offline - invoice not found locally:', id)
    return null
  }

  // STEP 4: Try Firebase
  try {
    console.log('[getInvoiceById] Fetching from Firebase, id:', id)
    const docRef = doc(db!, COLLECTIONS.INVOICES, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const invoice = docToInvoice(docSnap)
      console.log('[getInvoiceById] Found in Firebase:', id)
      console.log('[getInvoiceById] Firebase invoice items:', (invoice as any).items)
      console.log('[getInvoiceById] Firebase invoice items isArray:', Array.isArray((invoice as any).items))
      // Cache in IndexedDB for future offline access
      saveToOffline(STORES.INVOICES, invoice).catch(() => {})
      console.log('[getInvoiceById] Fetched from Firebase and cached:', id)
      return invoice
    }
    console.log('[getInvoiceById] Not found in Firebase:', id)
    return null
  } catch (error) {
    console.error('[getInvoiceById] Firebase fetch failed:', error)
    return null
  }
}

/**
 * Create new invoice - OFFLINE FIRST
 * Always saves locally first, then syncs to server silently when online
 * No alerts, no popups - completely silent operation
 */
export async function createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice | null> {
  const now = new Date().toISOString()
  const id = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const companyId = getCurrentCompanyId()
  const userInfo = getCurrentUserInfo()

  // Remove undefined values - Firestore doesn't accept them
  const cleanData = Object.fromEntries(
    Object.entries(invoiceData).filter(([_, value]) => value !== undefined)
  )

  const newInvoice: Invoice = {
    ...cleanData,
    id,
    createdAt: now,
    updatedAt: now,
    ...(companyId ? { companyId } : {}),
    // Track who created this invoice (for role-based filtering)
    ...(userInfo?.uid ? { createdByUserId: userInfo.uid, createdByUserRole: userInfo.role } : {}),
    // Offline-first metadata
    _pendingSync: !isDeviceOnline(),
    _savedAt: now,
    _syncedAt: null
  } as Invoice

  // STEP 1: Always save to local IndexedDB first (instant)
  try {
    await saveToOffline(STORES.INVOICES, newInvoice)
    // Also save to localStorage for backward compatibility
    saveInvoiceToLocalStorage(newInvoice)
  } catch (error) {
    console.error('Failed to save invoice locally:', error)
  }

  // STEP 2: If online, sync to Firestore silently
  if (isDeviceOnline() && isFirebaseReady()) {
    try {
      // Sanitize data to remove undefined values before sending to Firebase
      const dataToSync = sanitizeForFirebase({
        ...cleanData,
        createdAt: now,
        updatedAt: now,
        ...(companyId ? { companyId } : {}),
        // Track who created this invoice (for role-based filtering)
        ...(userInfo?.uid ? { createdByUserId: userInfo.uid, createdByUserRole: userInfo.role } : {})
      })

      const docRef = await addDoc(collection(db!, COLLECTIONS.INVOICES), dataToSync)

      // Store original offline ID before updating
      const originalOfflineId = id

      // Update local invoice with server ID and mark as synced
      newInvoice.id = docRef.id
      newInvoice._pendingSync = false
      newInvoice._syncedAt = now

      // IMPORTANT: Delete the old offline ID record BEFORE saving the new Firebase ID record
      // This prevents duplicate entries in the list
      await deleteFromOffline(STORES.INVOICES, originalOfflineId)
      deleteInvoiceFromLocalStorage(originalOfflineId)

      // Now save with the new Firebase ID
      await saveToOffline(STORES.INVOICES, newInvoice)
      saveInvoiceToLocalStorage(newInvoice)

      console.log('[createInvoice] ✅ Synced to Firebase, replaced offline ID:', originalOfflineId, '→', docRef.id)

    } catch (error) {
      // Silent fail - add to sync queue for later
      console.log('Firestore save failed, queuing for sync:', id)
      await addToSyncQueue('create', STORES.INVOICES, newInvoice)
    }
  } else {
    // Offline - add to sync queue
    await addToSyncQueue('create', STORES.INVOICES, newInvoice)
  }

  // STEP 3: Update stock for each item in the invoice
  // SALE: Deduct stock, PURCHASE: Add stock
  try {
    await updateStockForInvoice(newInvoice)
  } catch (stockError) {
    console.error('Error updating stock for invoice:', stockError)
    // Don't throw - invoice is already created
  }

  return newInvoice
}

/**
 * Sync callback for offline invoices - called by offlineSyncService
 */
async function syncInvoiceToServer(syncItem: any): Promise<boolean> {
  if (syncItem.store !== STORES.INVOICES) return false

  const invoice = syncItem.data
  if (!invoice || !isFirebaseReady()) return false

  try {
    // Remove offline metadata before sending to server
    const serverData = { ...invoice }
    delete serverData._pendingSync
    delete serverData._savedAt
    delete serverData._syncedAt
    delete serverData.id

    const companyId = getCurrentCompanyId()
    if (companyId) {
      serverData.companyId = companyId
    }

    // Sanitize data to remove undefined values (Firebase doesn't accept undefined)
    const sanitizedData = sanitizeForFirebase(serverData)
    
    const docRef = await addDoc(collection(db!, COLLECTIONS.INVOICES), sanitizedData)

    // Update local with server ID
    const updatedInvoice = {
      ...invoice,
      id: docRef.id,
      _pendingSync: false,
      _syncedAt: new Date().toISOString()
    }
    await saveToOffline(STORES.INVOICES, updatedInvoice)
    saveInvoiceToLocalStorage(updatedInvoice)

    return true
  } catch (error) {
    console.error('Failed to sync invoice to server:', error)
    return false
  }
}

// Register sync callback
registerSyncCallback(syncInvoiceToServer)

/**
 * Update stock quantities based on invoice type
 * SALE: Deduct stock (subtract)
 * PURCHASE: Add stock (add)
 * Also creates ledger entry for the party
 */
async function updateStockForInvoice(invoice: Invoice): Promise<void> {
  console.log('📦 updateStockForInvoice called:', {
    type: invoice.type,
    invoiceNumber: invoice.invoiceNumber,
    itemsCount: invoice.items?.length || 0
  })
  
  try {
    // Update stock for each item
    if (!invoice.items || invoice.items.length === 0) {
      console.log('⚠️ No items in invoice to update stock')
      return
    }
    
    for (const item of invoice.items) {
      console.log('🔍 Processing item:', {
        description: item.description,
        itemId: item.itemId,
        quantity: item.quantity
      })
      
      if (item.itemId) {
        // Treat all non-purchase invoices as stock-out (sale/quotation reduce stock)
        const operation = invoice.type === 'purchase' ? 'add' : 'subtract'
        console.log(`📊 Updating stock: ${operation} ${item.quantity} for item ${item.itemId}`)
        const success = await updateItemStock(item.itemId, item.quantity, operation)
        console.log(`✅ Stock update result for ${item.description}: ${success ? 'SUCCESS' : 'FAILED'}`)
      } else {
        console.log(`⚠️ No itemId for ${item.description} - skipping stock update`)
      }
    }

    // Create ledger entry for the party
    if (invoice.partyId && invoice.partyName) {
      await createInvoiceLedgerEntry(
        invoice.partyId,
        invoice.partyName,
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.grandTotal,
        invoice.type
      )
      console.log(`Ledger entry created for ${invoice.partyName}`)
    }
  } catch (error) {
    console.error('Error updating stock/ledger for invoice:', error)
    // Don't throw error - invoice already created
  }
}

/**
 * Update existing invoice - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 */
export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<boolean> {
  console.log('[updateInvoice] Starting offline-first update for:', id)
  const now = new Date().toISOString()

  // Check if ID is offline-generated
  const isOfflineId = (invoiceId: string) => invoiceId.startsWith('invoice_') || invoiceId.startsWith('offline_')

  // STEP 1: Get existing invoice from local
  let existingInvoice: Invoice | null = null
  try {
    existingInvoice = await getFromOffline<Invoice>(STORES.INVOICES, id)
  } catch (error) {
    const localInvoices = getInvoicesFromLocalStorage()
    existingInvoice = localInvoices.find(i => i.id === id) || null
  }

  if (!existingInvoice) {
    console.error('[updateInvoice] Invoice not found:', id)
    return false
  }

  const updatedInvoice: Invoice = {
    ...existingInvoice,
    ...updates,
    updatedAt: now,
    _pendingSync: !isDeviceOnline() || isOfflineId(id),
    _savedAt: now
  } as Invoice

  // STEP 2: Always save to IndexedDB first
  try {
    await saveToOffline(STORES.INVOICES, updatedInvoice)
    updateInvoiceInLocalStorage(id, updatedInvoice)
    console.log('[updateInvoice] ✅ Updated locally:', id)
  } catch (error) {
    console.error('[updateInvoice] Local save failed:', error)
    updateInvoiceInLocalStorage(id, updatedInvoice)
  }

  // STEP 3: If online and not an offline-only record, sync to Firebase
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      const serverData = sanitizeForFirebase({
        ...updates,
        updatedAt: now
      })
      const docRef = doc(db!, COLLECTIONS.INVOICES, id)
      await updateDoc(docRef, serverData)

      // Mark as synced
      const syncedInvoice = {
        ...updatedInvoice,
        _pendingSync: false,
        _syncedAt: now
      }
      await saveToOffline(STORES.INVOICES, syncedInvoice)

      console.log('[updateInvoice] ✅ Synced to Firebase:', id)
    } catch (error) {
      console.warn('[updateInvoice] Firebase sync failed, queuing:', error)
      await addToSyncQueue('update', STORES.INVOICES, updatedInvoice)
    }
  } else if (!isOfflineId(id)) {
    await addToSyncQueue('update', STORES.INVOICES, updatedInvoice)
  }

  return true
}

/**
 * Delete invoice - OFFLINE FIRST
 * Always deletes locally first, then syncs to Firebase when online
 */
export async function deleteInvoice(id: string): Promise<boolean> {
  console.log('[deleteInvoice] Starting offline-first deletion for:', id)

  // Check if ID is offline-generated (not yet synced to Firebase)
  const isOfflineId = id.startsWith('invoice_') || id.startsWith('offline_')

  // STEP 1: Always delete from IndexedDB first
  try {
    await deleteFromOffline(STORES.INVOICES, id)
    console.log('[deleteInvoice] ✅ Deleted from IndexedDB:', id)
  } catch (error) {
    console.warn('[deleteInvoice] IndexedDB delete failed:', error)
  }

  // STEP 2: Delete from localStorage
  deleteInvoiceFromLocalStorage(id)
  console.log('[deleteInvoice] ✅ Deleted from localStorage:', id)

  // STEP 3: If online and has Firebase ID, sync deletion
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId) {
    try {
      const docRef = doc(db!, COLLECTIONS.INVOICES, id)
      await deleteDoc(docRef)
      console.log('[deleteInvoice] ✅ Deleted from Firebase:', id)
    } catch (error) {
      console.warn('[deleteInvoice] Firebase delete failed, queuing:', error)
      await addToSyncQueue('delete', STORES.INVOICES, { id })
    }
  } else if (!isOfflineId) {
    // Queue for sync if has Firebase ID but currently offline
    console.log('[deleteInvoice] 📱 Offline - queuing deletion for sync')
    await addToSyncQueue('delete', STORES.INVOICES, { id })
  }
  // If it's an offline-only record, no need to sync deletion

  return true
}

/**
 * Process scanned invoice data and create invoice with auto-created parties and items
 */
export async function processScannedInvoice(
  scannedData: ScannedInvoiceData,
  type: 'sale' | 'purchase',
  businessGSTIN: string = '33AAAAA0000A1Z5' // Replace with actual business GSTIN
): Promise<{ invoice: Invoice | null; party: any; items: any[] }> {
  try {
    // Determine party based on invoice type
    const partyData = type === 'purchase' ? scannedData.vendor : scannedData.buyer || scannedData.vendor
    const partyType = type === 'purchase' ? 'supplier' : 'customer'

    // Step 1: Find or create party
    const party = await findOrCreatePartyFromInvoice(
      partyData.name,
      partyData.gstin,
      partyData.phone,
      partyData.email,
      partyData.address,
      partyData.city,
      partyData.state,
      partyData.pinCode,
      partyType
    )

    if (!party) {
      throw new Error('Failed to create/find party')
    }

    // Step 2: Find or create items
    const processedItems = []
    const invoiceItems = []

    for (const scannedItem of scannedData.items) {
      const taxRate = scannedData.cgstRate + scannedData.sgstRate || 18

      const item = await findOrCreateItemFromInvoice(
        scannedItem.description,
        scannedItem.hsnCode,
        scannedItem.rate,
        scannedItem.unit,
        taxRate
      )

      if (item) {
        processedItems.push(item)

        // Calculate tax for this item
        const partyStateCode = party.gstDetails?.stateCode || '33'
        const businessStateCode = businessGSTIN.substring(0, 2)

        const taxCalc = calculateGST({
          amount: scannedItem.rate,
          taxRate,
          quantity: scannedItem.quantity,
          sellerStateCode: type === 'purchase' ? partyStateCode : businessStateCode,
          buyerStateCode: type === 'purchase' ? businessStateCode : partyStateCode
        })

        invoiceItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.id,
          itemName: item.name,
          description: scannedItem.description,
          hsnCode: scannedItem.hsnCode,
          quantity: scannedItem.quantity,
          unit: scannedItem.unit,
          rate: scannedItem.rate,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: taxCalc.taxableAmount,
          cgstPercent: taxCalc.cgst,
          cgstAmount: taxCalc.cgstAmount,
          sgstPercent: taxCalc.sgst,
          sgstAmount: taxCalc.sgstAmount,
          igstPercent: taxCalc.igst,
          igstAmount: taxCalc.igstAmount,
          totalAmount: taxCalc.totalAmount
        })
      }
    }

    // Step 3: Calculate invoice totals
    const totals = calculateInvoiceTotals({
      items: invoiceItems.map(i => ({
        amount: i.taxableAmount,
        cgstAmount: i.cgstAmount,
        sgstAmount: i.sgstAmount,
        igstAmount: i.igstAmount
      }))
    })

    // Step 4: Create invoice
    const invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
      type,
      invoiceNumber: scannedData.invoiceNumber,
      invoiceDate: scannedData.invoiceDate,
      partyId: party.id,
      partyName: party.companyName,
      partyGSTIN: party.gstDetails?.gstin,
      partyAddress: party.billingAddress,
      partyPhone: party.phone,
      partyEmail: party.email,
      businessName: 'ThisAI CRM', // Replace with actual business name
      businessGSTIN,
      businessAddress: {
        street: '',
        city: '',
        state: '',
        pinCode: '',
        country: 'India'
      },
      businessPhone: '',
      businessEmail: '',
      businessStateCode: businessGSTIN.substring(0, 2),
      referenceNumber: scannedData.referenceNumber,
      buyerOrderNumber: scannedData.buyerOrderNumber,
      deliveryNoteNumber: scannedData.deliveryNoteNumber,
      items: invoiceItems,
      subtotal: totals.subtotal,
      discountPercent: 0,
      discountAmount: 0,
      taxableAmount: totals.taxableAmount,
      cgstAmount: totals.cgstTotal,
      sgstAmount: totals.sgstTotal,
      igstAmount: totals.igstTotal,
      cessAmount: 0,
      totalTaxAmount: totals.totalTax,
      shippingCharges: 0,
      otherCharges: 0,
      roundOff: scannedData.roundOff,
      grandTotal: scannedData.grandTotal,
      payment: {
        mode: scannedData.paymentMode === 'Mode/Terms of Payment' ? 'cash' : 'cash',
        status: 'unpaid',
        paidAmount: 0,
        dueAmount: scannedData.grandTotal
      },
      transport: scannedData.vehicleNumber ? {
        vehicleNumber: scannedData.vehicleNumber,
        destination: scannedData.destination
      } : undefined,
      termsOfDelivery: scannedData.termsOfPayment,
      status: 'approved',
      createdBy: 'AI Scanner'
    }

    const invoice = await createInvoice(invoiceData)

    return {
      invoice,
      party,
      items: processedItems
    }
  } catch (error) {
    console.error('Error processing scanned invoice:', error)
    return {
      invoice: null,
      party: null,
      items: []
    }
  }
}

// Helper function to convert Firestore document to Invoice
function docToInvoice(doc: QueryDocumentSnapshot<DocumentData>): Invoice {
  const data = doc.data()
  return {
    ...data,
    id: doc.id
  } as Invoice
}

// ============================================
// LOCAL STORAGE FALLBACK FUNCTIONS
// ============================================

function getInvoicesFromLocalStorage(type?: 'sale' | 'purchase' | 'quote', limitCount?: number): Invoice[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!stored) return []

    let invoices: Invoice[] = JSON.parse(stored)

    if (type) {
      invoices = invoices.filter(i => i.type === type)
    }

    // Sort by date descending
    invoices.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())

    if (limitCount) {
      invoices = invoices.slice(0, limitCount)
    }

    return invoices
  } catch (error) {
    console.error('Error reading invoices from local storage:', error)
    return []
  }
}

function saveInvoiceToLocalStorage(invoice: Invoice): void {
  try {
    const invoices = getInvoicesFromLocalStorage()
    invoices.push(invoice)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices))
  } catch (error) {
    console.error('Error saving invoice to local storage:', error)
  }
}

function updateInvoiceInLocalStorage(id: string, updates: Partial<Invoice>): boolean {
  try {
    const invoices = getInvoicesFromLocalStorage()
    const index = invoices.findIndex(i => i.id === id)

    if (index === -1) return false

    invoices[index] = { ...invoices[index], ...updates }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices))
    return true
  } catch (error) {
    console.error('Error updating invoice in local storage:', error)
    return false
  }
}

function deleteInvoiceFromLocalStorage(id: string): boolean {
  try {
    const invoices = getInvoicesFromLocalStorage()
    const filtered = invoices.filter(i => i.id !== id)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting invoice from local storage:', error)
    return false
  }
}


