// Proforma Invoice Service
// Handles proforma invoice creation, management, and conversion to regular invoices
// Full GST-compliant implementation with CGST/SGST/IGST calculations

export interface ProformaInvoiceItem {
  id: string
  itemId?: string
  itemName: string
  hsnCode?: string
  description?: string
  quantity: number
  unit: string
  rate: number
  discountPercent?: number
  discountAmount?: number
  taxableAmount: number
  taxRate: number
  cgstRate?: number
  cgstAmount?: number
  sgstRate?: number
  sgstAmount?: number
  igstRate?: number
  igstAmount?: number
  amount: number
}

export interface ProformaInvoice {
  id: string
  proformaNumber: string
  proformaDate: string
  validUntil: string
  // Customer/Party Details
  partyId?: string
  partyName: string
  partyPhone?: string
  partyEmail?: string
  partyGSTIN?: string
  partyAddress?: string
  partyState?: string
  // Seller Details (from settings)
  sellerState?: string
  // Items
  items: ProformaInvoiceItem[]
  // Calculations
  subtotal: number
  discountAmount: number
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalTaxAmount: number
  roundOff: number
  grandTotal: number
  amountInWords?: string
  // Advance & Balance
  advanceReceived: number
  balanceDue: number
  // Additional Info
  notes?: string
  termsAndConditions?: string
  transportDetails?: string
  vehicleNo?: string
  // Status
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
  convertedInvoiceId?: string
  convertedInvoiceNumber?: string
  // Timestamps
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'thisai_crm_proforma_invoices'
const COUNTER_KEY = 'thisai_crm_proforma_counter'

// Generate proforma invoice number (sequential)
export const generateProformaNumber = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  
  // Get or initialize counter
  let counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0')
  counter++
  localStorage.setItem(COUNTER_KEY, counter.toString())
  
  return `PF-${year}-${counter.toString().padStart(4, '0')}`
}

// Convert number to words (Indian format)
export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  if (num === 0) return 'Zero Rupees Only'
  
  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const hundred = Math.floor((num % 1000) / 100)
  const remainder = Math.floor(num % 100)
  
  let words = ''
  
  if (crore > 0) words += (crore < 20 ? ones[crore] : tens[Math.floor(crore / 10)] + ' ' + ones[crore % 10]) + ' Crore '
  if (lakh > 0) words += (lakh < 20 ? ones[lakh] : tens[Math.floor(lakh / 10)] + ' ' + ones[lakh % 10]) + ' Lakh '
  if (thousand > 0) words += (thousand < 20 ? ones[thousand] : tens[Math.floor(thousand / 10)] + ' ' + ones[thousand % 10]) + ' Thousand '
  if (hundred > 0) words += ones[hundred] + ' Hundred '
  if (remainder > 0) {
    if (words) words += 'and '
    words += remainder < 20 ? ones[remainder] : tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10]
  }
  
  return words.trim() + ' Rupees Only'
}

// Calculate GST based on seller and buyer state
export const calculateGST = (
  taxableAmount: number,
  taxRate: number,
  sellerState: string,
  buyerState: string
): { cgst: number; sgst: number; igst: number } => {
  const isInterState = sellerState.toLowerCase() !== buyerState.toLowerCase()
  
  if (isInterState) {
    return { cgst: 0, sgst: 0, igst: taxableAmount * (taxRate / 100) }
  } else {
    const halfRate = taxRate / 2
    return {
      cgst: taxableAmount * (halfRate / 100),
      sgst: taxableAmount * (halfRate / 100),
      igst: 0
    }
  }
}

// Default terms and conditions
export const getDefaultTerms = (): string => {
  return `1. This is a Proforma Invoice, not a Tax Invoice.
2. Prices are valid for 15 days from the date of issue.
3. 50% advance payment required to confirm the order.
4. Delivery within 7-10 working days after confirmation.
5. Goods once sold will not be taken back.
6. Subject to jurisdiction of local courts only.`
}

