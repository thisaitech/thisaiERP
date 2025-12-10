// Banking Service - Bank account management and reconciliation
// Now with Firebase real-time sync for cross-device consistency
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore'
import { db, auth, COLLECTIONS, isFirebaseReady } from './firebase'
import { appEventTarget } from './syncService'

const LOCAL_STORAGE_KEY_ACCOUNTS = 'thisai_crm_bank_accounts'
const LOCAL_STORAGE_KEY_TRANSACTIONS = 'thisai_crm_bank_transactions'

// Keys used by Banking.tsx page
const BANKING_PAGE_ACCOUNTS_KEY = 'bankingAccounts'
const BANKING_PAGE_TRANSACTIONS_KEY = 'bankingTransactions'

export interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountType: 'savings' | 'current' | 'cc' | 'od'
  ifscCode: string
  branch?: string
  openingBalance: number
  currentBalance: number
  isActive: boolean
  isPrimary: boolean
  createdAt: string
}

export interface BankTransaction {
  id: string
  accountId: string
  date: string
  type: 'credit' | 'debit'
  amount: number
  balance: number
  description: string
  reference?: string
  category?: string
  isReconciled: boolean
  reconciledWith?: string // Invoice/Payment/Expense ID
  reconciledType?: 'invoice' | 'payment' | 'expense'
  createdAt: string
}

/**
 * Create bank account
 */
export async function createBankAccount(
  account: Omit<BankAccount, 'id' | 'createdAt' | 'currentBalance'>
): Promise<BankAccount> {
  const accounts = getBankAccounts()

  const newAccount: BankAccount = {
    ...account,
    id: `bank_${Date.now()}`,
    currentBalance: account.openingBalance,
    createdAt: new Date().toISOString()
  }

  accounts.push(newAccount)
  localStorage.setItem(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts))

  return newAccount
}

/**
 * Get all bank accounts
 */
export function getBankAccounts(): BankAccount[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_ACCOUNTS)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading bank accounts:', error)
    return []
  }
}

/**
 * Add bank transaction
 */
export function addBankTransaction(
  transaction: Omit<BankTransaction, 'id' | 'createdAt' | 'balance'>
): BankTransaction {
  const transactions = getBankTransactions()
  const accounts = getBankAccounts()

  const account = accounts.find(a => a.id === transaction.accountId)
  if (!account) {
    throw new Error('Bank account not found')
  }

  // Calculate new balance
  const newBalance = transaction.type === 'credit'
    ? account.currentBalance + transaction.amount
    : account.currentBalance - transaction.amount

  const newTransaction: BankTransaction = {
    ...transaction,
    id: `txn_${Date.now()}`,
    balance: newBalance,
    createdAt: new Date().toISOString()
  }

  transactions.push(newTransaction)
  localStorage.setItem(LOCAL_STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions))

  // Update account balance
  account.currentBalance = newBalance
  localStorage.setItem(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts))

  return newTransaction
}

/**
 * Get bank transactions
 */
export function getBankTransactions(accountId?: string): BankTransaction[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_TRANSACTIONS)
    const all: BankTransaction[] = stored ? JSON.parse(stored) : []

    if (accountId) {
      return all.filter(t => t.accountId === accountId)
    }
    return all
  } catch (error) {
    console.error('Error reading transactions:', error)
    return []
  }
}

/**
 * Reconcile transaction with payment/invoice/expense
 */
export function reconcileTransaction(
  transactionId: string,
  reconciledWith: string,
  reconciledType: 'invoice' | 'payment' | 'expense'
): boolean {
  try {
    const transactions = getBankTransactions()
    const index = transactions.findIndex(t => t.id === transactionId)

    if (index !== -1) {
      transactions[index].isReconciled = true
      transactions[index].reconciledWith = reconciledWith
      transactions[index].reconciledType = reconciledType

      localStorage.setItem(LOCAL_STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions))
      return true
    }
    return false
  } catch (error) {
    console.error('Error reconciling transaction:', error)
    return false
  }
}

/**
 * Get bank summary
 */
export function getBankSummary() {
  const accounts = getBankAccounts()
  const transactions = getBankTransactions()

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0)
  const totalCredit = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalDebit = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0)

  const unreconciled = transactions.filter(t => !t.isReconciled).length

  return {
    totalBalance,
    totalCredit,
    totalDebit,
    netCashFlow: totalCredit - totalDebit,
    accountsCount: accounts.length,
    unreconciledCount: unreconciled
  }
}

// =====================================
// FIREBASE REAL-TIME SYNC FUNCTIONS
// For Banking.tsx page data (bankingAccounts)
// =====================================

