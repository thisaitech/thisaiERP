// Payment Allocation Service
// Handles auto/manual allocation of payments across invoices/purchases
// Vyapar/Zoho style implementation

import {
  collection,
  addDoc
} from 'firebase/firestore'
import { db, isFirebaseReady } from './firebase'
import { getInvoices, updateInvoice } from './invoiceService'
import { updatePartyBalance } from './partyService'
import { createPaymentLedgerEntry } from './ledgerService'

// ============================================
// TYPES & INTERFACES
// ============================================

export type PaymentType = 'IN' | 'OUT'
export type PartyType = 'CUSTOMER' | 'SUPPLIER'
export type AllocationMode = 'AUTO' | 'MANUAL'
export type PaymentStatus = 'ALLOCATED' | 'PARTIAL_ALLOCATED' | 'UNALLOCATED'
export type DocType = 'INVOICE' | 'PURCHASE'
export type DocStatus = 'UNPAID' | 'PARTIAL' | 'PAID'

export interface PaymentAllocation {
  id: string
  paymentId: string
  docType: DocType
  docId: string
  docNumber: string
  allocatedAmount: number
  createdAt: string
}

export interface AllocatedPayment {
  id: string
  type: PaymentType
  partyType: PartyType
  partyId: string
  partyName: string
  amount: number
  date: string
  mode: 'cash' | 'upi' | 'bank' | 'card' | 'cheque'
  referenceNo?: string
  notes?: string
  allocationMode: AllocationMode
  allocatedTotal: number
  unallocatedAmount: number
  advanceAmount: number // Amount stored as advance/credit
  status: PaymentStatus
  allocations: PaymentAllocation[]
  createdAt: string
  updatedAt: string
}

export interface PendingDocument {
  id: string
  docType: DocType
  docNumber: string
  date: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  status: DocStatus
  partyId: string
  partyName: string
}

export interface AllocationInput {
  docType: DocType
  docId: string
  docNumber: string
  amount: number
}

export interface CreatePaymentInput {
  type: PaymentType
  partyType: PartyType
  partyId: string
  partyName: string
  amount: number
  date: string
  mode: 'cash' | 'upi' | 'bank' | 'card' | 'cheque'
  referenceNo?: string
  notes?: string
  allocationMode: AllocationMode
  allocations?: AllocationInput[]
}

export interface PartyPaymentSummary {
  partyId: string
  partyName: string
  partyType: PartyType
  totalDue: number
  advanceBalance: number
  pendingDocs: PendingDocument[]
}

export interface AllocationResult {
  payment: AllocatedPayment
  updatedDocs: PendingDocument[]
  advanceCreated: number
}

// ============================================
// LOCAL STORAGE
// ============================================

const ALLOCATED_PAYMENTS_KEY = 'thisai_crm_allocated_payments'
const PAYMENT_ALLOCATIONS_KEY = 'thisai_crm_payment_allocations'
const PARTY_ADVANCES_KEY = 'thisai_crm_party_advances'

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

function getFromStorage<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

// ============================================
// PARTY ADVANCE/CREDIT MANAGEMENT
// ============================================

export interface PartyAdvance {
  partyId: string
  partyType: PartyType
  advanceAmount: number // Positive = advance paid, used for CUSTOMER_CREDIT or SUPPLIER_ADVANCE
  updatedAt: string
}

export function getPartyAdvance(partyId: string, partyType: PartyType): number {
  const advances = getFromStorage<PartyAdvance>(PARTY_ADVANCES_KEY)
  const advance = advances.find(a => a.partyId === partyId && a.partyType === partyType)
  return advance?.advanceAmount || 0
}

export function updatePartyAdvance(partyId: string, partyType: PartyType, amount: number): void {
  const advances = getFromStorage<PartyAdvance>(PARTY_ADVANCES_KEY)
  const existingIndex = advances.findIndex(a => a.partyId === partyId && a.partyType === partyType)

  if (existingIndex >= 0) {
    advances[existingIndex].advanceAmount += amount
    advances[existingIndex].updatedAt = new Date().toISOString()
  } else {
    advances.push({
      partyId,
      partyType,
      advanceAmount: amount,
      updatedAt: new Date().toISOString()
    })
  }

  saveToStorage(PARTY_ADVANCES_KEY, advances)
}

