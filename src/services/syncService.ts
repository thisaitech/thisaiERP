// Sync Service - Handles online/offline synchronization
// Syncs local IndexedDB data with Firebase when online

import { offlineDB, syncQueue, STORES, SyncOperation, isOfflineId } from './offlineDB'
import { db, isFirebaseReady, COLLECTIONS } from './firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'

// Lightweight event target for cross-module notifications (banking updates etc.)
export const appEventTarget = new EventTarget()

/**
 * Subscribe to banking updates. Listener receives the parsed `accounts` object.
 * Returns an unsubscribe function.
 */
export const subscribeBanking = (listener: (accounts: any) => void) => {
  const handler = (ev: Event) => {
    try {
      const detail = (ev as CustomEvent).detail
      listener(detail)
    } catch (e) {
      console.warn('subscribeBanking handler error', e)
    }
  }
  appEventTarget.addEventListener('bankingUpdated', handler as EventListener)
  return () => appEventTarget.removeEventListener('bankingUpdated', handler as EventListener)
}

// Monkey-patch localStorage.setItem to emit banking updates when 'bankingAccounts' changes.
// This avoids changing many call sites; safe-guarded for environments where localStorage may be unavailable.
try {
  const _origSetItem = localStorage.setItem.bind(localStorage)
  localStorage.setItem = function(key: string, value: string) {
    _origSetItem(key, value)
    try {
      if (key === 'bankingAccounts') {
        const parsed = JSON.parse(value)
        appEventTarget.dispatchEvent(new CustomEvent('bankingUpdated', { detail: parsed }))
      }
    } catch (err) {
      // ignore parse errors
    }
  } as any
} catch (e) {
  // If we can't patch localStorage (e.g., SSR), ignore silently
}

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

// Network status
let isOnline = navigator.onLine
let syncInProgress = false
let syncListeners: ((status: SyncStatus) => void)[] = []

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: number | null
  error: string | null
}

let currentStatus: SyncStatus = {
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  error: null
}

// Initialize sync service
export const initSyncService = () => {
  // Listen for online/offline events
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // Initial status
  isOnline = navigator.onLine
  updateStatus({ isOnline })
  
  // Start periodic sync check (every 60 seconds instead of 30)
  setInterval(checkAndSync, 60000)
  
  // Initial sync if online (silent - no toasts on startup)
  if (isOnline) {
    setTimeout(() => syncPendingOperations(false), 3000)
  }
  
  console.log('🔄 Sync service initialized, online:', isOnline)
}

// Handle coming online
const handleOnline = () => {
  console.log('🌐 Network: Online')
  isOnline = true
  updateStatus({ isOnline: true })
  toast.success('Back online! Syncing data...', { duration: 3000 })
  syncPendingOperations()
}

// Handle going offline
const handleOffline = () => {
  console.log('📴 Network: Offline')
  isOnline = false
  updateStatus({ isOnline: false })
  toast.info('You are offline. Changes will sync when connected.', { duration: 5000 })
}

// Check and sync if needed (silent background sync)
const checkAndSync = async () => {
  if (isOnline && !syncInProgress) {
    try {
      const count = await syncQueue.getCount()
      if (count.pending > 0) {
        syncPendingOperations(false) // Silent sync
      }
    } catch (error) {
      console.warn('Background sync check failed:', error)
    }
  }
}

// Update and notify status
const updateStatus = (updates: Partial<SyncStatus>) => {
  currentStatus = { ...currentStatus, ...updates }
  syncListeners.forEach(listener => listener(currentStatus))
}

// Subscribe to status updates
export const subscribeSyncStatus = (listener: (status: SyncStatus) => void): (() => void) => {
  syncListeners.push(listener)
  listener(currentStatus) // Immediate callback with current status
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener)
  }
}

// Get current status
export const getSyncStatus = (): SyncStatus => currentStatus

// Check if online
export const isNetworkOnline = (): boolean => isOnline

