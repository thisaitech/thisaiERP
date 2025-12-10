// GST Report Service - Generate GSTR-1, GSTR-3B reports
import { getInvoices, type Invoice } from './invoiceService'
import { getParties } from './partyService'

// GSTR-1 Interfaces
export interface GSTR1B2BEntry {
  gstin: string
  legalName: string
  invoices: Array<{
    invoiceNumber: string
    invoiceDate: string
    invoiceValue: number
    placeOfSupply: string
    reverseCharge: 'Y' | 'N'
    invoiceType: 'R' | 'SEZWP' | 'SEZWOP' | 'DE'
    eCommerceGSTIN: string
    rate: number
    taxableValue: number
    cessAmount: number
    igstAmount: number
    cgstAmount: number
    sgstAmount: number
  }>
}

export interface GSTR1B2CEntry {
  placeOfSupply: string
  rate: number
  taxableValue: number
  cessAmount: number
  eCommerceGSTIN: string
  igstAmount: number
  cgstAmount: number
  sgstAmount: number
}

export interface GSTR1HSNEntry {
  hsn: string
  description: string
  uqc: string
  totalQuantity: number
  totalValue: number
  taxableValue: number
  igstAmount: number
  cgstAmount: number
  sgstAmount: number
  cessAmount: number
}

export interface GSTR1InvoiceDetail {
  invoiceNumber: string
  invoiceDate: string
  partyName: string
  invoiceValue: number
  taxableValue: number
  tax: number
}

export interface GSTR1DocumentsSummary {
  totalInvoices: number
  cancelledInvoices: number
  lowestInvoiceNumber: string
  highestInvoiceNumber: string
}

export interface GSTR1Report {
  gstin: string
  legalName: string
  tradeName: string
  period: string // MMYYYY format
  generatedAt: string
  b2b: GSTR1B2BEntry[] // Table 4: B2B invoices (with GSTIN)
  b2cl: GSTR1B2CEntry[] // Table 5: B2C Large (>2.5L, interstate)
  b2cs: GSTR1B2CEntry[] // Table 7: B2C Small
  hsn: GSTR1HSNEntry[] // Table 11: HSN summary
  invoiceDetails: GSTR1InvoiceDetail[] // Sample invoice list
  documentsSummary: GSTR1DocumentsSummary // Table 13: Documents issued
  summary: {
    totalInvoices: number
    totalTaxableValue: number
    totalIGST: number
    totalCGST: number
    totalSGST: number
    totalCess: number
    totalTax: number
  }
}

// GSTR-3B Interfaces
export interface GSTR3BReport {
  gstin: string
  legalName: string
  period: string // MMYYYY format
  outwardSupplies: {
    taxableValue: number
    igst: number
    cgst: number
    sgst: number
    cess: number
  }
  inwardSupplies: {
    taxableValue: number
    igst: number
    cgst: number
    sgst: number
    cess: number
  }
  eligibleITC: {
    igst: number
    cgst: number
    sgst: number
    cess: number
  }
  netTaxLiability: {
    igst: number
    cgst: number
    sgst: number
    cess: number
    total: number
  }
}

/**
 * Generate GSTR-1 Report
 */
