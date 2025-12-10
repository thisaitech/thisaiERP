// Ledger Service
// Manages party ledger entries - tracks all financial transactions with customers/suppliers

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import { getPartySettings } from './settingsService'

const LOCAL_STORAGE_KEY = 'thisai_crm_ledger_entries'

export interface LedgerEntry {
  id: string
  partyId: string
  partyName: string
  date: string
  type: 'invoice' | 'payment' | 'opening_balance' | 'adjustment'
  referenceType: 'sale' | 'purchase' | 'payment' | 'opening' | 'adjustment'
  referenceNumber: string
  description: string
  debit: number  // Money customer owes us (sales) or we pay supplier
  credit: number // Money we receive from customer or owe supplier (purchases)
  balance: number // Running balance
  createdAt: string
}

export interface LedgerEntryInput {
  partyId: string
  partyName: string
  date: string
  type: 'invoice' | 'payment' | 'opening_balance' | 'adjustment'
  referenceType: 'sale' | 'purchase' | 'payment' | 'opening' | 'adjustment'
  referenceNumber: string
  description: string
  debit: number
  credit: number
}

/**
 * Create ledger entry for invoice
 * Only creates entry if trackLedgerAutomatically is enabled in Party Settings
 */
export async function createInvoiceLedgerEntry(
  partyId: string,
  partyName: string,
  invoiceNumber: string,
  invoiceDate: string,
  amount: number,
  type: 'sale' | 'purchase'
): Promise<void> {
  // Check if automatic ledger tracking is enabled
  const partySettings = getPartySettings()
  if (!partySettings.trackLedgerAutomatically) {
    console.log(`Ledger tracking disabled - skipping entry for invoice ${invoiceNumber}`)
    return
  }

  try {
    const entry: LedgerEntryInput = {
      partyId,
      partyName,
      date: invoiceDate,
      type: 'invoice',
      referenceType: type,
      referenceNumber: invoiceNumber,
      description: type === 'sale'
        ? `Sales Invoice ${invoiceNumber}`
        : `Purchase Invoice ${invoiceNumber}`,
      debit: type === 'sale' ? amount : 0,  // Customer owes us
      credit: type === 'purchase' ? amount : 0  // We owe supplier
    }

    await createLedgerEntry(entry)
    console.log(`Ledger entry created: ${type} invoice ${invoiceNumber} for ${partyName}`)
  } catch (error) {
    console.error('Error creating invoice ledger entry:', error)
  }
}

/**
 * Create ledger entry for payment
 * Only creates entry if trackLedgerAutomatically is enabled in Party Settings
 */
export async function createPaymentLedgerEntry(
  partyId: string,
  partyName: string,
  paymentDate: string,
  amount: number,
  paymentReference: string,
  type: 'sale' | 'purchase'
): Promise<void> {
  // Check if automatic ledger tracking is enabled
  const partySettings = getPartySettings()
  if (!partySettings.trackLedgerAutomatically) {
    console.log(`Ledger tracking disabled - skipping entry for payment ${paymentReference}`)
    return
  }

  try {
    const entry: LedgerEntryInput = {
      partyId,
      partyName,
      date: paymentDate,
      type: 'payment',
      referenceType: 'payment',
      referenceNumber: paymentReference,
      description: type === 'sale'
        ? `Payment Received - ${paymentReference}`
        : `Payment Made - ${paymentReference}`,
      debit: type === 'purchase' ? amount : 0,  // We pay supplier (reduces liability)
      credit: type === 'sale' ? amount : 0  // We receive from customer (reduces receivable)
    }

    await createLedgerEntry(entry)
    console.log(`Ledger entry created: Payment ${paymentReference} for ${partyName}`)
  } catch (error) {
    console.error('Error creating payment ledger entry:', error)
  }
}

/**
 * Create a ledger entry and calculate running balance
 */
