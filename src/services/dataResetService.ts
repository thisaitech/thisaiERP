// Data Reset Service
// Clears all data from Firebase and localStorage for a fresh start

import { db, isFirebaseReady, COLLECTIONS } from './firebase'
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore'

// Local storage keys used by the app
const LOCAL_STORAGE_KEYS = [
  'parties',
  'items',
  'invoices',
  'expenses',
  'settings',
  'quotations',
  'purchases',
  'payments',
  'payments_in',
  'payments_out',
  'allocated_payments',
  'payment_allocations',
  'party_advances',
  'banking',
  'credit_notes',
  'debit_notes',
  'delivery_challans',
  'purchase_orders',
  'proforma_invoices',
  'eway_bills',
  'price_lists',
  'ledger',
  'ledger_entries',
  'transactions',
  'inventory',
  'stock_movements',
  'categories',
  'units',
  'taxes',
  'tax_rates',
  'business_info',
  'company_info',
  'user_settings',
  'app_settings',
  'reports_cache',
  'dashboard_cache'
]

/**
 * Clear all local storage data
 */
export function clearLocalStorage(): { cleared: string[], failed: string[] } {
  const cleared: string[] = []
  const failed: string[] = []

  for (const key of LOCAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
      cleared.push(key)
    } catch (error) {
      console.error(`Failed to clear localStorage key: ${key}`, error)
      failed.push(key)
    }
  }

  // Also clear any keys that start with common prefixes
  const allKeys = Object.keys(localStorage)
  for (const key of allKeys) {
    if (
      key.startsWith('anna_') ||
      key.startsWith('crm_') ||
      key.startsWith('invoice_') ||
      key.startsWith('party_') ||
      key.startsWith('item_') ||
      key.startsWith('expense_') ||
      key.startsWith('payment_')
    ) {
      try {
        localStorage.removeItem(key)
        cleared.push(key)
      } catch (error) {
        failed.push(key)
      }
    }
  }

  console.log(`[clearLocalStorage] Cleared ${cleared.length} keys, ${failed.length} failed`)
  return { cleared, failed }
}

/**
 * Clear all data from a Firebase collection
 */
async function clearCollection(collectionName: string): Promise<number> {
  if (!isFirebaseReady() || !db) {
    console.log(`[clearCollection] Firebase not ready, skipping ${collectionName}`)
    return 0
  }

  try {
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)

    if (snapshot.empty) {
      console.log(`[clearCollection] ${collectionName} is already empty`)
      return 0
    }

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500
    let deleted = 0
    let batch = writeBatch(db)
    let batchCount = 0

    for (const docSnapshot of snapshot.docs) {
      batch.delete(doc(db, collectionName, docSnapshot.id))
      batchCount++
      deleted++

      if (batchCount >= batchSize) {
        await batch.commit()
        batch = writeBatch(db)
        batchCount = 0
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit()
    }

    console.log(`[clearCollection] Deleted ${deleted} documents from ${collectionName}`)
    return deleted
  } catch (error) {
    console.error(`[clearCollection] Error clearing ${collectionName}:`, error)
    return 0
  }
}

/**
 * Clear all Firebase collections
 */
export async function clearFirebaseData(): Promise<{ collection: string, deleted: number }[]> {
  const results: { collection: string, deleted: number }[] = []

  // All collections to clear
  const collectionsToClean = [
    COLLECTIONS.PARTIES,
    COLLECTIONS.ITEMS,
    COLLECTIONS.INVOICES,
    COLLECTIONS.EXPENSES,
    COLLECTIONS.QUOTATIONS,
    COLLECTIONS.PAYMENTS_IN,
    COLLECTIONS.PAYMENTS_OUT,
    COLLECTIONS.BANKING,
    COLLECTIONS.CREDIT_NOTES,
    COLLECTIONS.DEBIT_NOTES,
    COLLECTIONS.DELIVERY_CHALLANS,
    COLLECTIONS.PURCHASE_ORDERS,
    COLLECTIONS.PROFORMA_INVOICES,
    COLLECTIONS.EWAY_BILLS,
    COLLECTIONS.PRICE_LISTS,
    // Don't clear these by default (user/business settings):
    // COLLECTIONS.BUSINESSES,
    // COLLECTIONS.SETTINGS,
    // COLLECTIONS.USERS,
  ]

  for (const collectionName of collectionsToClean) {
    const deleted = await clearCollection(collectionName)
    results.push({ collection: collectionName, deleted })
  }

  return results
}

/**
 * Reset ALL data (Firebase + localStorage)
 * Returns a summary of what was deleted
 */
export async function resetAllData(includeSettings: boolean = false): Promise<{
  success: boolean
  localStorage: { cleared: string[], failed: string[] }
  firebase: { collection: string, deleted: number }[]
  message: string
}> {
  console.log('========================================')
  console.log('STARTING FULL DATA RESET')
  console.log('========================================')

  // Step 1: Clear localStorage
  console.log('\n[Step 1] Clearing localStorage...')
  const localStorageResult = clearLocalStorage()

  // Step 2: Clear Firebase collections
  console.log('\n[Step 2] Clearing Firebase collections...')
  const firebaseResult = await clearFirebaseData()

  // Step 3: Optionally clear settings
  if (includeSettings && isFirebaseReady() && db) {
    console.log('\n[Step 3] Clearing settings...')
    await clearCollection(COLLECTIONS.SETTINGS)
    await clearCollection(COLLECTIONS.BUSINESSES)
  }

  // Calculate totals
  const totalFirebaseDeleted = firebaseResult.reduce((sum, r) => sum + r.deleted, 0)
  const totalLocalCleared = localStorageResult.cleared.length

  const message = `Data reset complete! Cleared ${totalLocalCleared} localStorage keys and ${totalFirebaseDeleted} Firebase documents.`

  console.log('\n========================================')
  console.log(message)
  console.log('========================================')

  return {
    success: true,
    localStorage: localStorageResult,
    firebase: firebaseResult,
    message
  }
}

/**
 * Export for use in console for emergency reset
 * Usage: window.resetAllData()
 */
if (typeof window !== 'undefined') {
  (window as any).resetAllData = resetAllData
  (window as any).clearLocalStorage = clearLocalStorage
  (window as any).clearFirebaseData = clearFirebaseData
}
