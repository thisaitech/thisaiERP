// Payment In/Out Service
// Handle direct payment receipts and payments (not tied to invoices)

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'

// Types
export interface PaymentIn {
  id: string
  partyId: string
  partyName: string
  amount: number
  paymentMode: 'cash' | 'upi' | 'bank' | 'cheque' | 'card'
  paymentDate: string
  reference?: string
  notes?: string
  createdAt: string
}

export interface PaymentOut {
  id: string
  partyId: string
  partyName: string
  amount: number
  paymentMode: 'cash' | 'upi' | 'bank' | 'cheque' | 'card'
  paymentDate: string
  reference?: string
  notes?: string
  createdAt: string
}

// Local storage keys
const PAYMENTS_IN_KEY = 'thisai_crm_payments_in'
const PAYMENTS_OUT_KEY = 'thisai_crm_payments_out'

// Helper to generate ID
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// ==================== PAYMENT IN ====================

/**
 * Create a new Payment In record
 */
export async function createPaymentIn(data: Omit<PaymentIn, 'id' | 'createdAt'>): Promise<PaymentIn> {
  const now = new Date().toISOString()
  const id = generateId('PIN')

  const newPayment: PaymentIn = {
    ...data,
    id,
    createdAt: now
  }

  // Save to localStorage first
  const payments = getPaymentsInFromLocalStorage()
  payments.push(newPayment)
  localStorage.setItem(PAYMENTS_IN_KEY, JSON.stringify(payments))

  // Sync to Firebase if available
  if (isFirebaseReady() && db) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS_IN), {
        ...data,
        createdAt: now
      })

      // Update local record with Firebase ID
      const updatedPayment = { ...newPayment, id: docRef.id }
      const updatedPayments = payments.map(p => p.id === id ? updatedPayment : p)
      localStorage.setItem(PAYMENTS_IN_KEY, JSON.stringify(updatedPayments))

      console.log('[PaymentIn] Saved to Firebase:', docRef.id)
      return updatedPayment
    } catch (error) {
      console.error('[PaymentIn] Firebase save failed, kept in localStorage:', error)
    }
  }

  return newPayment
}

/**
 * Get all Payment In records
 */
export async function getPaymentsIn(): Promise<PaymentIn[]> {
  // Try Firebase first if available
  if (isFirebaseReady() && db) {
    try {
      const q = query(
        collection(db, COLLECTIONS.PAYMENTS_IN),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PaymentIn))

      // Update local cache
      localStorage.setItem(PAYMENTS_IN_KEY, JSON.stringify(payments))

      return payments
    } catch (error) {
      console.error('[PaymentIn] Firebase fetch failed:', error)
    }
  }

  // Fallback to localStorage
  return getPaymentsInFromLocalStorage()
}

/**
 * Delete a Payment In record
 */
export async function deletePaymentIn(id: string): Promise<boolean> {
  // Remove from localStorage
  const payments = getPaymentsInFromLocalStorage()
  const filtered = payments.filter(p => p.id !== id)
  localStorage.setItem(PAYMENTS_IN_KEY, JSON.stringify(filtered))

  // Delete from Firebase if available
  if (isFirebaseReady() && db && !id.startsWith('PIN_')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PAYMENTS_IN, id))
      console.log('[PaymentIn] Deleted from Firebase:', id)
    } catch (error) {
      console.error('[PaymentIn] Firebase delete failed:', error)
    }
  }

  return true
}

function getPaymentsInFromLocalStorage(): PaymentIn[] {
  try {
    const stored = localStorage.getItem(PAYMENTS_IN_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// ==================== PAYMENT OUT ====================

/**
 * Create a new Payment Out record
 */
export async function createPaymentOut(data: Omit<PaymentOut, 'id' | 'createdAt'>): Promise<PaymentOut> {
  const now = new Date().toISOString()
  const id = generateId('POUT')

  const newPayment: PaymentOut = {
    ...data,
    id,
    createdAt: now
  }

  // Save to localStorage first
  const payments = getPaymentsOutFromLocalStorage()
  payments.push(newPayment)
  localStorage.setItem(PAYMENTS_OUT_KEY, JSON.stringify(payments))

  // Sync to Firebase if available
  if (isFirebaseReady() && db) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS_OUT), {
        ...data,
        createdAt: now
      })

      // Update local record with Firebase ID
      const updatedPayment = { ...newPayment, id: docRef.id }
      const updatedPayments = payments.map(p => p.id === id ? updatedPayment : p)
      localStorage.setItem(PAYMENTS_OUT_KEY, JSON.stringify(updatedPayments))

      console.log('[PaymentOut] Saved to Firebase:', docRef.id)
      return updatedPayment
    } catch (error) {
      console.error('[PaymentOut] Firebase save failed, kept in localStorage:', error)
    }
  }

  return newPayment
}

/**
 * Get all Payment Out records
 */
export async function getPaymentsOut(): Promise<PaymentOut[]> {
  // Try Firebase first if available
  if (isFirebaseReady() && db) {
    try {
      const q = query(
        collection(db, COLLECTIONS.PAYMENTS_OUT),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PaymentOut))

      // Update local cache
      localStorage.setItem(PAYMENTS_OUT_KEY, JSON.stringify(payments))

      return payments
    } catch (error) {
      console.error('[PaymentOut] Firebase fetch failed:', error)
    }
  }

  // Fallback to localStorage
  return getPaymentsOutFromLocalStorage()
}

/**
 * Delete a Payment Out record
 */
export async function deletePaymentOut(id: string): Promise<boolean> {
  // Remove from localStorage
  const payments = getPaymentsOutFromLocalStorage()
  const filtered = payments.filter(p => p.id !== id)
  localStorage.setItem(PAYMENTS_OUT_KEY, JSON.stringify(filtered))

  // Delete from Firebase if available
  if (isFirebaseReady() && db && !id.startsWith('POUT_')) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PAYMENTS_OUT, id))
      console.log('[PaymentOut] Deleted from Firebase:', id)
    } catch (error) {
      console.error('[PaymentOut] Firebase delete failed:', error)
    }
  }

  return true
}

function getPaymentsOutFromLocalStorage(): PaymentOut[] {
  try {
    const stored = localStorage.getItem(PAYMENTS_OUT_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}
