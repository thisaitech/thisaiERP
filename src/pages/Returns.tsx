/**
 * Returns Page
 *
 * Manage sales and purchase returns
 */

import React, { useState, useEffect } from 'react'
import {
  Plus,
  ArrowUDownLeft,
  Download,
  Eye,
  Trash,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Calendar,
  Receipt
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import {
  getReturns,
  approveSalesReturn,
  completeSalesReturn,
  rejectSalesReturn,
  getReturnsSummary
} from '../services/returnsService'
import type { SalesReturn } from '../types'

const ReturnsPage = () => {
  const [returns, setReturns] = useState<SalesReturn[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState({
    totalReturns: 0,
    pendingReturns: 0,
    approvedReturns: 0,
    totalReturnValue: 0
  })

  // Load returns
  useEffect(() => {
    loadReturns()
    loadSummary()
  }, [])

  const loadReturns = async () => {
    setIsLoading(true)
    try {
      const data = await getReturns()
      setReturns(data)
    } catch (error) {
      console.error('Error loading returns:', error)
      toast.error('Failed to load returns')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      const data = await getReturnsSummary()
      setSummary(data)
    } catch (error) {
      console.error('Error loading summary:', error)
    }
  }

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this return? This will update inventory and create a credit note.')) return

    try {
      const success = await approveSalesReturn(id)
      if (success) {
        toast.success('Return approved! Inventory updated and credit note created.')
        loadReturns()
        loadSummary()
      } else {
        toast.error('Failed to approve return')
      }
    } catch (error) {
      toast.error('Error approving return')
    }
  }

  const handleComplete = async (id: string) => {
    if (!confirm('Mark this return as completed?')) return

    try {
      const success = await completeSalesReturn(id)
      if (success) {
        toast.success('Return marked as completed')
        loadReturns()
        loadSummary()
      } else {
        toast.error('Failed to complete return')
      }
    } catch (error) {
      toast.error('Error completing return')
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this return?')) return

    try {
      const success = await rejectSalesReturn(id)
      if (success) {
        toast.success('Return rejected')
        loadReturns()
        loadSummary()
      } else {
        toast.error('Failed to reject return')
      }
    } catch (error) {
      toast.error('Error rejecting return')
    }
  }

  const filteredReturns = returns.filter(ret => {
    const matchesSearch =
      ret.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.originalInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || ret.status === filterStatus
    const matchesAction = filterAction === 'all' || ret.action === filterAction

    return matchesSearch && matchesStatus && matchesAction
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success'
      case 'approved':
        return 'bg-primary/10 text-primary'
      case 'pending':
        return 'bg-warning/10 text-warning'
      case 'rejected':
        return 'bg-destructive/10 text-destructive'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'refund':
        return 'bg-success/10 text-success'
      case 'replacement':
        return 'bg-primary/10 text-primary'
      case 'store_credit':
        return 'bg-warning/10 text-warning'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-warning via-primary to-warning/80 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUDownLeft size={32} weight="duotone" className="text-white" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Sales Returns</h1>
          </div>
          <p className="text-white/80 text-sm">Manage product returns and refunds</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg shadow-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Returns</p>
            <p className="text-2xl font-bold">{summary.totalReturns}</p>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-warning">{summary.pendingReturns}</p>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Approved</p>
            <p className="text-2xl font-bold text-success">{summary.approvedReturns}</p>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Value</p>
            <p className="text-2xl font-bold text-destructive">₹{summary.totalReturnValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-card rounded-lg shadow-lg border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Search by return number, customer, or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg"
            >
              <option value="all">All Actions</option>
              <option value="refund">Refund</option>
              <option value="replacement">Replacement</option>
              <option value="store_credit">Store Credit</option>
            </select>
          </div>
        </div>

        {/* Returns List */}
        <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Return Number</th>
                  <th className="text-left p-3 text-sm font-semibold">Date</th>
                  <th className="text-left p-3 text-sm font-semibold">Customer</th>
                  <th className="text-left p-3 text-sm font-semibold">Original Invoice</th>
                  <th className="text-left p-3 text-sm font-semibold">Reason</th>
                  <th className="text-left p-3 text-sm font-semibold">Action</th>
                  <th className="text-right p-3 text-sm font-semibold">Amount</th>
                  <th className="text-center p-3 text-sm font-semibold">Status</th>
                  <th className="text-center p-3 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No returns found
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => (
                    <tr key={ret.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-semibold">{ret.returnNumber}</p>
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(ret.returnDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-3 text-sm">{ret.customerName}</td>
                      <td className="p-3 text-sm font-medium">{ret.originalInvoiceNumber}</td>
                      <td className="p-3 text-sm capitalize">{ret.reason.replace('_', ' ')}</td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getActionColor(ret.action)
                        )}>
                          {ret.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">₹{ret.totalAmount.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getStatusColor(ret.status)
                        )}>
                          {ret.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedReturn(ret)
                              setShowViewModal(true)
                            }}
                            className="p-2 hover:bg-muted rounded-lg"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {ret.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(ret.id)}
                                className="p-2 hover:bg-success/10 text-success rounded-lg"
                                title="Approve"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleReject(ret.id)}
                                className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                                title="Reject"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          {ret.status === 'approved' && (
                            <button
                              onClick={() => handleComplete(ret.id)}
                              className="p-2 hover:bg-primary/10 text-primary rounded-lg"
                              title="Complete"
                            >
                              <CheckCircle size={18} weight="fill" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {showViewModal && selectedReturn && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 sm:inset-8 lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:inset-auto w-auto lg:w-full lg:max-w-3xl h-auto lg:max-h-[85vh] bg-card text-card-foreground rounded-xl shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                <h2 className="text-xl font-bold">Return Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Return Number</p>
                    <p className="font-semibold">{selectedReturn.returnNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Return Date</p>
                    <p className="font-semibold">
                      {new Date(selectedReturn.returnDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                    <p className="font-semibold">{selectedReturn.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Original Invoice</p>
                    <p className="font-semibold">{selectedReturn.originalInvoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-semibold capitalize">{selectedReturn.reason.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Action</p>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium inline-block",
                      getActionColor(selectedReturn.action)
                    )}>
                      {selectedReturn.action.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium inline-block",
                      getStatusColor(selectedReturn.status)
                    )}>
                      {selectedReturn.status}
                    </span>
                  </div>
                  {selectedReturn.creditNoteId && (
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Note</p>
                      <p className="font-semibold text-success">{selectedReturn.creditNoteId}</p>
                    </div>
                  )}
                </div>

                {/* Reason Description */}
                {selectedReturn.reasonDescription && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg">{selectedReturn.reasonDescription}</p>
                  </div>
                )}

                {/* Returned Items */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Returned Items</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Item</th>
                          <th className="text-right p-3 text-sm font-semibold">Qty</th>
                          <th className="text-right p-3 text-sm font-semibold">Rate</th>
                          <th className="text-right p-3 text-sm font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReturn.items.map((item, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="p-3 text-sm">{item.itemName}</td>
                            <td className="p-3 text-sm text-right">{item.quantityReturned}</td>
                            <td className="p-3 text-sm text-right">₹{item.rate.toLocaleString()}</td>
                            <td className="p-3 text-sm text-right font-semibold">₹{item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Total Return Amount:</span>
                    <span className="text-2xl font-bold text-destructive">₹{selectedReturn.totalAmount.toLocaleString()}</span>
                  </div>
                  {selectedReturn.refundAmount !== undefined && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Refund Amount:</span>
                      <span className="font-semibold text-success">₹{selectedReturn.refundAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {selectedReturn.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleApprove(selectedReturn.id)
                          setShowViewModal(false)
                        }}
                        className="flex-1 px-4 py-3 bg-success text-white rounded-lg font-medium hover:bg-success/90 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={20} />
                        Approve Return
                      </button>
                      <button
                        onClick={() => {
                          handleReject(selectedReturn.id)
                          setShowViewModal(false)
                        }}
                        className="flex-1 px-4 py-3 bg-destructive text-white rounded-lg font-medium hover:bg-destructive/90 flex items-center justify-center gap-2"
                      >
                        <XCircle size={20} />
                        Reject
                      </button>
                    </>
                  )}
                  {selectedReturn.status === 'approved' && (
                    <button
                      onClick={() => {
                        handleComplete(selectedReturn.id)
                        setShowViewModal(false)
                      }}
                      className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} weight="fill" />
                      Mark as Completed
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ReturnsPage