async function createLedgerEntry(entryInput: LedgerEntryInput): Promise<void> {
  // Get current balance for this party
  const existingEntries = await getPartyLedger(entryInput.partyId)
  const lastBalance = existingEntries.length > 0
    ? existingEntries[existingEntries.length - 1].balance
    : 0

  // Calculate new balance
  // Debit increases balance (customer owes more or we pay supplier)
  // Credit decreases balance (we receive payment or purchase from supplier)
  const newBalance = lastBalance + entryInput.debit - entryInput.credit

  const entry: Omit<LedgerEntry, 'id'> = {
    ...entryInput,
    balance: newBalance,
    createdAt: new Date().toISOString()
  }

  if (!isFirebaseReady()) {
    saveLedgerEntryToLocalStorage(entry)
    return
  }

  try {
    await addDoc(collection(db!, COLLECTIONS.PARTIES + '_ledger'), entry)
  } catch (error) {
    console.error('Error creating ledger entry:', error)
    // Fallback to local storage
    saveLedgerEntryToLocalStorage(entry)
  }
}

/**
 * Get all ledger entries for a party
 */
export async function getPartyLedger(partyId: string): Promise<LedgerEntry[]> {
  if (!isFirebaseReady()) {
    return getPartyLedgerFromLocalStorage(partyId)
  }

  try {
    const q = query(
      collection(db!, COLLECTIONS.PARTIES + '_ledger'),
      where('partyId', '==', partyId),
      orderBy('date', 'asc'),
      orderBy('createdAt', 'asc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LedgerEntry))
  } catch (error) {
    console.error('Error fetching party ledger:', error)
    return getPartyLedgerFromLocalStorage(partyId)
  }
}

/**
 * Get current balance for a party
 */
export async function getPartyBalance(partyId: string): Promise<number> {
  const ledger = await getPartyLedger(partyId)
  if (ledger.length === 0) return 0

  return ledger[ledger.length - 1].balance
}

/**
 * Get ledger summary for all parties
 */
export async function getLedgerSummary(): Promise<{
  totalReceivables: number  // Customers owe us
  totalPayables: number     // We owe suppliers
  netBalance: number
}> {
  if (!isFirebaseReady()) {
    return getLedgerSummaryFromLocalStorage()
  }

  try {
    const snapshot = await getDocs(collection(db!, COLLECTIONS.PARTIES + '_ledger'))
    const allEntries = snapshot.docs.map(doc => doc.data() as LedgerEntry)

    // Group by party and get latest balance
    const partyBalances = new Map<string, number>()

    allEntries.forEach(entry => {
      partyBalances.set(entry.partyId, entry.balance)
    })

    let totalReceivables = 0
    let totalPayables = 0

    partyBalances.forEach(balance => {
      if (balance > 0) {
        totalReceivables += balance  // Customers owe us
      } else {
        totalPayables += Math.abs(balance)  // We owe suppliers
      }
    })

    return {
      totalReceivables,
      totalPayables,
      netBalance: totalReceivables - totalPayables
    }
  } catch (error) {
    console.error('Error getting ledger summary:', error)
    return getLedgerSummaryFromLocalStorage()
  }
}

// ============================================
// LOCAL STORAGE FALLBACK
// ============================================

function saveLedgerEntryToLocalStorage(entry: Omit<LedgerEntry, 'id'>): void {
  try {
    const entries = getLedgerEntriesFromLocalStorage()
    const newEntry: LedgerEntry = {
      ...entry,
      id: `ledger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    entries.push(newEntry)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    console.error('Error saving ledger entry to local storage:', error)
  }
}

function getLedgerEntriesFromLocalStorage(): LedgerEntry[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading ledger entries from local storage:', error)
    return []
  }
}

function getPartyLedgerFromLocalStorage(partyId: string): LedgerEntry[] {
  const allEntries = getLedgerEntriesFromLocalStorage()
  return allEntries
    .filter(entry => entry.partyId === partyId)
    .sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCompare !== 0) return dateCompare
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
}

function getLedgerSummaryFromLocalStorage(): {
  totalReceivables: number
  totalPayables: number
  netBalance: number
} {
  const allEntries = getLedgerEntriesFromLocalStorage()

  const partyBalances = new Map<string, number>()
  allEntries.forEach(entry => {
    partyBalances.set(entry.partyId, entry.balance)
  })

  let totalReceivables = 0
  let totalPayables = 0

  partyBalances.forEach(balance => {
    if (balance > 0) {
      totalReceivables += balance
    } else {
      totalPayables += Math.abs(balance)
    }
  })

  return {
    totalReceivables,
    totalPayables,
    netBalance: totalReceivables - totalPayables
  }
}