// ============================================
// GET PENDING DOCUMENTS FOR PARTY
// ============================================

export async function getPendingDocuments(
  partyId: string,
  partyType: PartyType,
  partyName?: string // Optional: pass party name for matching by name
): Promise<PendingDocument[]> {
  const docType: DocType = partyType === 'CUSTOMER' ? 'INVOICE' : 'PURCHASE'
  const invoiceType = partyType === 'CUSTOMER' ? 'sale' : 'purchase'

  try {
    // Get all invoices/purchases for this party
    const allInvoices = await getInvoices(invoiceType)

    // Get the party details to match by name if partyName not provided
    let partyNames: string[] = []
    if (partyName) {
      partyNames = [partyName.toLowerCase().trim()]
    } else {
      // Try to get party from partyService to get all name variations
      const { getPartyById } = await import('./partyService')
      const party = await getPartyById(partyId)
      if (party) {
        partyNames = [
          party.displayName?.toLowerCase().trim(),
          party.companyName?.toLowerCase().trim(),
          party.name?.toLowerCase().trim()
        ].filter(Boolean) as string[]
      }
    }

    console.log(`[getPendingDocuments] Party: ${partyId}, Names: [${partyNames.join(', ')}], Type: ${partyType}, Total invoices: ${allInvoices.length}`)

    // Filter for this party and unpaid/partial status
    // Note: payment.status can be 'unpaid' | 'partial' | 'paid' (from PaymentInfo type)
    // But paymentStatus can be 'pending' | 'partial' | 'paid' | 'overdue' | 'returned'
    // Some invoices may have 'pending' stored in payment.status even though type says 'unpaid'
    const partyInvoices = allInvoices.filter(inv => {
      // Cast to any for dynamic property access (invoices may have different shapes)
      const invoice = inv as any
      // Check if invoice belongs to this party - match by ID OR by name
      const matchesById = invoice.partyId === partyId || invoice.customerId === partyId || invoice.supplierId === partyId

      // Match by name (case-insensitive)
      let matchesByName = false
      if (partyNames.length > 0) {
        const invoicePartyName = (invoice.partyName || invoice.customerName || invoice.supplierName || '').toLowerCase().trim()
        matchesByName = partyNames.some(pn => pn === invoicePartyName)
      }

      if (!matchesById && !matchesByName) {
        return false
      }

      // Check payment status - consider unpaid if:
      // 1. payment.status is 'unpaid' or 'partial' (or 'pending' for legacy/mistyped data)
      // 2. OR paymentStatus is 'pending', 'partial', or 'overdue'
      // 3. OR no payment info exists (treat as unpaid)
      const paymentStatus = invoice.payment?.status
      const invoicePaymentStatus = invoice.paymentStatus

      // First check if invoice is marked as fully paid in EITHER field - exclude these
      // If payment.status is 'paid' OR paymentStatus is 'paid', consider it fully paid
      if (paymentStatus === 'paid' || invoicePaymentStatus === 'paid') {
        // Double check by looking at actual amounts
        const totalAmount = invoice.grandTotal || invoice.total || 0
        const paidAmount = invoice.payment?.paidAmount || invoice.paidAmount || 0
        const dueAmount = totalAmount - paidAmount
        // If due amount is 0 or negative, it's truly paid
        if (dueAmount <= 0) {
          return false
        }
        // If there's still due amount despite 'paid' status, include it (data inconsistency)
      }

      // Invoice is unpaid/partial if:
      // 1. payment.status is 'unpaid' or 'partial' (or 'pending' for legacy data)
      // 2. OR paymentStatus is 'pending', 'partial', or 'overdue'
      // 3. OR no payment info exists (treat as unpaid)
      const hasUnpaidPayment = !paymentStatus ||
                               paymentStatus === 'unpaid' ||
                               paymentStatus === 'partial' ||
                               paymentStatus === 'pending' // Handle legacy data

      const hasUnpaidInvoiceStatus = !invoicePaymentStatus ||
                                     invoicePaymentStatus === 'pending' ||
                                     invoicePaymentStatus === 'partial' ||
                                     invoicePaymentStatus === 'overdue'

      // Return true if either indicates unpaid status
      const isUnpaid = hasUnpaidPayment || hasUnpaidInvoiceStatus
      console.log(`[getPendingDocuments] Invoice ${invoice.invoiceNumber}: matchById=${matchesById}, matchByName=${matchesByName}, payment.status=${paymentStatus}, paymentStatus=${invoicePaymentStatus}, isUnpaid=${isUnpaid}`)
      return isUnpaid
    })

    // Convert to PendingDocument format
    const pendingDocs: PendingDocument[] = partyInvoices.map(inv => {
      const totalAmount = inv.grandTotal || inv.total || 0
      const paidAmount = inv.payment?.paidAmount || inv.paidAmount || 0
      const dueAmount = totalAmount - paidAmount

      let status: DocStatus = 'UNPAID'
      if (paidAmount > 0 && dueAmount > 0) status = 'PARTIAL'
      if (dueAmount <= 0) status = 'PAID'

      return {
        id: inv.id,
        docType,
        docNumber: inv.invoiceNumber,
        date: inv.invoiceDate,
        totalAmount,
        paidAmount,
        dueAmount: Math.max(0, dueAmount),
        status,
        partyId: inv.partyId,
        partyName: inv.partyName || inv.customerName || ''
      }
    })

    // Sort by date ascending (oldest first for FIFO)
    pendingDocs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Filter only docs with due amount > 0
    const result = pendingDocs.filter(doc => doc.dueAmount > 0)
    console.log(`[getPendingDocuments] Found ${partyInvoices.length} party invoices, ${result.length} with due > 0`)
    return result
  } catch (error) {
    console.error('[getPendingDocuments] Error:', error)
    return []
  }
}