// Sync all pending operations
export const syncPendingOperations = async (showToasts = true): Promise<void> => {
  if (!isOnline || syncInProgress) {
    console.log('⏸️ Sync skipped:', { isOnline, syncInProgress })
    return
  }

  // Skip if Firebase is not ready (don't show error)
  if (!isFirebaseReady()) {
    console.log('⏸️ Sync skipped: Firebase not ready')
    return
  }

  syncInProgress = true
  updateStatus({ isSyncing: true })

  try {
    const pending = await syncQueue.getPending()
    
    // Nothing to sync
    if (pending.length === 0) {
      updateStatus({ pendingCount: 0, lastSyncTime: Date.now() })
      return
    }
    
    console.log(`🔄 Syncing ${pending.length} pending operations...`)
    updateStatus({ pendingCount: pending.length })

    let successCount = 0
    for (const operation of pending) {
      try {
        await syncOperation(operation)
        await syncQueue.updateStatus(operation.id, 'completed')
        successCount++
      } catch (error) {
        console.error('Sync operation failed:', operation, error)
        await syncQueue.updateStatus(operation.id, 'failed', operation.retryCount + 1)
        
        // If too many retries, mark as permanently failed
        if (operation.retryCount >= 5) {
          updateStatus({ error: `Failed to sync after 5 attempts` })
        }
      }
    }

    // Clear completed operations
    await syncQueue.clearCompleted()
    
    const remaining = await syncQueue.getCount()
    updateStatus({ 
      pendingCount: remaining.pending + remaining.failed,
      lastSyncTime: Date.now(),
      error: remaining.failed > 0 ? `${remaining.failed} operations failed` : null
    })
    
    if (successCount > 0 && showToasts) {
      toast.success(`Synced ${successCount} changes successfully!`)
    }
    
    console.log('✅ Sync completed')
  } catch (error) {
    console.error('Sync failed:', error)
    updateStatus({ error: 'Sync failed' })
    // Only show error toast if explicitly requested
    if (showToasts) {
      toast.error('Failed to sync some changes')
    }
  } finally {
    syncInProgress = false
    updateStatus({ isSyncing: false })
  }
}