export async function generateGSTR1Report(
  month: number,
  year: number,
  companyGSTIN: string,
  companyName: string
): Promise<GSTR1Report> {
  // Get all sales invoices for the period
  const allInvoices = await getInvoices()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Last day of month

  const salesInvoices = allInvoices.filter(inv =>
    inv.type === 'sale' &&
    inv.invoiceDate >= startDate &&
    inv.invoiceDate <= endDate
  )

  // B2B: Invoices with GSTIN
  const b2bInvoices = salesInvoices.filter(inv => inv.partyGSTIN && inv.partyGSTIN.length === 15)
  const b2bMap = new Map<string, GSTR1B2BEntry>()

  b2bInvoices.forEach(inv => {
    const gstin = inv.partyGSTIN!
    if (!b2bMap.has(gstin)) {
      b2bMap.set(gstin, {
        gstin: gstin,
        legalName: inv.partyName,
        invoices: []
      })
    }

    const entry = b2bMap.get(gstin)!
    const { igst, cgst, sgst, taxableValue } = calculateInvoiceTax(inv)

    entry.invoices.push({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      invoiceValue: inv.grandTotal,
      placeOfSupply: getStateCode(inv.partyStateCode || inv.billingStateCode || '27'),
      reverseCharge: 'N',
      invoiceType: 'R', // Regular
      eCommerceGSTIN: '',
      rate: inv.items[0]?.taxRate || 18,
      taxableValue: taxableValue,
      cessAmount: 0,
      igstAmount: igst,
      cgstAmount: cgst,
      sgstAmount: sgst
    })
  })

  const b2b = Array.from(b2bMap.values())

  // B2C: Invoices without GSTIN
  const b2cInvoices = salesInvoices.filter(inv => !inv.partyGSTIN || inv.partyGSTIN.length !== 15)

  // B2CL: Interstate B2C > 2.5L
  const b2clMap = new Map<string, GSTR1B2CEntry>()

  // B2CS: All other B2C
  const b2csMap = new Map<string, GSTR1B2CEntry>()

  b2cInvoices.forEach(inv => {
    const isInterstate = inv.partyStateCode !== inv.billingStateCode
    const isLarge = inv.grandTotal > 250000

    const { igst, cgst, sgst, taxableValue } = calculateInvoiceTax(inv)
    const placeOfSupply = getStateCode(inv.partyStateCode || inv.billingStateCode || '27')
    const rate = inv.items[0]?.taxRate || 18
    const key = `${placeOfSupply}-${rate}`

    const entry: GSTR1B2CEntry = {
      placeOfSupply,
      rate,
      taxableValue,
      cessAmount: 0,
      eCommerceGSTIN: '',
      igstAmount: igst,
      cgstAmount: cgst,
      sgstAmount: sgst
    }

    if (isInterstate && isLarge) {
      // B2CL
      const existing = b2clMap.get(key)
      if (existing) {
        existing.taxableValue += taxableValue
        existing.igstAmount += igst
        existing.cgstAmount += cgst
        existing.sgstAmount += sgst
      } else {
        b2clMap.set(key, entry)
      }
    } else {
      // B2CS
      const existing = b2csMap.get(key)
      if (existing) {
        existing.taxableValue += taxableValue
        existing.igstAmount += igst
        existing.cgstAmount += cgst
        existing.sgstAmount += sgst
      } else {
        b2csMap.set(key, entry)
      }
    }
  })

  const b2cl = Array.from(b2clMap.values())
  const b2cs = Array.from(b2csMap.values())

  // HSN Summary
  const hsnMap = new Map<string, GSTR1HSNEntry>()

  salesInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const hsn = item.hsn || 'NONE'
      const { igst, cgst, sgst, taxableValue: itemTaxableValue } = calculateItemTax(item, inv)

      if (!hsnMap.has(hsn)) {
        hsnMap.set(hsn, {
          hsn: hsn,
          description: item.description,
          uqc: getUQC(item.unit),
          totalQuantity: 0,
          totalValue: 0,
          taxableValue: 0,
          igstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          cessAmount: 0
        })
      }

      const entry = hsnMap.get(hsn)!
      entry.totalQuantity += item.quantity
      entry.totalValue += item.amount + (item.tax || 0)
      entry.taxableValue += itemTaxableValue
      entry.igstAmount += igst
      entry.cgstAmount += cgst
      entry.sgstAmount += sgst
    })
  })

  const hsn = Array.from(hsnMap.values())

  // Summary
  const summary = {
    totalInvoices: salesInvoices.length,
    totalTaxableValue: 0,
    totalIGST: 0,
    totalCGST: 0,
    totalSGST: 0,
    totalCess: 0,
    totalTax: 0
  }

  salesInvoices.forEach(inv => {
    const { igst, cgst, sgst, taxableValue } = calculateInvoiceTax(inv)
    summary.totalTaxableValue += taxableValue
    summary.totalIGST += igst
    summary.totalCGST += cgst
    summary.totalSGST += sgst
  })

  summary.totalTax = summary.totalIGST + summary.totalCGST + summary.totalSGST + summary.totalCess

  // Invoice Details (sample of last 15 invoices)
  const invoiceDetails: GSTR1InvoiceDetail[] = salesInvoices
    .slice(0, 15)
    .map(inv => {
      const { igst, cgst, sgst, taxableValue } = calculateInvoiceTax(inv)
      return {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        partyName: inv.partyName,
        invoiceValue: inv.grandTotal,
        taxableValue: taxableValue,
        tax: igst + cgst + sgst
      }
    })

  // Documents Summary
  const invoiceNumbers = salesInvoices.map(inv => inv.invoiceNumber).sort()
  const documentsSummary: GSTR1DocumentsSummary = {
    totalInvoices: salesInvoices.length,
    cancelledInvoices: 0, // TODO: Track cancelled invoices
    lowestInvoiceNumber: invoiceNumbers[0] || 'N/A',
    highestInvoiceNumber: invoiceNumbers[invoiceNumbers.length - 1] || 'N/A'
  }

  return {
    gstin: companyGSTIN,
    legalName: companyName,
    tradeName: companyName,
    period: `${String(month).padStart(2, '0')}${year}`,
    generatedAt: new Date().toISOString(),
    b2b,
    b2cl,
    b2cs,
    hsn,
    invoiceDetails,
    documentsSummary,
    summary
  }
}

