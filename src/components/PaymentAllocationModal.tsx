// Payment Allocation Modal Component
// Handles Payment In (from customers) and Payment Out (to suppliers)
// Vyapar/Zoho style with auto/manual allocation

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  MagnifyingGlass,
  CurrencyInr,
  CheckCircle,
  WarningCircle,
  Lightning,
  PencilSimple,
  Receipt,
  ArrowRight,
  User,
  Buildings,
  Calendar,
  Bank,
  CreditCard,
  Money,
  QrCode,
  Check,
  CaretDown,
  Info,
  Wallet
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { getPartiesWithOutstanding } from '../services/partyService'
import type { Party } from '../types'
import {
  getPartyPaymentSummary,
  calculateAutoAllocation,
  createAllocatedPayment,
  getPartyAdvance,
  type PartyPaymentSummary,
  type PendingDocument,
  type AllocationInput,
  type PaymentType,
  type PartyType,
  type AllocationMode
} from '../services/paymentAllocationService'

interface PaymentAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'IN' | 'OUT' // IN = Payment from customer, OUT = Payment to supplier
  preSelectedPartyId?: string
  onSuccess?: () => void
}

interface AllocationRow {
  docId: string
  docNumber: string
  date: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  allocateAmount: number
  selected: boolean
}

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: Money },
  { value: 'upi', label: 'UPI', icon: QrCode },
  { value: 'bank', label: 'Bank Transfer', icon: Bank },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'cheque', label: 'Cheque', icon: Receipt }
] as const

