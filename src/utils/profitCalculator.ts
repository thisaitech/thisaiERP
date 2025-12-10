/**
 * Profit Margin Calculator Utility
 *
 * Calculates profit margins for individual items and invoices
 * Essential for retail businesses to track profitability per sale
 */

import type { InvoiceItem, Invoice } from '../types'

/**
 * Calculate profit for a single invoice item
 * @param sellingPrice - Rate at which item is sold
 * @param purchasePrice - Cost price of the item
 * @param quantity - Quantity sold
 * @returns Object containing profit amount and percentage
 */
export function calculateItemProfit(
  sellingPrice: number,
  purchasePrice: number,
  quantity: number = 1
): { profitMargin: number; profitPercent: number } {
  if (!purchasePrice || purchasePrice === 0) {
    return { profitMargin: 0, profitPercent: 0 }
  }

  const profitPerUnit = sellingPrice - purchasePrice
  const profitMargin = profitPerUnit * quantity
  const profitPercent = (profitPerUnit / sellingPrice) * 100

  return {
    profitMargin: Math.round(profitMargin * 100) / 100, // Round to 2 decimals
    profitPercent: Math.round(profitPercent * 100) / 100
  }
}

/**
 * Calculate total profit for an invoice (all items combined)
 * @param items - Array of invoice items with purchase prices
 * @param grandTotal - Invoice grand total
 * @returns Object containing total profit and percentage
 */
export function calculateInvoiceProfit(
  items: InvoiceItem[],
  grandTotal: number
): { totalProfit: number; totalProfitPercent: number } {
  let totalProfit = 0

  for (const item of items) {
    if (item.purchasePrice && item.purchasePrice > 0) {
      const { profitMargin } = calculateItemProfit(
        item.rate,
        item.purchasePrice,
        item.quantity
      )
      totalProfit += profitMargin
    }
  }

  const totalProfitPercent = grandTotal > 0 ? (totalProfit / grandTotal) * 100 : 0

  return {
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalProfitPercent: Math.round(totalProfitPercent * 100) / 100
  }
}

/**
 * Add profit calculations to invoice item
 * @param item - Invoice item
 * @param purchasePrice - Purchase price of the item
 * @returns Invoice item with profit fields added
 */
export function addProfitToInvoiceItem(
  item: InvoiceItem,
  purchasePrice?: number
): InvoiceItem {
  if (!purchasePrice || purchasePrice === 0) {
    return item
  }

  const { profitMargin, profitPercent } = calculateItemProfit(
    item.rate,
    purchasePrice,
    item.quantity
  )

  return {
    ...item,
    purchasePrice,
    profitMargin,
    profitPercent
  }
}

/**
 * Add profit calculations to entire invoice
 * @param invoice - Invoice object
 * @returns Invoice with profit fields added
 */
export function addProfitToInvoice(invoice: Invoice): Invoice {
  // Only calculate profit for sales invoices
  if (invoice.type !== 'sale') {
    return invoice
  }

  const { totalProfit, totalProfitPercent } = calculateInvoiceProfit(
    invoice.items,
    invoice.grandTotal
  )

  return {
    ...invoice,
    totalProfit,
    totalProfitPercent
  }
}

/**
 * Format profit margin for display
 * @param profitMargin - Profit amount
 * @param profitPercent - Profit percentage
 * @returns Formatted string with emoji indicator
 */
export function formatProfitDisplay(
  profitMargin: number,
  profitPercent: number
): string {
  const emoji = profitMargin >= 0 ? '📈' : '📉'
  const sign = profitMargin >= 0 ? '+' : ''
  return `${emoji} ${sign}₹${profitMargin.toFixed(2)} (${profitPercent.toFixed(1)}%)`
}

/**
 * Get profit margin color class based on percentage
 * @param profitPercent - Profit percentage
 * @returns Tailwind color class
 */
export function getProfitColorClass(profitPercent: number): string {
  if (profitPercent >= 30) return 'text-success' // Excellent
  if (profitPercent >= 20) return 'text-green-500' // Good
  if (profitPercent >= 10) return 'text-warning' // Average
  if (profitPercent >= 0) return 'text-orange-500' // Low
  return 'text-destructive' // Loss
}

/**
 * Get profit margin status text
 * @param profitPercent - Profit percentage
 * @returns Status text
 */
export function getProfitStatus(profitPercent: number): string {
  if (profitPercent >= 30) return 'Excellent'
  if (profitPercent >= 20) return 'Good'
  if (profitPercent >= 10) return 'Average'
  if (profitPercent >= 0) return 'Low'
  return 'Loss'
}
