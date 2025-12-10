// offlineSyncService.ts - Billi 2025
// Handles offline data storage with IndexedDB and sync queue
// Offline-first architecture: Save locally first, sync silently when online

import { getOfflineSyncSettings, saveOfflineSyncSettings, updateSyncStatus } from './settingsService'

// Network status tracking
let isOnline = navigator.onLine
let syncInProgress = false
let syncCallback: ((item: any) => Promise<boolean>) | null = null

// IndexedDB Database Name and Version
const DB_NAME = 'thisai_crm_offline'
const DB_VERSION = 3 // Incremented to add delivery challans store

// Store Names - Export for use in other services
export const STORES = {
  ITEMS: 'items',
  PARTIES: 'parties',
  INVOICES: 'invoices',
  EXPENSES: 'expenses',
  QUOTATIONS: 'quotations',
  PAYMENTS: 'payments',
  DELIVERY_CHALLANS: 'deliveryChallans',
  SYNC_QUEUE: 'syncQueue',
  CACHE_META: 'cacheMeta'
}

// Sync Queue Item Type
interface SyncQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  store: string
  data: any
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
}

// Cache Meta for tracking
interface CacheMeta {
  store: string
  lastSync: string
  itemCount: number
  version: number
}

let db: IDBDatabase | null = null

/**
 * Reset database connection (used when version errors occur)
 */
export function resetDBConnection(): void {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Initialize IndexedDB
 */
export async function initOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      // Check if db is still valid
      try {
        if (db.objectStoreNames.length > 0) {
          resolve(db)
          return
        }
      } catch (e) {
        // DB connection is stale, reset it
        db = null
      }
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error)
      db = null

      // If version error, try to delete and recreate the database
      if (request.error?.name === 'VersionError') {
        console.warn('IndexedDB version mismatch, attempting to delete and recreate...')
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
        deleteRequest.onsuccess = () => {
          console.log('Old database deleted, reinitializing...')
          // Retry initialization after delete
          initOfflineDB().then(resolve).catch(reject)
        }
        deleteRequest.onerror = () => {
          reject(request.error)
        }
        return
      }

      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result

      // Handle database close events (e.g., when browser closes connection)
      db.onclose = () => {
        console.warn('IndexedDB connection closed unexpectedly')
        db = null
      }

      db.onerror = (event) => {
        console.error('IndexedDB error:', event)
      }

      console.log('✅ IndexedDB initialized successfully (version', DB_VERSION, ')')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create Items store
      if (!database.objectStoreNames.contains(STORES.ITEMS)) {
        const itemsStore = database.createObjectStore(STORES.ITEMS, { keyPath: 'id' })
        itemsStore.createIndex('name', 'name', { unique: false })
        itemsStore.createIndex('barcode', 'barcode', { unique: false })
        itemsStore.createIndex('category', 'category', { unique: false })
      }

      // Create Parties store
      if (!database.objectStoreNames.contains(STORES.PARTIES)) {
        const partiesStore = database.createObjectStore(STORES.PARTIES, { keyPath: 'id' })
        partiesStore.createIndex('name', 'companyName', { unique: false })
        partiesStore.createIndex('phone', 'phone', { unique: false })
        partiesStore.createIndex('type', 'type', { unique: false })
      }

      // Create Invoices store
      if (!database.objectStoreNames.contains(STORES.INVOICES)) {
        const invoicesStore = database.createObjectStore(STORES.INVOICES, { keyPath: 'id' })
        invoicesStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: false })
        invoicesStore.createIndex('partyId', 'partyId', { unique: false })
        invoicesStore.createIndex('date', 'date', { unique: false })
        invoicesStore.createIndex('type', 'type', { unique: false })
      }

      // Create Expenses store
      if (!database.objectStoreNames.contains(STORES.EXPENSES)) {
        const expensesStore = database.createObjectStore(STORES.EXPENSES, { keyPath: 'id' })
        expensesStore.createIndex('date', 'date', { unique: false })
        expensesStore.createIndex('category', 'category', { unique: false })
        expensesStore.createIndex('expenseNumber', 'expenseNumber', { unique: false })
      }

      // Create Quotations store
      if (!database.objectStoreNames.contains(STORES.QUOTATIONS)) {
        const quotationsStore = database.createObjectStore(STORES.QUOTATIONS, { keyPath: 'id' })
        quotationsStore.createIndex('quotationNumber', 'quotationNumber', { unique: false })
        quotationsStore.createIndex('partyId', 'partyId', { unique: false })
        quotationsStore.createIndex('quotationDate', 'quotationDate', { unique: false })
        quotationsStore.createIndex('status', 'status', { unique: false })
      }

      // Create Payments store
      if (!database.objectStoreNames.contains(STORES.PAYMENTS)) {
        const paymentsStore = database.createObjectStore(STORES.PAYMENTS, { keyPath: 'id' })
        paymentsStore.createIndex('invoiceId', 'invoiceId', { unique: false })
        paymentsStore.createIndex('partyId', 'partyId', { unique: false })
        paymentsStore.createIndex('paymentDate', 'paymentDate', { unique: false })
      }

      // Create Delivery Challans store
      if (!database.objectStoreNames.contains(STORES.DELIVERY_CHALLANS)) {
        const challansStore = database.createObjectStore(STORES.DELIVERY_CHALLANS, { keyPath: 'id' })
        challansStore.createIndex('challanNumber', 'challanNumber', { unique: false })
        challansStore.createIndex('partyId', 'partyId', { unique: false })
        challansStore.createIndex('challanDate', 'challanDate', { unique: false })
        challansStore.createIndex('status', 'status', { unique: false })
      }

      // Create Sync Queue store
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
        syncStore.createIndex('status', 'status', { unique: false })
        syncStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // Create Cache Meta store
      if (!database.objectStoreNames.contains(STORES.CACHE_META)) {
        database.createObjectStore(STORES.CACHE_META, { keyPath: 'store' })
      }

      console.log('📦 IndexedDB stores created')
    }
  })
}

