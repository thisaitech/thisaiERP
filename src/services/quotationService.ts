// Quotation Service - Manage quotations/estimates
// FIRESTORE: All data stored in Firestore

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'

// Helper to clean data before saving
function cleanData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanData(item))
  }

  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanData(value)
      }
    }
    return cleaned
  }

  return obj
}

export interface QuotationItem {
  id: string
  description: string
  hsn?: string
  quantity: number
  unit: string
  rate: number
  amount: number
  taxRate: number
  tax: number
  discount?: number
}

export interface Quotation {
  id: string
  quotationNumber: string
  quotationDate: string
  validUntil: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'

  // Party details
  partyId: string
  partyName: string
  partyGSTIN?: string
  partyPhone?: string
  partyEmail?: string
  partyAddress?: string
  partyCity?: string
  partyState?: string
  partyStateCode?: string

  // Items
  items: QuotationItem[]

  // Totals
  subtotal: number
  discount: number
  taxAmount: number
  grandTotal: number

  // Additional
  notes?: string
  termsAndConditions?: string
  paymentTerms?: string

  // Tracking
  sentDate?: string
  acceptedDate?: string
  rejectedDate?: string
  convertedToInvoiceId?: string
  convertedDate?: string

  createdAt: string
  updatedAt: string
  createdBy: string
}

/**
 * Create quotation - FIRESTORE
 * Saves to Firestore database
 */
export async function createQuotation(
  quotation: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Quotation | null> {
  console.log('[createQuotation] Creating quotation in Firestore...')

  const now = new Date().toISOString()

  // Clean undefined values
  const cleanedData = cleanData(quotation)

  const quotationData = {
    ...cleanedData,
    createdAt: now,
    updatedAt: now
  }

  // Save to Firestore
  try {
    const docRef = await addDoc(
      collection(db, COLLECTIONS.QUOTATIONS),
      quotationData
    )

    const newQuotation: Quotation = {
      ...quotationData,
      id: docRef.id
    }

    console.log('[createQuotation] ✅ Quotation saved to Firestore:', docRef.id)
    return newQuotation
  } catch (error) {
    console.error('[createQuotation] Failed to save to Firestore:', error)
    throw error
  }
}

/**
 * Get all quotations - FIRESTORE
 * Returns from Firestore database
 */
export async function getQuotations(): Promise<Quotation[]> {
  console.log('📥 quotationService.getQuotations called')

  try {
    const q = query(
      collection(db, COLLECTIONS.QUOTATIONS),
      orderBy('quotationDate', 'desc')
    )

    const snapshot = await getDocs(q)
    const quotations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Quotation))

    console.log('✅ Retrieved', quotations.length, 'quotations from Firestore')
    return quotations
  } catch (error) {
    console.error('Failed to fetch quotations from Firestore:', error)
    throw error
  }
}

/**
 * Get single quotation by ID - FIRESTORE
 * Returns from Firestore database
 */
export async function getQuotationById(id: string): Promise<Quotation | null> {
  try {
    const docRef = doc(db, COLLECTIONS.QUOTATIONS, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Quotation
    }

    return null
  } catch (error) {
    console.error('Failed to fetch quotation from Firestore:', error)
    throw error
  }
}

/**
 * Update quotation - FIRESTORE
 * Updates in Firestore database
 */
export async function updateQuotation(
  id: string,
  updates: Partial<Quotation>
): Promise<boolean> {
  const now = new Date().toISOString()

  // Clean undefined values
  const cleanedUpdates = cleanData({
    ...updates,
    updatedAt: now
  })

  // Update in Firestore
  try {
    const docRef = doc(db, COLLECTIONS.QUOTATIONS, id)
    await updateDoc(docRef, cleanedUpdates)
    console.log('[updateQuotation] ✅ Updated in Firestore:', id)
    return true
  } catch (error) {
    console.error('[updateQuotation] Failed to update in Firestore:', error)
    throw error
  }
}

/**
 * Delete quotation - FIRESTORE
 * Deletes from Firestore database
 */
export async function deleteQuotation(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.QUOTATIONS, id))
    console.log('[deleteQuotation] ✅ Deleted from Firestore:', id)
    return true
  } catch (error) {
    console.error('[deleteQuotation] Failed to delete from Firestore:', error)
    throw error
  }
}

/**
 * Convert quotation to invoice
 */
export async function convertToInvoice(quotationId: string): Promise<any> {
  const quotations = await getQuotations()
  const quotation = quotations.find(q => q.id === quotationId)

  if (!quotation) {
    throw new Error('Quotation not found')
  }

  // Create invoice data from quotation
  const invoiceData = {
    type: 'sale' as const,
    quotationId: quotation.id,
    quotationNumber: quotation.quotationNumber,

    partyId: quotation.partyId,
    partyName: quotation.partyName,
    partyGSTIN: quotation.partyGSTIN,
    partyPhone: quotation.partyPhone,
    partyEmail: quotation.partyEmail,
    partyStateCode: quotation.partyStateCode,

    billingAddress: quotation.partyAddress || '',
    billingCity: quotation.partyCity || '',
    billingState: quotation.partyState || '',
    billingStateCode: quotation.partyStateCode || '',

    shippingAddress: quotation.partyAddress || '',
    shippingCity: quotation.partyCity || '',
    shippingState: quotation.partyState || '',
    shippingStateCode: quotation.partyStateCode || '',

    items: quotation.items,
    subtotal: quotation.subtotal,
    taxAmount: quotation.taxAmount,
    grandTotal: quotation.grandTotal,

    notes: quotation.notes,
    termsAndConditions: quotation.termsAndConditions
  }

  return invoiceData
}

/**
 * Generate quotation number
 */
export function generateQuotationNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `QUO-${year}${month}-${random}`
}
