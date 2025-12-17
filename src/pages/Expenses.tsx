import React, { useState, useEffect, useCallback } from 'react'
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

const Expenses = () => {
  // Language support
  const { t, language } = useLanguage()

  const [showNewExpense, setShowNewExpense] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
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
      console.error('Error fetching expenses:', error)
      toast.error('Failed to load expenses')
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
          console.error('Failed to update Cash in Hand for expense:', err)
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
      console.error('Error creating expense:', error)
      toast.error('Failed to create expense')
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
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
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
    <div className="overflow-x-hidden flex flex-col max-w-[100vw] w-full px-3 py-2 bg-slate-50/50 min-h-screen">
      {/* Header - Clean & Simple like Sales */}
      <div className="flex-shrink-0">
        {/* Top Row: Title + Actions */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Wallet size={22} weight="duotone" className="text-red-600" />
            <span>{t.expenses?.title || 'Expenses'}</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewExpense(true)}
              className="h-8 px-3 rounded-lg border border-blue-200 bg-white text-xs text-blue-600 font-semibold flex items-center gap-1.5 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <Plus size={14} weight="bold" />
              <span>Expense</span>
            </button>
          </div>
        </div>

        {/* Category Filter & Stats - Compact Modern (matching Sales design) */}
        <div className="space-y-2">
          {/* Category Filter Tabs */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-0.5 text-xs bg-white rounded-lg p-0.5 shadow-sm border border-slate-200">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1",
                    selectedCategory === cat.id
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                >
                  <cat.icon size={12} weight="duotone" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards - Compact */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Wallet size={16} weight="duotone" className="text-red-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{t.expenses?.totalExpenses || 'Total'}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">₹{stats.totalExpenses.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar size={16} weight="duotone" className="text-blue-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{t.expenses?.thisMonth || 'This Month'}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">₹{stats.thisMonth.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Receipt size={16} weight="duotone" className="text-orange-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{t.common?.pending || 'Pending'}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">₹{stats.pending.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  stats.percentChange >= 0 ? "bg-green-100" : "bg-red-100"
                )}>
                  {stats.percentChange >= 0 ?
                    <TrendUp size={16} weight="duotone" className="text-green-600" /> :
                    <TrendDown size={16} weight="duotone" className="text-red-600" />
                  }
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{t.expenses?.change || 'Change'}</span>
              </div>
              <p className={cn(
                "text-lg font-bold",
                stats.percentChange >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {stats.percentChange >= 0 ? '+' : ''}{stats.percentChange.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
              <MagnifyingGlass size={16} weight="bold" className="text-slate-400" />
              <input
                type="text"
                placeholder={t.expenses?.searchExpenses || 'Search expenses...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
              />
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
                  <thead className="bg-slate-50 border-b border-slate-200">
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
