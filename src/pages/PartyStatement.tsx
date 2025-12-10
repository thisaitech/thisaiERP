/**
 * Party Statement Page
 *
 * Shows complete account statement for customers/suppliers
 * with all transactions, payments, and running balance
 */

import React, { useState, useEffect } from 'react'
import {
  User,
  Calendar,
  Download,
  Printer,
  FileText,
  ChartLine,
  CurrencyCircleDollar,
  Receipt,
  MagnifyingGlass,
  ArrowRight,
  TrendUp,
  TrendDown,
  CheckCircle,
  Clock
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { getParties } from '../services/partyService'
import { generatePartyStatement, type PartyStatement, type StatementTransaction } from '../services/partyStatementService'
import type { Party } from '../types'

const PartyStatementPage = () => {
  const [parties, setParties] = useState<Party[]>([])
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [statement, setStatement] = useState<PartyStatement | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Set default date range (current financial year)
  useEffect(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Indian FY: April to March
    if (currentMonth >= 4) {
      setFromDate(`${currentYear}-04-01`)
      setToDate(`${currentYear + 1}-03-31`)
    } else {
      setFromDate(`${currentYear - 1}-04-01`)
      setToDate(`${currentYear}-03-31`)
    }
  }, [])

  // Load parties
  useEffect(() => {
    const loadParties = async () => {
      try {
        const partiesData = await getParties()
        if (partiesData) {
          setParties(partiesData)
        }
      } catch (error) {
        console.error('Error loading parties:', error)
        toast.error('Failed to load parties')
      }
    }

    loadParties()
  }, [])

  const handleGenerateStatement = async () => {
    if (!selectedParty) {
      toast.error('Please select a party')
      return
    }

    if (!fromDate || !toDate) {
      toast.error('Please select date range')
      return
    }

    setIsLoading(true)
    try {
      const statementData = await generatePartyStatement(
        selectedParty.id,
        fromDate,
        toDate
      )

      if (statementData) {
        setStatement(statementData)
        toast.success('Statement generated successfully')
      } else {
        toast.error('Failed to generate statement')
      }
    } catch (error) {
      console.error('Error generating statement:', error)
      toast.error('Error generating statement')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredParties = parties.filter(party =>
    party.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.phone.includes(searchTerm)
  )

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-accent to-primary/80 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Party Statement</h1>
          <p className="text-white/80 text-sm">View complete account statements for customers and suppliers</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Party Selection */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-lg border border-border p-6 sticky top-4">
              <h2 className="text-lg font-bold mb-4">Select Party</h2>

              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Search parties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              {/* Date Range */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Party List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredParties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => setSelectedParty(party)}
                    className={cn(
                      "w-full p-3 rounded-lg border transition-all text-left",
                      selectedParty?.id === party.id
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/30 border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{party.companyName}</p>
                        <p className="text-xs text-muted-foreground">{party.phone}</p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded",
                          party.type === 'customer'
                            ? "bg-success/10 text-success"
                            : party.type === 'supplier'
                            ? "bg-info/10 text-info"
                            : "bg-warning/10 text-warning"
                        )}
                      >
                        {party.type}
                      </span>
                    </div>
                    {party.currentBalance !== 0 && (
                      <p className={cn(
                        "text-sm font-medium mt-2",
                        party.currentBalance > 0 ? "text-success" : "text-destructive"
                      )}>
                        Balance: ₹{Math.abs(party.currentBalance).toFixed(2)} {party.currentBalance > 0 ? 'Receivable' : 'Payable'}
                      </p>
                    )}
                  </button>
                ))}

                {filteredParties.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No parties found
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateStatement}
                disabled={!selectedParty || isLoading}
                className="w-full mt-4 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Clock size={20} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText size={20} />
                    Generate Statement
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel: Statement Display */}
          <div className="lg:col-span-2">
            {!statement ? (
              <div className="bg-card rounded-lg shadow-lg border border-border p-12 text-center">
                <ChartLine size={64} className="mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Statement Generated</h3>
                <p className="text-sm text-muted-foreground">
                  Select a party and date range to generate account statement
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-lg border border-border">
                {/* Statement Header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{statement.party.displayName || statement.party.companyName}</h2>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{statement.party.phone}</span>
                        <span>{statement.party.email}</span>
                        {statement.party.gstin && <span>GSTIN: {statement.party.gstin}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.info('Print functionality coming soon')}
                        className="p-2 hover:bg-muted rounded-lg"
                        title="Print Statement"
                      >
                        <Printer size={20} />
                      </button>
                      <button
                        onClick={() => toast.info('Download functionality coming soon')}
                        className="p-2 hover:bg-muted rounded-lg"
                        title="Download PDF"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total Debit</p>
                      <p className="text-xl font-bold text-success">₹{statement.summary.totalDebit.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total Credit</p>
                      <p className="text-xl font-bold text-destructive">₹{statement.summary.totalCredit.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Closing Balance</p>
                      <p className={cn(
                        "text-xl font-bold",
                        statement.summary.closingBalance >= 0 ? "text-success" : "text-destructive"
                      )}>
                        ₹{Math.abs(statement.summary.closingBalance).toFixed(2)}
                        <span className="text-xs ml-1">
                          {statement.summary.closingBalance >= 0 ? 'Receivable' : 'Payable'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold">Date</th>
                        <th className="text-left p-3 text-xs font-semibold">Description</th>
                        <th className="text-right p-3 text-xs font-semibold">Debit</th>
                        <th className="text-right p-3 text-xs font-semibold">Credit</th>
                        <th className="text-right p-3 text-xs font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.transactions.map((transaction, index) => (
                        <motion.tr
                          key={transaction.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-border hover:bg-muted/30"
                        >
                          <td className="p-3 text-sm">
                            {new Date(transaction.date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="text-sm font-medium">{transaction.description}</p>
                              {transaction.invoiceNumber && (
                                <p className="text-xs text-muted-foreground">
                                  {transaction.invoiceNumber}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-right">
                            {transaction.debit > 0 && (
                              <span className="text-success font-medium">
                                ₹{transaction.debit.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-right">
                            {transaction.credit > 0 && (
                              <span className="text-destructive font-medium">
                                ₹{transaction.credit.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className={cn(
                            "p-3 text-sm text-right font-semibold",
                            transaction.balance >= 0 ? "text-success" : "text-destructive"
                          )}>
                            ₹{Math.abs(transaction.balance).toFixed(2)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Statement Footer */}
                <div className="p-6 bg-muted/30 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">
                      Period: {new Date(statement.period.from).toLocaleDateString('en-IN')} to {new Date(statement.period.to).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-muted-foreground">
                      {statement.summary.totalInvoices} Invoices | {statement.summary.totalPayments} Payments
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PartyStatementPage