// ============================================
// GET PARTY PAYMENT SUMMARY
// ============================================

export async function getPartyPaymentSummary(
  partyId: string,
  partyType: PartyType,
  partyDisplayName?: string // Optional: pass party name for matching by name
): Promise<PartyPaymentSummary> {
  const pendingDocs = await getPendingDocuments(partyId, partyType, partyDisplayName)
  const totalDue = pendingDocs.reduce((sum, doc) => sum + doc.dueAmount, 0)
  const advanceBalance = getPartyAdvance(partyId, partyType)

  // Get party name from first doc, or use provided name, or empty
  const resolvedPartyName = pendingDocs.length > 0
    ? pendingDocs[0].partyName
    : (partyDisplayName || '')

  return {
    partyId,
    partyName: resolvedPartyName,
    partyType,
    totalDue,
    advanceBalance,
    pendingDocs
  }
}

// ============================================
// AUTO ALLOCATION (FIFO)
// ============================================

export function calculateAutoAllocation(
  paymentAmount: number,
  pendingDocs: PendingDocument[]
): { allocations: AllocationInput[]; remaining: number } {
  const allocations: AllocationInput[] = []
  let remaining = Math.round(paymentAmount * 100) / 100 // Round to 2 decimal places

  // Sort by date ascending (FIFO - oldest first)
  const sortedDocs = [...pendingDocs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  for (const doc of sortedDocs) {
    if (remaining <= 0.001) break // Use small threshold for floating point
    if (doc.dueAmount <= 0) continue

    // Round to 2 decimal places to avoid floating point issues
    const allocAmount = Math.round(Math.min(remaining, doc.dueAmount) * 100) / 100

    allocations.push({
      docType: doc.docType,
      docId: doc.id,
      docNumber: doc.docNumber,
      amount: allocAmount
    })

    remaining = Math.round((remaining - allocAmount) * 100) / 100
  }

  return { allocations, remaining: Math.round(remaining * 100) / 100 }
}

// ============================================
// VALIDATE MANUAL ALLOCATION
// ============================================

export function validateManualAllocation(
  paymentAmount: number,
  allocations: AllocationInput[],
  pendingDocs: PendingDocument[]
): { valid: boolean; error?: string } {
  // Check each allocation
  for (const alloc of allocations) {
    if (alloc.amount <= 0) {
      return { valid: false, error: `Allocation amount must be greater than 0` }
    }

    const doc = pendingDocs.find(d => d.id === alloc.docId)
    if (!doc) {
      return { valid: false, error: `Document ${alloc.docNumber} not found` }
    }

    if (alloc.amount > doc.dueAmount + 0.01) { // Small tolerance for rounding
      return {
        valid: false,
        error: `Allocation for ${alloc.docNumber} (${alloc.amount}) exceeds due amount (${doc.dueAmount})`
      }
    }
  }

  // Check total allocation doesn't exceed payment
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0)
  if (totalAllocated > paymentAmount + 0.01) {
    return {
      valid: false,
      error: `Total allocation (${totalAllocated}) exceeds payment amount (${paymentAmount})`
    }
  }

  return { valid: true }
}

