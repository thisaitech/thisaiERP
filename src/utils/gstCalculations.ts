// GST Calculation Utilities for Indian Tax System
// Handles CGST, SGST, and IGST based on seller and customer states

export interface GSTBreakdown {
  isBusiness: boolean // true if customer has GSTIN (B2B), false for B2C
  isIntraState: boolean // true if seller and customer in same state
  cgst: number
  sgst: number
  igst: number
  totalGst: number
}

export interface TaxCalculationInput {
  taxableAmount: number
  gstRate: number
  sellerState: string
  customerState: string
  customerGSTIN?: string
}

export interface ItemTaxBreakdown {
  taxableAmount: number
  cgstPercent: number
  cgstAmount: number
  sgstPercent: number
  sgstAmount: number
  igstPercent: number
  igstAmount: number
  totalTaxAmount: number
}

/**
 * Determine if customer is B2B or B2C
 * B2B = has valid GSTIN
 * B2C = no GSTIN or empty GSTIN
 */
export function isB2BTransaction(customerGSTIN?: string): boolean {
  return !!(customerGSTIN && customerGSTIN.trim().length > 0)
}

/**
 * Determine if transaction is intra-state or inter-state
 * Intra-state = same state (use CGST + SGST)
 * Inter-state = different state (use IGST)
 */
export function isIntraStateTransaction(sellerState: string, customerState: string): boolean {
  // If seller state is not provided, cannot determine - default to intrastate
  if (!sellerState || sellerState.trim() === '') {
    console.warn('⚠️ Seller state not provided - Please set your company state in Settings')
    return true
  }

  // If customer state is not provided, assume customer is in same state as seller (walk-in/local customer)
  // This is standard behavior for B2C transactions without customer state
  if (!customerState || customerState.trim() === '') {
    console.log(`📍 No customer state - Assuming local customer in ${sellerState} (CGST+SGST)`)
    return true
  }

  // Normalize state names (trim, lowercase, remove special chars)
  const normalize = (state: string) =>
    state.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

  const normalizedSeller = normalize(sellerState)
  const normalizedCustomer = normalize(customerState)

  const isIntra = normalizedSeller === normalizedCustomer

  console.log(`🔍 Tax Type: Seller="${sellerState}" vs Customer="${customerState}" → ${isIntra ? 'INTRASTATE (CGST+SGST)' : 'INTERSTATE (IGST)'}`)

  return isIntra
}

/**
 * Calculate GST breakdown for an amount
 * Returns CGST, SGST, or IGST based on seller/customer states
 */
export function calculateGSTBreakdown(input: TaxCalculationInput): ItemTaxBreakdown {
  const { taxableAmount, gstRate, sellerState, customerState } = input

  const isIntraState = isIntraStateTransaction(sellerState, customerState)

  if (isIntraState) {
    // Intra-state: Split GST into CGST + SGST (equal halves)
    const halfRate = gstRate / 2
    const cgstAmount = (taxableAmount * halfRate) / 100
    const sgstAmount = (taxableAmount * halfRate) / 100

    return {
      taxableAmount,
      cgstPercent: halfRate,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstPercent: halfRate,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstPercent: 0,
      igstAmount: 0,
      totalTaxAmount: Math.round((cgstAmount + sgstAmount) * 100) / 100
    }
  } else {
    // Inter-state: Use IGST only
    const igstAmount = (taxableAmount * gstRate) / 100

    return {
      taxableAmount,
      cgstPercent: 0,
      cgstAmount: 0,
      sgstPercent: 0,
      sgstAmount: 0,
      igstPercent: gstRate,
      igstAmount: Math.round(igstAmount * 100) / 100,
      totalTaxAmount: Math.round(igstAmount * 100) / 100
    }
  }
}

/**
 * Get GST breakdown summary for display
 */
export function getGSTSummary(
  sellerState: string,
  customerState: string,
  customerGSTIN?: string
): GSTBreakdown {
  const isBusiness = isB2BTransaction(customerGSTIN)
  const isIntraState = isIntraStateTransaction(sellerState, customerState)

  return {
    isBusiness,
    isIntraState,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalGst: 0
  }
}

/**
 * Calculate total GST from multiple items
 */
export function sumGSTFromItems(items: ItemTaxBreakdown[]): {
  totalCGST: number
  totalSGST: number
  totalIGST: number
  totalGST: number
} {
  const totalCGST = items.reduce((sum, item) => sum + item.cgstAmount, 0)
  const totalSGST = items.reduce((sum, item) => sum + item.sgstAmount, 0)
  const totalIGST = items.reduce((sum, item) => sum + item.igstAmount, 0)
  const totalGST = totalCGST + totalSGST + totalIGST

  return {
    totalCGST: Math.round(totalCGST * 100) / 100,
    totalSGST: Math.round(totalSGST * 100) / 100,
    totalIGST: Math.round(totalIGST * 100) / 100,
    totalGST: Math.round(totalGST * 100) / 100
  }
}

/**
 * Format GST display text
 */
export function formatGSTDisplay(
  isIntraState: boolean,
  isBusiness: boolean
): string {
  if (isIntraState) {
    return isBusiness
      ? 'B2B Invoice (Intra-State) - CGST + SGST'
      : 'B2C Invoice (Intra-State) - CGST + SGST'
  } else {
    return isBusiness
      ? 'B2B Invoice (Inter-State) - IGST'
      : 'B2C Invoice (Inter-State) - IGST'
  }
}

/**
 * Validate if HSN is required
 * HSN is mandatory for B2B transactions, optional for B2C
 */
export function isHSNRequired(customerGSTIN?: string): boolean {
  return isB2BTransaction(customerGSTIN)
}

/**
 * Get tax display breakdown for invoice
 */
export function getTaxDisplayBreakdown(
  cgstAmount: number,
  sgstAmount: number,
  igstAmount: number,
  isIntraState: boolean
): Array<{ label: string; amount: number }> {
  const breakdown: Array<{ label: string; amount: number }> = []

  if (isIntraState) {
    if (cgstAmount > 0) {
      breakdown.push({ label: 'CGST', amount: cgstAmount })
    }
    if (sgstAmount > 0) {
      breakdown.push({ label: 'SGST', amount: sgstAmount })
    }
  } else {
    if (igstAmount > 0) {
      breakdown.push({ label: 'IGST', amount: igstAmount })
    }
  }

  return breakdown
}
