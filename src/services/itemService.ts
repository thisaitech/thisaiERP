// Item/Product Service
// CRUD operations and business logic for inventory items
// OFFLINE-FIRST: Always save locally first, sync silently when online

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import type { Item } from '../types'
import {
  saveToOffline,
  getAllFromOffline,
  getFromOffline,
  deleteFromOffline,
  addToSyncQueue,
  isDeviceOnline,
  STORES
} from './offlineSyncService'

const LOCAL_STORAGE_KEY = 'thisai_crm_items'

// Helper to generate offline-safe ID
const generateOfflineId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Check if ID is offline-generated
const isOfflineId = (id: string) => id.startsWith('item_') || id.startsWith('offline_')

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

/**
 * Get all items
 * OFFLINE-FIRST: Returns from IndexedDB first, then syncs with Firebase in background
 */
export async function getItems(): Promise<Item[]> {
  console.log('📥 itemService.getItems called')

  // STEP 1: Always try IndexedDB first (instant, works offline)
  let localItems: Item[] = []
  try {
    localItems = await getAllFromOffline<Item>(STORES.ITEMS)
    // Sort by createdAt descending (newest first)
    localItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.warn('IndexedDB read failed, trying localStorage:', error)
    localItems = getItemsFromLocalStorage()
  }

  // STEP 2: If offline or Firebase not ready, return local data immediately
  if (!isDeviceOnline() || !isFirebaseReady()) {
    console.log('📱 Offline mode: Returning', localItems.length, 'items from local storage')
    return localItems
  }

  // STEP 3: If online, try to fetch from Firebase and merge
  try {
    const itemsRef = collection(db!, COLLECTIONS.ITEMS)
    // Use simple query without orderBy to avoid index requirement
    const snapshot = await getDocs(itemsRef)
    let serverItems = snapshot.docs.map(docToItem)
    // Sort client-side instead
    serverItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Merge: Keep local-only items (offline created, not yet synced)
    const localOnlyItems = localItems.filter(item => isOfflineId(item.id))
    const mergedItems = [...serverItems, ...localOnlyItems]

    // Update local cache with server data (in background)
    for (const item of serverItems) {
      saveToOffline(STORES.ITEMS, item).catch(() => {})
    }

    console.log('☁️ Retrieved from Firebase:', serverItems.length, 'items, merged with', localOnlyItems.length, 'local')
    return mergedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.warn('Firebase fetch failed, returning local data:', error)
    return localItems
  }
}

/**
 * Get item by ID
 * OFFLINE-FIRST: Checks IndexedDB first, then Firebase
 */
export async function getItemById(id: string): Promise<Item | null> {
  // STEP 1: Try IndexedDB first
  try {
    const localItem = await getFromOffline<Item>(STORES.ITEMS, id)
    if (localItem) {
      return localItem
    }
  } catch (error) {
    console.warn('IndexedDB read failed:', error)
  }

  // STEP 2: Check localStorage fallback
  const localItems = getItemsFromLocalStorage()
  const localStorageItem = localItems.find(i => i.id === id)
  if (localStorageItem) {
    return localStorageItem
  }

  // STEP 3: If offline or Firebase not ready, return null
  if (!isDeviceOnline() || !isFirebaseReady()) {
    return null
  }

  // STEP 4: Try Firebase
  try {
    const docRef = doc(db!, COLLECTIONS.ITEMS, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const item = docToItem(docSnap)
      // Cache in IndexedDB for future offline access
      saveToOffline(STORES.ITEMS, item).catch(() => {})
      return item
    }
    return null
  } catch (error) {
    console.error('Error fetching item:', error)
    return null
  }
}

/**
 * Find item by HSN code
 */
export async function findItemByHSN(hsnCode: string): Promise<Item | null> {
  if (!hsnCode) return null

  if (!isFirebaseReady()) {
    const items = getItemsFromLocalStorage()
    return items.find(i => i.hsnCode === hsnCode) || null
  }

  try {
    const itemsRef = collection(db!, COLLECTIONS.ITEMS)
    const q = query(itemsRef, where('hsnCode', '==', hsnCode))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return docToItem(snapshot.docs[0])
    }
    return null
  } catch (error) {
    console.error('Error finding item by HSN:', error)
    return null
  }
}

/**
 * Find item by barcode
 */
export async function findItemByBarcode(barcode: string): Promise<Item | null> {
  if (!barcode) return null

  if (!isFirebaseReady()) {
    const items = getItemsFromLocalStorage()
    return items.find(i => i.barcode === barcode) || null
  }

  try {
    const itemsRef = collection(db!, COLLECTIONS.ITEMS)
    const q = query(itemsRef, where('barcode', '==', barcode))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return docToItem(snapshot.docs[0])
    }
    return null
  } catch (error) {
    console.error('Error finding item by barcode:', error)
    return null
  }
}

/**
 * Find item by name (fuzzy match)
 */
