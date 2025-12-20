/**
 * Credit Notes Page
 *
 * Manage credit notes (for sales returns) and debit notes (for purchase returns)
 */

import React, { useState, useEffect } from 'react'
import {
  Plus,
  Receipt,
  Download,
  Eye,
  Trash,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUDownLeft,
  FileText,
  Calendar
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { getCreditNotes, approveCreditNote, cancelCreditNote, deleteCreditNote } from '../services/creditNoteService'
import type { CreditNote } from '../types'
import { useErrorHandler } from '../hooks/useErrorHandler'

const CreditNotesPage = () => {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { handleError } = useErrorHandler()

  // Load credit notes
  useEffect(() => {
    loadCreditNotes()
  }, [])

  const loadCreditNotes = async () => {
    setIsLoading(true)
    try {
      const notes = await getCreditNotes()
      setCreditNotes(notes)
    } catch (error) {
      handleError(error, 'CreditNotesPage.loadCreditNotes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const success = await approveCreditNote(id)
      if (success) {
        toast.success('Credit note approved successfully!')
        loadCreditNotes()
      } else {
        toast.error('Failed to approve credit note')
      }
    } catch (error) {
      handleError(error, 'CreditNotesPage.handleApprove')
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this credit note?')) return

    try {
      const success = await cancelCreditNote(id)
      if (success) {
        toast.success('Credit note cancelled')
        loadCreditNotes()
      } else {
        toast.error('Failed to cancel credit note')
      }
    } catch (error) {
      handleError(error, 'CreditNotesPage.handleCancel')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit note?')) return

    try {
      const success = await deleteCreditNote(id)
      if (success) {
        toast.success('Credit note deleted')
        loadCreditNotes()
      } else {
        toast.error('Failed to delete credit note')
      }
    } catch (error) {
      handleError(error, 'CreditNotesPage.handleDelete')
    }
  }

  const filteredNotes = creditNotes.filter(note => {
    const matchesSearch =
      note.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.originalInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || note.status === filterStatus
    const matchesType = filterType === 'all' || note.type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const stats = {
    total: creditNotes.length,
    draft: creditNotes.filter(n => n.status === 'draft').length,
    approved: creditNotes.filter(n => n.status === 'approved').length,
    totalAmount: creditNotes
      .filter(n => n.status === 'approved')
      .reduce((sum, n) => sum + n.grandTotal, 0)
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-destructive via-warning to-destructive/80 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Credit & Debit Notes</h1>
          <p className="text-white/80 text-sm">Manage credit notes for returns and adjustments</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg shadow-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Notes</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Draft</p>
            <p className="text-2xl font-bold text-warning">{stats.draft}</p>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Approved</p>
            <p className="text-2xl font-bold text-success">{stats.approved}</p>
          </div>
          <div className="bg-card rounded-lg shadow-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Value</p>
            <p className="text-2xl font-bold text-primary">₹{stats.totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-card rounded-lg shadow-lg border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Search by number, party, or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit Notes (Sales Return)</option>
              <option value="debit">Debit Notes (Purchase Return)</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Credit Notes List */}
        <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Note Number</th>
                  <th className="text-left p-3 text-sm font-semibold">Date</th>
                  <th className="text-left p-3 text-sm font-semibold">Type</th>
                  <th className="text-left p-3 text-sm font-semibold">Party</th>
                  <th className="text-left p-3 text-sm font-semibold">Original Invoice</th>
                  <th className="text-left p-3 text-sm font-semibold">Reason</th>
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
                ) : filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No credit notes found
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((note) => (
                    <tr key={note.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-semibold">{note.creditNoteNumber}</p>
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(note.creditNoteDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          note.type === 'credit'
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/10 text-warning"
                        )}>
                          {note.type === 'credit' ? 'Credit Note' : 'Debit Note'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{note.partyName}</td>
                      <td className="p-3 text-sm font-medium">{note.originalInvoiceNumber}</td>
                      <td className="p-3 text-sm capitalize">{note.reason.replace('_', ' ')}</td>
                      <td className="p-3 text-right font-semibold">₹{note.grandTotal.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          note.status === 'approved'
                            ? "bg-success/10 text-success"
                            : note.status === 'draft'
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {note.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedNote(note)
                              setShowViewModal(true)
                            }}
                            className="p-2 hover:bg-muted rounded-lg"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {note.status === 'draft' && (
                            <button
                              onClick={() => handleApprove(note.id)}
                              className="p-2 hover:bg-success/10 text-success rounded-lg"
                              title="Approve"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {note.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancel(note.id)}
                              className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                              title="Cancel"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                            title="Delete"
                          >
                            <Trash size={18} />
                          </button>
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
        {showViewModal && selectedNote && (
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
              className="fixed inset-4 sm:inset-8 lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:inset-auto w-auto lg:w-full lg:max-w-2xl h-auto lg:max-h-[85vh] bg-card text-card-foreground rounded-xl shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold">Credit Note Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Note Number</p>
                    <p className="font-semibold">{selectedNote.creditNoteNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">
                      {new Date(selectedNote.creditNoteDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Party Name</p>
                    <p className="font-semibold">{selectedNote.partyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Original Invoice</p>
                    <p className="font-semibold">{selectedNote.originalInvoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-semibold capitalize">{selectedNote.reason.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium inline-block",
                      selectedNote.status === 'approved'
                        ? "bg-success/10 text-success"
                        : selectedNote.status === 'draft'
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {selectedNote.status}
                    </span>
                  </div>
                </div>

                {selectedNote.reasonDescription && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedNote.reasonDescription}</p>
                  </div>
                )}

                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">₹{selectedNote.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">₹{selectedNote.totalTaxAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold text-primary">₹{selectedNote.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {selectedNote.status === 'draft' && (
                  <button
                    onClick={() => {
                      handleApprove(selectedNote.id)
                      setShowViewModal(false)
                    }}
                    className="w-full px-4 py-3 bg-success text-white rounded-lg font-medium hover:bg-success/90"
                  >
                    Approve Credit Note
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CreditNotesPage
