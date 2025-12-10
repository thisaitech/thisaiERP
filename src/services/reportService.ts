// Report Service - Generate business reports
import { getInvoices } from './invoiceService'
import { getItems } from './itemService'
import { getParties } from './partyService'
import { getLedgerSummary } from './ledgerService'
import { getExpenses, calculateProratedAmount, type Expense } from './expenseService'

/**
 * Normalize date to YYYY-MM-DD string format (local timezone)
 * Handles various date formats including ISO strings and Date objects
 */
function normalizeDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return ''

  let date: Date
  if (typeof dateInput === 'string') {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput
    }
    // Parse the string to Date
    date = new Date(dateInput)
  } else {
    date = dateInput
  }

  if (isNaN(date.getTime())) return ''

  // Format as YYYY-MM-DD in local timezone
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if an invoice date matches a target date
 * Handles multiple date formats and edge cases
 */
function matchesDate(invoiceDate: string | undefined, targetDate: string): boolean {
  if (!invoiceDate || !targetDate) return false
  return normalizeDate(invoiceDate) === normalizeDate(targetDate)
}

/**
 * Check if an invoice date is within a date range (inclusive)
 */
function isDateInRange(invoiceDate: string | undefined, startDate?: string, endDate?: string): boolean {
  if (!invoiceDate) return false
  const normalizedInvDate = normalizeDate(invoiceDate)
  if (!normalizedInvDate) return false

  if (startDate && normalizedInvDate < normalizeDate(startDate)) return false
  if (endDate && normalizedInvDate > normalizeDate(endDate)) return false
  return true
}

export interface SalesSummary {
  totalSales: number
  totalInvoices: number
  totalTax: number
  averageInvoiceValue: number
  topCustomers: Array<{ name: string; amount: number; invoices: number }>
  salesByMonth: Array<{ month: string; amount: number; count: number }>
}

export interface PurchaseSummary {
  totalPurchases: number
  totalBills: number
  totalTax: number
  averageBillValue: number
  topSuppliers: Array<{ name: string; amount: number; bills: number }>
  purchasesByMonth: Array<{ month: string; amount: number; count: number }>
}

export interface StockSummary {
  totalItems: number
  totalStockValue: number
  lowStockItems: number
  outOfStockItems: number
  itemDetails: Array<{
    name: string
    sku: string
    quantity: number
    value: number
    status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  }>
}

/**
 * Generate Sales Summary Report
 */
export async function getSalesSummaryReport(
  startDate?: string,
  endDate?: string
): Promise<SalesSummary> {
  const allInvoices = await getInvoices()

  // Filter sales invoices within date range using normalized date comparison
  let salesInvoices = allInvoices.filter(inv => inv.type === 'sale')

  if (startDate || endDate) {
    salesInvoices = salesInvoices.filter(inv => isDateInRange(inv.invoiceDate, startDate, endDate))
  }

  // Calculate totals
  const totalSales = salesInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const totalTax = salesInvoices.reduce((sum, inv) => {
    const tax = inv.items.reduce((t, item) => t + (item.tax || 0), 0)
    return sum + tax
  }, 0)

  // Top customers
  const customerMap = new Map<string, { amount: number; invoices: number }>()
  salesInvoices.forEach(inv => {
    const existing = customerMap.get(inv.partyName) || { amount: 0, invoices: 0 }
    customerMap.set(inv.partyName, {
      amount: existing.amount + inv.grandTotal,
      invoices: existing.invoices + 1
    })
  })

  const topCustomers = Array.from(customerMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Sales by month
  const monthMap = new Map<string, { amount: number; count: number }>()
  salesInvoices.forEach(inv => {
    const month = inv.invoiceDate.substring(0, 7) // YYYY-MM
    const existing = monthMap.get(month) || { amount: 0, count: 0 }
    monthMap.set(month, {
      amount: existing.amount + inv.grandTotal,
      count: existing.count + 1
    })
  })

  const salesByMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    totalSales,
    totalInvoices: salesInvoices.length,
    totalTax,
    averageInvoiceValue: salesInvoices.length > 0 ? totalSales / salesInvoices.length : 0,
    topCustomers,
    salesByMonth
  }
}

/**
 * Generate Purchase Summary Report
 */
export async function getPurchaseSummaryReport(
  startDate?: string,
  endDate?: string
): Promise<PurchaseSummary> {
  const allInvoices = await getInvoices()

  // Filter purchase invoices within date range using normalized date comparison
  let purchaseInvoices = allInvoices.filter(inv => inv.type === 'purchase')

  if (startDate || endDate) {
    purchaseInvoices = purchaseInvoices.filter(inv => isDateInRange(inv.invoiceDate, startDate, endDate))
  }

  // Calculate totals
  const totalPurchases = purchaseInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const totalTax = purchaseInvoices.reduce((sum, inv) => {
    const tax = inv.items.reduce((t, item) => t + (item.tax || 0), 0)
    return sum + tax
  }, 0)

  // Top suppliers
  const supplierMap = new Map<string, { amount: number; bills: number }>()
  purchaseInvoices.forEach(inv => {
    const existing = supplierMap.get(inv.partyName) || { amount: 0, bills: 0 }
    supplierMap.set(inv.partyName, {
      amount: existing.amount + inv.grandTotal,
      bills: existing.bills + 1
    })
  })

  const topSuppliers = Array.from(supplierMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Purchases by month
  const monthMap = new Map<string, { amount: number; count: number }>()
  purchaseInvoices.forEach(inv => {
    const month = inv.invoiceDate.substring(0, 7) // YYYY-MM
    const existing = monthMap.get(month) || { amount: 0, count: 0 }
    monthMap.set(month, {
      amount: existing.amount + inv.grandTotal,
      count: existing.count + 1
    })
  })

  const purchasesByMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    totalPurchases,
    totalBills: purchaseInvoices.length,
    totalTax,
    averageBillValue: purchaseInvoices.length > 0 ? totalPurchases / purchaseInvoices.length : 0,
    topSuppliers,
    purchasesByMonth
  }
}

/**
 * Generate Stock Summary Report
 */
export async function getStockSummaryReport(): Promise<StockSummary> {
  const items = await getItems()

  const totalStockValue = items.reduce((sum, item) => {
    return sum + ((item.stock || 0) * (item.sellingPrice || 0))
  }, 0)

  // Low stock: stock > 0 AND stock <= reorderPoint (same logic as Inventory page)
  const lowStockItems = items.filter(item =>
    (item.stock || 0) > 0 && (item.stock || 0) <= (item.reorderPoint || 0)
  ).length

  const outOfStockItems = items.filter(item => (item.stock || 0) === 0).length

  const itemDetails = items.map(item => {
    const stock = item.stock || 0
    const reorderPoint = item.reorderPoint || 0
    let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock'

    if (stock === 0) {
      status = 'Out of Stock'
    } else if (stock <= reorderPoint) {
      status = 'Low Stock'
    }

    return {
      name: item.name,
      sku: item.sku || item.itemCode || '',
      quantity: stock,
      value: stock * (item.sellingPrice || 0),
      status
    }
  }).sort((a, b) => b.value - a.value)

  return {
    totalItems: items.length,
    totalStockValue,
    lowStockItems,
    outOfStockItems,
    itemDetails
  }
}

/**
 * Get Party Receivables/Payables Report
 */
export async function getPartyBalancesReport() {
  const summary = await getLedgerSummary()
  const parties = await getParties()

  return {
    totalReceivables: summary.totalReceivables,
    totalPayables: summary.totalPayables,
    netBalance: summary.netBalance,
    partyCount: parties.length
  }
}

// ============================================================================
// COMPREHENSIVE BUSINESS REPORTS
// ============================================================================

/**
 * Day Book - All transactions for a specific day
 * Returns the most recent 10 invoices for the day, sorted by creation time (newest first)
 */
export async function getDayBook(date: string) {
  const allInvoices = await getInvoices()

  // Use normalized date comparison to handle various date formats
  const dayInvoices = allInvoices.filter(inv => {
    // Use invoiceDate or fallback to createdAt
    const invoiceDate = inv.invoiceDate || (inv as any).createdAt
    return matchesDate(invoiceDate, date)
  })

  const sales = dayInvoices.filter(inv => inv.type === 'sale')
  const purchases = dayInvoices.filter(inv => inv.type === 'purchase')

  // Sort by createdAt timestamp (newest first) or by invoiceNumber (descending) as fallback
  const sortedTransactions = dayInvoices.sort((a, b) => {
    // Try to use createdAt timestamp first
    const aTime = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0
    const bTime = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0
    if (aTime && bTime) {
      return bTime - aTime // Newest first
    }
    // Fall back to invoice number comparison (descending for most recent)
    return b.invoiceNumber.localeCompare(a.invoiceNumber)
  })

  return {
    date,
    sales: {
      count: sales.length,
      amount: sales.reduce((sum, inv) => sum + inv.grandTotal, 0),
      paid: sales.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0)
    },
    purchases: {
      count: purchases.length,
      amount: purchases.reduce((sum, inv) => sum + inv.grandTotal, 0),
      paid: purchases.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0)
    },
    netCashFlow: sales.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0) -
                  purchases.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0),
    transactions: sortedTransactions.slice(0, 10) // Return only the most recent 10 invoices
  }
}

/**
 * Bill-wise Profit Report
 */
export async function getBillWiseProfit() {
  const sales = await getInvoices('sale')
  const purchases = await getInvoices('purchase')

  // Calculate average cost per item from purchases
  const itemCosts = new Map<string, number>()
  purchases.forEach(purchase => {
    purchase.items.forEach(item => {
      itemCosts.set(item.description, item.rate)
    })
  })

  const profitData = sales.map(sale => {
    let totalCost = 0
    sale.items.forEach(item => {
      const cost = itemCosts.get(item.description) || (item.rate * 0.6)
      totalCost += cost * item.quantity
    })

    const profit = sale.grandTotal - totalCost
    const profitMargin = sale.grandTotal > 0 ? (profit / sale.grandTotal) * 100 : 0

    return {
      invoiceNumber: sale.invoiceNumber,
      invoiceDate: sale.invoiceDate,
      partyName: sale.partyName,
      revenue: sale.grandTotal,
      cost: totalCost,
      profit,
      profitMargin
    }
  })

  return {
    bills: profitData,
    summary: {
      totalRevenue: profitData.reduce((sum, b) => sum + b.revenue, 0),
      totalCost: profitData.reduce((sum, b) => sum + b.cost, 0),
      totalProfit: profitData.reduce((sum, b) => sum + b.profit, 0),
      avgProfitMargin: profitData.length > 0
        ? profitData.reduce((sum, b) => sum + b.profitMargin, 0) / profitData.length
        : 0
    }
  }
}

/**
 * Profit & Loss Statement with Smart Expense Proration
 */
export async function getProfitAndLoss(startDate: string, endDate: string) {
  const sales = await getInvoices('sale')
  const purchases = await getInvoices('purchase')
  const allExpenses = await getExpenses()

  const filteredSales = sales.filter(inv =>
    inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
  )
  const filteredPurchases = purchases.filter(inv =>
    inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
  )

  const revenue = filteredSales.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const costOfGoodsSold = filteredPurchases.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const grossProfit = revenue - costOfGoodsSold

  // Calculate prorated operating expenses using Smart Expense Logic
  const operatingExpenses: Record<string, number> = {
    rent: 0,
    salary: 0,
    utilities: 0,
    marketing: 0,
    office_supplies: 0,
    travel: 0,
    food: 0,
    internet: 0,
    software: 0,
    other: 0
  }

  // Track expense details for warning generation
  const expenseDetails: Array<{
    category: string
    amount: number
    proratedAmount: number
    isRecurring: boolean
    monthlyAmount?: number
  }> = []

  allExpenses.forEach(expense => {
    const proratedAmount = calculateProratedAmount(expense, startDate, endDate)

    if (proratedAmount > 0) {
      operatingExpenses[expense.category] = (operatingExpenses[expense.category] || 0) + proratedAmount

      expenseDetails.push({
        category: expense.category,
        amount: expense.amount,
        proratedAmount,
        isRecurring: expense.isRecurring || false,
        monthlyAmount: expense.monthlyAmount
      })
    }
  })

  const totalExpenses = Object.values(operatingExpenses).reduce((sum, exp) => sum + exp, 0)
  const netProfit = grossProfit - totalExpenses

  // Detect partial period for warning
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const isPartialPeriod = daysInPeriod < daysInMonth

  // Generate warning data
  const warningData = isPartialPeriod ? {
    isPartialPeriod: true,
    daysInPeriod,
    daysInMonth,
    periodPercentage: (daysInPeriod / daysInMonth) * 100,
    expensesProrated: expenseDetails.filter(e => e.isRecurring && e.proratedAmount < e.amount).length > 0,
    recurringExpenses: expenseDetails.filter(e => e.isRecurring),
    message: `Partial period detected: ${daysInPeriod} of ${daysInMonth} days`
  } : null

  return {
    period: { startDate, endDate },
    revenue,
    costOfGoodsSold,
    grossProfit,
    grossProfitMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    operatingExpenses,
    totalExpenses,
    netProfit,
    netProfitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    warningData // Add warning data for UI display
  }
}

