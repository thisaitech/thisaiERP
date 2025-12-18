import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Plus,
  Bank,
  Wallet,
  CreditCard,
  Money,
  TrendUp,
  TrendDown,
  ArrowsLeftRight,
  Receipt,
  CalendarBlank,
  MagnifyingGlass,
  Eye,
  Trash,
  CheckCircle,
  Clock,
  Warning,
  X,
  Pencil,
  Link,
  Copy,
  ArrowSquareOut,
  WhatsappLogo,
  DotsThreeVertical
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatDate } from '../lib/utils'
import { toast } from 'sonner'
import {
  getRazorpayTransactions,
  getRazorpayStats,
  isRazorpayConfigured,
  type RazorpayTransaction
} from '../services/razorpayService'
import { useNavigate } from 'react-router-dom'
import {
  saveBankingPageData,
  saveBankingPageTransactions,
  subscribeToBankingPageData,
  subscribeToBankingPageTransactions,
  getBankingPageData,
  getBankingPageTransactions,
  type BankingPageData,
  type BankingPageTransaction
} from '../services/bankingService'

const Banking = () => {
  // Language support
  const { t, language } = useLanguage()

  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState('overview')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [showAddAccount, setShowAddAccount] = useState(false)
  
  // Razorpay state
  const [razorpayTransactions, setRazorpayTransactions] = useState<RazorpayTransaction[]>([])
  const [razorpayStats, setRazorpayStats] = useState({
    totalTransactions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    totalAmountCollected: 0,
    totalAmountPending: 0
  })
  const [showCashModal, setShowCashModal] = useState(false)
  const [cashModalType, setCashModalType] = useState<'in' | 'out'>('in')
  const [cashAmount, setCashAmount] = useState('')
  const [cashDescription, setCashDescription] = useState('')

  // Add Account form state
  const [accountType, setAccountType] = useState('bank')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [bankAccountType, setBankAccountType] = useState('current')

  // Transaction search state
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('')

  // Add Cheque modal state
  const [showAddCheque, setShowAddCheque] = useState(false)
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeAmount, setChequeAmount] = useState('')
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0])
  const [chequeParty, setChequeParty] = useState('')
  const [chequeStatus, setChequeStatus] = useState<'pending' | 'cleared' | 'bounced'>('pending')
  const [chequeDepositBank, setChequeDepositBank] = useState('') // Which bank to deposit into
  const [showPartyDropdown, setShowPartyDropdown] = useState(false)
  const [partySearchTerm, setPartySearchTerm] = useState('')
  const [editingCheque, setEditingCheque] = useState<any>(null)
  const [viewingCheque, setViewingCheque] = useState<any>(null) // For viewing cheque details

  // Loan modal states
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [showPayEMI, setShowPayEMI] = useState(false)
  const [showLoanDetails, setShowLoanDetails] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [newLoanName, setNewLoanName] = useState('')
  const [newLoanBank, setNewLoanBank] = useState('')
  const [newLoanPrincipal, setNewLoanPrincipal] = useState('')
  const [newLoanEMI, setNewLoanEMI] = useState('')
  const [newLoanDueDate, setNewLoanDueDate] = useState('')
  const [emiPaymentAmount, setEmiPaymentAmount] = useState('')
  const [emiPaymentAccount, setEmiPaymentAccount] = useState('')

  // Action menu dropdown state
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null)

  // Load parties from Parties module
  const [allParties, setAllParties] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    const loadParties = async () => {
      try {
        const { getParties } = await import('../services/partyService')
        const parties = await getParties()
        if (!mounted) return
        setAllParties(parties || [])
      } catch (error) {
        console.error('Failed to load parties for Banking:', error)
      }
    }
    loadParties()
    return () => { mounted = false }
  }, [])

  // Load Razorpay transactions
  useEffect(() => {
    const loadRazorpayData = () => {
      const transactions = getRazorpayTransactions()
      setRazorpayTransactions(transactions)
      setRazorpayStats(getRazorpayStats())
    }
    loadRazorpayData()
    
    // Refresh every 30 seconds
    const interval = setInterval(loadRazorpayData, 30000)
    return () => clearInterval(interval)
  }, [selectedTab])

  // Default data structure - Empty defaults, Firebase data will load
  const defaultAccounts = {
    bankAccounts: [],
    cashInHand: { balance: 0 },
    cheques: [],
    loans: []
  }

  const defaultTransactions: any[] = []

  // State initialized with defaults - Firebase data will override via subscription
  const [accounts, setAccounts] = useState(defaultAccounts)
  const [transactions, setTransactions] = useState(defaultTransactions)
  const [isLoading, setIsLoading] = useState(true)

  // Track if we're currently updating from Firebase to prevent save loops
  const isUpdatingFromFirebase = useRef(false)
  const lastSavedAccountsRef = useRef<string>('')
  const lastSavedTransactionsRef = useRef<string>('')
  const isInitialLoad = useRef(true)

  // Save to Firebase whenever data changes (skip initial load and Firebase updates)
  useEffect(() => {
    // Skip if this is the initial load or update came from Firebase
    if (isInitialLoad.current || isUpdatingFromFirebase.current) {
      return
    }
    const accountsJson = JSON.stringify(accounts)
    // Skip if data hasn't actually changed
    if (accountsJson === lastSavedAccountsRef.current) {
      return
    }
    lastSavedAccountsRef.current = accountsJson
    // Save to Firebase only
    console.log('💾 Banking: Saving accounts to Firebase')
    saveBankingPageData(accounts as BankingPageData)
  }, [accounts])

  useEffect(() => {
    // Skip if this is the initial load or update came from Firebase
    if (isInitialLoad.current || isUpdatingFromFirebase.current) {
      return
    }
    const transactionsJson = JSON.stringify(transactions)
    // Skip if data hasn't actually changed
    if (transactionsJson === lastSavedTransactionsRef.current) {
      return
    }
    lastSavedTransactionsRef.current = transactionsJson
    // Save to Firebase only
    console.log('💾 Banking: Saving transactions to Firebase')
    saveBankingPageTransactions(transactions as BankingPageTransaction[])
  }, [transactions])

  // Firebase real-time sync - Load data from Firebase and subscribe to updates
  useEffect(() => {
    let unsubAccounts: (() => void) | null = null
    let unsubTransactions: (() => void) | null = null

    const initializeFromFirebase = async () => {
      try {
        // First, try to load existing data from Firebase
        const [firebaseAccounts, firebaseTransactions] = await Promise.all([
          getBankingPageData(),
          getBankingPageTransactions()
        ])

        if (firebaseAccounts) {
          console.log('📥 Banking: Loaded accounts from Firebase')
          lastSavedAccountsRef.current = JSON.stringify(firebaseAccounts)
          setAccounts(firebaseAccounts)
        }

        if (firebaseTransactions && firebaseTransactions.length > 0) {
          console.log('📥 Banking: Loaded transactions from Firebase')
          lastSavedTransactionsRef.current = JSON.stringify(firebaseTransactions)
          setTransactions(firebaseTransactions)
        }

        // Mark initial load complete after loading from Firebase
        setIsLoading(false)
        // Small delay before enabling saves to prevent immediate re-save
        setTimeout(() => {
          isInitialLoad.current = false
        }, 500)

        // Subscribe to real-time banking data updates
        unsubAccounts = subscribeToBankingPageData((data) => {
          console.log('📥 Banking: Received real-time update from Firebase')
          const dataJson = JSON.stringify(data)
          // Only update if data is different
          if (dataJson !== lastSavedAccountsRef.current) {
            isUpdatingFromFirebase.current = true
            lastSavedAccountsRef.current = dataJson
            setAccounts(data)
            // Reset flag after state update is complete
            requestAnimationFrame(() => {
              isUpdatingFromFirebase.current = false
            })
          }
        })

        // Subscribe to real-time transactions updates
        unsubTransactions = subscribeToBankingPageTransactions((txns) => {
          console.log('📥 Banking: Received real-time transactions update from Firebase')
          const txnsJson = JSON.stringify(txns)
          // Only update if data is different
          if (txnsJson !== lastSavedTransactionsRef.current) {
            isUpdatingFromFirebase.current = true
            lastSavedTransactionsRef.current = txnsJson
            setTransactions(txns)
            requestAnimationFrame(() => {
              isUpdatingFromFirebase.current = false
            })
          }
        })
      } catch (error) {
        console.error('Failed to initialize banking from Firebase:', error)
        setIsLoading(false)
        isInitialLoad.current = false
      }
    }

    initializeFromFirebase()

    // Cleanup subscriptions on unmount
    return () => {
      if (unsubAccounts) unsubAccounts()
      if (unsubTransactions) unsubTransactions()
    }
  }, [])

  // Refresh data from Firebase when page gains focus
  useEffect(() => {
    const refreshFromFirebase = async () => {
      try {
        const [firebaseAccounts, firebaseTransactions] = await Promise.all([
          getBankingPageData(),
          getBankingPageTransactions()
        ])

        if (firebaseAccounts) {
          const dataJson = JSON.stringify(firebaseAccounts)
          if (dataJson !== lastSavedAccountsRef.current) {
            console.log('🔄 Banking: Refreshing accounts from Firebase on focus')
            isUpdatingFromFirebase.current = true
            lastSavedAccountsRef.current = dataJson
            setAccounts(firebaseAccounts)
            requestAnimationFrame(() => {
              isUpdatingFromFirebase.current = false
            })
          }
        }

        if (firebaseTransactions && firebaseTransactions.length > 0) {
          const txnsJson = JSON.stringify(firebaseTransactions)
          if (txnsJson !== lastSavedTransactionsRef.current) {
            console.log('🔄 Banking: Refreshing transactions from Firebase on focus')
            isUpdatingFromFirebase.current = true
            lastSavedTransactionsRef.current = txnsJson
            setTransactions(firebaseTransactions)
            requestAnimationFrame(() => {
              isUpdatingFromFirebase.current = false
            })
          }
        }
      } catch (error) {
        console.error('Failed to refresh banking from Firebase:', error)
      }
    }

    // Refresh when window gains focus (user switches back to this tab)
    const handleFocus = () => {
      refreshFromFirebase()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Cash In/Out handler
  const handleCashTransaction = () => {
    const amount = parseFloat(cashAmount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!cashDescription.trim()) {
      toast.error('Please enter a description')
      return
    }

    const newBalance = cashModalType === 'in'
      ? accounts.cashInHand.balance + amount
      : accounts.cashInHand.balance - amount

    if (newBalance < 0) {
      toast.error('Insufficient cash balance')
      return
    }

    // Update cash balance
    setAccounts({
      ...accounts,
      cashInHand: { balance: newBalance }
    })

    // Add transaction
    const newTransaction = {
      id: Date.now(),
      type: cashModalType === 'in' ? 'credit' : 'debit',
      description: cashDescription,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      account: 'Cash in Hand'
    }
    setTransactions([newTransaction, ...transactions])

    toast.success(`Cash ${cashModalType === 'in' ? 'deposited' : 'withdrawn'} successfully`)
    setShowCashModal(false)
    setCashAmount('')
    setCashDescription('')
  }

  // Add Account handler
  const handleAddAccount = () => {
    if (!accountName.trim()) {
      toast.error('Please enter account name')
      return
    }

    const balance = parseFloat(openingBalance) || 0

    if (accountType === 'bank') {
      if (!accountNumber.trim()) {
        toast.error('Please enter account number')
        return
      }

      const newAccount = {
        id: Date.now(),
        name: accountName,
        accountNo: accountNumber,
        balance: balance,
        type: bankAccountType
      }

      setAccounts({
        ...accounts,
        bankAccounts: [...accounts.bankAccounts, newAccount]
      })

      // Add opening balance transaction if balance > 0
      if (balance > 0) {
        const newTransaction = {
          id: Date.now(),
          type: 'credit',
          description: `Opening balance for ${accountName}`,
          amount: balance,
          date: new Date().toISOString().split('T')[0],
          account: accountName
        }
        setTransactions([newTransaction, ...transactions])
      }

      toast.success('Bank account added successfully!')
    }

    // Reset form and close modal
    setShowAddAccount(false)
    setAccountName('')
    setAccountNumber('')
    setOpeningBalance('')
    setAccountType('bank')
    setBankAccountType('current')
  }

  // Add Cheque handler
  const handleAddCheque = () => {
    if (!chequeNumber.trim()) {
      toast.error('Please enter cheque number')
      return
    }
    if (!chequeParty.trim()) {
      toast.error('Please enter party name')
      return
    }

    const amount = parseFloat(chequeAmount)
    if (!amount || amount <= 0) {
      toast.error('Please enter valid amount')
      return
    }

    if (!chequeDepositBank) {
      toast.error('Please select bank account to deposit cheque')
      return
    }

    // Find the selected bank account
    const selectedBank = accounts.bankAccounts.find(acc => acc.id.toString() === chequeDepositBank)
    if (!selectedBank) {
      toast.error('Selected bank account not found')
      return
    }

    if (editingCheque) {
      // Update existing cheque
      const updatedCheques = accounts.cheques.map(ch =>
        ch.id === editingCheque.id
          ? { ...ch, number: chequeNumber, amount: amount, date: chequeDate, party: chequeParty, status: chequeStatus, depositBank: chequeDepositBank, depositBankName: selectedBank.name }
          : ch
      )

      // Check if status changed from pending/bounced to cleared
      if (editingCheque.status !== 'cleared' && chequeStatus === 'cleared') {
        // Credit the bank account
        const updatedBankAccounts = accounts.bankAccounts.map(acc =>
          acc.id.toString() === chequeDepositBank
            ? { ...acc, balance: acc.balance + amount }
            : acc
        )

        setAccounts({
          ...accounts,
          bankAccounts: updatedBankAccounts,
          cheques: updatedCheques
        })

        // Add transaction for cleared cheque
        const newTransaction = {
          id: Date.now(),
          type: 'credit',
          description: `Cheque ${chequeNumber} cleared - ${chequeParty} → ${selectedBank.name}`,
          amount: amount,
          date: chequeDate,
          account: selectedBank.name
        }
        setTransactions([newTransaction, ...transactions])

        toast.success(`Cheque cleared! ₹${amount.toLocaleString()} credited to ${selectedBank.name}`)
      } else if (editingCheque.status === 'cleared' && chequeStatus !== 'cleared') {
        // Reversed from cleared to pending/bounced - deduct the amount back
        const updatedBankAccounts = accounts.bankAccounts.map(acc =>
          acc.id.toString() === chequeDepositBank
            ? { ...acc, balance: acc.balance - amount }
            : acc
        )

        setAccounts({
          ...accounts,
          bankAccounts: updatedBankAccounts,
          cheques: updatedCheques
        })

        // Add reversal transaction
        const newTransaction = {
          id: Date.now(),
          type: 'debit',
          description: `Cheque ${chequeNumber} status changed to ${chequeStatus} - ${chequeParty} (reversed from ${selectedBank.name})`,
          amount: amount,
          date: chequeDate,
          account: selectedBank.name
        }
        setTransactions([newTransaction, ...transactions])

        toast.warning(`Cheque status changed to ${chequeStatus}. ₹${amount.toLocaleString()} debited from ${selectedBank.name}`)
      } else {
        // Just update cheque details, no status change affecting bank
        setAccounts({
          ...accounts,
          cheques: updatedCheques
        })
        toast.success('Cheque updated successfully!')
      }

      setEditingCheque(null)
    } else {
      // Add new cheque
      const newCheque = {
        id: Date.now(),
        number: chequeNumber,
        amount: amount,
        date: chequeDate,
        party: chequeParty,
        status: chequeStatus,
        depositBank: chequeDepositBank,
        depositBankName: selectedBank.name
      }

      // If status is already 'cleared' when adding, credit the bank immediately
      if (chequeStatus === 'cleared') {
        const updatedBankAccounts = accounts.bankAccounts.map(acc =>
          acc.id.toString() === chequeDepositBank
            ? { ...acc, balance: acc.balance + amount }
            : acc
        )

        setAccounts({
          ...accounts,
          bankAccounts: updatedBankAccounts,
          cheques: [...accounts.cheques, newCheque]
        })

        // Add transaction
        const newTransaction = {
          id: Date.now(),
          type: 'credit',
          description: `Cheque ${chequeNumber} cleared - ${chequeParty} → ${selectedBank.name}`,
          amount: amount,
          date: chequeDate,
          account: selectedBank.name
        }
        setTransactions([newTransaction, ...transactions])

        toast.success(`Cheque added and cleared! ₹${amount.toLocaleString()} credited to ${selectedBank.name}`)
      } else {
        // Add cheque as pending/bounced - no bank update
        setAccounts({
          ...accounts,
          cheques: [...accounts.cheques, newCheque]
        })

        toast.success(`Cheque added as ${chequeStatus}`)
      }
    }

    // Reset form and close modal
    setShowAddCheque(false)
    setChequeNumber('')
    setChequeAmount('')
    setChequeDate(new Date().toISOString().split('T')[0])
    setChequeParty('')
    setChequeStatus('pending')
    setChequeDepositBank('')
    setShowPartyDropdown(false)
  }

  // Edit Cheque handler
  const handleEditCheque = (cheque: any) => {
    setEditingCheque(cheque)
    setChequeNumber(cheque.number)
    setChequeAmount(cheque.amount.toString())
    setChequeDate(cheque.date)
    setChequeParty(cheque.party)
    setChequeStatus(cheque.status)
    setChequeDepositBank(cheque.depositBank || '') // Load the bank account
    setShowAddCheque(true)
  }

  // Delete Cheque handler
  const handleDeleteCheque = (chequeId: number) => {
    if (window.confirm('Are you sure you want to delete this cheque?')) {
      setAccounts({
        ...accounts,
        cheques: accounts.cheques.filter((ch: any) => ch.id !== chequeId)
      })
      toast.success('Cheque deleted successfully')
    }
  }

  // View Cheque details handler
  const handleViewCheque = (cheque: any) => {
    setViewingCheque(cheque)
  }

  // Add Loan handler
  const handleAddLoan = () => {
    if (!newLoanName.trim() || !newLoanBank.trim() || !newLoanPrincipal || !newLoanEMI || !newLoanDueDate) {
      toast.error('Please fill all loan details')
      return
    }
    const principal = parseFloat(newLoanPrincipal)
    const emi = parseFloat(newLoanEMI)
    if (principal <= 0 || emi <= 0) {
      toast.error('Please enter valid amounts')
      return
    }
    const newLoan = {
      id: Date.now(),
      name: newLoanName.trim(),
      bank: newLoanBank.trim(),
      principal: principal,
      outstanding: principal,
      emi: emi,
      nextDue: newLoanDueDate
    }
    setAccounts({
      ...accounts,
      loans: [...accounts.loans, newLoan]
    })
    // Reset form
    setNewLoanName('')
    setNewLoanBank('')
    setNewLoanPrincipal('')
    setNewLoanEMI('')
    setNewLoanDueDate('')
    setShowAddLoan(false)
    toast.success('Loan added successfully')
  }

  // Pay EMI handler
  const handlePayEMI = () => {
    if (!selectedLoan || !emiPaymentAmount || !emiPaymentAccount) {
      toast.error('Please fill all payment details')
      return
    }
    const amount = parseFloat(emiPaymentAmount)
    if (amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (amount > selectedLoan.outstanding) {
      toast.error('Payment amount cannot exceed outstanding balance')
      return
    }

    // Find the account to deduct from
    const accountIndex = accounts.bankAccounts.findIndex((acc: any) => acc.name === emiPaymentAccount)
    if (accountIndex === -1 && emiPaymentAccount !== 'Cash in Hand') {
      toast.error('Selected account not found')
      return
    }

    // Check if account has sufficient balance
    if (emiPaymentAccount === 'Cash in Hand') {
      if (accounts.cashInHand.balance < amount) {
        toast.error('Insufficient cash balance')
        return
      }
    } else {
      if (accounts.bankAccounts[accountIndex].balance < amount) {
        toast.error('Insufficient account balance')
        return
      }
    }

    // Update loan outstanding
    const updatedLoans = accounts.loans.map((loan: any) => {
      if (loan.id === selectedLoan.id) {
        // Calculate next due date (add 1 month)
        const currentDue = new Date(loan.nextDue)
        currentDue.setMonth(currentDue.getMonth() + 1)
        return {
          ...loan,
          outstanding: loan.outstanding - amount,
          nextDue: currentDue.toISOString().split('T')[0]
        }
      }
      return loan
    })

    // Update account balance
    let updatedAccounts
    if (emiPaymentAccount === 'Cash in Hand') {
      updatedAccounts = {
        ...accounts,
        loans: updatedLoans,
        cashInHand: { balance: accounts.cashInHand.balance - amount }
      }
    } else {
      const updatedBankAccounts = [...accounts.bankAccounts]
      updatedBankAccounts[accountIndex] = {
        ...updatedBankAccounts[accountIndex],
        balance: updatedBankAccounts[accountIndex].balance - amount
      }
      updatedAccounts = {
        ...accounts,
        loans: updatedLoans,
        bankAccounts: updatedBankAccounts
      }
    }

    setAccounts(updatedAccounts)

    // Add transaction record
    const newTransaction = {
      id: Date.now(),
      type: 'debit',
      description: `EMI Payment - ${selectedLoan.name}`,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      account: emiPaymentAccount
    }
    setTransactions([newTransaction, ...transactions])

    // Reset and close
    setEmiPaymentAmount('')
    setEmiPaymentAccount('')
    setShowPayEMI(false)
    setSelectedLoan(null)
    toast.success('EMI payment successful')
  }

  const totalBalance = accounts.bankAccounts.reduce((sum, acc) => sum + acc.balance, 0) + accounts.cashInHand.balance
  const pendingCheques = accounts.cheques.filter(ch => ch.status === 'pending').reduce((sum, ch) => sum + ch.amount, 0)
  const totalLoanOutstanding = accounts.loans.reduce((sum, loan) => sum + loan.outstanding, 0)

  // Financial metrics
  const availableBalance = totalBalance - pendingCheques  // What you can actually spend
  const totalAssets = totalBalance  // Bank + Cash (ignores pending cheques)
  const netWorth = totalAssets - totalLoanOutstanding  // Assets - Liabilities

  return (
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-900 p-3 pb-20 lg:pb-6">
      {/* Modern Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3"
      >
        {/* Top Row: Period Filter Left + Action Button Right */}
        <div className="flex items-center justify-between mb-3">
          {/* Period Filter Tabs - Left Side */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center gap-1 text-xs bg-[#f5f7fa] dark:bg-slate-800 rounded-xl p-1.5 shadow-[inset_3px_3px_6px_#e0e3e7,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]">
              {['today', 'week', 'month', 'year', 'all', 'custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap",
                    selectedPeriod === period
                      ? "bg-blue-600 text-white shadow-[3px_3px_6px_#e0e3e7,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button - Right Side */}
          <button
            onClick={() => setShowAddAccount(true)}
            className="h-9 px-4 rounded-xl bg-blue-600 text-xs text-white font-semibold flex items-center gap-1.5
              shadow-[4px_4px_8px_#e0e3e7,-4px_-4px_8px_#ffffff]
              dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
              hover:shadow-[6px_6px_12px_#e0e3e7,-6px_-6px_12px_#ffffff]
              active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15)]
              transition-all duration-200"
          >
            <Plus size={14} weight="bold" />
            <span className="hidden sm:inline">{t.banking.addAccount}</span>
          </button>
        </div>

        {/* Stats Cards - Second Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {/* Available Balance Card */}
          <button className="bg-[#e4ebf5] rounded-2xl p-4 shadow-[10px_10px_20px_#c5ccd6,-10px_-10px_20px_#ffffff] hover:shadow-[15px_15px_30px_#c5ccd6,-15px_-15px_30px_#ffffff] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{t.banking.availableBalance}</span>
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 flex items-center justify-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]">
                <Bank size={20} weight="duotone" className="text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">₹{(availableBalance / 100000).toFixed(2)}L</div>
          </button>

          {/* Cash in Hand Card */}
          <button className="bg-[#e4ebf5] rounded-2xl p-4 shadow-[10px_10px_20px_#c5ccd6,-10px_-10px_20px_#ffffff] hover:shadow-[15px_15px_30px_#c5ccd6,-15px_-15px_30px_#ffffff] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{t.banking.cashInHand}</span>
              <div className="w-10 h-10 rounded-xl bg-green-100/80 flex items-center justify-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]">
                <Wallet size={20} weight="duotone" className="text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600">₹{(accounts.cashInHand.balance / 1000).toFixed(1)}K</div>
          </button>

          {/* Pending Cheques Card */}
          <button className="bg-[#e4ebf5] rounded-2xl p-4 shadow-[10px_10px_20px_#c5ccd6,-10px_-10px_20px_#ffffff] hover:shadow-[15px_15px_30px_#c5ccd6,-15px_-15px_30px_#ffffff] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{t.banking.pendingCheques}</span>
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 flex items-center justify-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]">
                <Receipt size={20} weight="duotone" className="text-amber-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600">{accounts.cheques.filter(ch => ch.status === 'pending').length}</div>
          </button>

          {/* Net Worth Card */}
          <button className="bg-[#e4ebf5] rounded-2xl p-4 shadow-[10px_10px_20px_#c5ccd6,-10px_-10px_20px_#ffffff] hover:shadow-[15px_15px_30px_#c5ccd6,-15px_-15px_30px_#ffffff] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{t.banking.netWorth}</span>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]",
                netWorth >= 0 ? "bg-green-100/80" : "bg-red-100/80"
              )}>
                {netWorth >= 0 ?
                  <TrendUp size={20} weight="duotone" className="text-green-600" /> :
                  <TrendDown size={20} weight="duotone" className="text-red-500" />
                }
              </div>
            </div>
            <div className={cn(
              "text-2xl font-bold",
              netWorth >= 0 ? "text-green-600" : "text-red-500"
            )}>
              {netWorth >= 0 ? '+' : '-'}₹{(Math.abs(netWorth) / 100000).toFixed(1)}L
            </div>
          </button>
        </div>
      </motion.div>

      {/* Centered Filter Pills / Tabs */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {[
          { id: 'overview', label: t.banking.overview, icon: Bank },
          { id: 'transactions', label: t.banking.transactions, icon: ArrowsLeftRight },
          { id: 'razorpay', label: t.banking.razorpay, icon: CreditCard },
          { id: 'cheques', label: t.banking.cheques, icon: Receipt },
          { id: 'loans', label: t.banking.loans, icon: CreditCard }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200",
              selectedTab === tab.id
                ? "bg-[#f5f7fa] dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[3px_3px_6px_#e0e3e7,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <tab.icon size={14} weight={selectedTab === tab.id ? "duotone" : "regular"} />
            {tab.label}
          </button>
        ))}
      </div>

      <div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Bank Accounts */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Bank size={16} weight="duotone" className="text-blue-600" />
                  {t.banking.bankAccounts}
                </h3>
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  {t.banking.add}
                </button>
              </div>
              <div className="space-y-2">
                {accounts.bankAccounts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Bank size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No bank accounts added yet</p>
                  </div>
                ) : (
                  accounts.bankAccounts.map((account, index) => (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="font-medium text-sm text-slate-800">{account.name}</p>
                          <p className="text-[10px] text-slate-500">{account.accountNo}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium",
                          account.type === 'current' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                        )}>
                          {account.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-500">Balance</p>
                        <p className="text-sm font-bold text-slate-800">₹{account.balance.toLocaleString()}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Cash in Hand */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Wallet size={16} weight="duotone" className="text-green-600" />
                  {t.banking.cashInHand}
                </h3>
                <button
                  onClick={() => {
                    setCashModalType('in')
                    setShowCashModal(true)
                  }}
                  className="text-xs text-green-600 hover:underline font-medium"
                >
                  {t.banking.add}
                </button>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 text-center">
                <Money size={32} weight="duotone" className="text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold mb-1 text-slate-800">₹{accounts.cashInHand.balance.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mb-3">{t.banking.availableCash}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCashModalType('in')
                      setShowCashModal(true)
                    }}
                    className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    {t.banking.cashIn}
                  </button>
                  <button
                    onClick={() => {
                      setCashModalType('out')
                      setShowCashModal(true)
                    }}
                    className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                  >
                    {t.banking.cashOut}
                  </button>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-700 mb-2">{t.banking.recentTransactions}</p>
                <div className="space-y-1.5">
                  {transactions.filter(t => t.account === 'Cash in Hand').slice(0, 3).length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2">No recent transactions</p>
                  ) : (
                    transactions.filter(t => t.account === 'Cash in Hand').slice(0, 3).map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-700 font-medium">{txn.description}</p>
                          <p className="text-[9px] text-slate-400">{formatDate(txn.date)}</p>
                        </div>
                        <p className={cn(
                          "text-xs font-medium",
                          txn.type === 'credit' ? "text-green-600" : "text-red-500"
                        )}>
                          {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cheques Tab */}
        {selectedTab === 'cheques' && (
          <div className="bg-card rounded-lg shadow-lg border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{t.banking.chequeManagement}</h3>
                <button
                  onClick={() => setShowAddCheque(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  <Plus size={16} weight="bold" />
                  {t.banking.addCheque}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{t.banking.chequeNo}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{t.banking.party}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">{t.banking.amount}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{t.banking.date}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{t.banking.depositBank}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{t.banking.status}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">{t.banking.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts.cheques.map((cheque, index) => (
                    <motion.tr
                      key={cheque.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{cheque.number}</td>
                      <td className="px-4 py-3 text-sm">{cheque.party}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">₹{cheque.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(cheque.date)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                          <Bank size={12} weight="duotone" />
                          {cheque.depositBankName || t.banking.notSet}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          cheque.status === 'cleared' && "bg-success/10 text-success",
                          cheque.status === 'pending' && "bg-warning/10 text-warning",
                          cheque.status === 'bounced' && "bg-destructive/10 text-destructive"
                        )}>
                          {cheque.status === 'cleared' && <CheckCircle size={12} weight="fill" />}
                          {cheque.status === 'pending' && <Clock size={12} weight="fill" />}
                          {cheque.status === 'bounced' && <Warning size={12} weight="fill" />}
                          {cheque.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleViewCheque(cheque)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title={t.banking.viewDetails}
                          >
                            <Eye size={18} weight="duotone" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditCheque(cheque)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors text-primary"
                            title={t.banking.editCheque}
                          >
                            <Pencil size={18} weight="duotone" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteCheque(cheque.id)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                            title={t.banking.deleteCheque}
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
        )}

        {/* Razorpay Tab */}
        {selectedTab === 'razorpay' && (
          <div className="space-y-6">
            {/* Setup Prompt if not configured */}
            {!isRazorpayConfigured() && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white"
              >
                <h3 className="text-xl font-bold mb-2">{t.banking.setupRazorpay}</h3>
                <p className="text-white/80 mb-4">{t.banking.acceptPaymentsOnline}</p>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                >
                  {t.banking.configureRazorpay} →
                </button>
              </motion.div>
            )}

            {/* Stats Cards */}
            {isRazorpayConfigured() && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl p-5 border border-border">
                  <div className="text-muted-foreground text-sm mb-1">{t.banking.totalCollected}</div>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{razorpayStats.totalAmountCollected.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {razorpayStats.completedTransactions} {t.banking.payments}
                  </div>
                </div>

                <div className="bg-card rounded-xl p-5 border border-border">
                  <div className="text-muted-foreground text-sm mb-1">{t.banking.pending}</div>
                  <div className="text-2xl font-bold text-amber-600">
                    ₹{razorpayStats.totalAmountPending.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {razorpayStats.pendingTransactions} {t.banking.linksActive}
                  </div>
                </div>

                <div className="bg-card rounded-xl p-5 border border-border">
                  <div className="text-muted-foreground text-sm mb-1">{t.banking.successRate}</div>
                  <div className="text-2xl font-bold text-primary">
                    {razorpayStats.totalTransactions > 0
                      ? Math.round((razorpayStats.completedTransactions / razorpayStats.totalTransactions) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {razorpayStats.failedTransactions} {t.banking.failed}
                  </div>
                </div>

                <div className="bg-card rounded-xl p-5 border border-border">
                  <div className="text-muted-foreground text-sm mb-1">{t.banking.totalLinks}</div>
                  <div className="text-2xl font-bold">{razorpayStats.totalTransactions}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.banking.allTime}</div>
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard size={20} weight="duotone" className="text-indigo-600" />
                  {t.banking.paymentLinksAndTransactions}
                </h3>
              </div>

              {razorpayTransactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Link size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t.banking.noPaymentLinksYet}</p>
                  <p className="text-sm mt-1">{t.banking.generatePaymentLinks}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {razorpayTransactions.map((txn) => (
                        <motion.tr 
                          key={txn.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm">{txn.invoiceNumber}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {txn.razorpayPaymentLinkId?.slice(0, 12)}...
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">{txn.customerName || '-'}</div>
                            {txn.customerPhone && (
                              <div className="text-xs text-muted-foreground">{txn.customerPhone}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold">₹{txn.amount.toLocaleString('en-IN')}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium",
                              txn.status === 'completed' && "bg-green-100 text-green-700",
                              txn.status === 'pending' && "bg-amber-100 text-amber-700",
                              txn.status === 'processing' && "bg-blue-100 text-blue-700",
                              txn.status === 'failed' && "bg-red-100 text-red-700",
                              txn.status === 'refunded' && "bg-purple-100 text-purple-700"
                            )}>
                              {txn.status === 'completed' && '✓ Paid'}
                              {txn.status === 'pending' && '⏳ Pending'}
                              {txn.status === 'processing' && '⏳ Processing'}
                              {txn.status === 'failed' && '✗ Failed'}
                              {txn.status === 'refunded' && '↺ Refunded'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(txn.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {txn.shortUrl && (
                                <>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(txn.shortUrl!)
                                      toast.success('Link copied!')
                                    }}
                                    className="p-1.5 hover:bg-muted rounded transition-colors"
                                    title="Copy Link"
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <button
                                    onClick={() => window.open(txn.shortUrl, '_blank')}
                                    className="p-1.5 hover:bg-muted rounded transition-colors"
                                    title="Open Link"
                                  >
                                    <ArrowSquareOut size={16} />
                                  </button>
                                  {txn.customerPhone && txn.status === 'pending' && (
                                    <button
                                      onClick={() => {
                                        const message = encodeURIComponent(
                                          `Hi ${txn.customerName || ''},\n\nHere's your payment link for Invoice ${txn.invoiceNumber}:\n${txn.shortUrl}\n\nAmount: ₹${txn.amount.toLocaleString('en-IN')}`
                                        )
                                        window.open(`https://wa.me/${txn.customerPhone?.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
                                      }}
                                      className="p-1.5 hover:bg-green-100 text-green-600 rounded transition-colors"
                                      title="Send via WhatsApp"
                                    >
                                      <WhatsappLogo size={16} weight="fill" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loans Tab */}
        {selectedTab === 'loans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Loan Accounts</h3>
              <button
                onClick={() => setShowAddLoan(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                <Plus size={16} weight="bold" />
                Add Loan
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {accounts.loans.map((loan, index) => (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-lg shadow-lg border border-border p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold">{loan.name}</h4>
                      <p className="text-sm text-muted-foreground">{loan.bank}</p>
                    </div>
                    <CreditCard size={32} weight="duotone" className="text-primary" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Principal Amount</span>
                      <span className="font-medium">₹{loan.principal.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Outstanding</span>
                      <span className="font-bold text-destructive">₹{loan.outstanding.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Monthly EMI</span>
                      <span className="font-medium">₹{loan.emi.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Next Due Date</span>
                      <span className="font-medium text-warning">{formatDate(loan.nextDue)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${((loan.principal - loan.outstanding) / loan.principal) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {((loan.principal - loan.outstanding) / loan.principal * 100).toFixed(1)}% Paid
                    </p>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setSelectedLoan(loan)
                        setEmiPaymentAmount(loan.emi.toString())
                        setShowPayEMI(true)
                      }}
                      className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                    >
                      Pay EMI
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLoan(loan)
                        setShowLoanDetails(true)
                      }}
                      className="px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80"
                    >
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {selectedTab === 'transactions' && (
          <div className="bg-card rounded-lg shadow-lg border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <MagnifyingGlass size={20} weight="bold" className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={transactionSearchTerm}
                  onChange={(e) => setTransactionSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
            </div>
            <div className="divide-y divide-border">
              {transactions
                .filter(txn => {
                  if (!transactionSearchTerm.trim()) return true
                  const searchLower = transactionSearchTerm.toLowerCase()
                  return (
                    txn.description?.toLowerCase().includes(searchLower) ||
                    txn.account?.toLowerCase().includes(searchLower) ||
                    txn.amount?.toString().includes(searchLower) ||
                    txn.type?.toLowerCase().includes(searchLower)
                  )
                })
                .map((txn, index) => (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-3 rounded-lg",
                        txn.type === 'credit' ? "bg-success/10" : "bg-destructive/10"
                      )}>
                        <ArrowsLeftRight
                          size={20}
                          weight="duotone"
                          className={txn.type === 'credit' ? "text-success" : "text-destructive"}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">{txn.account}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(txn.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        txn.type === 'credit' ? "text-success" : "text-destructive"
                      )}>
                        {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <AnimatePresence>
        {showAddAccount && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddAccount(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddAccount(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md p-6"
              >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{t.banking.addBankAccount}</h3>
                <button
                  onClick={() => setShowAddAccount(false)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t.banking.bankName}</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    placeholder="e.g., HDFC Bank - Current"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t.banking.accountNumber}</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    placeholder="e.g., ****1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t.banking.accountType}</label>
                  <select
                    value={bankAccountType}
                    onChange={(e) => setBankAccountType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                  >
                    <option value="current">{t.banking.currentAccount}</option>
                    <option value="savings">{t.banking.savingsAccount}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t.banking.openingBalance} (₹)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleAddAccount}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                  >
                    {t.banking.addAccount}
                  </button>
                  <button
                    onClick={() => setShowAddAccount(false)}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80"
                  >
                    {t.banking.cancel}
                  </button>
                </div>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Cash In/Out Modal */}
      <AnimatePresence>
        {showCashModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCashModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {cashModalType === 'in' ? (
                      <>
                        <TrendUp size={20} weight="duotone" className="text-success" />
                        {t.banking.cashIn}
                      </>
                    ) : (
                      <>
                        <TrendDown size={20} weight="duotone" className="text-destructive" />
                        {t.banking.cashOut}
                      </>
                    )}
                  </h3>
                  <button
                    onClick={() => setShowCashModal(false)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t.banking.amountRs}</label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      placeholder={t.banking.enterAmount}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t.banking.description}</label>
                    <input
                      type="text"
                      value={cashDescription}
                      onChange={(e) => setCashDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                      placeholder="e.g., Petty cash expense"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleCashTransaction}
                      className={cn(
                        "flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors",
                        cashModalType === 'in'
                          ? "bg-success hover:bg-success/90"
                          : "bg-destructive hover:bg-destructive/90"
                      )}
                    >
                      {cashModalType === 'in' ? t.banking.addCash : t.banking.withdrawCash}
                    </button>
                    <button
                      onClick={() => setShowCashModal(false)}
                      className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80"
                    >
                      {t.banking.cancel}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Add Cheque Modal */}
      <AnimatePresence>
        {showAddCheque && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddCheque(false)
                setShowPartyDropdown(false)
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => {
                setShowAddCheque(false)
                setShowPartyDropdown(false)
                setEditingCheque(null)
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md p-4 sm:p-6 my-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-card pb-2">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Receipt size={20} weight="duotone" className="text-primary" />
                    {editingCheque ? 'Edit Cheque' : 'Add Cheque'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddCheque(false)
                      setShowPartyDropdown(false)
                      setEditingCheque(null)
                    }}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Two columns on mobile for Cheque Number and Amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Cheque No.</label>
                      <input
                        type="text"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        placeholder="CHQ001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={chequeAmount}
                        onChange={(e) => setChequeAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-1">Party Name</label>
                    <input
                      type="text"
                      value={chequeParty}
                      onChange={(e) => {
                        setChequeParty(e.target.value)
                        setShowPartyDropdown(true)
                      }}
                      onFocus={() => setShowPartyDropdown(true)}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                      placeholder="Search parties..."
                    />

                    {/* Filtered dropdown */}
                    {showPartyDropdown && allParties.filter(party =>
                      party?.name?.toLowerCase()?.includes(chequeParty.toLowerCase())
                    ).length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-36 overflow-y-auto">
                        {allParties
                          .filter(party => party?.name?.toLowerCase()?.includes(chequeParty.toLowerCase()))
                          .map((party) => (
                            <div
                              key={party.id}
                              onClick={() => {
                                setChequeParty(party.name)
                                setShowPartyDropdown(false)
                              }}
                              className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center text-sm"
                            >
                              <span className="font-medium">{party.name}</span>
                              {party.phone && <span className="text-xs text-muted-foreground">{party.phone}</span>}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Deposit Bank <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={chequeDepositBank}
                      onChange={(e) => setChequeDepositBank(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                    >
                      <option value="">-- Select Bank --</option>
                      {accounts.bankAccounts.map((account) => (
                        <option key={account.id} value={account.id.toString()}>
                          {account.name} - ₹{account.balance.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Two columns for Date and Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={chequeStatus}
                        onChange={(e) => setChequeStatus(e.target.value as 'pending' | 'cleared' | 'bounced')}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="cleared">Cleared</option>
                        <option value="bounced">Bounced</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleAddCheque}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      {editingCheque ? 'Update Cheque' : 'Add Cheque'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCheque(false)
                        setShowPartyDropdown(false)
                        setEditingCheque(null)
                      }}
                      className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* View Cheque Details Modal */}
      <AnimatePresence>
        {viewingCheque && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingCheque(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewingCheque(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Cheque Details</h3>
                  <button onClick={() => setViewingCheque(null)} className="p-2 hover:bg-muted rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Cheque Number</span>
                    <span className="font-medium">{viewingCheque.number}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-lg">₹{viewingCheque.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{formatDate(viewingCheque.date)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Party</span>
                    <span className="font-medium">{viewingCheque.party}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Status</span>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      viewingCheque.status === 'cleared' && "bg-success/10 text-success",
                      viewingCheque.status === 'pending' && "bg-warning/10 text-warning",
                      viewingCheque.status === 'bounced' && "bg-destructive/10 text-destructive"
                    )}>
                      {viewingCheque.status}
                    </span>
                  </div>
                  {viewingCheque.depositBankName && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Deposit Bank</span>
                      <span className="font-medium">{viewingCheque.depositBankName}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setViewingCheque(null)}
                  className="w-full mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                >
                  Close
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Add Loan Modal */}
      <AnimatePresence>
        {showAddLoan && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddLoan(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddLoan(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Add New Loan</h3>
                  <button onClick={() => setShowAddLoan(false)} className="p-2 hover:bg-muted rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Loan Name</label>
                    <input
                      type="text"
                      value={newLoanName}
                      onChange={(e) => setNewLoanName(e.target.value)}
                      placeholder="e.g., Business Loan"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank/Lender</label>
                    <input
                      type="text"
                      value={newLoanBank}
                      onChange={(e) => setNewLoanBank(e.target.value)}
                      placeholder="e.g., HDFC Bank"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Principal Amount</label>
                    <input
                      type="number"
                      value={newLoanPrincipal}
                      onChange={(e) => setNewLoanPrincipal(e.target.value)}
                      placeholder="500000"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Monthly EMI</label>
                    <input
                      type="number"
                      value={newLoanEMI}
                      onChange={(e) => setNewLoanEMI(e.target.value)}
                      placeholder="15000"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">First EMI Due Date</label>
                    <input
                      type="date"
                      value={newLoanDueDate}
                      onChange={(e) => setNewLoanDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleAddLoan}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                  >
                    Add Loan
                  </button>
                  <button
                    onClick={() => setShowAddLoan(false)}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Pay EMI Modal */}
      <AnimatePresence>
        {showPayEMI && selectedLoan && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowPayEMI(false); setSelectedLoan(null) }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowPayEMI(false); setSelectedLoan(null) }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Pay EMI</h3>
                  <button onClick={() => { setShowPayEMI(false); setSelectedLoan(null) }} className="p-2 hover:bg-muted rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <p className="font-medium">{selectedLoan.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedLoan.bank}</p>
                  <p className="text-sm mt-2">Outstanding: <span className="font-bold text-destructive">₹{selectedLoan.outstanding.toLocaleString()}</span></p>
                  <p className="text-sm">Monthly EMI: <span className="font-medium">₹{selectedLoan.emi.toLocaleString()}</span></p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Amount</label>
                    <input
                      type="number"
                      value={emiPaymentAmount}
                      onChange={(e) => setEmiPaymentAmount(e.target.value)}
                      placeholder={selectedLoan.emi.toString()}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pay From Account</label>
                    <select
                      value={emiPaymentAccount}
                      onChange={(e) => setEmiPaymentAccount(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    >
                      <option value="">Select Account</option>
                      <option value="Cash in Hand">Cash in Hand (₹{accounts.cashInHand.balance.toLocaleString()})</option>
                      {accounts.bankAccounts.map((acc: any) => (
                        <option key={acc.id} value={acc.name}>{acc.name} (₹{acc.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handlePayEMI}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                  >
                    Pay EMI
                  </button>
                  <button
                    onClick={() => { setShowPayEMI(false); setSelectedLoan(null) }}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Loan Details Modal */}
      <AnimatePresence>
        {showLoanDetails && selectedLoan && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowLoanDetails(false); setSelectedLoan(null) }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowLoanDetails(false); setSelectedLoan(null) }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Loan Details</h3>
                  <button onClick={() => { setShowLoanDetails(false); setSelectedLoan(null) }} className="p-2 hover:bg-muted rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Loan Name</span>
                    <span className="font-medium">{selectedLoan.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Bank/Lender</span>
                    <span className="font-medium">{selectedLoan.bank}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Principal Amount</span>
                    <span className="font-bold">₹{selectedLoan.principal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Outstanding Balance</span>
                    <span className="font-bold text-destructive">₹{selectedLoan.outstanding.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold text-success">₹{(selectedLoan.principal - selectedLoan.outstanding).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Monthly EMI</span>
                    <span className="font-medium">₹{selectedLoan.emi.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Next Due Date</span>
                    <span className="font-medium text-warning">{formatDate(selectedLoan.nextDue)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{((selectedLoan.principal - selectedLoan.outstanding) / selectedLoan.principal * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${((selectedLoan.principal - selectedLoan.outstanding) / selectedLoan.principal) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => {
                      setShowLoanDetails(false)
                      setEmiPaymentAmount(selectedLoan.emi.toString())
                      setShowPayEMI(true)
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                  >
                    Pay EMI
                  </button>
                  <button
                    onClick={() => { setShowLoanDetails(false); setSelectedLoan(null) }}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Dropdown Menu Portal */}
      {openActionMenu && dropdownPosition && createPortal(
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-[9999] min-w-[140px]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`
          }}
        >
          <button
            onClick={() => {
              const cheque = accounts.cheques.find((ch: any) => ch.id.toString() === openActionMenu)
              if (cheque) handleViewCheque(cheque)
              setOpenActionMenu(null)
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
          >
            <Eye size={14} />
            View
          </button>
          <button
            onClick={() => {
              const cheque = accounts.cheques.find((ch: any) => ch.id.toString() === openActionMenu)
              if (cheque) handleEditCheque(cheque)
              setOpenActionMenu(null)
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            onClick={() => {
              const chequeId = parseInt(openActionMenu || '')
              handleDeleteCheque(chequeId)
              setOpenActionMenu(null)
            }}
            className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 flex items-center gap-2 text-red-600"
          >
            <Trash size={14} />
            Delete
          </button>
        </div>,
        document.body
      )}

      {/* Click outside to close dropdown */}
      {openActionMenu && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setOpenActionMenu(null)}
        />
      )}
    </div>
  )
}

export default Banking