// Types for Banking.tsx page data
export interface BankingPageAccount {
  id: number
  name: string
  accountNo: string
  balance: number
  type: 'current' | 'savings'
}

export interface BankingPageCheque {
  id: number
  number: string
  amount: number
  date: string
  party: string
  status: 'pending' | 'cleared' | 'bounced'
  depositBank?: string
  depositBankName?: string
}

export interface BankingPageLoan {
  id: number
  name: string
  bank: string
  principal: number
  outstanding: number
  emi: number
  nextDue: string
}

export interface BankingPageData {
  bankAccounts: BankingPageAccount[]
  cashInHand: { balance: number }
  cheques: BankingPageCheque[]
  loans: BankingPageLoan[]
  updatedAt?: any
}

export interface BankingPageTransaction {
  id: number
  type: 'credit' | 'debit'
  description: string
  amount: number
  date: string
  account: string
}

// Get current user's business ID for document path
const getBusinessId = (): string | null => {
  const user = auth?.currentUser
  if (!user) return null
  return user.uid
}

// Get banking document reference for Banking.tsx page data
const getBankingPageDocRef = () => {
  const businessId = getBusinessId()
  if (!db || !businessId) return null
  return doc(db, COLLECTIONS.BANKING, `${businessId}_page`)
}

// Get transactions document reference for Banking.tsx page data
const getBankingPageTransactionsDocRef = () => {
  const businessId = getBusinessId()
  if (!db || !businessId) return null
  return doc(db, COLLECTIONS.BANKING, `${businessId}_page_transactions`)
}

/**
 * Get Banking.tsx page data from Firebase
 */
export async function getBankingPageData(): Promise<BankingPageData | null> {
  if (!isFirebaseReady()) {
    console.warn('Firebase not ready, cannot get banking page data')
    return null
  }

  try {
    const docRef = getBankingPageDocRef()
    if (docRef) {
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data() as BankingPageData
        console.log('📥 Banking page data loaded from Firebase')
        return data
      }
    }
  } catch (error) {
    console.error('Failed to get banking page data from Firebase:', error)
  }

  return null
}

/**
 * Get Banking.tsx page transactions from Firebase
 */
export async function getBankingPageTransactions(): Promise<BankingPageTransaction[]> {
  if (!isFirebaseReady()) {
    console.warn('Firebase not ready, cannot get banking page transactions')
    return []
  }

  try {
    const docRef = getBankingPageTransactionsDocRef()
    if (docRef) {
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        console.log('📥 Banking page transactions loaded from Firebase')
        return data.transactions as BankingPageTransaction[]
      }
    }
  } catch (error) {
    console.error('Failed to get banking page transactions from Firebase:', error)
  }

  return []
}

/**
 * Save Banking.tsx page data to Firebase only
 */
export async function saveBankingPageData(data: BankingPageData): Promise<void> {
  // Dispatch event for other components listening
  appEventTarget.dispatchEvent(new CustomEvent('bankingUpdated', { detail: data }))

  // Save to Firebase
  if (isFirebaseReady()) {
    try {
      const docRef = getBankingPageDocRef()
      if (docRef) {
        await setDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        }, { merge: true })
        console.log('💾 Banking page data saved to Firebase')
      }
    } catch (error) {
      console.error('Failed to save banking page data to Firebase:', error)
    }
  } else {
    console.warn('Firebase not ready, banking data not saved')
  }
}

/**
 * Save Banking.tsx page transactions to Firebase only
 */
export async function saveBankingPageTransactions(transactions: BankingPageTransaction[]): Promise<void> {
  // Save to Firebase
  if (isFirebaseReady()) {
    try {
      const docRef = getBankingPageTransactionsDocRef()
      if (docRef) {
        await setDoc(docRef, {
          transactions,
          updatedAt: serverTimestamp()
        }, { merge: true })
        console.log('💾 Banking page transactions saved to Firebase')
      }
    } catch (error) {
      console.error('Failed to save banking page transactions to Firebase:', error)
    }
  } else {
    console.warn('Firebase not ready, banking transactions not saved')
  }
}

/**
 * Subscribe to real-time Banking.tsx page data updates from Firebase
 * Returns an unsubscribe function
 */
