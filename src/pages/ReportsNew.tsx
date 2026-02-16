import React, { useState, useEffect } from 'react'
import {
  ChartLine,
  Receipt,
  ShoppingCart,
  Package,
  Download,
  Printer,
  TrendUp,
  TrendDown,
  CurrencyCircleDollar,
  Users,
  Calendar,
  FileText,
  Tag,
  Percent,
  FileJs,
  ChartBar,
  Eye,
  FolderOpen
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import {
  getSalesSummaryReport,
  getPurchaseSummaryReport,
  getStockSummaryReport,
  getDayBook,
  getBillWiseProfit,
  getProfitAndLoss,
  getCashFlow,
  getBalanceSheet,
  getTrialBalance,
  getPartyWiseProfitLoss,
  getGSTR1,
  getGSTR3B,
  getSaleSummaryByHSN,
  getItemWiseProfitLoss,
  getDiscountReport,
  getCashAndBankBalance,
  getAccountsReceivable,
  getAccountsPayable,
  getPurchaseRegister,
  getSalesRegister,
  getStockSummary,
  getFastMovingItems,
  getSlowMovingItems
} from '../services/reportService'
import {
  exportSalesSummaryPDF,
  exportPurchaseSummaryPDF,
  exportDayBookPDF,
  exportDayBookExcel,
  exportProfitLossPDF,
  exportProfitLossExcel,
  exportPartyPLPDF,
  exportPartyPLExcel,
  exportGSTR1PDF,
  exportGSTR1Excel,
  exportGSTR3BPDF,
  exportItemPLExcel,
  exportItemPLPDF,
  exportBillProfitPDF,
  exportBillProfitExcel,
  exportHSNExcel,
  exportGSTR3BExcel,
  exportToExcel,
  exportCashBankBalancePDF,
  exportCashBankBalanceExcel,
  exportAccountsReceivablePDF,
  exportAccountsReceivableExcel,
  exportAccountsPayablePDF,
  exportAccountsPayableExcel,
  exportDiscountReportPDF,
  exportDiscountReportExcel,
  exportPurchaseRegisterPDF,
  exportPurchaseRegisterExcel,
  exportSalesRegisterPDF,
  exportSalesRegisterExcel,
  exportStockAlertPDF,
  exportStockAlertExcel,
  exportFastMovingItemsPDF,
  exportFastMovingItemsExcel,
  exportSlowMovingItemsPDF,
  exportSlowMovingItemsExcel
} from '../utils/exportUtils'
import { subscribeToBankingPageData } from '../services/bankingService'

const ReportsNew = () => {
  const { t } = useLanguage()
  const { userData } = useAuth()
  const [selectedTab, setSelectedTab] = useState('everyday')
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [loading, setLoading] = useState(false)

  // Report data states
  const [reportData, setReportData] = useState<any>(null)
  const [currentReportType, setCurrentReportType] = useState<string | null>(null)
  // Pagination state for Item-wise Profit & Loss report
  const [itemPlPage, setItemPlPage] = useState<number>(1)
  const [itemPlPerPage, setItemPlPerPage] = useState<number>(10)

  // Derived pagination values for Item P&L
  const _itemPlTotal = reportData && reportData.items ? reportData.items.length : 0
  const itemPlTotalPages = Math.max(1, Math.ceil(_itemPlTotal / itemPlPerPage))
  const itemPlStart = (itemPlPage - 1) * itemPlPerPage
  const itemPlPagedItems = reportData && reportData.items ? reportData.items.slice(itemPlStart, itemPlStart + itemPlPerPage) : []

  const getDateRange = (period: string): { startDate: string; endDate: string } => {
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    let startDate: string

    switch (period) {
      case 'today':
        startDate = endDate
        break
      case 'this-week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        startDate = weekStart.toISOString().split('T')[0]
        break
      case 'this-month':
        startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
        break
      case 'this-year':
        startDate = `${today.getFullYear()}-01-01`
        break
      case 'all-time':
        startDate = '2024-01-01'
        break
      default:
        startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    }

    return { startDate, endDate }
  }

  const loadReport = async (reportType: string) => {
    setLoading(true)
    // Clear previous data to force re-render with fresh data
    setReportData(null)
    try {
      const { startDate, endDate } = getDateRange(selectedPeriod)
      let data

      switch (reportType) {
        case 'everyday':
          // For everyday tab, load day-book by default
          data = await getDayBook(endDate)
          break

        case 'overview':
          const [sales, purchases, stock] = await Promise.all([
            getSalesSummaryReport(startDate, endDate),
            getPurchaseSummaryReport(startDate, endDate),
            getStockSummaryReport()
          ])
          data = { sales, purchases, stock }
          break

        case 'day-book':
          data = await getDayBook(endDate)
          break

        case 'cash-bank-balance':
          data = await getCashAndBankBalance(endDate)
          break

        case 'accounts-receivable':
          data = await getAccountsReceivable()
          break

        case 'accounts-payable':
          data = await getAccountsPayable()
          break

        case 'purchase-register':
          data = await getPurchaseRegister(startDate, endDate)
          break

        case 'sales-register':
          data = await getSalesRegister(startDate, endDate)
          break

        case 'stock-alert':
          data = await getStockSummary()
          break

        case 'bill-profit':
          data = await getBillWiseProfit()
          break

        case 'profit-loss':
          data = await getProfitAndLoss(startDate, endDate)
          break

        case 'cash-flow':
          data = await getCashFlow(startDate, endDate)
          break

        case 'balance-sheet':
          data = await getBalanceSheet(endDate)
          break

        case 'trial-balance':
          data = await getTrialBalance(endDate)
          break

        case 'party-pl':
          data = await getPartyWiseProfitLoss()
          break

        case 'gstr1':
          const today = new Date()
          data = await getGSTR1(String(today.getMonth() + 1), String(today.getFullYear()))
          break

        case 'gstr3b':
          const now = new Date()
          data = await getGSTR3B(String(now.getMonth() + 1), String(now.getFullYear()))
          break

        case 'hsn':
          data = await getSaleSummaryByHSN()
          break

        case 'item-pl':
          data = await getItemWiseProfitLoss()
          break

        case 'discount':
          data = await getDiscountReport(startDate, endDate)
          break

        case 'fast-moving-items':
          data = await getFastMovingItems(30, 20, 100) // 30 days, top 20, min 100 units (realistic threshold)
          break

        case 'slow-moving-items':
          data = await getSlowMovingItems(30, 20, 10) // 30 days, bottom 20, max 10 units (slow threshold)
          break

        default:
          data = null
      }

      setReportData(data)
      setCurrentReportType(reportType)
    } catch (error) {
      console.error('Error loading report:', error)
      const message = error instanceof Error ? error.message : 'Unexpected error'
      toast.error(`Failed to load report: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport(selectedTab)
  }, [selectedTab, selectedPeriod])

  // When banking accounts change, refresh cash & bank balance report if active
  useEffect(() => {
    const unsub = subscribeToBankingPageData(() => {
      if (currentReportType === 'cash-bank-balance') {
        // reload the report to reflect live changes
        loadReport('cash-bank-balance')
      }
    })
    return () => unsub()
  }, [currentReportType, selectedPeriod])

  // Export handlers
  const handleExportPDF = () => {
    if (!reportData) {
      toast.error('No data to export')
      return
    }

    try {
      console.log('Exporting PDF for report type:', currentReportType)
      console.log('Report data:', reportData)

      switch (currentReportType) {
        case 'overview':
          exportSalesSummaryPDF(reportData.sales, selectedPeriod)
          toast.success('Report exported to PDF')
          break
        case 'day-book':
          exportDayBookPDF(reportData)
          toast.success('Daily Register exported to PDF')
          break
        case 'cash-bank-balance':
          exportCashBankBalancePDF(reportData)
          toast.success('Cash & Bank Balance exported to PDF')
          break
        case 'accounts-receivable':
          exportAccountsReceivablePDF(reportData)
          toast.success('Accounts Receivable exported to PDF')
          break
        case 'accounts-payable':
          exportAccountsPayablePDF(reportData)
          toast.success('Accounts Payable exported to PDF')
          break
        case 'discount':
          exportDiscountReportPDF(reportData)
          toast.success('Scholarship & Discount Report exported to PDF')
          break
        case 'purchase-register':
          exportPurchaseRegisterPDF(reportData)
          toast.success('Expense Register exported to PDF')
          break
        case 'sales-register':
          exportSalesRegisterPDF(reportData)
          toast.success('Fee Register exported to PDF')
          break
        case 'stock-alert':
          exportStockAlertPDF(reportData)
          toast.success('Seat Alert exported to PDF')
          break
        case 'fast-moving-items':
          exportFastMovingItemsPDF(reportData)
          toast.success('Popular Courses exported to PDF')
          break
        case 'slow-moving-items':
          exportSlowMovingItemsPDF(reportData)
          toast.success('Low Enrollment Courses exported to PDF')
          break
        case 'profit-loss':
          exportProfitLossPDF(reportData, selectedPeriod)
          toast.success('P&L exported to PDF')
          break
        case 'gstr1':
          exportGSTR1PDF(reportData)
          toast.success('GSTR-1 exported to PDF')
          break
        case 'gstr3b':
          exportGSTR3BPDF(reportData)
          toast.success('GSTR-3B exported to PDF')
          break
        case 'bill-profit':
          exportBillProfitPDF(reportData)
          toast.success('Receipt-wise Summary exported to PDF')
          break
        case 'item-pl':
          exportItemPLPDF(reportData)
          toast.success('Course-wise Fee Summary exported to PDF')
          break
        case 'party-pl':
          exportPartyPLPDF(reportData)
          toast.success('Student-wise Fee Summary exported to PDF')
          break
        default:
          toast.info('PDF export not available for this report')
      }
    } catch (error) {
      console.error('Export error:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      toast.error('Failed to export report')
    }
  }

  const handleExportExcel = () => {
    if (!reportData) {
      toast.error('No data to export')
      return
    }

    try {
      switch (currentReportType) {
        case 'day-book':
          exportDayBookExcel(reportData)
          toast.success('Daily Register exported to Excel')
          break
        case 'cash-bank-balance':
          exportCashBankBalanceExcel(reportData)
          toast.success('Cash & Bank Balance exported to Excel')
          break
        case 'accounts-receivable':
          exportAccountsReceivableExcel(reportData)
          toast.success('Accounts Receivable exported to Excel')
          break
        case 'accounts-payable':
          exportAccountsPayableExcel(reportData)
          toast.success('Accounts Payable exported to Excel')
          break
        case 'discount':
          exportDiscountReportExcel(reportData)
          toast.success('Scholarship & Discount Report exported to Excel')
          break
        case 'purchase-register':
          exportPurchaseRegisterExcel(reportData)
          toast.success('Expense Register exported to Excel')
          break
        case 'sales-register':
          exportSalesRegisterExcel(reportData)
          toast.success('Fee Register exported to Excel')
          break
        case 'stock-alert':
          exportStockAlertExcel(reportData)
          toast.success('Seat Alert exported to Excel')
          break
        case 'fast-moving-items':
          exportFastMovingItemsExcel(reportData)
          toast.success('Popular Courses exported to Excel')
          break
        case 'slow-moving-items':
          exportSlowMovingItemsExcel(reportData)
          toast.success('Low Enrollment Courses exported to Excel')
          break
        case 'profit-loss':
          exportProfitLossExcel(reportData, selectedPeriod)
          toast.success('Income & Expenses exported to Excel')
          break
        case 'party-pl':
          exportPartyPLExcel(reportData)
          toast.success('Student Fee Summary exported to Excel')
          break
        case 'item-pl':
          exportItemPLExcel(reportData)
          toast.success('Item P&L exported to Excel')
          break
        case 'bill-profit':
          exportBillProfitExcel(reportData)
          toast.success('Receipt Summary exported to Excel')
          break
        case 'hsn':
          exportHSNExcel(reportData)
          toast.success('SAC/HSN Summary exported to Excel')
          break
        case 'gstr1':
          exportGSTR1Excel(reportData)
          toast.success('GSTR-1 exported to Excel')
          break
        case 'gstr3b':
          exportGSTR3BExcel(reportData)
          toast.success('GSTR-3B exported to Excel')
          break
        default:
          // Generic export for any data
          if (reportData.parties) {
            exportPartyPLExcel(reportData)
          } else if (reportData.items) {
            exportItemPLExcel(reportData)
          } else {
            toast.info('Excel export not available for this report')
          }
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    }
  }

  const handleExportJSON = () => {
    if (!reportData) {
      toast.error('No data to export')
      return
    }

    try {
      const { startDate, endDate } = getDateRange(selectedPeriod)

      // Get report type label
      const reportTypeLabels: Record<string, string> = {
        'everyday': 'Daily Report',
        'day-book': 'Daily Register Report',
        'overview': 'Overview Report',
        'profit-loss': 'Income & Expenses Report',
        'cash-bank-balance': 'Cash & Bank Balance Report',
        'accounts-receivable': 'Fees Receivable Report',
        'accounts-payable': 'Payments Payable Report',
        'gstr1': 'GSTR-1 Report',
        'gstr3b': 'GSTR-3B Report',
        'party-pl': 'Student-wise Fee Summary Report',
        'item-pl': 'Course-wise Fee Summary Report',
        'bill-profit': 'Receipt-wise Summary Report',
        'hsn': 'SAC/HSN Summary Report',
        'discount': 'Scholarship & Discount Report',
        'purchase-register': 'Expense Register',
        'sales-register': 'Fee Register',
        'stock-alert': 'Seat Alert Report',
        'fast-moving-items': 'Popular Courses Report',
        'slow-moving-items': 'Low Enrollment Courses Report'
      }

      // Get period label
      const periodLabels: Record<string, string> = {
        'today': 'Today',
        'this-week': 'This Week',
        'this-month': 'This Month',
        'this-year': 'This Year',
        'all-time': 'All Time'
      }

      // Build professional JSON structure
      const exportData: any = {
        reportType: reportTypeLabels[currentReportType || 'everyday'] || currentReportType,
        period: periodLabels[selectedPeriod] || selectedPeriod,
        dateRange: {
          from: startDate,
          to: endDate
        },
        generatedAt: new Date().toISOString(),
        businessName: userData?.companyName || userData?.displayName || 'ThisAI ERP',
        summary: {},
        transactions: []
      }

      // Build summary and transactions based on report type
      if (reportData.sales !== undefined) {
        exportData.summary.sales = {
          count: reportData.sales?.count || 0,
          totalAmount: reportData.sales?.amount || reportData.sales?.totalAmount || 0,
          paidAmount: reportData.sales?.paid || reportData.sales?.paidAmount || 0,
          pendingAmount: (reportData.sales?.amount || 0) - (reportData.sales?.paid || 0)
        }
      }

      if (reportData.purchases !== undefined) {
        exportData.summary.purchases = {
          count: reportData.purchases?.count || 0,
          totalAmount: reportData.purchases?.amount || reportData.purchases?.totalAmount || 0,
          paidAmount: reportData.purchases?.paid || reportData.purchases?.paidAmount || 0,
          pendingAmount: (reportData.purchases?.amount || 0) - (reportData.purchases?.paid || 0)
        }
      }

      if (reportData.netCashFlow !== undefined) {
        exportData.summary.netCashFlow = reportData.netCashFlow
      }

      if (reportData.totalProfit !== undefined) {
        exportData.summary.profit = reportData.totalProfit
      }

      if (reportData.totalReceivable !== undefined) {
        exportData.summary.totalReceivable = reportData.totalReceivable
      }

      if (reportData.totalPayable !== undefined) {
        exportData.summary.totalPayable = reportData.totalPayable
      }

      // Add transactions array if available
      if (reportData.transactions && Array.isArray(reportData.transactions)) {
        exportData.transactions = reportData.transactions.map((txn: any) => ({
          id: txn.id || txn.invoiceNo || txn.billNo,
          type: txn.type || 'Transaction',
          date: txn.date || txn.createdAt,
          partyName: txn.partyName || txn.customerName || txn.supplierName || '',
          invoiceNo: txn.invoiceNo || txn.billNo || '',
          amount: txn.amount || txn.total || txn.grandTotal || 0,
          paid: txn.paid || txn.paidAmount || 0,
          balance: txn.balance || (txn.amount || 0) - (txn.paid || 0),
          paymentMode: txn.paymentMode || txn.paymentMethod || '',
          items: txn.items || txn.itemsList || []
        }))
      }

      // Add parties data if available
      if (reportData.parties && Array.isArray(reportData.parties)) {
        exportData.parties = reportData.parties
      }

      // Add items data if available
      if (reportData.items && Array.isArray(reportData.items)) {
        exportData.items = reportData.items
      }

      // Add invoices data if available
      if (reportData.invoices && Array.isArray(reportData.invoices)) {
        exportData.invoices = reportData.invoices
      }

      // Add bills data if available
      if (reportData.bills && Array.isArray(reportData.bills)) {
        exportData.bills = reportData.bills
      }

      // Add GST data if available
      if (reportData.gstr1 || reportData.gstr3b || reportData.taxSummary) {
        exportData.gstData = {
          gstr1: reportData.gstr1 || null,
          gstr3b: reportData.gstr3b || null,
          taxSummary: reportData.taxSummary || null
        }
      }

      // Include raw data for complete backup
      exportData.rawData = reportData

      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(reportTypeLabels[currentReportType || 'everyday'] || 'Report').replace(/\s+/g, '_')}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Report exported to JSON')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    }
  }

  const tabs = [
    { id: 'everyday', label: t.reports.everyDay, icon: Calendar },
    { id: 'overview', label: t.banking.overview, icon: ChartLine },
    { id: 'transactions', label: t.reports.transactions, icon: Receipt },
    { id: 'party', label: t.reports.partyReportsTitle, icon: Users },
    { id: 'gst', label: t.reports.gstReportsTitle, icon: Percent },
    { id: 'inventory', label: t.reports.stockReports, icon: Package },
    { id: 'business', label: 'Business', icon: FileText }
  ]

  return (
    <div className="erp-module-page overflow-x-hidden flex flex-col max-w-[100vw] w-full px-4 py-3 min-h-screen">
      {/* Header - Clean & Simple */}
      <div className="flex-shrink-0">
        {/* Top Row: KPI Cards (Left) + Filters & Actions (Right) */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-2 md:gap-4 mb-3">
          {/* Left Side: KPI Cards - Rectangular filling space */}
          <div className="erp-legacy-kpi-grid flex-1 grid grid-cols-4 gap-1.5 md:gap-3">
            {/* Reports Available Card - Blue Theme */}
            <div className="erp-legacy-kpi-shell p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-500 shadow-[6px_6px_12px_rgba(59,130,246,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(59,130,246,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button className="erp-legacy-kpi-button w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <ChartBar size={20} weight="duotone" className="text-blue-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">Reports</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">12</span>
                </div>
              </button>
            </div>

            {/* Downloaded Card - Green Theme */}
            <div className="erp-legacy-kpi-shell p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 shadow-[6px_6px_12px_rgba(34,197,94,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(34,197,94,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button className="erp-legacy-kpi-button w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <Download size={20} weight="duotone" className="text-green-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Downloaded</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">0</span>
                </div>
              </button>
            </div>

            {/* Views Card - Amber Theme */}
            <div className="erp-legacy-kpi-shell p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 shadow-[6px_6px_12px_rgba(245,158,11,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(245,158,11,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button className="erp-legacy-kpi-button w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <Eye size={20} weight="duotone" className="text-amber-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent font-semibold">Views</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{currentReportType ? 1 : 0}</span>
                </div>
              </button>
            </div>

            {/* Categories Card - Purple Theme */}
            <div className="erp-legacy-kpi-shell p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-purple-400 to-violet-500 shadow-[6px_6px_12px_rgba(139,92,246,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(139,92,246,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button className="erp-legacy-kpi-button w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <FolderOpen size={20} weight="duotone" className="text-purple-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent font-semibold">Categories</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">4</span>
                </div>
              </button>
            </div>
          </div>

          {/* Right Side: Date Filters + Export Buttons */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Export Buttons Row - show when report data available */}
            {reportData && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJSON}
                  className="h-9 px-4 rounded-xl bg-[#f5f7fa] dark:bg-slate-800 text-xs text-yellow-600 font-semibold flex items-center gap-1.5
                    shadow-[4px_4px_8px_#e0e3e7,-4px_-4px_8px_#ffffff]
                    dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
                    hover:shadow-[6px_6px_12px_#e0e3e7,-6px_-6px_12px_#ffffff]
                    active:shadow-[inset_3px_3px_6px_#e0e3e7,inset_-3px_-3px_6px_#ffffff]
                    transition-all duration-200"
                >
                  <FileJs size={14} weight="bold" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="h-9 px-4 rounded-xl bg-[#f5f7fa] dark:bg-slate-800 text-xs text-green-600 font-semibold flex items-center gap-1.5
                    shadow-[4px_4px_8px_#e0e3e7,-4px_-4px_8px_#ffffff]
                    dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
                    hover:shadow-[6px_6px_12px_#e0e3e7,-6px_-6px_12px_#ffffff]
                    active:shadow-[inset_3px_3px_6px_#e0e3e7,inset_-3px_-3px_6px_#ffffff]
                    transition-all duration-200"
                >
                  <Download size={14} weight="bold" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="h-9 px-4 rounded-xl bg-[#f5f7fa] dark:bg-slate-800 text-xs text-red-600 font-semibold flex items-center gap-1.5
                    shadow-[4px_4px_8px_#e0e3e7,-4px_-4px_8px_#ffffff]
                    dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
                    hover:shadow-[6px_6px_12px_#e0e3e7,-6px_-6px_12px_#ffffff]
                    active:shadow-[inset_3px_3px_6px_#e0e3e7,inset_-3px_-3px_6px_#ffffff]
                    transition-all duration-200"
                >
                  <Download size={14} weight="bold" />
                  <span>PDF</span>
                </button>
              </div>
            )}

            {/* Date Filter Tabs */}
            <div className="erp-module-filter-wrap">
              {[
                { key: 'today', label: t.common.today },
                { key: 'this-week', label: t.common.week },
                { key: 'this-month', label: t.common.month },
                { key: 'this-year', label: t.common.year },
                { key: 'all-time', label: t.reports.all || 'All' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedPeriod(filter.key)}
                  className={cn('erp-module-filter-chip', selectedPeriod === filter.key && 'is-active')}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Tabs - Second Row */}
        <div className="mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={cn(
                    "erp-module-filter-chip flex items-center gap-2",
                    selectedTab === tab.id
                      ? "is-active"
                      : "border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                  )}
                >
                <tab.icon size={18} weight={selectedTab === tab.id ? "bold" : "regular"} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="mt-4">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500 text-sm">{t.reports.loadingReport}</p>
          </div>
        </div>
      ) : (
        <div>
            {/* Every Day Tab */}
            {selectedTab === 'everyday' && (
              <div className="space-y-3">
                {/* Daily Reports Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <button
                    onClick={() => loadReport('day-book')}
                    className={cn(
                      "flex items-start gap-2 p-3 bg-white rounded-lg transition-all text-left shadow-sm",
                      currentReportType === 'day-book'
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-slate-200 hover:border-blue-300 hover:shadow"
                    )}
                  >
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Calendar size={16} className="text-blue-600" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{t.reports.dayBook}</p>
                      <p className="text-[10px] text-slate-500">{t.reports.whatHappenedToday}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('profit-loss')}
                    className={cn(
                      "flex items-start gap-2 p-3 bg-white rounded-lg transition-all text-left shadow-sm",
                      currentReportType === 'profit-loss'
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-slate-200 hover:border-blue-300 hover:shadow"
                    )}
                  >
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <TrendUp size={16} className="text-green-600" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{t.reports.profitLossToday}</p>
                      <p className="text-[10px] text-slate-500">{t.reports.didIEarnOrLose}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('cash-bank-balance')}
                    className={cn(
                      "flex items-start gap-2 p-3 bg-white rounded-lg transition-all text-left shadow-sm",
                      currentReportType === 'cash-bank-balance'
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-slate-200 hover:border-blue-300 hover:shadow"
                    )}
                  >
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <CurrencyCircleDollar size={16} className="text-purple-600" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{t.reports.cashBankBalance}</p>
                      <p className="text-[10px] text-slate-500">{t.reports.doIHaveMoney}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('accounts-receivable')}
                    className={cn(
                      "flex items-start gap-2 p-3 bg-white rounded-lg transition-all text-left shadow-sm",
                      currentReportType === 'accounts-receivable'
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-slate-200 hover:border-blue-300 hover:shadow"
                    )}
                  >
                    <div className="p-1.5 bg-orange-100 rounded-lg">
                      <TrendUp size={16} className="text-orange-600" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{t.reports.pendingToReceive}</p>
                      <p className="text-[10px] text-slate-500">{t.reports.whoOwesMeMoney}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('accounts-payable')}
                    className={cn(
                      "flex items-start gap-2 p-3 bg-white rounded-lg transition-all text-left shadow-sm",
                      currentReportType === 'accounts-payable'
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-slate-200 hover:border-blue-300 hover:shadow"
                    )}
                  >
                    <div className="p-1.5 bg-red-100 rounded-lg">
                      <TrendDown size={16} className="text-red-600" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{t.reports.pendingToPay}</p>
                      <p className="text-[10px] text-slate-500">{t.reports.whoDoIOwe}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('stock-alert')}
                    className={cn(
                      "flex items-start gap-2 p-3 bg-white rounded-lg transition-all text-left shadow-sm",
                      currentReportType === 'stock-alert'
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-slate-200 hover:border-blue-300 hover:shadow"
                    )}
                  >
                    <div className="p-1.5 bg-red-100 rounded-lg">
                      <Package size={16} className="text-red-600" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{t.reports.stockSummaryReport}</p>
                      <p className="text-[10px] text-slate-500">{t.reports.whatNeedsReorder}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('fast-moving-items')}
                    className={cn(
                      "flex items-start gap-2 p-3 bg-white rounded-lg transition-all text-left shadow-sm",
                      currentReportType === 'fast-moving-items'
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-slate-200 hover:border-blue-300 hover:shadow"
                    )}
                  >
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <TrendUp size={16} className="text-green-600" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800">{t.reports.fastMovingItems}</p>
                      <p className="text-[10px] text-slate-500">{t.reports.bestSellers}</p>
                    </div>
                  </button>
                </div>

                {/* Render the selected report content - all report displays are already defined below */}
                {/* Day Book Report */}
                {reportData && reportData.date && currentReportType === 'day-book' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">{t.reports.dayBookTitle} - {reportData.date}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-success/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{t.reports.salesLabel}</p>
                        <p className="text-2xl font-bold text-success">₹{(reportData.sales?.amount || 0).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{reportData.sales?.count || 0} {t.sales.invoices}</p>
                      </div>
                      <div className="p-4 bg-warning/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{t.reports.purchasesLabel}</p>
                        <p className="text-2xl font-bold text-warning">₹{(reportData.purchases?.amount || 0).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{reportData.purchases?.count || 0} {t.reports.bills}</p>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{t.reports.netCashFlow}</p>
                        <p className={cn("text-2xl font-bold", (reportData.netCashFlow || 0) >= 0 ? "text-success" : "text-destructive")}>
                          ₹{(reportData.netCashFlow || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    {reportData.transactions && reportData.transactions.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 text-sm font-semibold">{t.reports.invoiceHash}</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">{t.reports.type}</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">{t.reports.party}</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">{t.common.amount}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.transactions.slice(0, 10).map((tx: any, i: number) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="py-3 px-4 text-sm">{tx.invoiceNumber}</td>
                                <td className="py-3 px-4 text-sm">
                                  <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                    tx.type === 'sale' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                                    {tx.type === 'sale' ? t.reports.sale : t.reports.purchase}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm">{tx.partyName}</td>
                                <td className="py-3 px-4 text-sm text-right font-medium">₹{(tx.grandTotal || 0).toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* P&L Statement */}
                {reportData && reportData.revenue !== undefined && currentReportType === 'profit-loss' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Income & Expenses Statement</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Period: {reportData.period?.startDate} to {reportData.period?.endDate}
                    </p>

                    {/* Smart Warning for Partial Period */}
                    {reportData.warningData && reportData.warningData.isPartialPeriod && (
                      <div className="mb-6 bg-warning/10 border-2 border-warning/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-warning text-2xl">⚠️</div>
                          <div className="flex-1">
                            <p className="font-bold text-warning text-base mb-2">
                              Partial Period Detected ({reportData.warningData.daysInPeriod} of {reportData.warningData.daysInMonth} days)
                            </p>
                            {reportData.warningData.expensesProrated ? (
                              <div className="space-y-2">
                                <p className="text-sm text-foreground">
                                  ✅ Recurring expenses have been <strong>automatically prorated</strong> for this partial period:
                                </p>
                                {reportData.warningData.recurringExpenses.map((exp: any, idx: number) => (
                                  <div key={idx} className="text-xs text-muted-foreground pl-4">
                                    • {exp.category?.charAt(0).toUpperCase() + exp.category?.slice(1)}: ₹{(exp.monthlyAmount || 0).toLocaleString('en-IN')} (full month)
                                    → ₹{(exp.proratedAmount || 0).toLocaleString('en-IN')} ({reportData.warningData?.daysInPeriod || 0} days)
                                  </div>
                                ))}
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  Only {reportData.warningData.daysInPeriod} days' worth of monthly expenses are counted.
                                  This prevents misleading losses in partial-month reports.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-foreground">
                                  ⚠️ Some expenses may look high for just {reportData.warningData.daysInPeriod} days.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Tip: Mark recurring expenses (Rent, Salary) as "Monthly Recurring" for automatic daily proration.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between py-2">
                          <span className="font-medium">Revenue (Fees)</span>
                          <span className="font-bold">₹{(reportData.revenue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="font-medium">Cost of Goods Sold</span>
                          <span className="font-bold">₹{(reportData.costOfGoodsSold || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t">
                          <span className="font-semibold">Gross Profit</span>
                          <span className="font-bold text-success">₹{(reportData.grossProfit || 0).toLocaleString('en-IN')} ({(reportData.grossProfitMargin || 0).toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Operating Expenses</h3>
                        <div className="space-y-2 pl-4">
                          {reportData.operatingExpenses?.rent > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Rent</span>
                              <span>₹{reportData.operatingExpenses.rent.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {(reportData.operatingExpenses?.salary > 0 || reportData.operatingExpenses?.salaries > 0) && (
                            <div className="flex justify-between text-sm">
                              <span>Salaries</span>
                              <span>₹{(reportData.operatingExpenses.salary || reportData.operatingExpenses.salaries || 0).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.utilities > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Utilities</span>
                              <span>₹{reportData.operatingExpenses.utilities.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.marketing > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Marketing</span>
                              <span>₹{reportData.operatingExpenses.marketing.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.office_supplies > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Office Supplies</span>
                              <span>₹{reportData.operatingExpenses.office_supplies.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.travel > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Travel</span>
                              <span>₹{reportData.operatingExpenses.travel.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.food > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Food</span>
                              <span>₹{reportData.operatingExpenses.food.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.internet > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Internet</span>
                              <span>₹{reportData.operatingExpenses.internet.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.software > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Software</span>
                              <span>₹{reportData.operatingExpenses.software.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.other > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Other</span>
                              <span>₹{reportData.operatingExpenses.other.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-medium">Total Expenses</span>
                            <span className="font-bold">₹{(reportData.totalExpenses || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between py-3 bg-primary/5 px-4 rounded-lg">
                          <span className="font-bold text-lg">Net Profit</span>
                          <span className={cn("font-bold text-2xl", (reportData.netProfit || 0) >= 0 ? 'text-success' : 'text-destructive')}>
                            ₹{(reportData.netProfit || 0).toLocaleString('en-IN')} ({(reportData.netProfitMargin || 0).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash & Bank Balance Report */}
                {reportData && reportData.asOfDate && currentReportType === 'cash-bank-balance' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Cash & Bank Balance Summary</h2>
                    <p className="text-sm text-muted-foreground mb-6">As on: {reportData.asOfDate}</p>

                    {/* Main Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-6 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Cash in Hand</p>
                        <p className="text-3xl font-bold text-success">₹{(reportData.cashInHand || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Total Bank Balance</p>
                        <p className="text-3xl font-bold text-primary">₹{(reportData.totalBankBalance || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-6 bg-accent/5 border-2 border-accent/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Total Liquid Cash</p>
                        <p className="text-3xl font-bold text-accent">₹{(reportData.totalLiquidCash || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Bank Accounts Breakdown */}
                    <div className="mb-6">
                      <h3 className="font-semibold text-sm mb-3">Bank Accounts</h3>
                      <div className="space-y-2">
                        {reportData.bankAccounts.map((bank: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <span className="font-medium text-sm">{bank.name}</span>
                            <span className="font-bold text-primary">₹{bank.balance.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cash Breakdown */}
                    {reportData.cashBreakdown && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-sm mb-3">Cash Movement Breakdown</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Opening Cash:</span>
                            <span className="font-medium">₹{reportData.cashBreakdown.opening.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-success">
                            <span>+ Fee Receipts:</span>
                            <span className="font-medium">₹{reportData.cashBreakdown.salesReceipts.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-destructive">
                            <span>– Vendor Payments:</span>
                            <span className="font-medium">₹{reportData.cashBreakdown.purchasePayments.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-destructive">
                            <span>– Operating Expenses:</span>
                            <span className="font-medium">₹{reportData.cashBreakdown.expensePayments.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 font-bold">
                            <span>Closing Cash:</span>
                            <span className="text-success">₹{reportData.cashBreakdown.closing.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Accounts Receivable Report */}
                {reportData && reportData.totalReceivables !== undefined && currentReportType === 'accounts-receivable' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Pending Fees to Receive</h2>
                    <p className="text-sm text-muted-foreground mb-6">Students who owe fees</p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-6 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Total Receivables</p>
                        <p className="text-3xl font-bold text-warning">₹{reportData.totalReceivables.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Pending Invoices</p>
                        <p className="text-3xl font-bold text-primary">{reportData.totalInvoices}</p>
                      </div>
                      <div className="p-6 bg-accent/5 border-2 border-accent/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Students Owing</p>
                        <p className="text-3xl font-bold text-accent">{reportData.totalCustomers}</p>
                      </div>
                    </div>

                    {/* Aging Analysis */}
                    {reportData.aging && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Aging Analysis</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">0-30 Days</p>
                            <p className="text-lg font-bold text-success">₹{reportData.aging.current.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">31-60 Days</p>
                            <p className="text-lg font-bold text-warning">₹{reportData.aging.days30to60.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">61-90 Days</p>
                            <p className="text-lg font-bold text-destructive">₹{reportData.aging.days60to90.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">90+ Days</p>
                            <p className="text-lg font-bold text-destructive">₹{reportData.aging.over90.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Customer List */}
                    {reportData.customers && reportData.customers.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Students to Call</h3>
                        {reportData.customers.map((customer: any, idx: number) => (
                          <div key={idx} className="border border-border rounded-lg p-4 hover:border-warning transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-base">{customer.customerName}</h4>
                                <p className="text-sm text-muted-foreground">{customer.invoiceCount} pending invoice(s)</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-warning">₹{customer.totalDue.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-muted-foreground">Total Due</p>
                              </div>
                            </div>

                            {/* Invoice Details */}
                            <div className="space-y-2 border-t pt-3">
                              {customer.invoices.map((inv: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium">{inv.invoiceNumber}</span>
                                    <span className="text-muted-foreground ml-2">({inv.invoiceDate})</span>
                                    {inv.overdueDays > 0 && (
                                      <span className={cn("ml-2 px-2 py-0.5 rounded text-xs font-medium",
                                        inv.overdueDays <= 30 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                                        {inv.overdueDays} days overdue
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-warning">₹{inv.dueAmount.toLocaleString('en-IN')}</span>
                                    <span className="text-muted-foreground text-xs ml-2">/ ₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">🎉 No pending receivables!</p>
                        <p className="text-sm mt-2">All customers have paid their dues.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Accounts Payable Report */}
                {reportData && reportData.totalPayables !== undefined && currentReportType === 'accounts-payable' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Pending Payments to Pay</h2>
                    <p className="text-sm text-muted-foreground mb-6">Vendors you owe money to</p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-6 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Total Payables</p>
                        <p className="text-3xl font-bold text-destructive">₹{reportData.totalPayables.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Pending Invoices</p>
                        <p className="text-3xl font-bold text-primary">{reportData.totalInvoices}</p>
                      </div>
                      <div className="p-6 bg-accent/5 border-2 border-accent/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Vendors to Pay</p>
                        <p className="text-3xl font-bold text-accent">{reportData.totalSuppliers}</p>
                      </div>
                    </div>

                    {/* Aging Analysis */}
                    {reportData.aging && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Aging Analysis</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">0-30 Days</p>
                            <p className="text-lg font-bold text-success">₹{reportData.aging.current.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">31-60 Days</p>
                            <p className="text-lg font-bold text-warning">₹{reportData.aging.days30to60.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">61-90 Days</p>
                            <p className="text-lg font-bold text-destructive">₹{reportData.aging.days60to90.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">90+ Days</p>
                            <p className="text-lg font-bold text-destructive">₹{reportData.aging.over90.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Supplier List */}
                    {reportData.suppliers && reportData.suppliers.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Vendors to Pay</h3>
                        {reportData.suppliers.map((supplier: any, idx: number) => (
                          <div key={idx} className="border border-border rounded-lg p-4 hover:border-destructive transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-base">{supplier.supplierName}</h4>
                                <p className="text-sm text-muted-foreground">{supplier.invoiceCount} pending invoice(s)</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-destructive">₹{supplier.totalDue.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-muted-foreground">Total Due</p>
                              </div>
                            </div>

                            {/* Invoice Details */}
                            <div className="space-y-2 border-t pt-3">
                              {supplier.invoices.map((inv: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium">{inv.invoiceNumber}</span>
                                    <span className="text-muted-foreground ml-2">({inv.invoiceDate})</span>
                                    {inv.overdueDays > 0 && (
                                      <span className={cn("ml-2 px-2 py-0.5 rounded text-xs font-medium",
                                        inv.overdueDays <= 30 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                                        {inv.overdueDays} days overdue
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-destructive">₹{inv.dueAmount.toLocaleString('en-IN')}</span>
                                    <span className="text-muted-foreground text-xs ml-2">/ ₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">🎉 No pending payables!</p>
                        <p className="text-sm mt-2">All supplier dues have been paid.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Discount Report - Enhanced */}
                {reportData && reportData.totalDiscount !== undefined && currentReportType === 'discount' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Scholarship & Discount Report</h2>
                    <p className="text-sm text-muted-foreground mb-2">
                      Period: {new Date(reportData.period.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period.endDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground mb-6">
                      Total {reportData.invoiceCount} invoices | {reportData.discountInvoiceCount || reportData.invoices?.length || 0} with discounts
                    </p>

                    {/* Summary Cards - ORANGE theme for discounts */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Original Amount</p>
                        <p className="text-2xl font-bold text-primary">₹{reportData.totalOriginal.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Discount Given</p>
                        <p className="text-2xl font-bold text-warning">₹{reportData.totalDiscount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground mt-1">Money "lost" to discounts</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Final Amount</p>
                        <p className="text-2xl font-bold text-success">₹{reportData.totalSales.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-purple-500/5 border-2 border-purple-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Average Discount %</p>
                        <p className="text-2xl font-bold text-purple-500">{reportData.discountPercentage.toFixed(2)}%</p>
                      </div>
                    </div>

                    {/* Coupon Summary */}
                    {reportData.couponSummary && reportData.couponSummary.length > 0 && (
                      <div className="mb-6 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Top Coupon Codes Used</h3>
                        <div className="flex flex-wrap gap-2">
                          {reportData.couponSummary.slice(0, 5).map((coupon: any, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-orange-500/10 text-orange-600 rounded-full text-sm font-medium">
                              {coupon.code}: ₹{coupon.amount.toLocaleString('en-IN')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Platform Summary */}
                    {reportData.platformSummary && reportData.platformSummary.length > 0 && (
                      <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Discounts by Platform</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {reportData.platformSummary.map((plat: any, idx: number) => (
                            <div key={idx} className="text-center p-2 bg-blue-500/10 rounded-lg">
                              <p className="text-xs text-muted-foreground">{plat.platform}</p>
                              <p className="text-lg font-bold text-blue-600">₹{plat.amount.toLocaleString('en-IN')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Enhanced Invoice Table with more columns */}
                    {reportData.invoices && reportData.invoices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <h3 className="font-semibold text-sm mb-3">Invoice-wise Discount Details</h3>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-3 px-3 text-xs font-semibold">Date</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold">Order/Invoice</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold">Student</th>
                              <th className="text-right py-3 px-3 text-xs font-semibold">Original ₹</th>
                              <th className="text-center py-3 px-3 text-xs font-semibold">Coupon Code</th>
                              <th className="text-right py-3 px-3 text-xs font-semibold">Discount ₹</th>
                              <th className="text-right py-3 px-3 text-xs font-semibold">Final ₹</th>
                              <th className="text-center py-3 px-3 text-xs font-semibold">Platform</th>
                              <th className="text-center py-3 px-3 text-xs font-semibold">Disc %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.invoices.map((inv: any, index: number) => {
                              const discountPct = ((inv.discount / inv.originalAmount) * 100).toFixed(1)
                              const isHighDiscount = parseFloat(discountPct) > 10

                              return (
                                <tr
                                  key={index}
                                  className={cn(
                                    "border-b border-border last:border-0 hover:bg-muted/50",
                                    isHighDiscount && "bg-warning/5"
                                  )}
                                >
                                  <td className="py-3 px-3 text-xs">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                                  <td className="py-3 px-3 text-xs font-medium">{inv.invoiceNumber}</td>
                                  <td className="py-3 px-3 text-xs">{inv.partyName || 'Walk-in'}</td>
                                  <td className="py-3 px-3 text-xs text-right text-muted-foreground">₹{inv.originalAmount.toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-3 text-center">
                                    {inv.couponCode ? (
                                      <span className="px-2 py-0.5 bg-orange-500/10 text-orange-600 rounded text-xs font-medium">
                                        {inv.couponCode}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Manual</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-xs text-right font-bold text-warning">₹{inv.discount.toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-3 text-xs text-right font-bold">₹{inv.finalAmount.toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs">
                                      {inv.platform || 'Direct'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-xs font-medium",
                                      isHighDiscount
                                        ? "bg-warning/20 text-warning"
                                        : "bg-primary/10 text-primary"
                                    )}>
                                      {isHighDiscount && "⚠️"}{discountPct}%
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="bg-muted/50 font-bold">
                            <tr>
                              <td colSpan={3} className="py-3 px-3 text-xs">Total ({reportData.invoices.length} invoices)</td>
                              <td className="py-3 px-3 text-xs text-right">₹{reportData.totalOriginal.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3"></td>
                              <td className="py-3 px-3 text-xs text-right text-warning">₹{reportData.totalDiscount.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-xs text-right">₹{reportData.totalSales.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3"></td>
                              <td className="py-3 px-3 text-center text-xs">{reportData.discountPercentage.toFixed(1)}%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">✅ No discounts given</p>
                        <p className="text-sm mt-2">All invoices were at full price during this period.</p>
                      </div>
                    )}

                    {/* High Discount Warning */}
                    {reportData.invoices && reportData.invoices.filter((inv: any) => (inv.discount / inv.originalAmount) * 100 > 10).length > 0 && (
                      <div className="mt-6 bg-warning/10 border-2 border-warning/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-warning text-2xl">⚠️</div>
                          <div>
                            <p className="font-bold text-warning text-base mb-1">
                              High Discounts Detected
                            </p>
                            <p className="text-sm text-foreground">
                              {reportData.invoices.filter((inv: any) => (inv.discount / inv.originalAmount) * 100 > 10).length} invoices have discount greater than 10%.
                              Review these transactions to ensure profitability.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Purchase Register Report (ITC) - Enhanced */}
                {reportData && reportData.summary && reportData.purchases !== undefined && currentReportType === 'purchase-register' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Expense Register (ITC - Input Tax Credit)</h2>
                    <p className="text-sm text-muted-foreground mb-2">
                      Period: {new Date(reportData.period.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period.endDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-destructive mb-6">
                      📋 {reportData.complianceNote}
                    </p>

                    {/* Summary Cards - GREEN theme for ITC */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                      <div className="p-3 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
                        <p className="text-xl font-bold text-primary">{reportData.summary.totalPurchases}</p>
                      </div>
                      <div className="p-3 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Taxable Value</p>
                        <p className="text-lg font-bold text-blue-500">₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-green-500/5 border-2 border-green-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total GST (ITC)</p>
                        <p className="text-lg font-bold text-green-500">₹{reportData.summary.totalITC.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-green-600">Tax you can claim back</p>
                      </div>
                      <div className="p-3 bg-emerald-500/5 border-2 border-emerald-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Eligible ITC</p>
                        <p className="text-lg font-bold text-emerald-600">₹{(reportData.summary.totalEligibleITC || reportData.summary.totalITC).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-emerald-600">Actually claimable</p>
                      </div>
                      <div className="p-3 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Paid</p>
                        <p className="text-lg font-bold text-success">₹{reportData.summary.totalPaid.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Due</p>
                        <p className="text-lg font-bold text-warning">₹{reportData.summary.totalDue.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* GST Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">CGST (Central)</p>
                        <p className="text-lg font-bold text-green-600">₹{reportData.summary.totalCGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">SGST (State)</p>
                        <p className="text-lg font-bold text-green-600">₹{reportData.summary.totalSGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">IGST (Inter-state)</p>
                        <p className="text-lg font-bold text-green-600">₹{reportData.summary.totalIGST.toLocaleString('en-IN')}</p>
                      </div>
                      {reportData.summary.blockedITC > 0 && (
                        <div className="p-3 bg-red-500/10 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Blocked ITC</p>
                          <p className="text-lg font-bold text-red-600">₹{reportData.summary.blockedITC.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-red-600">Cannot claim (Sec 17(5))</p>
                        </div>
                      )}
                    </div>

                    {/* Category-wise Breakdown */}
                    {reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0 && (
                      <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">ITC by Category</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {reportData.categoryBreakdown.map((cat: any, idx: number) => (
                            <div key={idx} className="p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground">{cat.category}</p>
                              <p className="text-sm font-bold text-primary">{cat.count} bills</p>
                              <p className="text-xs text-green-600">ITC: ₹{cat.eligibleITC.toLocaleString('en-IN')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Purchase Table - Enhanced */}
                    {reportData.purchases && reportData.purchases.length > 0 ? (
                      <div className="overflow-x-auto">
                        <h3 className="font-semibold text-sm mb-3">Bill-wise ITC Details</h3>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-2 px-2 font-semibold">Date</th>
                              <th className="text-left py-2 px-2 font-semibold">Vendor</th>
                              <th className="text-left py-2 px-2 font-semibold">GSTIN</th>
                              <th className="text-left py-2 px-2 font-semibold">Bill No</th>
                              <th className="text-center py-2 px-2 font-semibold">Category</th>
                              <th className="text-left py-2 px-2 font-semibold">HSN/SAC</th>
                              <th className="text-right py-2 px-2 font-semibold">Taxable ₹</th>
                              <th className="text-center py-2 px-2 font-semibold">GST%</th>
                              <th className="text-right py-2 px-2 font-semibold">CGST</th>
                              <th className="text-right py-2 px-2 font-semibold">SGST</th>
                              <th className="text-right py-2 px-2 font-semibold">IGST</th>
                              <th className="text-right py-2 px-2 font-semibold">Total ITC</th>
                              <th className="text-center py-2 px-2 font-semibold">Eligible %</th>
                              <th className="text-center py-2 px-2 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.purchases.map((purchase: any, index: number) => (
                              <tr key={index} className={cn(
                                "border-b border-border last:border-0 hover:bg-muted/50",
                                purchase.itcEligible < 100 && "bg-red-50 dark:bg-red-900/10"
                              )}>
                                <td className="py-2 px-2">{new Date(purchase.invoiceDate).toLocaleDateString('en-IN')}</td>
                                <td className="py-2 px-2 max-w-[120px] truncate" title={purchase.supplierName}>{purchase.supplierName}</td>
                                <td className="py-2 px-2 text-muted-foreground font-mono">{purchase.supplierGSTIN}</td>
                                <td className="py-2 px-2 font-medium">{purchase.invoiceNumber}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[10px]">
                                    {purchase.category}
                                  </span>
                                </td>
                                <td className="py-2 px-2 font-mono">{purchase.hsnCode}{purchase.sacCode && ` / ${purchase.sacCode}`}</td>
                                <td className="py-2 px-2 text-right">₹{purchase.taxableValue.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-center">{purchase.gstRate}%</td>
                                <td className="py-2 px-2 text-right text-green-600">₹{purchase.cgst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-right text-green-600">₹{purchase.sgst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-right text-green-600">₹{purchase.igst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-right font-bold text-green-600">₹{purchase.totalITC.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                    purchase.itcEligible === 100 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                                  )}>
                                    {purchase.itcEligible}%
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                    purchase.paymentStatus === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                  )}>
                                    {purchase.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted/50 font-bold">
                            <tr>
                              <td colSpan={6} className="py-2 px-2">Total ({reportData.purchases.length} bills)</td>
                              <td className="py-2 px-2 text-right">₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2"></td>
                              <td className="py-2 px-2 text-right text-green-600">₹{reportData.summary.totalCGST.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2 text-right text-green-600">₹{reportData.summary.totalSGST.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2 text-right text-green-600">₹{reportData.summary.totalIGST.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2 text-right text-green-600">₹{reportData.summary.totalITC.toLocaleString('en-IN')}</td>
                              <td colSpan={2} className="py-2 px-2"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No purchases found</p>
                        <p className="text-sm mt-2">No purchase invoices during this period.</p>
                      </div>
                    )}

                    {/* ITC Compliance Tips */}
                    <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <h4 className="font-bold text-green-700 dark:text-green-400 text-sm mb-2">💡 ITC Claim Tips</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Total ITC available this month: <strong className="text-green-600">₹{reportData.summary.totalITC.toLocaleString('en-IN')}</strong></li>
                        <li>• Use this amount in GSTR-3B ITC column to reduce your GST payment</li>
                        <li>• Blocked ITC (food, motor vehicles, memberships) cannot be claimed</li>
                        <li>• Ensure all supplier GSTINs are valid for ITC to be allowed</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Sales Register Report (Output Tax) - Marketplace-Aware */}
                {reportData && reportData.summary && reportData.sales !== undefined && currentReportType === 'sales-register' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Fee Register (Output Tax)</h2>
                    <p className="text-sm text-muted-foreground mb-2">
                      Period: {new Date(reportData.period.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period.endDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-destructive mb-2">
                      📋 {reportData.complianceNote}
                    </p>
                    {reportData.calculationNote && (
                      <p className="text-xs text-blue-600 mb-6 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                        💡 {reportData.calculationNote}
                      </p>
                    )}

                    {/* Main Summary Cards - Shows Flow: Invoice Value → Deductions → Taxable Value → Output Tax */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Fees</p>
                        <p className="text-2xl font-bold text-primary">{reportData.summary.totalSales}</p>
                      </div>
                      <div className="p-4 bg-slate-500/5 border-2 border-slate-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Invoice Value</p>
                        <p className="text-lg font-bold text-slate-600">₹{(reportData.summary.totalInvoiceValue || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-muted-foreground">Student Paid</p>
                      </div>
                      <div className="p-4 bg-orange-500/5 border-2 border-orange-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">(-) Deductions</p>
                        <p className="text-lg font-bold text-orange-600">₹{(reportData.summary.totalDeductions || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-muted-foreground">TCS+Fees+Shipping</p>
                      </div>
                      <div className="p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Taxable Value</p>
                        <p className="text-lg font-bold text-blue-600">₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-muted-foreground">GST Base</p>
                      </div>
                      <div className="p-4 bg-red-500/5 border-2 border-red-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Output Tax</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalOutputTax.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-muted-foreground">GSTR-1 / GSTR-3B</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Collected</p>
                        <p className="text-lg font-bold text-success">₹{reportData.summary.totalCollected.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-muted-foreground">₹{reportData.summary.totalDue.toLocaleString('en-IN')} due</p>
                      </div>
                    </div>

                    {/* Marketplace Deductions Breakdown */}
                    {(reportData.summary.totalDeductions || 0) > 0 && (
                      <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                        <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-3">Marketplace Deductions (Subtracted from Invoice Value)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Shipping Charged</p>
                            <p className="text-base font-bold text-orange-600">₹{(reportData.summary.totalShippingCharged || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">TCS Collected (1%)</p>
                            <p className="text-base font-bold text-orange-600">₹{(reportData.summary.totalTcsCollected || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">TDS Deducted</p>
                            <p className="text-base font-bold text-orange-600">₹{(reportData.summary.totalTdsDeducted || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Marketplace Fees</p>
                            <p className="text-base font-bold text-orange-600">₹{(reportData.summary.totalMarketplaceFees || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* GST Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">CGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalCGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">SGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalSGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">IGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalIGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">RCM</p>
                        <p className="text-lg font-bold text-purple-600">₹{(reportData.summary.totalRCM || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Sale Type & State Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2B Sales</p>
                        <p className="text-lg font-bold text-blue-600">{reportData.summary.b2bSales}</p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2C Small</p>
                        <p className="text-lg font-bold text-purple-600">{reportData.summary.b2cSmall}</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2C Large</p>
                        <p className="text-lg font-bold text-orange-600">{reportData.summary.b2cLarge}</p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Intra-State</p>
                        <p className="text-lg font-bold text-green-600">{reportData.summary.intraStateSales || 0}</p>
                      </div>
                      <div className="p-3 bg-cyan-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Inter-State</p>
                        <p className="text-lg font-bold text-cyan-600">{reportData.summary.interStateSales || 0}</p>
                      </div>
                    </div>

                    {/* Platform-wise Breakdown */}
                    {reportData.platformBreakdown && reportData.platformBreakdown.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-3">Platform-wise Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {reportData.platformBreakdown.map((p: any, idx: number) => (
                            <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border">
                              <p className="text-sm font-medium mb-2">{p.platform}</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Orders:</span>
                                  <span className="font-medium">{p.count}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Invoice:</span>
                                  <span className="font-medium">₹{p.invoiceValue.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Taxable:</span>
                                  <span className="font-medium text-blue-600">₹{p.taxableValue.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Output Tax:</span>
                                  <span className="font-medium text-red-600">₹{p.outputTax.toLocaleString('en-IN')}</span>
                                </div>
                                {p.fees > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fees:</span>
                                    <span className="font-medium text-orange-600">₹{p.fees.toLocaleString('en-IN')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* GST Rate-wise Breakdown */}
                    {reportData.gstRateBreakdown && reportData.gstRateBreakdown.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-3">GST Rate-wise Summary (for GSTR-1)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {reportData.gstRateBreakdown.map((r: any, idx: number) => (
                            <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                              <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">{r.rate}</p>
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Count:</span>
                                  <span>{r.count}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Taxable:</span>
                                  <span>₹{r.taxableValue.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tax:</span>
                                  <span className="font-medium text-red-600">₹{r.outputTax.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sales Table - Enhanced with Marketplace columns */}
                    {reportData.sales && reportData.sales.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-3 px-2 font-semibold">Date</th>
                              <th className="text-left py-3 px-2 font-semibold">Order ID</th>
                              <th className="text-left py-3 px-2 font-semibold">Student</th>
                              <th className="text-left py-3 px-2 font-semibold">GSTIN</th>
                              <th className="text-center py-3 px-2 font-semibold">Platform</th>
                              <th className="text-right py-3 px-2 font-semibold">Invoice ₹</th>
                              <th className="text-right py-3 px-2 font-semibold text-orange-600">Deductions</th>
                              <th className="text-right py-3 px-2 font-semibold text-blue-600">Taxable ₹</th>
                              <th className="text-center py-3 px-2 font-semibold">GST%</th>
                              <th className="text-right py-3 px-2 font-semibold text-red-600">CGST</th>
                              <th className="text-right py-3 px-2 font-semibold text-red-600">SGST</th>
                              <th className="text-right py-3 px-2 font-semibold text-red-600">IGST</th>
                              <th className="text-right py-3 px-2 font-semibold text-red-600">Output Tax</th>
                              <th className="text-center py-3 px-2 font-semibold">Place</th>
                              <th className="text-center py-3 px-2 font-semibold">Type</th>
                              <th className="text-center py-3 px-2 font-semibold">RCM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.sales.map((sale: any, index: number) => (
                              <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/50">
                                <td className="py-2 px-2 text-xs">{new Date(sale.invoiceDate).toLocaleDateString('en-IN')}</td>
                                <td className="py-2 px-2 text-xs font-medium">{sale.orderId}</td>
                                <td className="py-2 px-2 text-xs">{sale.customerName}</td>
                                <td className="py-2 px-2 text-[10px] text-muted-foreground">{sale.customerGSTIN}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-medium",
                                    sale.platform === 'Amazon' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                                    sale.platform === 'Flipkart' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    sale.platform === 'Meesho' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' :
                                    sale.platform === 'Shopify' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    sale.platform === 'Website' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                  )}>
                                    {sale.platform}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-xs text-right">₹{sale.invoiceValue.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-xs text-right text-orange-600">
                                  {sale.totalDeductions > 0 ? `₹${sale.totalDeductions.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="py-2 px-2 text-xs text-right font-medium text-blue-600">₹{sale.taxableValue.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-xs text-center">{sale.gstRate}%</td>
                                <td className="py-2 px-2 text-xs text-right text-red-600">₹{sale.cgst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-xs text-right text-red-600">₹{sale.sgst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-xs text-right text-red-600">₹{sale.igst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-xs text-right font-bold text-red-600">₹{sale.totalOutputTax.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-[10px] text-center text-muted-foreground">{sale.placeOfSupply}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                    sale.saleType === 'B2B' ? 'bg-blue-500/10 text-blue-600' :
                                    sale.saleType === 'B2C Large' ? 'bg-orange-500/10 text-orange-600' :
                                    'bg-purple-500/10 text-purple-600'
                                  )}>
                                    {sale.saleType}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {sale.isRCM ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-600">
                                      ₹{sale.rcmAmount.toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {/* Totals Footer */}
                          <tfoot>
                            <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                              <td colSpan={5} className="py-3 px-2 text-sm">Monthly Totals (for GSTR-1 & GSTR-3B)</td>
                              <td className="py-3 px-2 text-sm text-right">₹{(reportData.summary.totalInvoiceValue || 0).toLocaleString('en-IN')}</td>
                              <td className="py-3 px-2 text-sm text-right text-orange-600">₹{(reportData.summary.totalDeductions || 0).toLocaleString('en-IN')}</td>
                              <td className="py-3 px-2 text-sm text-right text-blue-600">₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-2 text-center">-</td>
                              <td className="py-3 px-2 text-sm text-right text-red-600">₹{reportData.summary.totalCGST.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-2 text-sm text-right text-red-600">₹{reportData.summary.totalSGST.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-2 text-sm text-right text-red-600">₹{reportData.summary.totalIGST.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-2 text-sm text-right font-bold text-red-600">₹{reportData.summary.totalOutputTax.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-2 text-center">-</td>
                              <td className="py-3 px-2 text-center">-</td>
                              <td className="py-3 px-2 text-center text-purple-600">₹{(reportData.summary.totalRCM || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No sales found</p>
                        <p className="text-sm mt-2">No sale invoices during this period.</p>
                      </div>
                    )}

                    {/* GSTR Mapping Note */}
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                      <h4 className="text-sm font-semibold mb-2">How to use this in GSTR-1 & GSTR-3B</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• <strong>GSTR-1 Table 4/5/6/7:</strong> Use Taxable Value (₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}) and Output Tax breakdown</li>
                        <li>• <strong>GSTR-3B Table 3.1(a):</strong> Total Output Tax = ₹{reportData.summary.totalOutputTax.toLocaleString('en-IN')} (CGST + SGST + IGST)</li>
                        <li>• <strong>B2B vs B2C:</strong> {reportData.summary.b2bSales} B2B invoices (report with GSTIN), {reportData.summary.b2cSmall + reportData.summary.b2cLarge} B2C invoices</li>
                        <li>• <strong>TCS Credit:</strong> ₹{(reportData.summary.totalTcsCollected || 0).toLocaleString('en-IN')} TCS collected by marketplaces can be claimed as credit in Form GSTR-4</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Stock Alert Report */}
                {reportData && reportData.summary && reportData.items && currentReportType === 'stock-alert' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Low Seats Alert - Courses to Review</h2>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Total Items</p>
                        <p className="text-2xl font-bold text-primary">{reportData.summary.totalItems}</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Seats Available</p>
                        <p className="text-2xl font-bold text-success">
                          {reportData.items.filter((item: any) => item.status === 'In Stock').length}
                        </p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Low Seats</p>
                        <p className="text-2xl font-bold text-warning">{reportData.summary.lowStock}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">No Seats</p>
                        <p className="text-2xl font-bold text-destructive">{reportData.summary.outOfStock}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold">Item Name</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold">SKU</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Quantity</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Value</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Out of Stock items first */}
                          {reportData.items
                            .filter((item: any) => item.status === 'Out of Stock')
                            .map((item: any, index: number) => (
                              <tr key={`out-${index}`} className="border-b border-border last:border-0 bg-destructive/5">
                                <td className="py-3 px-4 text-sm font-medium">{item.name}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{item.sku}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-destructive">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{item.value.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                    🔴 {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}

                          {/* Low Stock items second */}
                          {reportData.items
                            .filter((item: any) => item.status === 'Low Stock')
                            .map((item: any, index: number) => (
                              <tr key={`low-${index}`} className="border-b border-border last:border-0 bg-warning/5">
                                <td className="py-3 px-4 text-sm font-medium">{item.name}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{item.sku}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-warning">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{item.value.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                                    🟠 {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}

                          {/* In Stock items last */}
                          {reportData.items
                            .filter((item: any) => item.status === 'In Stock')
                            .slice(0, 10)
                            .map((item: any, index: number) => (
                              <tr key={`in-${index}`} className="border-b border-border last:border-0">
                                <td className="py-3 px-4 text-sm font-medium">{item.name}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{item.sku}</td>
                                <td className="py-3 px-4 text-sm text-right">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{item.value.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                                    🟢 {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Note */}
                    {(reportData.summary.lowStock > 0 || reportData.summary.outOfStock > 0) && (
                      <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm font-semibold text-warning mb-1">Action Required</p>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.outOfStock > 0 && `${reportData.summary.outOfStock} course(s) have no seats. `}
                          {reportData.summary.lowStock > 0 && `${reportData.summary.lowStock} course(s) are running low on seats. `}
                          Please reorder these items soon to avoid stockouts.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sales Register Report (Output Tax) - Inventory Tab Version */}
                {reportData && reportData.summary && reportData.sales !== undefined && currentReportType === 'sales-register' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Fee Register (Output Tax)</h2>
                    <p className="text-sm text-muted-foreground mb-2">
                      Period: {new Date(reportData.period.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period.endDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-destructive mb-2">
                      📋 {reportData.complianceNote}
                    </p>
                    {reportData.calculationNote && (
                      <p className="text-xs text-blue-600 mb-6 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                        💡 {reportData.calculationNote}
                      </p>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Fees</p>
                        <p className="text-2xl font-bold text-primary">{reportData.summary.totalSales}</p>
                      </div>
                      <div className="p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Taxable Value</p>
                        <p className="text-lg font-bold text-blue-600">₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-red-500/5 border-2 border-red-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Output Tax</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalOutputTax.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Collected</p>
                        <p className="text-lg font-bold text-success">₹{reportData.summary.totalCollected.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Due</p>
                        <p className="text-lg font-bold text-warning">₹{reportData.summary.totalDue.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* GST Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">CGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalCGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">SGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalSGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">IGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalIGST.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Sale Type Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2B Sales</p>
                        <p className="text-lg font-bold text-blue-600">{reportData.summary.b2bSales}</p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2C Small</p>
                        <p className="text-lg font-bold text-purple-600">{reportData.summary.b2cSmall}</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2C Large</p>
                        <p className="text-lg font-bold text-orange-600">{reportData.summary.b2cLarge}</p>
                      </div>
                    </div>

                    {/* Sales Table */}
                    {reportData.sales && reportData.sales.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Student</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">GSTIN</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Invoice</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">SAC/HSN</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Taxable ₹</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">GST%</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">CGST</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">SGST</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">IGST</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Output Tax</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Type</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Payment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.sales.map((sale: any, index: number) => (
                              <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/50">
                                <td className="py-3 px-4 text-sm">{new Date(sale.invoiceDate).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm">{sale.customerName}</td>
                                <td className="py-3 px-4 text-xs text-muted-foreground">{sale.customerGSTIN}</td>
                                <td className="py-3 px-4 text-sm font-medium">{sale.invoiceNumber}</td>
                                <td className="py-3 px-4 text-xs">{sale.hsnCode}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{sale.taxableValue.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-center">{sale.gstRate}%</td>
                                <td className="py-3 px-4 text-sm text-right text-red-600">₹{sale.cgst.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-right text-red-600">₹{sale.sgst.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-right text-red-600">₹{sale.igst.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-red-600">₹{sale.totalOutputTax.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    sale.saleType === 'B2B' ? 'bg-blue-500/10 text-blue-600' :
                                    sale.saleType === 'B2C Large' ? 'bg-orange-500/10 text-orange-600' :
                                    'bg-purple-500/10 text-purple-600'
                                  )}>
                                    {sale.saleType}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    sale.paymentStatus === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                  )}>
                                    {sale.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No sales found</p>
                        <p className="text-sm mt-2">No sale invoices during this period.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Fast Moving Items Report */}
                {reportData && reportData.items && currentReportType === 'fast-moving-items' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">Popular Courses - Top Enrollments (Last 30 Days)</h2>
                      <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded">
                        Showing items with ≥100 units sold
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Total Items Sold</p>
                        <p className="text-2xl font-bold text-primary">{reportData.summary.totalQuantitySold}</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Healthy Seats</p>
                        <p className="text-2xl font-bold text-success">{reportData.summary.safeCount}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Low Seats</p>
                        <p className="text-2xl font-bold text-warning">{reportData.summary.lowCount}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Critical</p>
                        <p className="text-2xl font-bold text-destructive">{reportData.summary.criticalCount}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    {reportData.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-center py-3 px-4 text-sm font-semibold">Rank</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Item Name</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Qty Sold (30d)</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Avg Daily Sale</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Seats Available</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Days Left</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.items.map((item: any) => (
                            <tr
                              key={item.rank}
                              className={cn(
                                "border-b border-border last:border-0",
                                item.status === 'Critical' && "bg-destructive/5",
                                item.status === 'Low' && "bg-warning/5"
                              )}
                            >
                              <td className="py-3 px-4 text-sm text-center font-bold text-primary">
                                #{item.rank}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium">
                                {item.itemName}
                                <div className="text-xs text-muted-foreground">{item.sku}</div>
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-bold">
                                {item.quantitySold} {item.unit}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">
                                {item.avgDailySale} {item.unit}/day
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-medium">
                                {item.currentStock} {item.unit}
                              </td>
                              <td className={cn(
                                "py-3 px-4 text-sm text-right font-bold",
                                item.status === 'Critical' && "text-destructive",
                                item.status === 'Low' && "text-warning",
                                item.status === 'Safe' && "text-success"
                              )}>
                                {item.daysLeft > 999 ? '999+' : item.daysLeft} days
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium",
                                  item.status === 'Critical' && "bg-destructive/10 text-destructive",
                                  item.status === 'Low' && "bg-warning/10 text-warning",
                                  item.status === 'Safe' && "bg-success/10 text-success"
                                )}>
                                  {item.status === 'Critical' && '🔴 Critical'}
                                  {item.status === 'Low' && '🟠 Low'}
                                  {item.status === 'Safe' && '🟢 Safe'}
                                </span>
                              </td>
                            </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-muted/20 rounded-lg">
                        <div className="text-4xl mb-3">📊</div>
                        <p className="text-lg font-semibold mb-2">No Popular Courses Yet</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          No items have sold ≥100 units in the last 30 days.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Start recording sales invoices to see your top-selling products here.
                          This report helps you identify hot sellers and prevent stockouts.
                        </p>
                      </div>
                    )}

                    {/* Alert Banner */}
                    {reportData.items.length > 0 && reportData.summary.criticalCount > 0 && (
                      <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm font-semibold text-destructive mb-1">⚠️ Urgent Action Required</p>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.criticalCount} hot-selling item(s) have less than 5 days of stock remaining!
                          Order now to avoid losing sales on your best-selling products.
                        </p>
                      </div>
                    )}

                    {reportData.items.length > 0 && reportData.summary.lowCount > 0 && reportData.summary.criticalCount === 0 && (
                      <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm font-semibold text-warning mb-1">📋 Plan Ahead</p>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.lowCount} fast-moving item(s) will run out in 6-15 days.
                          Consider placing orders soon to maintain smooth operations.
                        </p>
                      </div>
                    )}

                    {reportData.items.length > 0 && reportData.summary.criticalCount === 0 && reportData.summary.lowCount === 0 && (
                      <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                        <p className="text-sm font-semibold text-success mb-1">✅ All Good!</p>
                        <p className="text-xs text-muted-foreground">
                          All your fast-moving items have sufficient stock. Great inventory management!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Overview Tab */}
            {selectedTab === 'overview' && reportData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-success/10 rounded-lg">
                        <Receipt size={24} className="text-success" weight="duotone" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Total Fees</h3>
                        <p className="text-2xl font-bold">₹{(reportData.sales?.totalSales || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Invoices:</span>
                        <span className="font-medium">{reportData.sales?.totalInvoices || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Value:</span>
                        <span className="font-medium">₹{Math.round(reportData.sales?.averageInvoiceValue || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-warning/10 rounded-lg">
                        <ShoppingCart size={24} className="text-warning" weight="duotone" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
                        <p className="text-2xl font-bold">₹{(reportData.purchases?.totalPurchases || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bills:</span>
                        <span className="font-medium">{reportData.purchases?.totalBills || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Value:</span>
                        <span className="font-medium">₹{Math.round(reportData.purchases?.averageBillValue || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Package size={24} className="text-primary" weight="duotone" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Course Value</h3>
                        <p className="text-2xl font-bold">₹{(reportData.stock?.totalStockValue || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Courses:</span>
                        <span className="font-medium">{reportData.stock?.totalItems || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Low Seats:</span>
                        <span className="font-medium text-warning">{reportData.stock?.lowStockItems || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Customers */}
                {reportData.sales?.topCustomers?.length > 0 && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Top Students</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold">Student</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Amount</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Receipts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.sales.topCustomers.map((customer: any, index: number) => (
                            <tr key={index} className="border-b border-border last:border-0">
                              <td className="py-3 px-4 text-sm font-medium">{customer.name}</td>
                              <td className="py-3 px-4 text-sm text-right font-semibold text-success">
                                ₹{(customer.amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">{customer.invoices}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {selectedTab === 'transactions' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'day-book', label: 'Daily Register', icon: Calendar, description: 'Daily admissions and fees summary' },
                    { id: 'cash-bank-balance', label: 'Cash & Bank Balance', icon: CurrencyCircleDollar, description: 'Cash in hand and bank' },
                    { id: 'accounts-receivable', label: 'Pending Fees to Receive', icon: TrendUp, description: 'Students with pending fees' },
                    { id: 'accounts-payable', label: 'Pending Payments to Pay', icon: TrendDown, description: 'Vendors you owe money' },
                    { id: 'bill-profit', label: 'Receipt-wise Summary', icon: TrendUp, description: 'Summary per receipt' }
                  ].map((report) => (
                    <button
                      key={report.id}
                      onClick={() => loadReport(report.id)}
                      className={cn(
                        "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                        currentReportType === report.id
                          ? "border-2 border-primary bg-primary/5"
                          : "border border-border hover:border-primary"
                      )}
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <report.icon size={20} className="text-primary" weight="duotone" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{report.label}</p>
                        <p className="text-xs text-muted-foreground">{report.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Cash & Bank Balance Report */}
                {reportData && reportData.asOfDate && currentReportType === 'cash-bank-balance' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Cash & Bank Balance Summary</h2>
                    <p className="text-sm text-muted-foreground mb-6">As on: {reportData.asOfDate}</p>

                    {/* Main Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-6 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Cash in Hand</p>
                        <p className="text-3xl font-bold text-success">₹{(reportData.cashInHand || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Total Bank Balance</p>
                        <p className="text-3xl font-bold text-primary">₹{(reportData.totalBankBalance || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-6 bg-accent/5 border-2 border-accent/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Total Liquid Cash</p>
                        <p className="text-3xl font-bold text-accent">₹{(reportData.totalLiquidCash || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Bank Accounts Breakdown */}
                    <div className="mb-6">
                      <h3 className="font-semibold text-sm mb-3">Bank Accounts</h3>
                      <div className="space-y-2">
                        {reportData.bankAccounts.map((bank: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <span className="font-medium text-sm">{bank.name}</span>
                            <span className="font-bold text-primary">₹{bank.balance.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cash Breakdown */}
                    {reportData.cashBreakdown && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-sm mb-3">Cash Movement Breakdown</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Opening Cash:</span>
                            <span className="font-medium">₹{reportData.cashBreakdown.opening.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-success">
                            <span>+ Fee Receipts:</span>
                            <span className="font-medium">₹{reportData.cashBreakdown.salesReceipts.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-destructive">
                            <span>– Vendor Payments:</span>
                            <span className="font-medium">₹{reportData.cashBreakdown.purchasePayments.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-destructive">
                            <span>– Operating Expenses:</span>
                            <span className="font-medium">₹{reportData.cashBreakdown.expensePayments.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 font-bold">
                            <span>Closing Cash:</span>
                            <span className="text-success">₹{reportData.cashBreakdown.closing.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Accounts Receivable Report */}
                {reportData && reportData.totalReceivables !== undefined && currentReportType === 'accounts-receivable' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Pending Fees to Receive</h2>
                    <p className="text-sm text-muted-foreground mb-6">Students who owe fees</p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-6 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Total Receivables</p>
                        <p className="text-3xl font-bold text-warning">₹{reportData.totalReceivables.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Pending Invoices</p>
                        <p className="text-3xl font-bold text-primary">{reportData.totalInvoices}</p>
                      </div>
                      <div className="p-6 bg-accent/5 border-2 border-accent/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Students Owing</p>
                        <p className="text-3xl font-bold text-accent">{reportData.totalCustomers}</p>
                      </div>
                    </div>

                    {/* Aging Analysis */}
                    {reportData.aging && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Aging Analysis</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">0-30 Days</p>
                            <p className="text-lg font-bold text-success">₹{reportData.aging.current.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">31-60 Days</p>
                            <p className="text-lg font-bold text-warning">₹{reportData.aging.days30to60.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">61-90 Days</p>
                            <p className="text-lg font-bold text-destructive">₹{reportData.aging.days60to90.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">90+ Days</p>
                            <p className="text-lg font-bold text-destructive">₹{reportData.aging.over90.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Customer List */}
                    {reportData.customers && reportData.customers.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Students to Call</h3>
                        {reportData.customers.map((customer: any, idx: number) => (
                          <div key={idx} className="border border-border rounded-lg p-4 hover:border-warning transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-base">{customer.customerName}</h4>
                                <p className="text-sm text-muted-foreground">{customer.invoiceCount} pending invoice(s)</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-warning">₹{customer.totalDue.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-muted-foreground">Total Due</p>
                              </div>
                            </div>

                            {/* Invoice Details */}
                            <div className="space-y-2 border-t pt-3">
                              {customer.invoices.map((inv: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium">{inv.invoiceNumber}</span>
                                    <span className="text-muted-foreground ml-2">({inv.invoiceDate})</span>
                                    {inv.overdueDays > 0 && (
                                      <span className={cn("ml-2 px-2 py-0.5 rounded text-xs font-medium",
                                        inv.overdueDays <= 30 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                                        {inv.overdueDays} days overdue
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-warning">₹{inv.dueAmount.toLocaleString('en-IN')}</span>
                                    <span className="text-muted-foreground text-xs ml-2">/ ₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">🎉 No pending receivables!</p>
                        <p className="text-sm mt-2">All customers have paid their dues.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Accounts Payable Report - Transactions Tab */}
                {reportData && reportData.totalPayables !== undefined && currentReportType === 'accounts-payable' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Pending Payments to Pay</h2>
                    <p className="text-sm text-muted-foreground mb-6">Vendors you owe money to</p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-6 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Total Payables</p>
                        <p className="text-3xl font-bold text-destructive">₹{reportData.totalPayables.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Pending Invoices</p>
                        <p className="text-3xl font-bold text-primary">{reportData.totalInvoices}</p>
                      </div>
                      <div className="p-6 bg-accent/5 border-2 border-accent/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-2">Vendors to Pay</p>
                        <p className="text-3xl font-bold text-accent">{reportData.totalSuppliers}</p>
                      </div>
                    </div>

                    {/* Aging Analysis */}
                    {reportData.aging && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Aging Analysis</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">0-30 Days</p>
                            <p className="text-lg font-bold text-success">₹{reportData.aging.current.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">31-60 Days</p>
                            <p className="text-lg font-bold text-warning">₹{reportData.aging.days30to60.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">61-90 Days</p>
                            <p className="text-lg font-bold text-destructive">₹{reportData.aging.days60to90.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">90+ Days</p>
                            <p className="text-lg font-bold text-destructive">₹{reportData.aging.over90.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Supplier List */}
                    {reportData.suppliers && reportData.suppliers.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Vendors to Pay</h3>
                        {reportData.suppliers.map((supplier: any, idx: number) => (
                          <div key={idx} className="border border-border rounded-lg p-4 hover:border-destructive transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-base">{supplier.supplierName}</h4>
                                <p className="text-sm text-muted-foreground">{supplier.invoiceCount} pending invoice(s)</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-destructive">₹{supplier.totalDue.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-muted-foreground">Total Due</p>
                              </div>
                            </div>

                            {/* Invoice Details */}
                            <div className="space-y-2 border-t pt-3">
                              {supplier.invoices.map((inv: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium">{inv.invoiceNumber}</span>
                                    <span className="text-muted-foreground ml-2">({inv.invoiceDate})</span>
                                    {inv.overdueDays > 0 && (
                                      <span className={cn("ml-2 px-2 py-0.5 rounded text-xs font-medium",
                                        inv.overdueDays <= 30 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                                        {inv.overdueDays} days overdue
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-destructive">₹{inv.dueAmount.toLocaleString('en-IN')}</span>
                                    <span className="text-muted-foreground text-xs ml-2">/ ₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">🎉 No pending payables!</p>
                        <p className="text-sm mt-2">All supplier dues have been paid.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Display report previews based on loaded report */}
                {reportData && reportData.date && currentReportType === 'day-book' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">{t.reports.dayBookTitle} - {reportData.date}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-success/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{t.reports.salesLabel}</p>
                        <p className="text-2xl font-bold text-success">₹{reportData.sales.amount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{reportData.sales.count} {t.sales.invoices}</p>
                      </div>
                      <div className="p-4 bg-warning/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{t.reports.purchasesLabel}</p>
                        <p className="text-2xl font-bold text-warning">₹{reportData.purchases.amount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{reportData.purchases.count} {t.reports.bills}</p>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">{t.reports.netCashFlow}</p>
                        <p className={cn("text-2xl font-bold", reportData.netCashFlow >= 0 ? "text-success" : "text-destructive")}>
                          ₹{reportData.netCashFlow.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    {reportData.transactions && reportData.transactions.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 text-sm font-semibold">{t.reports.invoiceHash}</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">{t.reports.type}</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">{t.reports.party}</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">{t.common.amount}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.transactions.slice(0, 10).map((tx: any, i: number) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="py-3 px-4 text-sm">{tx.invoiceNumber}</td>
                                <td className="py-3 px-4 text-sm">
                                  <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                    tx.type === 'sale' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                                    {tx.type === 'sale' ? t.reports.sale : t.reports.purchase}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm">{tx.partyName}</td>
                                <td className="py-3 px-4 text-sm text-right font-medium">₹{(tx.grandTotal || 0).toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Bill-wise Profit Report */}
                {reportData && reportData.bills && currentReportType === 'bill-profit' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Receipt-wise Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                        <p className="text-xl font-bold">₹{reportData.summary.totalRevenue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-warning/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
                        <p className="text-xl font-bold">₹{reportData.summary.totalCost.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-success/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Profit</p>
                        <p className="text-xl font-bold text-success">₹{reportData.summary.totalProfit.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-accent/5 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Avg Margin</p>
                        <p className="text-xl font-bold">{reportData.summary.avgProfitMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold">Invoice #</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold">Student</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Revenue</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Cost</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Profit</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Margin %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.bills.slice(0, 15).map((bill: any, i: number) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="py-3 px-4 text-sm font-medium">{bill.invoiceNumber}</td>
                              <td className="py-3 px-4 text-sm">{bill.invoiceDate}</td>
                              <td className="py-3 px-4 text-sm">{bill.partyName}</td>
                              <td className="py-3 px-4 text-sm text-right">₹{bill.revenue.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-sm text-right">₹{bill.cost.toLocaleString('en-IN')}</td>
                              <td className={cn("py-3 px-4 text-sm text-right font-semibold",
                                bill.profit >= 0 ? 'text-success' : 'text-destructive')}>
                                ₹{bill.profit.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">{bill.profitMargin.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* P&L Statement */}
                {reportData && reportData.revenue !== undefined && currentReportType === 'profit-loss' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Income & Expenses Statement</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Period: {reportData.period?.startDate} to {reportData.period?.endDate}
                    </p>

                    {/* Smart Warning for Partial Period */}
                    {reportData.warningData && reportData.warningData.isPartialPeriod && (
                      <div className="mb-6 bg-warning/10 border-2 border-warning/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-warning text-2xl">⚠️</div>
                          <div className="flex-1">
                            <p className="font-bold text-warning text-base mb-2">
                              Partial Period Detected ({reportData.warningData.daysInPeriod} of {reportData.warningData.daysInMonth} days)
                            </p>
                            {reportData.warningData.expensesProrated ? (
                              <div className="space-y-2">
                                <p className="text-sm text-foreground">
                                  ✅ Recurring expenses have been <strong>automatically prorated</strong> for this partial period:
                                </p>
                                {reportData.warningData.recurringExpenses.map((exp: any, idx: number) => (
                                  <div key={idx} className="text-xs text-muted-foreground pl-4">
                                    • {exp.category?.charAt(0).toUpperCase() + exp.category?.slice(1)}: ₹{(exp.monthlyAmount || 0).toLocaleString('en-IN')} (full month)
                                    → ₹{(exp.proratedAmount || 0).toLocaleString('en-IN')} ({reportData.warningData?.daysInPeriod || 0} days)
                                  </div>
                                ))}
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  Only {reportData.warningData.daysInPeriod} days' worth of monthly expenses are counted.
                                  This prevents misleading losses in partial-month reports.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-foreground">
                                  ⚠️ Some expenses may look high for just {reportData.warningData.daysInPeriod} days.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Tip: Mark recurring expenses (Rent, Salary) as "Monthly Recurring" for automatic daily proration.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between py-2">
                          <span className="font-medium">Revenue (Fees)</span>
                          <span className="font-bold">₹{(reportData.revenue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="font-medium">Cost of Goods Sold</span>
                          <span className="font-bold">₹{(reportData.costOfGoodsSold || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t">
                          <span className="font-semibold">Gross Profit</span>
                          <span className="font-bold text-success">₹{(reportData.grossProfit || 0).toLocaleString('en-IN')} ({(reportData.grossProfitMargin || 0).toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Operating Expenses</h3>
                        <div className="space-y-2 pl-4">
                          {reportData.operatingExpenses?.rent > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Rent</span>
                              <span>₹{reportData.operatingExpenses.rent.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {(reportData.operatingExpenses?.salary > 0 || reportData.operatingExpenses?.salaries > 0) && (
                            <div className="flex justify-between text-sm">
                              <span>Salaries</span>
                              <span>₹{(reportData.operatingExpenses.salary || reportData.operatingExpenses.salaries || 0).toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.utilities > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Utilities</span>
                              <span>₹{reportData.operatingExpenses.utilities.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.marketing > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Marketing</span>
                              <span>₹{reportData.operatingExpenses.marketing.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.office_supplies > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Office Supplies</span>
                              <span>₹{reportData.operatingExpenses.office_supplies.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.travel > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Travel</span>
                              <span>₹{reportData.operatingExpenses.travel.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.food > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Food</span>
                              <span>₹{reportData.operatingExpenses.food.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.internet > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Internet</span>
                              <span>₹{reportData.operatingExpenses.internet.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.software > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Software</span>
                              <span>₹{reportData.operatingExpenses.software.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {reportData.operatingExpenses?.other > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Other</span>
                              <span>₹{reportData.operatingExpenses.other.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-medium">Total Expenses</span>
                            <span className="font-bold">₹{(reportData.totalExpenses || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between py-3 bg-primary/5 px-4 rounded-lg">
                          <span className="font-bold text-lg">Net Profit</span>
                          <span className={cn("font-bold text-2xl", (reportData.netProfit || 0) >= 0 ? 'text-success' : 'text-destructive')}>
                            ₹{(reportData.netProfit || 0).toLocaleString('en-IN')} ({(reportData.netProfitMargin || 0).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Flow Report */}
                {reportData && reportData.transactions && currentReportType === 'cash-flow' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Cash Flow Statement</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Period: {new Date(reportData.period?.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period?.endDate).toLocaleDateString('en-IN')}
                    </p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Opening Balance</p>
                        <p className="text-xl font-bold text-blue-600">₹{(reportData.openingBalance || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Inflow</p>
                        <p className="text-xl font-bold text-success">+₹{(reportData.totalInflow || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Outflow</p>
                        <p className="text-xl font-bold text-destructive">-₹{(reportData.totalOutflow || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Closing Balance</p>
                        <p className="text-xl font-bold text-primary">₹{(reportData.closingBalance || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    {reportData.categoryBreakdown && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Category Breakdown</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="text-center p-2 bg-success/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Marketplace Payouts</p>
                            <p className="text-sm font-bold text-success">₹{(reportData.categoryBreakdown.marketplacePayouts || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center p-2 bg-success/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Direct Fees</p>
                            <p className="text-sm font-bold text-success">₹{(reportData.categoryBreakdown.directSales || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center p-2 bg-destructive/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Vendor Payments</p>
                            <p className="text-sm font-bold text-destructive">₹{(reportData.categoryBreakdown.supplierPayments || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center p-2 bg-destructive/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                            <p className="text-sm font-bold text-destructive">₹{(reportData.categoryBreakdown.expenses || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center p-2 bg-warning/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">GST Payments</p>
                            <p className="text-sm font-bold text-warning">₹{(reportData.categoryBreakdown.gstPayments || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transactions Table */}
                    {reportData.transactions && reportData.transactions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Description</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Reference</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Amount</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.transactions.slice(0, 50).map((txn: any, i: number) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="py-3 px-4 text-sm">{new Date(txn.date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm">
                                  <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                    txn.amount >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                                    {txn.type === 'marketplace_payout' ? 'Payout' :
                                     txn.type === 'sale_receipt' ? 'Receipt' :
                                     txn.type === 'purchase_payment' ? 'Payment' :
                                     txn.type === 'gst_payment' ? 'GST' : 'Expense'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm">{txn.description}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{txn.reference}</td>
                                <td className={cn("py-3 px-4 text-sm text-right font-medium",
                                  txn.amount >= 0 ? 'text-success' : 'text-destructive')}>
                                  {txn.amount >= 0 ? '+' : ''}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-bold">
                                  ₹{(txn.runningBalance || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No transactions found</p>
                        <p className="text-sm mt-2">No cash movements in this period.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Balance Sheet Report */}
                {reportData && reportData.assets && currentReportType === 'balance-sheet' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Balance Sheet</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      As on: {new Date(reportData.asOfDate).toLocaleDateString('en-IN')}
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Assets Section */}
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-primary border-b pb-2">ASSETS</h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-success/5 rounded-lg">
                            <div>
                              <p className="font-medium">Cash & Bank</p>
                              <p className="text-xs text-muted-foreground">Today's closing balance</p>
                            </div>
                            <p className="text-lg font-bold text-success">₹{(reportData.assets.cashAndBank || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-blue-500/5 rounded-lg">
                            <div>
                              <p className="font-medium">Course Capacity</p>
                              <p className="text-xs text-muted-foreground">Current stock valuation</p>
                            </div>
                            <p className="text-lg font-bold text-blue-600">₹{(reportData.assets.inventory || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-warning/5 rounded-lg">
                            <div>
                              <p className="font-medium">Receivables</p>
                              <p className="text-xs text-muted-foreground">Money owed by customers</p>
                            </div>
                            <p className="text-lg font-bold text-warning">₹{(reportData.assets.receivables || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">Other Assets</p>
                              <p className="text-xs text-muted-foreground">Deposits, advance tax, etc.</p>
                            </div>
                            <p className="text-lg font-bold">₹{(reportData.assets.otherAssets || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                            <p className="font-bold text-lg">Total Assets</p>
                            <p className="text-2xl font-bold text-primary">₹{(reportData.assets.totalAssets || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Liabilities + Capital Section */}
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-destructive border-b pb-2">LIABILITIES</h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-destructive/5 rounded-lg">
                            <div>
                              <p className="font-medium">GST Payable</p>
                              <p className="text-xs text-muted-foreground">Output GST - ITC - GST Paid</p>
                            </div>
                            <p className="text-lg font-bold text-destructive">₹{(reportData.liabilities.gstPayable || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-orange-500/5 rounded-lg">
                            <div>
                              <p className="font-medium">Vendors Payable</p>
                              <p className="text-xs text-muted-foreground">Unpaid purchase bills</p>
                            </div>
                            <p className="text-lg font-bold text-orange-600">₹{(reportData.liabilities.suppliersPayable || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">Loans Outstanding</p>
                              <p className="text-xs text-muted-foreground">Business loans, credit cards</p>
                            </div>
                            <p className="text-lg font-bold">₹{(reportData.liabilities.loansOutstanding || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                            <p className="font-semibold">Total Liabilities</p>
                            <p className="text-lg font-bold text-destructive">₹{(reportData.liabilities.totalLiabilities || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-accent border-b pb-2 mt-6">OWNER'S CAPITAL</h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                            <div>
                              <p className="font-medium">Capital Invested</p>
                              <p className="text-xs text-muted-foreground">Initial business capital</p>
                            </div>
                            <p className="text-lg font-bold text-accent">₹{(reportData.ownersCapital?.capitalInvested || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-success/5 rounded-lg">
                            <div>
                              <p className="font-medium">Retained Earnings</p>
                              <p className="text-xs text-muted-foreground">Current year profit</p>
                            </div>
                            <p className={cn("text-lg font-bold", (reportData.ownersCapital?.retainedEarnings || 0) >= 0 ? 'text-success' : 'text-destructive')}>
                              ₹{(reportData.ownersCapital?.retainedEarnings || 0).toLocaleString('en-IN')}
                            </p>
                          </div>

                          <div className="flex justify-between items-center p-4 bg-accent/10 rounded-lg border-2 border-accent/30">
                            <p className="font-bold text-lg">Total Capital</p>
                            <p className="text-2xl font-bold text-accent">₹{(reportData.ownersCapital?.total || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Balance Verification */}
                    <div className={cn("mt-6 p-4 rounded-lg border-2",
                      reportData.isBalanced ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30")}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{reportData.isBalanced ? '✅' : '⚠️'}</span>
                        <div>
                          <p className={cn("font-bold", reportData.isBalanced ? "text-success" : "text-destructive")}>
                            {reportData.isBalanced ? 'Balance Sheet is Balanced' : 'Balance Sheet Mismatch'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Assets (₹{(reportData.assets.totalAssets || 0).toLocaleString('en-IN')}) =
                            Liabilities (₹{(reportData.liabilities.totalLiabilities || 0).toLocaleString('en-IN')}) +
                            Capital (₹{(reportData.ownersCapital?.total || 0).toLocaleString('en-IN')})
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trial Balance Report */}
                {reportData && reportData.accounts && currentReportType === 'trial-balance' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Trial Balance</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      As on: {new Date(reportData.asOfDate).toLocaleDateString('en-IN')}
                    </p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Debit</p>
                        <p className="text-xl font-bold text-success">₹{(reportData.totalDebit || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Credit</p>
                        <p className="text-xl font-bold text-destructive">₹{(reportData.totalCredit || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Difference</p>
                        <p className="text-xl font-bold text-warning">₹{(reportData.difference || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className={cn("p-4 rounded-xl border-2",
                        reportData.balanced ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20")}>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <p className={cn("text-xl font-bold", reportData.balanced ? "text-success" : "text-destructive")}>
                          {reportData.balanced ? '✓ Balanced' : '✗ Unbalanced'}
                        </p>
                      </div>
                    </div>

                    {/* Account Type Summary */}
                    {reportData.summary && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Account Summary</h3>
                        <div className="grid grid-cols-5 gap-3 text-center">
                          <div className="p-2 bg-blue-500/10 rounded">
                            <p className="text-xs text-muted-foreground">Assets</p>
                            <p className="text-lg font-bold text-blue-600">{reportData.summary.assetAccounts}</p>
                          </div>
                          <div className="p-2 bg-destructive/10 rounded">
                            <p className="text-xs text-muted-foreground">Liabilities</p>
                            <p className="text-lg font-bold text-destructive">{reportData.summary.liabilityAccounts}</p>
                          </div>
                          <div className="p-2 bg-success/10 rounded">
                            <p className="text-xs text-muted-foreground">Income</p>
                            <p className="text-lg font-bold text-success">{reportData.summary.incomeAccounts}</p>
                          </div>
                          <div className="p-2 bg-warning/10 rounded">
                            <p className="text-xs text-muted-foreground">Expenses</p>
                            <p className="text-lg font-bold text-warning">{reportData.summary.expenseAccounts}</p>
                          </div>
                          <div className="p-2 bg-accent/10 rounded">
                            <p className="text-xs text-muted-foreground">Capital</p>
                            <p className="text-lg font-bold text-accent">{reportData.summary.capitalAccounts}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ledger Accounts Table */}
                    {reportData.accounts && reportData.accounts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-3 px-4 text-sm font-semibold">Ledger Name</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Type</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Debit ₹</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Credit ₹</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.accounts.map((acc: any, i: number) => (
                              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                                <td className="py-3 px-4 text-sm font-medium">{acc.accountName}</td>
                                <td className="py-3 px-4 text-sm text-center">
                                  <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                    acc.accountType === 'asset' ? 'bg-blue-500/10 text-blue-600' :
                                    acc.accountType === 'liability' ? 'bg-destructive/10 text-destructive' :
                                    acc.accountType === 'income' ? 'bg-success/10 text-success' :
                                    acc.accountType === 'expense' ? 'bg-warning/10 text-warning' :
                                    'bg-accent/10 text-accent')}>
                                    {acc.accountType.charAt(0).toUpperCase() + acc.accountType.slice(1)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-medium">
                                  {acc.debit > 0 ? `₹${acc.debit.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-medium">
                                  {acc.credit > 0 ? `₹${acc.credit.toLocaleString('en-IN')}` : '-'}
                                </td>
                              </tr>
                            ))}
                            {/* Totals Row */}
                            <tr className="border-t-2 border-border bg-muted/50 font-bold">
                              <td className="py-4 px-4 text-base" colSpan={2}>Total</td>
                              <td className="py-4 px-4 text-base text-right text-success">₹{(reportData.totalDebit || 0).toLocaleString('en-IN')}</td>
                              <td className="py-4 px-4 text-base text-right text-destructive">₹{(reportData.totalCredit || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No accounts found</p>
                        <p className="text-sm mt-2">Start adding transactions to see your trial balance.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Party Reports Tab */}
            {selectedTab === 'party' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => loadReport('party-pl')}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                      currentReportType === 'party-pl'
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary"
                    )}
                  >
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Users size={20} className="text-accent" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Student-wise Fee Summary</p>
                      <p className="text-xs text-muted-foreground">Profit analysis by party</p>
                    </div>
                  </button>
                </div>

                {/* Party P&L Data */}
                {reportData && reportData.parties && currentReportType === 'party-pl' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Student-wise Fee Summary</h2>
                    <p className="text-sm text-muted-foreground mb-6">Revenue and profit analysis by customer</p>

                    {/* Summary Cards */}
                    {reportData.summary && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                          <p className="text-xl font-bold text-primary">₹{(reportData.summary.totalRevenue || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                          <p className="text-xl font-bold text-warning">₹{(reportData.summary.totalCost || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">Total Profit</p>
                          <p className={cn("text-xl font-bold", (reportData.summary.totalProfit || 0) >= 0 ? "text-success" : "text-destructive")}>
                            ₹{(reportData.summary.totalProfit || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="p-4 bg-accent/5 border-2 border-accent/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">Students</p>
                          <p className="text-xl font-bold text-accent">{reportData.summary.totalParties || 0}</p>
                        </div>
                        <div className="p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">Invoices</p>
                          <p className="text-xl font-bold text-blue-600">{reportData.summary.totalInvoices || 0}</p>
                        </div>
                      </div>
                    )}

                    {reportData.parties.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-3 px-4 text-sm font-semibold">Student Name</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Invoices</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Revenue</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Cost (COGS)</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Profit</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Margin %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.parties.map((party: any, index: number) => (
                              <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/20">
                                <td className="py-3 px-4 text-sm font-medium">{party.partyName}</td>
                                <td className="py-3 px-4 text-sm text-center text-muted-foreground">{party.invoiceCount}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{party.revenue.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-right text-muted-foreground">₹{party.cost.toLocaleString('en-IN')}</td>
                                <td className={cn(
                                  "py-3 px-4 text-sm text-right font-semibold",
                                  party.profit >= 0 ? "text-success" : "text-destructive"
                                )}>
                                  ₹{party.profit.toLocaleString('en-IN')}
                                </td>
                                <td className={cn(
                                  "py-3 px-4 text-sm text-right font-medium",
                                  party.profitMargin >= 20 ? "text-success" : party.profitMargin >= 10 ? "text-warning" : "text-destructive"
                                )}>
                                  {party.profitMargin.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {/* Totals Row */}
                          {reportData.summary && (
                            <tfoot>
                              <tr className="border-t-2 border-border bg-muted/50 font-bold">
                                <td className="py-4 px-4 text-base">Total</td>
                                <td className="py-4 px-4 text-base text-center">{reportData.summary.totalInvoices}</td>
                                <td className="py-4 px-4 text-base text-right text-primary">₹{(reportData.summary.totalRevenue || 0).toLocaleString('en-IN')}</td>
                                <td className="py-4 px-4 text-base text-right">₹{(reportData.summary.totalCost || 0).toLocaleString('en-IN')}</td>
                                <td className={cn("py-4 px-4 text-base text-right", (reportData.summary.totalProfit || 0) >= 0 ? "text-success" : "text-destructive")}>
                                  ₹{(reportData.summary.totalProfit || 0).toLocaleString('en-IN')}
                                </td>
                                <td className="py-4 px-4 text-base text-right">
                                  {reportData.summary.totalRevenue > 0 ? ((reportData.summary.totalProfit / reportData.summary.totalRevenue) * 100).toFixed(1) : 0}%
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No sales data found</p>
                        <p className="text-sm mt-2">Create some sales invoices to see party-wise profit analysis.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* GST Reports Tab */}
            {selectedTab === 'gst' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'gstr1', label: 'GSTR-1', icon: FileText, description: 'Outward supplies' },
                    { id: 'gstr3b', label: 'GSTR-3B', icon: FileText, description: 'Monthly summary' },
                    { id: 'hsn', label: 'SAC/HSN Summary', icon: Tag, description: 'SAC/HSN-wise fees' }
                  ].map((report) => (
                    <button
                      key={report.id}
                      onClick={() => loadReport(report.id)}
                      className={cn(
                        "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                        currentReportType === report.id
                          ? "border-2 border-primary bg-primary/5"
                          : "border border-border hover:border-primary"
                      )}
                    >
                      <div className="p-2 bg-success/10 rounded-lg">
                        <report.icon size={20} className="text-success" weight="duotone" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{report.label}</p>
                        <p className="text-xs text-muted-foreground">{report.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* GSTR-1 Data */}
                {reportData && reportData.b2b && reportData.b2c && currentReportType === 'gstr1' && (
                  <div className="space-y-4">
                    {/* Status Banner */}
                    <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-success text-2xl">✅</div>
                        <div>
                          <p className="font-bold text-success text-lg">All Good! Your GSTR-1 is 100% correct</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Period: {reportData.period?.month}/{reportData.period?.year}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Main Summary Card */}
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                      <h2 className="text-lg font-bold mb-4">GSTR-1 Summary</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* B2B Section - Table 4 */}
                        <div>
                          <h3 className="font-semibold mb-3">Table 4: B2B Supplies (Registered Customers)</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Total Invoices:</span>
                              <span className="font-medium">{reportData.b2b.count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Taxable Value:</span>
                              <span className="font-medium">₹{reportData.b2b.taxableValue.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">CGST:</span>
                              <span className="font-medium">₹{reportData.b2b.cgst.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">SGST:</span>
                              <span className="font-medium">₹{reportData.b2b.sgst.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-sm font-semibold">Total Tax:</span>
                              <span className="font-bold text-success">₹{reportData.b2b.totalTax.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>

                        {/* B2C Section - Table 7 */}
                        <div>
                          <h3 className="font-semibold mb-3">Table 7: B2C Supplies (Unregistered)</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Total Invoices:</span>
                              <span className="font-medium">{reportData.b2c.count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Taxable Value:</span>
                              <span className="font-medium">₹{reportData.b2c.taxableValue.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">CGST:</span>
                              <span className="font-medium">₹{reportData.b2c.cgst.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">SGST:</span>
                              <span className="font-medium">₹{reportData.b2c.sgst.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-sm font-semibold">Total Tax:</span>
                              <span className="font-bold text-success">₹{reportData.b2c.totalTax.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Total Summary */}
                      <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Invoices</p>
                            <p className="text-2xl font-bold">{reportData.b2b.count + reportData.b2c.count}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Taxable Value</p>
                            <p className="text-2xl font-bold">₹{(reportData.b2b.taxableValue + reportData.b2c.taxableValue).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Tax</p>
                            <p className="text-2xl font-bold text-primary">₹{(reportData.b2b.totalTax + reportData.b2c.totalTax).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Explanatory Note for B2C */}
                    {reportData.b2c.count > 0 && (
                      <div className="bg-info/10 border border-info/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-info text-xl">ℹ️</div>
                          <div>
                            <p className="font-semibold text-info mb-2">Note on B2C Invoices</p>
                            <p className="text-sm text-muted-foreground">
                              Sales to unregistered consumers (without GSTIN) below ₹2.5L are reported in Table 7 (B2C Small).
                              This is 100% correct as per GST law. You pay tax in GSTR-3B on total sales.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* GSTR-3B Data */}
                {reportData && reportData.outwardSupplies && currentReportType === 'gstr3b' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">GSTR-3B Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Outward Supplies</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Taxable Value:</span>
                            <span className="font-medium">₹{reportData.outwardSupplies.taxableValue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">CGST:</span>
                            <span className="font-medium">₹{reportData.outwardSupplies.cgst.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">SGST:</span>
                            <span className="font-medium">₹{reportData.outwardSupplies.sgst.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-semibold">Total Tax:</span>
                            <span className="font-bold text-success">₹{reportData.outwardSupplies.totalTax.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-3">Inward Supplies</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Taxable Value:</span>
                            <span className="font-medium">₹{reportData.inwardSupplies.taxableValue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">CGST:</span>
                            <span className="font-medium">₹{reportData.inwardSupplies.cgst.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">SGST:</span>
                            <span className="font-medium">₹{reportData.inwardSupplies.sgst.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-semibold">Total Tax:</span>
                            <span className="font-bold text-warning">₹{reportData.inwardSupplies.totalTax.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Tax Payable:</span>
                        <span className="text-2xl font-bold text-primary">₹{reportData.taxPayable.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* HSN Summary */}
                {reportData && reportData.hsnWiseData && currentReportType === 'hsn' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">SAC/HSN-wise Summary</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold">SAC/HSN Code</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold">Description</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Quantity</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Taxable Value</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Tax Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.hsnWiseData.slice(0, 10).map((hsn: any, index: number) => (
                            <tr key={index} className="border-b border-border last:border-0">
                              <td className="py-3 px-4 text-sm font-medium">{hsn.hsn}</td>
                              <td className="py-3 px-4 text-sm">{hsn.description}</td>
                              <td className="py-3 px-4 text-sm text-right">{hsn.quantity}</td>
                              <td className="py-3 px-4 text-sm text-right">₹{Math.round(hsn.taxableValue).toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-sm text-right">₹{Math.round(hsn.taxAmount).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Inventory Tab */}
            {selectedTab === 'inventory' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => loadReport('fast-moving-items')}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                      currentReportType === 'fast-moving-items'
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary"
                    )}
                  >
                    <div className="p-2 bg-success/10 rounded-lg">
                      <TrendUp size={20} className="text-success" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Popular Courses</p>
                      <p className="text-xs text-muted-foreground">Track high-demand courses</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('slow-moving-items')}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                      currentReportType === 'slow-moving-items'
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary"
                    )}
                  >
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <TrendDown size={20} className="text-destructive" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Low Enrollment Courses</p>
                      <p className="text-xs text-muted-foreground">Identify courses needing attention</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('stock-alert')}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                      currentReportType === 'stock-alert'
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary"
                    )}
                  >
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <Package size={20} className="text-warning" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Low Seats Alert</p>
                      <p className="text-xs text-muted-foreground">Courses needing more seats</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('item-pl')}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                      currentReportType === 'item-pl'
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary"
                    )}
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package size={20} className="text-primary" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Course-wise Fee Summary</p>
                      <p className="text-xs text-muted-foreground">Fee performance per course</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('discount')}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                      currentReportType === 'discount'
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary"
                    )}
                  >
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <Percent size={20} className="text-warning" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Scholarship & Discount Report</p>
                      <p className="text-xs text-muted-foreground">Scholarships and discounts given</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('purchase-register')}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                      currentReportType === 'purchase-register'
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary"
                    )}
                  >
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <ShoppingCart size={20} className="text-green-500" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Expense Register (ITC)</p>
                      <p className="text-xs text-muted-foreground">GST input tax credit tracking</p>
                    </div>
                  </button>

                  <button
                    onClick={() => loadReport('sales-register')}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                      currentReportType === 'sales-register'
                        ? "border-2 border-primary bg-primary/5"
                        : "border border-border hover:border-primary"
                    )}
                  >
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <Receipt size={20} className="text-red-500" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Fee Register (Output Tax)</p>
                      <p className="text-xs text-muted-foreground">GST output tax tracking</p>
                    </div>
                  </button>
                </div>

                {/* Stock Alert Report */}
                {reportData && reportData.summary && reportData.items && currentReportType === 'stock-alert' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Low Seats Alert - Courses to Review</h2>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Total Items</p>
                        <p className="text-2xl font-bold text-primary">{reportData.summary.totalItems}</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Seats Available</p>
                        <p className="text-2xl font-bold text-success">
                          {reportData.items.filter((item: any) => item.status === 'In Stock').length}
                        </p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Low Seats</p>
                        <p className="text-2xl font-bold text-warning">{reportData.summary.lowStock}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">No Seats</p>
                        <p className="text-2xl font-bold text-destructive">{reportData.summary.outOfStock}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold">Item Name</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold">SKU</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Quantity</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Value</th>
                            <th className="text-center py-3 px-4 text-sm font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Out of Stock items first */}
                          {reportData.items
                            .filter((item: any) => item.status === 'Out of Stock')
                            .map((item: any, index: number) => (
                              <tr key={`out-${index}`} className="border-b border-border last:border-0 bg-destructive/5">
                                <td className="py-3 px-4 text-sm font-medium">{item.name}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{item.sku}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-destructive">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{item.value.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                    🔴 {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}

                          {/* Low Stock items second */}
                          {reportData.items
                            .filter((item: any) => item.status === 'Low Stock')
                            .map((item: any, index: number) => (
                              <tr key={`low-${index}`} className="border-b border-border last:border-0 bg-warning/5">
                                <td className="py-3 px-4 text-sm font-medium">{item.name}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{item.sku}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-warning">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{item.value.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                                    🟠 {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}

                          {/* In Stock items last */}
                          {reportData.items
                            .filter((item: any) => item.status === 'In Stock')
                            .slice(0, 10)
                            .map((item: any, index: number) => (
                              <tr key={`in-${index}`} className="border-b border-border last:border-0">
                                <td className="py-3 px-4 text-sm font-medium">{item.name}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{item.sku}</td>
                                <td className="py-3 px-4 text-sm text-right">{item.quantity}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{item.value.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                                    🟢 {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Note */}
                    {(reportData.summary.lowStock > 0 || reportData.summary.outOfStock > 0) && (
                      <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm font-semibold text-warning mb-1">Action Required</p>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.outOfStock > 0 && `${reportData.summary.outOfStock} course(s) have no seats. `}
                          {reportData.summary.lowStock > 0 && `${reportData.summary.lowStock} course(s) are running low on seats. `}
                          Please reorder these items soon to avoid stockouts.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sales Register Report (Output Tax) - Inventory Tab Version */}
                {reportData && reportData.summary && reportData.sales !== undefined && currentReportType === 'sales-register' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Fee Register (Output Tax)</h2>
                    <p className="text-sm text-muted-foreground mb-2">
                      Period: {new Date(reportData.period.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period.endDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-destructive mb-2">
                      📋 {reportData.complianceNote}
                    </p>
                    {reportData.calculationNote && (
                      <p className="text-xs text-blue-600 mb-6 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                        💡 {reportData.calculationNote}
                      </p>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Fees</p>
                        <p className="text-2xl font-bold text-primary">{reportData.summary.totalSales}</p>
                      </div>
                      <div className="p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Taxable Value</p>
                        <p className="text-lg font-bold text-blue-600">₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-red-500/5 border-2 border-red-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Output Tax</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalOutputTax.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Collected</p>
                        <p className="text-lg font-bold text-success">₹{reportData.summary.totalCollected.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Due</p>
                        <p className="text-lg font-bold text-warning">₹{reportData.summary.totalDue.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* GST Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">CGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalCGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">SGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalSGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">IGST</p>
                        <p className="text-lg font-bold text-red-600">₹{reportData.summary.totalIGST.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Sale Type Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2B Sales</p>
                        <p className="text-lg font-bold text-blue-600">{reportData.summary.b2bSales}</p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2C Small</p>
                        <p className="text-lg font-bold text-purple-600">{reportData.summary.b2cSmall}</p>
                      </div>
                      <div className="p-3 bg-orange-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">B2C Large</p>
                        <p className="text-lg font-bold text-orange-600">{reportData.summary.b2cLarge}</p>
                      </div>
                    </div>

                    {/* Sales Table */}
                    {reportData.sales && reportData.sales.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Student</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">GSTIN</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Invoice</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">SAC/HSN</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Taxable ₹</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">GST%</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">CGST</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">SGST</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">IGST</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Output Tax</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Type</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Payment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.sales.map((sale: any, index: number) => (
                              <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/50">
                                <td className="py-3 px-4 text-sm">{new Date(sale.invoiceDate).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm">{sale.customerName}</td>
                                <td className="py-3 px-4 text-xs text-muted-foreground">{sale.customerGSTIN}</td>
                                <td className="py-3 px-4 text-sm font-medium">{sale.invoiceNumber}</td>
                                <td className="py-3 px-4 text-xs">{sale.hsnCode}</td>
                                <td className="py-3 px-4 text-sm text-right">₹{sale.taxableValue.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-center">{sale.gstRate}%</td>
                                <td className="py-3 px-4 text-sm text-right text-red-600">₹{sale.cgst.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-right text-red-600">₹{sale.sgst.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-right text-red-600">₹{sale.igst.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-red-600">₹{sale.totalOutputTax.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    sale.saleType === 'B2B' ? 'bg-blue-500/10 text-blue-600' :
                                    sale.saleType === 'B2C Large' ? 'bg-orange-500/10 text-orange-600' :
                                    'bg-purple-500/10 text-purple-600'
                                  )}>
                                    {sale.saleType}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "px-2 py-1 rounded text-xs font-medium",
                                    sale.paymentStatus === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                  )}>
                                    {sale.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No sales found</p>
                        <p className="text-sm mt-2">No sale invoices during this period.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Fast Moving Items Report */}
                {reportData && reportData.items && currentReportType === 'fast-moving-items' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">Popular Courses - Top Enrollments (Last 30 Days)</h2>
                      <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded">
                        Showing items with ≥100 units sold
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Total Items Sold</p>
                        <p className="text-2xl font-bold text-primary">{reportData.summary.totalQuantitySold}</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Healthy Seats</p>
                        <p className="text-2xl font-bold text-success">{reportData.summary.safeCount}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Low Seats</p>
                        <p className="text-2xl font-bold text-warning">{reportData.summary.lowCount}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Critical</p>
                        <p className="text-2xl font-bold text-destructive">{reportData.summary.criticalCount}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    {reportData.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-center py-3 px-4 text-sm font-semibold">Rank</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Item Name</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Qty Sold (30d)</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Avg Daily Sale</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Seats Available</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Days Left</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.items.map((item: any) => (
                            <tr
                              key={item.rank}
                              className={cn(
                                "border-b border-border last:border-0",
                                item.status === 'Critical' && "bg-destructive/5",
                                item.status === 'Low' && "bg-warning/5"
                              )}
                            >
                              <td className="py-3 px-4 text-sm text-center font-bold text-primary">
                                #{item.rank}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium">
                                {item.itemName}
                                <div className="text-xs text-muted-foreground">{item.sku}</div>
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-bold">
                                {item.quantitySold} {item.unit}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">
                                {item.avgDailySale} {item.unit}/day
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-medium">
                                {item.currentStock} {item.unit}
                              </td>
                              <td className={cn(
                                "py-3 px-4 text-sm text-right font-bold",
                                item.status === 'Critical' && "text-destructive",
                                item.status === 'Low' && "text-warning",
                                item.status === 'Safe' && "text-success"
                              )}>
                                {item.daysLeft > 999 ? '999+' : item.daysLeft} days
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium",
                                  item.status === 'Critical' && "bg-destructive/10 text-destructive",
                                  item.status === 'Low' && "bg-warning/10 text-warning",
                                  item.status === 'Safe' && "bg-success/10 text-success"
                                )}>
                                  {item.status === 'Critical' && '🔴 Critical'}
                                  {item.status === 'Low' && '🟠 Low'}
                                  {item.status === 'Safe' && '🟢 Safe'}
                                </span>
                              </td>
                            </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-muted/20 rounded-lg">
                        <div className="text-4xl mb-3">📊</div>
                        <p className="text-lg font-semibold mb-2">No Popular Courses Yet</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          No items have sold ≥100 units in the last 30 days.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Start recording sales invoices to see your top-selling products here.
                          This report helps you identify hot sellers and prevent stockouts.
                        </p>
                      </div>
                    )}

                    {/* Alert Banner */}
                    {reportData.items.length > 0 && reportData.summary.criticalCount > 0 && (
                      <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm font-semibold text-destructive mb-1">⚠️ Urgent Action Required</p>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.criticalCount} hot-selling item(s) have less than 5 days of stock remaining!
                          Order now to avoid losing sales on your best-selling products.
                        </p>
                      </div>
                    )}

                    {reportData.items.length > 0 && reportData.summary.lowCount > 0 && reportData.summary.criticalCount === 0 && (
                      <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm font-semibold text-warning mb-1">📋 Plan Ahead</p>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.lowCount} fast-moving item(s) will run out in 6-15 days.
                          Consider placing orders soon to maintain smooth operations.
                        </p>
                      </div>
                    )}

                    {reportData.items.length > 0 && reportData.summary.criticalCount === 0 && reportData.summary.lowCount === 0 && (
                      <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                        <p className="text-sm font-semibold text-success mb-1">✅ All Good!</p>
                        <p className="text-xs text-muted-foreground">
                          All your fast-moving items have sufficient stock. Great inventory management!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Slow Moving Items Report */}
                {reportData && reportData.items && currentReportType === 'slow-moving-items' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">Low Enrollment Courses - No Enrollments (Last 30 Days)</h2>
                      <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded">
                        Showing items with ≤10 units sold
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Capital Tied Up</p>
                        <p className="text-2xl font-bold text-primary">₹{reportData.summary.totalStockValue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">No Enrollments</p>
                        <p className="text-2xl font-bold text-destructive">{reportData.summary.deadStockCount}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Very Slow</p>
                        <p className="text-2xl font-bold text-warning">{reportData.summary.verySlowCount}</p>
                      </div>
                      <div className="p-4 bg-yellow-500/5 border-2 border-yellow-500/20 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Slow</p>
                        <p className="text-2xl font-bold text-yellow-600">{reportData.summary.slowCount}</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    {reportData.items.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-center py-3 px-4 text-sm font-semibold">Rank</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Item Name</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Qty Sold (30d)</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Avg Daily Sale</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Seats Available</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Course Value</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.items.map((item: any) => (
                              <tr
                                key={item.rank}
                                className={cn(
                                  "border-b border-border last:border-0",
                                  item.status === 'Dead Stock' && "bg-destructive/5",
                                  item.status === 'Very Slow' && "bg-warning/5"
                                )}
                              >
                                <td className="py-3 px-4 text-sm text-center font-bold text-destructive">
                                  #{item.rank}
                                </td>
                                <td className="py-3 px-4 text-sm font-medium">
                                  {item.itemName}
                                  <div className="text-xs text-muted-foreground">{item.sku}</div>
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-bold">
                                  {item.quantitySold} {item.unit}
                                </td>
                                <td className="py-3 px-4 text-sm text-right">
                                  {item.avgDailySale} {item.unit}/day
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-medium">
                                  {item.currentStock} {item.unit}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-bold text-primary">
                                  ₹{item.stockValue.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium",
                                    item.status === 'Dead Stock' && "bg-destructive/10 text-destructive",
                                    item.status === 'Very Slow' && "bg-warning/10 text-warning",
                                    item.status === 'Slow' && "bg-yellow-500/10 text-yellow-600"
                                  )}>
                                    {item.status === 'Dead Stock' && '⛔ No Enrollments'}
                                    {item.status === 'Very Slow' && '🐌 Very Slow'}
                                    {item.status === 'Slow' && '🟡 Slow'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-muted/20 rounded-lg">
                        <div className="text-4xl mb-3">🎉</div>
                        <p className="text-lg font-semibold mb-2">No Low Enrollment Courses</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Great! All items are selling well. No dead stock found.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This report shows items with ≤10 units sold in 30 days.
                          When items appear here, consider discounts or promotions to clear inventory.
                        </p>
                      </div>
                    )}

                    {/* Alert Banner */}
                    {reportData.items.length > 0 && reportData.summary.deadStockCount > 0 && (
                      <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm font-semibold text-destructive mb-1">⚠️ Action Required</p>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.deadStockCount} course(s) have zero enrollments in 30 days!
                          ₹{reportData.summary.totalStockValue.toLocaleString('en-IN')} capital is tied up.
                          Consider discounts, promotions, or bundle offers to clear dead stock.
                        </p>
                      </div>
                    )}

                    {reportData.items.length > 0 && reportData.summary.deadStockCount === 0 && (reportData.summary.verySlowCount > 0 || reportData.summary.slowCount > 0) && (
                      <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm font-semibold text-warning mb-1">📋 Monitor Closely</p>
                        <p className="text-xs text-muted-foreground">
                          These low-enrollment courses are tying up ₹{reportData.summary.totalStockValue.toLocaleString('en-IN')} in resources.
                          Monitor sales closely and consider promotions if they don't improve soon.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Item P&L Data */}
                {reportData && reportData.items && currentReportType === 'item-pl' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Course-wise Fee Summary</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold">Item Name</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Revenue</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Cost</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Profit</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold">Margin %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemPlPagedItems.map((item: any, index: number) => (
                            <tr key={item.itemId || index} className="border-b border-border last:border-0">
                              <td className="py-3 px-4 text-sm font-medium">{item.itemName}</td>
                              <td className="py-3 px-4 text-sm text-right">₹{Math.round(item.totalRevenue).toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-sm text-right">₹{Math.round(item.totalCost).toLocaleString('en-IN')}</td>
                              <td className={cn(
                                "py-3 px-4 text-sm text-right font-semibold",
                                item.profit >= 0 ? "text-success" : "text-destructive"
                              )}>
                                ₹{Math.round(item.profit).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">{item.profitMargin.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination Controls */}
                    {_itemPlTotal > itemPlPerPage && (
                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-muted-foreground">Rows:</label>
                          <select
                            value={itemPlPerPage}
                            onChange={(e) => { setItemPlPerPage(Number(e.target.value)); setItemPlPage(1) }}
                            className="px-2 py-1 border border-border rounded"
                            aria-label="Rows per page"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                          <span className="text-xs text-muted-foreground">Showing {(itemPlStart + 1).toLocaleString()} - {Math.min(itemPlStart + itemPlPerPage, _itemPlTotal).toLocaleString()} of {_itemPlTotal.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setItemPlPage(p => Math.max(1, p - 1))}
                            disabled={itemPlPage <= 1}
                            className={cn("px-3 py-1 rounded border transition", itemPlPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted')}
                            aria-label="Previous page"
                          >
                            Prev
                          </button>
                          <div className="text-sm text-muted-foreground">Page {itemPlPage} of {itemPlTotalPages}</div>
                          <button
                            onClick={() => setItemPlPage(p => Math.min(itemPlTotalPages, p + 1))}
                            disabled={itemPlPage >= itemPlTotalPages}
                            className={cn("px-3 py-1 rounded border transition", itemPlPage >= itemPlTotalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted')}
                            aria-label="Next page"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Discount Report - Inventory Tab */}
                {reportData && reportData.totalDiscount !== undefined && currentReportType === 'discount' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Scholarship & Discount Report</h2>
                    <p className="text-sm text-muted-foreground mb-2">
                      Period: {new Date(reportData.period.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period.endDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground mb-6">
                      Total {reportData.invoiceCount} invoices | {reportData.discountInvoiceCount || reportData.invoices?.length || 0} with discounts
                    </p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Original Amount</p>
                        <p className="text-2xl font-bold text-primary">₹{reportData.totalOriginal.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Discount Given</p>
                        <p className="text-2xl font-bold text-warning">₹{reportData.totalDiscount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground mt-1">Money "lost" to discounts</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Final Amount</p>
                        <p className="text-2xl font-bold text-success">₹{reportData.totalSales.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-purple-500/5 border-2 border-purple-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Average Discount %</p>
                        <p className="text-2xl font-bold text-purple-500">{reportData.discountPercentage.toFixed(2)}%</p>
                      </div>
                    </div>

                    {/* Invoice Table */}
                    {reportData.invoices && reportData.invoices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-3 px-3 text-xs font-semibold">Date</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold">Invoice</th>
                              <th className="text-left py-3 px-3 text-xs font-semibold">Student</th>
                              <th className="text-right py-3 px-3 text-xs font-semibold">Original ₹</th>
                              <th className="text-center py-3 px-3 text-xs font-semibold">Coupon</th>
                              <th className="text-right py-3 px-3 text-xs font-semibold">Discount ₹</th>
                              <th className="text-right py-3 px-3 text-xs font-semibold">Final ₹</th>
                              <th className="text-center py-3 px-3 text-xs font-semibold">Platform</th>
                              <th className="text-center py-3 px-3 text-xs font-semibold">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.invoices.map((inv: any, index: number) => {
                              const discountPct = ((inv.discount / inv.originalAmount) * 100).toFixed(1)
                              const isHighDiscount = parseFloat(discountPct) > 10
                              return (
                                <tr key={index} className={cn("border-b border-border last:border-0 hover:bg-muted/50", isHighDiscount && "bg-warning/5")}>
                                  <td className="py-3 px-3 text-xs">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                                  <td className="py-3 px-3 text-xs font-medium">{inv.invoiceNumber}</td>
                                  <td className="py-3 px-3 text-xs">{inv.partyName || 'Walk-in'}</td>
                                  <td className="py-3 px-3 text-xs text-right">₹{inv.originalAmount.toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-3 text-center">
                                    {inv.couponCode ? (
                                      <span className="px-2 py-0.5 bg-orange-500/10 text-orange-600 rounded text-xs">{inv.couponCode}</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Manual</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-xs text-right font-bold text-warning">₹{inv.discount.toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-3 text-xs text-right font-bold">₹{inv.finalAmount.toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs">{inv.platform || 'Direct'}</span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", isHighDiscount ? "bg-warning/20 text-warning" : "bg-primary/10 text-primary")}>
                                      {isHighDiscount && "⚠️"}{discountPct}%
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="bg-muted/50 font-bold">
                            <tr>
                              <td colSpan={3} className="py-3 px-3 text-xs">Total ({reportData.invoices.length} invoices)</td>
                              <td className="py-3 px-3 text-xs text-right">₹{reportData.totalOriginal.toLocaleString('en-IN')}</td>
                              <td></td>
                              <td className="py-3 px-3 text-xs text-right text-warning">₹{reportData.totalDiscount.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-xs text-right">₹{reportData.totalSales.toLocaleString('en-IN')}</td>
                              <td></td>
                              <td className="py-3 px-3 text-center text-xs">{reportData.discountPercentage.toFixed(1)}%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">✅ No discounts given</p>
                        <p className="text-sm mt-2">All invoices were at full price during this period.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Purchase Register (ITC) - Inventory Tab */}
                {reportData && reportData.summary && reportData.purchases !== undefined && currentReportType === 'purchase-register' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-4">Expense Register (ITC - Input Tax Credit)</h2>
                    <p className="text-sm text-muted-foreground mb-2">
                      Period: {new Date(reportData.period.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period.endDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-destructive mb-6">📋 {reportData.complianceNote}</p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                      <div className="p-3 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
                        <p className="text-xl font-bold text-primary">{reportData.summary.totalPurchases}</p>
                      </div>
                      <div className="p-3 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Taxable Value</p>
                        <p className="text-lg font-bold text-blue-500">₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-green-500/5 border-2 border-green-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total ITC</p>
                        <p className="text-lg font-bold text-green-500">₹{reportData.summary.totalITC.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-green-600">Tax you can claim back</p>
                      </div>
                      <div className="p-3 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Paid</p>
                        <p className="text-lg font-bold text-success">₹{reportData.summary.totalPaid.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Due</p>
                        <p className="text-lg font-bold text-warning">₹{reportData.summary.totalDue.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* GST Breakdown */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">CGST</p>
                        <p className="text-lg font-bold text-green-600">₹{reportData.summary.totalCGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">SGST</p>
                        <p className="text-lg font-bold text-green-600">₹{reportData.summary.totalSGST.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">IGST</p>
                        <p className="text-lg font-bold text-green-600">₹{reportData.summary.totalIGST.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    {reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0 && (
                      <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">ITC by Category</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {reportData.categoryBreakdown.map((cat: any, idx: number) => (
                            <div key={idx} className="p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground">{cat.category}</p>
                              <p className="text-sm font-bold text-primary">{cat.count} bills</p>
                              <p className="text-xs text-green-600">ITC: ₹{cat.eligibleITC.toLocaleString('en-IN')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Purchase Table */}
                    {reportData.purchases && reportData.purchases.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-2 px-2 font-semibold">Date</th>
                              <th className="text-left py-2 px-2 font-semibold">Vendor</th>
                              <th className="text-left py-2 px-2 font-semibold">GSTIN</th>
                              <th className="text-left py-2 px-2 font-semibold">Bill No</th>
                              <th className="text-center py-2 px-2 font-semibold">Category</th>
                              <th className="text-left py-2 px-2 font-semibold">SAC/HSN</th>
                              <th className="text-right py-2 px-2 font-semibold">Taxable ₹</th>
                              <th className="text-right py-2 px-2 font-semibold">CGST</th>
                              <th className="text-right py-2 px-2 font-semibold">SGST</th>
                              <th className="text-right py-2 px-2 font-semibold">IGST</th>
                              <th className="text-right py-2 px-2 font-semibold">Total ITC</th>
                              <th className="text-center py-2 px-2 font-semibold">Eligible</th>
                              <th className="text-center py-2 px-2 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.purchases.map((purchase: any, index: number) => (
                              <tr key={index} className={cn("border-b border-border last:border-0 hover:bg-muted/50", purchase.itcEligible < 100 && "bg-red-50 dark:bg-red-900/10")}>
                                <td className="py-2 px-2">{new Date(purchase.invoiceDate).toLocaleDateString('en-IN')}</td>
                                <td className="py-2 px-2 max-w-[100px] truncate">{purchase.supplierName}</td>
                                <td className="py-2 px-2 font-mono text-muted-foreground">{purchase.supplierGSTIN}</td>
                                <td className="py-2 px-2 font-medium">{purchase.invoiceNumber}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[10px]">{purchase.category}</span>
                                </td>
                                <td className="py-2 px-2 font-mono">{purchase.hsnCode}</td>
                                <td className="py-2 px-2 text-right">₹{purchase.taxableValue.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-right text-green-600">₹{purchase.cgst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-right text-green-600">₹{purchase.sgst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-right text-green-600">₹{purchase.igst.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-right font-bold text-green-600">₹{purchase.totalITC.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", purchase.itcEligible === 100 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600')}>
                                    {purchase.itcEligible}%
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", purchase.paymentStatus === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                                    {purchase.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted/50 font-bold">
                            <tr>
                              <td colSpan={6} className="py-2 px-2">Total ({reportData.purchases.length} bills)</td>
                              <td className="py-2 px-2 text-right">₹{reportData.summary.totalTaxableValue.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2 text-right text-green-600">₹{reportData.summary.totalCGST.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2 text-right text-green-600">₹{reportData.summary.totalSGST.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2 text-right text-green-600">₹{reportData.summary.totalIGST.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2 text-right text-green-600">₹{reportData.summary.totalITC.toLocaleString('en-IN')}</td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No purchases found</p>
                        <p className="text-sm mt-2">No purchase invoices during this period.</p>
                      </div>
                    )}

                    {/* ITC Tips */}
                    <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <h4 className="font-bold text-green-700 dark:text-green-400 text-sm mb-2">💡 ITC Claim Tips</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Total ITC available: <strong className="text-green-600">₹{reportData.summary.totalITC.toLocaleString('en-IN')}</strong></li>
                        <li>• Use this in GSTR-3B to reduce your GST payment</li>
                        <li>• Ensure all supplier GSTINs are valid for ITC</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Business Tab */}
            {selectedTab === 'business' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'profit-loss', label: 'Profit & Loss', icon: TrendUp, description: 'P&L statement' },
                    { id: 'cash-flow', label: 'Cash Flow', icon: CurrencyCircleDollar, description: 'Cash movements' },
                    { id: 'balance-sheet', label: 'Balance Sheet', icon: FileText, description: 'Assets & liabilities' },
                    { id: 'trial-balance', label: 'Trial Balance', icon: FileText, description: 'Accounting balance' }
                  ].map((report) => (
                    <button
                      key={report.id}
                      onClick={() => loadReport(report.id)}
                      className={cn(
                        "flex items-start gap-3 p-4 bg-card rounded-lg transition-all text-left",
                        currentReportType === report.id
                          ? "border-2 border-primary bg-primary/5"
                          : "border border-border hover:border-primary"
                      )}
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <report.icon size={20} className="text-primary" weight="duotone" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{report.label}</p>
                        <p className="text-xs text-muted-foreground">{report.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Cash Flow Report */}
                {reportData && reportData.transactions && currentReportType === 'cash-flow' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Cash Flow Statement</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Period: {new Date(reportData.period?.startDate).toLocaleDateString('en-IN')} to {new Date(reportData.period?.endDate).toLocaleDateString('en-IN')}
                    </p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Opening Balance</p>
                        <p className="text-xl font-bold text-blue-600">₹{(reportData.openingBalance || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Inflow</p>
                        <p className="text-xl font-bold text-success">+₹{(reportData.totalInflow || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Outflow</p>
                        <p className="text-xl font-bold text-destructive">-₹{(reportData.totalOutflow || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Closing Balance</p>
                        <p className="text-xl font-bold text-primary">₹{(reportData.closingBalance || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    {reportData.categoryBreakdown && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Category Breakdown</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                          <div className="p-2 bg-success/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Marketplace Payouts</p>
                            <p className="text-sm font-bold text-success">₹{(reportData.categoryBreakdown.marketplacePayouts || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="p-2 bg-success/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Direct Fees</p>
                            <p className="text-sm font-bold text-success">₹{(reportData.categoryBreakdown.directSales || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="p-2 bg-destructive/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Vendor Payments</p>
                            <p className="text-sm font-bold text-destructive">₹{(reportData.categoryBreakdown.supplierPayments || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="p-2 bg-destructive/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                            <p className="text-sm font-bold text-destructive">₹{(reportData.categoryBreakdown.expenses || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="p-2 bg-warning/10 rounded">
                            <p className="text-xs text-muted-foreground mb-1">GST Payments</p>
                            <p className="text-sm font-bold text-warning">₹{(reportData.categoryBreakdown.gstPayments || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transactions Table */}
                    {reportData.transactions && reportData.transactions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Description</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold">Reference</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Amount</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.transactions.slice(0, 50).map((txn: any, i: number) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="py-3 px-4 text-sm">{new Date(txn.date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 px-4 text-sm">
                                  <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                    txn.amount >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                                    {txn.type === 'marketplace_payout' ? 'Payout' :
                                     txn.type === 'sale_receipt' ? 'Receipt' :
                                     txn.type === 'purchase_payment' ? 'Payment' :
                                     txn.type === 'gst_payment' ? 'GST' : 'Expense'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm">{txn.description}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{txn.reference}</td>
                                <td className={cn("py-3 px-4 text-sm text-right font-medium",
                                  txn.amount >= 0 ? 'text-success' : 'text-destructive')}>
                                  {txn.amount >= 0 ? '+' : ''}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-bold">
                                  ₹{(txn.runningBalance || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No transactions found</p>
                        <p className="text-sm mt-2">No cash movements in this period.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Balance Sheet Report */}
                {reportData && reportData.assets && currentReportType === 'balance-sheet' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Balance Sheet</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      As on: {new Date(reportData.asOfDate).toLocaleDateString('en-IN')}
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Assets Section */}
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-primary border-b pb-2">ASSETS</h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-success/5 rounded-lg">
                            <div>
                              <p className="font-medium">Cash & Bank</p>
                              <p className="text-xs text-muted-foreground">Today's closing balance</p>
                            </div>
                            <p className="text-lg font-bold text-success">₹{(reportData.assets.cashAndBank || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-blue-500/5 rounded-lg">
                            <div>
                              <p className="font-medium">Course Capacity</p>
                              <p className="text-xs text-muted-foreground">Current stock valuation</p>
                            </div>
                            <p className="text-lg font-bold text-blue-600">₹{(reportData.assets.inventory || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-warning/5 rounded-lg">
                            <div>
                              <p className="font-medium">Receivables</p>
                              <p className="text-xs text-muted-foreground">Money owed by customers</p>
                            </div>
                            <p className="text-lg font-bold text-warning">₹{(reportData.assets.receivables || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">Other Assets</p>
                              <p className="text-xs text-muted-foreground">Deposits, advance tax, etc.</p>
                            </div>
                            <p className="text-lg font-bold">₹{(reportData.assets.otherAssets || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                            <p className="font-bold text-lg">Total Assets</p>
                            <p className="text-2xl font-bold text-primary">₹{(reportData.assets.totalAssets || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Liabilities + Capital Section */}
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-destructive border-b pb-2">LIABILITIES</h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-destructive/5 rounded-lg">
                            <div>
                              <p className="font-medium">GST Payable</p>
                              <p className="text-xs text-muted-foreground">Output GST - ITC - GST Paid</p>
                            </div>
                            <p className="text-lg font-bold text-destructive">₹{(reportData.liabilities.gstPayable || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-orange-500/5 rounded-lg">
                            <div>
                              <p className="font-medium">Vendors Payable</p>
                              <p className="text-xs text-muted-foreground">Unpaid purchase bills</p>
                            </div>
                            <p className="text-lg font-bold text-orange-600">₹{(reportData.liabilities.suppliersPayable || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">Loans Outstanding</p>
                              <p className="text-xs text-muted-foreground">Business loans, credit cards</p>
                            </div>
                            <p className="text-lg font-bold">₹{(reportData.liabilities.loansOutstanding || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                            <p className="font-semibold">Total Liabilities</p>
                            <p className="text-lg font-bold text-destructive">₹{(reportData.liabilities.totalLiabilities || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-accent border-b pb-2 mt-6">OWNER'S CAPITAL</h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                            <div>
                              <p className="font-medium">Capital Invested</p>
                              <p className="text-xs text-muted-foreground">Initial business capital</p>
                            </div>
                            <p className="text-lg font-bold text-accent">₹{(reportData.ownersCapital?.capitalInvested || 0).toLocaleString('en-IN')}</p>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-success/5 rounded-lg">
                            <div>
                              <p className="font-medium">Retained Earnings</p>
                              <p className="text-xs text-muted-foreground">Current year profit</p>
                            </div>
                            <p className={cn("text-lg font-bold", (reportData.ownersCapital?.retainedEarnings || 0) >= 0 ? 'text-success' : 'text-destructive')}>
                              ₹{(reportData.ownersCapital?.retainedEarnings || 0).toLocaleString('en-IN')}
                            </p>
                          </div>

                          <div className="flex justify-between items-center p-4 bg-accent/10 rounded-lg border-2 border-accent/30">
                            <p className="font-bold text-lg">Total Capital</p>
                            <p className="text-2xl font-bold text-accent">₹{(reportData.ownersCapital?.total || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Balance Verification */}
                    <div className={cn("mt-6 p-4 rounded-lg border-2",
                      reportData.isBalanced ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30")}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{reportData.isBalanced ? '✅' : '⚠️'}</span>
                        <div>
                          <p className={cn("font-bold", reportData.isBalanced ? "text-success" : "text-destructive")}>
                            {reportData.isBalanced ? 'Balance Sheet is Balanced' : 'Balance Sheet Mismatch'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Assets (₹{(reportData.assets.totalAssets || 0).toLocaleString('en-IN')}) =
                            Liabilities (₹{(reportData.liabilities.totalLiabilities || 0).toLocaleString('en-IN')}) +
                            Capital (₹{(reportData.ownersCapital?.total || 0).toLocaleString('en-IN')})
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trial Balance Report */}
                {reportData && reportData.accounts && currentReportType === 'trial-balance' && (
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-lg font-bold mb-2">Trial Balance</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      As on: {new Date(reportData.asOfDate).toLocaleDateString('en-IN')}
                    </p>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-success/5 border-2 border-success/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Debit</p>
                        <p className="text-xl font-bold text-success">₹{(reportData.totalDebit || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Credit</p>
                        <p className="text-xl font-bold text-destructive">₹{(reportData.totalCredit || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-warning/5 border-2 border-warning/20 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Difference</p>
                        <p className="text-xl font-bold text-warning">₹{(reportData.difference || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className={cn("p-4 rounded-xl border-2",
                        reportData.balanced ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20")}>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <p className={cn("text-xl font-bold", reportData.balanced ? "text-success" : "text-destructive")}>
                          {reportData.balanced ? '✓ Balanced' : '✗ Unbalanced'}
                        </p>
                      </div>
                    </div>

                    {/* Account Type Summary */}
                    {reportData.summary && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h3 className="font-semibold text-sm mb-3">Account Summary</h3>
                        <div className="grid grid-cols-5 gap-3 text-center">
                          <div className="p-2 bg-blue-500/10 rounded">
                            <p className="text-xs text-muted-foreground">Assets</p>
                            <p className="text-lg font-bold text-blue-600">{reportData.summary.assetAccounts}</p>
                          </div>
                          <div className="p-2 bg-destructive/10 rounded">
                            <p className="text-xs text-muted-foreground">Liabilities</p>
                            <p className="text-lg font-bold text-destructive">{reportData.summary.liabilityAccounts}</p>
                          </div>
                          <div className="p-2 bg-success/10 rounded">
                            <p className="text-xs text-muted-foreground">Income</p>
                            <p className="text-lg font-bold text-success">{reportData.summary.incomeAccounts}</p>
                          </div>
                          <div className="p-2 bg-warning/10 rounded">
                            <p className="text-xs text-muted-foreground">Expenses</p>
                            <p className="text-lg font-bold text-warning">{reportData.summary.expenseAccounts}</p>
                          </div>
                          <div className="p-2 bg-accent/10 rounded">
                            <p className="text-xs text-muted-foreground">Capital</p>
                            <p className="text-lg font-bold text-accent">{reportData.summary.capitalAccounts}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ledger Accounts Table */}
                    {reportData.accounts && reportData.accounts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-3 px-4 text-sm font-semibold">Ledger Name</th>
                              <th className="text-center py-3 px-4 text-sm font-semibold">Type</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Debit ₹</th>
                              <th className="text-right py-3 px-4 text-sm font-semibold">Credit ₹</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.accounts.map((acc: any, i: number) => (
                              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                                <td className="py-3 px-4 text-sm font-medium">{acc.accountName}</td>
                                <td className="py-3 px-4 text-sm text-center">
                                  <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                    acc.accountType === 'asset' ? 'bg-blue-500/10 text-blue-600' :
                                    acc.accountType === 'liability' ? 'bg-destructive/10 text-destructive' :
                                    acc.accountType === 'income' ? 'bg-success/10 text-success' :
                                    acc.accountType === 'expense' ? 'bg-warning/10 text-warning' :
                                    'bg-accent/10 text-accent')}>
                                    {acc.accountType.charAt(0).toUpperCase() + acc.accountType.slice(1)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-medium">
                                  {acc.debit > 0 ? `₹${acc.debit.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="py-3 px-4 text-sm text-right font-medium">
                                  {acc.credit > 0 ? `₹${acc.credit.toLocaleString('en-IN')}` : '-'}
                                </td>
                              </tr>
                            ))}
                            {/* Totals Row */}
                            <tr className="border-t-2 border-border bg-muted/50 font-bold">
                              <td className="py-4 px-4 text-base" colSpan={2}>Total</td>
                              <td className="py-4 px-4 text-base text-right text-success">₹{(reportData.totalDebit || 0).toLocaleString('en-IN')}</td>
                              <td className="py-4 px-4 text-base text-right text-destructive">₹{(reportData.totalCredit || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">No accounts found</p>
                        <p className="text-sm mt-2">Start adding transactions to see your trial balance.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      )}
      </div>
    </div>
  )
}

export default ReportsNew