// ============================================
// CREATE PAYMENT WITH ALLOCATION
// ============================================

export async function createAllocatedPayment(
  input: CreatePaymentInput
): Promise<AllocationResult> {
  const now = new Date().toISOString()
  const paymentId = generateId(input.type === 'IN' ? 'PAYIN' : 'PAYOUT')

  // Get pending documents for this party
  const pendingDocs = await getPendingDocuments(input.partyId, input.partyType)

  // Determine allocations based on mode
  let allocations: AllocationInput[]
  let remaining: number

  if (input.allocationMode === 'AUTO') {
    const result = calculateAutoAllocation(input.amount, pendingDocs)
    allocations = result.allocations
    remaining = result.remaining
  } else {
    // Manual mode - use provided allocations
    allocations = input.allocations || []

    // Validate manual allocations
    const validation = validateManualAllocation(input.amount, allocations, pendingDocs)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0)
    remaining = input.amount - totalAllocated
  }

  // Calculate totals
  const allocatedTotal = allocations.reduce((sum, a) => sum + a.amount, 0)
  const advanceAmount = remaining

  // Determine payment status
  let status: PaymentStatus = 'UNALLOCATED'
  if (allocatedTotal > 0 && remaining > 0) status = 'PARTIAL_ALLOCATED'
  if (allocatedTotal > 0 && remaining <= 0) status = 'ALLOCATED'
  if (allocatedTotal === 0 && remaining > 0) status = 'UNALLOCATED'

  // Create payment allocations
  const paymentAllocations: PaymentAllocation[] = allocations.map(alloc => ({
    id: generateId('ALLOC'),
    paymentId,
    docType: alloc.docType,
    docId: alloc.docId,
    docNumber: alloc.docNumber,
    allocatedAmount: alloc.amount,
    createdAt: now
  }))

  // Create the payment record
  const payment: AllocatedPayment = {
    id: paymentId,
    type: input.type,
    partyType: input.partyType,
    partyId: input.partyId,
    partyName: input.partyName,
    amount: input.amount,
    date: input.date,
    mode: input.mode,
    referenceNo: input.referenceNo,
    notes: input.notes,
    allocationMode: input.allocationMode,
    allocatedTotal,
    unallocatedAmount: remaining,
    advanceAmount,
    status,
    allocations: paymentAllocations,
    createdAt: now,
    updatedAt: now
  }

  // Update documents with allocated amounts
  const updatedDocs: PendingDocument[] = []

  for (const alloc of allocations) {
    const doc = pendingDocs.find(d => d.id === alloc.docId)
    if (!doc) continue

    const newPaidAmount = doc.paidAmount + alloc.amount
    const newDueAmount = doc.totalAmount - newPaidAmount

    let newStatus: DocStatus = 'PARTIAL'
    if (newDueAmount <= 0.01) newStatus = 'PAID'
    if (newPaidAmount <= 0) newStatus = 'UNPAID'

    // Update the invoice/purchase in database
    try {
      await updateInvoice(alloc.docId, {
        payment: {
          mode: input.mode,
          status: newStatus === 'PAID' ? 'paid' : newStatus === 'PARTIAL' ? 'partial' : 'unpaid',
          paidAmount: newPaidAmount,
          dueAmount: Math.max(0, newDueAmount)
        },
        paidAmount: newPaidAmount,
        paymentStatus: newStatus === 'PAID' ? 'paid' : newStatus === 'PARTIAL' ? 'partial' : 'pending'
      })
    } catch (error) {
      console.error(`[createAllocatedPayment] Failed to update doc ${alloc.docId}:`, error)
    }

    updatedDocs.push({
      ...doc,
      paidAmount: newPaidAmount,
      dueAmount: Math.max(0, newDueAmount),
      status: newStatus
    })
  }

  // Store advance if any
  if (advanceAmount > 0) {
    updatePartyAdvance(input.partyId, input.partyType, advanceAmount)
  }

  // Update party balance
  try {
    // For Payment IN (from customer): reduce their outstanding (they owe less) → subtract
    // For Payment OUT (to supplier): reduce our payable (we owe less) → add (since supplier outstanding is negative)
    // Example: Customer owes +₹5000, pays ₹5000 → -5000 = ₹0 (settled)
    // Example: We owe supplier -₹5000, pay ₹5000 → +5000 = ₹0 (settled)
    const balanceChange = input.type === 'IN' ? -input.amount : +input.amount
    await updatePartyBalance(input.partyId, balanceChange)
  } catch (error) {
    console.error('[createAllocatedPayment] Failed to update party balance:', error)
  }

  // Create ledger entry
  try {
    const paymentRef = input.referenceNo || `PAY-${Date.now()}`
    await createPaymentLedgerEntry(
      input.partyId,
      input.partyName,
      input.date,
      input.amount,
      paymentRef,
      input.type === 'IN' ? 'sale' : 'purchase'
    )
  } catch (error) {
    console.error('[createAllocatedPayment] Failed to create ledger entry:', error)
  }

  // Save payment to local storage
  const payments = getFromStorage<AllocatedPayment>(ALLOCATED_PAYMENTS_KEY)
  payments.push(payment)
  saveToStorage(ALLOCATED_PAYMENTS_KEY, payments)

  // Save allocations to local storage
  const allAllocations = getFromStorage<PaymentAllocation>(PAYMENT_ALLOCATIONS_KEY)
  allAllocations.push(...paymentAllocations)
  saveToStorage(PAYMENT_ALLOCATIONS_KEY, allAllocations)

  // Sync to Firebase if available
  if (isFirebaseReady() && db) {
    try {
      // Save payment
      await addDoc(collection(db, 'allocated_payments'), {
        ...payment,
        allocations: paymentAllocations.map(a => ({ ...a }))
      })
      console.log('[createAllocatedPayment] Saved to Firebase')
    } catch (error) {
      console.error('[createAllocatedPayment] Firebase save failed:', error)
    }
  }

  return {
    payment,
    updatedDocs,
    advanceCreated: advanceAmount
  }
}