export default function PaymentAllocationModal({
  isOpen,
  onClose,
  type,
  preSelectedPartyId,
  onSuccess
}: PaymentAllocationModalProps) {
  // Party selection
  const [parties, setParties] = useState<Party[]>([])
  const [partySearch, setPartySearch] = useState('')
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [showPartyDropdown, setShowPartyDropdown] = useState(false)
  const [loadingParties, setLoadingParties] = useState(false)

  // Payment details
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'card' | 'cheque'>('cash')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')

  // Allocation
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('AUTO')
  const [partySummary, setPartySummary] = useState<PartyPaymentSummary | null>(null)
  const [allocations, setAllocations] = useState<AllocationRow[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false)

  const partyType: PartyType = type === 'IN' ? 'CUSTOMER' : 'SUPPLIER'
  const partyFilterType = type === 'IN' ? 'customer' : 'supplier'
  const docLabel = type === 'IN' ? 'Invoice' : 'Purchase Bill'
  const modalTitle = type === 'IN' ? 'Receive Payment' : 'Make Payment'
  const modalSubtitle = type === 'IN' ? 'Record payment received from customer' : 'Record payment made to supplier'

  // Load parties on mount
  useEffect(() => {
    if (isOpen) {
      loadParties()
    }
  }, [isOpen])

  // Pre-select party if provided
  useEffect(() => {
    if (preSelectedPartyId && parties.length > 0) {
      const party = parties.find(p => p.id === preSelectedPartyId)
      if (party) {
        handleSelectParty(party)
      }
    }
  }, [preSelectedPartyId, parties])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const loadParties = async () => {
    setLoadingParties(true)
    try {
      const allParties = await getPartiesWithOutstanding()
      // Filter by type (customer/supplier/both)
      const filtered = allParties.filter(p =>
        p.type === partyFilterType || p.type === 'both'
      )
      setParties(filtered)
    } catch (error) {
      console.error('Failed to load parties:', error)
      toast.error('Failed to load parties')
    } finally {
      setLoadingParties(false)
    }
  }

  const loadPartySummary = async (partyId: string, partyDisplayName?: string) => {
    setLoadingDocs(true)
    try {
      const summary = await getPartyPaymentSummary(partyId, partyType, partyDisplayName)
      setPartySummary(summary)

      // Initialize allocation rows
      const rows: AllocationRow[] = summary.pendingDocs.map(doc => ({
        docId: doc.id,
        docNumber: doc.docNumber,
        date: doc.date,
        totalAmount: doc.totalAmount,
        paidAmount: doc.paidAmount,
        dueAmount: doc.dueAmount,
        allocateAmount: 0,
        selected: false
      }))
      setAllocations(rows)
    } catch (error) {
      console.error('Failed to load party summary:', error)
      toast.error('Failed to load pending documents')
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleSelectParty = (party: Party) => {
    setSelectedParty(party)
    setPartySearch(party.displayName || party.companyName)
    setShowPartyDropdown(false)
    // Pass party name for matching invoices by name (not just ID)
    loadPartySummary(party.id, party.displayName || party.companyName || party.name)
  }

  const resetForm = () => {
    setSelectedParty(null)
    setPartySearch('')
    setPaymentAmount('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentMode('cash')
    setReferenceNo('')
    setNotes('')
    setAllocationMode('AUTO')
    setPartySummary(null)
    setAllocations([])
  }

  // Filter parties based on search
  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return parties
    const search = partySearch.toLowerCase()
    return parties.filter(p =>
      (p.displayName?.toLowerCase().includes(search)) ||
      (p.companyName?.toLowerCase().includes(search)) ||
      (p.phone?.includes(search))
    )
  }, [parties, partySearch])

  // Auto allocate when amount changes (in AUTO mode)
  useEffect(() => {
    if (allocationMode === 'AUTO' && partySummary && paymentAmount) {
      const amount = parseFloat(paymentAmount) || 0
      if (amount > 0) {
        const { allocations: autoAllocs } = calculateAutoAllocation(amount, partySummary.pendingDocs)

        // Update allocation rows with rounded amounts
        setAllocations(prev => prev.map(row => {
          const alloc = autoAllocs.find(a => a.docId === row.docId)
          return {
            ...row,
            allocateAmount: alloc ? Math.round(alloc.amount * 100) / 100 : 0,
            selected: !!alloc
          }
        }))
      } else {
        // Reset allocations
        setAllocations(prev => prev.map(row => ({
          ...row,
          allocateAmount: 0,
          selected: false
        })))
      }
    }
  }, [paymentAmount, allocationMode, partySummary])

  // Handle manual allocation change
  const handleAllocationChange = (docId: string, value: string) => {
    const amount = parseFloat(value) || 0
    setAllocations(prev => prev.map(row => {
      if (row.docId === docId) {
        // Round to 2 decimal places to avoid floating point issues
        const allocAmount = Math.round(Math.min(amount, row.dueAmount) * 100) / 100
        return {
          ...row,
          allocateAmount: allocAmount,
          selected: allocAmount > 0
        }
      }
      return row
    }))
  }

  // Handle checkbox toggle
  const handleToggleSelection = (docId: string) => {
    setAllocations(prev => prev.map(row => {
      if (row.docId === docId) {
        if (row.selected) {
          return { ...row, selected: false, allocateAmount: 0 }
        } else {
          // Round to 2 decimal places
          return { ...row, selected: true, allocateAmount: Math.round(row.dueAmount * 100) / 100 }
        }
      }
      return row
    }))
  }

  // Calculate totals - round to 2 decimal places
  const totalAllocated = useMemo(() =>
    Math.round(allocations.reduce((sum, row) => sum + row.allocateAmount, 0) * 100) / 100
  , [allocations])

  const paymentAmountNum = Math.round((parseFloat(paymentAmount) || 0) * 100) / 100
  const unallocatedAmount = Math.round((paymentAmountNum - totalAllocated) * 100) / 100
  const isAdvance = unallocatedAmount > 0

  // Validation
  const canSubmit = useMemo(() => {
    if (!selectedParty) return false
    if (paymentAmountNum <= 0) return false
    if (totalAllocated > paymentAmountNum + 0.01) return false
    return true
  }, [selectedParty, paymentAmountNum, totalAllocated])

  // Submit payment
  const handleSubmit = async () => {
    if (!canSubmit || !selectedParty) return

    setIsSubmitting(true)
    try {
      const allocationInputs: AllocationInput[] = allocations
        .filter(row => row.allocateAmount > 0)
        .map(row => ({
          docType: type === 'IN' ? 'INVOICE' : 'PURCHASE',
          docId: row.docId,
          docNumber: row.docNumber,
          amount: Math.round(row.allocateAmount * 100) / 100 // Ensure 2 decimal places
        }))

      const result = await createAllocatedPayment({
        type,
        partyType,
        partyId: selectedParty.id,
        partyName: selectedParty.displayName || selectedParty.companyName,
        amount: paymentAmountNum,
        date: paymentDate,
        mode: paymentMode,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
        allocationMode,
        allocations: allocationInputs
      })

      // Show success message
      const allocCount = result.payment.allocations.length
      const advanceMsg = result.advanceCreated > 0
        ? ` | Advance: ${formatCurrency(result.advanceCreated)}`
        : ''
      toast.success(
        `Payment recorded! Allocated to ${allocCount} ${docLabel}${allocCount !== 1 ? 's' : ''}${advanceMsg}`
      )

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Failed to create payment:', error)
      toast.error(error.message || 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          style={{ overflow: 'visible' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            "px-6 py-4 border-b flex items-center justify-between",
            type === 'IN' ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                {type === 'IN' ? <CurrencyInr size={24} className="text-white" weight="bold" /> : <Wallet size={24} className="text-white" weight="bold" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{modalTitle}</h2>
                <p className="text-white/80 text-sm">{modalSubtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Party Selection - Outside scrollable area with proper overflow */}
          <div className="px-6 pt-6 pb-2 relative" style={{ zIndex: 9999, overflow: 'visible' }}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                {type === 'IN' ? 'Customer' : 'Supplier'} *
              </label>
              <div className="relative" style={{ overflow: 'visible' }}>
                <div className="relative">
                  <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={partySearch}
                    onChange={e => {
                      setPartySearch(e.target.value)
                      setShowPartyDropdown(true)
                      if (!e.target.value) setSelectedParty(null)
                    }}
                    onFocus={() => setShowPartyDropdown(true)}
                    placeholder={`Search ${type === 'IN' ? 'customer' : 'supplier'}...`}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  {selectedParty && (
                    <CheckCircle size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" weight="fill" />
                  )}
                </div>

                {/* Party Dropdown - Fixed overlay positioning */}
                <AnimatePresence>
                  {showPartyDropdown && filteredParties.length > 0 && !selectedParty && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto"
                      style={{ zIndex: 99999, position: 'absolute', top: '100%' }}
                    >
                      {filteredParties.map(party => (
                        <button
                          key={party.id}
                          onClick={() => handleSelectParty(party)}
                          className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors"
                        >
                          <span className="font-medium text-slate-800 truncate">
                            {party.displayName || party.companyName}
                          </span>
                          {(party.outstanding || party.currentBalance) !== 0 && (
                            <span className={cn(
                              "text-sm font-semibold ml-2 flex-shrink-0",
                              (party.outstanding || party.currentBalance || 0) > 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                              {formatCurrency(Math.abs(party.outstanding || party.currentBalance || 0))}
                            </span>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 280px)' }}>
            <div className="px-6 pb-6 space-y-6">
              {/* Party Summary Card */}
              {selectedParty && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200"
                >
                  {/* Customer/Supplier Details */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        {type === 'IN' ? <User size={24} className="text-blue-600" /> : <Buildings size={24} className="text-blue-600" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{selectedParty.displayName || selectedParty.companyName}</h3>
                        {selectedParty.phone && (
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <span>📞</span> {selectedParty.phone}
                          </p>
                        )}
                        {(selectedParty.gstin || selectedParty.gstDetails?.gstin) && (
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <span>🏷️</span> GST: {selectedParty.gstin || selectedParty.gstDetails?.gstin}
                          </p>
                        )}
                        {selectedParty.email && (
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <span>✉️</span> {selectedParty.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedParty(null)
                        setPartySearch('')
                        setPartySummary(null)
                        setAllocations([])
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Change
                    </button>
                  </div>

                  {/* Balance Summary */}
                  {(() => {
                    // Calculate actual total from pending invoices
                    const totalFromInvoices = partySummary?.totalDue || 0
                    // Party's recorded outstanding balance
                    const partyOutstanding = selectedParty.outstanding || selectedParty.currentBalance || 0
                    // Difference (could be opening balance or unlinked transactions)
                    const openingBalanceDiff = Math.round((partyOutstanding - totalFromInvoices) * 100) / 100

                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">Total Due</p>
                          <p className={cn(
                            "text-lg font-bold",
                            totalFromInvoices > 0 ? "text-red-600" : "text-slate-600"
                          )}>
                            {formatCurrency(totalFromInvoices)}
                            {totalFromInvoices > 0 && <span className="text-xs ml-1">(To Receive)</span>}
                          </p>
                          {openingBalanceDiff > 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                              +{formatCurrency(openingBalanceDiff)} opening bal.
                            </p>
                          )}
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">Pending {docLabel}s</p>
                          <p className="text-lg font-bold text-slate-800">{partySummary?.pendingDocs.length || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">{type === 'IN' ? 'Credit Balance' : 'Advance Paid'}</p>
                          <p className="text-lg font-bold text-emerald-600">{formatCurrency(partySummary?.advanceBalance || 0)}</p>
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>
              )}

              {/* Payment Details */}
              {selectedParty && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Payment Amount *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-semibold"
                      />
                    </div>
                    {partySummary && partySummary.totalDue > 0 && (
                      <button
                        onClick={() => setPaymentAmount(partySummary.totalDue.toFixed(2))}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Pay full due: {formatCurrency(partySummary.totalDue)}
                      </button>
                    )}
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Payment Date *</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Mode */}
              {selectedParty && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Payment Mode</label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_MODES.map(mode => (
                      <button
                        key={mode.value}
                        onClick={() => setPaymentMode(mode.value)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                          paymentMode === mode.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        )}
                      >
                        <mode.icon size={18} weight={paymentMode === mode.value ? "fill" : "regular"} />
                        <span className="font-medium text-sm">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference & Notes */}
              {selectedParty && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Reference No.</label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={e => setReferenceNo(e.target.value)}
                      placeholder="UTR / Cheque No. / Transaction ID"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Notes</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Optional notes..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Pending Invoices Section - Always show when customer has pending invoices */}
              {selectedParty && partySummary && partySummary.pendingDocs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Pending {docLabel}s ({partySummary.pendingDocs.length})
                    </label>
                    {paymentAmountNum > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAllocationMode('AUTO')}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            allocationMode === 'AUTO'
                              ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                              : "bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200"
                          )}
                        >
                          <Lightning size={16} weight="fill" />
                          Auto (FIFO)
                        </button>
                        <button
                          onClick={() => setAllocationMode('MANUAL')}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            allocationMode === 'MANUAL'
                              ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                              : "bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200"
                          )}
                        >
                          <PencilSimple size={16} weight="fill" />
                          Manual
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pending Invoices Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          {paymentAmountNum > 0 && (
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-10">
                              <Check size={14} />
                            </th>
                          )}
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{docLabel} No.</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Paid</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-red-600 uppercase tracking-wider">Due</th>
                          {paymentAmountNum > 0 && (
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-blue-600 uppercase tracking-wider w-28">Pay Now</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allocations.map(row => {
                          const paidPercent = row.totalAmount > 0 ? (row.paidAmount / row.totalAmount) * 100 : 0
                          const status = row.dueAmount <= 0 ? 'Paid' : paidPercent > 0 ? 'Partial' : 'Pending'

                          return (
                            <tr key={row.docId} className={cn(
                              "transition-colors",
                              row.selected && paymentAmountNum > 0 ? "bg-blue-50" : "hover:bg-slate-50"
                            )}>
                              {paymentAmountNum > 0 && (
                                <td className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={row.selected}
                                    onChange={() => {
                                      if (allocationMode === 'MANUAL') {
                                        handleToggleSelection(row.docId)
                                      }
                                    }}
                                    disabled={allocationMode === 'AUTO'}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2.5">
                                <span className="font-semibold text-slate-800">{row.docNumber}</span>
                              </td>
                              <td className="px-3 py-2.5 text-sm text-slate-600">{formatDate(row.date)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-semibold",
                                  status === 'Paid' && "bg-emerald-100 text-emerald-700",
                                  status === 'Partial' && "bg-amber-100 text-amber-700",
                                  status === 'Pending' && "bg-red-100 text-red-700"
                                )}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-800">{formatCurrency(row.totalAmount)}</td>
                              <td className="px-3 py-2.5 text-right text-sm text-emerald-600">{formatCurrency(row.paidAmount)}</td>
                              <td className="px-3 py-2.5 text-right text-sm font-bold text-red-600">{formatCurrency(row.dueAmount)}</td>
                              {paymentAmountNum > 0 && (
                                <td className="px-3 py-2.5 text-right">
                                  {allocationMode === 'MANUAL' ? (
                                    <input
                                      type="number"
                                      value={row.allocateAmount > 0 ? row.allocateAmount.toFixed(2) : ''}
                                      onChange={e => handleAllocationChange(row.docId, e.target.value)}
                                      max={row.dueAmount}
                                      min={0}
                                      step="0.01"
                                      placeholder="0.00"
                                      className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-right text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                  ) : (
                                    <span className={cn(
                                      "font-bold text-sm",
                                      row.allocateAmount > 0 ? "text-blue-600" : "text-slate-300"
                                    )}>
                                      {row.allocateAmount > 0 ? formatCurrency(row.allocateAmount) : '-'}
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                      {/* Table Footer with Totals */}
                      <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                        <tr>
                          {paymentAmountNum > 0 && <td className="px-3 py-2.5"></td>}
                          <td colSpan={2} className="px-3 py-2.5 text-sm font-bold text-slate-700">Total</td>
                          <td className="px-3 py-2.5"></td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-800">
                            {formatCurrency(allocations.reduce((sum, r) => sum + r.totalAmount, 0))}
                          </td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-emerald-600">
                            {formatCurrency(allocations.reduce((sum, r) => sum + r.paidAmount, 0))}
                          </td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-red-600">
                            {formatCurrency(allocations.reduce((sum, r) => sum + r.dueAmount, 0))}
                          </td>
                          {paymentAmountNum > 0 && (
                            <td className="px-3 py-2.5 text-right text-sm font-bold text-blue-600">
                              {formatCurrency(totalAllocated)}
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Allocation Summary - Only show when entering payment */}
                  {paymentAmountNum > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 space-y-2 border border-blue-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Payment Amount:</span>
                        <span className="font-bold text-slate-800">{formatCurrency(paymentAmountNum)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Allocated to Invoices:</span>
                        <span className="font-bold text-blue-600">{formatCurrency(totalAllocated)}</span>
                      </div>
                      {paymentAmountNum > totalAllocated && (
                        <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                          <span className="text-amber-700 flex items-center gap-1">
                            <Info size={14} />
                            Unallocated (Credit Balance):
                          </span>
                          <span className="font-bold text-amber-600">{formatCurrency(paymentAmountNum - totalAllocated)}</span>
                        </div>
                      )}
                      {totalAllocated > paymentAmountNum && (
                        <div className="flex justify-between text-sm pt-2 border-t border-red-200">
                          <span className="text-red-700 flex items-center gap-1">
                            <WarningCircle size={14} />
                            Over-allocated:
                          </span>
                          <span className="font-bold text-red-600">{formatCurrency(totalAllocated - paymentAmountNum)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Pay Buttons - Show when invoices exist but no amount entered */}
              {selectedParty && partySummary && partySummary.pendingDocs.length > 0 && paymentAmountNum === 0 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setPaymentAmount(partySummary.totalDue.toFixed(2))}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-200 transition-colors"
                  >
                    Pay Full Due: {formatCurrency(partySummary.totalDue)}
                  </button>
                  {allocations.length > 0 && allocations[0].dueAmount < partySummary.totalDue && (
                    <button
                      onClick={() => setPaymentAmount(allocations[0].dueAmount.toFixed(2))}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"
                    >
                      Pay First Invoice: {formatCurrency(allocations[0].dueAmount)}
                    </button>
                  )}
                </div>
              )}

              
              {/* No pending docs message */}
              {selectedParty && partySummary && partySummary.pendingDocs.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <WarningCircle size={24} className="text-amber-500 flex-shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <p className="font-medium text-amber-800">No pending {docLabel.toLowerCase()}s found</p>
                    <p className="text-sm text-amber-600 mt-1">
                      {(() => {
                        const outstandingAmount = selectedParty.outstanding || selectedParty.currentBalance || 0
                        if (outstandingAmount > 0) {
                          // Customer owes us money (To Receive)
                          return (
                            <>
                              The outstanding balance of {formatCurrency(outstandingAmount)} is from opening balance or previous transactions (not linked to specific invoices).
                              {paymentAmountNum > 0
                                ? ` This payment of ${formatCurrency(paymentAmountNum)} will reduce their outstanding balance.`
                                : ' Enter a payment amount to reduce this balance.'
                              }
                            </>
                          )
                        } else if (outstandingAmount < 0) {
                          // We owe customer money (To Pay / Credit)
                          return (
                            <>
                              This {type === 'IN' ? 'customer' : 'supplier'} has a credit balance of {formatCurrency(Math.abs(outstandingAmount))} (you owe them).
                              {paymentAmountNum > 0
                                ? ` Recording this payment will increase their credit balance.`
                                : ` Any payment received will increase their credit balance.`
                              }
                            </>
                          )
                        } else {
                          return paymentAmountNum > 0
                            ? `The entire payment of ${formatCurrency(paymentAmountNum)} will be recorded as ${type === 'IN' ? 'credit balance' : 'advance'}.`
                            : `Enter a payment amount to record ${type === 'IN' ? 'credit' : 'advance'} for this ${type === 'IN' ? 'customer' : 'supplier'}.`
                        }
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={cn(
                "px-8 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all",
                canSubmit && !isSubmitting
                  ? type === 'IN'
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={20} weight="fill" />
                  {type === 'IN' ? 'Receive Payment' : 'Make Payment'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