/**
 * Cash Flow Statement
 */
/**
 * Cash Flow Report - Daily transactions with running balance
 * Shows: Date | Transaction Type | Amount | Running Bank Balance
 *
 * Formula:
 * Opening Bank Balance (previous day)
 * + All money received today (marketplace payouts + bank deposits + refunds)
 * – All money paid today (supplier bills + expenses + GST + loans)
 * = Closing Bank Balance today
 */
export async function getCashFlow(startDate: string, endDate: string) {
  const sales = await getInvoices('sale')
  const purchases = await getInvoices('purchase')
  const expenses = await getExpenses()

  // Filter by date range
  const filteredSales = sales.filter(inv =>
    inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
  )
  const filteredPurchases = purchases.filter(inv =>
    inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
  )
  const filteredExpenses = expenses.filter(exp =>
    exp.date >= startDate && exp.date <= endDate
  )

  // Build daily transactions list
  interface DailyTransaction {
    date: string
    type: 'sale_receipt' | 'marketplace_payout' | 'purchase_payment' | 'expense' | 'gst_payment' | 'refund' | 'other'
    description: string
    reference: string
    amount: number // positive = inflow, negative = outflow
    category?: string
  }

  const transactions: DailyTransaction[] = []

  // Add sale receipts (money received from customers/marketplaces)
  filteredSales.forEach(inv => {
    const paidAmount = inv.payment?.paidAmount || 0
    if (paidAmount > 0) {
      const platform = (inv as any).platform || 'offline'
      const platformNames: Record<string, string> = {
        'amazon': 'Amazon Payout',
        'flipkart': 'Flipkart Payout',
        'meesho': 'Meesho Payout',
        'shopify': 'Shopify Payment',
        'website': 'Website Payment',
        'offline': 'Cash/Bank Receipt'
      }
      transactions.push({
        date: inv.invoiceDate,
        type: platform !== 'offline' ? 'marketplace_payout' : 'sale_receipt',
        description: platformNames[platform] || 'Sale Receipt',
        reference: inv.invoiceNumber,
        amount: paidAmount, // Inflow (positive)
        category: inv.partyName || 'Walk-in Customer'
      })
    }
  })

  // Add purchase payments (money paid to suppliers)
  filteredPurchases.forEach(inv => {
    const paidAmount = inv.payment?.paidAmount || 0
    if (paidAmount > 0) {
      transactions.push({
        date: inv.invoiceDate,
        type: 'purchase_payment',
        description: `Paid supplier: ${inv.partyName || 'Unknown'}`,
        reference: inv.invoiceNumber,
        amount: -paidAmount, // Outflow (negative)
        category: 'Supplier Payment'
      })
    }
  })

  // Add expenses (money paid for business expenses)
  filteredExpenses.forEach(exp => {
    if (exp.amount > 0) {
      const expenseCategories: Record<string, string> = {
        'rent': 'Rent Payment',
        'salary': 'Salary & Wages',
        'utilities': 'Utilities',
        'marketing': 'Marketing/Ads',
        'logistics': 'Shipping/Logistics',
        'office': 'Office Expenses',
        'gst': 'GST Payment',
        'tax': 'Tax Payment',
        'other': 'Other Expense'
      }
      const catKey = exp.category as string
      transactions.push({
        date: exp.date,
        type: catKey === 'gst' || catKey === 'tax' ? 'gst_payment' : 'expense',
        description: exp.description || expenseCategories[exp.category] || 'Business Expense',
        reference: exp.id || '',
        amount: -exp.amount, // Outflow (negative)
        category: exp.category || 'Other'
      })
    }
  })

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date))

  // Calculate running balance (starting from opening balance)
  // For now, use a default opening balance - this should come from settings
  const openingBalance = 100000 // TODO: Get from bank account settings

  let runningBalance = openingBalance
  const transactionsWithBalance = transactions.map(txn => {
    runningBalance += txn.amount
    return {
      ...txn,
      runningBalance
    }
  })

  // Group by date for daily summary
  const dailySummary: Record<string, { inflow: number; outflow: number; netFlow: number; closingBalance: number }> = {}
  let dailyRunningBalance = openingBalance

  transactions.forEach(txn => {
    if (!dailySummary[txn.date]) {
      dailySummary[txn.date] = { inflow: 0, outflow: 0, netFlow: 0, closingBalance: 0 }
    }
    if (txn.amount > 0) {
      dailySummary[txn.date].inflow += txn.amount
    } else {
      dailySummary[txn.date].outflow += Math.abs(txn.amount)
    }
    dailySummary[txn.date].netFlow = dailySummary[txn.date].inflow - dailySummary[txn.date].outflow
  })

  // Calculate closing balance for each day
  const sortedDates = Object.keys(dailySummary).sort()
  sortedDates.forEach(date => {
    dailyRunningBalance += dailySummary[date].netFlow
    dailySummary[date].closingBalance = dailyRunningBalance
  })

  // Calculate totals
  const totalInflow = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalOutflow = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const closingBalance = openingBalance + totalInflow - totalOutflow

  // Category-wise breakdown
  const categoryBreakdown = {
    marketplacePayouts: transactions.filter(t => t.type === 'marketplace_payout').reduce((sum, t) => sum + t.amount, 0),
    directSales: transactions.filter(t => t.type === 'sale_receipt').reduce((sum, t) => sum + t.amount, 0),
    supplierPayments: Math.abs(transactions.filter(t => t.type === 'purchase_payment').reduce((sum, t) => sum + t.amount, 0)),
    expenses: Math.abs(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)),
    gstPayments: Math.abs(transactions.filter(t => t.type === 'gst_payment').reduce((sum, t) => sum + t.amount, 0))
  }

  return {
    period: { startDate, endDate },
    openingBalance,
    closingBalance,
    totalInflow,
    totalOutflow,
    netCashFlow: totalInflow - totalOutflow,
    transactions: transactionsWithBalance,
    dailySummary: sortedDates.map(date => ({
      date,
      ...dailySummary[date]
    })),
    categoryBreakdown,
    transactionCount: transactions.length
  }
}

/**
 * Balance Sheet - As on Any Date
 *
 * Three main sections:
 * ASSETS = Cash & Bank + Stock/Inventory + Receivables + Other Assets
 * LIABILITIES = GST Payable + Suppliers Payable + Loans/Credit Cards
 * OWNER'S CAPITAL = Total Assets - Total Liabilities
 *
 * Formula: Assets = Liabilities + Owner's Capital (always balances)
 */
export async function getBalanceSheet(asOfDate: string) {
  const sales = await getInvoices('sale')
  const purchases = await getInvoices('purchase')
  const items = await getItems()
  const expenses = await getExpenses()

  // Filter up to the given date
  const salesUpToDate = sales.filter(inv => inv.invoiceDate <= asOfDate)
  const purchasesUpToDate = purchases.filter(inv => inv.invoiceDate <= asOfDate)
  const expensesUpToDate = expenses.filter(exp => exp.date <= asOfDate)

  // === ASSETS ===

  // Cash & Bank Balance (money received - money paid)
  const cashReceived = salesUpToDate.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0)
  const cashPaidSuppliers = purchasesUpToDate.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0)
  const cashPaidExpenses = expensesUpToDate.reduce((sum, exp) => sum + exp.amount, 0)
  const cashAndBank = cashReceived - cashPaidSuppliers - cashPaidExpenses

  // Stock/Inventory Valuation
  // Calculate from items or (Total Purchases - Cost of Goods Sold)
  const inventoryValue = items.reduce((sum, item) => {
    const qty = item.stock || 0
    const cost = item.purchasePrice || item.sellingPrice || 0
    return sum + (qty * cost)
  }, 0)

  // Receivables (money customers/marketplaces owe you)
  const accountsReceivable = salesUpToDate.reduce((sum, inv) => sum + (inv.payment?.dueAmount || 0), 0)

  // Other Assets (fixed assets, deposits, advance tax)
  const otherAssets = 50000 // TODO: Get from settings/ledger

  const totalAssets = cashAndBank + inventoryValue + accountsReceivable + otherAssets

  // === LIABILITIES ===

  // GST Payable (Output GST - ITC claimed - GST already paid)
  const outputGst = salesUpToDate.reduce((sum, inv) => {
    const gst = inv.items.reduce((itemSum, item) =>
      itemSum + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0), 0)
    return sum + gst
  }, 0)
  const inputGst = purchasesUpToDate.reduce((sum, inv) => {
    const gst = inv.items.reduce((itemSum, item) =>
      itemSum + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0), 0)
    return sum + gst
  }, 0)
  const gstPaid = expensesUpToDate
    .filter(exp => (exp.category as string) === 'gst' || (exp.category as string) === 'tax')
    .reduce((sum, exp) => sum + exp.amount, 0)
  const gstPayable = Math.max(0, outputGst - inputGst - gstPaid)

  // Suppliers Payable (total purchase bills not yet paid)
  const suppliersPayable = purchasesUpToDate.reduce((sum, inv) => sum + (inv.payment?.dueAmount || 0), 0)

  // Loans / Credit Card Outstanding
  const loansOutstanding = 0 // TODO: Get from settings/ledger

  const totalLiabilities = gstPayable + suppliersPayable + loansOutstanding

  // === OWNER'S CAPITAL ===
  // Total Assets - Total Liabilities = Your real profit + capital invested
  const ownersCapital = totalAssets - totalLiabilities

  // Calculate current year profit (for retained earnings)
  const totalRevenue = salesUpToDate.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const totalCost = purchasesUpToDate.reduce((sum, inv) => sum + inv.grandTotal, 0) + cashPaidExpenses
  const currentYearProfit = totalRevenue - totalCost

  return {
    asOfDate,
    assets: {
      cashAndBank,
      inventory: inventoryValue,
      receivables: accountsReceivable,
      otherAssets,
      totalAssets,
      breakdown: {
        cashReceived,
        cashPaidSuppliers,
        cashPaidExpenses
      }
    },
    liabilities: {
      gstPayable,
      suppliersPayable,
      loansOutstanding,
      totalLiabilities,
      breakdown: {
        outputGst,
        inputGst,
        gstPaid
      }
    },
    ownersCapital: {
      capitalInvested: ownersCapital - currentYearProfit, // Initial capital
      retainedEarnings: currentYearProfit,
      total: ownersCapital
    },
    // Verification: Assets = Liabilities + Owner's Capital
    isBalanced: Math.abs(totalAssets - (totalLiabilities + ownersCapital)) < 0.01,
    summary: {
      totalRevenue,
      totalCost,
      currentYearProfit
    }
  }
}

/**
 * Trial Balance - Raw dump of every ledger balance
 *
 * Shows all ledger accounts with their Debit and Credit balances
 * Total Debits must equal Total Credits (accounting equation)
 *
 * This is the foundation for Balance Sheet and P&L reports
 */
