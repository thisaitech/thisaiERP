import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Plus,
  Wallet,
  Receipt,
  MagnifyingGlass,
  Trash,
  Eye,
  Pencil,
  Download,
  TrendUp,
  TrendDown,
  CreditCard,
  Money,
  Bank,
  Briefcase,
  FunnelSimple,
  Spinner,
  X
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { getExpenses, createExpense, updateExpense, deleteExpense, Expense, generateExpenseNumber } from '../services/expenseService'
import { useErrorHandler } from '../hooks/useErrorHandler'
import PeriodFilterDropdown, { type PeriodFilterValue } from '../components/PeriodFilterDropdown'
import { formatStatAmount } from '../utils/formatStatAmount'
import MobileListCard from '../components/mobile/MobileListCard'
import MobileActionMenu from '../components/mobile/MobileActionMenu'

function getExpenseDisplayName(expense: Expense): string {
  const description = (expense.description || '').trim()
  if (!description) return 'Expense'
  const dashIndex = description.indexOf(' - ')
  if (dashIndex > 0) return description.slice(0, dashIndex).trim()
  return description
}

function formatExpenseDate(value: string | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString('en-IN')
}

function getExpenseStatusMeta(expense: Expense, paidLabel: string, pendingLabel: string) {
  if (expense.status === 'paid') {
    return { label: paidLabel, className: 'bg-emerald-100 text-emerald-700' }
  }
  if (expense.status === 'reimbursed') {
    return { label: 'Reimbursed', className: 'bg-blue-100 text-blue-700' }
  }
  return { label: pendingLabel, className: 'bg-amber-100 text-amber-700' }
}

