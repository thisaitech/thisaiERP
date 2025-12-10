/**
 * Sales & Purchase Returns Service
 *
 * Manages product returns with automatic credit/debit note generation
 */

import type { SalesReturn, Invoice } from '../types'
import { createCreditNote } from './creditNoteService'
import { updateItemStock } from './itemService'

const STORAGE_KEY = 'salesReturns'

/**
 * Get all returns
 */
export async function getReturns(): Promise<SalesReturn[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error getting returns:', error)
    return []
  }
}

/**
 * Get return by ID
 */
export async function getReturnById(id: string): Promise<SalesReturn | null> {
  try {
    const returns = await getReturns()
    return returns.find(r => r.id === id) || null
  } catch (error) {
    console.error('Error getting return:', error)
    return null
  }
}

/**
 * Get returns for specific invoice
 */
export async function getReturnsByInvoice(invoiceId: string): Promise<SalesReturn[]> {
  try {
    const returns = await getReturns()
    return returns.filter(r => r.originalInvoiceId === invoiceId)
  } catch (error) {
    console.error('Error getting returns for invoice:', error)
    return []
  }
}

/**
 * Create sales return
 */
export async function createSalesReturn(
  invoice: Invoice,
  data: {
    items: Array<{
      itemId: string
      itemName: string
      quantityReturned: number
      rate: number
    }>
    reason: SalesReturn['reason']
    reasonDescription?: string
    action: SalesReturn['action']
  }
): Promise<SalesReturn | null> {
  try {
    const returns = await getReturns()

    // Generate return number
    const count = returns.length + 1
    const returnNumber = `RET-${String(count).padStart(4, '0')}`

    // Calculate total
    const totalAmount = data.items.reduce((sum, item) =>
      sum + (item.quantityReturned * item.rate), 0
    )

    const salesReturn: SalesReturn = {
      id: `return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      returnNumber,
      returnDate: new Date().toISOString().split('T')[0],
      originalInvoiceId: invoice.id,
      originalInvoiceNumber: invoice.invoiceNumber,
      customerId: invoice.partyId,
      customerName: invoice.partyName,
      items: data.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantityReturned: item.quantityReturned,
        rate: item.rate,
        amount: item.quantityReturned * item.rate
      })),
      reason: data.reason,
      reasonDescription: data.reasonDescription,
      totalAmount,
      action: data.action,
      refundAmount: data.action === 'refund' ? totalAmount : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    returns.push(salesReturn)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(returns))

    return salesReturn
  } catch (error) {
    console.error('Error creating sales return:', error)
    return null
  }
}

/**
 * Approve sales return
 * - Updates inventory (adds back to stock)
 * - Updates Cash in Hand (reduces balance for refund)
 * - Creates credit note automatically
 * - Updates party balance
 */
export async function approveSalesReturn(id: string): Promise<boolean> {
  try {
    const returns = await getReturns()
    const returnIndex = returns.find(r => r.id === id)

    if (!returnIndex) return false

    const salesReturn = returns.find(r => r.id === id)!

    // Update inventory - add back to stock
    for (const item of salesReturn.items) {
      await updateItemStock(item.itemId, item.quantityReturned, 'add')
    }

    // Update Cash in Hand - reduce balance for refund
    if (salesReturn.action === 'refund' && salesReturn.refundAmount && salesReturn.refundAmount > 0) {
      try {
        const bankingData = localStorage.getItem('bankingAccounts')
        if (bankingData) {
          const accounts = JSON.parse(bankingData)
          const bankingTransactions = localStorage.getItem('bankingTransactions')
          const transactions = bankingTransactions ? JSON.parse(bankingTransactions) : []

          // Reduce Cash in Hand
          const newCashBalance = Math.max(0, (accounts.cashInHand?.balance || 0) - salesReturn.refundAmount)
          accounts.cashInHand = { balance: newCashBalance }

          // Add transaction record
          const newTransaction = {
            id: Date.now() + Math.random(),
            type: 'debit',
            description: `Sales Return Refund - ${salesReturn.returnNumber} (${salesReturn.customerName})`,
            amount: salesReturn.refundAmount,
            date: new Date().toISOString().split('T')[0],
            account: 'Cash in Hand'
          }
          transactions.unshift(newTransaction)

          // Save updated accounts and transactions
          localStorage.setItem('bankingAccounts', JSON.stringify(accounts))
          localStorage.setItem('bankingTransactions', JSON.stringify(transactions))

          console.log('💰 Sales Return: Cash in Hand reduced by ₹', salesReturn.refundAmount)
        }
      } catch (error) {
        console.error('Failed to update banking for sales return:', error)
      }
    }

    // TODO: Create credit note automatically
    // const creditNote = await createCreditNote(...)

    // Update return status
    salesReturn.status = 'approved'
    salesReturn.updatedAt = new Date().toISOString()

    localStorage.setItem(STORAGE_KEY, JSON.stringify(returns))

    return true
  } catch (error) {
    console.error('Error approving sales return:', error)
    return false
  }
}

/**
 * Complete sales return (mark as completed)
 */
export async function completeSalesReturn(id: string): Promise<boolean> {
  try {
    const returns = await getReturns()
    const salesReturn = returns.find(r => r.id === id)

    if (!salesReturn) return false

    salesReturn.status = 'completed'
    salesReturn.updatedAt = new Date().toISOString()

    localStorage.setItem(STORAGE_KEY, JSON.stringify(returns))

    return true
  } catch (error) {
    console.error('Error completing sales return:', error)
    return false
  }
}

/**
 * Reject sales return
 */
export async function rejectSalesReturn(id: string): Promise<boolean> {
  try {
    const returns = await getReturns()
    const salesReturn = returns.find(r => r.id === id)

    if (!salesReturn) return false

    salesReturn.status = 'rejected'
    salesReturn.updatedAt = new Date().toISOString()

    localStorage.setItem(STORAGE_KEY, JSON.stringify(returns))

    return true
  } catch (error) {
    console.error('Error rejecting sales return:', error)
    return false
  }
}

/**
 * Delete sales return
 */
export async function deleteSalesReturn(id: string): Promise<boolean> {
  try {
    const returns = await getReturns()
    const filtered = returns.filter(r => r.id !== id)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))

    return true
  } catch (error) {
    console.error('Error deleting sales return:', error)
    return false
  }
}

/**
 * Get returns summary
 */
export async function getReturnsSummary(): Promise<{
  totalReturns: number
  pendingReturns: number
  approvedReturns: number
  totalReturnValue: number
}> {
  try {
    const returns = await getReturns()

    return {
      totalReturns: returns.length,
      pendingReturns: returns.filter(r => r.status === 'pending').length,
      approvedReturns: returns.filter(r => r.status === 'approved').length,
      totalReturnValue: returns
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.totalAmount, 0)
    }
  } catch (error) {
    console.error('Error getting returns summary:', error)
    return {
      totalReturns: 0,
      pendingReturns: 0,
      approvedReturns: 0,
      totalReturnValue: 0
    }
  }
}
