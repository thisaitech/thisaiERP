/**
 * Credit Note Service
 *
 * Manages credit notes for sales returns and debit notes for purchase returns
 */

import type { CreditNote, Invoice } from '../types'

const STORAGE_KEY = 'creditNotes'

/**
 * Get all credit notes
 */
export async function getCreditNotes(): Promise<CreditNote[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error getting credit notes:', error)
    return []
  }
}

/**
 * Get credit note by ID
 */
export async function getCreditNoteById(id: string): Promise<CreditNote | null> {
  try {
    const creditNotes = await getCreditNotes()
    return creditNotes.find(cn => cn.id === id) || null
  } catch (error) {
    console.error('Error getting credit note:', error)
    return null
  }
}

/**
 * Get credit notes for a specific invoice
 */
export async function getCreditNotesByInvoice(invoiceId: string): Promise<CreditNote[]> {
  try {
    const creditNotes = await getCreditNotes()
    return creditNotes.filter(cn => cn.originalInvoiceId === invoiceId)
  } catch (error) {
    console.error('Error getting credit notes for invoice:', error)
    return []
  }
}

/**
 * Create new credit note
 */
export async function createCreditNote(
  invoice: Invoice,
  data: {
    items: Array<{ itemId: string; quantity: number }>
    reason: CreditNote['reason']
    reasonDescription?: string
    adjustmentType: CreditNote['adjustmentType']
    refundAmount?: number
    refundMode?: CreditNote['refundMode']
  }
): Promise<CreditNote | null> {
  try {
    const creditNotes = await getCreditNotes()

    // Generate credit note number
    const count = creditNotes.length + 1
    const creditNoteNumber = invoice.type === 'sale'
      ? `CN-${String(count).padStart(4, '0')}`
      : `DN-${String(count).padStart(4, '0')}`

    // Calculate items with amounts
    const returnItems = data.items.map(returnItem => {
      const invoiceItem = invoice.items.find(item => item.itemId === returnItem.itemId)
      if (!invoiceItem) throw new Error('Item not found in invoice')

      const quantity = Math.min(returnItem.quantity, invoiceItem.quantity)
      const rate = invoiceItem.rate
      const taxableAmount = rate * quantity
      const cgstAmount = (taxableAmount * invoiceItem.cgstPercent) / 100
      const sgstAmount = (taxableAmount * invoiceItem.sgstPercent) / 100
      const igstAmount = (taxableAmount * invoiceItem.igstPercent) / 100
      const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount

      return {
        ...invoiceItem,
        quantity,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount
      }
    })

    const subtotal = returnItems.reduce((sum, item) => sum + item.taxableAmount, 0)
    const totalTaxAmount = returnItems.reduce((sum, item) =>
      sum + item.cgstAmount + item.sgstAmount + item.igstAmount, 0
    )
    const grandTotal = subtotal + totalTaxAmount

    const creditNote: CreditNote = {
      id: `cn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creditNoteNumber,
      creditNoteDate: new Date().toISOString().split('T')[0],
      type: invoice.type === 'sale' ? 'credit' : 'debit',
      originalInvoiceId: invoice.id,
      originalInvoiceNumber: invoice.invoiceNumber,
      partyId: invoice.partyId,
      partyName: invoice.partyName,
      partyGSTIN: invoice.partyGSTIN,
      items: returnItems,
      reason: data.reason,
      reasonDescription: data.reasonDescription,
      subtotal,
      totalTaxAmount,
      grandTotal,
      adjustmentType: data.adjustmentType,
      refundAmount: data.refundAmount || grandTotal,
      refundMode: data.refundMode,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current_user'
    }

    creditNotes.push(creditNote)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creditNotes))

    return creditNote
  } catch (error) {
    console.error('Error creating credit note:', error)
    return null
  }
}

/**
 * Approve credit note
 */
export async function approveCreditNote(id: string): Promise<boolean> {
  try {
    const creditNotes = await getCreditNotes()
    const index = creditNotes.findIndex(cn => cn.id === id)

    if (index === -1) return false

    const creditNote = creditNotes[index]
    creditNotes[index].status = 'approved'
    creditNotes[index].updatedAt = new Date().toISOString()

    localStorage.setItem(STORAGE_KEY, JSON.stringify(creditNotes))

    // Update banking based on credit note type and refund mode
    if (creditNote.refundAmount && creditNote.refundAmount > 0) {
      try {
        const { updateCashInHand, updateBankAccountBalance, getBankingPageData } = await import('./bankingService')

        // Different logic for Sales Returns vs Purchase Returns
        if (creditNote.type === 'credit') {
          // SALES RETURN (Credit Note) - Money going OUT to customer
          if (creditNote.refundMode === 'cash') {
            // Decrease Cash in Hand
            await updateCashInHand(-creditNote.refundAmount, `Credit Note #${creditNote.creditNoteNumber} - Sales Return`)
          } else if (creditNote.refundMode === 'bank' && creditNote.refundReference) {
            // Decrease Bank Account
            const bankingData = await getBankingPageData()
            if (bankingData && bankingData.bankAccounts) {
              const bankAccount = bankingData.bankAccounts.find((acc: any) =>
                creditNote.refundReference?.includes(acc.accountNo.slice(-4))
              )
              if (bankAccount) {
                await updateBankAccountBalance(bankAccount.id, -creditNote.refundAmount)
              }
            }
          }
        } else if (creditNote.type === 'debit') {
          // PURCHASE RETURN (Debit Note) - Money coming IN from supplier
          // ALWAYS increase Cash in Hand (regardless of refund mode)
          await updateCashInHand(creditNote.refundAmount, `Debit Note #${creditNote.creditNoteNumber} - Purchase Return`)
          console.log('💰 Purchase Return: Cash in Hand increased by ₹', creditNote.refundAmount)
        }
      } catch (bankingError) {
        console.error('Failed to update banking for credit note:', bankingError)
        // Don't fail the entire operation if banking update fails
      }
    }

    // TODO: Update party balance
    // TODO: Update inventory (add back to stock for sales returns)

    return true
  } catch (error) {
    console.error('Error approving credit note:', error)
    return false
  }
}

/**
 * Cancel credit note
 */
export async function cancelCreditNote(id: string): Promise<boolean> {
  try {
    const creditNotes = await getCreditNotes()
    const index = creditNotes.findIndex(cn => cn.id === id)

    if (index === -1) return false

    creditNotes[index].status = 'cancelled'
    creditNotes[index].updatedAt = new Date().toISOString()

    localStorage.setItem(STORAGE_KEY, JSON.stringify(creditNotes))

    return true
  } catch (error) {
    console.error('Error cancelling credit note:', error)
    return false
  }
}

/**
 * Delete credit note
 */
export async function deleteCreditNote(id: string): Promise<boolean> {
  try {
    const creditNotes = await getCreditNotes()
    const filtered = creditNotes.filter(cn => cn.id !== id)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))

    return true
  } catch (error) {
    console.error('Error deleting credit note:', error)
    return false
  }
}

/**
 * Get total credit notes amount for invoice
 */
export async function getTotalCreditNotesForInvoice(invoiceId: string): Promise<number> {
  try {
    const creditNotes = await getCreditNotesByInvoice(invoiceId)
    return creditNotes
      .filter(cn => cn.status === 'approved')
      .reduce((sum, cn) => sum + cn.grandTotal, 0)
  } catch (error) {
    console.error('Error calculating total credit notes:', error)
    return 0
  }
}