// Get all proforma invoices
export const getProformaInvoices = async (): Promise<ProformaInvoice[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const invoices = JSON.parse(stored)
      // Check for expired proforma invoices
      const now = new Date()
      return invoices.map((pi: ProformaInvoice) => {
        if (pi.status !== 'converted' && pi.status !== 'rejected' && new Date(pi.validUntil) < now) {
          return { ...pi, status: 'expired' as const }
        }
        return pi
      })
    }
    return []
  } catch (error) {
    console.error('Error loading proforma invoices:', error)
    return []
  }
}

// Create new proforma invoice
export const createProformaInvoice = async (
  data: Omit<ProformaInvoice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProformaInvoice | null> => {
  try {
    const now = new Date().toISOString()
    const newProforma: ProformaInvoice = {
      ...data,
      id: `pi_${Date.now()}`,
      createdAt: now,
      updatedAt: now
    }

    const existing = await getProformaInvoices()
    existing.unshift(newProforma)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))

    return newProforma
  } catch (error) {
    console.error('Error creating proforma invoice:', error)
    return null
  }
}

// Update proforma invoice
export const updateProformaInvoice = async (
  id: string,
  updates: Partial<ProformaInvoice>
): Promise<boolean> => {
  try {
    const invoices = await getProformaInvoices()
    const index = invoices.findIndex(pi => pi.id === id)
    
    if (index === -1) return false

    invoices[index] = {
      ...invoices[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices))
    return true
  } catch (error) {
    console.error('Error updating proforma invoice:', error)
    return false
  }
}

// Update proforma invoice status
export const updateProformaStatus = async (
  id: string,
  status: ProformaInvoice['status'],
  convertedInvoiceId?: string,
  convertedInvoiceNumber?: string
): Promise<boolean> => {
  return updateProformaInvoice(id, { 
    status, 
    convertedInvoiceId, 
    convertedInvoiceNumber 
  })
}

// Delete proforma invoice
export const deleteProformaInvoice = async (id: string): Promise<boolean> => {
  try {
    const invoices = await getProformaInvoices()
    const filtered = invoices.filter(pi => pi.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting proforma invoice:', error)
    return false
  }
}

// Get single proforma invoice by ID
export const getProformaInvoiceById = async (id: string): Promise<ProformaInvoice | null> => {
  const invoices = await getProformaInvoices()
  return invoices.find(pi => pi.id === id) || null
}

// Convert proforma to regular invoice (returns data to be used for invoice creation)
export const convertToInvoice = async (id: string): Promise<{
  partyName: string
  partyPhone?: string
  partyEmail?: string
  partyGSTIN?: string
  items: ProformaInvoiceItem[]
  notes?: string
} | null> => {
  const proforma = await getProformaInvoiceById(id)
  if (!proforma || proforma.status === 'converted') {
    return null
  }

  return {
    partyName: proforma.partyName,
    partyPhone: proforma.partyPhone,
    partyEmail: proforma.partyEmail,
    partyGSTIN: proforma.partyGSTIN,
    items: proforma.items,
    notes: proforma.notes
  }
}

// Get proforma invoice stats
export const getProformaStats = async (): Promise<{
  total: number
  draft: number
  sent: number
  accepted: number
  rejected: number
  expired: number
  converted: number
  totalValue: number
}> => {
  const invoices = await getProformaInvoices()
  
  return {
    total: invoices.length,
    draft: invoices.filter(pi => pi.status === 'draft').length,
    sent: invoices.filter(pi => pi.status === 'sent').length,
    accepted: invoices.filter(pi => pi.status === 'accepted').length,
    rejected: invoices.filter(pi => pi.status === 'rejected').length,
    expired: invoices.filter(pi => pi.status === 'expired').length,
    converted: invoices.filter(pi => pi.status === 'converted').length,
    totalValue: invoices.reduce((sum, pi) => sum + pi.grandTotal, 0)
  }
}

