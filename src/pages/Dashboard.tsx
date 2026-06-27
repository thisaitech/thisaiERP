import React, { useState, useEffect, useCallback } from 'react'
import PeriodFilterDropdown, { type PeriodFilterValue } from '../components/PeriodFilterDropdown'
import { useNavigate } from 'react-router-dom'
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
  ChartLine,
  Plus,
  FileText,
  Calculator,
  UserPlus,
  X,
  Scan,
  ChatCircleText,
  Share,
  Trophy,
  Fire,
  Clock,
  ArrowsClockwise,
  Bank,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { getLowStockItems } from '../utils/stockUtils'
import useIsMobileViewport from '../hooks/useIsMobileViewport'
import { formatStatAmount } from '../utils/formatStatAmount'

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

const toLocalDateKeyFromInput = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return ''
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const toLocalDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const formatAxisValue = (value: number) => {
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return String(Math.round(value))
}

type WeeklyOverviewChartProps = {
  data: WeeklyOverviewEntry[]
  height?: number
  compact?: boolean
  onDayClick?: (entry: WeeklyOverviewEntry) => void
}

const WeeklyOverviewChart = ({ data, height = 256, compact = false, onDayClick }: WeeklyOverviewChartProps) => {
  const chartId = compact ? 'compact' : 'desktop'
  const padding = { top: 12, right: 12, bottom: 32, left: compact ? 40 : 52 }
  const width = 700
  const innerHeight = height - padding.top - padding.bottom
  const innerWidth = width - padding.left - padding.right

  const maxRaw = Math.max(1, ...data.flatMap((d) => [d.sales, d.purchases]))
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxRaw)))
  const yMax = Math.max(magnitude, Math.ceil(maxRaw / magnitude) * magnitude)
  const yTickCount = 4

  const points = data.map((entry, i) => {
    const x = padding.left + (data.length <= 1 ? innerWidth / 2 : (i / (data.length - 1)) * innerWidth)
    const baseline = padding.top + innerHeight
    const ySales = baseline - (entry.sales / yMax) * innerHeight
    const yPurchases = baseline - (entry.purchases / yMax) * innerHeight
    return { ...entry, x, ySales, yPurchases, baseline }
  })

  const salesLine = points.map((p) => `${p.x},${p.ySales}`).join(' ')
  const spendingLine = points.map((p) => `${p.x},${p.yPurchases}`).join(' ')

  const areaPath = (key: 'ySales' | 'yPurchases') => {
    if (points.length === 0) return ''
    const baseline = padding.top + innerHeight
    return [
      `M ${points[0].x} ${baseline}`,
      ...points.map((p) => `L ${p.x} ${p[key]}`),
      `L ${points[points.length - 1].x} ${baseline}`,
      'Z',
    ].join(' ')
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`weeklyBlueFill-${chartId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`weeklyAmberFill-${chartId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {Array.from({ length: yTickCount + 1 }).map((_, i) => {
        const y = padding.top + (i / yTickCount) * innerHeight
        const value = yMax - (i / yTickCount) * yMax
        return (
          <g key={i}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700/70"
              strokeDasharray="5 5"
            />
            <text
              x={padding.left - 6}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-400 dark:fill-slate-500"
              fontSize={compact ? 9 : 10}
            >
              {formatAxisValue(value)}
            </text>
          </g>
        )
      })}

      <line
        x1={padding.left}
        y1={padding.top + innerHeight}
        x2={width - padding.right}
        y2={padding.top + innerHeight}
        stroke="currentColor"
        className="text-slate-300 dark:text-slate-600"
        strokeWidth={1}
      />

      <path d={areaPath('ySales')} fill={`url(#weeklyBlueFill-${chartId})`} />
      <path d={areaPath('yPurchases')} fill={`url(#weeklyAmberFill-${chartId})`} />

      <polyline
        points={salesLine}
        fill="none"
        stroke="#2563eb"
        strokeWidth={compact ? 2 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={spendingLine}
        fill="none"
        stroke="#d97706"
        strokeWidth={compact ? 2 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.ySales} r={compact ? 3.5 : 4.5} fill="#2563eb" stroke="#ffffff" strokeWidth={1.5} />
          <circle cx={p.x} cy={p.yPurchases} r={compact ? 3.5 : 4.5} fill="#d97706" stroke="#ffffff" strokeWidth={1.5} />
          <text
            x={p.x}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 cursor-pointer"
            fontSize={compact ? 10 : 12}
            fontWeight={500}
            onClick={() => onDayClick?.(p)}
          >
            {p.day}
          </text>
        </g>
      ))}
    </svg>
  )
}