export async function getTrialBalance(asOfDate: string) {
  const sales = await getInvoices('sale')
  const purchases = await getInvoices('purchase')
  const items = await getItems()
  const expenses = await getExpenses()

  // Filter up to the given date
  const salesUpToDate = sales.filter(inv => inv.invoiceDate <= asOfDate)
  const purchasesUpToDate = purchases.filter(inv => inv.invoiceDate <= asOfDate)
  const expensesUpToDate = expenses.filter(exp => exp.date <= asOfDate)

  // Calculate totals
  const totalSalesRevenue = salesUpToDate.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const totalPurchases = purchasesUpToDate.reduce((sum, inv) => sum + inv.grandTotal, 0)
  const totalCashReceived = salesUpToDate.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0)
  const totalCashPaid = purchasesUpToDate.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0)

  // GST calculations
  const outputGst = salesUpToDate.reduce((sum, inv) => {
    return sum + inv.items.reduce((itemSum, item) =>
      itemSum + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0), 0)
  }, 0)
  const inputGst = purchasesUpToDate.reduce((sum, inv) => {
    return sum + inv.items.reduce((itemSum, item) =>
      itemSum + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0), 0)
  }, 0)

  // Expense categories
  const expensesByCategory: Record<string, number> = {}
  expensesUpToDate.forEach(exp => {
    const cat = exp.category || 'other'
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount
  })

  // Inventory value
  const inventoryValue = items.reduce((sum, item) => {
    const qty = item.stock || 0
    const cost = item.purchasePrice || item.sellingPrice || 0
    return sum + (qty * cost)
  }, 0)

  // Build ledger accounts (like Tally format)
  const accounts: Array<{
    accountName: string
    accountType: 'asset' | 'liability' | 'income' | 'expense' | 'capital'
    debit: number
    credit: number
  }> = []

  // Capital Account (Credit)
  const capitalInvested = 100000 // TODO: Get from settings
  accounts.push({
    accountName: 'Capital Account',
    accountType: 'capital',
    debit: 0,
    credit: capitalInvested
  })

  // Sales Revenue (Credit) - grouped by platform
  const platformSales: Record<string, number> = { 'Offline/Direct': 0 }
  salesUpToDate.forEach(inv => {
    const platform = (inv as any).platform || 'offline'
    const platformNames: Record<string, string> = {
      'amazon': 'Amazon',
      'flipkart': 'Flipkart',
      'meesho': 'Meesho',
      'shopify': 'Shopify',
      'website': 'Website',
      'offline': 'Offline/Direct'
    }
    const name = platformNames[platform] || 'Offline/Direct'
    platformSales[name] = (platformSales[name] || 0) + inv.grandTotal
  })
  Object.entries(platformSales).forEach(([platform, amount]) => {
    if (amount > 0) {
      accounts.push({
        accountName: `Sales (${platform})`,
        accountType: 'income',
        debit: 0,
        credit: amount
      })
    }
  })

  // Purchase Account (Debit)
  accounts.push({
    accountName: 'Purchase Account',
    accountType: 'expense',
    debit: totalPurchases,
    credit: 0
  })

  // GST Input (ITC) - Debit
  accounts.push({
    accountName: 'GST Input (ITC)',
    accountType: 'asset',
    debit: inputGst,
    credit: 0
  })

  // GST Output - Credit
  accounts.push({
    accountName: 'GST Output',
    accountType: 'liability',
    debit: 0,
    credit: outputGst
  })

  // Bank Account (Debit - net cash)
  const netBankBalance = totalCashReceived - totalCashPaid - expensesUpToDate.reduce((sum, exp) => sum + exp.amount, 0)
  accounts.push({
    accountName: 'Bank Account',
    accountType: 'asset',
    debit: Math.max(0, netBankBalance),
    credit: Math.max(0, -netBankBalance)
  })

  // Expense accounts (Debit)
  const expenseLabels: Record<string, string> = {
    'rent': 'Rent Expense',
    'salary': 'Salary & Wages',
    'utilities': 'Utilities',
    'marketing': 'Marketing/Ads Expense',
    'office_supplies': 'Office Supplies',
    'travel': 'Travel Expense',
    'food': 'Food & Entertainment',
    'internet': 'Internet & Software',
    'software': 'Software Subscriptions',
    'other': 'Other Expenses'
  }
  Object.entries(expensesByCategory).forEach(([cat, amount]) => {
    accounts.push({
      accountName: expenseLabels[cat] || `${cat} Expense`,
      accountType: 'expense',
      debit: amount,
      credit: 0
    })
  })

  // Supplier (Creditors) - Credit
  const supplierPayables: Record<string, number> = {}
  purchasesUpToDate.forEach(inv => {
    const due = inv.payment?.dueAmount || 0
    if (due > 0) {
      const supplier = inv.partyName || 'Unknown Supplier'
      supplierPayables[supplier] = (supplierPayables[supplier] || 0) + due
    }
  })
  Object.entries(supplierPayables).forEach(([supplier, amount]) => {
    accounts.push({
      accountName: `Supplier: ${supplier}`,
      accountType: 'liability',
      debit: 0,
      credit: amount
    })
  })

  // Customer (Debtors) - Debit
  const customerReceivables: Record<string, number> = {}
  salesUpToDate.forEach(inv => {
    const due = inv.payment?.dueAmount || 0
    if (due > 0) {
      const customer = inv.partyName || 'Walk-in Customer'
      customerReceivables[customer] = (customerReceivables[customer] || 0) + due
    }
  })
  Object.entries(customerReceivables).forEach(([customer, amount]) => {
    accounts.push({
      accountName: `Customer: ${customer}`,
      accountType: 'asset',
      debit: amount,
      credit: 0
    })
  })

  // Stock/Inventory Account (Debit)
  accounts.push({
    accountName: 'Inventory/Stock',
    accountType: 'asset',
    debit: inventoryValue,
    credit: 0
  })

  // GST Payable (net) - if output > input
  const netGstPayable = outputGst - inputGst
  if (netGstPayable > 0) {
    accounts.push({
      accountName: 'GST Payable',
      accountType: 'liability',
      debit: 0,
      credit: netGstPayable
    })
  }

  // Current Year Profit/Loss
  const totalRevenue = totalSalesRevenue
  const totalExpenses = totalPurchases + expensesUpToDate.reduce((sum, exp) => sum + exp.amount, 0)
  const profitLoss = totalRevenue - totalExpenses
  if (profitLoss !== 0) {
    accounts.push({
      accountName: 'Profit & Loss (Current Year)',
      accountType: 'capital',
      debit: profitLoss < 0 ? Math.abs(profitLoss) : 0,
      credit: profitLoss > 0 ? profitLoss : 0
    })
  }

  // Filter out zero-value accounts and sort
  const nonZeroAccounts = accounts.filter(acc => acc.debit > 0 || acc.credit > 0)
    .sort((a, b) => {
      const typeOrder = { asset: 1, liability: 2, capital: 3, income: 4, expense: 5 }
      return typeOrder[a.accountType] - typeOrder[b.accountType]
    })

  const totalDebit = nonZeroAccounts.reduce((sum, acc) => sum + acc.debit, 0)
  const totalCredit = nonZeroAccounts.reduce((sum, acc) => sum + acc.credit, 0)

  return {
    asOfDate,
    accounts: nonZeroAccounts,
    totalDebit,
    totalCredit,
    difference: Math.abs(totalDebit - totalCredit),
    balanced: Math.abs(totalDebit - totalCredit) < 1, // Allow ₹1 rounding difference
    summary: {
      assetAccounts: nonZeroAccounts.filter(a => a.accountType === 'asset').length,
      liabilityAccounts: nonZeroAccounts.filter(a => a.accountType === 'liability').length,
      incomeAccounts: nonZeroAccounts.filter(a => a.accountType === 'income').length,
      expenseAccounts: nonZeroAccounts.filter(a => a.accountType === 'expense').length,
      capitalAccounts: nonZeroAccounts.filter(a => a.accountType === 'capital').length
    }
  }
}

/**
 * Party Statement - Detailed ledger for a party
 */
export async function getPartyStatement(partyName: string, startDate?: string, endDate?: string) {
  const allInvoices = await getInvoices()
  let partyInvoices = allInvoices.filter(inv => inv.partyName === partyName)

  if (startDate && endDate) {
    partyInvoices = partyInvoices.filter(inv =>
      inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
    )
  }

  const sales = partyInvoices.filter(inv => inv.type === 'sale')
  const purchases = partyInvoices.filter(inv => inv.type === 'purchase')

  return {
    partyName,
    period: { startDate, endDate },
    sales: {
      count: sales.length,
      amount: sales.reduce((sum, inv) => sum + inv.grandTotal, 0),
      paid: sales.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0),
      due: sales.reduce((sum, inv) => sum + (inv.payment?.dueAmount || 0), 0)
    },
    purchases: {
      count: purchases.length,
      amount: purchases.reduce((sum, inv) => sum + inv.grandTotal, 0),
      paid: purchases.reduce((sum, inv) => sum + (inv.payment?.paidAmount || 0), 0),
      due: purchases.reduce((sum, inv) => sum + (inv.payment?.dueAmount || 0), 0)
    },
    transactions: partyInvoices.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate))
  }
}

/**
 * Party-wise Profit & Loss
 * Extracts REAL data from actual sales invoices
 * Shows all customers who have sales, with their revenue, cost (COGS), and profit
 */