export async function findItemByName(name: string): Promise<Item | null> {
  if (!name) return null

  const items = await getItems()

  // Try exact match first
  const exactMatch = items.find(i =>
    i.name.toLowerCase() === name.toLowerCase()
  )
  if (exactMatch) return exactMatch

  // Try partial match
  const partialMatch = items.find(i =>
    i.name.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(i.name.toLowerCase())
  )

  return partialMatch || null
}

/**
 * Create new item - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 */
export async function createItem(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item | null> {
  console.log('[createItem] Starting offline-first creation...')

  const now = new Date().toISOString()
  const id = generateOfflineId()

  // Deep clean undefined values (Firestore doesn't accept undefined)
  const cleanData = removeUndefinedDeep(itemData)

  const newItem: Item = {
    ...cleanData,
    id,
    createdAt: now,
    updatedAt: now,
    // Offline-first metadata
    _pendingSync: !isDeviceOnline(),
    _savedAt: now,
    _syncedAt: null
  } as Item

  // STEP 1: Always save to IndexedDB first (instant, never fails)
  try {
    await saveToOffline(STORES.ITEMS, newItem)
    // Also save to localStorage for backward compatibility
    saveItemToLocalStorage(newItem)
    console.log('[createItem] ✅ Item saved locally:', id)
  } catch (error) {
    console.error('[createItem] Failed to save locally:', error)
    // Still try to continue with localStorage only
    saveItemToLocalStorage(newItem)
  }

  // STEP 2: If online, sync to Firebase silently
  if (isDeviceOnline() && isFirebaseReady()) {
    try {
      // Remove offline metadata before sending to Firebase
      const serverData = removeUndefinedDeep({
        ...itemData,
        createdAt: now,
        updatedAt: now
      })

      const docRef = await addDoc(collection(db!, COLLECTIONS.ITEMS), serverData)

      // Update local item with Firebase ID and mark as synced
      const syncedItem: Item = {
        ...newItem,
        id: docRef.id,
        _pendingSync: false,
        _syncedAt: now
      } as Item

      // Remove old offline ID record and save with new Firebase ID
      await deleteFromOffline(STORES.ITEMS, id)
      await saveToOffline(STORES.ITEMS, syncedItem)

      // Update localStorage too
      deleteItemFromLocalStorage(id)
      saveItemToLocalStorage(syncedItem)

      console.log('[createItem] ✅ Synced to Firebase:', docRef.id)
      return syncedItem
    } catch (error) {
      console.warn('[createItem] Firebase sync failed, queuing for later:', error)
      // Add to sync queue for later retry
      await addToSyncQueue('create', STORES.ITEMS, newItem)
    }
  } else {
    // Offline - add to sync queue for later
    console.log('[createItem] 📱 Offline mode - queuing for sync')
    await addToSyncQueue('create', STORES.ITEMS, newItem)
  }

  return newItem
}

/**
 * Update existing item - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 */
export async function updateItem(id: string, updates: Partial<Item>): Promise<boolean> {
  const now = new Date().toISOString()

  // STEP 1: Get existing item from local
  let existingItem: Item | null = null
  try {
    existingItem = await getFromOffline<Item>(STORES.ITEMS, id)
  } catch (error) {
    const localItems = getItemsFromLocalStorage()
    existingItem = localItems.find(i => i.id === id) || null
  }

  if (!existingItem) {
    console.error('[updateItem] Item not found:', id)
    return false
  }

  const updatedItem: Item = {
    ...existingItem,
    ...updates,
    updatedAt: now,
    _pendingSync: !isDeviceOnline() || isOfflineId(id),
    _savedAt: now
  } as Item

  // STEP 2: Always save to IndexedDB first (instant)
  try {
    await saveToOffline(STORES.ITEMS, updatedItem)
    updateItemInLocalStorage(id, updatedItem)
    console.log('[updateItem] ✅ Updated locally:', id)
  } catch (error) {
    console.error('[updateItem] Local save failed:', error)
    updateItemInLocalStorage(id, updatedItem)
  }

  // STEP 3: If online and not an offline-only record, sync to Firebase
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      const serverData = removeUndefinedDeep({
        ...updates,
        updatedAt: now
      })
      const docRef = doc(db!, COLLECTIONS.ITEMS, id)
      await updateDoc(docRef, serverData)

      // Mark as synced
      updatedItem._pendingSync = false
      updatedItem._syncedAt = now
      await saveToOffline(STORES.ITEMS, updatedItem)

      console.log('[updateItem] ✅ Synced to Firebase:', id)
    } catch (error) {
      console.warn('[updateItem] Firebase sync failed, queuing:', error)
      await addToSyncQueue('update', STORES.ITEMS, updatedItem)
    }
  } else if (!isOfflineId(id)) {
    // Only queue if it has a Firebase ID (not offline-created)
    await addToSyncQueue('update', STORES.ITEMS, updatedItem)
  }

  return true
}

/**
 * Delete item - OFFLINE FIRST
 * Always deletes locally first, then syncs to Firebase silently when online
 */