const Dashboard = () => {
  const navigate = useNavigate()
  const isMobileViewport = useIsMobileViewport()
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilterValue>('today')
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

      // Robust date extraction helper - normalize to local YYYY-MM-DD
      const getDateKeyFromRecord = (rec: any) => {
        const candidates = [rec.invoiceDate, rec.date, rec.billDate, rec.purchaseDate, rec.createdAt, rec.created_at]
        for (const c of candidates) {
          const key = toLocalDateKeyFromInput(c)
          if (key) return key
        }
        return ''
      }

      // Prefer exact event timestamps (createdAt/updatedAt) for recent activity,
      // then fall back to date-only fields when time is unavailable.
      const getTimestampFromRecord = (rec: any, fallbackCandidates: any[] = []) => {
        const candidates = [
          rec?.createdAt,
          rec?.created_at,
          rec?.updatedAt,
          rec?.updated_at,
          ...fallbackCandidates
        ]

        for (const candidate of candidates) {
          if (candidate === null || candidate === undefined || candidate === '') continue

          if (typeof candidate === 'number' && Number.isFinite(candidate)) {
            return candidate
          }

          const raw = String(candidate).trim()
          if (!raw) continue

          // Handle YYYY-MM-DD values deterministically in local time.
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const [year, month, day] = raw.split('-').map(Number)
            return new Date(year, month - 1, day, 12, 0, 0, 0).getTime()
          }

          const parsed = new Date(raw).getTime()
          if (!Number.isNaN(parsed)) return parsed

          const reparsed = new Date(raw.replace(' ', 'T')).getTime()
          if (!Number.isNaN(reparsed)) return reparsed
        }

        return Date.now()
      }

      const todayStr = toLocalDateKey(today)
      const yesterdayStr = toLocalDateKey(yesterday)
      const weekStartStr = toLocalDateKey(weekStart)
      const monthStartStr = toLocalDateKey(monthStart)

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

      const spendingByDate = expenses.reduce<Record<string, number>>((acc, exp: any) => {
        const expDate = toLocalDateKeyFromInput(exp.date || exp.createdAt)
        if (!expDate) return acc
        acc[expDate] = (acc[expDate] || 0) + (exp.amount || 0)
        return acc
      }, {})

      setWeeklyOverviewData(chartDates.map((date) => {
        const dateKey = toLocalDateKey(date)
        return {
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          sales: salesByDate[dateKey] || 0,
          purchases: spendingByDate[dateKey] || 0
        }
      }))

      // Calculate expenses - use date string comparison for reliability
      const todayExpenses = expenses
        .filter((exp: any) => {
          const expDate = toLocalDateKeyFromInput(exp.date || exp.createdAt)
          return expDate >= todayStr
        })
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)

      const weekExpenses = expenses
        .filter((exp: any) => {
          const expDate = toLocalDateKeyFromInput(exp.date || exp.createdAt)
          return expDate >= weekStartStr
        })
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)

      const monthExpenses = expenses
        .filter((exp: any) => {
          const expDate = toLocalDateKeyFromInput(exp.date || exp.createdAt)
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
          party: inv.partyName || inv.customerName || 'Unknown Student',
          amount: inv.total || inv.grandTotal || 0,
          status: (inv.paidAmount || 0) >= (inv.total || inv.grandTotal || 0) ? 'paid' :
                  (inv.paidAmount || 0) > 0 ? 'partial' : 'pending',
          date: inv.createdAt || inv.updatedAt || inv.invoiceDate || inv.date,
          timestamp: getTimestampFromRecord(inv, [inv.invoiceDate, inv.date]),
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
          date: inv.createdAt || inv.updatedAt || inv.billDate || inv.purchaseDate || inv.date,
          timestamp: getTimestampFromRecord(inv, [inv.billDate, inv.purchaseDate, inv.date]),
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
          date: exp.createdAt || exp.date,
          timestamp: getTimestampFromRecord(exp, [exp.date]),
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

  const formatExactAmount = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    return Math.abs(safeValue).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  const periodFilter = (
    <PeriodFilterDropdown value={selectedPeriod} onChange={setSelectedPeriod} />
  )

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

  const handleWeeklyOverviewDayClick = (entry: WeeklyOverviewEntry) => {
    setSelectedPeriod('week')
    toast.info(
      `${entry.day}: Admissions \u20B9${formatExactAmount(entry.sales)} | Spending \u20B9${formatExactAmount(entry.purchases)}`
    )
  }

  // ==================== MOBILE DASHBOARD (Minimalist UI) ====================
  const MobileDashboard = () => {
    return (
      <div className="p-4 pb-28 bg-slate-50 dark:bg-slate-900 min-h-screen">
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
              Welcome ✨
            </h1>
            <div>
              {periodFilter}
            </div>
          </div>
        </div>

        {/* Stats Cards - Grid format */}
        <motion.div
          className="grid grid-cols-2 gap-3 min-w-0 mb-5"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {[
            { label: 'Admissions', value: getValueByPeriod(metrics.sales), route: '/sales', icon: TrendUp, accentColor: 'green' },
            { label: 'Spending', value: getExpenseByPeriod(), route: '/expenses', icon: Wallet, accentColor: 'amber' },
            { label: 'Profit', value: getProfitByPeriod(), route: '/reports', icon: ChartLine, accentColor: 'green' },
            { label: 'Bank Balance', value: metrics.cash.inHand, route: '/banking', icon: Bank, accentColor: 'blue', isBalance: true },
            { label: 'Course Value', value: metrics.inventory.value, route: '/inventory', icon: Package, accentColor: 'slate' },
          ].map((stat, i) => {
            const isNegative = stat.value < 0
            const displayValue = Math.abs(stat.value)
            const valueColor = stat.isBalance && isNegative ? 'text-red-600 dark:text-red-400' :
                              stat.accentColor === 'green' ? 'text-green-600 dark:text-green-400' :
                              stat.accentColor === 'red' ? 'text-red-600 dark:text-red-400' :
                              stat.accentColor === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                              stat.accentColor === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                              'text-slate-700 dark:text-slate-200'

            return (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                onClick={() => navigate(stat.route)}
                className={cn(
                  "relative min-w-0 p-3 rounded-xl cursor-pointer transition-all duration-200 active:scale-95",
                  "bg-white dark:bg-slate-800",
                  "border border-slate-200 dark:border-slate-700",
                  "shadow-sm",
                  stat.isBalance && isNegative && "border-l-4 border-l-red-500",
                  i === 4 && "col-span-2"
                )}
              >
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-70",
                  stat.accentColor === 'green' && 'bg-blue-500',
                  stat.accentColor === 'red' && 'bg-blue-500',
                  stat.accentColor === 'blue' && 'bg-blue-500',
                  stat.accentColor === 'amber' && 'bg-blue-500',
                  stat.accentColor === 'slate' && 'bg-slate-400 dark:bg-slate-600',
                  stat.isBalance && isNegative && 'bg-blue-500 opacity-100'
                )} />

                <div className="flex justify-between items-start mb-1 mt-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <stat.icon size={12} weight="bold" className={cn(
                      stat.accentColor === 'green' && 'text-green-600 dark:text-green-400',
                      stat.accentColor === 'red' && 'text-red-600 dark:text-red-400',
                      stat.accentColor === 'blue' && 'text-blue-600 dark:text-blue-400',
                      stat.accentColor === 'amber' && 'text-amber-600 dark:text-amber-400',
                      stat.accentColor === 'slate' && 'text-slate-600 dark:text-slate-400',
                      stat.isBalance && isNegative && 'text-red-600 dark:text-red-400'
                    )} />
                  </div>
                </div>
                <div className="erp-inline-stat-scroll mt-1">
                  <p className={cn("text-sm font-bold", valueColor)}>
                    {isNegative && '-'}{formatStatAmount(displayValue)}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Weekly Chart */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-5 shadow-sm">
          <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Weekly Overview</p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                <span className="text-slate-500 dark:text-slate-400">Admissions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500"></div>
                <span className="text-slate-500 dark:text-slate-400">Spending</span>
              </div>
            </div>
          </div>
          <div className="min-h-[200px] w-full">
            <WeeklyOverviewChart
              data={weeklyOverviewData}
              height={200}
              compact
              onDayClick={handleWeeklyOverviewDayClick}
            />
          </div>
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
            {recentTransactions.slice(0, 4).map((tx) => {
              const Icon = tx.icon;
              return (
              <motion.div
                key={tx.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200"
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                    tx.type === 'sale' ? 'bg-green-100/80 dark:bg-green-900/50' :
                    tx.type === 'purchase' ? 'bg-red-100/80 dark:bg-red-900/50' :
                    'bg-yellow-100/80 dark:bg-yellow-900/50'
                )}>
                   <Icon size={20} className={cn(
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
            )})}
          </motion.div>
        </div>
      </div>
    )
  }

  // ==================== DESKTOP DASHBOARD (Minimalist UI Design) ====================
    const DesktopDashboard = () => (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-6">
        <div className="w-full space-y-4">
          {/* Header Row */}
          <div className="flex justify-between items-center pb-1">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
              Welcome ✨
            </h1>
            <div>
              {periodFilter}
            </div>
          </div>

          {/* Stats Cards - Professional Neutral Style (6 Cards in a row) */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 min-w-0"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } },
            }}
          >
            {[
              { label: 'Admissions', value: getValueByPeriod(metrics.sales), route: '/sales', icon: TrendUp, accentColor: 'green' },
              { label: 'Spending', value: getExpenseByPeriod(), route: '/expenses', icon: Wallet, accentColor: 'amber' },
              { label: 'Profit', value: getProfitByPeriod(), route: '/reports', icon: ChartLine, accentColor: 'green' },
              { label: 'Bank Balance', value: metrics.cash.inHand, route: '/banking', icon: Bank, accentColor: 'blue', isBalance: true },
              { label: 'Course Value', value: metrics.inventory.value, route: '/inventory', icon: Package, accentColor: 'slate' },
            ].map((stat, i) => {
              const isNegative = stat.value < 0
              const displayValue = Math.abs(stat.value)
              const valueColor = stat.isBalance && isNegative ? 'text-red-600 dark:text-red-400' :
                                stat.accentColor === 'green' ? 'text-green-600 dark:text-green-400' :
                                stat.accentColor === 'red' ? 'text-red-600 dark:text-red-400' :
                                stat.accentColor === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                stat.accentColor === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                                'text-slate-700 dark:text-slate-200'

              return (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                onClick={() => navigate(stat.route)}
                className={cn(
                  "relative min-w-0 p-4 rounded-2xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 group",
                  "bg-white dark:bg-slate-800",
                  "border border-slate-200 dark:border-slate-700",
                  "shadow-[4px_4px_12px_rgba(0,0,0,0.06),-2px_-2px_8px_rgba(255,255,255,0.8)]",
                  "hover:shadow",
                  "dark:shadow-sm",
                  stat.isBalance && isNegative && "border-l-4 border-l-red-500"
                )}
              >
                {/* Accent line at top */}
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-70",
                  stat.accentColor === 'green' && 'bg-blue-500',
                  stat.accentColor === 'red' && 'bg-blue-500',
                  stat.accentColor === 'blue' && 'bg-blue-500',
                  stat.accentColor === 'amber' && 'bg-blue-500',
                  stat.accentColor === 'slate' && 'bg-slate-400 dark:bg-slate-600',
                  stat.isBalance && isNegative && 'bg-blue-500 opacity-100'
                )} />

                <div className="flex justify-between items-start mb-2 mt-1">
                  <p className="erp-inline-stat-label text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    "bg-slate-100 dark:bg-slate-700"
                  )}>
                    <stat.icon size={16} weight="bold" className={cn(
                      stat.accentColor === 'green' && 'text-green-600 dark:text-green-400',
                      stat.accentColor === 'red' && 'text-red-600 dark:text-red-400',
                      stat.accentColor === 'blue' && 'text-blue-600 dark:text-blue-400',
                      stat.accentColor === 'amber' && 'text-amber-600 dark:text-amber-400',
                      stat.accentColor === 'slate' && 'text-slate-600 dark:text-slate-400',
                      stat.isBalance && isNegative && 'text-red-600 dark:text-red-400'
                    )} />
                  </div>
                </div>
                <div className="erp-inline-stat-scroll">
                  <p className={cn("erp-inline-stat-value", valueColor)}>
                    {isNegative && '-'}{formatStatAmount(displayValue)}
                  </p>
                </div>
              </motion.div>
            )})}
          </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="col-span-3 lg:col-span-2 space-y-8">
            {/* Weekly Chart - Minimalist */}
            <div className="p-7 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Weekly Overview</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                    <span className="text-slate-500 dark:text-slate-400">Admissions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-300 to-amber-500"></div>
                    <span className="text-slate-500 dark:text-slate-400">Spending</span>
                  </div>
                </div>
              </div>
              <WeeklyOverviewChart
                data={weeklyOverviewData}
                height={256}
                onDayClick={handleWeeklyOverviewDayClick}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-3 lg:col-span-1 space-y-8">
            <div className="p-7 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
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
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800
                        border border-slate-200 dark:border-slate-700
                        shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className={cn('p-3 rounded-xl shadow-sm',
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
      <div className="erp-module-page p-0 bg-slate-50 dark:bg-slate-900">
        {isMobileViewport ? <MobileDashboard /> : <DesktopDashboard />}
      </div>
    )
  }
  
  export default Dashboard