/**
 * Generate GSTR-3B Report
 */
export async function generateGSTR3BReport(
  month: number,
  year: number,
  companyGSTIN: string,
  companyName: string
): Promise<GSTR3BReport> {
  const allInvoices = await getInvoices()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const salesInvoices = allInvoices.filter(inv =>
    inv.type === 'sale' &&
    inv.invoiceDate >= startDate &&
    inv.invoiceDate <= endDate
  )

  const purchaseInvoices = allInvoices.filter(inv =>
    inv.type === 'purchase' &&
    inv.invoiceDate >= startDate &&
    inv.invoiceDate <= endDate
  )

  // Outward Supplies (Sales)
  const outwardSupplies = {
    taxableValue: 0,
    igst: 0,
    cgst: 0,
    sgst: 0,
    cess: 0
  }

  salesInvoices.forEach(inv => {
    const { igst, cgst, sgst, taxableValue } = calculateInvoiceTax(inv)
    outwardSupplies.taxableValue += taxableValue
    outwardSupplies.igst += igst
    outwardSupplies.cgst += cgst
    outwardSupplies.sgst += sgst
  })

  // Inward Supplies (Purchases)
  const inwardSupplies = {
    taxableValue: 0,
    igst: 0,
    cgst: 0,
    sgst: 0,
    cess: 0
  }

  purchaseInvoices.forEach(inv => {
    const { igst, cgst, sgst, taxableValue } = calculateInvoiceTax(inv)
    inwardSupplies.taxableValue += taxableValue
    inwardSupplies.igst += igst
    inwardSupplies.cgst += cgst
    inwardSupplies.sgst += sgst
  })

  // Eligible ITC (Input Tax Credit)
  const eligibleITC = {
    igst: inwardSupplies.igst,
    cgst: inwardSupplies.cgst,
    sgst: inwardSupplies.sgst,
    cess: inwardSupplies.cess
  }

  // Net Tax Liability
  const netTaxLiability = {
    igst: Math.max(0, outwardSupplies.igst - eligibleITC.igst),
    cgst: Math.max(0, outwardSupplies.cgst - eligibleITC.cgst),
    sgst: Math.max(0, outwardSupplies.sgst - eligibleITC.sgst),
    cess: Math.max(0, outwardSupplies.cess - eligibleITC.cess),
    total: 0
  }

  netTaxLiability.total =
    netTaxLiability.igst +
    netTaxLiability.cgst +
    netTaxLiability.sgst +
    netTaxLiability.cess

  return {
    gstin: companyGSTIN,
    legalName: companyName,
    period: `${String(month).padStart(2, '0')}${year}`,
    outwardSupplies,
    inwardSupplies,
    eligibleITC,
    netTaxLiability
  }
}

/**
 * Helper: Calculate tax for invoice
 */
function calculateInvoiceTax(invoice: Invoice): {
  igst: number
  cgst: number
  sgst: number
  taxableValue: number
} {
  let igst = 0
  let cgst = 0
  let sgst = 0
  let taxableValue = 0

  const isInterstate = invoice.partyStateCode !== invoice.billingStateCode

  invoice.items.forEach(item => {
    const itemTax = calculateItemTax(item, invoice)
    igst += itemTax.igst
    cgst += itemTax.cgst
    sgst += itemTax.sgst
    taxableValue += itemTax.taxableValue
  })

  return { igst, cgst, sgst, taxableValue }
}

/**
 * Helper: Calculate tax for item
 */
function calculateItemTax(item: any, invoice: Invoice): {
  igst: number
  cgst: number
  sgst: number
  taxableValue: number
} {
  const taxableValue = item.amount
  const taxRate = item.taxRate || 18
  const taxAmount = item.tax || 0

  const isInterstate = invoice.partyStateCode !== invoice.billingStateCode

  if (isInterstate) {
    // IGST
    return {
      igst: taxAmount,
      cgst: 0,
      sgst: 0,
      taxableValue
    }
  } else {
    // CGST + SGST
    return {
      igst: 0,
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      taxableValue
    }
  }
}

/**
 * Helper: Get state code with "State" prefix
 */
function getStateCode(code: string): string {
  return `${String(code).padStart(2, '0')}-State Name`
}

/**
 * Helper: Get UQC (Unit Quantity Code)
 */
function getUQC(unit: string): string {
  const uqcMap: Record<string, string> = {
    'PCS': 'NOS',
    'KG': 'KGS',
    'LITRE': 'LTR',
    'METER': 'MTR',
    'BOX': 'BOX',
    'SET': 'SET'
  }
  return uqcMap[unit.toUpperCase()] || 'OTH'
}