// ============================================
// GET ALLOCATED PAYMENTS
// ============================================

export async function getAllocatedPayments(
  type?: PaymentType,
  partyId?: string
): Promise<AllocatedPayment[]> {
  let payments = getFromStorage<AllocatedPayment>(ALLOCATED_PAYMENTS_KEY)

  if (type) {
    payments = payments.filter(p => p.type === type)
  }

  if (partyId) {
    payments = payments.filter(p => p.partyId === partyId)
  }

  // Sort by date descending
  payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return payments
}

// ============================================
// GET PAYMENT BY ID
// ============================================

export async function getAllocatedPaymentById(id: string): Promise<AllocatedPayment | null> {
  const payments = getFromStorage<AllocatedPayment>(ALLOCATED_PAYMENTS_KEY)
  return payments.find(p => p.id === id) || null
}

// ============================================
// USE ADVANCE FOR NEW INVOICE
// ============================================

export async function useAdvanceForInvoice(
  partyId: string,
  partyType: PartyType,
  invoiceId: string,
  invoiceNumber: string,
  amount: number
): Promise<{ success: boolean; usedAmount: number; error?: string }> {
  const availableAdvance = getPartyAdvance(partyId, partyType)

  if (availableAdvance <= 0) {
    return { success: false, usedAmount: 0, error: 'No advance balance available' }
  }

  const useAmount = Math.min(amount, availableAdvance)

  // Deduct from advance
  updatePartyAdvance(partyId, partyType, -useAmount)

  // Create allocation record
  const now = new Date().toISOString()
  const paymentId = generateId('ADV_USE')

  const allocation: PaymentAllocation = {
    id: generateId('ALLOC'),
    paymentId,
    docType: partyType === 'CUSTOMER' ? 'INVOICE' : 'PURCHASE',
    docId: invoiceId,
    docNumber: invoiceNumber,
    allocatedAmount: useAmount,
    createdAt: now
  }

  // Save allocation
  const allAllocations = getFromStorage<PaymentAllocation>(PAYMENT_ALLOCATIONS_KEY)
  allAllocations.push(allocation)
  saveToStorage(PAYMENT_ALLOCATIONS_KEY, allAllocations)

  // Update invoice
  try {
    const invoices = await getInvoices()
    const invoice = invoices.find(i => i.id === invoiceId)
    if (invoice) {
      const newPaidAmount = (invoice.payment?.paidAmount || 0) + useAmount
      const totalAmount = invoice.grandTotal || invoice.total || 0
      const newDueAmount = totalAmount - newPaidAmount

      await updateInvoice(invoiceId, {
        payment: {
          mode: 'credit',
          status: newDueAmount <= 0 ? 'paid' : 'partial',
          paidAmount: newPaidAmount,
          dueAmount: Math.max(0, newDueAmount)
        },
        paidAmount: newPaidAmount,
        paymentStatus: newDueAmount <= 0 ? 'paid' : 'partial'
      })
    }
  } catch (error) {
    console.error('[useAdvanceForInvoice] Failed to update invoice:', error)
  }

  return { success: true, usedAmount: useAmount }
}