export async function getPartyWiseProfitLoss() {
  const sales = await getInvoices('sale')
  const purchases = await getInvoices('purchase')
  const items = await getItems()

  // Build item cost map from purchases AND items master for COGS calculation
  const itemCostMap = new Map<string, { totalCost: number; totalQty: number; avgCost: number }>()

  // First, get costs from purchase invoices
  purchases.forEach(purchase => {
    purchase.items.forEach(item => {
      const itemName = (item.description || item.itemName || '').toLowerCase().trim()
      if (!itemName) return

      if (!itemCostMap.has(itemName)) {
        itemCostMap.set(itemName, { totalCost: 0, totalQty: 0, avgCost: 0 })
      }
      const data = itemCostMap.get(itemName)!
      const qty = item.quantity || 1
      const amount = item.totalAmount || (item.rate * qty) || 0
      data.totalCost += amount
      data.totalQty += qty
      data.avgCost = data.totalQty > 0 ? data.totalCost / data.totalQty : 0
    })
  })

  // Also get costs from items master (purchasePrice) as fallback
  items.forEach(item => {
    const itemName = (item.name || '').toLowerCase().trim()
    if (!itemName) return

    if (!itemCostMap.has(itemName)) {
      const cost = item.purchasePrice || 0
      itemCostMap.set(itemName, { totalCost: cost, totalQty: 1, avgCost: cost })
    }
  })

  // Extract unique party names from ACTUAL sales invoices
  const partyMap = new Map<string, {
    revenue: number
    cost: number
    invoiceCount: number
  }>()

  sales.forEach(sale => {
    const partyName = sale.partyName || 'Walk-in Customer'

    if (!partyMap.has(partyName)) {
      partyMap.set(partyName, { revenue: 0, cost: 0, invoiceCount: 0 })
    }

    const partyData = partyMap.get(partyName)!
    partyData.revenue += sale.grandTotal || 0
    partyData.invoiceCount += 1

    // Calculate COGS for each item in this sale
    sale.items.forEach(item => {
      const itemName = (item.description || item.itemName || '').toLowerCase().trim()
      const qty = item.quantity || 1

      // Try to find cost from purchases or items master
      const costData = itemCostMap.get(itemName)
      if (costData && costData.avgCost > 0) {
        partyData.cost += costData.avgCost * qty
      } else {
        // Fallback: use item's purchasePrice or estimate as 70% of selling price
        const itemFromMaster = items.find(i =>
          (i.name || '').toLowerCase().trim() === itemName
        )
        if (itemFromMaster && itemFromMaster.purchasePrice) {
          partyData.cost += itemFromMaster.purchasePrice * qty
        } else {
          // Estimate COGS as 70% of revenue for this item
          const itemRevenue = item.totalAmount || (item.rate * qty) || 0
          partyData.cost += itemRevenue * 0.7
        }
      }
    })
  })

  // Convert map to array and calculate profit
  const partyData = Array.from(partyMap.entries()).map(([partyName, data]) => {
    const profit = data.revenue - data.cost
    return {
      partyId: partyName,
      partyName: partyName,
      partyType: 'customer' as const,
      revenue: Math.round(data.revenue * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitMargin: data.revenue > 0 ? Math.round((profit / data.revenue) * 1000) / 10 : 0,
      invoiceCount: data.invoiceCount
    }
  })

  // Sort by revenue descending (highest revenue customers first)
  partyData.sort((a, b) => b.revenue - a.revenue)

  // Filter out parties with zero revenue
  const activeParties = partyData.filter(p => p.revenue > 0)

  return {
    parties: activeParties,
    summary: {
      totalRevenue: Math.round(activeParties.reduce((sum, p) => sum + p.revenue, 0) * 100) / 100,
      totalCost: Math.round(activeParties.reduce((sum, p) => sum + p.cost, 0) * 100) / 100,
      totalProfit: Math.round(activeParties.reduce((sum, p) => sum + p.profit, 0) * 100) / 100,
      totalParties: activeParties.length,
      totalInvoices: activeParties.reduce((sum, p) => sum + p.invoiceCount, 0)
    }
  }
}

/**
 * Helper function to calculate taxable value (exclusive base) from invoice items
 * GST Compliance: Always use exclusive base regardless of inclusive/exclusive entry mode
 */
function calculateTaxableValue(inv: any): number {
  if (!inv.items || inv.items.length === 0) {
    // Fallback for old invoices without item details
    return inv.taxableAmount || inv.subtotal || 0
  }

  // Calculate from items: sum of (basePrice × quantity) for each item
  return inv.items.reduce((sum: number, item: any) => {
    const basePrice = item.basePrice || item.basePurchasePrice || item.price || 0
    const quantity = item.qty || item.quantity || 1
    return sum + (basePrice * quantity)
  }, 0)
}

/**
 * GSTR-1 Report - Outward supplies
 */
export async function getGSTR1(month: string, year: string) {
  const sales = await getInvoices('sale')
  const filtered = sales.filter(inv => {
    const date = new Date(inv.invoiceDate)
    return date.getMonth() + 1 === parseInt(month) && date.getFullYear() === parseInt(year)
  })

  const b2b = filtered.filter(inv => inv.partyGSTIN)
  const b2c = filtered.filter(inv => !inv.partyGSTIN)

  return {
    period: { month, year },
    b2b: {
      invoices: b2b,
      count: b2b.length,
      taxableValue: b2b.reduce((sum, inv) => sum + calculateTaxableValue(inv), 0),
      cgst: b2b.reduce((sum, inv) => sum + inv.totalTaxAmount / 2, 0),
      sgst: b2b.reduce((sum, inv) => sum + inv.totalTaxAmount / 2, 0),
      totalTax: b2b.reduce((sum, inv) => sum + inv.totalTaxAmount, 0)
    },
    b2c: {
      invoices: b2c,
      count: b2c.length,
      taxableValue: b2c.reduce((sum, inv) => sum + calculateTaxableValue(inv), 0),
      cgst: b2c.reduce((sum, inv) => sum + inv.totalTaxAmount / 2, 0),
      sgst: b2c.reduce((sum, inv) => sum + inv.totalTaxAmount / 2, 0),
      totalTax: b2c.reduce((sum, inv) => sum + inv.totalTaxAmount, 0)
    }
  }
}

/**
 * GSTR-3B Report - Monthly summary
 */
export async function getGSTR3B(month: string, year: string) {
  const gstr1 = await getGSTR1(month, year)
  const purchases = await getInvoices('purchase')

  const filteredPurchases = purchases.filter(inv => {
    const date = new Date(inv.invoiceDate)
    return date.getMonth() + 1 === parseInt(month) && date.getFullYear() === parseInt(year)
  })

  const outputTax = gstr1.b2b.totalTax + gstr1.b2c.totalTax
  const inputTax = filteredPurchases.reduce((sum, inv) => sum + inv.totalTaxAmount, 0)

  return {
    period: { month, year },
    outwardSupplies: {
      taxableValue: gstr1.b2b.taxableValue + gstr1.b2c.taxableValue,
      cgst: gstr1.b2b.cgst + gstr1.b2c.cgst,
      sgst: gstr1.b2b.sgst + gstr1.b2c.sgst,
      totalTax: outputTax
    },
    inwardSupplies: {
      taxableValue: filteredPurchases.reduce((sum, inv) => sum + calculateTaxableValue(inv), 0),
      cgst: inputTax / 2,
      sgst: inputTax / 2,
      totalTax: inputTax
    },
    netTaxLiability: outputTax - inputTax,
    taxPayable: Math.max(0, outputTax - inputTax)
  }
}

/**
 * Sale Summary by HSN
 */
export async function getSaleSummaryByHSN() {
  const sales = await getInvoices('sale')

  const hsnMap = new Map<string, any>()

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const hsn = item.hsn || 'N/A'
      if (!hsnMap.has(hsn)) {
        hsnMap.set(hsn, {
          hsn,
          description: item.description,
          quantity: 0,
          taxableValue: 0,
          taxAmount: 0,
          totalValue: 0
        })
      }

      const data = hsnMap.get(hsn)
      data.quantity += item.quantity
      data.taxableValue += item.amount
      data.taxAmount += (item.amount * item.taxRate / 100)
      data.totalValue += item.amount + (item.amount * item.taxRate / 100)
    })
  })

  return { hsnWiseData: Array.from(hsnMap.values()) }
}

/**
 * Stock Summary Report
 */
export async function getStockSummary() {
  const items = await getItems()

  // Ensure stock is always a number (handle undefined/null from Firebase)
  // Use reorderPoint for low stock threshold (same as Inventory page)
  const normalizedItems = items.map(item => ({
    ...item,
    stock: item.stock ?? 0,
    reorderPoint: item.reorderPoint ?? 0 // Use reorderPoint to match Inventory page
  }))

  const outOfStockCount = normalizedItems.filter(item => item.stock === 0).length
  // Low stock: stock > 0 AND stock <= reorderPoint (same logic as Inventory page)
  const lowStockCount = normalizedItems.filter(item => item.stock > 0 && item.stock <= item.reorderPoint).length
  const inStockCount = normalizedItems.filter(item => item.stock > item.reorderPoint).length

  const summary = {
    totalItems: normalizedItems.length,
    totalValue: normalizedItems.reduce((sum, item) => sum + (item.stock * (item.sellingPrice || 0)), 0),
    inStock: inStockCount,
    lowStock: lowStockCount,
    outOfStock: outOfStockCount
  }

  return {
    summary,
    items: normalizedItems.map(item => {
      const qty = item.stock
      const reorderPoint = item.reorderPoint

      return {
        name: item.name,
        sku: item.sku,
        quantity: qty,
        value: qty * (item.sellingPrice || 0),
        unitPrice: item.sellingPrice || 0, // Add unit price for reference
        status: qty === 0 ? 'Out of Stock' :
                qty <= reorderPoint ? 'Low Stock' : 'In Stock'
      }
    })
  }
}

/**
 * Item-wise Profit & Loss
 */
export async function getItemWiseProfitLoss() {
  const sales = await getInvoices('sale')
  const purchases = await getInvoices('purchase')

  const itemMap = new Map<string, any>()

  // Calculate item costs from purchases
  purchases.forEach(purchase => {
    purchase.items.forEach(item => {
      if (!itemMap.has(item.description)) {
        itemMap.set(item.description, {
          itemName: item.description,
          totalCost: 0,
          totalRevenue: 0,
          quantitySold: 0,
          quantityPurchased: 0
        })
      }
      const data = itemMap.get(item.description)
      data.totalCost += item.amount
      data.quantityPurchased += item.quantity
    })
  })

  // Calculate item revenue from sales
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!itemMap.has(item.description)) {
        itemMap.set(item.description, {
          itemName: item.description,
          totalCost: 0,
          totalRevenue: 0,
          quantitySold: 0,
          quantityPurchased: 0
        })
      }
      const data = itemMap.get(item.description)
      data.totalRevenue += item.amount + (item.amount * item.taxRate / 100)
      data.quantitySold += item.quantity
    })
  })

  const itemData = Array.from(itemMap.values()).map(item => {
    // Rule 1: If Qty Sold = 0, show Cost = 0, Profit = 0, Margin = 0%
    if (item.quantitySold === 0) {
      return {
        ...item,
        totalCost: 0,
        profit: 0,
        profitMargin: 0
      }
    }

    // For items with sales, calculate cost per unit and apply to sold quantity
    const costPerUnit = item.quantityPurchased > 0 ? item.totalCost / item.quantityPurchased : 0
    const allocatedCost = costPerUnit * item.quantitySold
    const profit = item.totalRevenue - allocatedCost

    return {
      ...item,
      totalCost: allocatedCost, // Only cost of units actually sold
      profit: profit,
      profitMargin: item.totalRevenue > 0 ? (profit / item.totalRevenue) * 100 : 0
    }
  })

  // Rule 2: Only sum items that were actually sold
  const soldItems = itemData.filter(item => item.quantitySold > 0)

  return {
    items: itemData,
    summary: {
      totalRevenue: soldItems.reduce((sum, i) => sum + i.totalRevenue, 0),
      totalCost: soldItems.reduce((sum, i) => sum + i.totalCost, 0),
      totalProfit: soldItems.reduce((sum, i) => sum + i.profit, 0)
    }
  }
}

/**
 * Discount Report - Enhanced with product details
 * Shows: Date | Invoice | Customer | Product | Original Amount | Coupon | Discount Given | Final Amount | Platform
 */
export async function getDiscountReport(startDate: string, endDate: string) {
  const allInvoices = await getInvoices()
  // Use normalized date comparison to handle various date formats
  const filtered = allInvoices.filter(inv => isDateInRange(inv.invoiceDate, startDate, endDate))

  // Get item-level discounts for detailed breakdown
  const itemDiscounts: Array<{
    invoiceNumber: string
    partyName: string
    invoiceDate: string
    productName: string
    originalPrice: number
    sellingPrice: number
    couponCode: string
    couponDiscount: number
    manualDiscount: number
    totalDiscount: number
    platform: string
  }> = []

  // Calculate total discount including BOTH invoice-level AND item-level discounts
  let totalDiscount = 0
  let totalOriginal = 0

  filtered.forEach(inv => {
    // Check for invoice-level discounts - check both discountAmount and discountPercent
    // discountAmount is the calculated value, discountPercent is the percentage applied
    const invoiceDiscountPercent = (inv as any).discountPercent || 0
    const invoiceDiscountFromPercent = invoiceDiscountPercent > 0 ? (invoiceDiscountPercent / 100) * (inv.subtotal || inv.grandTotal) : 0
    const invoiceDiscount = inv.discountAmount || invoiceDiscountFromPercent || 0
    const couponCode = (inv as any).couponCode || (inv as any).discountCode || ''
    const platform = (inv as any).platform || (inv as any).channel || 'Direct'

    // Calculate item-level discounts and original amounts
    let invoiceItemDiscount = 0
    let invoiceOriginalAmount = 0

    if (inv.items && inv.items.length > 0) {
      inv.items.forEach(item => {
        const itemOriginal = (item.rate || (item as any).price || 0) * (item.quantity || 1)
        // Check multiple discount fields: discountAmount, discountPercent, or discount (percentage)
        const discountPercent = (item as any).discountPercent || (item as any).discount || 0
        const discountAmountFromPercent = discountPercent > 0 ? (discountPercent / 100) * itemOriginal : 0
        const itemDiscount = (item.discountAmount || 0) + discountAmountFromPercent

        invoiceItemDiscount += itemDiscount
        invoiceOriginalAmount += itemOriginal

        // Only include items with discounts OR invoice has discount
        if (itemDiscount > 0 || invoiceDiscount > 0) {
          const itemShare = inv.items.length > 1 ? invoiceDiscount / inv.items.length : invoiceDiscount
          itemDiscounts.push({
            invoiceNumber: inv.invoiceNumber,
            partyName: inv.partyName || 'Walk-in Customer',
            invoiceDate: inv.invoiceDate,
            productName: item.itemName || item.description || 'Item',
            originalPrice: itemOriginal,
            sellingPrice: itemOriginal - itemDiscount - itemShare,
            couponCode: couponCode,
            couponDiscount: itemDiscount,
            manualDiscount: itemShare,
            totalDiscount: itemDiscount + itemShare,
            platform: platform
          })
        }
      })
    } else {
      // Invoice without items - use grandTotal + invoiceDiscount as original
      invoiceOriginalAmount = inv.grandTotal + invoiceDiscount
    }

    // Add to totals: include both invoice-level and item-level discounts
    totalDiscount += invoiceDiscount + invoiceItemDiscount
    totalOriginal += invoiceOriginalAmount > 0 ? invoiceOriginalAmount : (inv.grandTotal + invoiceDiscount)

    if (invoiceDiscount > 0 && (!inv.items || inv.items.length === 0)) {
      // Invoice without items but has discount
      itemDiscounts.push({
        invoiceNumber: inv.invoiceNumber,
        partyName: inv.partyName || 'Walk-in Customer',
        invoiceDate: inv.invoiceDate,
        productName: 'Various Items',
        originalPrice: inv.grandTotal + invoiceDiscount,
        sellingPrice: inv.grandTotal,
        couponCode: couponCode,
        couponDiscount: 0,
        manualDiscount: invoiceDiscount,
        totalDiscount: invoiceDiscount,
        platform: platform
      })
    }
  })

  const totalSales = filtered.reduce((sum, inv) => sum + inv.grandTotal, 0)

  // Invoice-level summary (original format for backwards compatibility)
  const invoiceSummary = filtered
    .filter(inv => (inv.discountAmount || 0) > 0)
    .map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      partyName: inv.partyName,
      invoiceDate: inv.invoiceDate,
      originalAmount: inv.grandTotal + (inv.discountAmount || 0),
      discount: inv.discountAmount || 0,
      finalAmount: inv.grandTotal,
      couponCode: (inv as any).couponCode || '',
      platform: (inv as any).platform || 'Direct',
      itemCount: inv.items?.length || 0
    }))
    .sort((a, b) => b.discount - a.discount)

  return {
    period: { startDate, endDate },
    totalDiscount,
    totalSales,
    totalOriginal,
    discountPercentage: totalOriginal > 0 ? (totalDiscount / totalOriginal) * 100 : 0,
    invoiceCount: filtered.length,
    discountInvoiceCount: invoiceSummary.length,
    // Invoice-level summary
    invoices: invoiceSummary,
    // Item-level detailed breakdown
    itemDiscounts: itemDiscounts.sort((a, b) => b.totalDiscount - a.totalDiscount),
    // Summary by coupon
    couponSummary: Object.entries(
      itemDiscounts
        .filter(d => d.couponCode)
        .reduce((acc, d) => {
          acc[d.couponCode] = (acc[d.couponCode] || 0) + d.couponDiscount
          return acc
        }, {} as Record<string, number>)
    ).map(([code, amount]) => ({ code, amount })).sort((a, b) => b.amount - a.amount),
    // Summary by platform
    platformSummary: Object.entries(
      invoiceSummary.reduce((acc, inv) => {
        acc[inv.platform] = (acc[inv.platform] || 0) + inv.discount
        return acc
      }, {} as Record<string, number>)
    ).map(([platform, amount]) => ({ platform, amount })).sort((a, b) => b.amount - a.amount)
  }
}

