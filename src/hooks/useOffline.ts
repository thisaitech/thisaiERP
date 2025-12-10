// useOffline Hook - Easy access to offline functionality in components

import { useState, useEffect, useCallback } from 'react'
import { 
  subscribeSyncStatus, 
  SyncStatus, 
  offlineFirst, 
  forceSyncNow,
  fullSyncFromServer,
  isNetworkOnline 
} from '../services/syncService'
import { STORES, syncQueue } from '../services/offlineDB'

export interface UseOfflineReturn {
  // Status
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: number | null
  error: string | null
  
  // Actions
  syncNow: () => Promise<void>
  fullSync: () => Promise<void>
  
  // Data operations (offline-first)
  createRecord: <T extends { id?: string }>(store: string, data: T) => Promise<T & { id: string }>
  updateRecord: <T extends { id: string }>(store: string, data: T) => Promise<T>
  deleteRecord: (store: string, id: string) => Promise<void>
  getRecords: <T>(store: string, refreshFromServer?: boolean) => Promise<T[]>
  getRecord: <T>(store: string, id: string) => Promise<T | undefined>
}

export const useOffline = (): UseOfflineReturn => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null
  })

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setStatus)
    return () => unsubscribe()
  }, [])

  const syncNow = useCallback(async () => {
    await forceSyncNow()
  }, [])

  const fullSync = useCallback(async () => {
    await fullSyncFromServer()
  }, [])

  const createRecord = useCallback(async <T extends { id?: string }>(store: string, data: T) => {
    return offlineFirst.create<T>(store, data)
  }, [])

  const updateRecord = useCallback(async <T extends { id: string }>(store: string, data: T) => {
    return offlineFirst.update<T>(store, data)
  }, [])

  const deleteRecord = useCallback(async (store: string, id: string) => {
    return offlineFirst.delete(store, id)
  }, [])

  const getRecords = useCallback(async <T>(store: string, refreshFromServer = false) => {
    return offlineFirst.getAll<T>(store, refreshFromServer)
  }, [])

  const getRecord = useCallback(async <T>(store: string, id: string) => {
    return offlineFirst.get<T>(store, id)
  }, [])

  return {
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: status.pendingCount,
    lastSyncTime: status.lastSyncTime,
    error: status.error,
    syncNow,
    fullSync,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecords,
    getRecord
  }
}

// Specific hooks for different data types
export const useOfflineSales = () => {
  const offline = useOffline()
  
  return {
    ...offline,
    createSale: (data: any) => offline.createRecord(STORES.INVOICES, data),
    updateSale: (data: any) => offline.updateRecord(STORES.INVOICES, data),
    deleteSale: (id: string) => offline.deleteRecord(STORES.INVOICES, id),
    getSales: (refresh = false) => offline.getRecords(STORES.INVOICES, refresh),
    getSale: (id: string) => offline.getRecord(STORES.INVOICES, id)
  }
}

export const useOfflinePurchases = () => {
  const offline = useOffline()
  
  return {
    ...offline,
    createPurchase: (data: any) => offline.createRecord(STORES.PURCHASES, data),
    updatePurchase: (data: any) => offline.updateRecord(STORES.PURCHASES, data),
    deletePurchase: (id: string) => offline.deleteRecord(STORES.PURCHASES, id),
    getPurchases: (refresh = false) => offline.getRecords(STORES.PURCHASES, refresh),
    getPurchase: (id: string) => offline.getRecord(STORES.PURCHASES, id)
  }
}

export const useOfflineParties = () => {
  const offline = useOffline()
  
  return {
    ...offline,
    createParty: (data: any) => offline.createRecord(STORES.PARTIES, data),
    updateParty: (data: any) => offline.updateRecord(STORES.PARTIES, data),
    deleteParty: (id: string) => offline.deleteRecord(STORES.PARTIES, id),
    getParties: (refresh = false) => offline.getRecords(STORES.PARTIES, refresh),
    getParty: (id: string) => offline.getRecord(STORES.PARTIES, id)
  }
}

export const useOfflineItems = () => {
  const offline = useOffline()
  
  return {
    ...offline,
    createItem: (data: any) => offline.createRecord(STORES.ITEMS, data),
    updateItem: (data: any) => offline.updateRecord(STORES.ITEMS, data),
    deleteItem: (id: string) => offline.deleteRecord(STORES.ITEMS, id),
    getItems: (refresh = false) => offline.getRecords(STORES.ITEMS, refresh),
    getItem: (id: string) => offline.getRecord(STORES.ITEMS, id)
  }
}

export const useOfflineExpenses = () => {
  const offline = useOffline()
  
  return {
    ...offline,
    createExpense: (data: any) => offline.createRecord(STORES.EXPENSES, data),
    updateExpense: (data: any) => offline.updateRecord(STORES.EXPENSES, data),
    deleteExpense: (id: string) => offline.deleteRecord(STORES.EXPENSES, id),
    getExpenses: (refresh = false) => offline.getRecords(STORES.EXPENSES, refresh),
    getExpense: (id: string) => offline.getRecord(STORES.EXPENSES, id)
  }
}

export const useOfflineQuotations = () => {
  const offline = useOffline()
  
  return {
    ...offline,
    createQuotation: (data: any) => offline.createRecord(STORES.QUOTATIONS, data),
    updateQuotation: (data: any) => offline.updateRecord(STORES.QUOTATIONS, data),
    deleteQuotation: (id: string) => offline.deleteRecord(STORES.QUOTATIONS, id),
    getQuotations: (refresh = false) => offline.getRecords(STORES.QUOTATIONS, refresh),
    getQuotation: (id: string) => offline.getRecord(STORES.QUOTATIONS, id)
  }
}

// Get pending sync count
export const usePendingSyncCount = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const updateCount = async () => {
      const queueCount = await syncQueue.getCount()
      setCount(queueCount.pending + queueCount.failed)
    }

    updateCount()
    const interval = setInterval(updateCount, 5000)
    return () => clearInterval(interval)
  }, [])

  return count
}

export default useOffline









