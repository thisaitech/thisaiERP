// Indian Government Standard Invoice Numbering
// Generates sequential invoice numbers with financial year format

/**
 * Get current Indian financial year
 * Financial year runs from April 1 to March 31
 * Returns format: "2024-25" for FY 2024-2025
 */
export function getCurrentFinancialYear(): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed

  // If month is Jan-Mar (1-3), financial year is previous year to current year
  // If month is Apr-Dec (4-12), financial year is current year to next year
  if (currentMonth >= 4) {
    // Apr-Dec: FY is current year to next year
    const nextYear = (currentYear + 1).toString().slice(-2)
    return `${currentYear}-${nextYear}`
  } else {
    // Jan-Mar: FY is previous year to current year
    const prevYear = currentYear - 1
    const currYearShort = currentYear.toString().slice(-2)
    return `${prevYear}-${currYearShort}`
  }
}

/**
 * Get the next invoice sequence number for the current financial year
 * Stores counters in localStorage by financial year
 */
export function getNextInvoiceSequence(financialYear: string): number {
  const storageKey = `invoice_seq_${financialYear}`

  try {
    const stored = localStorage.getItem(storageKey)
    const currentSequence = stored ? parseInt(stored, 10) : 0
    const nextSequence = currentSequence + 1

    // Save the new sequence number
    localStorage.setItem(storageKey, nextSequence.toString())

    return nextSequence
  } catch (error) {
    console.error('Error managing invoice sequence:', error)
    // Fallback to timestamp-based unique number
    return Date.now() % 10000
  }
}

/**
 * Generate Indian government standard invoice number
 * Format: INV/2024-25/001
 *
 * @param prefix - Invoice prefix (default: "INV")
 * @param paddingLength - Number of digits for sequence (default: 3)
 * @returns Formatted invoice number
 *
 * Examples:
 * - INV/2024-25/001
 * - INV/2024-25/002
 * - INV/2024-25/999
 * - INV/2024-25/1000 (auto-expands beyond padding)
 */
export function generateIndianInvoiceNumber(
  prefix: string = 'INV',
  paddingLength: number = 3
): string {
  const financialYear = getCurrentFinancialYear()
  const sequence = getNextInvoiceSequence(financialYear)

  // Pad sequence with zeros
  const paddedSequence = sequence.toString().padStart(paddingLength, '0')

  return `${prefix}/${financialYear}/${paddedSequence}`
}

/**
 * Reset invoice sequence for a given financial year
 * Useful for testing or manual reset
 */
export function resetInvoiceSequence(financialYear?: string): void {
  const fy = financialYear || getCurrentFinancialYear()
  const storageKey = `invoice_seq_${fy}`
  localStorage.setItem(storageKey, '0')
  console.log(`Invoice sequence reset for FY ${fy}`)
}

/**
 * Get current invoice sequence without incrementing
 */
export function getCurrentInvoiceSequence(financialYear?: string): number {
  const fy = financialYear || getCurrentFinancialYear()
  const storageKey = `invoice_seq_${fy}`

  try {
    const stored = localStorage.getItem(storageKey)
    return stored ? parseInt(stored, 10) : 0
  } catch (error) {
    console.error('Error reading invoice sequence:', error)
    return 0
  }
}

/**
 * Validate invoice number format
 */
export function isValidIndianInvoiceNumber(invoiceNumber: string): boolean {
  // Format: PREFIX/YYYY-YY/NNN
  const pattern = /^[A-Z]+\/\d{4}-\d{2}\/\d+$/
  return pattern.test(invoiceNumber)
}

/**
 * Parse invoice number components
 */
export function parseInvoiceNumber(invoiceNumber: string): {
  prefix: string
  financialYear: string
  sequence: number
} | null {
  if (!isValidIndianInvoiceNumber(invoiceNumber)) {
    return null
  }

  const parts = invoiceNumber.split('/')
  return {
    prefix: parts[0],
    financialYear: parts[1],
    sequence: parseInt(parts[2], 10)
  }
}
