// GST Tax Calculator - Inclusive/Exclusive Logic
// 100% GST Compliant (Section 15 CGST Act)
// Matches Vyapar, Zoho Books, myBillBook logic

export interface TaxCalculationResult {
  base: number // Exclusive base price (for GSTR-1/inventory)
  gst: number // Total GST amount
  cgst: number // CGST amount
  sgst: number // SGST amount
  igst: number // IGST amount
  total: number // Final amount (base + gst)
  taxableValue: number // For GSTR-1 (always base)
  inclusive: boolean // Whether it was calculated from inclusive price
}

/**
 * MAIN FUNCTION: Calculate GST based on tax mode
 *
 * @param price - The price entered by user
 * @param gstRate - GST rate percentage (0, 5, 12, 18, 28)
 * @param taxMode - 'inclusive' or 'exclusive'
 * @param isInterstate - true for IGST, false for CGST+SGST
 * @returns Tax calculation breakdown
 *
 * Examples:
 * - calculateTax(68, 5, 'inclusive') → { base: 64.76, gst: 3.24, total: 68.00 }
 * - calculateTax(68, 5, 'exclusive') → { base: 68.00, gst: 3.40, total: 71.40 }
 */
export function calculateTax(
  price: number,
  gstRate: number,
  taxMode: 'inclusive' | 'exclusive' = 'exclusive',
  isInterstate: boolean = false
): TaxCalculationResult {

  let base: number
  let gst: number
  let total: number

  if (taxMode === 'inclusive') {
    // Inclusive: User enters final amount (₹100)
    // Formula: Base = Total ÷ (1 + GST%/100)
    base = price / (1 + gstRate / 100)
    gst = price - base
    total = price
  } else {
    // Exclusive: User enters base amount (₹100)
    // Formula: GST = Base × (GST%/100)
    base = price
    gst = price * (gstRate / 100)
    total = price + gst
  }

  // Round to 2 decimal places (Indian currency standard)
  base = parseFloat(base.toFixed(2))
  gst = parseFloat(gst.toFixed(2))
  total = parseFloat(total.toFixed(2))

  // Split GST into CGST/SGST or IGST
  let cgst = 0
  let sgst = 0
  let igst = 0

  if (isInterstate) {
    // Interstate: IGST only
    igst = gst
  } else {
    // Intrastate: CGST + SGST (split 50-50)
    cgst = parseFloat((gst / 2).toFixed(2))
    sgst = parseFloat((gst / 2).toFixed(2))

    // Handle rounding: if cgst + sgst doesn't equal gst, adjust sgst
    const diff = gst - (cgst + sgst)
    if (diff !== 0) {
      sgst = parseFloat((sgst + diff).toFixed(2))
    }
  }

  return {
    base,
    gst,
    cgst,
    sgst,
    igst,
    total,
    taxableValue: base, // For GSTR-1 (always exclusive base)
    inclusive: taxMode === 'inclusive'
  }
}

/**
 * Calculate base price from inclusive price
 * Quick helper when you just need the base
 */
export function getBaseFromInclusive(inclusivePrice: number, gstRate: number): number {
  const base = inclusivePrice / (1 + gstRate / 100)
  return parseFloat(base.toFixed(2))
}

/**
 * Calculate total from exclusive price
 * Quick helper when you just need the total
 */
export function getTotalFromExclusive(exclusivePrice: number, gstRate: number): number {
  const gst = exclusivePrice * (gstRate / 100)
  const total = exclusivePrice + gst
  return parseFloat(total.toFixed(2))
}

/**
 * Get GST rate from tax object
 * Helper to extract total GST% from ItemTax
 */
export function getTotalGSTRate(tax: { cgst: number; sgst: number; igst: number }): number {
  if (tax.igst > 0) {
    return tax.igst
  }
  return tax.cgst + tax.sgst
}

/**
 * Format tax breakdown for display
 * Example: "Base: ₹95.24 | GST @5%: ₹4.76 | Total: ₹100.00"
 */
export function formatTaxBreakdown(result: TaxCalculationResult, gstRate: number): string {
  if (result.inclusive) {
    return `Price entered is GST Inclusive\nBase Value: ₹${result.base.toFixed(2)} | GST @${gstRate}%: ₹${result.gst.toFixed(2)} | Total: ₹${result.total.toFixed(2)}`
  } else {
    return `Base Value: ₹${result.base.toFixed(2)} + GST @${gstRate}%: ₹${result.gst.toFixed(2)} = Total: ₹${result.total.toFixed(2)}`
  }
}

/**
 * Validate and auto-fix tax mode on item save
 * Ensures base prices are always calculated
 */
export function validateAndCalculateItemPrices(
  sellingPrice: number,
  purchasePrice: number,
  gstRate: number,
  taxMode: 'inclusive' | 'exclusive' = 'exclusive',
  purchaseTaxMode: 'inclusive' | 'exclusive' = 'exclusive'
): {
  sellingPrice: number
  purchasePrice: number
  baseSellingPrice: number
  basePurchasePrice: number
} {
  const sellingResult = calculateTax(sellingPrice, gstRate, taxMode)
  const purchaseResult = calculateTax(purchasePrice, gstRate, purchaseTaxMode)

  return {
    sellingPrice: sellingResult.total,
    purchasePrice: purchaseResult.total,
    baseSellingPrice: sellingResult.base,
    basePurchasePrice: purchaseResult.base
  }
}
