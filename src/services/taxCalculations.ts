// GST Tax Calculation Service
// Handles CGST, SGST, IGST calculations based on Indian GST rules

import type { ItemTax } from '../types'

export interface TaxCalculationInput {
  amount: number
  taxRate: number // Total tax rate (e.g., 18 for 18%)
  quantity?: number
  discount?: number
  sellerStateCode: string
  buyerStateCode: string
}

export interface TaxCalculationResult {
  taxableAmount: number
  cgst: number
  cgstAmount: number
  sgst: number
  sgstAmount: number
  igst: number
  igstAmount: number
  totalTax: number
  totalAmount: number
}

/**
 * Calculate GST based on state codes
 * CGST + SGST for intrastate transactions (same state)
 * IGST for interstate transactions (different states)
 */
export function calculateGST(input: TaxCalculationInput): TaxCalculationResult {
  const {
    amount,
    taxRate,
    quantity = 1,
    discount = 0,
    sellerStateCode,
    buyerStateCode
  } = input

  // Calculate taxable amount
  const baseAmount = amount * quantity
  const taxableAmount = baseAmount - discount

  // Check if intrastate or interstate
  const isIntrastate = sellerStateCode === buyerStateCode

  let cgst = 0
  let cgstAmount = 0
  let sgst = 0
  let sgstAmount = 0
  let igst = 0
  let igstAmount = 0

  if (isIntrastate) {
    // Intrastate: Split tax equally between CGST and SGST
    cgst = taxRate / 2
    sgst = taxRate / 2
    cgstAmount = (taxableAmount * cgst) / 100
    sgstAmount = (taxableAmount * sgst) / 100
  } else {
    // Interstate: Full tax as IGST
    igst = taxRate
    igstAmount = (taxableAmount * igst) / 100
  }

  const totalTax = cgstAmount + sgstAmount + igstAmount
  const totalAmount = taxableAmount + totalTax

  return {
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    cgst: parseFloat(cgst.toFixed(2)),
    cgstAmount: parseFloat(cgstAmount.toFixed(2)),
    sgst: parseFloat(sgst.toFixed(2)),
    sgstAmount: parseFloat(sgstAmount.toFixed(2)),
    igst: parseFloat(igst.toFixed(2)),
    igstAmount: parseFloat(igstAmount.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2))
  }
}

/**
 * Calculate tax from item details
 */
export function calculateItemTax(
  rate: number,
  quantity: number,
  itemTax: ItemTax,
  sellerStateCode: string,
  buyerStateCode: string,
  discount = 0
): TaxCalculationResult {
  const isIntrastate = sellerStateCode === buyerStateCode
  const taxRate = isIntrastate ? itemTax.cgst + itemTax.sgst : itemTax.igst

  return calculateGST({
    amount: rate,
    taxRate,
    quantity,
    discount,
    sellerStateCode,
    buyerStateCode
  })
}

/**
 * Calculate reverse GST (get taxable amount from total amount including tax)
 */
export function reverseGST(
  totalAmount: number,
  taxRate: number,
  sellerStateCode: string,
  buyerStateCode: string
): TaxCalculationResult {
  // totalAmount = taxableAmount + (taxableAmount * taxRate / 100)
  // totalAmount = taxableAmount * (1 + taxRate / 100)
  // taxableAmount = totalAmount / (1 + taxRate / 100)

  const taxableAmount = totalAmount / (1 + taxRate / 100)

  return calculateGST({
    amount: taxableAmount,
    taxRate,
    sellerStateCode,
    buyerStateCode
  })
}

/**
 * Validate GSTIN format
 * Format: 22AAAAA0000A1Z5
 * - First 2 digits: State code
 * - Next 10 characters: PAN
 * - 13th character: Entity number
 * - 14th character: Z (default)
 * - 15th character: Checksum
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false

  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinPattern.test(gstin)
}

/**
 * Extract state code from GSTIN
 */
export function getStateCodeFromGSTIN(gstin: string): string {
  if (!validateGSTIN(gstin)) return ''
  return gstin.substring(0, 2)
}

/**
 * Get state name from state code
 */
export function getStateName(stateCode: string): string {
  const stateMap: Record<string, string> = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra and Nagar Haveli and Daman and Diu',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
    '97': 'Other Territory'
  }

  return stateMap[stateCode] || 'Unknown'
}

/**
 * Calculate round-off amount
 * Indian practice: Round to nearest rupee
 */
export function calculateRoundOff(amount: number): number {
  const rounded = Math.round(amount)
  return parseFloat((rounded - amount).toFixed(2))
}

/**
 * Apply round-off to final amount
 */
export function applyRoundOff(amount: number): { amount: number; roundOff: number } {
  const roundOff = calculateRoundOff(amount)
  return {
    amount: parseFloat((amount + roundOff).toFixed(2)),
    roundOff
  }
}

/**
 * Calculate invoice totals
 */
export interface InvoiceTotalsInput {
  items: Array<{
    amount: number
    cgstAmount: number
    sgstAmount: number
    igstAmount: number
  }>
  shippingCharges?: number
  otherCharges?: number
  discount?: number
}

export interface InvoiceTotals {
  subtotal: number
  discount: number
  taxableAmount: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  totalTax: number
  shippingCharges: number
  otherCharges: number
  grandTotalBeforeRoundOff: number
  roundOff: number
  grandTotal: number
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const {
    items,
    shippingCharges = 0,
    otherCharges = 0,
    discount = 0
  } = input

  // Calculate subtotal (sum of all item amounts before tax)
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)

  // Taxable amount after discount
  const taxableAmount = subtotal - discount

  // Calculate tax totals
  const cgstTotal = items.reduce((sum, item) => sum + item.cgstAmount, 0)
  const sgstTotal = items.reduce((sum, item) => sum + item.sgstAmount, 0)
  const igstTotal = items.reduce((sum, item) => sum + item.igstAmount, 0)
  const totalTax = cgstTotal + sgstTotal + igstTotal

  // Grand total before round-off
  const grandTotalBeforeRoundOff = taxableAmount + totalTax + shippingCharges + otherCharges

  // Apply round-off
  const { amount: grandTotal, roundOff } = applyRoundOff(grandTotalBeforeRoundOff)

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    cgstTotal: parseFloat(cgstTotal.toFixed(2)),
    sgstTotal: parseFloat(sgstTotal.toFixed(2)),
    igstTotal: parseFloat(igstTotal.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    shippingCharges: parseFloat(shippingCharges.toFixed(2)),
    otherCharges: parseFloat(otherCharges.toFixed(2)),
    grandTotalBeforeRoundOff: parseFloat(grandTotalBeforeRoundOff.toFixed(2)),
    roundOff,
    grandTotal
  }
}

/**
 * Get standard GST rates in India
 */
export const GST_RATES = {
  EXEMPT: 0,
  RATE_5: 5,
  RATE_12: 12,
  RATE_18: 18,
  RATE_28: 28
} as const

/**
 * Get tax slab for a tax rate
 */
export function getTaxSlab(taxRate: number): string {
  if (taxRate === 0) return 'Exempt'
  if (taxRate === 5) return '5%'
  if (taxRate === 12) return '12%'
  if (taxRate === 18) return '18%'
  if (taxRate === 28) return '28%'
  return `${taxRate}%`
}
