// Clear All Data Utility
// This script clears all data from Firebase collections and localStorage

import { db, isFirebaseReady, COLLECTIONS } from '../services/firebase'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

/**
 * Clear all data from a specific collection
 */
async function clearCollection(collectionName: string): Promise<number> {
  if (!db) {
    console.log(`⚠️ Firebase not configured, skipping ${collectionName}`)
    return 0
  }

  try {
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)

    console.log(`📦 Found ${snapshot.size} documents in ${collectionName}`)

    // Delete all documents
    const deletePromises = snapshot.docs.map(document =>
      deleteDoc(doc(db!, collectionName, document.id))
    )

    await Promise.all(deletePromises)
    console.log(`✅ Cleared ${snapshot.size} documents from ${collectionName}`)

    return snapshot.size
  } catch (error) {
    console.error(`❌ Error clearing ${collectionName}:`, error)
    return 0
  }
}

/**
 * Clear all localStorage data
 */
function clearLocalStorage(): void {
  const keysToKeep = [
    'theme',
    'language',
    'hasSeenOnboarding',
    'thisai_crm_settings' // IMPORTANT: Keep company/business settings
  ]
  const allKeys = Object.keys(localStorage)

  let clearedCount = 0
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key)
      clearedCount++
    }
  })

  // Also clear sessionStorage
  try {
    sessionStorage.clear()
    console.log('🗑️ Cleared sessionStorage')
  } catch (e) {
    console.log('⚠️ Could not clear sessionStorage')
  }

  console.log(`🗑️ Cleared ${clearedCount} items from localStorage (preserved company settings)`)
}

/**
 * Main function to clear all data
 */
export async function clearAllData(): Promise<void> {
  console.log('🚀 Starting data cleanup...')
  console.log('=' .repeat(50))

  let totalDeleted = 0

  // Clear Firebase collections
  if (isFirebaseReady()) {
    console.log('\n📡 Clearing Firebase collections...\n')

    // Clear main collections
    totalDeleted += await clearCollection(COLLECTIONS.PARTIES)
    totalDeleted += await clearCollection(COLLECTIONS.ITEMS)
    totalDeleted += await clearCollection(COLLECTIONS.INVOICES)
    totalDeleted += await clearCollection(COLLECTIONS.EXPENSES)
    totalDeleted += await clearCollection(COLLECTIONS.QUOTATIONS)
    totalDeleted += await clearCollection(COLLECTIONS.DELIVERY_CHALLANS)
    totalDeleted += await clearCollection(COLLECTIONS.PURCHASE_ORDERS)
    totalDeleted += await clearCollection(COLLECTIONS.CREDIT_NOTES)
    totalDeleted += await clearCollection(COLLECTIONS.DEBIT_NOTES)
    totalDeleted += await clearCollection(COLLECTIONS.PROFORMA_INVOICES)
    totalDeleted += await clearCollection(COLLECTIONS.EWAY_BILLS)
    totalDeleted += await clearCollection(COLLECTIONS.PAYMENTS_IN)
    totalDeleted += await clearCollection(COLLECTIONS.PAYMENTS_OUT)
    totalDeleted += await clearCollection(COLLECTIONS.BANKING)
    totalDeleted += await clearCollection(COLLECTIONS.PRICE_LISTS)

    // Also clear allocated_payments collection (may not be in COLLECTIONS)
    totalDeleted += await clearCollection('allocated_payments')
    totalDeleted += await clearCollection('ledger')
    totalDeleted += await clearCollection('ledger_entries')

    // Keep BUSINESSES, SETTINGS, and USERS collections
    console.log('\n📌 Preserved collections: BUSINESSES, SETTINGS, USERS')
  } else {
    console.log('\n⚠️ Firebase not configured, skipping Firebase cleanup')
  }

  // Clear localStorage
  console.log('\n💾 Clearing localStorage...\n')
  clearLocalStorage()

  console.log('\n' + '='.repeat(50))
  console.log(`✨ Cleanup complete! Deleted ${totalDeleted} Firebase documents`)
  console.log('🔄 Please refresh the page to see changes')
  console.log('='.repeat(50))
}

/**
 * Fix invoice types - Migrate old quotations that were saved with wrong type
 * This updates invoices in Firebase that have source='quotation' but type='sale' to type='quote'
 */
export async function fixInvoiceTypes(): Promise<void> {
  console.log('🔧 Starting invoice type fix...')

  if (!isFirebaseReady() || !db) {
    console.log('⚠️ Firebase not ready, cannot fix invoice types')
    return
  }

  try {
    const { updateDoc } = await import('firebase/firestore')
    const invoicesRef = collection(db, COLLECTIONS.INVOICES)
    const snapshot = await getDocs(invoicesRef)

    let fixedCount = 0
    const fixPromises: Promise<void>[] = []

    snapshot.docs.forEach(document => {
      const data = document.data()
      // Fix invoices that should be quotations but have type='sale'
      // These are invoices created from the Quotations page before the bug fix
      if (data.source === 'quotation' && data.type === 'sale') {
        console.log(`📝 Fixing invoice ${data.invoiceNumber}: changing type from 'sale' to 'quote'`)
        fixPromises.push(
          updateDoc(doc(db!, COLLECTIONS.INVOICES, document.id), { type: 'quote' })
        )
        fixedCount++
      }
    })

    await Promise.all(fixPromises)

    console.log(`✅ Fixed ${fixedCount} invoices (changed type from 'sale' to 'quote')`)
    console.log('🔄 Please refresh the page to see changes')

    // Also clear local IndexedDB cache to force fresh data
    try {
      const dbRequest = indexedDB.deleteDatabase('thisai_crm_offline')
      dbRequest.onsuccess = () => console.log('🗑️ Cleared IndexedDB cache')
      dbRequest.onerror = () => console.log('⚠️ Could not clear IndexedDB cache')
    } catch (e) {
      console.log('⚠️ IndexedDB clear failed:', e)
    }
  } catch (error) {
    console.error('❌ Error fixing invoice types:', error)
  }
}

/**
 * Clear only the local cache (IndexedDB and localStorage invoice data)
 * This forces a fresh sync from Firebase
 */
export function clearLocalCache(): void {
  console.log('🗑️ Clearing local cache...')

  // Clear invoice-related localStorage keys
  const invoiceKeys = [
    'thisai_crm_invoices',
    'sales_invoiceTabs',
    'sales_activeTabId',
    'purchases_invoiceTabs',
    'purchases_activeTabId',
    'quotations_invoiceTabs',
    'quotations_activeTabId'
  ]

  invoiceKeys.forEach(key => {
    localStorage.removeItem(key)
    console.log(`  Removed: ${key}`)
  })

  // Clear IndexedDB
  try {
    const dbRequest = indexedDB.deleteDatabase('thisai_crm_offline')
    dbRequest.onsuccess = () => console.log('✅ Cleared IndexedDB cache')
    dbRequest.onerror = () => console.log('⚠️ Could not clear IndexedDB cache')
  } catch (e) {
    console.log('⚠️ IndexedDB clear failed:', e)
  }

  console.log('🔄 Please refresh the page to fetch fresh data from Firebase')
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).clearAllData = clearAllData
  (window as any).fixInvoiceTypes = fixInvoiceTypes
  (window as any).clearLocalCache = clearLocalCache
  console.log('💡 Tip: Run clearAllData() in browser console to clear all data')
  console.log('💡 Tip: Run fixInvoiceTypes() to fix old quotations with wrong type')
  console.log('💡 Tip: Run clearLocalCache() to clear local cache and refresh from Firebase')
}