/**
 * Cash in Hand / Bank Balance Report
 * Shows closing cash and bank balances as on a specific date
 * Uses the exact logic from Vyapar, Busy, Marg, Tally, Zoho
 */
export async function getCashAndBankBalance(asOfDate: string) {
  console.log('🎯 getCashAndBankBalance called with asOfDate:', asOfDate)
  const allInvoices = await getInvoices()
  const allExpenses = await getExpenses()
  console.log('📦 Fetched data:', { invoiceCount: allInvoices.length, expenseCount: allExpenses.length })

  // Filter all transactions up to the selected date
  const invoicesUpToDate = allInvoices.filter(inv => inv.invoiceDate <= asOfDate)
  const expensesUpToDate = allExpenses.filter(exp => exp.date <= asOfDate)

  // Get opening balances from Banking page's localStorage (dynamic data)
  let openingCashTotal = 10000 // Default fallback
  const openingBanks: Record<string, number> = {}

  try {
    const bankingAccountsStr = localStorage.getItem('bankingAccounts')
    if (bankingAccountsStr) {
      const bankingData = JSON.parse(bankingAccountsStr)
      // Get cash in hand balance
      if (bankingData.cashInHand && typeof bankingData.cashInHand.balance === 'number') {
        openingCashTotal = bankingData.cashInHand.balance
      }
      // Get bank accounts
      if (bankingData.bankAccounts && Array.isArray(bankingData.bankAccounts)) {
        bankingData.bankAccounts.forEach((acc: any) => {
          const accountName = acc.name || `${acc.bankName || 'Bank'} A/c`
          openingBanks[accountName] = acc.balance || acc.openingBalance || 0
        })
      }
    }
  } catch (error) {
    console.warn('Could not load banking accounts from localStorage:', error)
  }

  // If no bank accounts found, use default structure
  if (Object.keys(openingBanks).length === 0) {
    openingBanks['SBI A/c'] = 30000
    openingBanks['HDFC A/c'] = 20000
    openingBanks['Axis A/c'] = 0
  }

  // Calculate opening cash for TODAY (previous day's closing)
  // This should be: opening balance + all previous transactions before today
  const invoicesBeforeToday = allInvoices.filter(inv => inv.invoiceDate < asOfDate)
  const expensesBeforeToday = allExpenses.filter(exp => exp.date < asOfDate)

  const cashSalesBeforeToday = invoicesBeforeToday
    .filter(inv => inv.type === 'sale' && inv.payment?.mode === 'cash')
    .reduce((sum, inv) => sum + (inv.payment?.paidAmount || inv.grandTotal || 0), 0)

  const cashPurchasesBeforeToday = invoicesBeforeToday
    .filter(inv => inv.type === 'purchase' && inv.payment?.mode === 'cash')
    .reduce((sum, inv) => sum + (inv.payment?.paidAmount || inv.grandTotal || 0), 0)

  const cashExpensesBeforeToday = expensesBeforeToday
    .filter(exp => exp.paymentMode === 'cash')
    .reduce((sum, exp) => sum + exp.amount, 0)

  const openingCash = openingCashTotal + cashSalesBeforeToday - cashPurchasesBeforeToday - cashExpensesBeforeToday

  // Calculate CUMULATIVE Cash Receipts (all-time up to date - for closing balance)
  const cashSalesTotal = invoicesUpToDate
    .filter(inv => inv.type === 'sale' && inv.payment?.mode === 'cash')
    .reduce((sum, inv) => sum + (inv.payment?.paidAmount || inv.grandTotal || 0), 0)

  // Calculate TODAY'S Cash Receipts (for breakdown display)
  const cashSalesToday = allInvoices
    .filter(inv => inv.type === 'sale' && inv.payment?.mode === 'cash' && matchesDate(inv.invoiceDate, asOfDate))
    .reduce((sum, inv) => sum + (inv.payment?.paidAmount || inv.grandTotal || 0), 0)

  // Calculate Bank Receipts (money that came IN to bank)
  const bankReceiptsTotal: Record<string, number> = {}
  const bankReceiptsToday: Record<string, number> = {}
  const bankPaymentModes = ['bank', 'upi', 'card', 'cheque']

  invoicesUpToDate
    .filter(inv => inv.type === 'sale' && bankPaymentModes.includes(inv.payment?.mode || ''))
    .forEach(inv => {
      const bank = inv.payment?.bankReference || 'SBI A/c'
      bankReceiptsTotal[bank] = (bankReceiptsTotal[bank] || 0) + (inv.payment?.paidAmount || inv.grandTotal || 0)

      // Track today's receipts separately
      if (matchesDate(inv.invoiceDate, asOfDate)) {
        bankReceiptsToday[bank] = (bankReceiptsToday[bank] || 0) + (inv.payment?.paidAmount || inv.grandTotal || 0)
      }
    })

  // Calculate CUMULATIVE Cash Payments (all-time up to date - for closing balance)
  const cashPurchasesTotal = invoicesUpToDate
    .filter(inv => inv.type === 'purchase' && inv.payment?.mode === 'cash')
    .reduce((sum, inv) => sum + (inv.payment?.paidAmount || inv.grandTotal || 0), 0)

  const cashExpensesTotal = expensesUpToDate
    .filter(exp => exp.paymentMode === 'cash')
    .reduce((sum, exp) => sum + exp.amount, 0)

  // Calculate TODAY'S Cash Payments (for breakdown display)
  const cashPurchasesToday = allInvoices
    .filter(inv => inv.type === 'purchase' && inv.payment?.mode === 'cash' && matchesDate(inv.invoiceDate, asOfDate))
    .reduce((sum, inv) => sum + (inv.payment?.paidAmount || inv.grandTotal || 0), 0)

  const cashExpensesToday = allExpenses
    .filter(exp => exp.paymentMode === 'cash' && matchesDate(exp.date, asOfDate))
    .reduce((sum, exp) => sum + exp.amount, 0)

  // Calculate Bank Payments (money that went OUT from bank)
  const bankPaymentsTotal: Record<string, number> = {}
  const bankPaymentsToday: Record<string, number> = {}

  invoicesUpToDate
    .filter(inv => inv.type === 'purchase' && bankPaymentModes.includes(inv.payment?.mode || ''))
    .forEach(inv => {
      const bank = inv.payment?.bankReference || 'SBI A/c'
      bankPaymentsTotal[bank] = (bankPaymentsTotal[bank] || 0) + (inv.payment?.paidAmount || inv.grandTotal || 0)

      // Track today's payments separately
      if (matchesDate(inv.invoiceDate, asOfDate)) {
        bankPaymentsToday[bank] = (bankPaymentsToday[bank] || 0) + (inv.payment?.paidAmount || inv.grandTotal || 0)
      }
    })

  expensesUpToDate
    .filter(exp => bankPaymentModes.includes(exp.paymentMode))
    .forEach(exp => {
      const bank = 'SBI A/c' // Default bank for expenses
      bankPaymentsTotal[bank] = (bankPaymentsTotal[bank] || 0) + exp.amount

      // Track today's payments separately
      if (matchesDate(exp.date, asOfDate)) {
        bankPaymentsToday[bank] = (bankPaymentsToday[bank] || 0) + exp.amount
      }
    })

  // Calculate Closing Balances
  // Closing = Opening (yesterday's close) + Today's receipts - Today's payments
  const closingCash = openingCash + cashSalesToday - cashPurchasesToday - cashExpensesToday

  const closingBanks: Record<string, number> = {}
  let totalBankBalance = 0

  Object.keys(openingBanks).forEach(bank => {
    const opening = openingBanks[bank]
    const receipts = bankReceiptsTotal[bank] || 0
    const payments = bankPaymentsTotal[bank] || 0
    const closing = opening + receipts - payments

    closingBanks[bank] = closing
    totalBankBalance += closing
  })

  const totalLiquidCash = closingCash + totalBankBalance

  // Breakdown for transparency - shows TODAY'S movements only
  const cashBreakdown = {
    opening: openingCash,
    salesReceipts: cashSalesToday,       // Today's cash sales only
    purchasePayments: cashPurchasesToday, // Today's cash purchases only
    expensePayments: cashExpensesToday,   // Today's cash expenses only
    closing: closingCash                  // Cumulative closing balance
  }

  const bankBreakdown = Object.keys(openingBanks).map(bank => ({
    bankName: bank,
    opening: openingBanks[bank],
    receipts: bankReceiptsToday[bank] || 0,  // Today's receipts only
    payments: bankPaymentsToday[bank] || 0,  // Today's payments only
    closing: closingBanks[bank]              // Cumulative closing balance
  }))

  return {
    asOfDate,
    cashInHand: closingCash,
    bankAccounts: Object.keys(closingBanks).map(bank => ({
      name: bank,
      balance: closingBanks[bank]
    })),
    totalBankBalance,
    totalLiquidCash,
    cashBreakdown,
    bankBreakdown
  }
}

/**
 * Fast Moving Items Report
 * Shows top-selling items by quantity with stock days remaining
 * This helps businesses identify hot sellers and avoid stockouts
 *
 * @param days - Period to analyze (default: 30 days)
 * @param topN - Number of top items to return (default: 20)
 * @param minQuantity - Minimum quantity sold to be included (default: 100 - realistic threshold for fast-moving items)
 */
