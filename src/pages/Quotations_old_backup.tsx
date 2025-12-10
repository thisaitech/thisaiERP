import React, { useState } from 'react'
import {
  Plus,
  FileText,
  Eye,
  PaperPlaneTilt,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Copy,
  Trash,
  MagnifyingGlass,
  Funnel,
  Calendar,
  CurrencyCircleDollar
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

const Quotations = () => {
  const [showNewQuotation, setShowNewQuotation] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const quotations = [
    {
      id: 'QUO-001',
      customer: 'Rajesh Kumar',
      amount: 45000,
      date: '2024-01-15',
      validUntil: '2024-02-15',
      status: 'sent',
      items: 3
    },
    {
      id: 'QUO-002',
      customer: 'Priya Sharma',
      amount: 28500,
      date: '2024-01-14',
      validUntil: '2024-02-14',
      status: 'accepted',
      items: 2
    },
    {
      id: 'QUO-003',
      customer: 'Amit Patel',
      amount: 67000,
      date: '2024-01-13',
      validUntil: '2024-02-13',
      status: 'draft',
      items: 5
    },
    {
      id: 'QUO-004',
      customer: 'Sneha Reddy',
      amount: 15000,
      date: '2024-01-10',
      validUntil: '2024-01-25',
      status: 'expired',
      items: 1
    },
    {
      id: 'QUO-005',
      customer: 'Vikram Singh',
      amount: 52000,
      date: '2024-01-08',
      validUntil: '2024-01-20',
      status: 'rejected',
      items: 4
    }
  ]

  const stats = {
    total: 5,
    sent: 1,
    accepted: 1,
    pending: 1,
    totalValue: 207500
  }

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
    sent: { label: 'Sent', color: 'bg-primary/10 text-primary', icon: PaperPlaneTilt },
    accepted: { label: 'Accepted', color: 'bg-success/10 text-success', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive', icon: XCircle },
    expired: { label: 'Expired', color: 'bg-warning/10 text-warning', icon: Clock }
  }

  const filteredQuotations = filterStatus === 'all'
    ? quotations
    : quotations.filter(q => q.status === filterStatus)

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
            <FileText size={32} weight="duotone" className="text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Quotations</h1>
              <p className="text-sm text-muted-foreground">Create and manage price quotations</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewQuotation(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={20} weight="bold" />
            <span className="hidden sm:inline">New Quote</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Quotes', value: stats.total, icon: FileText },
          { label: 'Sent', value: stats.sent, icon: PaperPlaneTilt, color: 'primary' },
          { label: 'Accepted', value: stats.accepted, icon: CheckCircle, color: 'success' },
          { label: 'Total Value', value: `₹${(stats.totalValue / 1000).toFixed(0)}k`, icon: CurrencyCircleDollar }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border/50 rounded-lg p-4"
          >
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

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-lg border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-3 bg-muted rounded-lg">
              <MagnifyingGlass size={20} weight="bold" className="text-muted-foreground lg:w-6 lg:h-6" />
              <input
                type="text"
                placeholder="Search quotations..."
                className="flex-1 bg-transparent outline-none text-sm lg:text-base"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => (
                <motion.button
                  key={status}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-4 py-2 lg:px-5 lg:py-3 rounded-lg text-sm lg:text-base font-medium whitespace-nowrap transition-all capitalize",
                    filterStatus === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  {status === 'all' ? 'All' : statusConfig[status as keyof typeof statusConfig].label}
                </motion.button>
              ))}
            </div>
          </div>
      </div>

      {/* Quotations List */}
      <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">Quote No.</th>
                  <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 lg:px-6 lg:py-4 text-right text-xs lg:text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">Valid Until</th>
                  <th className="px-4 py-3 lg:px-6 lg:py-4 text-left text-xs lg:text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 lg:px-6 lg:py-4 text-right text-xs lg:text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuotations.map((quote, index) => {
                  const StatusIcon = statusConfig[quote.status as keyof typeof statusConfig].icon
                  return (
                    <motion.tr
                      key={quote.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={18} weight="duotone" className="text-primary" />
                          <span className="font-medium text-sm">{quote.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{quote.customer}</p>
                          <p className="text-xs text-muted-foreground">{quote.items} items</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sm">
                        ₹{quote.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(quote.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(quote.validUntil).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          statusConfig[quote.status as keyof typeof statusConfig].color
                        )}>
                          <StatusIcon size={12} weight="fill" />
                          {statusConfig[quote.status as keyof typeof statusConfig].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toast.info('View quotation')}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <Eye size={18} weight="duotone" />
                          </motion.button>
                          {quote.status === 'draft' && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toast.success('Quotation sent!')}
                              className="p-2 hover:bg-muted rounded-lg transition-colors text-primary"
                            >
                              <PaperPlaneTilt size={18} weight="duotone" />
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toast.info('Converting to invoice...')}
                            className="p-2 hover:bg-muted rounded-lg transition-colors text-success"
                          >
                            <CheckCircle size={18} weight="duotone" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toast.success('Downloading...')}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <Download size={18} weight="duotone" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toast.error('Quotation deleted')}
                            className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                          >
                            <Trash size={18} weight="duotone" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* New Quotation Modal */}
      <AnimatePresence>
        {showNewQuotation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewQuotation(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 sm:inset-8 lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:inset-auto w-auto lg:w-full lg:max-w-3xl h-auto lg:max-h-[85vh] bg-card text-card-foreground rounded-xl shadow-2xl z-50 p-6 overflow-y-auto"
            >
              <h3 className="text-xl font-bold mb-4">Create New Quotation</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Customer</label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg">
                      <option>Select customer</option>
                      <option>Rajesh Kumar</option>
                      <option>Priya Sharma</option>
                      <option>Amit Patel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quote Date</label>
                    <input type="date" className="w-full px-3 py-2 border border-border rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Valid Until</label>
                    <input type="date" className="w-full px-3 py-2 border border-border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quote Number</label>
                    <input type="text" defaultValue="QUO-006" className="w-full px-3 py-2 border border-border rounded-lg" />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Items</h4>
                    <button className="text-sm text-primary hover:underline">+ Add Item</button>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-4 gap-2">
                        <input type="text" placeholder="Item name" className="col-span-2 px-2 py-1 border border-border rounded text-sm" />
                        <input type="number" placeholder="Qty" className="px-2 py-1 border border-border rounded text-sm" />
                        <input type="number" placeholder="Rate" className="px-2 py-1 border border-border rounded text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Terms & Conditions</label>
                  <textarea rows={3} className="w-full px-3 py-2 border border-border rounded-lg" placeholder="Enter terms..."></textarea>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      toast.success('Quotation saved as draft!')
                      setShowNewQuotation(false)
                    }}
                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Quotation created and sent!')
                      setShowNewQuotation(false)
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                  >
                    Create & Send
                  </button>
                  <button
                    onClick={() => setShowNewQuotation(false)}
                    className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg font-medium hover:bg-destructive/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Quotations
