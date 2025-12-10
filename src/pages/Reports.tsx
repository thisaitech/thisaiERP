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
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-destructive via-destructive/90 to-warning px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">{t.reports.businessReports}</h1>
              <p className="text-white/80 text-sm lg:text-base">{t.reports.comprehensiveAnalytics}</p>
            </div>
            <div className="flex gap-2 lg:gap-3">
              {/* Download Dropdown */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center gap-1 px-3 py-2.5 lg:px-4 lg:py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Download size={20} className="text-white lg:w-6 lg:h-6" weight="bold" />
                  <CaretDown size={16} className="text-white" weight="bold" />
                </motion.button>

                <AnimatePresence>
                  {showDownloadMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 bottom-full mb-2 w-48 bg-card rounded-lg shadow-xl border border-border overflow-hidden z-50"
                    >
                      <button
                        onClick={downloadJSON}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                      >
                        <FileJs size={20} weight="duotone" className="text-yellow-500" />
                        <span className="font-medium text-sm">{t.reports.downloadJSON}</span>
                      </button>
                      <button
                        onClick={downloadExcel}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-t border-border"
                      >
                        <FileXls size={20} weight="duotone" className="text-green-500" />
                        <span className="font-medium text-sm">{t.reports.downloadExcel}</span>
                      </button>
                      <button
                        onClick={downloadPDF}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-t border-border"
                      >
                        <FilePdf size={20} weight="duotone" className="text-red-500" />
                        <span className="font-medium text-sm">{t.reports.downloadPDF}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toast.info('Print preview...')}
                className="p-2.5 lg:p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Printer size={20} className="text-white lg:w-6 lg:h-6" weight="bold" />
              </motion.button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 lg:p-6 border border-white/20"
            >
              <p className="text-white/80 text-xs lg:text-sm mb-1">{t.reports.totalSales}</p>
              <p className="text-2xl lg:text-3xl font-bold text-white">₹{(salesSummaryData.totalSales / 1000).toFixed(0)}k</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendUp size={16} className="text-success lg:w-5 lg:h-5" />
                <span className="text-xs lg:text-sm text-white/80">+{salesSummaryData.growth}%</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <p className="text-white/80 text-xs mb-1">{t.reports.netProfit}</p>
              <p className="text-2xl font-bold text-white">₹{(profitLossData.netProfit / 1000).toFixed(1)}k</p>
              <p className="text-xs text-white/80 mt-1">{profitLossData.profitMargin}% {t.inventory.margin}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <p className="text-white/80 text-xs mb-1">{t.reports.receivables}</p>
              <p className="text-2xl font-bold text-white">₹{(receivablesData.reduce((sum, r) => sum + r.amount, 0) / 1000).toFixed(0)}k</p>
              <p className="text-xs text-warning mt-1">₹15k {t.reports.overdue}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <p className="text-white/80 text-xs mb-1">{t.reports.stockValue}</p>
              <p className="text-2xl font-bold text-white">₹{(inventorySummary.totalValue / 1000).toFixed(0)}k</p>
              <p className="text-xs text-warning mt-1">{inventorySummary.lowStockItems} {t.reports.lowStock}</p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Date Range Filter */}
        <div className="bg-card rounded-lg shadow-lg border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar size={20} weight="duotone" className="text-muted-foreground" />
              <span className="text-sm font-medium">{t.reports.dateRange}:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {[
                { key: 'today', label: t.common.today },
                { key: 'this-week', label: t.common.thisWeek },
                { key: 'this-month', label: t.common.thisMonth },
                { key: 'this-quarter', label: t.common.thisQuarter },
                { key: 'this-year', label: t.common.thisYear },
                { key: 'custom', label: t.common.custom }
              ].map((range) => (
                <button
                  key={range.key}
                  onClick={() => setDateRange(range.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    dateRange === range.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-lg border border-border p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <FunnelSimple size={20} weight="duotone" />
                {t.reports.reportCategories}
              </h3>
              <div className="space-y-2">
                {reportCategories.map((category, index) => (
                  <motion.button
                    key={category.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedReport(category.category)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
                      selectedReport === category.category
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        category.color === 'success' && "bg-success/10",
                        category.color === 'warning' && "bg-warning/10",
                        category.color === 'primary' && "bg-primary/10",
                        category.color === 'accent' && "bg-accent/10",
                        category.color === 'destructive' && "bg-destructive/10"
                      )}>
                        <category.icon
                          size={20}
                          weight="duotone"
                          className={cn(
                            category.color === 'success' && "text-success",
                            category.color === 'warning' && "text-warning",
                            category.color === 'primary' && "text-primary",
                            category.color === 'accent' && "text-accent",
                            category.color === 'destructive' && "text-destructive"
                          )}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{category.category}</p>
                        <p className="text-xs text-muted-foreground">{category.reports.length} {t.reports.reports}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Report Details */}
          <div className="lg:col-span-2">
            {!selectedReport ? (
              <div className="bg-card rounded-lg shadow-lg border border-border p-8 text-center">
                <ChartBar size={64} weight="duotone" className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{t.reports.selectReportCategory}</h3>
                <p className="text-muted-foreground">{t.reports.chooseCategory}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reportCategories
                  .find(cat => cat.category === selectedReport)
                  ?.reports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-lg shadow-lg border border-border p-4 hover:border-primary transition-all cursor-pointer"
                      onClick={() => toast.info(`Opening ${report.name}...`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold mb-1">{report.name}</h4>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <Eye size={18} weight="duotone" />
                          </button>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <Download size={18} weight="duotone" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}

            {/* Sample Report Data Display */}
            {selectedReport === t.reports.salesReports && (
              <div className="bg-card rounded-lg shadow-lg border border-border p-6 mt-6">
                <h3 className="font-bold mb-4">{t.reports.salesSummary} - {t.reports.thisMonth}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                    <p className="text-xs text-muted-foreground mb-1">{t.reports.totalSales}</p>
                    <p className="text-2xl font-bold">₹{salesSummaryData.totalSales.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">{t.reports.totalInvoices}</p>
                    <p className="text-2xl font-bold">{salesSummaryData.totalInvoices}</p>
                  </div>
                  <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">{t.reports.avgInvoiceValue}</p>
                    <p className="text-2xl font-bold">₹{salesSummaryData.avgInvoiceValue.toLocaleString()}</p>
                  </div>
                </div>

                <h4 className="font-medium mb-3">{t.reports.top5Customers}</h4>
                <div className="space-y-2">
                  {topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.invoices} {t.sales.invoices}</p>
                      </div>
                      <p className="font-bold">₹{customer.sales.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport === t.reports.financialReports && (
              <div className="bg-card rounded-lg shadow-lg border border-border p-6 mt-6">
                <h3 className="font-bold mb-4">{t.reports.profitLossStatement}</h3>

                <div className="space-y-4">
                  {/* Revenue */}
                  <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                    <h4 className="font-medium mb-3 text-success">{t.reports.revenue}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t.reports.salesRevenue}</span>
                        <span className="font-medium">₹{profitLossData.revenue.sales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t.reports.otherIncome}</span>
                        <span className="font-medium">₹{profitLossData.revenue.otherIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t border-success/20">
                        <span>{t.reports.totalRevenue}</span>
                        <span>₹{profitLossData.revenue.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                    <h4 className="font-medium mb-3 text-destructive">{t.reports.expenses}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t.reports.costOfGoodsSold}</span>
                        <span className="font-medium">₹{profitLossData.expenses.purchases.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t.reports.operatingExpenses}</span>
                        <span className="font-medium">₹{profitLossData.expenses.operatingExpenses.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t.reports.salaries}</span>
                        <span className="font-medium">₹{profitLossData.expenses.salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t.expenses.rent}</span>
                        <span className="font-medium">₹{profitLossData.expenses.rent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t.expenses.utilities}</span>
                        <span className="font-medium">₹{profitLossData.expenses.utilities.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t border-destructive/20">
                        <span>{t.reports.totalExpenses}</span>
                        <span>₹{profitLossData.expenses.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-lg">{t.reports.netProfit}</h4>
                        <p className="text-sm text-muted-foreground">{t.reports.profitMargin}: {profitLossData.profitMargin}%</p>
                      </div>
                      <p className="text-3xl font-bold text-primary">₹{profitLossData.netProfit.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === t.reports.inventoryReports && (
              <div className="bg-card rounded-lg shadow-lg border border-border p-6 mt-6">
                <h3 className="font-bold mb-4">{t.reports.stockSummary}</h3>
                <div className="space-y-2">
                  {stockData.map((item, index) => (
                    <div key={index} className={cn(
                      "p-4 rounded-lg border-2",
                      item.status === 'healthy' && "bg-success/5 border-success/20",
                      item.status === 'low' && "bg-warning/5 border-warning/20",
                      item.status === 'critical' && "bg-destructive/5 border-destructive/20"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{item.item}</p>
                          <p className="text-xs text-muted-foreground">{t.reports.minStock}: {item.minStock}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.status === 'healthy' && "bg-success/10 text-success",
                          item.status === 'low' && "bg-warning/10 text-warning",
                          item.status === 'critical' && "bg-destructive/10 text-destructive"
                        )}>
                          {item.status === 'critical' ? t.reports.criticalLow : item.status === 'low' ? t.reports.lowStock : t.reports.healthy}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{t.reports.currentStock}: <strong>{item.stock}</strong></span>
                        <span className="font-bold">{t.reports.value}: ₹{item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            item.status === 'healthy' && "bg-success",
                            item.status === 'low' && "bg-warning",
                            item.status === 'critical' && "bg-destructive"
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
              <div className="bg-card rounded-lg shadow-lg border border-border p-6 mt-6">
                <h3 className="font-bold mb-4">{t.reports.accountsReceivable}</h3>
                <div className="space-y-3">
                  {receivablesData.map((party, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{party.party}</p>
                          <p className="text-xs text-muted-foreground">{t.sales.due}: {new Date(party.dueDate).toLocaleDateString()}</p>
                        </div>
                        {party.overdue > 0 && (
                          <span className="px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                            {t.reports.overdue}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t.reports.totalOutstanding}</p>
                          <p className="text-lg font-bold">₹{party.amount.toLocaleString()}</p>
                        </div>
                        {party.overdue > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{t.reports.overdueAmount}</p>
                            <p className="text-lg font-bold text-destructive">₹{party.overdue.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t.reports.totalReceivables}</span>
                      <span className="text-2xl font-bold">₹{receivablesData.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary/20">
                      <span className="text-sm text-muted-foreground">{t.reports.totalOverdue}</span>
                      <span className="text-lg font-bold text-destructive">₹{receivablesData.reduce((sum, r) => sum + r.overdue, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === t.reports.gstReports && (
              <div className="bg-card rounded-lg shadow-lg border border-border p-6 mt-6">
                <h3 className="font-bold mb-4">{t.reports.gstSummary} (GSTR-3B)</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                    <h4 className="font-medium mb-3 text-success">{t.reports.outputTax}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">CGST</p>
                        <p className="font-bold">₹{gstData.gstr1.cgst.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">SGST</p>
                        <p className="font-bold">₹{gstData.gstr1.sgst.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">{t.common.total}</p>
                        <p className="font-bold">₹{gstData.gstr1.total.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
                    <h4 className="font-medium mb-3 text-warning">{t.reports.inputTax}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">CGST</p>
                        <p className="font-bold">₹{gstData.gstr2.cgst.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">SGST</p>
                        <p className="font-bold">₹{gstData.gstr2.sgst.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">{t.common.total}</p>
                        <p className="font-bold">₹{gstData.gstr2.total.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold">{t.reports.netGstPayable}</h4>
                        <p className="text-xs text-muted-foreground">{t.reports.outputTaxMinusInputTax}</p>
                      </div>
                      <p className="text-3xl font-bold text-primary">₹{gstData.gstr3b.netTax.toLocaleString()}</p>
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