export async function getFastMovingItems(
  days: number = 30,
  topN: number = 20,
  minQuantity: number = 100
) {
  // Get all sale invoices
  const allInvoices = await getInvoices('sale')
  const items = await getItems()

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  // Filter invoices within the period
  const periodInvoices = allInvoices.filter(inv => inv.invoiceDate >= startDateStr)

  // Aggregate quantity sold per item
  const itemSalesMap = new Map<string, {
    itemName: string
    totalQuantitySold: number
    itemId?: string
  }>()

  periodInvoices.forEach(invoice => {
    invoice.items.forEach(item => {
      const itemName = item.itemName || item.description
      const existing = itemSalesMap.get(itemName) || {
        itemName,
        totalQuantitySold: 0,
        itemId: item.itemId
      }
      existing.totalQuantitySold += item.quantity
      itemSalesMap.set(itemName, existing)
    })
  })

  // Filter items with minimum quantity sold
  const fastMovingData = Array.from(itemSalesMap.values())
    .filter(item => item.totalQuantitySold >= minQuantity)
    .map(salesData => {
      // Find matching item in inventory
      const inventoryItem = items.find(i =>
        i.name === salesData.itemName || i.id === salesData.itemId
      )

      // Calculate average daily sale
      const avgDailySale = salesData.totalQuantitySold / days

      // Get current stock
      const currentStock = inventoryItem?.stock ?? 0

      // Calculate days of stock left
      const daysLeft = avgDailySale > 0 ? currentStock / avgDailySale : 999

      // Determine status
      let status: 'Critical' | 'Low' | 'Safe' = 'Safe'
      let statusColor: 'red' | 'orange' | 'green' = 'green'

      if (daysLeft <= 5) {
        status = 'Critical'
        statusColor = 'red'
      } else if (daysLeft <= 15) {
        status = 'Low'
        statusColor = 'orange'
      }

      return {
        itemName: salesData.itemName,
        itemId: salesData.itemId,
        quantitySold: salesData.totalQuantitySold,
        avgDailySale: Math.round(avgDailySale * 100) / 100, // Round to 2 decimals
        currentStock,
        daysLeft: Math.round(daysLeft * 10) / 10, // Round to 1 decimal
        status,
        statusColor,
        unit: inventoryItem?.unit || 'PCS',
        sellingPrice: inventoryItem?.sellingPrice || 0,
        sku: inventoryItem?.sku || 'N/A'
      }
    })
    .sort((a, b) => b.quantitySold - a.quantitySold) // Sort by quantity sold descending
    .slice(0, topN) // Take top N items

  // Add rank
  const rankedItems = fastMovingData.map((item, index) => ({
    rank: index + 1,
    ...item
  }))

  // Calculate summary stats
  const summary = {
    periodDays: days,
    totalItemsAnalyzed: itemSalesMap.size,
    fastMovingCount: rankedItems.length,
    criticalCount: rankedItems.filter(i => i.status === 'Critical').length,
    lowCount: rankedItems.filter(i => i.status === 'Low').length,
    safeCount: rankedItems.filter(i => i.status === 'Safe').length,
    totalQuantitySold: rankedItems.reduce((sum, i) => sum + i.quantitySold, 0)
  }

  return {
    items: rankedItems,
    summary,
    period: {
      startDate: startDateStr,
      endDate: endDate.toISOString().split('T')[0],
      days
    }
  }
}

/**
 * Slow Moving Items Report
 * Shows slowest-selling items that are tying up capital (dead stock)
 * This helps businesses identify items to clear via discounts/promotions
 *
 * @param days - Period to analyze (default: 30 days)
 * @param topN - Number of bottom items to return (default: 20)
 * @param maxQuantity - Maximum quantity sold to be included (default: 10 - realistic threshold for slow-moving items)
 */
export async function getSlowMovingItems(
  days: number = 30,
  topN: number = 20,
  maxQuantity: number = 10
) {
  // Get all sale invoices
  const allInvoices = await getInvoices('sale')
  const items = await getItems()

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  // Filter invoices within the period
  const periodInvoices = allInvoices.filter(inv => inv.invoiceDate >= startDateStr)

  // Aggregate quantity sold per item
  const itemSalesMap = new Map<string, {
    itemName: string
    totalQuantitySold: number
    itemId?: string
  }>()

  periodInvoices.forEach(invoice => {
    invoice.items.forEach(item => {
      const itemName = item.itemName || item.description
      const existing = itemSalesMap.get(itemName) || {
        itemName,
        totalQuantitySold: 0,
        itemId: item.itemId
      }
      existing.totalQuantitySold += item.quantity
      itemSalesMap.set(itemName, existing)
    })
  })

  // Add items with 0 sales from inventory
  items.forEach(invItem => {
    if (!itemSalesMap.has(invItem.name) && invItem.stock > 0) {
      itemSalesMap.set(invItem.name, {
        itemName: invItem.name,
        totalQuantitySold: 0,
        itemId: invItem.id
      })
    }
  })

  // Filter items with maximum quantity sold (slow movers)
  const slowMovingData = Array.from(itemSalesMap.values())
    .filter(item => item.totalQuantitySold <= maxQuantity)
    .map(salesData => {
      // Find matching item in inventory
      const inventoryItem = items.find(i =>
        i.name === salesData.itemName || i.id === salesData.itemId
      )

      // Calculate average daily sale
      const avgDailySale = salesData.totalQuantitySold / days

      // Get current stock
      const currentStock = inventoryItem?.stock ?? 0

      // Calculate days until stock is exhausted (how long this dead stock will sit)
      const daysToExhaust = avgDailySale > 0 ? currentStock / avgDailySale : 999

      // Calculate stock value (capital tied up)
      const stockValue = currentStock * (inventoryItem?.purchasePrice || inventoryItem?.sellingPrice || 0)

      // Determine status (opposite of fast moving)
      let status: 'Dead Stock' | 'Very Slow' | 'Slow' = 'Slow'
      let statusColor: 'red' | 'orange' | 'yellow' = 'yellow'

      if (salesData.totalQuantitySold === 0) {
        status = 'Dead Stock'
        statusColor = 'red'
      } else if (avgDailySale < 0.1) { // Less than 0.1 per day = ~3 per month
        status = 'Very Slow'
        statusColor = 'orange'
      }

      return {
        itemName: salesData.itemName,
        itemId: salesData.itemId,
        quantitySold: salesData.totalQuantitySold,
        avgDailySale: Math.round(avgDailySale * 100) / 100, // Round to 2 decimals
        currentStock,
        daysToExhaust: daysToExhaust > 999 ? 999 : Math.round(daysToExhaust * 10) / 10,
        stockValue: Math.round(stockValue),
        status,
        statusColor,
        unit: inventoryItem?.unit || 'PCS',
        sellingPrice: inventoryItem?.sellingPrice || 0,
        sku: inventoryItem?.sku || 'N/A'
      }
    })
    .sort((a, b) => a.quantitySold - b.quantitySold) // Sort by quantity sold ascending (slowest first)
    .slice(0, topN) // Take bottom N items

  // Add rank
  const rankedItems = slowMovingData.map((item, index) => ({
    rank: index + 1,
    ...item
  }))

  // Calculate summary stats
  const summary = {
    periodDays: days,
    totalItemsAnalyzed: itemSalesMap.size,
    slowMovingCount: rankedItems.length,
    deadStockCount: rankedItems.filter(i => i.status === 'Dead Stock').length,
    verySlowCount: rankedItems.filter(i => i.status === 'Very Slow').length,
    slowCount: rankedItems.filter(i => i.status === 'Slow').length,
    totalStockValue: rankedItems.reduce((sum, i) => sum + i.stockValue, 0),
    totalQuantitySold: rankedItems.reduce((sum, i) => sum + i.quantitySold, 0)
  }

  return {
    items: rankedItems,
    summary,
    period: {
      startDate: startDateStr,
      endDate: endDate.toISOString().split('T')[0],
      days
    }
 }
}

/**
 * Accounts Receivable Report - Pending Payments to Receive
 * Shows all customers who owe money (unpaid/partial invoices)
 */
