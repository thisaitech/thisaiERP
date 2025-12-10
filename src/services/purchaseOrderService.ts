// Purchase Order Service
// Manage purchase orders to suppliers

import { db, COLLECTIONS, isFirebaseReady } from './firebase'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore'

const LOCAL_STORAGE_KEY = 'thisai_crm_purchase_orders'

export interface PurchaseOrder {
  id: string
  poNumber: string
  poDate: string
  supplierName: string
  supplierPhone?: string
  supplierEmail?: string
  supplierGSTIN?: string
  items: PurchaseOrderItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'received' | 'cancelled'
  deliveryDate?: string
  paymentTerms?: string
  notes?: string
  approvedBy?: string
  approvedDate?: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderItem {
  id: string
  itemName: string
  description?: string
  quantity: number
  unit: string
  rate: number
  taxRate: number
  amount: number
}

/**
 * Generate PO number
 */
export function generatePONumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `PO-${year}${month}-${random}`
}

/**
 * Create purchase order
 */
export async function createPurchaseOrder(
  poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PurchaseOrder | null> {
  const now = new Date().toISOString()
  const newPO: Omit<PurchaseOrder, 'id'> = {
    ...poData,
    createdAt: now,
    updatedAt: now
  }

  if (!isFirebaseReady()) {
    const id = `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const po = { ...newPO, id }
    savePOToLocalStorage(po)
    return po
  }

  try {
    const docRef = await addDoc(collection(db!, COLLECTIONS.PURCHASE_ORDERS), newPO)
    return { ...newPO, id: docRef.id }
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return null
  }
}

/**
 * Get all purchase orders
 */
export async function getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  if (!isFirebaseReady()) {
    const pos = getPOsFromLocalStorage()
    return status ? pos.filter(po => po.status === status) : pos
  }

  try {
    let q = query(collection(db!, COLLECTIONS.PURCHASE_ORDERS), orderBy('poDate', 'desc'))
    if (status) {
      q = query(collection(db!, COLLECTIONS.PURCHASE_ORDERS), where('status', '==', status), orderBy('poDate', 'desc'))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder))
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return getPOsFromLocalStorage()
  }
}

/**
 * Update purchase order status
 */
export async function updatePOStatus(
  id: string,
  status: PurchaseOrder['status'],
  approvedBy?: string
): Promise<boolean> {
  const updates: any = {
    status,
    updatedAt: new Date().toISOString()
  }

  if (approvedBy && (status === 'approved' || status === 'rejected')) {
    updates.approvedBy = approvedBy
    updates.approvedDate = new Date().toISOString()
  }

  if (!isFirebaseReady()) {
    return updatePOInLocalStorage(id, updates)
  }

  try {
    const poRef = doc(db!, COLLECTIONS.PURCHASE_ORDERS, id)
    await updateDoc(poRef, updates)
    return true
  } catch (error) {
    console.error('Error updating purchase order:', error)
    return false
  }
}

/**
 * Delete purchase order
 */
export async function deletePurchaseOrder(id: string): Promise<boolean> {
  if (!isFirebaseReady()) {
    return deletePOFromLocalStorage(id)
  }

  try {
    await deleteDoc(doc(db!, COLLECTIONS.PURCHASE_ORDERS, id))
    return true
  } catch (error) {
    console.error('Error deleting purchase order:', error)
    return false
  }
}

/**
 * Convert PO to purchase invoice
 */
export function convertPOToPurchase(po: PurchaseOrder): any {
  return {
    type: 'purchase',
    invoiceNumber: `INV-${Date.now()}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    partyName: po.supplierName,
    partyPhone: po.supplierPhone,
    partyEmail: po.supplierEmail,
    partyGSTIN: po.supplierGSTIN,
    items: po.items.map((item, index) => ({
      id: `item_${index}`,
      description: item.itemName,
      hsn: '',
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      discount: 0,
      taxRate: item.taxRate,
      amount: item.amount
    })),
    subtotal: po.subtotal,
    discountAmount: 0,
    totalTaxAmount: po.taxAmount,
    grandTotal: po.totalAmount,
    payment: {
      mode: 'bank' as const,
      status: 'pending' as const,
      paidAmount: 0,
      dueAmount: po.totalAmount
    },
    notes: `Converted from PO: ${po.poNumber}`,
    createdBy: 'user'
  }
}

// LocalStorage functions
function savePOToLocalStorage(po: PurchaseOrder): void {
  const pos = getPOsFromLocalStorage()
  pos.push(po)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pos))
}

function getPOsFromLocalStorage(): PurchaseOrder[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

function updatePOInLocalStorage(id: string, updates: Partial<PurchaseOrder>): boolean {
  const pos = getPOsFromLocalStorage()
  const index = pos.findIndex(p => p.id === id)
  if (index !== -1) {
    pos[index] = { ...pos[index], ...updates }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pos))
    return true
  }
  return false
}

function deletePOFromLocalStorage(id: string): boolean {
  const pos = getPOsFromLocalStorage()
  const filtered = pos.filter(p => p.id !== id)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
  return true
}
