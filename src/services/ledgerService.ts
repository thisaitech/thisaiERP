// Ledger Service (Lightweight, Firebase-free)
// Computes party/student ledger from invoices (and their payment info).
// This keeps the UI working for self-hosted backends without maintaining a separate ledger collection.

import { getInvoices } from './invoiceService'
import { getPartySettings } from './settingsService'

const LOCAL_STORAGE_KEY = 'thisai_erp_ledger_manual_entries'

export interface LedgerEntry {
  id: string
  partyId: string
  partyName: string
  date: string
  type: 'invoice' | 'payment' | 'opening_balance' | 'adjustment'
  referenceType: 'sale' | 'purchase' | 'payment' | 'opening' | 'adjustment'
  referenceNumber: string
  description: string
  debit: number
  credit: number
  balance: number
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

// Legacy exports kept for compatibility. Ledger is computed from invoices now.
export async function createInvoiceLedgerEntry(
  _partyId: string,
  _partyName: string,
  _invoiceNumber: string,
  _invoiceDate: string,
  _amount: number,
  _type: 'sale' | 'purchase'
): Promise<void> {
  // no-op
}

export async function createPaymentLedgerEntry(
  _partyId: string,
  _partyName: string,
  _paymentDate: string,
  _amount: number,
  _paymentReference: string,
  _type: 'sale' | 'purchase'
): Promise<void> {
  // no-op
}

function safeNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function normalizeDate(dateInput: unknown): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput
  const d = new Date(typeof dateInput === 'string' ? dateInput : Date.now())
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function readManualEntries(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LedgerEntry[]) : []
  } catch {
    return []
  }
}

export async function getPartyLedger(partyId: string): Promise<LedgerEntry[]> {
  // Optional feature flag from existing settings UI.
  const partySettings = getPartySettings()
  if (partySettings && (partySettings as any).trackLedgerAutomatically === false) return []

  const [allInvoices, manualEntries] = await Promise.all([
    getInvoices(),
    Promise.resolve(readManualEntries()),
  ])

  const rows: LedgerEntry[] = []

  // Manual entries (opening balance/adjustments).
  for (const e of manualEntries) {
    if (e && e.partyId === partyId) rows.push(e)
  }

  // Computed entries from invoices + payment info.
  for (const inv of allInvoices as any[]) {
    if (!inv || inv.partyId !== partyId) continue

    const invType = String(inv.type || '')
    const isSale = invType === 'sale'
    const isPurchase = invType === 'purchase'
    if (!isSale && !isPurchase) continue

    const invoiceDate = normalizeDate(inv.invoiceDate || inv.date || inv.createdAt)
    const createdAt = String(inv.createdAt || inv.updatedAt || new Date().toISOString())
    const invoiceNumber = String(inv.invoiceNumber || inv.referenceNumber || inv.id || '')
    const partyName = String(inv.partyName || inv.partyDisplayName || inv.partyCompanyName || 'Party')

    const grandTotal = safeNumber(inv.grandTotal)
    const paidAmount = safeNumber(inv.payment?.paidAmount)

    const invoiceEntry: LedgerEntry = {
      id: `inv_${inv.id || invoiceNumber}`,
      partyId,
      partyName,
      date: invoiceDate,
      type: 'invoice',
      referenceType: isSale ? 'sale' : 'purchase',
      referenceNumber: invoiceNumber,
      description: isSale ? `Admission ${invoiceNumber}` : `Purchase Invoice ${invoiceNumber}`,
      debit: isSale ? grandTotal : 0,
      credit: isPurchase ? grandTotal : 0,
      balance: 0,
      createdAt,
    }
    rows.push(invoiceEntry)

    if (paidAmount > 0) {
      rows.push({
        id: `pay_${inv.id || invoiceNumber}`,
        partyId,
        partyName,
        date: invoiceDate, // Payment date not tracked in PaymentInfo; fallback to invoice date.
        type: 'payment',
        referenceType: 'payment',
        referenceNumber: invoiceNumber,
        description: isSale ? `Payment Received - ${invoiceNumber}` : `Payment Made - ${invoiceNumber}`,
        debit: isPurchase ? paidAmount : 0,
        credit: isSale ? paidAmount : 0,
        balance: 0,
        createdAt,
      })
    }
  }

  rows.sort((a, b) => {
    const ad = a.date.localeCompare(b.date)
    if (ad !== 0) return ad
    const ac = a.createdAt.localeCompare(b.createdAt)
    if (ac !== 0) return ac
    return a.id.localeCompare(b.id)
  })

  // Running balance: debit increases, credit decreases.
  let balance = 0
  for (const r of rows) {
    balance += safeNumber(r.debit) - safeNumber(r.credit)
    r.balance = balance
  }

  return rows
}

export async function getPartyBalance(partyId: string): Promise<number> {
  const ledger = await getPartyLedger(partyId)
  if (ledger.length === 0) return 0
  return safeNumber(ledger[ledger.length - 1].balance)
}

export async function getLedgerSummary(): Promise<{
  totalReceivables: number
  totalPayables: number
  netBalance: number
}> {
  const partySettings = getPartySettings()
  if (partySettings && (partySettings as any).trackLedgerAutomatically === false) {
    return { totalReceivables: 0, totalPayables: 0, netBalance: 0 }
  }

  const invoices = await getInvoices()
  const balances = new Map<string, number>()

  for (const inv of invoices as any[]) {
    if (!inv || !inv.partyId) continue
    const invType = String(inv.type || '')
    const isSale = invType === 'sale'
    const isPurchase = invType === 'purchase'
    if (!isSale && !isPurchase) continue

    const grandTotal = safeNumber(inv.grandTotal)
    const paidAmount = safeNumber(inv.payment?.paidAmount)

    // Balance delta matches getPartyLedger(): debit - credit.
    const delta = isSale ? (grandTotal - paidAmount) : (-grandTotal + paidAmount)
    balances.set(inv.partyId, (balances.get(inv.partyId) || 0) + delta)
  }

  let totalReceivables = 0
  let totalPayables = 0
  for (const bal of balances.values()) {
    if (bal > 0) totalReceivables += bal
    else if (bal < 0) totalPayables += Math.abs(bal)
  }

  return {
    totalReceivables,
    totalPayables,
    netBalance: totalReceivables - totalPayables,
  }
}

