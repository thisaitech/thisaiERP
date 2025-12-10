// Price List Service
// Handle price list management with Firebase integration

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'

// Types
export interface PriceList {
  id: string
  name: string
  discount: number
  isDefault: boolean
  itemCount: number
  createdAt: string
  updatedAt?: string
}

// Local storage key
const PRICE_LISTS_KEY = 'thisai_crm_price_lists'

// Helper to generate ID
const generateId = () => `PL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

/**
 * Create a new Price List
 */
export async function createPriceList(data: { name: string; discount: number; isDefault: boolean }): Promise<PriceList> {
  const now = new Date().toISOString()
  const id = generateId()

  const newPriceList: PriceList = {
    id,
    name: data.name,
    discount: data.discount,
    isDefault: data.isDefault,
    itemCount: 0,
    createdAt: now
  }

  // If this is set as default, unset other defaults
  let priceLists = getPriceListsFromLocalStorage()
  if (data.isDefault) {
    priceLists = priceLists.map(pl => ({ ...pl, isDefault: false }))
  }

  // Add new price list
  priceLists.push(newPriceList)
  localStorage.setItem(PRICE_LISTS_KEY, JSON.stringify(priceLists))

  // Sync to Firebase if available
  if (isFirebaseReady() && db) {
    try {
      // If setting as default, update other records in Firebase
      if (data.isDefault) {
        const q = query(collection(db, COLLECTIONS.PRICE_LISTS))
        const snapshot = await getDocs(q)
        for (const docSnap of snapshot.docs) {
          if (docSnap.data().isDefault) {
            await updateDoc(doc(db, COLLECTIONS.PRICE_LISTS, docSnap.id), { isDefault: false })
          }
        }
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.PRICE_LISTS), {
        name: data.name,
        discount: data.discount,
        isDefault: data.isDefault,
        itemCount: 0,
        createdAt: now
      })

      // Update local record with Firebase ID
      const updatedPriceList = { ...newPriceList, id: docRef.id }
      const updatedLists = priceLists.map(pl => pl.id === id ? updatedPriceList : pl)
      localStorage.setItem(PRICE_LISTS_KEY, JSON.stringify(updatedLists))

      console.log('[PriceList] Saved to Firebase:', docRef.id)
      return updatedPriceList
    } catch (error) {
      console.error('[PriceList] Firebase save failed, kept in localStorage:', error)
    }
  }

  return newPriceList
}

/**
 * Get all Price Lists
 */
export async function getPriceLists(): Promise<PriceList[]> {
  // Try Firebase first if available
  if (isFirebaseReady() && db) {
    try {
      const q = query(
        collection(db, COLLECTIONS.PRICE_LISTS),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const priceLists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PriceList))

      // Update local cache
      localStorage.setItem(PRICE_LISTS_KEY, JSON.stringify(priceLists))

      return priceLists
    } catch (error) {
      console.error('[PriceList] Firebase fetch failed:', error)
    }
  }

  // Fallback to localStorage
  return getPriceListsFromLocalStorage()
}

/**
 * Update a Price List
 */
export async function updatePriceList(id: string, data: Partial<PriceList>): Promise<PriceList | null> {
  const now = new Date().toISOString()
  let priceLists = getPriceListsFromLocalStorage()

  // Find and update the price list
  const index = priceLists.findIndex(pl => pl.id === id)
  if (index === -1) return null

  // If setting as default, unset other defaults
  if (data.isDefault) {
    priceLists = priceLists.map(pl => ({ ...pl, isDefault: false }))
  }

  const updatedPriceList = {
    ...priceLists[index],
    ...data,
    updatedAt: now
  }
  priceLists[index] = updatedPriceList

  localStorage.setItem(PRICE_LISTS_KEY, JSON.stringify(priceLists))

  // Sync to Firebase if available
  if (isFirebaseReady() && db && !id.startsWith('PL_')) {
    try {
      // If setting as default, update other records in Firebase
      if (data.isDefault) {
        const q = query(collection(db, COLLECTIONS.PRICE_LISTS))
        const snapshot = await getDocs(q)
        for (const docSnap of snapshot.docs) {
          if (docSnap.id !== id && docSnap.data().isDefault) {
            await updateDoc(doc(db, COLLECTIONS.PRICE_LISTS, docSnap.id), { isDefault: false })
          }
        }
      }

      await updateDoc(doc(db, COLLECTIONS.PRICE_LISTS, id), {
        ...data,
        updatedAt: now
      })
      console.log('[PriceList] Updated in Firebase:', id)
    } catch (error) {
      console.error('[PriceList] Firebase update failed:', error)
    }
  }

  return updatedPriceList
}

/**
 * Delete a Price List
 */
export async function deletePriceList(id: string): Promise<boolean> {
  // Remove from localStorage
  const priceLists = getPriceListsFromLocalStorage()
  const filtered = priceLists.filter(pl => pl.id !== id)
  localStorage.setItem(PRICE_LISTS_KEY, JSON.stringify(filtered))

  // Delete from Firebase if available
  if (isFirebaseReady() && db && !id.startsWith('PL_')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PRICE_LISTS, id))
      console.log('[PriceList] Deleted from Firebase:', id)
    } catch (error) {
      console.error('[PriceList] Firebase delete failed:', error)
    }
  }

  return true
}

/**
 * Set a Price List as default
 */
export async function setDefaultPriceList(id: string): Promise<boolean> {
  return (await updatePriceList(id, { isDefault: true })) !== null
}

function getPriceListsFromLocalStorage(): PriceList[] {
  try {
    const stored = localStorage.getItem(PRICE_LISTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}
