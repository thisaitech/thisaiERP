import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { getItems } from '../services/itemService'
import type { Item } from '../types'
import {
  ChartLine,
  Receipt,
  ShoppingCart,
  TrendUp,
  TrendDown,
  CurrencyCircleDollar,
  Package,
  Users,
  Calendar,
  FileText,
  Percent,
  Bank,
  Wallet,
  ChartBar,
  ChartPie,
  Download,
  Printer,
  FunnelSimple,
  ArrowRight,
  Eye,
  FilePdf,
  FileXls,
  FileJs,
  CaretDown
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const Reports = () => {
  // Language support
  const { t, language } = useLanguage()

  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('this-month')
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [items, setItems] = useState<Item[]>([])

  // Load items from Firebase on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        const itemsData = await getItems()
        setItems(itemsData)
      } catch (error) {
        console.error('Error loading items:', error)
      }
    }
    loadItems()
  }, [])

  // Calculate inventory summary from real data (same logic as Inventory page)
  const inventorySummary = (() => {
    const totalValue = items.reduce((sum, item) => sum + ((item.stock || 0) * (item.sellingPrice || 0)), 0)
    // Low stock: stock > 0 AND stock <= reorderPoint
    const lowStockItems = items.filter(item => (item.stock || 0) > 0 && (item.stock || 0) <= (item.reorderPoint || 0)).length
    const outOfStockItems = items.filter(item => (item.stock || 0) === 0).length
    return { totalValue, lowStockItems, outOfStockItems }
  })()

  const reportCategories = [
    {
      category: t.reports.salesReports,
      icon: Receipt,
      color: 'success',
      reports: [
        { id: 'sales-summary', name: t.reports.salesSummary, description: t.reports.overallSalesPerformance },
        { id: 'sales-by-customer', name: t.reports.salesByCustomer, description: t.reports.customerWiseSales },
        { id: 'sales-by-item', name: t.reports.salesByItem, description: t.reports.itemWiseSales },
        { id: 'invoice-report', name: t.reports.invoiceReport, description: t.reports.detailedInvoiceListing },
        { id: 'sales-tax', name: t.reports.salesTaxReport, description: t.reports.taxCollectedOnSales },
        { id: 'sales-return', name: t.reports.salesReturnReport, description: t.reports.returnsAndCredits }
      ]
    },
    {
      category: t.reports.purchaseReports,
      icon: ShoppingCart,
      color: 'warning',
      reports: [
        { id: 'purchase-summary', name: t.reports.purchaseSummary, description: t.reports.overallPurchaseAnalysis },
        { id: 'purchase-by-supplier', name: t.reports.purchaseBySupplier, description: t.reports.supplierWisePurchases },
        { id: 'purchase-by-item', name: t.reports.purchaseByItem, description: t.reports.itemWisePurchaseDetails },
        { id: 'purchase-order', name: t.reports.purchaseOrderReport, description: t.reports.poTrackingAndStatus },
        { id: 'purchase-tax', name: t.reports.purchaseTaxReport, description: t.reports.taxPaidOnPurchases }
      ]
    },
    {
      category: t.reports.inventoryReports,
      icon: Package,
      color: 'primary',
      reports: [
        { id: 'stock-summary', name: t.reports.stockSummary, description: t.reports.currentStockLevels },
        { id: 'stock-detail', name: t.reports.stockDetailReport, description: t.reports.itemWiseStockDetails },
        { id: 'low-stock', name: t.reports.lowStockAlert, description: t.reports.itemsBelowMinimumLevel },
        { id: 'stock-movement', name: t.reports.stockMovement, description: t.reports.stockInOutAnalysis },
        { id: 'dead-stock', name: t.reports.deadStockReport, description: t.reports.nonMovingInventory },
        { id: 'stock-valuation', name: t.reports.stockValuation, description: t.reports.inventoryValueReport }
      ]
    },
    {
      category: t.reports.financialReports,
      icon: CurrencyCircleDollar,
      color: 'accent',
      reports: [
        { id: 'profit-loss', name: t.reports.profitLoss, description: t.reports.profitLossStatement },
        { id: 'balance-sheet', name: t.reports.balanceSheet, description: t.reports.assetsAndLiabilities },
        { id: 'cash-flow', name: t.reports.cashFlowStatement, description: t.reports.cashMovementAnalysis },
        { id: 'trial-balance', name: t.reports.trialBalance, description: t.reports.accountingTrialBalance },
        { id: 'ledger', name: t.reports.generalLedger, description: t.reports.completeLedgerReport }
      ]
    },
    {
      category: t.reports.partyReports,
      icon: Users,
      color: 'destructive',
      reports: [
        { id: 'receivables', name: t.reports.accountsReceivable, description: t.reports.moneyToBeReceived },
        { id: 'payables', name: t.reports.accountsPayable, description: t.reports.moneyToBePaid },
        { id: 'party-ledger', name: t.reports.partyLedger, description: t.reports.individualPartyStatements },
        { id: 'aging', name: t.reports.agingReport, description: t.reports.outstandingAgingAnalysis },
        { id: 'party-wise-profit', name: t.reports.partyWiseProfit, description: t.reports.profitByCustomer }
      ]
    },
    {
      category: t.reports.gstReports,
      icon: Percent,
      color: 'warning',
      reports: [
        { id: 'gstr1', name: t.reports.gstr1, description: t.reports.outwardSuppliesReturn },
        { id: 'gstr2', name: 'GSTR-2', description: t.reports.inwardSuppliesReturn },
        { id: 'gstr3b', name: t.reports.gstr3b, description: t.reports.summaryReturn },
        { id: 'gst-summary', name: t.reports.gstSummary, description: t.reports.taxSummaryReport },
        { id: 'hsn-summary', name: t.reports.hsnSummary, description: t.reports.hsnWiseSummary }
      ]
    }
  ]

  // Sample data for demonstration
  const salesSummaryData = {
    totalSales: 458750,
    totalInvoices: 156,
    avgInvoiceValue: 2941,
    taxCollected: 82575,
    netSales: 376175,
    returns: 12500,
    growth: 12.5
  }

  const profitLossData = {
    revenue: {
      sales: 458750,
      otherIncome: 5000,
      total: 463750
    },
    expenses: {
      purchases: 312450,
      operatingExpenses: 45000,
      salary: 60000,
      rent: 25000,
      utilities: 8500,
      total: 450950
    },
    netProfit: 12800,
    profitMargin: 2.76
  }

  const topCustomers = [
    { name: 'Rajesh Kumar', sales: 125000, invoices: 45 },
    { name: 'Priya Sharma', sales: 89000, invoices: 32 },
    { name: 'Amit Patel', sales: 67000, invoices: 28 },
    { name: 'Sneha Reddy', sales: 54000, invoices: 21 },
    { name: 'Vikram Singh', sales: 45000, invoices: 18 }
  ]

  // Generate stock data from real items (sorted by value, limited to top items)
  const stockData = items
    .map(item => {
      const stock = item.stock || 0
      const reorderPoint = item.reorderPoint || 0
      const value = stock * (item.sellingPrice || 0)
      let status: 'healthy' | 'low' | 'critical' = 'healthy'

      if (stock === 0) {
        status = 'critical'
      } else if (stock <= reorderPoint) {
        status = 'low'
      }

      return {
        item: item.name,
        stock,
        minStock: reorderPoint,
        value,
        status
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) // Show top 10 items by value

  const receivablesData = [
    { party: 'Rajesh Kumar', amount: 25000, overdue: 0, dueDate: '2024-02-01' },
    { party: 'ABC Corp', amount: 45000, overdue: 15000, dueDate: '2024-01-10' },
    { party: 'XYZ Ltd', amount: 19000, overdue: 0, dueDate: '2024-02-05' }
  ]

  const gstData = {
    gstr1: { sales: 458750, igst: 0, cgst: 41287.50, sgst: 41287.50, total: 82575 },
    gstr2: { purchases: 312450, igst: 0, cgst: 28120.50, sgst: 28120.50, total: 56241 },
    gstr3b: { outputTax: 82575, inputTax: 56241, netTax: 26334 }
  }

  // Get current report data for export
  const getExportData = () => {
    const reportData: any = {
      reportName: selectedReport || 'All Reports',
      dateRange: dateRange,
      generatedAt: new Date().toISOString(),
      salesSummary: salesSummaryData,
      profitLoss: profitLossData,
      topCustomers: topCustomers,
      stockData: stockData,
      receivables: receivablesData,
      gstData: gstData
    }
    return reportData
  }

  // Download as JSON
  const downloadJSON = () => {
    const data = getExportData()
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    saveAs(blob, `report_${dateRange}_${new Date().toISOString().split('T')[0]}.json`)
    toast.success('JSON file downloaded successfully!')
    setShowDownloadMenu(false)
  }

  // Download as Excel
  const downloadExcel = () => {
    const data = getExportData()

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new()

    // Sales Summary Sheet
    const salesSheet = XLSX.utils.json_to_sheet([{
      'Total Sales': data.salesSummary.totalSales,
      'Total Invoices': data.salesSummary.totalInvoices,
      'Avg Invoice Value': data.salesSummary.avgInvoiceValue,
      'Tax Collected': data.salesSummary.taxCollected,
      'Net Sales': data.salesSummary.netSales,
      'Returns': data.salesSummary.returns,
      'Growth %': data.salesSummary.growth
    }])
    XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales Summary')

    // Top Customers Sheet
    const customersSheet = XLSX.utils.json_to_sheet(data.topCustomers.map((c: any) => ({
      'Customer Name': c.name,
      'Total Sales': c.sales,
      'Total Invoices': c.invoices
    })))
    XLSX.utils.book_append_sheet(wb, customersSheet, 'Top Customers')

    // Stock Data Sheet
    const stockSheet = XLSX.utils.json_to_sheet(data.stockData.map((s: any) => ({
      'Item': s.item,
      'Current Stock': s.stock,
      'Min Stock': s.minStock,
      'Value': s.value,
      'Status': s.status
    })))
    XLSX.utils.book_append_sheet(wb, stockSheet, 'Stock Data')

    // Receivables Sheet
    const receivablesSheet = XLSX.utils.json_to_sheet(data.receivables.map((r: any) => ({
      'Party': r.party,
      'Amount': r.amount,
      'Overdue': r.overdue,
      'Due Date': r.dueDate
    })))
    XLSX.utils.book_append_sheet(wb, receivablesSheet, 'Receivables')

    // GST Summary Sheet
    const gstSheet = XLSX.utils.json_to_sheet([{
      'Output CGST': data.gstData.gstr1.cgst,
      'Output SGST': data.gstData.gstr1.sgst,
      'Total Output Tax': data.gstData.gstr1.total,
      'Input CGST': data.gstData.gstr2.cgst,
      'Input SGST': data.gstData.gstr2.sgst,
      'Total Input Tax': data.gstData.gstr2.total,
      'Net Tax Payable': data.gstData.gstr3b.netTax
    }])
    XLSX.utils.book_append_sheet(wb, gstSheet, 'GST Summary')

    // Generate and download
    XLSX.writeFile(wb, `report_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Excel file downloaded successfully!')
    setShowDownloadMenu(false)
  }

  // Download as PDF
  const downloadPDF = () => {
    const data = getExportData()
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.setTextColor(40)
    doc.text('Business Report', 14, 22)

    // Subtitle
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${dateRange}`, 14, 30)

    let yPos = 45

    // Sales Summary Section
    doc.setFontSize(14)
    doc.setTextColor(40)
    doc.text('Sales Summary', 14, yPos)
    yPos += 10

    ;(doc as any).autoTable({
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sales', `₹${data.salesSummary.totalSales.toLocaleString()}`],
        ['Total Invoices', data.salesSummary.totalInvoices.toString()],
        ['Avg Invoice Value', `₹${data.salesSummary.avgInvoiceValue.toLocaleString()}`],
        ['Tax Collected', `₹${data.salesSummary.taxCollected.toLocaleString()}`],
        ['Net Sales', `₹${data.salesSummary.netSales.toLocaleString()}`],
        ['Returns', `₹${data.salesSummary.returns.toLocaleString()}`],
        ['Growth', `${data.salesSummary.growth}%`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Top Customers Section
    doc.setFontSize(14)
    doc.text('Top Customers', 14, yPos)
    yPos += 10

    ;(doc as any).autoTable({
      startY: yPos,
      head: [['Customer', 'Sales', 'Invoices']],
      body: data.topCustomers.map((c: any) => [
        c.name,
        `₹${c.sales.toLocaleString()}`,
        c.invoices.toString()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // GST Summary Section
    doc.setFontSize(14)
    doc.text('GST Summary', 14, yPos)
    yPos += 10

    ;(doc as any).autoTable({
      startY: yPos,
      head: [['Tax Type', 'Amount']],
      body: [
        ['Output Tax (CGST)', `₹${data.gstData.gstr1.cgst.toLocaleString()}`],
        ['Output Tax (SGST)', `₹${data.gstData.gstr1.sgst.toLocaleString()}`],
        ['Input Tax (CGST)', `₹${data.gstData.gstr2.cgst.toLocaleString()}`],
        ['Input Tax (SGST)', `₹${data.gstData.gstr2.sgst.toLocaleString()}`],
        ['Net Tax Payable', `₹${data.gstData.gstr3b.netTax.toLocaleString()}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [234, 179, 8] }
    })

    // Save PDF
    doc.save(`report_${dateRange}_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('PDF file downloaded successfully!')
    setShowDownloadMenu(false)
  }

  return (
    <div className="overflow-x-hidden flex flex-col max-w-[100vw] w-full px-3 py-2 bg-slate-50/50 min-h-screen">
      {/* Header - Clean & Simple like Sales/Purchase */}
      <div className="flex-shrink-0">
        {/* Top Row: Title + Actions */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <ChartLine size={22} weight="duotone" className="text-blue-600" />
            <span>{t.reports.businessReports}</span>
          </h1>
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  setShowDownloadMenu(!showDownloadMenu)
                }}
                className="h-8 px-3 rounded-lg border border-emerald-200 bg-white text-xs text-emerald-600 font-semibold flex items-center gap-1.5 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
              >
                <Download size={14} weight="bold" />
                <span>Export</span>
                <CaretDown size={12} />
              </button>
              {showDownloadMenu && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowDownloadMenu(false)} />
                  <div className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[101] min-w-[160px]"
                    style={{
                      top: '60px',
                      right: '12px'
                    }}
                  >
                    <button
                      onClick={downloadJSON}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <FileJs size={14} className="text-yellow-500" />
                      Export JSON
                    </button>
                    <button
                      onClick={downloadExcel}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <FileXls size={14} className="text-green-500" />
                      Export Excel
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <FilePdf size={14} className="text-red-500" />
                      Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Period Filter & Stats - Compact Modern (matching Sales design) */}
        <div className="space-y-2">
          {/* Period Filter Tabs */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-0.5 text-xs bg-white rounded-lg p-0.5 shadow-sm border border-slate-200">
              {[
                { key: 'today', label: t.common.today },
                { key: 'this-week', label: t.common.thisWeek },
                { key: 'this-month', label: t.common.thisMonth },
                { key: 'this-year', label: t.common.thisYear },
                { key: 'all', label: t.common.all },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setDateRange(filter.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap",
                    dateRange === filter.key
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Receipt size={16} weight="duotone" className="text-green-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{t.reports.totalSales}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">₹{(salesSummaryData.totalSales / 1000).toFixed(0)}k</p>
              <div className="flex items-center gap-1 mt-0.5">
                <TrendUp size={12} className="text-green-600" />
                <span className="text-[10px] text-green-600 font-medium">+{salesSummaryData.growth}%</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CurrencyCircleDollar size={16} weight="duotone" className="text-blue-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{t.reports.netProfit}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">₹{(profitLossData.netProfit / 1000).toFixed(1)}k</p>
              <span className="text-[10px] text-slate-500">{profitLossData.profitMargin}% margin</span>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Wallet size={16} weight="duotone" className="text-orange-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{t.reports.receivables}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">₹{(receivablesData.reduce((sum, r) => sum + r.amount, 0) / 1000).toFixed(0)}k</p>
              <span className="text-[10px] text-orange-600">₹15k overdue</span>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Package size={16} weight="duotone" className="text-purple-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{t.reports.stockValue}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">₹{(inventorySummary.totalValue / 1000).toFixed(0)}k</p>
              <span className="text-[10px] text-orange-600">{inventorySummary.lowStockItems} low</span>
            </div>
          </div>
        </div>
      </div>

        {/* Report Categories - Clean layout */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Categories List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
              <h3 className="font-semibold mb-3 text-sm text-slate-700">{t.reports.reportCategories}</h3>
              <div className="space-y-1">
                {reportCategories.map((category, index) => (
                  <button
                    key={category.category}
                    onClick={() => setSelectedReport(category.category)}
                    className={cn(
                      "w-full flex items-center gap-2 p-2.5 rounded-lg transition-all text-left text-sm",
                      selectedReport === category.category
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : "hover:bg-slate-50 border border-transparent text-slate-700"
                    )}
                  >
                    <category.icon
                      size={18}
                      weight="duotone"
                      className={cn(
                        category.color === 'success' && "text-green-600",
                        category.color === 'warning' && "text-orange-600",
                        category.color === 'primary' && "text-blue-600",
                        category.color === 'accent' && "text-purple-600",
                        category.color === 'destructive' && "text-red-600"
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{category.category}</p>
                      <p className="text-[10px] text-slate-500">{category.reports.length} reports</p>
                    </div>
                    {selectedReport === category.category && (
                      <ArrowRight size={14} className="text-blue-600" weight="bold" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Report Details */}
          <div className="lg:col-span-2">
            {!selectedReport ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
                <ChartBar size={48} weight="duotone" className="text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-1 text-slate-700">Select a report category</h3>
                <p className="text-sm text-slate-500">Choose a category to view available reports</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reportCategories
                  .find(cat => cat.category === selectedReport)
                  ?.reports.map((report, index) => (
                    <div
                      key={report.id}
                      className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 hover:border-blue-300 hover:shadow transition-all cursor-pointer"
                      onClick={() => toast.info(`Opening ${report.name}...`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-slate-800 mb-0.5">{report.name}</h4>
                          <p className="text-xs text-slate-500">{report.description}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button className="p-1.5 hover:bg-slate-100 rounded transition-colors">
                            <Eye size={16} weight="duotone" className="text-slate-600" />
                          </button>
                          <button className="p-1.5 hover:bg-slate-100 rounded transition-colors">
                            <Download size={16} weight="duotone" className="text-slate-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Sample Report Data Display */}
            {selectedReport === t.reports.salesReports && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mt-3">
                <h3 className="font-semibold text-sm mb-3 text-slate-700">{t.reports.salesSummary} - {t.reports.thisMonth}</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-[10px] text-slate-500 mb-0.5">{t.reports.totalSales}</p>
                    <p className="text-lg font-bold text-slate-800">₹{salesSummaryData.totalSales.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-[10px] text-slate-500 mb-0.5">{t.reports.totalInvoices}</p>
                    <p className="text-lg font-bold text-slate-800">{salesSummaryData.totalInvoices}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-[10px] text-slate-500 mb-0.5">{t.reports.avgInvoiceValue}</p>
                    <p className="text-lg font-bold text-slate-800">₹{salesSummaryData.avgInvoiceValue.toLocaleString()}</p>
                  </div>
                </div>

                <h4 className="font-medium text-xs mb-2 text-slate-600">{t.reports.top5Customers}</h4>
                <div className="space-y-1.5">
                  {topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-medium text-sm text-slate-800">{customer.name}</p>
                        <p className="text-[10px] text-slate-500">{customer.invoices} invoices</p>
                      </div>
                      <p className="font-bold text-sm text-slate-800">₹{customer.sales.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport === t.reports.financialReports && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mt-3">
                <h3 className="font-semibold text-sm mb-3 text-slate-700">{t.reports.profitLossStatement}</h3>

                <div className="space-y-3">
                  {/* Revenue */}
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <h4 className="font-medium text-xs mb-2 text-green-700">{t.reports.revenue}</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">{t.reports.salesRevenue}</span>
                        <span className="font-medium text-slate-800">₹{profitLossData.revenue.sales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">{t.reports.otherIncome}</span>
                        <span className="font-medium text-slate-800">₹{profitLossData.revenue.otherIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1.5 border-t border-green-200 text-xs">
                        <span className="text-slate-700">{t.reports.totalRevenue}</span>
                        <span className="text-slate-800">₹{profitLossData.revenue.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <h4 className="font-medium text-xs mb-2 text-red-700">{t.reports.expenses}</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">{t.reports.costOfGoodsSold}</span>
                        <span className="font-medium text-slate-800">₹{profitLossData.expenses.purchases.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">{t.reports.operatingExpenses}</span>
                        <span className="font-medium text-slate-800">₹{profitLossData.expenses.operatingExpenses.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">{t.reports.salaries}</span>
                        <span className="font-medium text-slate-800">₹{profitLossData.expenses.salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">{t.expenses.rent}</span>
                        <span className="font-medium text-slate-800">₹{profitLossData.expenses.rent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">{t.expenses.utilities}</span>
                        <span className="font-medium text-slate-800">₹{profitLossData.expenses.utilities.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1.5 border-t border-red-200 text-xs">
                        <span className="text-slate-700">{t.reports.totalExpenses}</span>
                        <span className="text-slate-800">₹{profitLossData.expenses.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-sm text-blue-700">{t.reports.netProfit}</h4>
                        <p className="text-[10px] text-slate-500">{t.reports.profitMargin}: {profitLossData.profitMargin}%</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">₹{profitLossData.netProfit.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === t.reports.inventoryReports && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mt-3">
                <h3 className="font-semibold text-sm mb-3 text-slate-700">{t.reports.stockSummary}</h3>
                <div className="space-y-2">
                  {stockData.map((item, index) => (
                    <div key={index} className={cn(
                      "p-3 rounded-lg border",
                      item.status === 'healthy' && "bg-green-50 border-green-200",
                      item.status === 'low' && "bg-orange-50 border-orange-200",
                      item.status === 'critical' && "bg-red-50 border-red-200"
                    )}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="font-medium text-sm text-slate-800">{item.item}</p>
                          <p className="text-[10px] text-slate-500">Min: {item.minStock}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium",
                          item.status === 'healthy' && "bg-green-100 text-green-700",
                          item.status === 'low' && "bg-orange-100 text-orange-700",
                          item.status === 'critical' && "bg-red-100 text-red-700"
                        )}>
                          {item.status === 'critical' ? 'Critical' : item.status === 'low' ? 'Low' : 'Healthy'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-600">Stock: <strong className="text-slate-800">{item.stock}</strong></span>
                        <span className="font-semibold text-slate-800">₹{item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            item.status === 'healthy' && "bg-green-500",
                            item.status === 'low' && "bg-orange-500",
                            item.status === 'critical' && "bg-red-500"
                          )}
                          style={{ width: `${Math.min((item.stock / item.minStock) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport === t.reports.partyReports && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mt-3">
                <h3 className="font-semibold text-sm mb-3 text-slate-700">{t.reports.accountsReceivable}</h3>
                <div className="space-y-2">
                  {receivablesData.map((party, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="font-medium text-sm text-slate-800">{party.party}</p>
                          <p className="text-[10px] text-slate-500">Due: {new Date(party.dueDate).toLocaleDateString()}</p>
                        </div>
                        {party.overdue > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="text-slate-500">Outstanding</p>
                          <p className="text-base font-bold text-slate-800">₹{party.amount.toLocaleString()}</p>
                        </div>
                        {party.overdue > 0 && (
                          <div className="text-right">
                            <p className="text-slate-500">Overdue</p>
                            <p className="text-base font-bold text-red-600">₹{party.overdue.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm text-slate-700">Total Receivables</span>
                      <span className="text-xl font-bold text-blue-700">₹{receivablesData.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-blue-200">
                      <span className="text-xs text-slate-500">Total Overdue</span>
                      <span className="text-base font-bold text-red-600">₹{receivablesData.reduce((sum, r) => sum + r.overdue, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === t.reports.gstReports && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mt-3">
                <h3 className="font-semibold text-sm mb-3 text-slate-700">{t.reports.gstSummary} (GSTR-3B)</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <h4 className="font-medium text-xs mb-2 text-green-700">{t.reports.outputTax}</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500 mb-0.5">CGST</p>
                        <p className="font-bold text-slate-800">₹{gstData.gstr1.cgst.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-0.5">SGST</p>
                        <p className="font-bold text-slate-800">₹{gstData.gstr1.sgst.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-0.5">Total</p>
                        <p className="font-bold text-slate-800">₹{gstData.gstr1.total.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <h4 className="font-medium text-xs mb-2 text-orange-700">{t.reports.inputTax}</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500 mb-0.5">CGST</p>
                        <p className="font-bold text-slate-800">₹{gstData.gstr2.cgst.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-0.5">SGST</p>
                        <p className="font-bold text-slate-800">₹{gstData.gstr2.sgst.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-0.5">Total</p>
                        <p className="font-bold text-slate-800">₹{gstData.gstr2.total.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-sm text-blue-700">{t.reports.netGstPayable}</h4>
                        <p className="text-[10px] text-slate-500">Output tax - Input tax</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">₹{gstData.gstr3b.netTax.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