// ============================================
// GET ALLOCATION HISTORY FOR DOCUMENT
// ============================================

export function getDocumentAllocations(docId: string): PaymentAllocation[] {
  const allocations = getFromStorage<PaymentAllocation>(PAYMENT_ALLOCATIONS_KEY)
  return allocations.filter(a => a.docId === docId)
}

// ============================================
// DELETE PAYMENT AND REVERSE ALLOCATIONS
// ============================================

export async function deleteAllocatedPayment(paymentId: string): Promise<boolean> {
  const payments = getFromStorage<AllocatedPayment>(ALLOCATED_PAYMENTS_KEY)
  const payment = payments.find(p => p.id === paymentId)

  if (!payment) {
    console.error('[deleteAllocatedPayment] Payment not found:', paymentId)
    return false
  }

  // Reverse allocations on invoices
  for (const alloc of payment.allocations) {
    try {
      const invoices = await getInvoices()
      const invoice = invoices.find(i => i.id === alloc.docId)
      if (invoice) {
        const newPaidAmount = Math.max(0, (invoice.payment?.paidAmount || 0) - alloc.allocatedAmount)
        const totalAmount = invoice.grandTotal || invoice.total || 0
        const newDueAmount = totalAmount - newPaidAmount

        await updateInvoice(alloc.docId, {
          payment: {
            mode: invoice.payment?.mode || 'cash',
            status: newPaidAmount <= 0 ? 'unpaid' : newDueAmount <= 0 ? 'paid' : 'partial',
            paidAmount: newPaidAmount,
            dueAmount: Math.max(0, newDueAmount)
          },
          paidAmount: newPaidAmount,
          paymentStatus: newPaidAmount <= 0 ? 'pending' : newDueAmount <= 0 ? 'paid' : 'partial'
        })
      }
    } catch (error) {
      console.error(`[deleteAllocatedPayment] Failed to reverse allocation for ${alloc.docId}:`, error)
    }
  }

  // Reverse advance if any
  if (payment.advanceAmount > 0) {
    updatePartyAdvance(payment.partyId, payment.partyType, -payment.advanceAmount)
  }

  // Reverse party balance
  // For Payment IN (from customer): we subtracted (-amount), so add back (+amount)
  // For Payment OUT (to supplier): we added (+amount), so subtract back (-amount)
  try {
    const balanceChange = payment.type === 'IN' ? +payment.amount : -payment.amount
    await updatePartyBalance(payment.partyId, balanceChange)
  } catch (error) {
    console.error('[deleteAllocatedPayment] Failed to reverse party balance:', error)
  }

  // Remove payment from storage
  const updatedPayments = payments.filter(p => p.id !== paymentId)
  saveToStorage(ALLOCATED_PAYMENTS_KEY, updatedPayments)

  // Remove allocations from storage
  const allocations = getFromStorage<PaymentAllocation>(PAYMENT_ALLOCATIONS_KEY)
  const updatedAllocations = allocations.filter(a => a.paymentId !== paymentId)
  saveToStorage(PAYMENT_ALLOCATIONS_KEY, updatedAllocations)

  return true
}
