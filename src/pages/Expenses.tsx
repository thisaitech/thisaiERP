import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Plus,
  Wallet,
  Receipt,
  Calendar,
  MagnifyingGlass,
  Trash,
  Eye,
  Download,
  TrendUp,
  TrendDown,
  CreditCard,
  Money,
  Bank,
  Briefcase,
  FunnelSimple,
  Spinner
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { getExpenses, createExpense, deleteExpense, Expense, generateExpenseNumber } from '../services/expenseService'
import { useErrorHandler } from '../hooks/useErrorHandler'

const Expenses = () => {
  // Language support
  const { t, language } = useLanguage()
  const { handleError } = useErrorHandler()
  const location = useLocation()

  const [showNewExpense, setShowNewExpense] = useState(false)

  // Handle action=new from sidebar navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const actionParam = params.get('action')
    if (actionParam === 'new') {
      setShowNewExpense(true)
    }
  }, [location.search])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // New expense form state
  const [newExpenseForm, setNewExpenseForm] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other' as Expense['category'],
    paymentMode: 'cash' as Expense['paymentMode'],
    description: '',
    status: 'paid' as Expense['status']
  })

  const categories = [
    { id: 'all', label: t.expenses?.all || 'All', icon: Wallet, color: 'primary' },
    { id: 'salary', label: t.expenses?.salary || 'Salary', icon: Money, color: 'success' },
    { id: 'rent', label: t.expenses?.rent || 'Rent', icon: Briefcase, color: 'warning' },
    { id: 'utilities', label: t.expenses?.utilities || 'Utilities', icon: CreditCard, color: 'accent' },
    { id: 'other', label: 'Other', icon: Bank, color: 'destructive' }
  ]

  // Fetch expenses from Firebase
  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getExpenses()
      setExpenses(data)
    } catch (error) {
      handleError(error, 'Expenses.fetchExpenses')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Calculate stats from real data
  const stats = React.useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)

    const thisMonthExpenses = expenses
      .filter(exp => new Date(exp.date) >= monthStart)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0)

    const lastMonthExpenses = expenses
      .filter(exp => {
        const d = new Date(exp.date)
        return d >= lastMonthStart && d <= lastMonthEnd
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0)

    const pendingExpenses = expenses
      .filter(exp => exp.status === 'pending')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0)

    const percentChange = lastMonthExpenses > 0
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100)
      : 0

    return {
      totalExpenses,
      thisMonth: thisMonthExpenses,
      pending: pendingExpenses,
      percentChange: Math.round(percentChange * 10) / 10
    }
  }, [expenses])

  const filteredExpenses = expenses.filter(expense =>
    (selectedCategory === 'all' || expense.category === selectedCategory) &&
    (searchQuery === '' ||
      (expense.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.expenseNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // Handle create expense
  const handleCreateExpense = async () => {
    if (!newExpenseForm.title || !newExpenseForm.amount) {
      toast.error('Please fill in title and amount')
      return
    }

    try {
      setIsSaving(true)
      const amountValue = parseFloat(newExpenseForm.amount)
      if (Number.isNaN(amountValue) || amountValue <= 0) {
        toast.error('Amount must be greater than 0')
        return
      }
      const expenseData = {
        expenseNumber: generateExpenseNumber(),
        date: newExpenseForm.date,
        category: newExpenseForm.category,
        amount: amountValue,
        paymentMode: newExpenseForm.paymentMode,
        description: newExpenseForm.title + (newExpenseForm.description ? ' - ' + newExpenseForm.description : ''),
        status: newExpenseForm.status,
        createdBy: 'current-user'
      }

      const createdExpense = await createExpense(expenseData)

      // Reduce Cash in Hand for cash expenses (Firebase real-time sync)
      if (createdExpense && expenseData.paymentMode === 'cash') {
        try {
          const { updateCashInHand, saveBankingPageTransactions, getBankingPageTransactions } = await import('../services/bankingService')

          // Reduce Cash in Hand (negative amount for deduction)
          await updateCashInHand(-expenseData.amount, `Expense ${expenseData.expenseNumber} - ${expenseData.description || 'Expense'}`)

          // Add transaction record to Firebase
          const transactions = await getBankingPageTransactions()
          transactions.unshift({
            id: `exp_txn_${Date.now()}`,
            type: 'debit' as const,
            description: `Expense ${expenseData.expenseNumber} - ${expenseData.description || 'Expense'}`,
            amount: expenseData.amount,
            date: expenseData.date,
            account: 'Cash in Hand'
          })
          await saveBankingPageTransactions(transactions)

          console.log('💰 Expense: Cash in Hand reduced by ₹', expenseData.amount, '(Firebase)')
        } catch (err) {
          handleError(err, 'Expenses.handleCreateExpense.updateCashInHand')
        }
      }

      toast.success('Expense added successfully')
      setShowNewExpense(false)
      setNewExpenseForm({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'other',
        paymentMode: 'cash',
        description: '',
        status: 'paid'
      })
      fetchExpenses()
    } catch (error) {
      handleError(error, 'Expenses.handleCreateExpense')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete expense
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      await deleteExpense(id)
      toast.success('Expense deleted')
      fetchExpenses()
    } catch (error) {
      handleError(error, 'Expenses.handleDeleteExpense')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="erp-module-page overflow-x-hidden flex flex-col max-w-[100vw] w-full px-4 py-3 min-h-screen">
      {/* Header - Clean & Simple like Parties */}
      <div className="flex-shrink-0">
        {/* Top Row: KPI Cards (Left) + Filters & Actions (Right) */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-2 md:gap-4 mb-3">
          {/* Left Side: KPI Cards - Rectangular filling space */}
          <div className="erp-legacy-kpi-grid flex-1 grid grid-cols-4 gap-1.5 md:gap-3">
            {/* Total Expenses Card - Red Theme */}
            <div className="erp-legacy-kpi-shell p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-red-400 to-rose-500 shadow-[6px_6px_12px_rgba(239,68,68,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(239,68,68,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button className="erp-legacy-kpi-button w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <Wallet size={20} weight="duotone" className="text-red-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-semibold">{t.expenses?.totalExpenses || 'Total'}</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                    ₹{stats.totalExpenses >= 10000000 ? (stats.totalExpenses / 10000000).toFixed(1) + ' Cr' : stats.totalExpenses >= 100000 ? (stats.totalExpenses / 100000).toFixed(1) + ' L' : stats.totalExpenses >= 1000 ? (stats.totalExpenses / 1000).toFixed(1) + ' K' : stats.totalExpenses.toLocaleString('en-IN')}
                  </span>
                </div>
              </button>
            </div>

            {/* This Month Card - Blue Theme */}
            <div className="erp-legacy-kpi-shell p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-500 shadow-[6px_6px_12px_rgba(59,130,246,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(59,130,246,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button className="erp-legacy-kpi-button w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <Calendar size={20} weight="duotone" className="text-blue-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">{t.expenses?.thisMonth || 'This Month'}</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    ₹{stats.thisMonth >= 10000000 ? (stats.thisMonth / 10000000).toFixed(1) + ' Cr' : stats.thisMonth >= 100000 ? (stats.thisMonth / 100000).toFixed(1) + ' L' : stats.thisMonth >= 1000 ? (stats.thisMonth / 1000).toFixed(1) + ' K' : stats.thisMonth.toLocaleString('en-IN')}
                  </span>
                </div>
              </button>
            </div>

            {/* Pending Card - Amber Theme */}
            <div className="erp-legacy-kpi-shell p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 shadow-[6px_6px_12px_rgba(245,158,11,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(245,158,11,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button className="erp-legacy-kpi-button w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <Receipt size={20} weight="duotone" className="text-amber-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent font-semibold">{t.common?.pending || 'Pending'}</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    ₹{stats.pending >= 10000000 ? (stats.pending / 10000000).toFixed(1) + ' Cr' : stats.pending >= 100000 ? (stats.pending / 100000).toFixed(1) + ' L' : stats.pending >= 1000 ? (stats.pending / 1000).toFixed(1) + ' K' : stats.pending.toLocaleString('en-IN')}
                  </span>
                </div>
              </button>
            </div>

            {/* Change Card - Green Theme */}
            <div className={cn(
              "erp-legacy-kpi-shell p-[1px] md:p-[2px] rounded-lg md:rounded-2xl transition-all",
              stats.percentChange >= 0
                ? "bg-gradient-to-r from-green-400 to-emerald-500 shadow-[6px_6px_12px_rgba(34,197,94,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(34,197,94,0.18),-8px_-8px_16px_#ffffff]"
                : "bg-gradient-to-r from-red-400 to-rose-500 shadow-[6px_6px_12px_rgba(239,68,68,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(239,68,68,0.18),-8px_-8px_16px_#ffffff]"
            )}>
              <button className="erp-legacy-kpi-button w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  {stats.percentChange >= 0 ?
                    <TrendUp size={20} weight="duotone" className="text-green-500" /> :
                    <TrendDown size={20} weight="duotone" className="text-red-500" />
                  }
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className={cn(
                    "text-[8px] md:text-xs font-semibold bg-clip-text text-transparent",
                    stats.percentChange >= 0 ? "bg-gradient-to-r from-green-600 to-emerald-600" : "bg-gradient-to-r from-red-600 to-rose-600"
                  )}>{t.expenses?.change || 'Change'}</span>
                  <span className={cn(
                    "text-xs md:text-xl font-bold bg-clip-text text-transparent",
                    stats.percentChange >= 0 ? "bg-gradient-to-r from-green-600 to-emerald-600" : "bg-gradient-to-r from-red-600 to-rose-600"
                  )}>
                    {stats.percentChange >= 0 ? '+' : ''}{stats.percentChange.toFixed(1)}%
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Right Side: Date Filters + Action Buttons */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Action Button */}
            <button
              onClick={() => setShowNewExpense(true)}
              className="erp-module-primary-btn"
            >
              <Plus size={14} weight="bold" />
              <span>Expense</span>
            </button>

            {/* Date Filter Tabs */}
            <div className="erp-module-filter-wrap">
              {['today', 'week', 'month', 'year', 'all', 'custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={cn('erp-module-filter-chip', selectedPeriod === period && 'is-active')}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {/* Search Bar & Category Filter Tabs Row */}
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="erp-module-panel flex-1 p-3">
              <div className="flex items-center gap-2">
                <MagnifyingGlass size={16} weight="bold" className="text-slate-400" />
                <input
                  type="text"
                  placeholder={t.expenses?.searchExpenses || 'Search expenses...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="erp-module-search-input flex-1"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex-shrink-0">
              <div className="erp-module-filter-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "erp-module-filter-chip flex items-center gap-1",
                      selectedCategory === cat.id
                        ? "is-active"
                        : "border border-slate-200 dark:border-slate-600"
                    )}
                  >
                    <cat.icon size={12} weight="duotone" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="mt-4">

        {/* Empty State */}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-slate-200">
            <Wallet size={40} weight="duotone" className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-2 text-sm">
              {expenses.length === 0 ? 'No expenses recorded yet' : 'No expenses match your search'}
            </p>
            <button
              onClick={() => setShowNewExpense(true)}
              className="text-blue-600 font-medium hover:underline text-sm"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Expense Cards - Only visible on mobile */}
            <div className="md:hidden space-y-2">
              {filteredExpenses.map((expense, index) => (
                <div
                  key={expense.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-3"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-slate-800 truncate">{expense.expenseNumber}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{expense.description}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ml-2 flex-shrink-0",
                      expense.status === 'paid'
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    )}>
                      {expense.status === 'paid' ? (t.common?.paid || 'Paid') : (t.common?.pending || 'Pending')}
                    </span>
                  </div>

                  {/* Details Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded font-medium text-slate-700">{expense.category}</span>
                    </div>
                    <span className="text-base font-bold text-slate-800">₹{expense.amount.toLocaleString()}</span>
                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <CreditCard size={12} />
                      {expense.paymentMode}
                    </span>
                    <button
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash size={14} weight="duotone" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="erp-module-table-header bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">{t.expenses?.date || 'Date'}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Expense #</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">{t.expenses?.category || 'Category'}</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">{t.expenses?.amount || 'Amount'}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">{t.common?.payment || 'Payment'}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">{t.common?.status || 'Status'}</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">{t.common?.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((expense, index) => (
                      <tr
                        key={expense.id}
                        className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm text-slate-800">{expense.expenseNumber}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-600">{expense.description || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-700">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-sm text-slate-800">
                            ₹{expense.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {expense.paymentMode}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                              expense.status === 'paid'
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            )}>
                              {expense.status === 'paid' ? (t.common?.paid || 'Paid') : (t.common?.pending || 'Pending')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="p-1.5 hover:bg-red-50 rounded transition-colors text-red-600"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Trash size={16} weight="duotone" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

      {/* New Expense Modal */}
      <AnimatePresence>
        {showNewExpense && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewExpense(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewExpense(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
              >
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">{t.expenses?.addNewExpense || 'Add New Expense'}</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">{t.expenses?.expenseTitle || 'Title'}</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm sm:text-base bg-background"
                    placeholder={t.expenses?.enterTitle || 'Enter title'}
                    value={newExpenseForm.title}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 sm:mb-2">{t.expenses?.amount || 'Amount'}</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm sm:text-base bg-background"
                      placeholder="₹ 0"
                      value={newExpenseForm.amount}
                      onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 sm:mb-2">{t.expenses?.date || 'Date'}</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm sm:text-base bg-background"
                      value={newExpenseForm.date}
                      onChange={(e) => setNewExpenseForm({ ...newExpenseForm, date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">{t.expenses?.category || 'Category'}</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm sm:text-base bg-background"
                    value={newExpenseForm.category}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value as Expense['category'] })}
                  >
                    <option value="rent">Rent</option>
                    <option value="salary">Salary</option>
                    <option value="utilities">Utilities</option>
                    <option value="marketing">Marketing</option>
                    <option value="office_supplies">Office Supplies</option>
                    <option value="travel">Travel</option>
                    <option value="food">Food</option>
                    <option value="internet">Internet</option>
                    <option value="software">Software</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">{t.expenses?.paymentMode || 'Payment Mode'}</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm sm:text-base bg-background"
                    value={newExpenseForm.paymentMode}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, paymentMode: e.target.value as Expense['paymentMode'] })}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm sm:text-base bg-background"
                    value={newExpenseForm.status}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, status: e.target.value as Expense['status'] })}
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">{t.expenses?.description || 'Description'}</label>
                  <textarea
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm sm:text-base bg-background"
                    rows={3}
                    placeholder={t.expenses?.addDetails || 'Add details...'}
                    value={newExpenseForm.description}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                  ></textarea>
                </div>
                <div className="flex gap-2 pt-3 sm:pt-4">
                  <button
                    onClick={handleCreateExpense}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving && <Spinner size={16} className="animate-spin" />}
                    {t.expenses?.saveExpense || 'Save Expense'}
                  </button>
                  <button
                    onClick={() => setShowNewExpense(false)}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80"
                  >
                    {t.common?.cancel || 'Cancel'}
                  </button>
                </div>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Expenses

