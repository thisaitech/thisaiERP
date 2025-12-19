import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { getInvoices } from '../services/invoiceService'
import { getExpenses } from '../services/expenseService'
import { getParties } from '../services/partyService'
import { getItems } from '../services/itemService'
import { getBankingPageData } from '../services/bankingService'
import {
  TrendUp,
  TrendDown,
  Receipt,
  ShoppingCart,
  Wallet,
  Users,
  Package,
  ArrowRight,
  WarningCircle,
  ChartLine,
  Plus,
  FileText,
  Calculator,
  UserPlus,
  X,
  Phone,
  Scan,
  ChatCircleText,
  Share,
  Trophy,
  Fire,
  Clock,
  ArrowsClockwise,
  Gear,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { getLowStockItems } from '../utils/stockUtils'

type WeeklyOverviewEntry = {
  day: string
  sales: number
  purchases: number
}

const buildDefaultWeeklyData = (): WeeklyOverviewEntry[] => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      sales: 0,
      purchases: 0
    }
  })
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { userData } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)
  const [greeting, setGreeting] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Real metrics state
  const [realMetrics, setRealMetrics] = useState({
    sales: { today: 0, yesterday: 0, week: 0, month: 0, allTime: 0, invoices: 0, growth: 0 },
    purchases: { today: 0, yesterday: 0, week: 0, month: 0, allTime: 0, bills: 0, growth: 0 },
    expenses: { today: 0, week: 0, month: 0, allTime: 0, custom: 0 },
    receivables: 0,
    payables: 0,
    inventory: { value: 0, items: 0, lowStock: 0 },
    cashInHand: 0
  })
  const [lowStockDetails, setLowStockDetails] = useState<any[]>([])
  const [weeklyOverviewData, setWeeklyOverviewData] = useState<WeeklyOverviewEntry[]>(buildDefaultWeeklyData())
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])

  // Gamification state
  const [todayInvoices, setTodayInvoices] = useState(0)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [levelProgress, setLevelProgress] = useState(0)

  // Set greeting based on time - with translation support
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting(language === 'ta' ? 'காலை வணக்கம்' : 'Good Morning')
    else if (hour < 17) setGreeting(language === 'ta' ? 'மதிய வணக்கம்' : 'Good Afternoon')
    else setGreeting(language === 'ta' ? 'மாலை வணக்கம்' : 'Good Evening')
  }, [language])

  // Fetch real data from Firebase
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Get date ranges
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Determine chart range based on selectedPeriod: for weekly overview we prefer a 7-day window.
      let chartStart = new Date(today)
      // If user has chosen 'this-week', compute Monday as week start so Monday shows correct totals
      if (selectedPeriod === 'week' || selectedPeriod === 'this-week') {
        // JS getDay(): 0 = Sunday, 1 = Monday, ... We want Monday as start.
        const day = today.getDay()
        const mondayOffset = (day + 6) % 7 // 0 for Monday, 6 for Sunday
        chartStart.setDate(today.getDate() - mondayOffset)
      } else {
        // default to last 7 days (including today)
        chartStart.setDate(chartStart.getDate() - 6)
      }
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Define weekStart for metrics (align with chartStart)
      const weekStart = new Date(chartStart)

      // Robust date extraction helper - check multiple possible timestamp fields and normalize to YYYY-MM-DD
      const getDateKeyFromRecord = (rec: any) => {
        const candidates = [rec.invoiceDate, rec.date, rec.billDate, rec.purchaseDate, rec.createdAt, rec.created_at]
        for (const c of candidates) {
          if (!c) continue
          const d = new Date(c)
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
          try {
            const d2 = new Date(String(c).replace(' ', 'T'))
            if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0]
          } catch (_) {}
        }
        return ''
      }

      const todayStr = today.toISOString().split('T')[0]
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const monthStartStr = monthStart.toISOString().split('T')[0]

      // Fetch all data in parallel
      const [salesInvoices, purchaseInvoices, expenses, parties, items, bankingData] = await Promise.all([
        getInvoices('sale'),
        getInvoices('purchase'),
        getExpenses(),
        getParties(),
        getItems(),
        getBankingPageData()
      ])

      // Calculate sales metrics - use total first, fallback to grandTotal
      const todaySales = salesInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= todayStr
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const yesterdaySales = salesInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= yesterdayStr && dk < todayStr
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const weekSales = salesInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= weekStartStr
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const monthSales = salesInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= monthStartStr
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      // All-time totals
      const allTimeSales = salesInvoices
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const todaySalesCount = salesInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= todayStr
        }).length

      // Calculate purchase metrics
      const todayPurchases = purchaseInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= todayStr
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const yesterdayPurchases = purchaseInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= yesterdayStr && dk < todayStr
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const weekPurchases = purchaseInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= weekStartStr
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const monthPurchases = purchaseInvoices
        .filter((inv: any) => {
          const dk = getDateKeyFromRecord(inv)
          return dk && dk >= monthStartStr
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const allTimePurchases = purchaseInvoices
        .reduce((sum: number, inv: any) => sum + (inv.total || inv.grandTotal || 0), 0)

      const chartDates = Array.from({ length: 7 }, (_, idx) => {
        const date = new Date(chartStart)
        date.setDate(chartStart.getDate() + idx)
        return date
      })

      

      const salesByDate = salesInvoices.reduce<Record<string, number>>((acc, inv) => {
        const dateKey = getDateKeyFromRecord(inv)
        if (!dateKey) return acc
        acc[dateKey] = (acc[dateKey] || 0) + (inv.total || inv.grandTotal || 0)
        return acc
      }, {})

      const purchaseByDate = purchaseInvoices.reduce<Record<string, number>>((acc, inv) => {
        const dateKey = getDateKeyFromRecord(inv)
        if (!dateKey) return acc
        acc[dateKey] = (acc[dateKey] || 0) + (inv.total || inv.grandTotal || 0)
        return acc
      }, {})

      setWeeklyOverviewData(chartDates.map((date) => {
        const dateKey = date.toISOString().split('T')[0]
        return {
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          sales: salesByDate[dateKey] || 0,
          purchases: purchaseByDate[dateKey] || 0
        }
      }))

      // Calculate expenses - use date string comparison for reliability
      console.log('📊 Dashboard: Expenses fetched:', expenses.length, 'Today:', todayStr)
      expenses.forEach((exp: any) => console.log('  - Expense:', exp.date, exp.amount))

      const todayExpenses = expenses
        .filter((exp: any) => {
          const expDate = (exp.date || exp.createdAt || '').split('T')[0]
          return expDate >= todayStr
        })
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)

      const weekExpenses = expenses
        .filter((exp: any) => {
          const expDate = (exp.date || exp.createdAt || '').split('T')[0]
          return expDate >= weekStartStr
        })
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)

      const monthExpenses = expenses
        .filter((exp: any) => {
          const expDate = (exp.date || exp.createdAt || '').split('T')[0]
          return expDate >= monthStartStr
        })
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)

      const allTimeExpenses = expenses
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)

      console.log('📊 Dashboard Expenses: Today:', todayExpenses, 'Week:', weekExpenses, 'Month:', monthExpenses, 'All:', allTimeExpenses)

      // Calculate receivables - same logic as Sales page PENDING calculation
      // Filter invoices where total > paidAmount (unpaid balance exists)
      const receivables = salesInvoices
        .filter((inv: any) => (inv.total || inv.grandTotal || 0) > (inv.paidAmount || 0))
        .reduce((sum: number, inv: any) => {
          const total = inv.total || inv.grandTotal || 0
          const paid = inv.paidAmount || 0
          return sum + (total - paid)
        }, 0)

      // Calculate payables - same logic for purchases
      const payables = purchaseInvoices
        .filter((inv: any) => (inv.total || inv.grandTotal || 0) > (inv.paidAmount || 0))
        .reduce((sum: number, inv: any) => {
          const total = inv.total || inv.grandTotal || 0
          const paid = inv.paidAmount || 0
          return sum + (total - paid)
        }, 0)

      // Calculate inventory metrics
      const inventoryValue = items.reduce((sum: number, item: any) =>
        sum + ((item.stock || 0) * (item.purchasePrice || item.salePrice || 0)), 0)
      const lowStockItemsList = getLowStockItems(items)
      setLowStockDetails(lowStockItemsList)

      // Get cash in hand balance from banking data
      const cashInHandBalance = bankingData?.cashInHand?.balance || 0

      // Calculate growth percentages
      const salesGrowth = yesterdaySales > 0
        ? ((todaySales - yesterdaySales) / yesterdaySales * 100)
        : (todaySales > 0 ? 100 : 0)

      const purchaseGrowth = yesterdayPurchases > 0
        ? ((todayPurchases - yesterdayPurchases) / yesterdayPurchases * 100)
        : (todayPurchases > 0 ? 100 : 0)

      setRealMetrics({
        sales: {
          today: todaySales,
          yesterday: yesterdaySales,
          week: weekSales,
          month: monthSales,
          allTime: allTimeSales,
          invoices: salesInvoices.length,
          growth: Math.round(salesGrowth * 10) / 10
        },
        purchases: {
          today: todayPurchases,
          yesterday: yesterdayPurchases,
          week: weekPurchases,
          month: monthPurchases,
          allTime: allTimePurchases,
          bills: purchaseInvoices.length,
          growth: Math.round(purchaseGrowth * 10) / 10
        },
        expenses: {
          today: todayExpenses,
          week: weekExpenses,
          month: monthExpenses,
          allTime: allTimeExpenses
        },
        receivables,
        payables,
        inventory: {
          value: inventoryValue,
          items: items.length,
          lowStock: lowStockItemsList.length
        },
        cashInHand: cashInHandBalance
      })

      // Update gamification
      setTodayInvoices(todaySalesCount)
      setLevelProgress(Math.min(100, todaySalesCount * 10))
      setCurrentLevel(Math.floor(salesInvoices.length / 50) + 1)

      // Build recent transactions from real data
      const allTransactions: any[] = []

      // Add sales invoices
      salesInvoices.forEach((inv: any) => {
        allTransactions.push({
          id: inv.id || inv.invoiceNumber,
          type: 'sale',
          party: inv.partyName || inv.customerName || 'Unknown Customer',
          amount: inv.total || inv.grandTotal || 0,
          status: (inv.paidAmount || 0) >= (inv.total || inv.grandTotal || 0) ? 'paid' :
                  (inv.paidAmount || 0) > 0 ? 'partial' : 'pending',
          date: inv.invoiceDate || inv.date || inv.createdAt,
          timestamp: new Date(inv.invoiceDate || inv.date || inv.createdAt).getTime(),
          icon: Receipt
        })
      })

      // Add purchase invoices
      purchaseInvoices.forEach((inv: any) => {
        allTransactions.push({
          id: inv.id || inv.billNumber,
          type: 'purchase',
          party: inv.partyName || inv.supplierName || 'Unknown Supplier',
          amount: inv.total || inv.grandTotal || 0,
          status: (inv.paidAmount || 0) >= (inv.total || inv.grandTotal || 0) ? 'paid' :
                  (inv.paidAmount || 0) > 0 ? 'partial' : 'pending',
          date: inv.billDate || inv.purchaseDate || inv.date || inv.createdAt,
          timestamp: new Date(inv.billDate || inv.purchaseDate || inv.date || inv.createdAt).getTime(),
          icon: ShoppingCart
        })
      })

      // Add expenses
      expenses.forEach((exp: any) => {
        allTransactions.push({
          id: exp.id,
          type: 'expense',
          party: exp.category || exp.description || 'Expense',
          amount: exp.amount || 0,
          status: 'paid',
          date: exp.date || exp.createdAt,
          timestamp: new Date(exp.date || exp.createdAt).getTime(),
          icon: Calculator
        })
      })

      // Sort by timestamp (most recent first) and take top 10
      const sortedTransactions = allTransactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10)
        .map(tx => {
          // Format date relative to now
          const txDate = new Date(tx.timestamp)
          const now = new Date()
          const diffMs = now.getTime() - txDate.getTime()
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

          let dateText = ''
          if (diffHours < 1) {
            const diffMins = Math.floor(diffMs / (1000 * 60))
            dateText = diffMins < 1 ? 'Just now' : `${diffMins}m ago`
          } else if (diffHours < 24) {
            dateText = `${diffHours}h ago`
          } else if (diffDays === 1) {
            dateText = 'Yesterday'
          } else if (diffDays < 7) {
            dateText = `${diffDays}d ago`
          } else {
            dateText = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }

          return {
            ...tx,
            date: dateText
          }
        })

      setRecentTransactions(sortedTransactions)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    const handleInventoryEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ items?: any[] }>).detail
      if (!detail?.items) return
      const updatedLowStock = getLowStockItems(detail.items)
      setLowStockDetails(updatedLowStock)
      setRealMetrics(prev => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          lowStock: updatedLowStock.length
        }
      }))
    }

    window.addEventListener('inventory:items-updated', handleInventoryEvent as EventListener)
    return () => {
      window.removeEventListener('inventory:items-updated', handleInventoryEvent as EventListener)
    }
  }, [])

  // Listen for sync / invoice / purchase events so dashboard updates in near-real-time
  useEffect(() => {
    const triggerRefresh = () => {
      // Small debounce to avoid rapid repeated calls
      if ((window as any).__dashboardRefreshTimeout) clearTimeout((window as any).__dashboardRefreshTimeout)
      ;(window as any).__dashboardRefreshTimeout = setTimeout(() => {
        fetchDashboardData()
      }, 250)
    }

    // Events emitted by offline sync service and other modules
    window.addEventListener('sync-queue-updated', triggerRefresh)
    window.addEventListener('invoice-synced', triggerRefresh)
    window.addEventListener('purchase-synced', triggerRefresh)
    window.addEventListener('expense-synced', triggerRefresh)
    window.addEventListener('offline-settings-changed', triggerRefresh)

    // Also listen for storage changes (other tabs) that might affect invoices/purchases
    const storageHandler = (ev: StorageEvent) => {
      if (!ev.key) return
      if (ev.key.includes('banking') || ev.key.includes('invoices') || ev.key.includes('purchases') || ev.key.includes('expenses')) {
        triggerRefresh()
      }
    }
    window.addEventListener('storage', storageHandler)

    return () => {
      window.removeEventListener('sync-queue-updated', triggerRefresh)
      window.removeEventListener('invoice-synced', triggerRefresh)
      window.removeEventListener('purchase-synced', triggerRefresh)
      window.removeEventListener('expense-synced', triggerRefresh)
      window.removeEventListener('offline-settings-changed', triggerRefresh)
      window.removeEventListener('storage', storageHandler)
      if ((window as any).__dashboardRefreshTimeout) clearTimeout((window as any).__dashboardRefreshTimeout)
    }
  }, [fetchDashboardData])

  // Comprehensive metrics - now using real data from Firebase
  // Use allTime for main display since month data may be empty at start of month
  const profitToday = realMetrics.sales.today - realMetrics.purchases.today - realMetrics.expenses.today
  const profitWeek = realMetrics.sales.week - realMetrics.purchases.week - (realMetrics.expenses.week || 0)
  const profitMonth = realMetrics.sales.month - realMetrics.purchases.month - realMetrics.expenses.month
  const profitAllTime = (realMetrics.sales.allTime || 0) - (realMetrics.purchases.allTime || 0) - (realMetrics.expenses.allTime || 0)
  const profitMargin = (realMetrics.sales.allTime || 0) > 0 ? (profitAllTime / realMetrics.sales.allTime * 100) : 0

  // Helper to get value based on selected period
  const getValueByPeriod = (metricObj: any, expenseObj?: any) => {
    switch (selectedPeriod) {
      case 'today': return metricObj.today || 0
      case 'week': return metricObj.week || 0
      case 'month': return metricObj.month || 0
      case 'year': return metricObj.allTime || 0
      case 'all': return metricObj.allTime || 0
      case 'custom': return metricObj.custom || metricObj.allTime || 0
      default: return metricObj.today || 0
    }
  }

  const getExpenseByPeriod = () => {
    switch (selectedPeriod) {
      case 'today': return realMetrics.expenses.today || 0
      case 'week': return realMetrics.expenses.week || 0
      case 'month': return realMetrics.expenses.month || 0
      case 'year': return realMetrics.expenses.allTime || 0
      case 'all': return realMetrics.expenses.allTime || 0
      case 'custom': return realMetrics.expenses.custom || realMetrics.expenses.allTime || 0
      default: return realMetrics.expenses.today || 0
    }
  }

  const getProfitByPeriod = () => {
    switch (selectedPeriod) {
      case 'today': return profitToday
      case 'week': return profitWeek
      case 'month': return profitMonth
      case 'year': return profitAllTime
      case 'all': return profitAllTime
      case 'custom': return profitAllTime // For custom, use allTime as fallback
      default: return profitToday
    }
  }

  // Get period label for display
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'year': return 'This Year'
      case 'all': return 'All Time'
      case 'custom': return `${customDateRange.startDate} - ${customDateRange.endDate}`
      default: return 'Today'
    }
  }

  const metrics = {
    sales: {
      today: realMetrics.sales.today,
      yesterday: realMetrics.sales.yesterday,
      week: realMetrics.sales.week,
      month: realMetrics.sales.month,
      allTime: realMetrics.sales.allTime || 0,
      year: realMetrics.sales.month * 12, // Approximate yearly
      growth: realMetrics.sales.growth,
      invoices: realMetrics.sales.invoices,
      cashPercent: 60, // TODO: Calculate from payment modes
      creditPercent: 40
    },
    purchases: {
      today: realMetrics.purchases.today,
      yesterday: realMetrics.purchases.yesterday,
      week: realMetrics.purchases.week,
      month: realMetrics.purchases.month,
      allTime: realMetrics.purchases.allTime || 0,
      year: realMetrics.purchases.month * 12,
      growth: realMetrics.purchases.growth,
      bills: realMetrics.purchases.bills
    },
    profit: {
      today: profitToday,
      yesterday: realMetrics.sales.yesterday - realMetrics.purchases.yesterday,
      week: realMetrics.sales.week - realMetrics.purchases.week,
      allTime: profitAllTime,
      month: realMetrics.sales.month - realMetrics.purchases.month - realMetrics.expenses.month,
      year: profitAllTime, // Use allTime as best estimate
      margin: Math.round(profitMargin * 100) / 100,
      growth: realMetrics.sales.growth // Approximate
    },
    cash: {
      today: realMetrics.sales.today,
      week: realMetrics.sales.week,
      month: realMetrics.sales.month,
      allTime: realMetrics.sales.allTime || 0,
      year: realMetrics.sales.month * 12,
      inHand: realMetrics.cashInHand,
      bank: 0
    },
    receivables: realMetrics.receivables,
    payables: realMetrics.payables,
    inventory: realMetrics.inventory
  }

  const weeklyMaxValue = Math.max(
    1,
    ...weeklyOverviewData.map(entry => Math.max(entry.sales, entry.purchases))
  )

  const lowStockCount = lowStockDetails.length
  const lowStockMessage = lowStockCount > 0
    ? `${lowStockCount} ${lowStockCount === 1 ? 'item needs' : 'items need'} reorder soon`
    : 'Inventory levels are stable'
  const lowStockAction = lowStockCount > 0 ? 'View Items' : 'Browse Inventory'
  const lowStockLink = lowStockCount > 0 ? '/inventory?filter=low-stock' : '/inventory'
  const lowStockPriority = lowStockCount > 0 ? 'medium' : 'low'

  const smartAlerts = [
    {
      id: 1,
      type: 'action',
      priority: 'high',
      icon: Phone,
      title: 'Call Rajesh Kumar',
      message: '₹15K payment overdue by 3 days',
      action: 'Call Now',
      link: 'tel:+919876543210',
      color: 'red'
    },
    {
      id: 2,
      type: 'warning',
      priority: lowStockPriority,
      icon: WarningCircle,
      title: 'Low Stock Alert',
      message: lowStockMessage,
      action: lowStockAction,
      link: lowStockLink,
      color: 'orange'
    },
    {
      id: 3,
      type: 'info',
      priority: 'low',
      icon: ChartLine,
      title: 'GST-3B Due',
      message: 'Due in 3 days (₹0 liability)',
      action: 'View',
      link: '/reports',
      color: 'blue'
    }
  ]

  const periods = [
    { id: 'today', label: t.common.today },
    { id: 'week', label: t.common.week },
    { id: 'month', label: t.common.month },
    { id: 'year', label: t.common.year }
  ]

  // Auto-rotate alerts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAlertIndex((prev) => (prev + 1) % smartAlerts.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [smartAlerts.length])

  // ==================== MOBILE DASHBOARD (Neumorphic Soft UI Design) ====================
  const MobileDashboard = () => {
    return (
      <div className="p-4 bg-[#e4ebf5] dark:bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{greeting}, {userData?.firstName || 'User'}!</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back.</p>
          </div>
          <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <span>Settings</span>
          </button>
        </div>
        {/* Period Filter - Neumorphic */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2">
            {periods.map((period) => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200",
                  selectedPeriod === period.id
                    ? "bg-blue-600 text-white shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff]"
                    : "text-slate-600 dark:text-slate-300 bg-[#e4ebf5] dark:bg-slate-800 shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#c5ccd6,inset_-2px_-2px_4px_#ffffff]"
                )}
              >
                {period.label}
              </button>
            ))}
        </div>

        <motion.div
          className="grid grid-cols-2 gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {[
            { label: 'Sales', value: getValueByPeriod(metrics.sales), growth: metrics.sales.growth, route: '/sales', icon: TrendUp, gradient: 'from-emerald-600 to-emerald-800', bgGradient: 'from-emerald-700/90 to-emerald-900/90' },
            { label: 'Purchases', value: getValueByPeriod(metrics.purchases), growth: metrics.purchases.growth, route: '/purchases', icon: ShoppingCart, gradient: 'from-rose-600 to-rose-900', bgGradient: 'from-rose-700/90 to-rose-900/90' },
            { label: 'Expenses', value: getExpenseByPeriod(), growth: null, route: '/expenses', icon: Wallet, gradient: 'from-blue-600 to-blue-800', bgGradient: 'from-blue-700/90 to-blue-900/90' },
            { label: 'Profit', value: getProfitByPeriod(), growth: metrics.profit.growth, route: '/reports', icon: ChartLine, gradient: 'from-amber-500 to-yellow-700', bgGradient: 'from-amber-600/90 to-yellow-700/90' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              onClick={() => navigate(stat.route)}
              className={cn(
                "relative p-5 rounded-3xl cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                "border-2 border-white/20 backdrop-blur-sm",
                "shadow-[8px_8px_24px_rgba(0,0,0,0.3)]",
                "hover:shadow-[12px_12px_32px_rgba(0,0,0,0.4)]"
              )}
              style={{
                background: `linear-gradient(135deg, ${
                  stat.gradient.includes('emerald') ? '#047857, #065f46' :
                  stat.gradient.includes('rose') ? '#be123c, #881337' :
                  stat.gradient.includes('blue') ? '#1d4ed8, #1e3a8a' :
                  '#d97706, #a16207'
                })`
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/90">{stat.label}</p>
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                  <stat.icon size={20} weight="bold" className="text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {`₹${(stat.value / 1000).toLocaleString('en-IN', { maximumFractionDigits: stat.value === 0 ? 0 : 1 })}K`}
              </p>
              {stat.growth !== null ? (
                <p className="text-xs text-white/80">
                  {stat.growth >= 0 ? `+${stat.growth.toFixed(1)}%` : `${stat.growth.toFixed(1)}%`} vs yesterday
                </p>
              ) : (
                <p className="text-xs text-white/80">This period</p>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Weekly Chart - Neumorphic */}
        <div className="p-5 rounded-3xl bg-[#e4ebf5] dark:bg-slate-800 mt-5
          shadow-[8px_8px_16px_#c5ccd6,-8px_-8px_16px_#ffffff]
          dark:shadow-[8px_8px_16px_#1e293b,-8px_-8px_16px_#334155]">
          <div className="flex justify-between items-center mb-3">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Weekly Overview</p>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                <span className="text-slate-500 dark:text-slate-400">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500"></div>
                <span className="text-slate-500 dark:text-slate-400">Purchases</span>
              </div>
            </div>
          </div>
          <motion.div
            className="flex items-end justify-between gap-1 h-32"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {weeklyOverviewData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <motion.div
                    variants={{
                        hidden: { height: '4%', opacity: 0 },
                        visible: { height: `${Math.max((day.sales / weeklyMaxValue) * 100, 4)}%`, opacity: 1 },
                    }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="w-3.5 bg-gradient-to-t from-blue-400 to-blue-600 rounded-t-md"
                    title={`Sales: ₹${day.sales.toLocaleString()}`}
                  />
                  <motion.div
                    variants={{
                        hidden: { height: '4%', opacity: 0 },
                        visible: { height: `${Math.max((day.purchases / weeklyMaxValue) * 100, 4)}%`, opacity: 1 },
                    }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                    className="w-3.5 bg-gradient-to-t from-amber-300 to-amber-500 rounded-t-md"
                    title={`Purchases: ₹${day.purchases.toLocaleString()}`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400">{day.day}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Activity</p>
            <button onClick={() => navigate('/reports')} className="text-sm text-blue-600 dark:text-blue-400 font-semibold">View All</button>
          </div>
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
          >
            {recentTransactions.slice(0, 4).map((tx) => (
              <motion.div
                key={tx.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#e4ebf5] dark:bg-slate-800
                  shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]
                  dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]
                  transition-all duration-200"
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-[3px_3px_6px_#c5ccd6,-3px_-3px_6px_#ffffff]',
                    tx.type === 'sale' ? 'bg-green-100/80 dark:bg-green-900/50' :
                    tx.type === 'purchase' ? 'bg-red-100/80 dark:bg-red-900/50' :
                    'bg-yellow-100/80 dark:bg-yellow-900/50'
                )}>
                   <tx.icon size={20} className={cn(
                      tx.type === 'sale' ? 'text-green-600 dark:text-green-400' :
                      tx.type === 'purchase' ? 'text-red-600 dark:text-red-400' :
                      'text-yellow-600 dark:text-yellow-400'
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{tx.party}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tx.date}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-base font-bold',
                      tx.type === 'sale' ? 'text-green-600' :
                      tx.type === 'purchase' ? 'text-red-600' : 'text-yellow-600'
                  )}>
                    {tx.type === 'sale' ? '+' : '-'}&nbsp;₹{tx.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    )
  }

  // ==================== DESKTOP DASHBOARD (Neumorphic Soft UI Design) ====================
    const DesktopDashboard = () => (
      <div className="min-h-screen bg-[#e4ebf5] dark:bg-slate-900 p-8">
        <div className="max-w-screen-xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-100">{greeting}, {userData?.firstName || 'User'}!</h1>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Here's your business overview for {getPeriodLabel()}.</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Neumorphic Period Filter */}
              <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-[#e4ebf5] dark:bg-slate-800
                shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff] dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]">
                  {periods.map((period) => (
                    <button
                      key={period.id}
                      onClick={() => setSelectedPeriod(period.id)}
                      className={cn(
                        "px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300",
                        selectedPeriod === period.id
                          ? "bg-blue-600 text-white shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff,inset_2px_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_8px_#1e293b]"
                          : "text-slate-600 dark:text-slate-300 hover:bg-[#dce3ed] dark:hover:bg-slate-700"
                      )}
                    >
                      {period.label}
                    </button>
                  ))}
              </div>
              {/* Neumorphic Create Button */}
              <button
                  onClick={() => { localStorage.setItem('sales_viewMode', 'create'); navigate('/sales') }}
                  className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white font-semibold rounded-2xl
                    shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff,inset_0_1px_0_rgba(255,255,255,0.2)]
                    hover:shadow-[8px_8px_16px_#c5ccd6,-8px_-8px_16px_#ffffff,inset_0_1px_0_rgba(255,255,255,0.3)]
                    active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2)]
                    transition-all duration-200"
                >
                  <Plus size={20} weight="bold" />
                  <span>Create Invoice</span>
                </button>
            </div>
          </div>

          {/* Stats Cards - Colored Neumorphic Style (4 Cards) */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
          >
            {[
              { label: 'Sales', sublabel: 'vs yesterday', value: getValueByPeriod(metrics.sales), growth: metrics.sales.growth, route: '/sales', icon: TrendUp, color: 'green', borderColor: 'border-green-300', shadow: 'shadow-[10px_10px_20px_rgba(34,197,94,0.15),-10px_-10px_20px_#ffffff]', hoverShadow: 'hover:shadow-[14px_14px_28px_rgba(34,197,94,0.25),-14px_-14px_28px_#ffffff]' },
              { label: 'Purchases', sublabel: 'Total spend', value: getValueByPeriod(metrics.purchases), growth: metrics.purchases.growth, route: '/purchases', icon: ShoppingCart, color: 'red', borderColor: 'border-red-300', shadow: 'shadow-[10px_10px_20px_rgba(239,68,68,0.15),-10px_-10px_20px_#ffffff]', hoverShadow: 'hover:shadow-[14px_14px_28px_rgba(239,68,68,0.25),-14px_-14px_28px_#ffffff]' },
              { label: 'Expenses', sublabel: 'This period', value: getExpenseByPeriod(), growth: null, route: '/expenses', icon: Wallet, color: 'amber', borderColor: 'border-amber-300', shadow: 'shadow-[10px_10px_20px_rgba(245,158,11,0.15),-10px_-10px_20px_#ffffff]', hoverShadow: 'hover:shadow-[14px_14px_28px_rgba(245,158,11,0.25),-14px_-14px_28px_#ffffff]' },
              { label: 'Profit', sublabel: 'Net earnings', value: getProfitByPeriod(), growth: metrics.profit.growth, route: '/reports', icon: ChartLine, color: 'blue', borderColor: 'border-blue-300', shadow: 'shadow-[10px_10px_20px_rgba(59,130,246,0.15),-10px_-10px_20px_#ffffff]', hoverShadow: 'hover:shadow-[14px_14px_28px_rgba(59,130,246,0.25),-14px_-14px_28px_#ffffff]' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0 },
                }}
                onClick={() => navigate(stat.route)}
                className={cn(
                  "relative p-6 rounded-3xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group",
                  "bg-[#e4ebf5] dark:bg-slate-800",
                  "border-2",
                  stat.borderColor,
                  stat.shadow,
                  stat.hoverShadow,
                  "dark:border-opacity-30 dark:shadow-[10px_10px_20px_#1e293b,-10px_-10px_20px_#334155] dark:hover:shadow-[14px_14px_28px_#1e293b,-14px_-14px_28px_#334155]"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <p className={cn(
                    "text-sm font-medium",
                    stat.color === 'green' && 'text-green-700 dark:text-green-300',
                    stat.color === 'red' && 'text-red-700 dark:text-red-300',
                    stat.color === 'amber' && 'text-amber-700 dark:text-amber-300',
                    stat.color === 'blue' && 'text-blue-700 dark:text-blue-300',
                  )}>{stat.label}</p>
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    stat.color === 'green' && 'bg-green-100 shadow-[inset_3px_3px_6px_#b8e0c8,inset_-3px_-3px_6px_#ffffff]',
                    stat.color === 'red' && 'bg-red-100 shadow-[inset_3px_3px_6px_#f5c4c4,inset_-3px_-3px_6px_#ffffff]',
                    stat.color === 'amber' && 'bg-amber-100 shadow-[inset_3px_3px_6px_#f5e0b8,inset_-3px_-3px_6px_#ffffff]',
                    stat.color === 'blue' && 'bg-blue-100 shadow-[inset_3px_3px_6px_#b8d4f5,inset_-3px_-3px_6px_#ffffff]',
                  )}>
                    <stat.icon size={24} weight="bold" className={cn(
                      stat.color === 'green' && 'text-green-600 dark:text-green-400',
                      stat.color === 'red' && 'text-red-600 dark:text-red-400',
                      stat.color === 'amber' && 'text-amber-600 dark:text-amber-400',
                      stat.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                    )} />
                  </div>
                </div>
                <p className={cn(
                  "text-3xl font-bold mb-2",
                  stat.color === 'green' && 'text-green-600 dark:text-green-400',
                  stat.color === 'red' && 'text-red-600 dark:text-red-400',
                  stat.color === 'amber' && 'text-amber-600 dark:text-amber-400',
                  stat.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                )}>
                  {`₹${(stat.value / 1000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}K`}
                </p>
                {stat.growth !== null ? (
                  <p className={cn(
                    "text-sm font-medium",
                    stat.growth >= 0 ? 'text-green-600' : 'text-red-600',
                  )}>
                    {stat.growth >= 0 ? `+${stat.growth.toFixed(1)}%` : `${stat.growth.toFixed(1)}%`} {stat.sublabel}
                  </p>
                ) : (
                  <p className={cn(
                    "text-sm font-medium",
                    stat.color === 'green' && 'text-green-500',
                    stat.color === 'red' && 'text-red-500',
                    stat.color === 'amber' && 'text-amber-500',
                    stat.color === 'blue' && 'text-blue-500',
                  )}>{stat.sublabel}</p>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Shortcuts - Neumorphic Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-7 rounded-3xl bg-[#e4ebf5] dark:bg-slate-800
              shadow-[12px_12px_24px_#c5ccd6,-12px_-12px_24px_#ffffff]
              dark:shadow-[12px_12px_24px_#1e293b,-12px_-12px_24px_#334155]"
          >
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-100 mb-5">Quick Shortcuts</h2>
            <div className="flex flex-wrap gap-4">
              {/* Create Invoice - Primary Action */}
              <button
                onClick={() => { localStorage.setItem('sales_viewMode', 'create'); navigate('/sales') }}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-medium text-white
                  bg-blue-600
                  shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
                  dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]
                  hover:shadow-[8px_8px_16px_#c5ccd6,-8px_-8px_16px_#ffffff]
                  hover:bg-blue-700
                  active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2)]
                  transition-all duration-200"
              >
                <Receipt size={18} weight="bold" />
                Create Invoice
              </button>
              {/* Create Purchase */}
              <button
                onClick={() => { localStorage.setItem('purchases_viewMode', 'create'); navigate('/purchases') }}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-medium text-white
                  bg-emerald-600
                  shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
                  dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]
                  hover:shadow-[8px_8px_16px_#c5ccd6,-8px_-8px_16px_#ffffff]
                  hover:bg-emerald-700
                  active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2)]
                  transition-all duration-200"
              >
                <ShoppingCart size={18} weight="bold" />
                Create Purchase
              </button>
              {/* Scan QR Code */}
              <button
                onClick={() => toast('QR Scanner coming soon!', { icon: '📱' })}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-medium text-white
                  bg-violet-600
                  shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
                  dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]
                  hover:shadow-[8px_8px_16px_#c5ccd6,-8px_-8px_16px_#ffffff]
                  hover:bg-violet-700
                  active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2)]
                  transition-all duration-200"
              >
                <Scan size={18} weight="bold" />
                Scan QR Code
              </button>
              {/* Add Expense */}
              <button
                onClick={() => navigate('/expenses')}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-medium text-slate-600 dark:text-slate-200
                  bg-[#e4ebf5] dark:bg-slate-700
                  shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
                  dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]
                  hover:shadow-[8px_8px_16px_#c5ccd6,-8px_-8px_16px_#ffffff]
                  active:shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff]
                  transition-all duration-200"
              >
                <Wallet size={18} className="text-amber-500" />
                Add Expense
              </button>
              {/* Add Party */}
              <button
                onClick={() => navigate('/parties')}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-medium text-slate-600 dark:text-slate-200
                  bg-[#e4ebf5] dark:bg-slate-700
                  shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
                  dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]
                  hover:shadow-[8px_8px_16px_#c5ccd6,-8px_-8px_16px_#ffffff]
                  active:shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff]
                  transition-all duration-200"
              >
                <UserPlus size={18} className="text-slate-500" />
                Add Party
              </button>
              {/* Check Inventory */}
              <button
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-medium text-slate-600 dark:text-slate-200
                  bg-[#e4ebf5] dark:bg-slate-700
                  shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
                  dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]
                  hover:shadow-[8px_8px_16px_#c5ccd6,-8px_-8px_16px_#ffffff]
                  active:shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff]
                  transition-all duration-200"
              >
                <Package size={18} className="text-blue-500" />
                Check Inventory
              </button>
            </div>
          </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="col-span-3 lg:col-span-2 space-y-8">
            {/* Weekly Chart - Neumorphic */}
            <div className="p-7 rounded-3xl bg-[#e4ebf5] dark:bg-slate-800
              shadow-[12px_12px_24px_#c5ccd6,-12px_-12px_24px_#ffffff]
              dark:shadow-[12px_12px_24px_#1e293b,-12px_-12px_24px_#334155]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Weekly Overview</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                    <span className="text-slate-500 dark:text-slate-400">Sales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-300 to-amber-500"></div>
                    <span className="text-slate-500 dark:text-slate-400">Purchases</span>
                  </div>
                </div>
              </div>
              <motion.div
                className="flex items-end justify-between gap-2 h-64"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } },
                }}
              >
                {weeklyOverviewData.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      <motion.div
                        variants={{
                          hidden: { height: '2%', opacity: 0 },
                          visible: { height: `${Math.max((day.sales / weeklyMaxValue) * 100, 2)}%`, opacity: 1 },
                        }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="w-8 bg-gradient-to-t from-blue-400 to-blue-600 rounded-t-lg transition-all duration-300 group-hover:from-blue-500 group-hover:to-blue-700"
                        title={`Sales: ₹${day.sales.toLocaleString()}`}
                      />
                      <motion.div
                        variants={{
                          hidden: { height: '2%', opacity: 0 },
                          visible: { height: `${Math.max((day.purchases / weeklyMaxValue) * 100, 2)}%`, opacity: 1 },
                        }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                        className="w-8 bg-gradient-to-t from-amber-300 to-amber-500 rounded-t-lg transition-all duration-300 group-hover:from-amber-400 group-hover:to-amber-600"
                        title={`Purchases: ₹${day.purchases.toLocaleString()}`}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{day.day}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-3 lg:col-span-1 space-y-8">
            <div className="p-7 rounded-3xl bg-[#e4ebf5] dark:bg-slate-800
              shadow-[12px_12px_24px_#c5ccd6,-12px_-12px_24px_#ffffff]
              dark:shadow-[12px_12px_24px_#1e293b,-12px_-12px_24px_#334155]">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-100">Recent Activity</h2>
                <button onClick={() => navigate('/reports')} className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">View All</button>
              </div>
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.1 } },
                }}
              >
                {recentTransactions.slice(0, 5).map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0 },
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-[#e4ebf5] dark:bg-slate-700
                        shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff]
                        dark:shadow-[inset_4px_4px_8px_#1e293b,inset_-4px_-4px_8px_#334155]
                        transition-all duration-200"
                    >
                      <div className={cn('p-3 rounded-xl',
                        'shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff]',
                          transaction.type === 'sale' ? 'bg-green-100/80 dark:bg-green-900/50' :
                          transaction.type === 'purchase' ? 'bg-red-100/80 dark:bg-red-900/50' :
                          'bg-yellow-100/80 dark:bg-yellow-900/50'
                      )}>
                        <transaction.icon size={20} className={cn(
                            transaction.type === 'sale' ? 'text-green-600 dark:text-green-400' :
                            transaction.type === 'purchase' ? 'text-red-600 dark:text-red-400' :
                            'text-yellow-600 dark:text-yellow-400'
                        )} />
                      </div>
                      <div className="flex-grow">
                        <p className="text-base font-semibold text-slate-700 dark:text-slate-100">{transaction.party}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{transaction.date}</p>
                      </div>
                      <p className={cn('text-lg font-bold',
                        transaction.type === 'sale' ? 'text-green-600' :
                        transaction.type === 'purchase' ? 'text-red-600' : 'text-yellow-600'
                      )}>
                        {transaction.type === 'sale' ? '+' : '-'}&nbsp;₹{transaction.amount.toLocaleString('en-IN')}
                      </p>
                    </motion.div>
                  ))}
              </motion.div>
            </div>
          </div>
        </div>
        </div>
      </div>
    )

    return (
      <div className="min-h-screen bg-[#e4ebf5] dark:bg-slate-900">
        {/* Mobile Dashboard */}
        <div className="md:hidden">
          <MobileDashboard />
        </div>
        
        {/* Desktop Dashboard */}
        <div className="hidden md:block">
          <DesktopDashboard />
        </div>
      </div>
    )
  }
  
  export default Dashboard