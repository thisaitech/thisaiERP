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
  ArrowLeft,
  WarningCircle,
  CurrencyCircleDollar,
  ChartLine,
  Sparkle,
  CaretRight,
  Plus,
  FileText,
  Money,
  ChartBar,
  Barcode,
  Calculator,
  UserPlus,
  Gift,
  Camera,
  X,
  Phone,
  WhatsappLogo,
  Robot,
  Lightning,
  CaretDown,
  CaretUp,
  Scan,
  ChatCircleText,
  Share,
  Trophy,
  Fire,
  Megaphone,
  GraduationCap,
  MagnifyingGlass,
  Bell,
  Gear,
  House,
  Star,
  Heart,
  CreditCard,
  Bank,
  Cube,
  Tag,
  Percent,
  ArrowsClockwise,
  Eye,
  Clock,
  CheckCircle,
  Circle
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { useAIAssistant } from '../contexts/AIAssistantContext'
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
  const { triggerAction } = useAIAssistant()
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const quickActionsRef = React.useRef<HTMLDivElement>(null)
  const [showAIAdvisor, setShowAIAdvisor] = useState(true)
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)
  const [showInsights, setShowInsights] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [greeting, setGreeting] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
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

    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [language])

  // Check if first time user
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeenOnboarding) {
      setTimeout(() => setShowOnboarding(true), 1000)
    }
  }, [])

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

  const topCustomers = [
    { name: 'Rajesh Kumar', sales: 125000, outstanding: 15000, trend: 'up', growth: 12, weeklyTrend: [10, 15, 12, 18, 25, 20, 30] },
    { name: 'Tech Solutions Ltd', sales: 98000, outstanding: 0, trend: 'up', growth: 25, weeklyTrend: [5, 8, 12, 15, 20, 22, 25] },
    { name: 'City Mall Store', sales: 87000, outstanding: 12000, trend: 'down', growth: -5, weeklyTrend: [20, 18, 15, 12, 10, 8, 5] },
    { name: 'Modern Retailers', sales: 76000, outstanding: 8500, trend: 'up', growth: 18, weeklyTrend: [8, 10, 12, 14, 16, 17, 18] }
  ]

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

  const fastMovingItems = [
    { name: 'Milk Packets', qty: 120, trend: '+15%' },
    { name: 'Bread Loaves', qty: 95, trend: '+8%' },
    { name: 'Rice 1kg', qty: 80, trend: '+12%' }
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

  const profitChange = metrics.profit.today - metrics.profit.yesterday
  const profitChangePercent = ((profitChange / metrics.profit.yesterday) * 100).toFixed(0)

  const badges = [
    { name: 'Speed Star', icon: Lightning, unlocked: todayInvoices >= 5, requirement: '5 invoices today', color: 'yellow' },
    { name: 'Pro Biller', icon: Trophy, unlocked: levelProgress >= 85, requirement: '85% progress', color: 'purple' },
    { name: 'Streak Master', icon: Fire, unlocked: true, requirement: '10 days streak', color: 'orange' }
  ]

  const referralCode = 'THIRUVIZHA500'

  const handleReferralShare = () => {
    const referralLink = `https://thisai-crm-silver.web.app/?ref=${referralCode}`
    const message = `Billing Pro saved me 2hrs/day with AI billing! Join free & get ₹500 credit: ${referralLink}`
    if (navigator.share) {
      navigator.share({ title: 'Join Billing Pro', text: message, url: referralLink }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }
    toast.success('Referral link copied!')
  }

  const handleWhatsAppBlast = () => {
    const message = '🎉 50% off on Milk today! Reply YES to order.\n\n- Billing Pro'
    toast.success('Preparing WhatsApp blast...')
    setTimeout(() => {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }, 1000)
  }

  const completeOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    setShowOnboarding(false)
    toast.success('Welcome to Billing Pro!')
  }

  // Mini Sparkline
  const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((val - min) / range) * 100
      return `${x},${y}`
    }).join(' ')
    return (
      <svg className="w-full h-6" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }

  // Pie Chart
  const MiniPieChart = ({ cashPercent, creditPercent }: { cashPercent: number; creditPercent: number }) => (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#10b981 0% ${cashPercent}%, #f59e0b ${cashPercent}% 100%)` }} />
        <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
          <span className="text-[8px] font-bold text-slate-700">{cashPercent}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 text-[9px]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-semibold text-slate-700">Cash {cashPercent}%</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="font-semibold text-slate-700">Credit {creditPercent}%</span></div>
      </div>
    </div>
  )

  // ==================== MOBILE PREMIUM DASHBOARD ====================
  const MobilePremiumDashboard = () => {
    return (
      <div className="min-h-[calc(100vh-110px)] bg-gradient-to-br from-slate-100 via-blue-50 to-slate-50 flex flex-col px-4 pt-3 pb-24">
        
        {/* AI Alert Banner - Professional Style */}
        <AnimatePresence>
          {showAIAdvisor && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="relative overflow-hidden mb-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentAlertIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="flex items-center gap-3 p-3"
                  onClick={() => navigate(smartAlerts[currentAlertIndex].link)}
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      smartAlerts[currentAlertIndex].color === 'red' ? "bg-red-100" :
                      smartAlerts[currentAlertIndex].color === 'orange' ? "bg-amber-100" :
                      smartAlerts[currentAlertIndex].color === 'blue' ? "bg-blue-100" :
                      "bg-violet-100"
                    )}
                  >
                    {React.createElement(smartAlerts[currentAlertIndex].icon, { 
                      size: 20, 
                      weight: 'duotone', 
                      className: cn(
                        smartAlerts[currentAlertIndex].color === 'red' ? "text-red-600" :
                        smartAlerts[currentAlertIndex].color === 'orange' ? "text-amber-600" :
                        smartAlerts[currentAlertIndex].color === 'blue' ? "text-blue-600" :
                        "text-violet-600"
                      )
                    })}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{smartAlerts[currentAlertIndex].title}</p>
                    <p className="text-xs text-slate-500 truncate">{smartAlerts[currentAlertIndex].message}</p>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold",
                      smartAlerts[currentAlertIndex].color === 'red' ? "bg-red-600 text-white" :
                      smartAlerts[currentAlertIndex].color === 'orange' ? "bg-amber-500 text-white" :
                      smartAlerts[currentAlertIndex].color === 'blue' ? "bg-blue-600 text-white" :
                      "bg-emerald-600 text-white"
                    )}
                  >
                    {smartAlerts[currentAlertIndex].action}
                  </motion.button>
                  <button onClick={(e) => { e.stopPropagation(); setShowAIAdvisor(false); }} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                    <X size={14} className="text-slate-400" />
                  </button>
                </motion.div>
              </AnimatePresence>
              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 pb-2">
                {smartAlerts.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      width: i === currentAlertIndex ? 16 : 6,
                      opacity: i === currentAlertIndex ? 1 : 0.5 
                    }}
                    className={cn(
                      "h-1.5 rounded-full transition-colors",
                      i === currentAlertIndex ? "bg-blue-500" : "bg-slate-300"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Period Filter - Prominent Bar */}
        <div className="bg-white rounded-xl p-2 shadow-md border-2 border-violet-100 mb-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'Week' },
              { key: 'month', label: 'Month' },
              { key: 'year', label: 'Year' },
              { key: 'all', label: 'All' },
              { key: 'custom', label: 'Custom' },
            ].map((period) => (
              <button
                key={period.key}
                onClick={() => {
                  setSelectedPeriod(period.key)
                  if (period.key === 'custom') {
                    setShowCustomDatePicker(true)
                  }
                }}
                className={cn(
                  "flex-1 min-w-[60px] px-3 py-2.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                  selectedPeriod === period.key
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-violet-50 hover:text-violet-600"
                )}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Custom Date Picker */}
          {selectedPeriod === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-slate-200"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">From:</label>
                  <input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">To:</label>
                  <input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <button
                  onClick={() => {
                    // Re-fetch data with custom date range
                    fetchDashboardData()
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Stats Grid - Professional Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Sales', value: getValueByPeriod(metrics.sales), color: 'blue', growth: metrics.sales.growth, route: '/sales', icon: Receipt },
            { label: 'Purchases', value: getValueByPeriod(metrics.purchases), color: 'amber', growth: metrics.purchases.growth, route: '/purchases', icon: ShoppingCart },
            { label: 'Expenses', value: getExpenseByPeriod(), color: 'rose', growth: 0, route: '/expenses', icon: Calculator },
            { label: 'Profit', value: getProfitByPeriod(), color: 'emerald', growth: metrics.profit.growth, route: '/reports', icon: TrendUp },
            { label: 'Balance', value: getValueByPeriod(metrics.sales) - getValueByPeriod(metrics.purchases), color: 'violet', route: '/banking', isLakh: true, icon: Wallet },
            { label: 'Receivable', value: metrics.receivables, color: 'cyan', route: '/parties', icon: Users },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(stat.route)}
              className={cn(
                "relative p-4 rounded-xl cursor-pointer bg-white border shadow-sm hover:shadow-md transition-all",
                stat.color === 'blue' ? "border-blue-200" :
                stat.color === 'amber' ? "border-amber-200" :
                stat.color === 'rose' ? "border-rose-200" :
                stat.color === 'emerald' ? "border-emerald-200" :
                stat.color === 'violet' ? "border-violet-200" :
                "border-cyan-200"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  stat.color === 'blue' ? "bg-blue-50" :
                  stat.color === 'amber' ? "bg-amber-50" :
                  stat.color === 'rose' ? "bg-rose-50" :
                  stat.color === 'emerald' ? "bg-emerald-50" :
                  stat.color === 'violet' ? "bg-violet-50" :
                  "bg-cyan-50"
                )}>
                  <stat.icon size={18} weight="duotone" className={cn(
                    stat.color === 'blue' ? "text-blue-600" :
                    stat.color === 'amber' ? "text-amber-600" :
                    stat.color === 'rose' ? "text-rose-600" :
                    stat.color === 'emerald' ? "text-emerald-600" :
                    stat.color === 'violet' ? "text-violet-600" :
                    "text-cyan-600"
                  )} />
                </div>
                {stat.growth && (
                  <div className={cn(
                    "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                    stat.growth > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {stat.growth > 0 ? <TrendUp size={10} /> : <TrendDown size={10} />}
                    {Math.abs(stat.growth)}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-0.5">
                {stat.isLakh ? `₹${(stat.value / 100000).toFixed(1)}L` : `₹${(stat.value / 1000).toFixed(0)}K`}
              </p>
              <p className={cn(
                "text-xs font-medium",
                stat.color === 'blue' ? "text-blue-600" :
                stat.color === 'amber' ? "text-amber-600" :
                stat.color === 'rose' ? "text-rose-600" :
                stat.color === 'emerald' ? "text-emerald-600" :
                stat.color === 'violet' ? "text-violet-600" :
                "text-cyan-600"
              )}>{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Weekly Chart - Professional Style */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-800">Weekly Overview</p>
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
                <div className="w-2 h-2 rounded-full bg-blue-500" />Sales
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
                <div className="w-2 h-2 rounded-full bg-amber-500" />Purchases
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-1 h-28">
            {weeklyOverviewData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5 h-20">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((day.sales / weeklyMaxValue) * 100, 4)}%` }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className="flex-1 max-w-[14px] bg-blue-500 rounded-t min-h-[3px]"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((day.purchases / weeklyMaxValue) * 100, 4)}%` }}
                    transition={{ delay: i * 0.05 + 0.05, duration: 0.4 }}
                    className="flex-1 max-w-[14px] bg-amber-400 rounded-t min-h-[3px]"
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-400">{day.day.charAt(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions - Professional Style */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-800">Recent Activity</p>
            <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
              View All <ArrowRight size={12} weight="bold" />
            </button>
          </div>
          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="p-6 rounded-xl bg-white border border-slate-200 text-center">
                <Clock size={32} weight="duotone" className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No recent transactions</p>
                <p className="text-[10px] text-slate-400 mt-1">Create your first sale or purchase</p>
              </div>
            ) : (
              recentTransactions.slice(0, 2).map((tx) => (
                <motion.div
                  key={tx.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(tx.type === 'sale' ? '/sales' : tx.type === 'purchase' ? '/purchases' : '/expenses')}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                    tx.type === 'sale' ? "bg-blue-50" : tx.type === 'purchase' ? "bg-amber-50" : "bg-rose-50"
                  )}>
                    <tx.icon size={18} weight="duotone" className={cn(
                      tx.type === 'sale' ? "text-blue-600" : tx.type === 'purchase' ? "text-amber-600" : "text-rose-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{tx.party}</p>
                    <p className="text-xs text-slate-500">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", tx.type === 'sale' ? "text-emerald-600" : "text-slate-600")}>
                      {tx.type === 'sale' ? '+' : '-'}₹{(tx.amount / 1000).toFixed(1)}K
                    </p>
                    <span className={cn(
                      "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                      tx.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                      tx.status === 'partial' ? "bg-blue-50 text-blue-600" :
                      "bg-amber-50 text-amber-600"
                    )}>{tx.status}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>
    )
  }

  // ==================== DESKTOP DASHBOARD (UNCHANGED) ====================
  const DesktopDashboard = () => (
    <div className="max-w-[1800px] mx-auto p-3 md:p-4 lg:p-6 pb-24 md:pb-20 lg:pb-8 space-y-3 md:space-y-4">
      {/* ONBOARDING WIZARD MODAL */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={completeOnboarding}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                    <GraduationCap size={32} weight="duotone" className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Welcome to Billing Pro!</h2>
                    <p className="text-sm text-slate-600">3-Step Setup • 2 Minutes</p>
                  </div>
                </div>
                <button onClick={completeOnboarding} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                  <X size={24} weight="bold" className="text-slate-600" />
                </button>
              </div>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  {['Shop Info', 'Invoice Demo', 'POS Demo'].map((step, index) => (
                    <div key={index} className={cn("flex items-center gap-2 text-xs font-bold", onboardingStep >= index ? "text-blue-600" : "text-slate-400")}>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", onboardingStep >= index ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500")}>{index + 1}</div>
                      <span className="hidden sm:inline">{step}</span>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((onboardingStep + 1) / 3) * 100}%` }} className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                </div>
              </div>
              <div className="mb-8">
                {onboardingStep === 0 && (
                  <div className="text-center py-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Add Your Shop Name</h3>
                    <input type="text" placeholder="e.g., My Store" className="w-full max-w-md mx-auto px-4 py-3 border-2 border-slate-300 rounded-lg text-center text-lg font-semibold focus:border-blue-500 focus:outline-none" />
                  </div>
                )}
                {onboardingStep === 1 && (
                  <div className="text-center py-8">
                    <div className="inline-flex p-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl mb-4"><Receipt size={64} weight="duotone" className="text-blue-600" /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Invoice Demo</h3>
                    <p className="text-slate-600 mb-4">Create professional invoices quickly and easily!</p>
                  </div>
                )}
                {onboardingStep === 2 && (
                  <div className="text-center py-8">
                    <div className="inline-flex p-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-2xl mb-4"><ShoppingCart size={64} weight="duotone" className="text-emerald-600" /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">POS Demo</h3>
                    <p className="text-slate-600 mb-4">Fast checkout with our Point of Sale system!</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => setOnboardingStep(Math.max(0, onboardingStep - 1))} disabled={onboardingStep === 0} className={cn("px-6 py-2 rounded-lg font-bold transition-all", onboardingStep === 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-700 hover:bg-slate-300")}>Back</button>
                <button onClick={() => { if (onboardingStep < 2) setOnboardingStep(onboardingStep + 1); else completeOnboarding(); }} className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-bold transition-all shadow-lg">{onboardingStep === 2 ? "Let's Start!" : 'Next'}</button>
              </div>
              <button onClick={completeOnboarding} className="w-full mt-4 text-sm text-slate-500 hover:text-slate-700 font-semibold">Skip & Explore</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI BUSINESS ADVISOR */}
      <AnimatePresence>
        {showAIAdvisor && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-xl shadow-sm border-2 border-orange-300 overflow-hidden">
            <div className="p-3 lg:p-4 flex items-start gap-2 lg:gap-3">
              <div className="p-1.5 lg:p-2 bg-orange-50 rounded-lg flex-shrink-0"><Robot size={20} weight="duotone" className="text-orange-600 lg:w-6 lg:h-6" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
                  <h3 className="text-xs lg:text-sm font-bold text-slate-800 flex items-center gap-1 lg:gap-1.5"><Sparkle size={12} weight="fill" className="text-orange-500 lg:w-3.5 lg:h-3.5" />AI Business Advisor</h3>
                  <span className="px-1.5 lg:px-2 py-0.5 bg-orange-100 rounded-full text-[7px] lg:text-[8px] font-bold text-orange-600 uppercase tracking-wide">Today</span>
                </div>
                <p className="text-slate-600 text-[10px] lg:text-xs font-semibold mb-1.5 lg:mb-2 leading-relaxed">Profit: <span className="font-black text-slate-800">₹{(profitChange / 1000).toFixed(1)}K</span> ({Number(profitChangePercent) > 0 ? '+' : ''}{profitChangePercent}% vs yesterday) • Low stock: {metrics.inventory.lowStock} items</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => navigate('/parties')} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all flex items-center gap-1 shadow-sm"><Phone size={12} weight="bold" />Call Customer</button>
                  <button onClick={() => navigate('/inventory')} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition-all flex items-center gap-1"><Package size={12} weight="bold" />View Stock</button>
                </div>
              </div>
              <button onClick={() => setShowAIAdvisor(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"><X size={16} weight="bold" className="text-slate-400" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI CARDS - Same style as Mobile */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Sales Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/sales')}
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-blue-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-blue-50">
              <Receipt size={20} weight="duotone" className="text-blue-600" />
            </div>
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              metrics.sales.growth > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {metrics.sales.growth > 0 ? <TrendUp size={10} /> : <TrendDown size={10} />}
              {Math.abs(metrics.sales.growth)}%
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mb-0.5">₹{(metrics.sales.month / 1000).toFixed(0)}K</p>
          <p className="text-xs font-medium text-blue-600">Sales</p>
        </motion.div>

        {/* Purchases Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => navigate('/purchases')}
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-amber-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-amber-50">
              <ShoppingCart size={20} weight="duotone" className="text-amber-600" />
            </div>
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              metrics.purchases.growth > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {metrics.purchases.growth > 0 ? <TrendUp size={10} /> : <TrendDown size={10} />}
              {Math.abs(metrics.purchases.growth)}%
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mb-0.5">₹{(metrics.purchases.month / 1000).toFixed(0)}K</p>
          <p className="text-xs font-medium text-amber-600">Purchases</p>
        </motion.div>

        {/* Expenses Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/expenses')}
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-rose-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-rose-50">
              <Calculator size={20} weight="duotone" className="text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mb-0.5">₹{(getExpenseByPeriod() / 1000).toFixed(0)}K</p>
          <p className="text-xs font-medium text-rose-600">Expenses</p>
        </motion.div>

        {/* Profit Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate('/reports')}
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-emerald-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-emerald-50">
              <TrendUp size={20} weight="duotone" className="text-emerald-600" />
            </div>
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              metrics.profit.growth > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {metrics.profit.growth > 0 ? <TrendUp size={10} /> : <TrendDown size={10} />}
              {Math.abs(metrics.profit.growth)}%
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mb-0.5">₹{(metrics.profit.month / 1000).toFixed(0)}K</p>
          <p className="text-xs font-medium text-emerald-600">Profit</p>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate('/banking')}
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-violet-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-violet-50">
              <Wallet size={20} weight="duotone" className="text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mb-0.5">₹{((metrics.sales.month - metrics.purchases.month) / 100000).toFixed(1)}L</p>
          <p className="text-xs font-medium text-violet-600">Balance</p>
        </motion.div>

        {/* Receivable Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => navigate('/parties')}
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-cyan-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 rounded-lg bg-cyan-50">
              <Users size={20} weight="duotone" className="text-cyan-600" />
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600">
              {metrics.receivables > 0 ? metrics.receivables : 0}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mb-0.5">₹{(realMetrics.receivables / 1000).toFixed(0)}K</p>
          <p className="text-xs font-medium text-cyan-600">Receivable</p>
        </motion.div>
      </div>

      {/* QUICK ACTION CARDS - Invoice & POS */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }} 
          onClick={() => { localStorage.setItem('sales_viewMode', 'create'); navigate('/sales') }} 
          whileTap={{ scale: 0.97 }} 
          className="bg-white rounded-xl shadow-sm hover:shadow-md border-2 border-orange-300 p-6 cursor-pointer transition-all flex flex-col items-center justify-center"
        >
          <div className="p-3 bg-orange-50 rounded-xl mb-3">
            <Receipt size={28} weight="duotone" className="text-orange-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Invoice</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 10 }} 
          animate={{ opacity: 1, x: 0 }} 
          onClick={() => navigate('/pos')} 
          whileTap={{ scale: 0.97 }} 
          className="bg-white rounded-xl shadow-sm hover:shadow-md border-2 border-violet-300 p-6 cursor-pointer transition-all flex flex-col items-center justify-center"
        >
          <div className="p-3 bg-violet-50 rounded-xl mb-3">
            <Barcode size={28} weight="duotone" className="text-violet-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">POS</h3>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
          <button onClick={() => navigate('/more')} className="text-xs font-semibold text-blue-600 flex items-center gap-1">See All <ArrowRight size={12} weight="bold" /></button>
        </div>
        <div ref={quickActionsRef} className="flex gap-2 overflow-x-auto scrollbar-hide p-3" style={{ scrollbarWidth: 'none' }}>
          {[
            { label: 'Invoice', icon: Receipt, color: 'bg-blue-500', route: '/sales?action=add' },
            { label: 'Purchase', icon: ShoppingCart, color: 'bg-orange-500', route: '/purchases?action=add' },
            { label: 'Quote', icon: FileText, color: 'bg-purple-500', route: '/quotations?action=add' },
            { label: 'Party', icon: UserPlus, color: 'bg-cyan-500', route: '/parties?action=add' },
            { label: 'Expense', icon: Calculator, color: 'bg-rose-500', route: '/expenses?action=add' },
            { label: 'Item', icon: Package, color: 'bg-violet-500', route: '/inventory?action=add' },
            { label: 'Pay In', icon: Money, color: 'bg-emerald-500', route: '/banking?action=payment-in' },
            { label: 'Pay Out', icon: Wallet, color: 'bg-red-500', route: '/banking?action=payment-out' }
          ].map((action, index) => (
            <motion.button key={index} whileTap={{ scale: 0.95 }} onClick={() => navigate(action.route)} className="flex-shrink-0 flex flex-col items-center gap-1.5 min-w-[56px]">
              <div className={`${action.color} p-2.5 rounded-xl shadow-sm`}><action.icon size={20} weight="fill" className="text-white" /></div>
              <span className="text-[10px] font-semibold text-slate-600">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
          <button onClick={() => navigate('/reports')} className="text-xs font-semibold text-blue-600 flex items-center gap-1">View All <ArrowRight size={12} weight="bold" /></button>
        </div>
        <div className="divide-y divide-slate-50">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock size={40} weight="duotone" className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No recent transactions</p>
              <p className="text-xs text-slate-400 mt-1">Create your first sale or purchase to see activity here</p>
            </div>
          ) : (
            recentTransactions.slice(0, 3).map((transaction) => (
              <div key={transaction.id} className="p-3 flex items-center gap-3 active:bg-slate-50 cursor-pointer" onClick={() => navigate(transaction.type === 'sale' ? '/sales' : transaction.type === 'purchase' ? '/purchases' : '/expenses')}>
                <div className={cn("p-2 rounded-lg",
                  transaction.type === 'sale' ? 'bg-blue-50' :
                  transaction.type === 'purchase' ? 'bg-orange-50' :
                  transaction.type === 'expense' ? 'bg-rose-50' : 'bg-emerald-50'
                )}>
                  <transaction.icon size={16} weight="duotone" className={cn(
                    transaction.type === 'sale' ? 'text-blue-600' :
                    transaction.type === 'purchase' ? 'text-orange-600' :
                    transaction.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{transaction.party}</p>
                  <p className="text-[10px] text-slate-500">{transaction.date}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", transaction.type === 'sale' ? 'text-emerald-600' : 'text-slate-700')}>
                    {transaction.type === 'sale' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                  </p>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                    transaction.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                    transaction.status === 'partial' ? 'bg-blue-50 text-blue-600' :
                    transaction.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  )}>{transaction.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-50">
      {/* Mobile Premium Dashboard */}
      <div className="md:hidden">
        <MobilePremiumDashboard />
      </div>
      
      {/* Desktop Dashboard (unchanged) */}
      <div className="hidden md:block">
        <DesktopDashboard />
      </div>
    </div>
  )
}

export default Dashboard