/**
 * Get database instance
 */
async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    return initOfflineDB()
  }
  return db
}

// ========== GENERIC CRUD OPERATIONS ==========

/**
 * Save item to IndexedDB
 */
export async function saveToOffline<T extends { id: string }>(
  storeName: string,
  data: T
): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(data)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get item from IndexedDB
 */
export async function getFromOffline<T>(
  storeName: string,
  id: string
): Promise<T | null> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all items from IndexedDB store
 */
export async function getAllFromOffline<T>(storeName: string): Promise<T[]> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete item from IndexedDB
 */
export async function deleteFromOffline(
  storeName: string,
  id: string
): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Clear all items from a store
 */
export async function clearOfflineStore(storeName: string): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ========== SYNC QUEUE OPERATIONS ==========

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(
  type: SyncQueueItem['type'],
  store: string,
  data: any
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    store,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending'
  }

  await saveToOffline(STORES.SYNC_QUEUE, queueItem)

  // Update pending count
  const settings = getOfflineSyncSettings()
  saveOfflineSyncSettings({ pendingSyncCount: settings.pendingSyncCount + 1 })

  // Dispatch event for UI updates
  window.dispatchEvent(new CustomEvent('sync-queue-updated'))
}

/**
 * Get all pending sync items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const allItems = await getAllFromOffline<SyncQueueItem>(STORES.SYNC_QUEUE)
  return allItems.filter(item => item.status === 'pending')
}

/**
 * Mark sync item as completed
 */
export async function completeSyncItem(id: string): Promise<void> {
  await deleteFromOffline(STORES.SYNC_QUEUE, id)

  // Update pending count
  const settings = getOfflineSyncSettings()
  const newCount = Math.max(0, settings.pendingSyncCount - 1)
  saveOfflineSyncSettings({ pendingSyncCount: newCount })
}

/**
 * Mark sync item as failed
 */
export async function failSyncItem(id: string): Promise<void> {
  const item = await getFromOffline<SyncQueueItem>(STORES.SYNC_QUEUE, id)
  if (item) {
    item.retryCount += 1
    item.status = item.retryCount >= 3 ? 'failed' : 'pending'
    await saveToOffline(STORES.SYNC_QUEUE, item)
  }
}

// ========== CACHE OPERATIONS ==========

/**
 * Cache items for offline use
 */