export async function getAccountsReceivable() {
  // Pull all invoices plus party master so we can positively identify customers vs suppliers
  const [allInvoices, parties] = await Promise.all([
    getInvoices(), // include any mis-tagged invoices
    getParties('both')
  ])

  // Build quick lookups for party type matching
  const customerIds = new Set(
    parties
      .filter(p => p.type === 'customer' || p.type === 'both')
      .map(p => p.id)
      .filter(Boolean)
  )
  const supplierIds = new Set(
    parties
      .filter(p => p.type === 'supplier' || p.type === 'both')
      .map(p => p.id)
      .filter(Boolean)
  )
  const normalize = (v?: string) => (v || '').trim().toLowerCase()
  const customerNames = new Set(
    parties
      .filter(p => p.type === 'customer' || p.type === 'both')
      .flatMap(p => [p.displayName, p.companyName, p.name])
      .map(normalize)
      .filter(Boolean)
  )
  const supplierNames = new Set(
    parties
      .filter(p => p.type === 'supplier' || p.type === 'both')
      .flatMap(p => [p.displayName, p.companyName, p.name])
      .map(normalize)
      .filter(Boolean)
  )

  const inferPartyType = (inv: any): 'customer' | 'supplier' | 'unknown' => {
    // Trust explicit type first
    if (inv.type === 'purchase') return 'supplier'
    if (inv.type === 'sale' || inv.type === 'quote') return 'customer'
    if (inv.partyType === 'supplier') return 'supplier'
    if (inv.partyType === 'customer') return 'customer'

    // Use IDs next
    if (inv.partyId && supplierIds.has(inv.partyId) && !customerIds.has(inv.partyId)) return 'supplier'
    if (inv.partyId && customerIds.has(inv.partyId) && !supplierIds.has(inv.partyId)) return 'customer'

    // Name-based fallback
    const names = [
      normalize(inv.partyName),
      normalize(inv.customerName),
      normalize(inv.supplierName)
    ].filter(Boolean)

    if (names.some(n => customerNames.has(n))) return 'customer'
    if (names.some(n => supplierNames.has(n))) return 'supplier'
    return 'unknown'
  }

  // Filter invoices with pending payments
  const receivables = allInvoices.filter(inv => {
    const dueAmount = inv.payment?.dueAmount || 0
    if (dueAmount <= 0) return false // Has pending amount

    // Ensure this is truly a customer invoice (not a supplier bill slipping through)
    const partyType = inferPartyType(inv)
    if (partyType === 'supplier') return false

    // If unknown, keep only if invoice explicitly marked as sale
    return partyType === 'customer' || inv.type === 'sale'
  })

  // Group by customer
  const customerMap = new Map<string, {
    customerName: string
    totalDue: number
    invoiceCount: number
    invoices: Array<{
      invoiceNumber: string
      invoiceDate: string
      grandTotal: number
      paidAmount: number
      dueAmount: number
      dueDate?: string
      overdueDays: number
    }>
  }>()

  receivables.forEach(inv => {
    const customerName = inv.partyName || 'Walk-in Customer'
    const dueAmount = inv.payment?.dueAmount || 0
    const paidAmount = inv.payment?.paidAmount || 0

    // Calculate overdue days
    const dueDate = inv.payment?.dueDate
    const overdueDays = dueDate
      ? Math.max(0, Math.ceil((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    if (!customerMap.has(customerName)) {
      customerMap.set(customerName, {
        customerName,
        totalDue: 0,
        invoiceCount: 0,
        invoices: []
      })
    }

    const customer = customerMap.get(customerName)!
    customer.totalDue += dueAmount
    customer.invoiceCount++
    customer.invoices.push({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      grandTotal: inv.grandTotal,
      paidAmount,
      dueAmount,
      dueDate,
      overdueDays
    })
  })

  // Convert to array and sort by total due (highest first)
  const customers = Array.from(customerMap.values())
    .sort((a, b) => b.totalDue - a.totalDue)

  // Calculate totals
  const totalReceivables = customers.reduce((sum, c) => sum + c.totalDue, 0)
  const totalInvoices = receivables.length
  const totalCustomers = customers.length

  // Categorize by aging (0-30, 31-60, 61-90, 90+)
  const aging = {
    current: 0,      // 0-30 days
    days30to60: 0,   // 31-60 days
    days60to90: 0,   // 61-90 days
    over90: 0        // 90+ days
  }

  receivables.forEach(inv => {
    const dueDate = inv.payment?.dueDate
    const dueAmount = inv.payment?.dueAmount || 0

    if (dueDate) {
      const overdueDays = Math.max(0, Math.ceil((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)))

      if (overdueDays <= 30) {
        aging.current += dueAmount
      } else if (overdueDays <= 60) {
        aging.days30to60 += dueAmount
      } else if (overdueDays <= 90) {
        aging.days60to90 += dueAmount
      } else {
        aging.over90 += dueAmount
      }
    } else {
      aging.current += dueAmount
    }
  })

  return {
    totalReceivables,
    totalInvoices,
    totalCustomers,
    customers,
    aging,
    generatedAt: new Date().toISOString()
  }
}

/**
 * Accounts Payable Report - Pending Payments to Pay
 * Shows all suppliers who we owe money (unpaid/partial purchase invoices)
 */
export async function getAccountsPayable() {
  // Pull all invoices plus party master to correctly separate suppliers
  const [allInvoices, parties] = await Promise.all([
    getInvoices(), // include any mis-tagged invoices
    getParties('both')
  ])

  const customerIds = new Set(
    parties
      .filter(p => p.type === 'customer' || p.type === 'both')
      .map(p => p.id)
      .filter(Boolean)
  )
  const supplierIds = new Set(
    parties
      .filter(p => p.type === 'supplier' || p.type === 'both')
      .map(p => p.id)
      .filter(Boolean)
  )
  const normalize = (v?: string) => (v || '').trim().toLowerCase()
  const customerNames = new Set(
    parties
      .filter(p => p.type === 'customer' || p.type === 'both')
      .flatMap(p => [p.displayName, p.companyName, p.name])
      .map(normalize)
      .filter(Boolean)
  )
  const supplierNames = new Set(
    parties
      .filter(p => p.type === 'supplier' || p.type === 'both')
      .flatMap(p => [p.displayName, p.companyName, p.name])
      .map(normalize)
      .filter(Boolean)
  )

  const inferPartyType = (inv: any): 'customer' | 'supplier' | 'unknown' => {
    if (inv.type === 'purchase') return 'supplier'
    if (inv.type === 'sale' || inv.type === 'quote') return 'customer'
    if (inv.partyType === 'supplier') return 'supplier'
    if (inv.partyType === 'customer') return 'customer'

    if (inv.partyId && supplierIds.has(inv.partyId) && !customerIds.has(inv.partyId)) return 'supplier'
    if (inv.partyId && customerIds.has(inv.partyId) && !supplierIds.has(inv.partyId)) return 'customer'

    const names = [
      normalize(inv.partyName),
      normalize(inv.customerName),
      normalize(inv.supplierName)
    ].filter(Boolean)

    if (names.some(n => supplierNames.has(n))) return 'supplier'
    if (names.some(n => customerNames.has(n))) return 'customer'
    return 'unknown'
  }

  // Filter invoices with pending payments
  const payables = allInvoices.filter(inv => {
    const dueAmount = inv.payment?.dueAmount || 0
    if (dueAmount <= 0) return false // Has pending amount

    const partyType = inferPartyType(inv)
    if (partyType === 'customer') return false

    return partyType === 'supplier' || inv.type === 'purchase'
  })

  // Group by supplier
  const supplierMap = new Map<string, {
    supplierName: string
    totalDue: number
    invoiceCount: number
    invoices: Array<{
      invoiceNumber: string
      invoiceDate: string
      grandTotal: number
      paidAmount: number
      dueAmount: number
      dueDate?: string
      overdueDays: number
    }>
  }>()

  payables.forEach(inv => {
    const supplierName = inv.partyName || 'Unknown Supplier'
    const dueAmount = inv.payment?.dueAmount || 0
    const paidAmount = inv.payment?.paidAmount || 0

    // Calculate overdue days
    const dueDate = inv.payment?.dueDate
    const overdueDays = dueDate
      ? Math.max(0, Math.ceil((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    if (!supplierMap.has(supplierName)) {
      supplierMap.set(supplierName, {
        supplierName,
        totalDue: 0,
        invoiceCount: 0,
        invoices: []
      })
    }

    const supplier = supplierMap.get(supplierName)!
    supplier.totalDue += dueAmount
    supplier.invoiceCount++
    supplier.invoices.push({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      grandTotal: inv.grandTotal,
      paidAmount,
      dueAmount,
      dueDate,
      overdueDays
    })
  })

  // Convert to array and sort by total due (highest first)
  const suppliers = Array.from(supplierMap.values())
    .sort((a, b) => b.totalDue - a.totalDue)

  // Calculate totals
  const totalPayables = suppliers.reduce((sum, s) => sum + s.totalDue, 0)
  const totalInvoices = payables.length
  const totalSuppliers = suppliers.length

  // Categorize by aging (0-30, 31-60, 61-90, 90+)
  const aging = {
    current: 0,      // 0-30 days
    days30to60: 0,   // 31-60 days
    days60to90: 0,   // 61-90 days
    over90: 0        // 90+ days
  }

  payables.forEach(inv => {
    const dueDate = inv.payment?.dueDate
    const dueAmount = inv.payment?.dueAmount || 0

    if (dueDate) {
      const overdueDays = Math.max(0, Math.ceil((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)))

      if (overdueDays <= 30) {
        aging.current += dueAmount
      } else if (overdueDays <= 60) {
        aging.days30to60 += dueAmount
      } else if (overdueDays <= 90) {
        aging.days60to90 += dueAmount
      } else {
        aging.over90 += dueAmount
      }
    } else {
      aging.current += dueAmount
    }
  })

  return {
    totalPayables,
    totalInvoices,
    totalSuppliers,
    suppliers,
    aging,
    generatedAt: new Date().toISOString()
  }
}

/**
 * Purchase Register Report (GST Compliance - ITC)
 * Mandatory record under Section 35 CGST Act, 2017 & Rule 56
 * Must be maintained for 72 months (6 years) for audits
 *
 * Tracks all inward supplies for Input Tax Credit (ITC) verification
 * Links to GSTR-2B reconciliation and GSTR-3B ITC claims
 */
export async function getPurchaseRegister(startDate: string, endDate: string) {
  const allPurchases = await getInvoices('purchase')

  // Filter purchases within date range
  const filtered = allPurchases.filter(inv =>
    inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
  )

  // Process each purchase with full GST details
  const purchases = filtered.map(inv => {
    const supplierName = inv.partyName || 'Unknown Supplier'
    const invoiceNumber = inv.invoiceNumber
    const invoiceDate = inv.invoiceDate

    // Calculate totals (GST Compliance: Use exclusive base)
    const taxableValue = calculateTaxableValue(inv)
    const cgst = inv.items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0)
    const sgst = inv.items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0)
    const igst = inv.items.reduce((sum, item) => sum + (item.igstAmount || 0), 0)
    const totalITC = cgst + sgst + igst
    const grandTotal = inv.grandTotal

    // Payment status - Use actual status from invoice if available, fallback to amount check
    const paidAmount = inv.payment?.paidAmount || 0
    const dueAmount = inv.payment?.dueAmount || 0
    // Priority: 1) Use actual payment.status from invoice, 2) Calculate from amounts
    let paymentStatus: string
    if (inv.payment?.status) {
      // Use the actual status stored in the invoice (from Purchases page)
      paymentStatus = inv.payment.status === 'paid' ? 'Paid' :
                      inv.payment.status === 'partial' ? 'Partial' : 'Pending'
    } else {
      // Fallback: Calculate based on amounts
      paymentStatus = paidAmount >= inv.grandTotal ? 'Paid' :
                      paidAmount > 0 ? 'Partial' : 'Pending'
    }
    const paymentDate = inv.payment?.status === 'paid' ? invoiceDate : null

    // HSN details (from first item - can be expanded for multiple HSNs)
    const firstItem = inv.items[0] || {}
    const hsnCode = firstItem.hsnCode || 'N/A'
    const description = firstItem.description || firstItem.itemName || 'N/A'
    const gstRate = firstItem.taxRate || 0

    // Category mapping based on HSN/SAC codes or description
    let category = 'Other'
    const hsnNum = parseInt(hsnCode) || 0
    if (hsnNum >= 1 && hsnNum <= 2499) category = 'Raw Material'
    else if (hsnNum >= 2500 && hsnNum <= 4999) category = 'Raw Material'
    else if (hsnNum >= 5000 && hsnNum <= 6399) category = 'Raw Material' // Textiles
    else if (hsnNum >= 6400 && hsnNum <= 6799) category = 'Goods'
    else if (hsnNum >= 6800 && hsnNum <= 8499) category = 'Goods'
    else if (hsnNum >= 8500 && hsnNum <= 9999) category = 'Goods'
    else if (hsnCode.startsWith('4819')) category = 'Packaging'
    else if (hsnCode.startsWith('9983')) category = 'Freight/Transport'
    else if (hsnCode.startsWith('9984')) category = 'Freight/Transport'
    else if (hsnCode.startsWith('9973')) category = 'Facebook Ads/Marketing'
    else if (hsnCode.startsWith('998314')) category = 'Google Ads/Marketing'
    else if (hsnCode.startsWith('9972')) category = 'Rent'
    else if (hsnCode.startsWith('9971')) category = 'Financial Services'
    // Override by description keywords
    const descLower = description.toLowerCase()
    if (descLower.includes('packaging') || descLower.includes('box') || descLower.includes('carton')) category = 'Packaging'
    if (descLower.includes('freight') || descLower.includes('shipping') || descLower.includes('courier')) category = 'Freight/Transport'
    if (descLower.includes('facebook') || descLower.includes('google') || descLower.includes('ad')) category = 'Advertising'
    if (descLower.includes('rent') || descLower.includes('lease')) category = 'Rent'
    if (descLower.includes('software') || descLower.includes('subscription')) category = 'Software'
    if (descLower.includes('electricity') || descLower.includes('utility')) category = 'Utilities'

    // ITC eligibility
    let itcEligible = 100 // Default 100% eligible
    // Blocked ITC categories (Section 17(5) CGST Act)
    if (category === 'Food' || descLower.includes('food') || descLower.includes('meal')) itcEligible = 0
    if (descLower.includes('motor vehicle') || descLower.includes('car')) itcEligible = 0
    if (descLower.includes('club') || descLower.includes('membership')) itcEligible = 0

    return {
      invoiceDate,
      supplierName,
      supplierGSTIN: inv.partyGSTIN || 'Unregistered',
      invoiceNumber,
      invoiceValue: grandTotal,
      hsnCode,
      sacCode: hsnCode.startsWith('99') ? hsnCode : '', // Service Accounting Code
      description,
      category, // New: Purchase category
      taxableValue,
      gstRate,
      cgst,
      sgst,
      igst,
      totalITC,
      itcEligible, // New: ITC eligibility percentage
      eligibleITC: totalITC * (itcEligible / 100), // New: Actual claimable ITC
      paymentStatus,
      paymentDate,
      paidAmount,
      dueAmount,
      isRCM: inv.isReverseCharge || false, // Reverse Charge Mechanism
      placeOfSupply: inv.placeOfSupply || 'Same State', // New: Place of supply
      items: inv.items // Full item details for drill-down
    }
  })

  // Calculate summary
  const summary = {
    totalPurchases: purchases.length,
    totalTaxableValue: purchases.reduce((sum, p) => sum + p.taxableValue, 0),
    totalCGST: purchases.reduce((sum, p) => sum + p.cgst, 0),
    totalSGST: purchases.reduce((sum, p) => sum + p.sgst, 0),
    totalIGST: purchases.reduce((sum, p) => sum + p.igst, 0),
    totalITC: purchases.reduce((sum, p) => sum + p.totalITC, 0),
    totalEligibleITC: purchases.reduce((sum, p) => sum + p.eligibleITC, 0), // New: Actual claimable
    totalInvoiceValue: purchases.reduce((sum, p) => sum + p.invoiceValue, 0),
    totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
    totalDue: purchases.reduce((sum, p) => sum + p.dueAmount, 0),
    rcmPurchases: purchases.filter(p => p.isRCM).length,
    blockedITC: purchases.reduce((sum, p) => sum + (p.totalITC - p.eligibleITC), 0) // New: Blocked ITC
  }

  // Category-wise breakdown
  const categoryBreakdown = Object.entries(
    purchases.reduce((acc, p) => {
      if (!acc[p.category]) {
        acc[p.category] = { count: 0, taxable: 0, itc: 0, eligibleITC: 0 }
      }
      acc[p.category].count++
      acc[p.category].taxable += p.taxableValue
      acc[p.category].itc += p.totalITC
      acc[p.category].eligibleITC += p.eligibleITC
      return acc
    }, {} as Record<string, { count: number; taxable: number; itc: number; eligibleITC: number }>)
  ).map(([category, data]) => ({
    category,
    ...data
  })).sort((a, b) => b.taxable - a.taxable)

  return {
    period: { startDate, endDate },
    purchases: purchases.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate)),
    summary,
    categoryBreakdown, // New: Category-wise ITC breakdown
    generatedAt: new Date().toISOString(),
    complianceNote: 'Maintained as per Section 35 CGST Act, 2017 & Rule 56. Retention: 72 months'
  }
}

/**
 * Sales Register Report (GST Compliance - Output Tax)
 * Mandatory record under Section 35 CGST Act, 2017 & Rule 56
 * Must be maintained for 72 months (6 years) for audits
 *
 * Tracks all outward supplies for output tax verification
 * Auto-populates GSTR-1 and feeds into GSTR-3B tax liability
 *
 * === MARKETPLACE-AWARE TAXABLE VALUE CALCULATION (2025 GST Standard) ===
 * Step 1: Take final amount customer paid (inclusive of shipping)
 * Step 2: Subtract "Shipping charges charged to customer" (if separated)
 * Step 3: Subtract "TCS/TDS collected by marketplace" (1% - never received by seller)
 * Step 4: Subtract "Commission & marketplace fees" (Amazon/Flipkart fees)
 * Step 5: Result = Taxable Value (base for GST calculation)
 * Step 6: Apply GST rate to get Output Tax Liability
 *
 * This is exactly how Vyapar, Busy, Marg, Bookify, Tally calculate it.
 */
export async function getSalesRegister(startDate: string, endDate: string) {
  const allSales = await getInvoices('sale')

  // Filter sales within date range
  const filtered = allSales.filter(inv =>
    inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
  )

  // Process each sale with full GST details and marketplace deductions
  const sales = filtered.map(inv => {
    const customerName = inv.partyName || 'Walk-in Customer'
    const invoiceNumber = inv.invoiceNumber
    const invoiceDate = inv.invoiceDate
    const grandTotal = inv.grandTotal

    // === MARKETPLACE DEDUCTIONS (for correct taxable value) ===
    const shippingCharged = (inv as any).shippingChargedToCustomer || inv.shippingCharges || 0
    const tcsCollected = (inv as any).tcsCollected || 0 // TCS 1% collected by marketplace
    const tdsDeducted = (inv as any).tdsDeducted || 0
    const marketplaceFees = (inv as any).marketplaceFees || 0 // Commission + fees

    // Platform/Channel identification
    const platform = (inv as any).platform || 'offline'
    const platformName = platform === 'other' ? ((inv as any).platformName || 'Other') : platform
    const platformDisplayNames: Record<string, string> = {
      'amazon': 'Amazon',
      'flipkart': 'Flipkart',
      'meesho': 'Meesho',
      'shopify': 'Shopify',
      'website': 'Website',
      'offline': 'Offline/Direct',
      'other': platformName
    }
    const platformDisplayName = platformDisplayNames[platform] || 'Offline/Direct'

    const orderId = (inv as any).orderId || invoiceNumber

    // === TAXABLE VALUE CALCULATION (GST Compliance - 2025 Standard) ===
    // Method: Final Customer Payment - Shipping - TCS - TDS - Marketplace Fees = Taxable Value
    // Then: Taxable Value × GST Rate = Output Tax
    const totalDeductions = shippingCharged + tcsCollected + tdsDeducted + marketplaceFees

    // Calculate taxable value using the marketplace-aware formula
    // If no deductions (offline/direct sale), use traditional calculation
    let taxableValue: number
    if (totalDeductions > 0) {
      // Marketplace sale: Taxable = GrandTotal - Deductions
      // The remaining amount is what GST applies to
      taxableValue = grandTotal - totalDeductions
    } else {
      // Offline/Direct sale: Use traditional exclusive base calculation
      taxableValue = calculateTaxableValue(inv)
    }

    // Ensure taxable value is not negative
    taxableValue = Math.max(0, taxableValue)

    // Get weighted average GST rate from items
    const itemsWithTax = inv.items.filter((item: any) => (item.taxRate || item.gstRate || 0) > 0)
    const avgGstRate = itemsWithTax.length > 0
      ? itemsWithTax.reduce((sum: number, item: any) => sum + (item.taxRate || item.gstRate || 0), 0) / itemsWithTax.length
      : (inv.items[0] as any)?.taxRate || (inv.items[0] as any)?.gstRate || 18 // Default 18% if no rate

    // === GST CALCULATION (CGST/SGST vs IGST) ===
    // Determine if inter-state or intra-state
    const isInterState = (inv as any).isInterState || false
    const placeOfSupply = (inv as any).placeOfSupply || inv.partyAddress?.state || 'Same State'

    let cgst = 0, sgst = 0, igst = 0

    if (totalDeductions > 0) {
      // For marketplace sales, recalculate GST on the adjusted taxable value
      const totalGst = (taxableValue * avgGstRate) / 100
      if (isInterState) {
        igst = totalGst
      } else {
        cgst = totalGst / 2
        sgst = totalGst / 2
      }
    } else {
      // For offline sales, use the invoice's stored GST amounts
      cgst = inv.items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0)
      sgst = inv.items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0)
      igst = inv.items.reduce((sum, item) => sum + (item.igstAmount || 0), 0)
    }

    const totalOutputTax = cgst + sgst + igst

    // Payment status - Use actual status from invoice if available, fallback to amount check
    const paidAmount = inv.payment?.paidAmount || 0
    const dueAmount = inv.payment?.dueAmount || 0
    // Priority: 1) Use actual payment.status from invoice, 2) Calculate from amounts
    let paymentStatus: string
    if (inv.payment?.status) {
      // Use the actual status stored in the invoice (from Sales page)
      paymentStatus = inv.payment.status === 'paid' ? 'Paid' :
                      inv.payment.status === 'partial' ? 'Partial' : 'Pending'
    } else {
      // Fallback: Calculate based on amounts
      paymentStatus = paidAmount >= inv.grandTotal ? 'Paid' :
                      paidAmount > 0 ? 'Partial' : 'Pending'
    }
    const paymentDate = inv.payment?.status === 'paid' ? invoiceDate : null

    // HSN details (from first item - can be expanded for multiple HSNs)
    const firstItem = inv.items[0] || {}
    const hsnCode = (firstItem as any).hsnCode || 'N/A'
    const description = (firstItem as any).description || (firstItem as any).itemName || 'N/A'
    const gstRate = (firstItem as any).taxRate || (firstItem as any).gstRate || avgGstRate

    // Categorize sale type for GSTR-1
    let saleType = 'B2C Small' // Default for unregistered < ₹2.5L
    if (inv.partyGSTIN) {
      saleType = 'B2B' // Registered customer
    } else if (grandTotal > 250000) {
      saleType = 'B2C Large' // Unregistered > ₹2.5L
    }

    // Reverse Charge Mechanism
    const isRCM = (inv as any).isReverseCharge || false
    const rcmAmount = isRCM ? ((inv as any).rcmAmount || 0) : 0

    // Settlement details
    const settlementAmount = (inv as any).settlementAmount || (grandTotal - tcsCollected - marketplaceFees)

    return {
      invoiceDate,
      customerName,
      customerGSTIN: inv.partyGSTIN || 'Unregistered',
      invoiceNumber,
      orderId,
      invoiceValue: grandTotal, // What customer paid

      // Marketplace deductions
      platform: platformDisplayName,
      shippingCharged,
      tcsCollected,
      tdsDeducted,
      marketplaceFees,
      totalDeductions,

      // Taxable value after deductions
      taxableValue,

      // HSN & Description
      hsnCode,
      description,
      gstRate,

      // GST Breakdown
      cgst,
      sgst,
      igst,
      totalOutputTax,

      // Place of Supply
      placeOfSupply,
      isInterState,

      // RCM
      isRCM,
      rcmAmount,

      // Payment
      paymentStatus,
      paymentDate,
      paidAmount,
      dueAmount,

      // Settlement
      settlementAmount,

      // Classification
      saleType,
      eInvoiceIRN: inv.eInvoiceIRN || null,
      items: inv.items
    }
  })

  // Calculate summary with marketplace breakdowns
  const summary = {
    totalSales: sales.length,
    totalInvoiceValue: sales.reduce((sum, s) => sum + s.invoiceValue, 0), // Customer payments
    totalDeductions: sales.reduce((sum, s) => sum + s.totalDeductions, 0),
    totalShippingCharged: sales.reduce((sum, s) => sum + s.shippingCharged, 0),
    totalTcsCollected: sales.reduce((sum, s) => sum + s.tcsCollected, 0),
    totalTdsDeducted: sales.reduce((sum, s) => sum + s.tdsDeducted, 0),
    totalMarketplaceFees: sales.reduce((sum, s) => sum + s.marketplaceFees, 0),
    totalTaxableValue: sales.reduce((sum, s) => sum + s.taxableValue, 0),
    totalCGST: sales.reduce((sum, s) => sum + s.cgst, 0),
    totalSGST: sales.reduce((sum, s) => sum + s.sgst, 0),
    totalIGST: sales.reduce((sum, s) => sum + s.igst, 0),
    totalOutputTax: sales.reduce((sum, s) => sum + s.totalOutputTax, 0),
    totalCollected: sales.reduce((sum, s) => sum + s.paidAmount, 0),
    totalDue: sales.reduce((sum, s) => sum + s.dueAmount, 0),
    totalRCM: sales.reduce((sum, s) => sum + s.rcmAmount, 0),
    b2bSales: sales.filter(s => s.saleType === 'B2B').length,
    b2cSmall: sales.filter(s => s.saleType === 'B2C Small').length,
    b2cLarge: sales.filter(s => s.saleType === 'B2C Large').length,
    interStateSales: sales.filter(s => s.isInterState).length,
    intraStateSales: sales.filter(s => !s.isInterState).length
  }

  // Platform-wise breakdown
  const platformBreakdown = Object.entries(
    sales.reduce((acc, s) => {
      if (!acc[s.platform]) {
        acc[s.platform] = {
          count: 0,
          invoiceValue: 0,
          taxableValue: 0,
          outputTax: 0,
          fees: 0,
          tcs: 0
        }
      }
      acc[s.platform].count++
      acc[s.platform].invoiceValue += s.invoiceValue
      acc[s.platform].taxableValue += s.taxableValue
      acc[s.platform].outputTax += s.totalOutputTax
      acc[s.platform].fees += s.marketplaceFees
      acc[s.platform].tcs += s.tcsCollected
      return acc
    }, {} as Record<string, { count: number; invoiceValue: number; taxableValue: number; outputTax: number; fees: number; tcs: number }>)
  ).map(([platform, data]) => ({
    platform,
    ...data
  })).sort((a, b) => b.invoiceValue - a.invoiceValue)

  // GST Rate-wise breakdown (for GSTR-1 Table 4/5/6/7)
  const gstRateBreakdown = Object.entries(
    sales.reduce((acc, s) => {
      const rate = `${s.gstRate}%`
      if (!acc[rate]) {
        acc[rate] = { count: 0, taxableValue: 0, outputTax: 0 }
      }
      acc[rate].count++
      acc[rate].taxableValue += s.taxableValue
      acc[rate].outputTax += s.totalOutputTax
      return acc
    }, {} as Record<string, { count: number; taxableValue: number; outputTax: number }>)
  ).map(([rate, data]) => ({
    rate,
    ...data
  })).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate))

  return {
    period: { startDate, endDate },
    sales: sales.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate)),
    summary,
    platformBreakdown,
    gstRateBreakdown,
    generatedAt: new Date().toISOString(),
    complianceNote: 'Maintained as per Section 35 CGST Act, 2017 & Rule 56. Retention: 72 months. GST on Taxable Value after marketplace deductions (TCS/Fees/Shipping).',
    calculationNote: 'Taxable Value = Invoice Value - Shipping Charged - TCS - TDS - Marketplace Fees. Output Tax = Taxable Value × GST Rate.'
  }
}