// Sync a single operation
const syncOperation = async (operation: SyncOperation): Promise<void> => {
  if (!db) throw new Error('Firebase not ready')
  
  const collectionName = getFirebaseCollection(operation.store)
  if (!collectionName) {
    console.warn('Unknown store:', operation.store)
    return
  }

  switch (operation.action) {
    case 'create': {
      // Remove offline metadata before sending to Firebase
      const { _offlineCreated, _lastModified, ...cleanData } = operation.data
      
      // If it has an offline ID, we need to create a new document
      if (isOfflineId(operation.data.id)) {
        // Sanitize data to remove undefined values
        const sanitizedData = sanitizeForFirebase({
          ...cleanData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        // Remove id from sanitized data as we'll let Firebase generate it
        delete sanitizedData.id
        
        const docRef = await addDoc(collection(db, collectionName), sanitizedData)
        
        // Update local record with Firebase ID
        const oldId = operation.data.id
        const newData = { ...operation.data, id: docRef.id, firebaseId: docRef.id }
        await offlineDB.delete(operation.store, oldId)
        await offlineDB.put(operation.store, newData)
        
        console.log(`📤 Created in Firebase: ${collectionName}/${docRef.id}`)
      } else {
        // Already has a Firebase ID, just update
        const docRef = doc(db, collectionName, operation.data.id)
        // Sanitize data to remove undefined values
        const sanitizedData = sanitizeForFirebase({
          ...cleanData,
          updatedAt: serverTimestamp()
        })
        await updateDoc(docRef, sanitizedData)
      }
      break
    }
    
    case 'update': {
      const { _offlineCreated, _lastModified, id, ...cleanData } = operation.data
      const docRef = doc(db, collectionName, id)
      // Sanitize data to remove undefined values
      const sanitizedData = sanitizeForFirebase({
        ...cleanData,
        updatedAt: serverTimestamp()
      })
      await updateDoc(docRef, sanitizedData)
      console.log(`📝 Updated in Firebase: ${collectionName}/${id}`)
      break
    }
    
    case 'delete': {
      const docRef = doc(db, collectionName, operation.data.id)
      await deleteDoc(docRef)
      console.log(`🗑️ Deleted from Firebase: ${collectionName}/${operation.data.id}`)
      break
    }
  }
}

// Map local store names to Firebase collection names
const getFirebaseCollection = (store: string): string | null => {
  const mapping: Record<string, string> = {
    [STORES.INVOICES]: COLLECTIONS.INVOICES,
    [STORES.PURCHASES]: 'purchases',
    [STORES.PARTIES]: COLLECTIONS.PARTIES,
    [STORES.ITEMS]: COLLECTIONS.ITEMS,
    [STORES.PAYMENTS]: 'payments',
    [STORES.EXPENSES]: 'expenses',
    [STORES.QUOTATIONS]: 'quotations',
    [STORES.DELIVERY_CHALLANS]: COLLECTIONS.DELIVERY_CHALLANS
  }
  return mapping[store] || null
}

// Offline-first data operations
export const offlineFirst = {
  // Create a record (works offline)
  async create<T extends { id?: string }>(store: string, data: T): Promise<T & { id: string }> {
    const id = data.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const record = { ...data, id, syncStatus: 'pending' as const }
    
    // Save to local DB first
    await offlineDB.put(store, record)
    
    // Add to sync queue
    await syncQueue.add({
      store,
      action: 'create',
      data: record
    })
    
    // Try to sync immediately if online
    if (isOnline) {
      syncPendingOperations()
    }
    
    return record as T & { id: string }
  },

  // Update a record (works offline)
  async update<T extends { id: string }>(store: string, data: T): Promise<T> {
    const record = { ...data, syncStatus: 'pending' as const }
    
    // Update local DB first
    await offlineDB.put(store, record)
    
    // Add to sync queue (skip if it's a new offline record that hasn't been synced yet)
    if (!isOfflineId(data.id)) {
      await syncQueue.add({
        store,
        action: 'update',
        data: record
      })
    }
    
    // Try to sync immediately if online
    if (isOnline) {
      syncPendingOperations()
    }
    
    return record
  },

  // Delete a record (works offline)
  async delete(store: string, id: string): Promise<void> {
    // Delete from local DB first
    await offlineDB.delete(store, id)
    
    // Add to sync queue only if it's a synced record
    if (!isOfflineId(id)) {
      await syncQueue.add({
        store,
        action: 'delete',
        data: { id }
      })
    }
    
    // Try to sync immediately if online
    if (isOnline) {
      syncPendingOperations()
    }
  },

  // Get all records (from local DB, with optional online refresh)
  async getAll<T>(store: string, refreshFromServer = false): Promise<T[]> {
    // If online and refresh requested, sync first
    if (isOnline && refreshFromServer && isFirebaseReady()) {
      try {
        await syncFromServer(store)
      } catch (error) {
        console.warn('Failed to refresh from server:', error)
      }
    }
    
    // Always return from local DB
    return offlineDB.getAll<T>(store)
  },

  // Get a single record
  async get<T>(store: string, id: string): Promise<T | undefined> {
    return offlineDB.get<T>(store, id)
  }
}

// Sync data from server to local
export const syncFromServer = async (store: string): Promise<void> => {
  if (!db || !isOnline) return

  const collectionName = getFirebaseCollection(store)
  if (!collectionName) return

  try {
    const querySnapshot = await getDocs(
      query(collection(db, collectionName), orderBy('createdAt', 'desc'))
    )
    
    const serverData = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }))
    
    // Merge with local data (server wins for conflicts, keep local-only items)
    const localData = await offlineDB.getAll<any>(store)
    const localOnlyItems = localData.filter(item => isOfflineId(item.id))
    
    // Clear and repopulate with server data + local-only items
    await offlineDB.clear(store)
    await offlineDB.bulkPut(store, [...serverData, ...localOnlyItems])
    
    console.log(`📥 Synced ${serverData.length} items from ${collectionName}`)
  } catch (error) {
    console.error('Failed to sync from server:', error)
    throw error
  }
}

// Full sync - sync all stores from server
export const fullSyncFromServer = async (): Promise<void> => {
  if (!isOnline || !isFirebaseReady()) {
    toast.error('Cannot sync: You are offline')
    return
  }

  const stores = [
    STORES.INVOICES,
    STORES.PURCHASES,
    STORES.PARTIES,
    STORES.ITEMS,
    STORES.PAYMENTS,
    STORES.EXPENSES,
    STORES.QUOTATIONS
  ]

  const loadingToast = toast.loading('Syncing all data from server...')

  try {
    for (const store of stores) {
      await syncFromServer(store)
    }
    toast.dismiss(loadingToast)
    toast.success('All data synced successfully!')
    updateStatus({ lastSyncTime: Date.now() })
  } catch (error) {
    toast.dismiss(loadingToast)
    toast.error('Failed to sync all data')
    throw error
  }
}

// Force sync now (user-initiated, shows toasts)
export const forceSyncNow = async (): Promise<void> => {
  if (!isOnline) {
    toast.error('Cannot sync: You are offline')
    return
  }
  
  await syncPendingOperations(true) // Show toasts for user-initiated sync
}

export default {
  init: initSyncService,
  subscribe: subscribeSyncStatus,
  getStatus: getSyncStatus,
  isOnline: isNetworkOnline,
  syncNow: forceSyncNow,
  fullSync: fullSyncFromServer,
  offlineFirst
}

