/**
 * Credit Note Service
 *
 * Manages credit notes for sales returns and debit notes for purchase returns
 */

import type { CreditNote, Invoice } from '../types'
import { db, isFirebaseReady } from './firebase'
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore'

/**
 * Get all credit notes
 */
export async function getCreditNotes(): Promise<CreditNote[]> {
  if (!isFirebaseReady() || !db) {
    console.warn('Firebase not ready for getCreditNotes')
    return []
  }
  try {
    const q = query(collection(db, 'credit_notes'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditNote));
  } catch (error) {
    console.error('Error getting credit notes:', error)
    return []
  }
}

/**
 * Get credit note by ID
 */
export async function getCreditNoteById(id: string): Promise<CreditNote | null> {
  if (!isFirebaseReady() || !db) {
    console.warn('Firebase not ready for getCreditNoteById')
    return null
  }
  try {
    const docRef = doc(db, 'credit_notes', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as CreditNote : null;
  } catch (error) {
    console.error('Error getting credit note:', error)
    return null
  }
}

/**
 * Get credit notes for a specific invoice
 */
export async function getCreditNotesByInvoice(invoiceId: string): Promise<CreditNote[]> {
  if (!isFirebaseReady() || !db) {
    console.warn('Firebase not ready for getCreditNotesByInvoice')
    return []
  }
  try {
    const q = query(collection(db, 'credit_notes'), where('originalInvoiceId', '==', invoiceId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditNote));
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
  if (!isFirebaseReady() || !db) {
    console.error('Firebase not ready for createCreditNote')
    return null
  }
  try {
    const creditNotesSnapshot = await getDocs(collection(db, 'credit_notes'));
    const count = creditNotesSnapshot.size + 1;

    const creditNoteNumber = invoice.type === 'sale'
      ? `CN-${String(count).padStart(4, '0')}`
      : `DN-${String(count).padStart(4, '0')}`;

    // ... (rest of the calculation logic is the same)
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

    const newCreditNoteData = {
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
      createdBy: 'current_user' // Replace with actual user ID
    };

    const docRef = await addDoc(collection(db, 'credit_notes'), newCreditNoteData);

    return { id: docRef.id, ...newCreditNoteData } as CreditNote;
  } catch (error) {
    console.error('Error creating credit note:', error)
    return null
  }
}


/**
 * Approve credit note
 */
export async function approveCreditNote(id: string): Promise<boolean> {
  if (!isFirebaseReady() || !db) {
    console.error('Firebase not ready for approveCreditNote')
    return false
  }
  const creditNoteRef = doc(db, 'credit_notes', id);
  try {
    const creditNoteSnap = await getDoc(creditNoteRef);
    if (!creditNoteSnap.exists()) {
      console.error('Credit note not found for approval');
      return false;
    }
    const creditNote = creditNoteSnap.data() as CreditNote;

    // 1. Update credit note status
    await updateDoc(creditNoteRef, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    });

    // 2. Update party balance
    if (creditNote.partyId) {
      try {
        const partyRef = doc(db, 'parties', creditNote.partyId);
        const partySnap = await getDoc(partyRef);
        if (partySnap.exists()) {
          const partyData = partySnap.data();
          const currentBalance = partyData.balance || 0;
          // For a sales return (credit note), the customer's balance decreases (they owe less).
          // For a purchase return (debit note), the supplier's balance also decreases (we owe them less).
          const newBalance = currentBalance - creditNote.grandTotal;
          await updateDoc(partyRef, { balance: newBalance });
        }
      } catch (e) {
        console.error(`Failed to update balance for party ${creditNote.partyId}`, e);
        // Continue despite failure
      }
    }

    // 3. Update inventory stock (only for sales returns)
    if (creditNote.type === 'credit') {
      for (const item of creditNote.items) {
        if (item.itemId) {
          try {
            const itemRef = doc(db, 'items', item.itemId);
            const itemSnap = await getDoc(itemRef);
            if (itemSnap.exists()) {
              const currentStock = itemSnap.data().stockQty || 0;
              const newStock = currentStock + item.quantity;
              await updateDoc(itemRef, { stockQty: newStock });
            }
          } catch(e) {
            console.error(`Failed to update stock for item ${item.itemId}`, e);
            // Continue despite failure
          }
        }
      }
    }

    // 4. Update banking (existing logic)
    if (creditNote.refundAmount && creditNote.refundAmount > 0) {
      // This logic can be brittle. It's kept as is, but might need future refactoring.
      try {
        const { updateCashInHand, updateBankAccountBalance, getBankingPageData } = await import('./bankingService');
        if (creditNote.type === 'credit') {
          if (creditNote.refundMode === 'cash') {
            await updateCashInHand(-creditNote.refundAmount, `Credit Note #${creditNote.creditNoteNumber}`);
          } else if (creditNote.refundMode === 'bank' && creditNote.refundReference) {
            const bankingData = await getBankingPageData();
            if (bankingData && bankingData.bankAccounts) {
              const bankAccount = bankingData.bankAccounts.find((acc: any) => creditNote.refundReference?.includes(acc.accountNo.slice(-4)));
              if (bankAccount) await updateBankAccountBalance(bankAccount.id, -creditNote.refundAmount);
            }
          }
        } else if (creditNote.type === 'debit') {
          await updateCashInHand(creditNote.refundAmount, `Debit Note #${creditNote.creditNoteNumber}`);
        }
      } catch (bankingError) {
        console.error('Failed to update banking for credit note:', bankingError);
      }
    }

    return true;
  } catch (error) {
    console.error('Error approving credit note:', error);
    return false;
  }
}

/**
 * Cancel credit note
 */
export async function cancelCreditNote(id: string): Promise<boolean> {
  if (!isFirebaseReady() || !db) {
    console.error('Firebase not ready for cancelCreditNote')
    return false
  }
  const creditNoteRef = doc(db, 'credit_notes', id);
  try {
    await updateDoc(creditNoteRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error cancelling credit note:', error);
    return false;
  }
}

/**
 * Delete credit note
 */
export async function deleteCreditNote(id: string): Promise<boolean> {
  if (!isFirebaseReady() || !db) {
    console.error('Firebase not ready for deleteCreditNote')
    return false
  }
  const creditNoteRef = doc(db, 'credit_notes', id);
  try {
    // Note: This is a hard delete. Consider a soft delete by setting a 'deleted' flag instead.
    // Also, this does not reverse balance or stock adjustments. A 'cancel' is usually safer.
    await deleteDoc(creditNoteRef);
    return true;
  } catch (error) {
    console.error('Error deleting credit note:', error);
    return false;
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