export async function deleteItem(id: string): Promise<boolean> {
  // STEP 1: Always delete from local first (instant)
  try {
    await deleteFromOffline(STORES.ITEMS, id)
    deleteItemFromLocalStorage(id)
    console.log('[deleteItem] ✅ Deleted locally:', id)
  } catch (error) {
    console.error('[deleteItem] Local delete failed:', error)
    deleteItemFromLocalStorage(id)
  }

  // STEP 2: If online and has Firebase ID, sync deletion
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      const docRef = doc(db!, COLLECTIONS.ITEMS, id)
      await deleteDoc(docRef)
      console.log('[deleteItem] ✅ Deleted from Firebase:', id)
    } catch (error) {
      console.warn('[deleteItem] Firebase delete failed, queuing:', error)
      await addToSyncQueue('delete', STORES.ITEMS, { id })
    }
  } else if (!isOfflineId(id)) {
    // Queue for sync if has Firebase ID but currently offline
    await addToSyncQueue('delete', STORES.ITEMS, { id })
  }
  // If it's an offline-only record, no need to sync deletion

  return true
}

/**
 * Update item stock
 */
export async function updateItemStock(id: string, quantity: number, operation: 'add' | 'subtract'): Promise<boolean> {
  console.log(`📦 updateItemStock called: id=${id}, qty=${quantity}, op=${operation}`)
  
  const item = await getItemById(id)
  if (!item) {
    console.log(`❌ Item not found with id: ${id}`)
    return false
  }

  const currentStock = item.stock || 0
  const newStock = operation === 'add'
    ? currentStock + quantity
    : currentStock - quantity

  console.log(`📊 Stock change: ${currentStock} ${operation === 'add' ? '+' : '-'} ${quantity} = ${Math.max(0, newStock)}`)
  
  const success = await updateItem(id, { stock: Math.max(0, newStock) })
  console.log(`✅ updateItem result: ${success ? 'SUCCESS' : 'FAILED'}`)
  
  return success
}

/**
 * Find or create item from scanned invoice data
 */
export async function findOrCreateItemFromInvoice(
  description: string,
  hsnCode?: string,
  rate?: number,
  unit?: string,
  taxRate?: number
): Promise<Item | null> {
  // Try to find by HSN code first
  if (hsnCode) {
    const existing = await findItemByHSN(hsnCode)
    if (existing) {
      // Update price if provided and different
      if (rate && rate !== existing.purchasePrice) {
        await updateItem(existing.id, {
          purchasePrice: rate,
          // Update selling price with a margin (e.g., 20%)
          sellingPrice: rate * 1.2
        })
      }
      return existing
    }
  }

  // Try to find by name
  const existingByName = await findItemByName(description)
  if (existingByName) {
    // Update HSN code if not present
    if (hsnCode && !existingByName.hsnCode) {
      await updateItem(existingByName.id, { hsnCode })
    }
    return existingByName
  }

  // Create new item
  const newItemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
    name: description,
    description: description,
    itemCode: `ITEM${Date.now()}`,
    hsnCode: hsnCode || '',
    category: 'General',
    unit: (unit as any) || 'PCS',
    purchasePrice: rate || 0,
    sellingPrice: rate ? rate * 1.2 : 0, // 20% margin
    taxPreference: taxRate && taxRate > 0 ? 'taxable' : 'non-taxable',
    tax: {
      cgst: taxRate ? taxRate / 2 : 0,
      sgst: taxRate ? taxRate / 2 : 0,
      igst: taxRate || 0,
      cess: 0
    },
    stock: 0,
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
    isActive: true
  }

  return await createItem(newItemData)
}

// Helper function to convert Firestore document to Item
function docToItem(doc: QueryDocumentSnapshot<DocumentData>): Item {
  const data = doc.data()
  return {
    ...data,
    id: doc.id
  } as Item
}

// ============================================
// LOCAL STORAGE FALLBACK FUNCTIONS
// ============================================

function getItemsFromLocalStorage(): Item[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!stored) return []

    let items: Item[] = JSON.parse(stored)

    // Sort by createdAt descending (newest first)
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return items
  } catch (error) {
    console.error('Error reading items from local storage:', error)
    return []
  }
}

function saveItemToLocalStorage(item: Item): void {
  try {
    const items = getItemsFromLocalStorage()
    items.push(item)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.error('Error saving item to local storage:', error)
  }
}

function updateItemInLocalStorage(id: string, updates: Partial<Item>): boolean {
  try {
    const items = getItemsFromLocalStorage()
    const index = items.findIndex(i => i.id === id)

    if (index === -1) return false

    items[index] = { ...items[index], ...updates }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
    return true
  } catch (error) {
    console.error('Error updating item in local storage:', error)
    return false
  }
}

function deleteItemFromLocalStorage(id: string): boolean {
  try {
    const items = getItemsFromLocalStorage()
    const filtered = items.filter(i => i.id !== id)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting item from local storage:', error)
    return false
  }
}