const Expenses = () => {
  // Language support
  const { t, language } = useLanguage()
  const { handleError } = useErrorHandler()
  const location = useLocation()

  const [showNewExpense, setShowNewExpense] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)

  // Handle action=new from sidebar navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const actionParam = params.get('action')
    if (actionParam === 'new') {
      setShowNewExpense(true)
    }
  }, [location.search])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilterValue>('all')
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

  const formatExpenseAmount = formatStatAmount

  const periodFilteredExpenses = React.useMemo(() => expenses.filter((expense) => {
    if (selectedPeriod === 'all') return true

    const expenseDate = new Date(expense.date)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    if (selectedPeriod === 'today') {
      return expenseDate >= startOfToday
    }

    if (selectedPeriod === 'week') {
      const weekAgo = new Date(startOfToday)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return expenseDate >= weekAgo
    }

    if (selectedPeriod === 'month') {
      const monthStart = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1)
      return expenseDate >= monthStart
    }

    if (selectedPeriod === 'year') {
      const yearAgo = new Date(startOfToday)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      return expenseDate >= yearAgo
    }

    return true
  }), [expenses, selectedPeriod])

  const stats = React.useMemo(() => {
    const sumAmount = (rows: Expense[]) => rows.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    const paidExpenses = periodFilteredExpenses.filter(
      (exp) => exp.status === 'paid' || exp.status === 'reimbursed'
    )
    const pendingExpenses = periodFilteredExpenses.filter((exp) => exp.status === 'pending')

    return {
      totalExpenses: sumAmount(periodFilteredExpenses),
      paidExpenses: sumAmount(paidExpenses),
      pendingExpenses: sumAmount(pendingExpenses),
    }
  }, [periodFilteredExpenses])

  const matchesExpenseCategory = (expense: Expense, category: string) => {
    if (category === 'all') return true
    if (category === 'rent') return expense.category === 'rent'
    if (category === 'salary') return expense.category === 'salary'
    if (category === 'other') return expense.category !== 'rent' && expense.category !== 'salary'
    return expense.category === category
  }

  const categoryTabs = [
    { id: 'all', label: t.expenses?.all || 'All', count: periodFilteredExpenses.length },
    { id: 'rent', label: t.expenses?.rent || 'Rent', count: periodFilteredExpenses.filter((exp) => exp.category === 'rent').length },
    { id: 'salary', label: t.expenses?.salary || 'Salary', count: periodFilteredExpenses.filter((exp) => exp.category === 'salary').length },
    {
      id: 'other',
      label: 'Other',
      count: periodFilteredExpenses.filter((exp) => exp.category !== 'rent' && exp.category !== 'salary').length,
    },
  ]

  const filteredExpenses = periodFilteredExpenses.filter(expense =>
    matchesExpenseCategory(expense, selectedCategory) &&
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
        expenseNumber: editingId ? undefined as any : generateExpenseNumber(),
        date: newExpenseForm.date,
        category: newExpenseForm.category,
        amount: amountValue,
        paymentMode: newExpenseForm.paymentMode,
        description: newExpenseForm.title + (newExpenseForm.description ? ' - ' + newExpenseForm.description : ''),
        status: newExpenseForm.status,
        createdBy: 'current-user'
      }

      if (editingId) {
        const { expenseNumber, ...updatePayload } = expenseData
        await updateExpense(editingId, updatePayload)
        toast.success('Expense updated successfully')
        setShowNewExpense(false)
        setEditingId(null)
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
        return
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

  // Open the form in create mode (reset any edit state)
  const openNewExpense = () => {
    setEditingId(null)
    setNewExpenseForm({
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'other',
      paymentMode: 'cash',
      description: '',
      status: 'paid'
    })
    setShowNewExpense(true)
  }

  // Close the form and reset edit state
  const closeExpenseForm = () => {
    setShowNewExpense(false)
    setEditingId(null)
  }

  // Open the form pre-filled for editing
  const handleEditExpense = (expense: Expense) => {
    setEditingId(expense.id)
    setNewExpenseForm({
      title: expense.description || '',
      amount: String(expense.amount ?? ''),
      date: (expense.date || '').slice(0, 10),
      category: expense.category,
      paymentMode: expense.paymentMode,
      description: '',
      status: expense.status === 'paid' ? 'paid' : 'pending'
    })
    setShowNewExpense(true)
  }

  // Open a read-only details view
  const handleViewExpense = (expense: Expense) => {
    setViewingExpense(expense)
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="erp-module-kpi-grid">
            <div className="erp-inline-stat-card relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md min-w-0">
              <div>
                <h3 className="erp-inline-stat-label text-slate-500 dark:text-slate-400" title={t.expenses?.totalExpenses || 'Total Expenses'}>Total</h3>
                <div className="erp-inline-stat-scroll mt-0.5">
                  <p className="erp-inline-stat-value text-slate-700 dark:text-slate-200">
                    {formatExpenseAmount(stats.totalExpenses)}
                  </p>
                </div>
              </div>
            </div>

            <div className="erp-inline-stat-card relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md min-w-0">
              <div>
                <h3 className="erp-inline-stat-label text-slate-500 dark:text-slate-400" title="Paid Expenses">Paid</h3>
                <div className="erp-inline-stat-scroll mt-0.5">
                  <p className="erp-inline-stat-value text-slate-700 dark:text-slate-200">
                    {formatExpenseAmount(stats.paidExpenses)}
                  </p>
                </div>
              </div>
            </div>

            <div className="erp-inline-stat-card relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md min-w-0">
              <div>
                <h3 className="erp-inline-stat-label text-slate-500 dark:text-slate-400" title="Pending Expenses">Pending</h3>
                <div className="erp-inline-stat-scroll mt-0.5">
                  <p className="erp-inline-stat-value text-blue-600 dark:text-blue-400">
                    {formatExpenseAmount(stats.pendingExpenses)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Date Filters + Action Buttons */}
          <div className="flex w-full flex-row items-center justify-end gap-1.5 flex-shrink-0 sm:w-auto">
            <PeriodFilterDropdown value={selectedPeriod} onChange={setSelectedPeriod} />
            <button
              onClick={openNewExpense}
              className="erp-module-primary-btn"
            >
              <Plus size={14} weight="bold" />
              <span>Expense</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <MagnifyingGlass size={18} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.expenses?.searchExpenses || 'Search expenses...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-4 gap-2 md:flex md:items-center md:gap-2 md:overflow-x-auto md:pb-1">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={cn(
                  'erp-module-filter-chip w-full md:w-auto justify-center text-center',
                  selectedCategory === tab.id
                    ? 'is-active'
                    : 'border border-slate-200 dark:border-slate-600'
                )}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
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
              onClick={openNewExpense}
              className="text-blue-600 font-medium hover:underline text-sm"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Expense Cards - Only visible on mobile */}
            <div className="md:hidden space-y-2">
              {filteredExpenses.map((expense) => {
                const statusMeta = getExpenseStatusMeta(
                  expense,
                  t.common?.paid || 'Paid',
                  t.common?.pending || 'Pending'
                )
                return (
                  <MobileListCard
                    key={expense.id}
                    title={getExpenseDisplayName(expense)}
                    onTitleClick={() => handleViewExpense(expense)}
                    fields={[
                      { id: 'date', label: 'Date', value: formatExpenseDate(expense.date) },
                      { id: 'amount', label: 'Amount', value: formatStatAmount(expense.amount) },
                      { id: 'category', label: 'Category', value: expense.category.replace(/_/g, ' ') },
                      { id: 'payment', label: 'Payment', value: expense.paymentMode },
                    ]}
                    status={
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase', statusMeta.className)}>
                        {statusMeta.label}
                      </span>
                    }
                    actions={
                      <MobileActionMenu
                        actions={[
                          { id: 'view', label: 'View', icon: <Eye size={14} />, onClick: () => handleViewExpense(expense) },
                          { id: 'edit', label: 'Edit', icon: <Pencil size={14} />, onClick: () => handleEditExpense(expense) },
                          { id: 'delete', label: 'Delete', icon: <Trash size={14} />, tone: 'danger', onClick: () => handleDeleteExpense(expense.id) },
                        ]}
                      />
                    }
                  />
                )
              })}
            </div>

            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="erp-module-table-header bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">{t.expenses?.date || 'Date'}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Expense</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">{t.expenses?.category || 'Category'}</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">{t.expenses?.amount || 'Amount'}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">{t.common?.payment || 'Payment'}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">{t.common?.status || 'Status'}</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">{t.common?.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((expense) => {
                      const statusMeta = getExpenseStatusMeta(
                        expense,
                        t.common?.paid || 'Paid',
                        t.common?.pending || 'Pending'
                      )
                      return (
                      <tr
                        key={expense.id}
                        className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {formatExpenseDate(expense.date)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm text-slate-800">{getExpenseDisplayName(expense)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-700 capitalize">
                              {expense.category.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-sm text-slate-800">
                            {formatStatAmount(expense.amount)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 capitalize">
                            {expense.paymentMode}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                              statusMeta.className
                            )}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="p-1.5 hover:bg-blue-50 rounded transition-colors text-blue-600"
                                onClick={() => handleViewExpense(expense)}
                                title="View"
                              >
                                <Eye size={16} weight="duotone" />
                              </button>
                              <button
                                className="p-1.5 hover:bg-amber-50 rounded transition-colors text-amber-600"
                                onClick={() => handleEditExpense(expense)}
                                title="Edit"
                              >
                                <Pencil size={16} weight="duotone" />
                              </button>
                              <button
                                className="p-1.5 hover:bg-red-50 rounded transition-colors text-red-600"
                                onClick={() => handleDeleteExpense(expense.id)}
                                title="Delete"
                              >
                                <Trash size={16} weight="duotone" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
              onClick={closeExpenseForm}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeExpenseForm}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
              >
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">{editingId ? 'Edit Expense' : (t.expenses?.addNewExpense || 'Add New Expense')}</h3>
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
                    {editingId ? 'Update Expense' : (t.expenses?.saveExpense || 'Save Expense')}
                  </button>
                  <button
                    onClick={closeExpenseForm}
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

      {/* View Expense Modal */}
      <AnimatePresence>
        {viewingExpense && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingExpense(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewingExpense(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{getExpenseDisplayName(viewingExpense)}</h3>
                    <p className="text-xs text-slate-500">{formatExpenseDate(viewingExpense.date)}</p>
                  </div>
                  <button onClick={() => setViewingExpense(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="font-medium text-slate-800">{new Date(viewingExpense.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Category</span>
                    <span className="font-medium text-slate-800 capitalize">{viewingExpense.category}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-500">Description</span>
                    <span className="font-medium text-slate-800 text-right">{viewingExpense.description || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Payment Mode</span>
                    <span className="font-medium text-slate-800 capitalize">{viewingExpense.paymentMode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                      viewingExpense.status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {viewingExpense.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-slate-500">Amount</span>
                    <span className="text-lg font-bold text-slate-900">₹{Number(viewingExpense.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex gap-2 px-5 py-4 border-t border-slate-200">
                  <button
                    onClick={() => { const exp = viewingExpense; setViewingExpense(null); handleEditExpense(exp); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    <Pencil size={16} weight="duotone" /> Edit
                  </button>
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

