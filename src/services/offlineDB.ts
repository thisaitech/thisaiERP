// Offline Database Service using IndexedDB
// Provides local storage for offline-first functionality

const DB_NAME = 'thisai_crm_offline'
const DB_VERSION = 1

// Store names for different data types
export const STORES = {
  INVOICES: 'invoices',
  PURCHASES: 'purchases',
  PARTIES: 'parties',
  ITEMS: 'items',
  PAYMENTS: 'payments',
  EXPENSES: 'expenses',
  QUOTATIONS: 'quotations',
  DELIVERY_CHALLANS: 'delivery_challans',
  SYNC_QUEUE: 'sync_queue', // Queue for pending sync operations
  SETTINGS: 'settings'
}

// Sync operation types
export type SyncOperation = {
  id: string
  store: string
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
}

let db: IDBDatabase | null = null

// Initialize the database
export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      console.log('✅ Offline database initialized')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create object stores for each data type
      Object.values(STORES).forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'id' })
          
          // Add indexes based on store type
          if (storeName === STORES.INVOICES || storeName === STORES.PURCHASES) {
            store.createIndex('invoiceNumber', 'invoiceNumber', { unique: false })
            store.createIndex('partyName', 'partyName', { unique: false })
            store.createIndex('date', 'invoiceDate', { unique: false })
            store.createIndex('syncStatus', 'syncStatus', { unique: false })
          }
          
          if (storeName === STORES.PARTIES) {
            store.createIndex('name', 'name', { unique: false })
            store.createIndex('phone', 'phone', { unique: false })
          }
          
          if (storeName === STORES.ITEMS) {
            store.createIndex('name', 'name', { unique: false })
            store.createIndex('barcode', 'barcode', { unique: false })
          }
          
          if (storeName === STORES.SYNC_QUEUE) {
            store.createIndex('status', 'status', { unique: false })
            store.createIndex('timestamp', 'timestamp', { unique: false })
          }
        }
      })

      console.log('📦 Offline database schema created/updated')
    }
  })
}

// Generic CRUD operations for any store
export const offlineDB = {
  // Add or update a record
  async put<T extends { id: string }>(storeName: string, data: T): Promise<T> {
    const database = await initOfflineDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      
      // Add sync metadata
      const dataWithMeta = {
        ...data,
        _offlineCreated: !data.id.startsWith('offline_') ? false : true,
        _lastModified: Date.now()
      }
      
      const request = store.put(dataWithMeta)
      
      request.onsuccess = () => resolve(dataWithMeta as T)
      request.onerror = () => reject(request.error)
    })
  },

  // Get a single record by ID
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const database = await initOfflineDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)
      
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => reject(request.error)
    })
  },

  // Get all records from a store
  async getAll<T>(storeName: string): Promise<T[]> {
    const database = await initOfflineDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  },

  // Delete a record
  async delete(storeName: string, id: string): Promise<void> {
    const database = await initOfflineDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  },

  // Clear all records from a store
  async clear(storeName: string): Promise<void> {
    const database = await initOfflineDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  },

  // Query by index
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const database = await initOfflineDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)
      
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  },

  // Bulk insert/update
  async bulkPut<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
    const database = await initOfflineDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      
      items.forEach(item => {
        store.put({
          ...item,
          _lastModified: Date.now()
        })
      })
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

// Sync Queue Management
export const syncQueue = {
  // Add operation to sync queue
  async add(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<void> {
    const syncOp: SyncOperation = {
      ...operation,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    }
    await offlineDB.put(STORES.SYNC_QUEUE, syncOp)
    console.log('📝 Added to sync queue:', syncOp)
  },

  // Get all pending operations
  async getPending(): Promise<SyncOperation[]> {
    const all = await offlineDB.getAll<SyncOperation>(STORES.SYNC_QUEUE)
    return all.filter(op => op.status === 'pending' || op.status === 'failed')
  },

  // Update operation status
  async updateStatus(id: string, status: SyncOperation['status'], retryCount?: number): Promise<void> {
    const op = await offlineDB.get<SyncOperation>(STORES.SYNC_QUEUE, id)
    if (op) {
      await offlineDB.put(STORES.SYNC_QUEUE, {
        ...op,
        status,
        retryCount: retryCount ?? op.retryCount
      })
    }
  },

  // Remove completed operations
  async clearCompleted(): Promise<void> {
    const all = await offlineDB.getAll<SyncOperation>(STORES.SYNC_QUEUE)
    const completed = all.filter(op => op.status === 'completed')
    for (const op of completed) {
      await offlineDB.delete(STORES.SYNC_QUEUE, op.id)
    }
  },

  // Get queue count
  async getCount(): Promise<{ pending: number; failed: number; total: number }> {
    const all = await offlineDB.getAll<SyncOperation>(STORES.SYNC_QUEUE)
    return {
      pending: all.filter(op => op.status === 'pending').length,
      failed: all.filter(op => op.status === 'failed').length,
      total: all.length
    }
  }
}

// Generate offline-safe ID
export const generateOfflineId = (): string => {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Check if ID is an offline-generated ID
export const isOfflineId = (id: string): boolean => {
  return id.startsWith('offline_')
}

export default offlineDB









