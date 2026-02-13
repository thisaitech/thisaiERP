// Banking Service (Lightweight localStorage-backed)
// Self-hosted deployments can later move this to REST easily without Firebase.

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
  updatedAt?: string
}

export interface BankingPageTransaction {
  id: number
  type: 'credit' | 'debit'
  description: string
  amount: number
  date: string
  account: string
}

export type Unsubscribe = () => void

const LS_DATA_KEY = 'thisai_erp_banking_page_data'
const LS_TX_KEY = 'thisai_erp_banking_page_transactions'
const EVENT_DATA = 'banking:data-changed'
const EVENT_TX = 'banking:tx-changed'

const defaultData = (): BankingPageData => ({
  bankAccounts: [],
  cashInHand: { balance: 0 },
  cheques: [],
  loans: [],
  updatedAt: new Date().toISOString(),
})

export async function getBankingPageData(): Promise<BankingPageData | null> {
  try {
    const raw = localStorage.getItem(LS_DATA_KEY)
    if (!raw) return defaultData()
    return JSON.parse(raw) as BankingPageData
  } catch {
    return defaultData()
  }
}

export async function saveBankingPageData(data: BankingPageData): Promise<void> {
  const next = { ...data, updatedAt: new Date().toISOString() }
  localStorage.setItem(LS_DATA_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(EVENT_DATA, { detail: next }))
}

export async function getBankingPageTransactions(): Promise<BankingPageTransaction[]> {
  try {
    const raw = localStorage.getItem(LS_TX_KEY)
    if (!raw) return []
    const tx = JSON.parse(raw)
    return Array.isArray(tx) ? (tx as BankingPageTransaction[]) : []
  } catch {
    return []
  }
}

export async function saveBankingPageTransactions(transactions: BankingPageTransaction[]): Promise<void> {
  localStorage.setItem(LS_TX_KEY, JSON.stringify(transactions))
  window.dispatchEvent(new CustomEvent(EVENT_TX, { detail: transactions }))
}

export function subscribeToBankingPageData(onData: (data: BankingPageData) => void): Unsubscribe {
  const handler = (e: any) => {
    if (e?.detail) onData(e.detail as BankingPageData)
    else getBankingPageData().then((d) => d && onData(d))
  }
  window.addEventListener(EVENT_DATA, handler as EventListener)
  window.addEventListener('storage', handler as EventListener)
  getBankingPageData().then((d) => d && onData(d))
  return () => {
    window.removeEventListener(EVENT_DATA, handler as EventListener)
    window.removeEventListener('storage', handler as EventListener)
  }
}

export function subscribeToBankingPageTransactions(onData: (tx: BankingPageTransaction[]) => void): Unsubscribe {
  const handler = (e: any) => {
    if (e?.detail) onData(e.detail as BankingPageTransaction[])
    else getBankingPageTransactions().then(onData)
  }
  window.addEventListener(EVENT_TX, handler as EventListener)
  window.addEventListener('storage', handler as EventListener)
  getBankingPageTransactions().then(onData)
  return () => {
    window.removeEventListener(EVENT_TX, handler as EventListener)
    window.removeEventListener('storage', handler as EventListener)
  }
}

