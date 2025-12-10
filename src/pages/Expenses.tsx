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
    <div className="min-h-screen p-4 sm:p-6 pb-20 lg:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet size={32} weight="duotone" className="text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t.expenses?.title || 'Expenses'}</h1>
              <p className="text-sm text-muted-foreground">{t.expenses?.trackExpenses || 'Track and manage all your business expenses'}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewExpense(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={20} weight="bold" />
            <span className="hidden sm:inline">{t.expenses?.newExpense || 'New Expense'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: t.expenses?.totalExpenses || 'Total Expenses', value: `₹${stats.totalExpenses.toLocaleString()}`, icon: Wallet },
          { label: t.expenses?.thisMonth || 'This Month', value: `₹${stats.thisMonth.toLocaleString()}`, icon: Calendar, color: 'primary' },
          { label: t.common?.pending || 'Pending', value: `₹${stats.pending.toLocaleString()}`, icon: Receipt, color: 'warning' },
          { label: t.expenses?.change || 'Change', value: `${stats.percentChange >= 0 ? '+' : ''}${stats.percentChange}%`, icon: stats.percentChange >= 0 ? TrendUp : TrendDown, color: stats.percentChange >= 0 ? 'success' : 'destructive' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden bg-card border border-border/50 rounded-lg p-4"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${['from-[#7A35FF] to-[#9B63FF]','from-[#00C9A7] to-[#3B82F6]','from-[#EF4444] to-[#DC2626]','from-[#3B82F6] to-[#7A35FF]'][index]}`} />
            <div className="flex items-center gap-2 mb-2">
              <stat.icon
                size={18}
                weight="duotone"
                className="text-primary"
              />
              <p className="text-muted-foreground text-xs">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters and Search */}
      <div>
        <div className="bg-card rounded-lg shadow-lg p-4 lg:p-6 border border-border mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-3 bg-muted rounded-lg">
              <MagnifyingGlass size={20} weight="bold" className="text-muted-foreground lg:w-6 lg:h-6" />
              <input
                type="text"
                placeholder={t.expenses?.searchExpenses || 'Search expenses...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm lg:text-base"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-3 rounded-lg whitespace-nowrap transition-all",
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <cat.icon size={16} weight="duotone" className="lg:w-5 lg:h-5" />
                  <span className="text-sm lg:text-base">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="mt-6 lg:mt-8">
          {/* Empty State */}
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl shadow-sm border border-border">
              <Wallet size={48} weight="duotone" className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                {expenses.length === 0 ? 'No expenses recorded yet' : 'No expenses match your search'}
              </p>
              <button
                onClick={() => setShowNewExpense(true)}
                className="text-primary font-medium hover:underline"
              >
                Add your first expense
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Expense Cards - Only visible on mobile */}
              <div className="md:hidden space-y-3">
                {filteredExpenses.map((expense, index) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-xl shadow-sm border border-border p-4"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{expense.expenseNumber}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{expense.description}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase ml-2 flex-shrink-0",
                        expense.status === 'paid'
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      )}>
                        {expense.status === 'paid' ? (t.common?.paid || 'Paid') : (t.common?.pending || 'Pending')}
                      </span>
                    </div>

                    {/* Details Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-0.5 bg-muted rounded font-medium">{expense.category}</span>
                      </div>
                      <span className="text-lg font-bold text-foreground">₹{expense.amount.toLocaleString()}</span>
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard size={12} />
                        {expense.paymentMode}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors active:scale-95"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash size={16} weight="duotone" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Desktop Table - Hidden on mobile */}
              <div className="hidden md:block bg-card rounded-lg shadow-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">{t.expenses?.date || 'Date'}</th>
                        <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">Expense</th>
                        <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">{t.expenses?.category || 'Category'}</th>
                        <th className="px-4 py-3 lg:px-6 lg:py-4 text-right text-xs lg:text-sm font-medium text-muted-foreground">{t.expenses?.amount || 'Amount'}</th>
                        <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">{t.common?.payment || 'Payment'}</th>
                        <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">{t.common?.status || 'Status'}</th>
                        <th className="px-4 py-3 lg:px-6 lg:py-4 text-right text-xs lg:text-sm font-medium text-muted-foreground">{t.common?.actions || 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredExpenses.map((expense, index) => (
                        <motion.tr
                          key={expense.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-sm">{expense.expenseNumber}</p>
                              <p className="text-xs text-muted-foreground">{expense.description}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-sm">
                            ₹{expense.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {expense.paymentMode}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                              expense.status === 'paid'
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            )}>
                              {expense.status === 'paid' ? (t.common?.paid || 'Paid') : (t.common?.pending || 'Pending')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Trash size={18} weight="duotone" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
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
