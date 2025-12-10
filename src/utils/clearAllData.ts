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
  const keysToKeep = ['theme', 'language'] // Keep user preferences
  const allKeys = Object.keys(localStorage)

  let clearedCount = 0
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key)
      clearedCount++
    }
  })

  console.log(`🗑️ Cleared ${clearedCount} items from localStorage`)
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
    totalDeleted += await clearCollection(COLLECTIONS.DELIVERY_CHALLANS)
    totalDeleted += await clearCollection(COLLECTIONS.PURCHASE_ORDERS)
    totalDeleted += await clearCollection(COLLECTIONS.CREDIT_NOTES)
    totalDeleted += await clearCollection(COLLECTIONS.DEBIT_NOTES)
    totalDeleted += await clearCollection(COLLECTIONS.PROFORMA_INVOICES)
    totalDeleted += await clearCollection(COLLECTIONS.EWAY_BILLS)

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

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).clearAllData = clearAllData
  console.log('💡 Tip: Run clearAllData() in browser console to clear all data')
}
