// Expense Service - Track business expenses
// OFFLINE-FIRST: Always save locally first, sync silently when online

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  where
} from 'firebase/firestore'
import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import {
  saveToOffline,
  getAllFromOffline,
  getFromOffline,
  deleteFromOffline,
  addToSyncQueue,
  isDeviceOnline,
  STORES
} from './offlineSyncService'

const LOCAL_STORAGE_KEY = 'thisai_crm_expenses'

// Helper to generate offline-safe ID
const generateOfflineId = () => `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Check if ID is offline-generated
const isOfflineId = (id: string) => id.startsWith('expense_') || id.startsWith('exp_') || id.startsWith('offline_')

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

export interface Expense {
  id: string
  expenseNumber: string
  date: string
  category: 'rent' | 'salary' | 'utilities' | 'marketing' | 'office_supplies' | 'travel' | 'food' | 'internet' | 'software' | 'other'
  subcategory?: string
  amount: number
  paymentMode: 'cash' | 'bank' | 'card' | 'upi' | 'cheque'
  vendor?: string
  vendorGSTIN?: string
  description: string
  billNumber?: string
  billDate?: string
  gstAmount?: number
  status: 'pending' | 'paid' | 'reimbursed'
  reimbursableToEmployee?: string
  attachments?: string[]
  notes?: string
  createdAt: string
  createdBy: string
  // New fields for recurring expense logic
  isRecurring?: boolean // Is this a monthly recurring expense?
  recurringType?: 'monthly' | 'quarterly' | 'yearly' | 'one-time' // Type of recurrence
  monthlyAmount?: number // Full monthly amount (for proration calculation)
  dailyRate?: number // Daily rate (monthlyAmount ÷ 30)
}

/**
 * Create expense - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 */
export async function createExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<Expense | null> {
  console.log('[createExpense] Starting offline-first creation...')

  const now = new Date().toISOString()
  const id = generateOfflineId()

  // Deep clean undefined values
  const cleanData = removeUndefinedDeep(expense)

  const newExpense: Expense = {
    ...cleanData,
    id,
    createdAt: now,
    _pendingSync: !isDeviceOnline(),
    _savedAt: now,
    _syncedAt: null
  } as Expense

  // STEP 1: Always save locally first
  try {
    await saveToOffline(STORES.EXPENSES, newExpense)
    // Also save to localStorage for backward compatibility
    const expenses = getExpensesFromLocalStorage()
    expenses.push(newExpense)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses))
    console.log('[createExpense] ✅ Expense saved locally:', id)
  } catch (error) {
    console.error('[createExpense] Failed to save locally:', error)
    // Fallback to localStorage only
    const expenses = getExpensesFromLocalStorage()
    expenses.push(newExpense)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses))
  }

  // STEP 2: If online, sync to Firebase silently
  if (isDeviceOnline() && isFirebaseReady()) {
    try {
      const serverData = removeUndefinedDeep({
        ...expense,
        createdAt: now
      })

      const docRef = await addDoc(collection(db!, COLLECTIONS.EXPENSES || 'expenses'), serverData)

      // Update local expense with Firebase ID
      const syncedExpense: Expense = {
        ...newExpense,
        id: docRef.id,
        _pendingSync: false,
        _syncedAt: now
      } as Expense

      // Remove old offline ID record and save with new Firebase ID
      await deleteFromOffline(STORES.EXPENSES, id)
      await saveToOffline(STORES.EXPENSES, syncedExpense)

      // Update localStorage too
      const expenses = getExpensesFromLocalStorage()
      const filteredExpenses = expenses.filter(e => e.id !== id)
      filteredExpenses.push(syncedExpense)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredExpenses))

      console.log('[createExpense] ✅ Synced to Firebase:', docRef.id)
      return syncedExpense
    } catch (error) {
      console.warn('[createExpense] Firebase sync failed, queuing for later:', error)
      await addToSyncQueue('create', STORES.EXPENSES, newExpense)
    }
  } else {
    console.log('[createExpense] 📱 Offline mode - queuing for sync')
    await addToSyncQueue('create', STORES.EXPENSES, newExpense)
  }

  return newExpense
}

/**
 * Get all expenses
 * OFFLINE-FIRST: Returns from IndexedDB first, then syncs with Firebase in background
 */
export async function getExpenses(): Promise<Expense[]> {
  console.log('📥 expenseService.getExpenses called')

  // STEP 1: Always try IndexedDB first
  let localExpenses: Expense[] = []
  try {
    localExpenses = await getAllFromOffline<Expense>(STORES.EXPENSES)
    // Sort by date descending
    localExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (error) {
    console.warn('IndexedDB read failed, trying localStorage:', error)
    localExpenses = getExpensesFromLocalStorage()
  }

  // STEP 2: If offline or Firebase not ready, return local data immediately
  if (!isDeviceOnline() || !isFirebaseReady()) {
    console.log('📱 Offline mode: Returning', localExpenses.length, 'expenses from local storage')
    return localExpenses
  }

  // STEP 3: If online, try to fetch from Firebase and merge
  try {
    const q = query(
      collection(db!, COLLECTIONS.EXPENSES || 'expenses'),
      orderBy('date', 'desc')
    )

    const snapshot = await getDocs(q)
    const serverExpenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Expense))

    // Merge: Keep local-only items (offline created, not yet synced)
    const localOnlyExpenses = localExpenses.filter(e => isOfflineId(e.id))
    const mergedExpenses = [...serverExpenses, ...localOnlyExpenses]

    // Update local cache with server data (in background)
    for (const expense of serverExpenses) {
      saveToOffline(STORES.EXPENSES, expense).catch(() => {})
    }

    console.log('☁️ Retrieved from Firebase:', serverExpenses.length, 'expenses, merged with', localOnlyExpenses.length, 'local')
    return mergedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (error) {
    console.warn('Firebase fetch failed, returning local data:', error)
    return localExpenses
  }
}

/**
 * Get expense summary
 */
export async function getExpenseSummary(startDate?: string, endDate?: string) {
  const expenses = await getExpenses()

  let filtered = expenses
  if (startDate) {
    filtered = filtered.filter(e => e.date >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter(e => e.date <= endDate)
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)
  const totalGST = filtered.reduce((sum, e) => sum + (e.gstAmount || 0), 0)

  const byCategory = filtered.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  const byPaymentMode = filtered.reduce((acc, e) => {
    acc[e.paymentMode] = (acc[e.paymentMode] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  return {
    total,
    totalGST,
    count: filtered.length,
    byCategory,
    byPaymentMode
  }
}

/**
 * Generate expense number
 */
export function generateExpenseNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `EXP-${year}${month}-${random}`
}

/**
 * Calculate prorated expense amount for a date range
 * This is the "Smart Expense Logic" that prorates monthly expenses
 */
export function calculateProratedAmount(
  expense: Expense,
  startDate: string,
  endDate: string
): number {
  // If not recurring or one-time expense, return full amount if date falls in range
  if (!expense.isRecurring || expense.recurringType === 'one-time') {
    const expenseDate = expense.date
    if (expenseDate >= startDate && expenseDate <= endDate) {
      return expense.amount
    }
    return 0
  }

  // For monthly recurring expenses, calculate days in period
  const start = new Date(startDate)
  const end = new Date(endDate)
  const expenseMonth = new Date(expense.date).getMonth()
  const expenseYear = new Date(expense.date).getFullYear()

  // Check if expense month matches the period
  const periodMonth = start.getMonth()
  const periodYear = start.getFullYear()

  if (expenseYear !== periodYear || expenseMonth !== periodMonth) {
    return 0 // Expense not in this period
  }

  // Calculate number of days in the period
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const daysInMonth = new Date(periodYear, periodMonth + 1, 0).getDate()

  // Use daily rate for accurate proration
  const dailyRate = expense.dailyRate || (expense.monthlyAmount || expense.amount) / 30
  const proratedAmount = dailyRate * daysDiff

  return Math.min(proratedAmount, expense.monthlyAmount || expense.amount)
}

/**
 * Get expense summary with smart proration
 */
export async function getExpenseSummaryWithProration(startDate?: string, endDate?: string) {
  const expenses = await getExpenses()

  let total = 0
  let totalGST = 0
  const byCategory: Record<string, number> = {}
  const byPaymentMode: Record<string, number> = {}

  expenses.forEach(expense => {
    const proratedAmount = startDate && endDate
      ? calculateProratedAmount(expense, startDate, endDate)
      : expense.amount

    if (proratedAmount > 0) {
      total += proratedAmount
      totalGST += (expense.gstAmount || 0)

      byCategory[expense.category] = (byCategory[expense.category] || 0) + proratedAmount
      byPaymentMode[expense.paymentMode] = (byPaymentMode[expense.paymentMode] || 0) + proratedAmount
    }
  })

  const filteredCount = expenses.filter(e => {
    if (!startDate || !endDate) return true
    return calculateProratedAmount(e, startDate, endDate) > 0
  }).length

  return {
    total,
    totalGST,
    count: filteredCount,
    byCategory,
    byPaymentMode
  }
}

/**
 * Update expense - OFFLINE FIRST
 * Always saves locally first, then syncs to Firebase silently when online
 */
export async function updateExpense(id: string, updates: Partial<Expense>): Promise<boolean> {
  const now = new Date().toISOString()

  // STEP 1: Get existing expense from local
  let existingExpense: Expense | null = null
  try {
    existingExpense = await getFromOffline<Expense>(STORES.EXPENSES, id)
  } catch (error) {
    const localExpenses = getExpensesFromLocalStorage()
    existingExpense = localExpenses.find(e => e.id === id) || null
  }

  if (!existingExpense) {
    console.error('[updateExpense] Expense not found:', id)
    return false
  }

  const updatedExpense: Expense = {
    ...existingExpense,
    ...updates,
    _pendingSync: !isDeviceOnline() || isOfflineId(id),
    _savedAt: now
  } as Expense

  // STEP 2: Always save to IndexedDB first
  try {
    await saveToOffline(STORES.EXPENSES, updatedExpense)
    updateExpenseInLocalStorage(id, updatedExpense)
    console.log('[updateExpense] ✅ Updated locally:', id)
  } catch (error) {
    console.error('[updateExpense] Local save failed:', error)
    updateExpenseInLocalStorage(id, updatedExpense)
  }

  // STEP 3: If online and not an offline-only record, sync to Firebase
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      const serverData = removeUndefinedDeep(updates)
      const docRef = doc(db!, COLLECTIONS.EXPENSES || 'expenses', id)
      await updateDoc(docRef, serverData)

      // Mark as synced
      updatedExpense._pendingSync = false
      updatedExpense._syncedAt = now
      await saveToOffline(STORES.EXPENSES, updatedExpense)

      console.log('[updateExpense] ✅ Synced to Firebase:', id)
    } catch (error) {
      console.warn('[updateExpense] Firebase sync failed, queuing:', error)
      await addToSyncQueue('update', STORES.EXPENSES, updatedExpense)
    }
  } else if (!isOfflineId(id)) {
    await addToSyncQueue('update', STORES.EXPENSES, updatedExpense)
  }

  return true
}

/**
 * Delete expense - OFFLINE FIRST
 * Always deletes locally first, then syncs to Firebase silently when online
 */
export async function deleteExpense(id: string): Promise<boolean> {
  // STEP 1: Always delete from local first
  try {
    await deleteFromOffline(STORES.EXPENSES, id)
    deleteExpenseFromLocalStorage(id)
    console.log('[deleteExpense] ✅ Deleted locally:', id)
  } catch (error) {
    console.error('[deleteExpense] Local delete failed:', error)
    deleteExpenseFromLocalStorage(id)
  }

  // STEP 2: If online and has Firebase ID, sync deletion
  if (isDeviceOnline() && isFirebaseReady() && !isOfflineId(id)) {
    try {
      const docRef = doc(db!, COLLECTIONS.EXPENSES || 'expenses', id)
      await deleteDoc(docRef)
      console.log('[deleteExpense] ✅ Deleted from Firebase:', id)
    } catch (error) {
      console.warn('[deleteExpense] Firebase delete failed, queuing:', error)
      await addToSyncQueue('delete', STORES.EXPENSES, { id })
    }
  } else if (!isOfflineId(id)) {
    await addToSyncQueue('delete', STORES.EXPENSES, { id })
  }

  return true
}

// LocalStorage implementations
function createExpenseToLocalStorage(
  expense: Omit<Expense, 'id' | 'createdAt'>
): Expense {
  const expenses = getExpensesFromLocalStorage()

  const newExpense: Expense = {
    ...expense,
    id: `exp_${Date.now()}`,
    createdAt: new Date().toISOString()
  }

  expenses.push(newExpense)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses))

  return newExpense
}

function getExpensesFromLocalStorage(): Expense[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading expenses:', error)
    return []
  }
}

function updateExpenseInLocalStorage(id: string, updates: Partial<Expense>): boolean {
  try {
    const expenses = getExpensesFromLocalStorage()
    const index = expenses.findIndex(e => e.id === id)

    if (index === -1) return false

    expenses[index] = { ...expenses[index], ...updates }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses))
    return true
  } catch (error) {
    console.error('Error updating expense in localStorage:', error)
    return false
  }
}

function deleteExpenseFromLocalStorage(id: string): boolean {
  try {
    const expenses = getExpensesFromLocalStorage()
    const filtered = expenses.filter(e => e.id !== id)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting expense from localStorage:', error)
    return false
  }
}