export function subscribeToBankingPageData(
  onData: (data: BankingPageData) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  if (!isFirebaseReady()) {
    console.log('Firebase not ready, skipping real-time subscription')
    return null
  }

  const docRef = getBankingPageDocRef()
  if (!docRef) {
    console.log('No banking page doc ref available (user not logged in?)')
    return null
  }

  console.log('🔔 Setting up real-time banking page data listener')

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as BankingPageData
        // Dispatch event for other components
        appEventTarget.dispatchEvent(new CustomEvent('bankingUpdated', { detail: data }))
        onData(data)
        console.log('📥 Real-time banking page update received from Firebase')
      }
    },
    (error) => {
      console.error('Real-time banking page listener error:', error)
      if (onError) onError(error)
    }
  )
}

/**
 * Subscribe to real-time Banking.tsx page transactions updates from Firebase
 * Returns an unsubscribe function
 */
export function subscribeToBankingPageTransactions(
  onData: (transactions: BankingPageTransaction[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  if (!isFirebaseReady()) {
    return null
  }

  const docRef = getBankingPageTransactionsDocRef()
  if (!docRef) {
    return null
  }

  console.log('🔔 Setting up real-time banking page transactions listener')

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        const transactions = data.transactions as BankingPageTransaction[]
        onData(transactions)
        console.log('📥 Real-time banking page transactions update received from Firebase')
      }
    },
    (error) => {
      console.error('Real-time banking page transactions listener error:', error)
      if (onError) onError(error)
    }
  )
}

/**
 * Migrate existing localStorage data to Firebase (one-time migration)
 * Call this when user first logs in or on app startup
 */
export async function migrateBankingToFirebase(): Promise<boolean> {
  if (!isFirebaseReady()) {
    return false
  }

  try {
    // Check if Firebase already has data
    const docRef = getBankingPageDocRef()
    if (!docRef) return false

    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      console.log('Firebase banking data already exists, skipping migration')
      return true
    }

    // Get data from localStorage
    const savedAccounts = localStorage.getItem(BANKING_PAGE_ACCOUNTS_KEY)
    const savedTransactions = localStorage.getItem(BANKING_PAGE_TRANSACTIONS_KEY)

    if (savedAccounts) {
      const accounts = JSON.parse(savedAccounts)
      await saveBankingPageData(accounts)
      console.log('Migrated banking accounts to Firebase')
    }

    if (savedTransactions) {
      const transactions = JSON.parse(savedTransactions)
      await saveBankingPageTransactions(transactions)
      console.log('Migrated banking transactions to Firebase')
    }

    return true
  } catch (error) {
    console.error('Banking migration failed:', error)
    return false
  }
}

/**
 * Update Cash in Hand balance - saves to Firebase for real-time sync
 * Use this from Sales, Purchases, POS, Quotations pages when payment is made
 * @param amount - positive to add, negative to subtract
 * @param description - optional description for the transaction
 */
export async function updateCashInHand(amount: number, description?: string): Promise<boolean> {
  try {
    // Get current banking data from Firebase
    let currentData = await getBankingPageData()

    if (!currentData) {
      // Initialize with default structure if no data exists
      currentData = {
        bankAccounts: [],
        cashInHand: { balance: 0 },
        cheques: [],
        loans: []
      }
    }

    // Update cash in hand balance
    const currentBalance = currentData.cashInHand?.balance || 0
    const newBalance = currentBalance + amount
    currentData.cashInHand = { balance: newBalance }

    // Save to Firebase
    await saveBankingPageData(currentData)

    console.log(`💰 Cash in Hand updated: ${currentBalance} → ${newBalance} (${amount >= 0 ? '+' : ''}${amount})${description ? ` - ${description}` : ''}`)

    return true
  } catch (error) {
    console.error('Failed to update Cash in Hand:', error)
    return false
  }
}

/**
 * Update Bank Account balance - saves to Firebase for real-time sync
 * @param bankAccountId - ID of the bank account to update
 * @param amount - positive to add, negative to subtract
 */
export async function updateBankAccountBalance(bankAccountId: number, amount: number): Promise<boolean> {
  try {
    let currentData = await getBankingPageData()

    if (!currentData || !currentData.bankAccounts) {
      console.warn('No banking data found')
      return false
    }

    const accountIndex = currentData.bankAccounts.findIndex(acc => acc.id === bankAccountId)
    if (accountIndex === -1) {
      console.warn(`Bank account ${bankAccountId} not found`)
      return false
    }

    const currentBalance = currentData.bankAccounts[accountIndex].balance || 0
    currentData.bankAccounts[accountIndex].balance = currentBalance + amount

    await saveBankingPageData(currentData)

    console.log(`🏦 Bank account ${bankAccountId} updated: ${currentBalance} → ${currentBalance + amount}`)

    return true
  } catch (error) {
    console.error('Failed to update bank account balance:', error)
    return false
  }
}
