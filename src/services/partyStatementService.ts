/**
 * Party Statement Service
 *
 * Generate account statements for customers and suppliers
 * Shows all transactions, payments, and running balance
 */

import type { Invoice, Party } from '../types'
import { getInvoices } from './invoiceService'
import { getParties } from './partyService'
import { getInvoicePayments, type Payment } from './paymentService'

export interface StatementTransaction {
  id: string
  date: string
  type: 'invoice' | 'payment' | 'opening_balance'
  invoiceNumber?: string
  description: string
  debit: number   // Money owed TO us (sales)
  credit: number  // Money we paid (purchases / payments received)
  balance: number // Running balance
}

export interface PartyStatement {
  party: {
    id: string
    name: string
    type: 'customer' | 'supplier' | 'both'
    phone: string
    email: string
    gstin?: string
  }
  period: {
    from: string
    to: string
  }
  openingBalance: number
  transactions: StatementTransaction[]
  summary: {
    totalDebit: number
    totalCredit: number
    closingBalance: number
    totalInvoices: number
    totalPayments: number
  }
}

/**
 * Generate party statement for a specific date range
 */
export async function generatePartyStatement(
  partyId: string,
  fromDate: string,
  toDate: string
): Promise<PartyStatement | null> {
  try {
    // Get party details
    const parties = await getParties()
    const party = parties?.find(p => p.id === partyId)

    if (!party) {
      throw new Error('Party not found')
    }

    // Get all invoices for this party
    const allInvoices = await getInvoices()
    const partyInvoices = allInvoices?.filter(inv =>
      inv.partyId === partyId &&
      inv.invoiceDate >= fromDate &&
      inv.invoiceDate <= toDate
    ) || []

    // Build transactions array
    const transactions: StatementTransaction[] = []

    // Add opening balance
    const openingBalance = party.openingBalance || 0
    let runningBalance = openingBalance

    transactions.push({
      id: 'opening',
      date: fromDate,
      type: 'opening_balance',
      description: 'Opening Balance',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      balance: runningBalance
    })

    // Add invoices and payments
    for (const invoice of partyInvoices) {
      // Add invoice transaction
      const isDebit = invoice.type === 'sale' // Sales increase receivable (debit)
      const amount = invoice.grandTotal

      runningBalance += isDebit ? amount : -amount

      transactions.push({
        id: invoice.id,
        date: invoice.invoiceDate,
        type: 'invoice',
        invoiceNumber: invoice.invoiceNumber,
        description: `${invoice.type === 'sale' ? 'Sale' : 'Purchase'} Invoice - ${invoice.invoiceNumber}`,
        debit: isDebit ? amount : 0,
        credit: !isDebit ? amount : 0,
        balance: runningBalance
      })

      // Add payment transactions if any
      const payments = await getInvoicePayments(invoice.id)
      if (payments && payments.length > 0) {
        for (const payment of payments) {
          runningBalance -= payment.amount

          transactions.push({
            id: payment.id,
            date: payment.date,
            type: 'payment',
            invoiceNumber: invoice.invoiceNumber,
            description: `Payment received for ${invoice.invoiceNumber} - ${payment.method}`,
            debit: 0,
            credit: payment.amount,
            balance: runningBalance
          })
        }
      }
    }

    // Sort transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate summary
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0)
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0)
    const closingBalance = runningBalance
    const totalInvoices = transactions.filter(t => t.type === 'invoice').length
    const totalPayments = transactions.filter(t => t.type === 'payment').length

    return {
      party: {
        id: party.id,
        name: party.companyName || party.displayName,
        type: party.type,
        phone: party.phone,
        email: party.email,
        gstin: party.gstDetails?.gstin
      },
      period: {
        from: fromDate,
        to: toDate
      },
      openingBalance,
      transactions,
      summary: {
        totalDebit,
        totalCredit,
        closingBalance,
        totalInvoices,
        totalPayments
      }
    }
  } catch (error) {
    console.error('Error generating party statement:', error)
    return null
  }
}

/**
 * Generate statement for current financial year
 */
export async function generatePartyStatementCurrentYear(
  partyId: string
): Promise<PartyStatement | null> {
  const currentYear = new Date().getFullYear()
  const fromDate = `${currentYear}-04-01` // Indian FY starts April 1
  const toDate = `${currentYear + 1}-03-31`

  return generatePartyStatement(partyId, fromDate, toDate)
}

/**
 * Export party statement to PDF
 */
export function exportPartyStatementPDF(statement: PartyStatement): void {
  // TODO: Implement PDF export using jsPDF
  console.log('Exporting party statement to PDF:', statement)
}

/**
 * Export party statement to Excel
 */
export function exportPartyStatementExcel(statement: PartyStatement): void {
  // TODO: Implement Excel export using XLSX
  console.log('Exporting party statement to Excel:', statement)
}

/**
 * Get outstanding balance for a party
 */
export async function getPartyOutstandingBalance(partyId: string): Promise<number> {
  try {
    const parties = await getParties()
    const party = parties?.find(p => p.id === partyId)

    if (!party) {
      return 0
    }

    return party.currentBalance || 0
  } catch (error) {
    console.error('Error getting outstanding balance:', error)
    return 0
  }
}

/**
 * Get all parties with outstanding balances
 */
export async function getPartiesWithOutstanding(): Promise<Array<{
  party: Party
  outstandingAmount: number
  daysOverdue?: number
}>> {
  try {
    const parties = await getParties()

    if (!parties || parties.length === 0) {
      return []
    }

    return parties
      .filter(p => (p.currentBalance || 0) !== 0)
      .map(party => ({
        party,
        outstandingAmount: party.currentBalance || 0,
        daysOverdue: undefined // TODO: Calculate based on due dates
      }))
      .sort((a, b) => Math.abs(b.outstandingAmount) - Math.abs(a.outstandingAmount))
  } catch (error) {
    console.error('Error getting parties with outstanding:', error)
    return []
  }
}