export async function cacheItems(items: any[]): Promise<void> {
  const settings = getOfflineSyncSettings()
  if (!settings.cacheItems) return

  // Clear existing and add new
  await clearOfflineStore(STORES.ITEMS)

  for (const item of items) {
    await saveToOffline(STORES.ITEMS, item)
  }

  // Update cache meta
  await saveToOffline<CacheMeta>(STORES.CACHE_META, {
    store: STORES.ITEMS,
    lastSync: new Date().toISOString(),
    itemCount: items.length,
    version: 1
  })

  console.log(`✅ Cached ${items.length} items for offline use`)
}

/**
 * Cache parties for offline use
 */
export async function cacheParties(parties: any[]): Promise<void> {
  const settings = getOfflineSyncSettings()
  if (!settings.cacheParties) return

  await clearOfflineStore(STORES.PARTIES)

  for (const party of parties) {
    await saveToOffline(STORES.PARTIES, party)
  }

  await saveToOffline<CacheMeta>(STORES.CACHE_META, {
    store: STORES.PARTIES,
    lastSync: new Date().toISOString(),
    itemCount: parties.length,
    version: 1
  })

  console.log(`✅ Cached ${parties.length} parties for offline use`)
}

/**
 * Cache invoices for offline use
 */
export async function cacheInvoices(invoices: any[]): Promise<void> {
  const settings = getOfflineSyncSettings()
  if (!settings.cacheInvoices) return

  await clearOfflineStore(STORES.INVOICES)

  for (const invoice of invoices) {
    await saveToOffline(STORES.INVOICES, invoice)
  }

  await saveToOffline<CacheMeta>(STORES.CACHE_META, {
    store: STORES.INVOICES,
    lastSync: new Date().toISOString(),
    itemCount: invoices.length,
    version: 1
  })

  console.log(`✅ Cached ${invoices.length} invoices for offline use`)
}

/**
 * Get cached items
 */
export async function getCachedItems(): Promise<any[]> {
  return getAllFromOffline(STORES.ITEMS)
}

/**
 * Get cached parties
 */
export async function getCachedParties(): Promise<any[]> {
  return getAllFromOffline(STORES.PARTIES)
}

/**
 * Get cached invoices
 */
export async function getCachedInvoices(): Promise<any[]> {
  return getAllFromOffline(STORES.INVOICES)
}

/**
 * Find item by barcode in cache
 */
export async function findCachedItemByBarcode(barcode: string): Promise<any | null> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.ITEMS, 'readonly')
    const store = transaction.objectStore(STORES.ITEMS)
    const index = store.index('barcode')
    const request = index.get(barcode)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

// ========== SYNC EXECUTION ==========

/**
 * Process sync queue - sync all pending items
 */
