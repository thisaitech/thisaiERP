// Payment Service
// Handle payment recording and tracking
// OFFLINE-FIRST: Always save locally first, sync silently when online

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import { createPaymentLedgerEntry } from './ledgerService'
import {
  saveToOffline,
  getAllFromOffline,
  getFromOffline,
  deleteFromOffline,
  addToSyncQueue,
  isDeviceOnline,
  STORES
} from './offlineSyncService'

const LOCAL_STORAGE_KEY = 'thisai_crm_payments'

// Helper to generate offline-safe ID
const generateOfflineId = () => `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Check if ID is offline-generated
const isOfflineId = (id: string) => id.startsWith('payment_') || id.startsWith('payment-') || id.startsWith('offline_')

/**
 * Helper function to deeply remove undefined values from an object
 */
function removeUndefinedDeep(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedDeep(item))
  }

  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedDeep(value)
      }
    }
    return cleaned
  }

  return obj
}

export interface Payment {
  id: string
  invoiceId: string
  invoiceNumber: string
  invoiceType?: 'sale' | 'purchase'  // Added for ledger tracking
  partyId: string
  partyName: string
  amount: number
  paymentMode: 'cash' | 'bank' | 'upi' | 'card' | 'cheque'
  paymentDate: string
  reference?: string
  notes?: string
  createdAt: string
  createdBy: string
}

export interface PaymentInput {
  invoiceId: string
  invoiceNumber: string
  invoiceType?: 'sale' | 'purchase'  // Added for ledger tracking
  partyId: string
  partyName: string
  amount: number
  paymentMode: 'cash' | 'bank' | 'upi' | 'card' | 'cheque'
  paymentDate: string
  reference?: string
  notes?: string
}

/**
 * Record a payment against an invoice - OFFLINE FIRST
 * Also creates ledger entry for the party
 */
export async function recordPayment(paymentData: PaymentInput): Promise<Payment | null> {
  console.log('[recordPayment] Starting offline-first creation...')
  console.log('🔧 Firebase ready:', isFirebaseReady())
  console.log('🌐 Device online:', isDeviceOnline())

  const now = new Date().toISOString()
  const id = generateOfflineId()

  // Deep clean undefined values
  const cleanData = removeUndefinedDeep(paymentData)

  const newPayment: Payment = {
    ...cleanData,
    id,
    createdAt: now,
    createdBy: 'Current User',
    _pendingSync: !isDeviceOnline(),
    _savedAt: now,
    _syncedAt: null
  } as Payment

  // STEP 1: Always save locally first
  try {
    await saveToOffline(STORES.PAYMENTS, newPayment)
    // Also save to localStorage for backward compatibility
    const payments = getPaymentsFromLocalStorage()
    payments.push(newPayment)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payments))
    console.log('[recordPayment] ✅ Payment saved locally:', id)
  } catch (error) {
    console.error('[recordPayment] Failed to save locally:', error)
    // Fallback to localStorage only
    const payments = getPaymentsFromLocalStorage()
    payments.push(newPayment)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payments))
  }

  // Update invoice payment status locally (including payment mode)
  console.log('[recordPayment] Updating invoice payment status locally...')
  await updateInvoicePaymentInLocalStorage(paymentData.invoiceId, paymentData.amount, paymentData.paymentMode)

  // Create ledger entry for payment (works offline)
  if (paymentData.invoiceType && paymentData.partyId && paymentData.partyName) {
    console.log('[recordPayment] Creating ledger entry...')
    await createPaymentLedgerEntry(
      paymentData.partyId,
      paymentData.partyName,
      paymentData.paymentDate,
      paymentData.amount,
      paymentData.reference || paymentData.invoiceNumber,
      paymentData.invoiceType
    )
    console.log(`[recordPayment] ✅ Ledger entry created for payment to ${paymentData.partyName}`)
  }

  // STEP 2: If online, sync to Firebase silently
  if (isDeviceOnline() && isFirebaseReady()) {
    try {
      const serverData = removeUndefinedDeep({
        ...paymentData,
        createdAt: now,
        createdBy: 'Current User'
      })

      const docRef = await addDoc(collection(db!, COLLECTIONS.INVOICES + '_payments'), serverData)

      // Update local payment with Firebase ID
      const syncedPayment: Payment = {
        ...newPayment,
        id: docRef.id,
        _pendingSync: false,
        _syncedAt: now
      } as Payment

      // Remove old offline ID record and save with new Firebase ID
      await deleteFromOffline(STORES.PAYMENTS, id)
      await saveToOffline(STORES.PAYMENTS, syncedPayment)

      // Update localStorage too
      const payments = getPaymentsFromLocalStorage()
      const filteredPayments = payments.filter(p => p.id !== id)
      filteredPayments.push(syncedPayment)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredPayments))

      // Update Firebase invoice status
      await updateInvoicePaymentStatus(paymentData.invoiceId, paymentData.amount, paymentData.paymentMode)

      console.log('[recordPayment] ✅ Synced to Firebase:', docRef.id)
      return syncedPayment
    } catch (error) {
      console.warn('[recordPayment] Firebase sync failed, queuing for later:', error)
      await addToSyncQueue('create', STORES.PAYMENTS, newPayment)
    }
  } else {
    console.log('[recordPayment] 📱 Offline mode - queuing for sync')
    await addToSyncQueue('create', STORES.PAYMENTS, newPayment)
  }

  return newPayment
}

/**
 * Get all payments for an invoice - OFFLINE FIRST
 */
export async function getInvoicePayments(invoiceId: string): Promise<Payment[]> {
  console.log('📥 getInvoicePayments called for invoice:', invoiceId)

  // STEP 1: Always try IndexedDB first
  let localPayments: Payment[] = []
  try {
    const allPayments = await getAllFromOffline<Payment>(STORES.PAYMENTS)
    localPayments = allPayments.filter(p => p.invoiceId === invoiceId)
    // Sort by paymentDate descending
    localPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  } catch (error) {
    console.warn('IndexedDB read failed, trying localStorage:', error)
    localPayments = getInvoicePaymentsFromLocalStorage(invoiceId)
  }

  // STEP 2: If offline or Firebase not ready, return local data immediately
  if (!isDeviceOnline() || !isFirebaseReady()) {
    console.log('📱 Offline mode: Returning', localPayments.length, 'payments from local storage')
    return localPayments
  }

  // STEP 3: If online, try to fetch from Firebase and merge
  try {
    const q = query(
      collection(db!, COLLECTIONS.INVOICES + '_payments'),
      where('invoiceId', '==', invoiceId),
      orderBy('paymentDate', 'desc')
    )

    const snapshot = await getDocs(q)
    const serverPayments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Payment))

    // Merge: Keep local-only items (offline created, not yet synced)
    const localOnlyPayments = localPayments.filter(p => isOfflineId(p.id))
    const mergedPayments = [...serverPayments, ...localOnlyPayments]

    // Update local cache with server data (in background)
    for (const payment of serverPayments) {
      saveToOffline(STORES.PAYMENTS, payment).catch(() => {})
    }

    console.log('☁️ Retrieved from Firebase:', serverPayments.length, 'payments, merged with', localOnlyPayments.length, 'local')
    return mergedPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  } catch (error) {
    console.warn('Firebase fetch failed, returning local data:', error)
    return localPayments
  }
}

/**
 * Update invoice payment status after payment
 * Includes overpayment protection
 */
async function updateInvoicePaymentStatus(invoiceId: string, paidAmount: number, paymentMode?: string) {
  try {
    const invoiceRef = doc(db!, COLLECTIONS.INVOICES, invoiceId)
    const invoiceSnap = await getDoc(invoiceRef)

    if (invoiceSnap.exists()) {
      const invoice = invoiceSnap.data()
      // Check both nested payment.paidAmount and top-level paidAmount
      // Round to 2 decimal places to avoid floating-point precision issues
      const currentPaid = Math.round((invoice.payment?.paidAmount || invoice.paidAmount || 0) * 100) / 100
      const grandTotal = Math.round((invoice.grandTotal || invoice.total || 0) * 100) / 100
      const roundedPaidAmount = Math.round(paidAmount * 100) / 100
      const totalPaid = Math.round((currentPaid + roundedPaidAmount) * 100) / 100

      // Double-check: prevent overpayment (safety net)
      // Use a tolerance of 2 rupees for rounding errors in tax calculations
      if (totalPaid > grandTotal + 2) {
        throw new Error(`Overpayment detected! Current: ₹${currentPaid.toFixed(2)}, Adding: ₹${roundedPaidAmount.toFixed(2)}, Total would be: ₹${totalPaid.toFixed(2)}, but invoice is only ₹${grandTotal.toFixed(2)}`)
      }

      let status: 'paid' | 'partial' | 'pending' = 'pending'

      if (totalPaid >= grandTotal) {
        status = 'paid'
      } else if (totalPaid > 0) {
        status = 'partial'
      }

      const updateData: any = {
        // Update nested payment object
        'payment.paidAmount': totalPaid,
        'payment.status': status,
        'payment.lastPaymentDate': new Date().toISOString(),
        // Also update top-level fields for consistency
        'paidAmount': totalPaid,
        'paymentStatus': status
      }

      // Also update the payment mode if provided
      if (paymentMode) {
        updateData['payment.mode'] = paymentMode
        updateData['paymentMode'] = paymentMode
      }

      await updateDoc(invoiceRef, updateData)
    }
  } catch (error) {
    console.error('Error updating invoice payment status:', error)
    throw error // Re-throw to prevent payment record creation
  }
}

/**
 * LOCAL STORAGE IMPLEMENTATIONS
 */

async function recordPaymentToLocalStorage(paymentData: PaymentInput): Promise<Payment> {
  console.log('💾 Recording payment to localStorage...')

  const payments = getPaymentsFromLocalStorage()

  const payment: Payment = {
    id: `payment-${Date.now()}`,
    ...paymentData,
    createdAt: new Date().toISOString(),
    createdBy: 'Current User'
  }

  payments.push(payment)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payments))
  console.log('✅ Payment saved to localStorage')

  // Update invoice in local storage (including payment mode)
  console.log('🔄 Updating invoice in localStorage...')
  await updateInvoicePaymentInLocalStorage(paymentData.invoiceId, paymentData.amount, paymentData.paymentMode)
  console.log('✅ Invoice updated in localStorage')

  // Create ledger entry for payment
  if (paymentData.invoiceType && paymentData.partyId && paymentData.partyName) {
    console.log('📒 Creating ledger entry...')
    await createPaymentLedgerEntry(
      paymentData.partyId,
      paymentData.partyName,
      paymentData.paymentDate,
      paymentData.amount,
      paymentData.reference || paymentData.invoiceNumber,
      paymentData.invoiceType
    )
    console.log('✅ Ledger entry created')
  }

  return payment
}

function getPaymentsFromLocalStorage(): Payment[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading payments from local storage:', error)
    return []
  }
}

function getInvoicePaymentsFromLocalStorage(invoiceId: string): Payment[] {
  const allPayments = getPaymentsFromLocalStorage()
  return allPayments
    .filter(p => p.invoiceId === invoiceId)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
}

async function updateInvoicePaymentInLocalStorage(invoiceId: string, paidAmount: number, paymentMode?: string) {
  try {
    // STEP 1: Try to get fresh invoice data from IndexedDB first (most up-to-date)
    let invoice: any = null
    try {
      invoice = await getFromOffline(STORES.INVOICES, invoiceId)
      console.log('[updateInvoicePaymentInLocalStorage] Got invoice from IndexedDB:', invoiceId)
    } catch (e) {
      console.log('[updateInvoicePaymentInLocalStorage] IndexedDB fetch failed, trying localStorage')
    }

    // STEP 2: Fall back to localStorage if IndexedDB doesn't have it
    const stored = localStorage.getItem('thisai_crm_invoices')
    let invoices: any[] = stored ? JSON.parse(stored) : []
    const invoiceIndex = invoices.findIndex((inv: any) => inv.id === invoiceId)

    // If we got fresh data from IndexedDB, use its grandTotal for validation
    // Otherwise fall back to localStorage data
    if (!invoice && invoiceIndex !== -1) {
      invoice = invoices[invoiceIndex]
    }

    if (!invoice) {
      console.warn('[updateInvoicePaymentInLocalStorage] Invoice not found:', invoiceId)
      return
    }

    // Check both nested payment.paidAmount and top-level paidAmount
    // Round to 2 decimal places to avoid floating-point precision issues
    const currentPaid = Math.round((invoice.payment?.paidAmount || invoice.paidAmount || 0) * 100) / 100
    const grandTotal = Math.round((invoice.grandTotal || invoice.total || 0) * 100) / 100
    const roundedPaidAmount = Math.round(paidAmount * 100) / 100
    const totalPaid = Math.round((currentPaid + roundedPaidAmount) * 100) / 100

    console.log('[updateInvoicePaymentInLocalStorage] Payment validation:', {
      invoiceId,
      currentPaid,
      adding: roundedPaidAmount,
      totalPaid,
      grandTotal
    })

    // Double-check: prevent overpayment (safety net)
    // Use a tolerance of 2 rupees for rounding errors in tax calculations
    // This allows for minor floating-point discrepancies while still preventing actual overpayments
    if (totalPaid > grandTotal + 2) {
      throw new Error(`Overpayment detected! Current: ₹${currentPaid.toFixed(2)}, Adding: ₹${roundedPaidAmount.toFixed(2)}, Total would be: ₹${totalPaid.toFixed(2)}, but invoice is only ₹${grandTotal.toFixed(2)}`)
    }

    let status: 'paid' | 'partial' | 'pending' = 'pending'

    if (totalPaid >= grandTotal) {
      status = 'paid'
    } else if (totalPaid > 0) {
      status = 'partial'
    }

    // Update localStorage if the invoice exists there
    if (invoiceIndex !== -1) {
      // Update nested payment object
      invoices[invoiceIndex].payment = {
        ...invoices[invoiceIndex].payment,
        paidAmount: totalPaid,
        status: status,
        lastPaymentDate: new Date().toISOString(),
        // Update payment mode if provided
        ...(paymentMode && { mode: paymentMode })
      }

      // Also update top-level fields for consistency
      invoices[invoiceIndex].paidAmount = totalPaid
      invoices[invoiceIndex].paymentStatus = status
      // Also sync the grandTotal from IndexedDB to localStorage
      if (invoice.grandTotal) {
        invoices[invoiceIndex].grandTotal = invoice.grandTotal
        invoices[invoiceIndex].total = invoice.grandTotal
      }
      if (paymentMode) {
        invoices[invoiceIndex].paymentMode = paymentMode
      }

      localStorage.setItem('thisai_crm_invoices', JSON.stringify(invoices))
    }

    // Also update IndexedDB with the new payment status
    try {
      const updatedInvoice = {
        ...invoice,
        paidAmount: totalPaid,
        paymentStatus: status,
        payment: {
          ...invoice.payment,
          paidAmount: totalPaid,
          status: status,
          lastPaymentDate: new Date().toISOString(),
          ...(paymentMode && { mode: paymentMode })
        }
      }
      await saveToOffline(STORES.INVOICES, updatedInvoice)
    } catch (e) {
      console.warn('[updateInvoicePaymentInLocalStorage] Failed to update IndexedDB:', e)
    }
  } catch (error) {
    console.error('Error updating invoice payment in local storage:', error)
    throw error // Re-throw to prevent payment record creation
  }
}

/**
 * Delete/reverse a payment - OFFLINE FIRST
 * Also updates invoice payment status
 */
export async function deletePayment(paymentId: string, invoiceId: string): Promise<boolean> {
  console.log('[deletePayment] Starting offline-first deletion for:', paymentId)

  // STEP 1: Get payment details first (for amount to reverse)
  let paymentToDelete: Payment | null = null
  try {
    paymentToDelete = await getFromOffline<Payment>(STORES.PAYMENTS, paymentId)
  } catch (error) {
    const allPayments = getPaymentsFromLocalStorage()
    paymentToDelete = allPayments.find(p => p.id === paymentId) || null
  }

  // STEP 2: Delete from local storage first
  try {
    await deleteFromOffline(STORES.PAYMENTS, paymentId)
    // Also delete from localStorage
    const payments = getPaymentsFromLocalStorage()
    const filteredPayments = payments.filter(p => p.id !== paymentId)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredPayments))
    console.log('[deletePayment] ✅ Deleted locally:', paymentId)
  } catch (error) {
    console.error('[deletePayment] Local delete failed:', error)
    // Try localStorage only
    const payments = getPaymentsFromLocalStorage()
    const filteredPayments = payments.filter(p => p.id !== paymentId)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredPayments))
  }

  // Recalculate invoice payment status locally
  recalculateInvoicePaymentInLocalStorage(invoiceId)
  console.log('[deletePayment] ✅ Invoice status recalculated locally')

  // Reverse the cash/bank balance update
  if (paymentToDelete && paymentToDelete.paymentMode === 'cash') {
    try {
      const bankingData = localStorage.getItem('bankingAccounts')
      if (bankingData) {
        const accounts = JSON.parse(bankingData)
        const newCashBalance = (accounts.cashInHand?.balance || 0) - paymentToDelete.amount
        accounts.cashInHand = { balance: Math.max(0, newCashBalance) }
        localStorage.setItem('bankingAccounts', JSON.stringify(accounts))
        console.log('[deletePayment] 💰 Cash in Hand reversed: -₹', paymentToDelete.amount)
      }
    } catch (error) {
      console.error('[deletePayment] Error reversing cash balance:', error)
    }
  }

  // STEP 3: If online and has Firebase ID, sync deletion
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(paymentId)) {
    try {
      const paymentRef = doc(db!, COLLECTIONS.INVOICES + '_payments', paymentId)
      await deleteDoc(paymentRef)
      console.log('[deletePayment] ✅ Deleted from Firebase:', paymentId)

      // Recalculate Firebase invoice status
      await recalculateInvoicePaymentStatus(invoiceId)
      console.log('[deletePayment] ✅ Firebase invoice status recalculated')
    } catch (error) {
      console.warn('[deletePayment] Firebase delete failed, queuing:', error)
      await addToSyncQueue('delete', STORES.PAYMENTS, { id: paymentId, invoiceId })
    }
  } else if (!isOfflineId(paymentId)) {
    // Queue for sync if has Firebase ID but currently offline
    await addToSyncQueue('delete', STORES.PAYMENTS, { id: paymentId, invoiceId })
  }

  return true
}

// Legacy function preserved for backward compatibility
async function deletePaymentLegacy(paymentId: string, invoiceId: string): Promise<boolean> {
  console.log('🔄 deletePayment (legacy) called for:', paymentId)

  if (!isFirebaseReady()) {
    console.log('📱 Using localStorage for payment deletion')
    return deletePaymentFromLocalStorage(paymentId, invoiceId)
  }

  try {
    // Get payment details first (for amount to reverse)
    const paymentRef = doc(db!, COLLECTIONS.INVOICES + '_payments', paymentId)
    const paymentSnap = await getDoc(paymentRef)

    if (!paymentSnap.exists()) {
      console.error('Payment not found in Firebase:', paymentId)
      return false
    }

    const paymentData = paymentSnap.data()
    const amountToReverse = paymentData.amount || 0

    // Delete the payment document
    await deleteDoc(paymentRef)
    console.log('✅ Payment deleted from Firebase')

    // Recalculate invoice payment status
    await recalculateInvoicePaymentStatus(invoiceId)
    console.log('✅ Invoice status recalculated')

    return true
  } catch (error) {
    console.error('❌ Error deleting payment:', error)
    return false
  }
}

/**
 * Recalculate invoice payment status from Firebase payments
 */
async function recalculateInvoicePaymentStatus(invoiceId: string) {
  try {
    const invoiceRef = doc(db!, COLLECTIONS.INVOICES, invoiceId)
    const invoiceSnap = await getDoc(invoiceRef)

    if (!invoiceSnap.exists()) {
      console.error('Invoice not found:', invoiceId)
      return
    }

    const invoice = invoiceSnap.data()
    const grandTotal = invoice.grandTotal || invoice.total || 0

    // Get all remaining payments for this invoice
    const q = query(
      collection(db!, COLLECTIONS.INVOICES + '_payments'),
      where('invoiceId', '==', invoiceId)
    )
    const paymentsSnap = await getDocs(q)
    const totalPaid = paymentsSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0)

    let status: 'paid' | 'partial' | 'pending' = 'pending'
    if (totalPaid >= grandTotal) {
      status = 'paid'
    } else if (totalPaid > 0) {
      status = 'partial'
    }

    await updateDoc(invoiceRef, {
      'payment.paidAmount': totalPaid,
      'payment.status': status,
      'payment.lastPaymentDate': paymentsSnap.docs.length > 0
        ? paymentsSnap.docs[0].data().paymentDate
        : null,
      // Also update top-level fields for compatibility
      paidAmount: totalPaid,
      paymentStatus: status,
      dueAmount: grandTotal - totalPaid
    })

    console.log(`✅ Invoice ${invoiceId} status updated: ${status}, paid: ₹${totalPaid}`)
  } catch (error) {
    console.error('Error recalculating invoice payment status:', error)
    throw error
  }
}

/**
 * Delete payment from localStorage and recalculate invoice status
 */
function deletePaymentFromLocalStorage(paymentId: string, invoiceId: string): boolean {
  try {
    console.log('💾 Deleting payment from localStorage...')

    // Get the payment to know the amount being reversed
    const payments = getPaymentsFromLocalStorage()
    const paymentToDelete = payments.find(p => p.id === paymentId)

    if (!paymentToDelete) {
      console.error('Payment not found:', paymentId)
      return false
    }

    const amountToReverse = paymentToDelete.amount
    const paymentMode = paymentToDelete.paymentMode

    // Remove payment from payments list
    const updatedPayments = payments.filter(p => p.id !== paymentId)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPayments))
    console.log('✅ Payment removed from localStorage')

    // Recalculate invoice payment status
    recalculateInvoicePaymentInLocalStorage(invoiceId)
    console.log('✅ Invoice status recalculated')

    // Reverse the cash/bank balance update
    try {
      const bankingData = localStorage.getItem('bankingAccounts')
      if (bankingData && paymentMode === 'cash') {
        const accounts = JSON.parse(bankingData)
        const newCashBalance = (accounts.cashInHand?.balance || 0) - amountToReverse
        accounts.cashInHand = { balance: Math.max(0, newCashBalance) }
        localStorage.setItem('bankingAccounts', JSON.stringify(accounts))
        console.log('💰 Cash in Hand reversed: -₹', amountToReverse)
      }
    } catch (error) {
      console.error('Error reversing cash balance:', error)
    }

    return true
  } catch (error) {
    console.error('Error deleting payment from localStorage:', error)
    return false
  }
}

/**
 * Recalculate invoice payment status based on remaining payments
 */
function recalculateInvoicePaymentInLocalStorage(invoiceId: string) {
  try {
    const stored = localStorage.getItem('thisai_crm_invoices')
    if (!stored) return

    const invoices = JSON.parse(stored)
    const invoiceIndex = invoices.findIndex((inv: any) => inv.id === invoiceId)

    if (invoiceIndex !== -1) {
      const invoice = invoices[invoiceIndex]
      const grandTotal = invoice.grandTotal || invoice.total || 0

      // Get all remaining payments for this invoice
      const remainingPayments = getInvoicePaymentsFromLocalStorage(invoiceId)
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0)

      let status: 'paid' | 'partial' | 'pending' = 'pending'

      if (totalPaid >= grandTotal) {
        status = 'paid'
      } else if (totalPaid > 0) {
        status = 'partial'
      }

      invoices[invoiceIndex].payment = {
        ...invoice.payment,
        paidAmount: totalPaid,
        status: status,
        lastPaymentDate: remainingPayments.length > 0
          ? remainingPayments[0].paymentDate
          : null
      }

      // Also update top-level fields for compatibility
      invoices[invoiceIndex].paidAmount = totalPaid
      invoices[invoiceIndex].paymentStatus = status
      invoices[invoiceIndex].dueAmount = grandTotal - totalPaid

      localStorage.setItem('thisai_crm_invoices', JSON.stringify(invoices))
    }
  } catch (error) {
    console.error('Error recalculating invoice payment:', error)
  }
}

/**
 * Get payment summary for dashboard
 */
export function getPaymentSummary(payments: Payment[]) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0)

  const byMode = payments.reduce((acc, p) => {
    acc[p.paymentMode] = (acc[p.paymentMode] || 0) + p.amount
    return acc
  }, {} as Record<string, number>)

  return {
    total,
    count: payments.length,
    byMode
  }
}
