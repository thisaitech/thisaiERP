/**
 * Invoice Number Generator for Indian Financial Year (April - March)
 *
 * Format: INV/FY/XXXX
 * Example: INV/2024-25/0001
 *
 * Financial Year Logic:
 * - April to March is one financial year
 * - If current month is Apr-Dec, FY = current year to next year (e.g., 2024-25)
 * - If current month is Jan-Mar, FY = previous year to current year (e.g., 2023-24)
 */

import { getInvoices } from '../services/invoiceService'

/**
 * Get the current Indian Financial Year
 * @returns Financial year string in format "YYYY-YY" (e.g., "2024-25")
 */
export const getCurrentFinancialYear = (): string => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed

  // If month is Jan, Feb, or Mar (1, 2, 3), FY is previous year to current year
  // If month is Apr to Dec (4-12), FY is current year to next year
  if (currentMonth >= 1 && currentMonth <= 3) {
    const startYear = currentYear - 1
    const endYear = currentYear.toString().slice(-2)
    return `${startYear}-${endYear}`
  } else {
    const startYear = currentYear
    const endYear = (currentYear + 1).toString().slice(-2)
    return `${startYear}-${endYear}`
  }
}

/**
 * Get the start and end dates of the current financial year
 * @returns Object with startDate and endDate
 */
export const getFinancialYearDates = (financialYear?: string): { startDate: Date; endDate: Date } => {
  const fy = financialYear || getCurrentFinancialYear()
  const [startYearStr] = fy.split('-')
  const startYear = parseInt(startYearStr)

  // Financial year starts on April 1st
  const startDate = new Date(startYear, 3, 1) // Month 3 = April (0-indexed)

  // Financial year ends on March 31st of next year
  const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59) // Month 2 = March (0-indexed)

  return { startDate, endDate }
}

/**
 * Get the next invoice number for the current financial year
 * @param type Invoice type ('sale' or 'purchase')
 * @param prefix Optional custom prefix (default: 'INV' for sales, 'BILL' for purchases)
 * @returns Promise with the next invoice number
 */
export const getNextInvoiceNumber = async (
  type: 'sale' | 'purchase' = 'sale',
  prefix?: string
): Promise<string> => {
  const currentFY = getCurrentFinancialYear()
  const defaultPrefix = type === 'sale' ? 'INV' : 'BILL'
  const invoicePrefix = prefix || defaultPrefix

  try {
    // Get all invoices for the current financial year
    const { startDate, endDate } = getFinancialYearDates(currentFY)
    const allInvoices = await getInvoices(type)

    // Filter invoices for current FY and matching prefix
    const fyInvoices = allInvoices.filter(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate)
      const hasMatchingPrefix = invoice.invoiceNumber?.startsWith(`${invoicePrefix}/${currentFY}`)
      return invoiceDate >= startDate && invoiceDate <= endDate && hasMatchingPrefix
    })

    // Get the highest number from existing invoices
    let maxNumber = 0
    fyInvoices.forEach(invoice => {
      if (invoice.invoiceNumber) {
        // Extract number from format: INV/2024-25/0001
        const parts = invoice.invoiceNumber.split('/')
        if (parts.length === 3) {
          const num = parseInt(parts[2])
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num
          }
        }
      }
    })

    // Increment and format with leading zeros (4 digits)
    const nextNumber = maxNumber + 1
    const formattedNumber = nextNumber.toString().padStart(4, '0')

    return `${invoicePrefix}/${currentFY}/${formattedNumber}`
  } catch (error) {
    console.error('Error generating invoice number:', error)

    // Fallback: Use timestamp-based number
    const timestamp = Date.now().toString().slice(-4)
    return `${invoicePrefix}/${currentFY}/${timestamp}`
  }
}

/**
 * Parse invoice number to get components
 * @param invoiceNumber Invoice number in format "INV/2024-25/0001"
 * @returns Object with prefix, financialYear, and sequenceNumber
 */
export const parseInvoiceNumber = (invoiceNumber: string): {
  prefix: string
  financialYear: string
  sequenceNumber: number
} | null => {
  const parts = invoiceNumber.split('/')

  if (parts.length !== 3) {
    return null
  }

  return {
    prefix: parts[0],
    financialYear: parts[1],
    sequenceNumber: parseInt(parts[2])
  }
}

/**
 * Validate if an invoice number follows the correct format
 * @param invoiceNumber Invoice number to validate
 * @returns true if valid, false otherwise
 */
export const isValidInvoiceNumber = (invoiceNumber: string): boolean => {
  // Format: PREFIX/YYYY-YY/NNNN
  const regex = /^[A-Z]+\/\d{4}-\d{2}\/\d{4}$/
  return regex.test(invoiceNumber)
}

/**
 * Get invoice number for a specific date (useful for backdated invoices)
 * @param date The date for which to generate invoice number
 * @param type Invoice type
 * @param prefix Optional custom prefix
 * @returns Promise with the invoice number
 */
export const getInvoiceNumberForDate = async (
  date: Date,
  type: 'sale' | 'purchase' = 'sale',
  prefix?: string
): Promise<string> => {
  const month = date.getMonth() + 1
  const year = date.getFullYear()

  // Determine financial year for the given date
  let financialYear: string
  if (month >= 1 && month <= 3) {
    const startYear = year - 1
    const endYear = year.toString().slice(-2)
    financialYear = `${startYear}-${endYear}`
  } else {
    const startYear = year
    const endYear = (year + 1).toString().slice(-2)
    financialYear = `${startYear}-${endYear}`
  }

  const defaultPrefix = type === 'sale' ? 'INV' : 'BILL'
  const invoicePrefix = prefix || defaultPrefix

  try {
    // Get all invoices for that financial year
    const { startDate, endDate } = getFinancialYearDates(financialYear)
    const allInvoices = await getInvoices(type)

    const fyInvoices = allInvoices.filter(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate)
      const hasMatchingPrefix = invoice.invoiceNumber?.startsWith(`${invoicePrefix}/${financialYear}`)
      return invoiceDate >= startDate && invoiceDate <= endDate && hasMatchingPrefix
    })

    let maxNumber = 0
    fyInvoices.forEach(invoice => {
      if (invoice.invoiceNumber) {
        const parts = invoice.invoiceNumber.split('/')
        if (parts.length === 3) {
          const num = parseInt(parts[2])
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num
          }
        }
      }
    })

    const nextNumber = maxNumber + 1
    const formattedNumber = nextNumber.toString().padStart(4, '0')

    return `${invoicePrefix}/${financialYear}/${formattedNumber}`
  } catch (error) {
    console.error('Error generating invoice number for date:', error)
    const timestamp = Date.now().toString().slice(-4)
    return `${invoicePrefix}/${financialYear}/${timestamp}`
  }
}

/**
 * Get all financial years that have invoices
 * @returns Promise with array of financial year strings
 */
export const getFinancialYearsWithInvoices = async (type?: 'sale' | 'purchase'): Promise<string[]> => {
  try {
    const allInvoices = await getInvoices(type)
    const fySet = new Set<string>()

    allInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate)
      const month = invoiceDate.getMonth() + 1
      const year = invoiceDate.getFullYear()

      let fy: string
      if (month >= 1 && month <= 3) {
        fy = `${year - 1}-${year.toString().slice(-2)}`
      } else {
        fy = `${year}-${(year + 1).toString().slice(-2)}`
      }

      fySet.add(fy)
    })

    return Array.from(fySet).sort().reverse() // Most recent first
  } catch (error) {
    console.error('Error getting financial years:', error)
    return [getCurrentFinancialYear()]
  }
}