export async function processSyncQueue(
  syncFunction: (item: SyncQueueItem) => Promise<boolean>
): Promise<{ success: number; failed: number }> {
  const pendingItems = await getPendingSyncItems()
  let success = 0
  let failed = 0

  updateSyncStatus('syncing')

  for (const item of pendingItems) {
    try {
      const synced = await syncFunction(item)
      if (synced) {
        await completeSyncItem(item.id)
        success++
      } else {
        await failSyncItem(item.id)
        failed++
      }
    } catch (error) {
      console.error('Sync item failed:', error)
      await failSyncItem(item.id)
      failed++
    }
  }

  if (failed > 0) {
    updateSyncStatus('error', `${failed} items failed to sync`)
  } else {
    updateSyncStatus('success')
  }

  return { success, failed }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  items: number
  parties: number
  invoices: number
  pendingSync: number
  lastSync: string | null
}> {
  const [items, parties, invoices, pending] = await Promise.all([
    getAllFromOffline(STORES.ITEMS),
    getAllFromOffline(STORES.PARTIES),
    getAllFromOffline(STORES.INVOICES),
    getPendingSyncItems()
  ])

  const settings = getOfflineSyncSettings()

  return {
    items: items.length,
    parties: parties.length,
    invoices: invoices.length,
    pendingSync: pending.length,
    lastSync: settings.lastSyncTime
  }
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData(): Promise<void> {
  await clearOfflineStore(STORES.ITEMS)
  await clearOfflineStore(STORES.PARTIES)
  await clearOfflineStore(STORES.INVOICES)
  await clearOfflineStore(STORES.SYNC_QUEUE)
  await clearOfflineStore(STORES.CACHE_META)

  saveOfflineSyncSettings({
    pendingSyncCount: 0,
    lastSyncTime: null
  })

  console.log('🗑️ All offline data cleared')
}

// ========== SILENT AUTO-SYNC ==========

/**
 * Check if device is online
 */
export function isDeviceOnline(): boolean {
  return isOnline
}

/**
 * Register sync callback for auto-sync
 */
export function registerSyncCallback(callback: (item: any) => Promise<boolean>): void {
  syncCallback = callback
}

/**
 * Silent background sync - no alerts, no popups
 */
async function silentBackgroundSync(): Promise<void> {
  if (syncInProgress || !isOnline || !syncCallback) return

  const pendingItems = await getPendingSyncItems()
  if (pendingItems.length === 0) return

  syncInProgress = true

  for (const item of pendingItems) {
    if (!isOnline) break // Stop if went offline

    try {
      const synced = await syncCallback(item)
      if (synced) {
        await completeSyncItem(item.id)
        // Update the local invoice to mark as synced
        if (item.store === STORES.INVOICES && item.data?.id) {
          const invoice = await getFromOffline<any>(STORES.INVOICES, item.data.id)
          if (invoice) {
            invoice._pendingSync = false
            invoice._syncedAt = new Date().toISOString()
            await saveToOffline(STORES.INVOICES, invoice)
          }
        }
        // Dispatch silent update event for UI refresh
        window.dispatchEvent(new CustomEvent('invoice-synced', { detail: { id: item.data?.id } }))
      }
    } catch (error) {
      // Silent fail - will retry next time
      console.log('Silent sync retry scheduled for:', item.id)
    }
  }

  syncInProgress = false

  // Update last sync time silently
  saveOfflineSyncSettings({ lastSyncTime: new Date().toISOString() })
}

/**
 * Initialize network listeners for auto-sync
 */
function initNetworkListeners(): void {
  // Online event - start silent sync
  window.addEventListener('online', () => {
    isOnline = true
    // Wait 2 seconds to ensure stable connection, then sync silently
    setTimeout(() => {
      silentBackgroundSync()
    }, 2000)
  })

  // Offline event
  window.addEventListener('offline', () => {
    isOnline = false
    syncInProgress = false
  })

  // Periodic silent sync every 30 seconds when online
  setInterval(() => {
    if (isOnline && !syncInProgress) {
      silentBackgroundSync()
    }
  }, 30000)
}

/**
 * Save invoice offline-first (always saves locally, queues for sync)
 */
export async function saveInvoiceOfflineFirst(invoice: any): Promise<{ success: boolean; isOffline: boolean }> {
  try {
    // Always save to local IndexedDB first
    const localInvoice = {
      ...invoice,
      _pendingSync: !isOnline, // Mark as pending if offline
      _savedAt: new Date().toISOString(),
      _syncedAt: isOnline ? new Date().toISOString() : null
    }

    await saveToOffline(STORES.INVOICES, localInvoice)

    // If offline, add to sync queue
    if (!isOnline) {
      await addToSyncQueue('create', STORES.INVOICES, invoice)
      return { success: true, isOffline: true }
    }

    // If online, still queue for sync (will sync immediately)
    await addToSyncQueue('create', STORES.INVOICES, invoice)

    // Trigger immediate silent sync
    setTimeout(() => silentBackgroundSync(), 100)

    return { success: true, isOffline: false }
  } catch (error) {
    console.error('Failed to save invoice offline:', error)
    return { success: false, isOffline: !isOnline }
  }
}

/**
 * Get all invoices (merged from cache + pending)
 */
export async function getAllInvoicesWithPendingStatus(): Promise<any[]> {
  const cachedInvoices = await getAllFromOffline<any>(STORES.INVOICES)
  return cachedInvoices.map(inv => ({
    ...inv,
    isPending: inv._pendingSync === true
  }))
}

/**
 * Mark invoice as synced (called after successful server save)
 */
export async function markInvoiceSynced(invoiceId: string): Promise<void> {
  const invoice = await getFromOffline<any>(STORES.INVOICES, invoiceId)
  if (invoice) {
    invoice._pendingSync = false
    invoice._syncedAt = new Date().toISOString()
    await saveToOffline(STORES.INVOICES, invoice)
  }
}

/**
 * Get pending sync count
 */
export async function getPendingSyncCount(): Promise<number> {
  const pending = await getPendingSyncItems()
  return pending.length
}

// Initialize on import
initOfflineDB().catch(console.error)
initNetworkListeners()
