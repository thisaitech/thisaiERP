import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Users,
  Plus,
  MagnifyingGlass,
  UserCircle,
  Storefront,
  Phone,
  Envelope,
  MapPin,
  TrendUp,
  TrendDown,
  Receipt,
  ShoppingCart,
  Wallet,
  Calendar,
  WarningCircle,
  CheckCircle,
  Export,
  Printer,
  Pencil,
  Trash,
  Eye,
  FileText,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { getPartyLedger, getPartyBalance, type LedgerEntry } from '../services/ledgerService'
import { getParties, getPartiesWithOutstanding, createParty, updateParty, deleteParty } from '../services/partyService'
import { getPartySettings, type PartySettings } from '../services/settingsService'
import { getInvoices } from '../services/invoiceService'
import { toast } from 'sonner'
import { validateCustomerName, validatePhoneNumber, validateGSTIN } from '../utils/inputValidation'

// Indian States list with priority states first
const INDIAN_STATES = [
  // Priority states (South Indian states)
  'Tamil Nadu',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  // All other states alphabetically
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
]

const Parties = () => {
  // Language support
  const { t, language } = useLanguage()

  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Time period filter (Today, Week, Month, Year, All, Custom)
  const [statsFilter, setStatsFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all')
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [customDateFrom, setCustomDateFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [customDateTo, setCustomDateTo] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedParty, setSelectedParty] = useState<any>(null)
  const [showLedgerModal, setShowLedgerModal] = useState(false)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [isLoadingLedger, setIsLoadingLedger] = useState(false)
  const [parties, setParties] = useState<any[]>([])
  const [isLoadingParties, setIsLoadingParties] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [partyToDelete, setPartyToDelete] = useState<any>(null)
  const [allInvoices, setAllInvoices] = useState<any[]>([])

  // Party settings from Settings page
  const [partySettings, setPartySettings] = useState<PartySettings>(() => getPartySettings())

  // Expandable sections state
  const [showBillingAddress, setShowBillingAddress] = useState(false)
  const [showGstNumber, setShowGstNumber] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showCustomerType, setShowCustomerType] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showState, setShowState] = useState(false)
  const [showVehicleNo, setShowVehicleNo] = useState(false)

  // Form state for new party
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer')
  const [partyName, setPartyName] = useState('')
  const [partyPhone, setPartyPhone] = useState('')
  const [partyEmail, setPartyEmail] = useState('')
  const [partyGst, setPartyGst] = useState('')
  const [partyAddress, setPartyAddress] = useState('')
  const [partyState, setPartyState] = useState('')
  const [partyCustomerType, setPartyCustomerType] = useState('Regular')
  const [partyNotes, setPartyNotes] = useState('')
  const [partyVehicleNo, setPartyVehicleNo] = useState('')
  const [partyCreditLimit, setPartyCreditLimit] = useState<number>(0)
  const [partyCreditDays, setPartyCreditDays] = useState<number>(30)
  const [showCreditLimit, setShowCreditLimit] = useState(false)
  const [partyOpeningBalance, setPartyOpeningBalance] = useState('')
  const [showOpeningBalance, setShowOpeningBalance] = useState(false)

  // Load parties from database with live outstanding balances
  const loadPartiesFromDatabase = async () => {
    try {
      setIsLoadingParties(true)
      // Use getPartiesWithOutstanding to get live outstanding balances (2025 Standard)
      const partiesData = await getPartiesWithOutstanding()
      setParties(partiesData || [])

      // Also load all invoices for date-filtered summary calculations
      const invoicesData = await getInvoices()
      setAllInvoices(invoicesData || [])
    } catch (error) {
      console.error('Error loading parties:', error)
      setParties([])
    } finally {
      setIsLoadingParties(false)
    }
  }

  // Load parties on mount
  useEffect(() => {
    loadPartiesFromDatabase()
  }, [])

  // Check for action parameter and auto-open modal
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      setShowAddModal(true)
      // Clear the parameter after opening modal
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  // Add error boundary
  React.useEffect(() => {
    console.log('Parties component mounted successfully')
    return () => console.log('Parties component unmounted')
  }, [])

  // Listen for open-add-party-modal event from QuickActionFAB
  useEffect(() => {
    const handleOpenModal = () => {
      setShowAddModal(true)
    }
    window.addEventListener('open-add-party-modal', handleOpenModal)
    return () => {
      window.removeEventListener('open-add-party-modal', handleOpenModal)
    }
  }, [])

  // Note: partiesSummary is calculated after filteredParties is defined (see below)

  // Load real ledger data when party is selected
  useEffect(() => {
    if (selectedParty && showLedgerModal) {
      loadLedgerData(selectedParty.id)
    }
  }, [selectedParty, showLedgerModal])

  const loadLedgerData = async (partyId: string | number) => {
    setIsLoadingLedger(true)
    try {
      const entries = await getPartyLedger(String(partyId))
      setLedgerEntries(entries)
    } catch (error) {
      console.error('Error loading ledger:', error)
      setLedgerEntries([])
    } finally {
      setIsLoadingLedger(false)
    }
  }

  // Reset form
  const resetPartyForm = () => {
    // Reload settings to get latest values
    const settings = getPartySettings()
    setPartySettings(settings)

    setPartyType('customer')
    setPartyName('')
    setPartyPhone('')
    setPartyEmail('')
    setPartyGst('')
    setPartyAddress('')
    setPartyState('')
    setPartyCustomerType(settings.partyCategories[0] || 'Regular')
    setPartyNotes('')
    setPartyVehicleNo('')
    setPartyCreditLimit(0)
    setPartyCreditDays(settings.defaultCreditPeriod || 30)
    setShowBillingAddress(false)
    setShowGstNumber(false)
    setShowEmail(false)
    setShowCustomerType(false)
    setShowNotes(false)
    setShowState(false)
    setShowVehicleNo(false)
    setShowCreditLimit(false)
    setPartyOpeningBalance('')
    setShowOpeningBalance(false)
    setIsEditMode(false)
    setEditingPartyId(null)
  }

  // Handle save party (create or update)
  const handleSaveParty = async () => {
    if (!partyName?.trim() || !partyPhone?.trim()) {
      toast.error('Please fill Customer Name and Phone Number')
      return
    }

    // Validate phone number - must be 10-15 digits (allows country code)
    const phoneDigits = partyPhone.replace(/\D/g, '') // Remove non-digits
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      toast.error('Phone number must be 10-15 digits')
      return
    }

    // Validate GSTIN if required by settings
    if (partySettings.requireGSTIN && !partyGst?.trim()) {
      toast.error('GSTIN is required. Please enter a valid GSTIN number.')
      // Auto-expand GSTIN field
      setShowGstNumber(true)
      return
    }

    // Validate GSTIN format if provided (15 characters alphanumeric)
    if (partyGst?.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(partyGst.trim().toUpperCase())) {
      toast.error('Invalid GSTIN format. Please enter a valid 15-character GSTIN.')
      return
    }

    setIsLoadingParties(true)
    try {
      console.log(isEditMode ? 'Updating' : 'Creating', 'party with data:', {
        type: partyType,
        companyName: partyName.trim(),
        displayName: partyName.trim(),
        phone: partyPhone.trim(),
        email: partyEmail?.trim() || '',
      })

      // Build party data object, omitting undefined fields for Firebase
      const openingBal = parseFloat(partyOpeningBalance) || 0
      const partyData: any = {
        type: partyType,
        companyName: partyName.trim(),
        displayName: partyName.trim(),
        phone: partyPhone.trim(),
        email: partyEmail?.trim() || '',
        contacts: [],
        billingAddress: {
          street: partyAddress?.trim() || '',
          city: '',
          state: partyState?.trim() || '',
          pinCode: '',
          country: 'India'
        },
        sameAsShipping: true,
        paymentTerms: partyCustomerType,
        openingBalance: openingBal,
        currentBalance: openingBal,
        createdBy: 'User',
        isActive: true,
        // Add credit days from settings or user input
        creditDays: partyCreditDays
      }

      // Add credit limit if enabled in settings
      if (partySettings.enableCreditLimit) {
        partyData.creditLimit = partyCreditLimit
      }

      // Only add gstDetails if GST is provided
      if (partyGst?.trim()) {
        partyData.gstDetails = {
          gstin: partyGst.trim().toUpperCase(),
          gstType: 'Regular' as const,
          stateCode: partyGst.trim().substring(0, 2)
        }
      }

      // Only add notes if provided
      if (partyNotes?.trim()) {
        partyData.notes = partyNotes.trim()
      }

      // Only add vehicleNo if provided
      if (partyVehicleNo?.trim()) {
        partyData.vehicleNo = partyVehicleNo.trim()
      }

      if (isEditMode && editingPartyId) {
        // Update existing party
        const success = await updateParty(editingPartyId, partyData)

        if (success) {
          // Update party in local state
          setParties(parties.map(p => p.id === editingPartyId ? { ...p, ...partyData } : p))
          toast.success(`${partyType === 'customer' ? 'Customer' : 'Supplier'} updated successfully!`)
          setShowAddModal(false)
          resetPartyForm()
        } else {
          toast.error('Failed to update party. Please try again.')
        }
      } else {
        // Create new party
        const newParty = await createParty(partyData)

        console.log('Party created:', newParty)

        if (newParty) {
          setParties([...parties, newParty])
          toast.success(`${partyType === 'customer' ? 'Customer' : 'Supplier'} added successfully!`)
          setShowAddModal(false)
          resetPartyForm()
        } else {
          console.error('createParty returned null')
          toast.error('Failed to add party. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error saving party:', error)
      toast.error(`Failed to ${isEditMode ? 'update' : 'add'} party: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingParties(false)
    }
  }

  // Handle edit party
  const handleEditParty = (party: any) => {
    // Reload settings to get latest values
    const settings = getPartySettings()
    setPartySettings(settings)

    setIsEditMode(true)
    setEditingPartyId(party.id)
    setPartyType(party.type || 'customer')
    // Check all possible name fields: displayName, companyName, name
    setPartyName(party.displayName || party.companyName || party.name || '')
    setPartyPhone(party.phone || '')
    setPartyEmail(party.email || '')
    setPartyGst(party.gstDetails?.gstin || '')
    setPartyAddress(party.billingAddress?.street || '')
    setPartyState(party.billingAddress?.state || '')
    setPartyCustomerType(party.paymentTerms || settings.partyCategories[0] || 'Regular')
    setPartyNotes(party.notes || '')
    setPartyVehicleNo(party.vehicleNo || '')
    setPartyCreditLimit(party.creditLimit || 0)
    setPartyCreditDays(party.creditDays || settings.defaultCreditPeriod || 30)

    // Show expandable sections if they have data
    if (party.billingAddress?.street) setShowBillingAddress(true)
    if (party.gstDetails?.gstin) setShowGstNumber(true)
    if (party.email) setShowEmail(true)
    if (party.paymentTerms) setShowCustomerType(true)
    if (party.notes) setShowNotes(true)
    if (party.billingAddress?.state) setShowState(true)
    if (party.vehicleNo) setShowVehicleNo(true)
    if (party.creditLimit > 0 && settings.enableCreditLimit) setShowCreditLimit(true)

    setShowAddModal(true)
  }

  // Show delete confirmation modal
  const handleDeleteParty = (party: any) => {
    setPartyToDelete(party)
    setShowDeleteModal(true)
  }

  // Confirm and delete party
  const confirmDeleteParty = async () => {
    if (!partyToDelete) return

    setIsLoadingParties(true)
    try {
      const success = await deleteParty(partyToDelete.id)

      if (success) {
        setParties(parties.filter(p => p.id !== partyToDelete.id))
        toast.success('Party deleted successfully!')
        setShowDeleteModal(false)
        setPartyToDelete(null)
      } else {
        toast.error('Failed to delete party. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting party:', error)
      toast.error(`Failed to delete party: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingParties(false)
    }
  }

  const getPartyStatus = (party: typeof parties[0]) => {
    if ((party.overdue || 0) > 0) return { label: 'Overdue', color: 'destructive', icon: WarningCircle }
    if (party.status === 'active' || party.isActive) return { label: 'Active', color: 'success', icon: CheckCircle }
    return { label: 'Inactive', color: 'warning', icon: WarningCircle }
  }

  // Filter parties by search and tab only (not by date - date filter is for summary cards)
  const filteredParties = parties.filter(party => {
    const matchesSearch = (party.displayName || party.companyName || party.name || party.customerName || party.partyName || party.fullName || party.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (party.phone || '').includes(searchQuery) ||
                         (party.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'customers' && party.type === 'customer') ||
                      (activeTab === 'suppliers' && party.type === 'supplier')

    return matchesSearch && matchesTab
  })

  // Helper function to check if invoice date matches the selected filter
  const isInvoiceDateInRange = (invoice: any): boolean => {
    if (statsFilter === 'all') return true

    const invoiceDate = invoice.invoiceDate || invoice.date || invoice.createdAt
    if (!invoiceDate) return false

    const invoiceDateStr = typeof invoiceDate === 'string'
      ? invoiceDate.split('T')[0]
      : new Date(invoiceDate).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    if (statsFilter === 'today') {
      return invoiceDateStr === today
    } else if (statsFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return invoiceDateStr >= weekAgo.toISOString().split('T')[0]
    } else if (statsFilter === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return invoiceDateStr >= monthAgo.toISOString().split('T')[0]
    } else if (statsFilter === 'year') {
      const yearAgo = new Date()
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      return invoiceDateStr >= yearAgo.toISOString().split('T')[0]
    } else if (statsFilter === 'custom') {
      return invoiceDateStr >= customDateFrom && invoiceDateStr <= customDateTo
    }
    return true
  }

  // Parties Summary - calculated based on INVOICES within the date range (2025 Standard)
  // This ensures To Receive/To Pay/Net Balance reflect the selected time period
  const partiesSummary = useMemo(() => {
    // Filter invoices by date range
    const dateFilteredInvoices = allInvoices.filter(isInvoiceDateInRange)

    // Calculate receivables from sales invoices in date range
    const totalReceivables = dateFilteredInvoices
      .filter(inv => inv.type !== 'purchase' && inv.billType !== 'purchase')
      .reduce((sum, inv) => {
        const total = Number(inv.total || inv.grandTotal || inv.amount || 0)
        const paid = Number(
          inv.payment?.paidAmount ||
          inv.paidAmount ||
          inv.amountPaid ||
          (inv.payment?.status === 'paid' ? total : 0) ||
          0
        )
        const outstanding = total - paid
        return sum + (outstanding > 0 ? outstanding : 0)
      }, 0)

    // Calculate payables from purchase invoices in date range
    const totalPayables = dateFilteredInvoices
      .filter(inv => inv.type === 'purchase' || inv.billType === 'purchase')
      .reduce((sum, inv) => {
        const total = Number(inv.total || inv.grandTotal || inv.amount || 0)
        const paid = Number(
          inv.payment?.paidAmount ||
          inv.paidAmount ||
          inv.amountPaid ||
          (inv.payment?.status === 'paid' ? total : 0) ||
          0
        )
        const outstanding = total - paid
        return sum + (outstanding > 0 ? outstanding : 0)
      }, 0)

    return {
      totalParties: filteredParties.length,
      customers: filteredParties.filter(p => p.type === 'customer').length,
      suppliers: filteredParties.filter(p => p.type === 'supplier').length,
      totalReceivables,
      totalPayables,
      netBalance: totalReceivables - totalPayables,
      activeParties: filteredParties.filter(p => p.isActive || p.status === 'active').length,
      overdueCustomers: 0
    }
  }, [filteredParties, allInvoices, statsFilter, customDateFrom, customDateTo])

  const viewLedger = (party: typeof parties[0]) => {
    setSelectedParty(party)
    setShowLedgerModal(true)
  }

  // Print party details
  const printParty = (party: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups for printing')
      return
    }

    const partyName = party.displayName || party.companyName || party.name || 'Unknown'
    const outstanding = party.outstanding ?? party.currentBalance ?? 0
    const balanceLabel = party.type === 'customer'
      ? (outstanding > 0 ? 'To Receive' : outstanding < 0 ? 'Advance' : 'Settled')
      : (outstanding > 0 ? 'To Pay' : outstanding < 0 ? 'Credit' : 'Settled')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${partyName} - Party Details</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0 0 5px 0; font-size: 24px; }
          .header p { margin: 0; color: #666; }
          .details { margin-bottom: 20px; }
          .details-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
          .details-label { font-weight: bold; width: 150px; color: #555; }
          .details-value { flex: 1; }
          .balance { text-align: center; padding: 15px; margin-top: 20px; border-radius: 8px; }
          .balance.positive { background: #dcfce7; color: #166534; }
          .balance.negative { background: #fee2e2; color: #991b1b; }
          .balance.zero { background: #f3f4f6; color: #374151; }
          .balance h2 { margin: 0 0 5px 0; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${partyName}</h1>
          <p>${party.type === 'customer' ? 'Customer' : 'Supplier'}</p>
        </div>
        <div class="details">
          <div class="details-row">
            <span class="details-label">Phone:</span>
            <span class="details-value">${party.phone || 'N/A'}</span>
          </div>
          ${party.email ? `<div class="details-row"><span class="details-label">Email:</span><span class="details-value">${party.email}</span></div>` : ''}
          ${party.gstDetails?.gstin ? `<div class="details-row"><span class="details-label">GSTIN:</span><span class="details-value">${party.gstDetails.gstin}</span></div>` : ''}
          ${party.billingAddress?.street ? `<div class="details-row"><span class="details-label">Address:</span><span class="details-value">${party.billingAddress.street}</span></div>` : ''}
          ${party.billingAddress?.state ? `<div class="details-row"><span class="details-label">State:</span><span class="details-value">${party.billingAddress.state}</span></div>` : ''}
          ${party.vehicleNo ? `<div class="details-row"><span class="details-label">Vehicle No:</span><span class="details-value">${party.vehicleNo}</span></div>` : ''}
        </div>
        <div class="balance ${outstanding > 0 ? 'positive' : outstanding < 0 ? 'negative' : 'zero'}">
          <h2>Outstanding Balance</h2>
          <p style="font-size: 28px; font-weight: bold; margin: 10px 0;">₹${Math.abs(outstanding).toLocaleString('en-IN')}</p>
          <p>(${balanceLabel})</p>
        </div>
        <div class="footer">
          <p>Printed on ${new Date().toLocaleString()}</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
            // Fallback for browsers that don't support onafterprint
            setTimeout(function() { window.close(); }, 1000);
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Print ledger
  const printLedger = () => {
    if (!selectedParty || ledgerEntries.length === 0) {
      toast.error('No ledger data to print')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups for printing')
      return
    }

    const partyName = selectedParty.displayName || selectedParty.companyName || selectedParty.name || 'Unknown'
    const outstanding = selectedParty.currentBalance || 0
    const balanceLabel = selectedParty.type === 'customer'
      ? (outstanding > 0 ? 'To Receive' : outstanding < 0 ? 'Advance' : 'Settled')
      : (outstanding > 0 ? 'To Pay' : outstanding < 0 ? 'Credit' : 'Settled')

    const ledgerRows = ledgerEntries.map(entry => `
      <tr>
        <td>${new Date(entry.date).toLocaleDateString()}</td>
        <td>${entry.type === 'invoice' ? 'Invoice' : 'Payment'}</td>
        <td>${entry.referenceNumber}</td>
        <td>${entry.description || '-'}</td>
        <td style="text-align: right">${entry.debit > 0 ? '₹' + entry.debit.toLocaleString('en-IN') : '-'}</td>
        <td style="text-align: right">${entry.credit > 0 ? '₹' + entry.credit.toLocaleString('en-IN') : '-'}</td>
        <td style="text-align: right; font-weight: bold">₹${entry.balance.toLocaleString('en-IN')}</td>
      </tr>
    `).join('')

    const totalDebit = ledgerEntries.reduce((sum, e) => sum + (e.debit || 0), 0)
    const totalCredit = ledgerEntries.reduce((sum, e) => sum + (e.credit || 0), 0)
    const finalBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${partyName} - Ledger</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0 0 5px 0; font-size: 22px; }
          .header p { margin: 0; color: #666; }
          .summary { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 8px; }
          .summary-item { text-align: center; }
          .summary-item label { font-size: 12px; color: #666; display: block; }
          .summary-item value { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          tfoot td { font-weight: bold; background: #f8fafc; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${partyName} - Ledger Statement</h1>
          <p>${selectedParty.type === 'customer' ? 'Customer' : 'Supplier'} | ${selectedParty.phone || ''}</p>
        </div>
        <div class="summary">
          <div class="summary-item">
            <label>Total Debit</label>
            <value>₹${totalDebit.toLocaleString('en-IN')}</value>
          </div>
          <div class="summary-item">
            <label>Total Credit</label>
            <value>₹${totalCredit.toLocaleString('en-IN')}</value>
          </div>
          <div class="summary-item">
            <label>Outstanding (${balanceLabel})</label>
            <value style="color: ${outstanding > 0 ? '#16a34a' : outstanding < 0 ? '#dc2626' : '#374151'}">₹${Math.abs(outstanding).toLocaleString('en-IN')}</value>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Description</th>
              <th style="text-align: right">Debit</th>
              <th style="text-align: right">Credit</th>
              <th style="text-align: right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right">Totals:</td>
              <td style="text-align: right">₹${totalDebit.toLocaleString('en-IN')}</td>
              <td style="text-align: right">₹${totalCredit.toLocaleString('en-IN')}</td>
              <td style="text-align: right">₹${finalBalance.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">
          <p>Printed on ${new Date().toLocaleString()}</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
            // Fallback for browsers that don't support onafterprint
            setTimeout(function() { window.close(); }, 1000);
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="min-h-screen p-2 sm:p-3 lg:p-4 pb-16 sm:pb-20 lg:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users size={24} weight="duotone" className="text-primary" />
              {t.parties.title}
            </h1>
            <p className="text-muted-foreground mt-1">{language === 'ta' ? 'வாடிக்கையாளர்கள் மற்றும் சப்ளையர்களை நிர்வகிக்கவும்' : 'Manage customers and suppliers'}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
          >
            <Plus size={18} weight="bold" />
            <span className="hidden sm:inline">{language === 'ta' ? 'தரப்பினர் சேர்' : 'Add Party'}</span>
          </motion.button>
        </div>

        {/* Period Filter Tabs */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="inline-flex items-center gap-1 text-xs bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm border border-primary/20">
            {[
              { value: 'today', label: t.common.today },
              { value: 'week', label: t.common.week },
              { value: 'month', label: t.common.month },
              { value: 'year', label: t.common.year },
              { value: 'all', label: t.common.all },
              { value: 'custom', label: t.common.custom },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setStatsFilter(filter.value as any)
                  if (filter.value === 'custom') {
                    setShowCustomDatePicker(true)
                  } else {
                    setShowCustomDatePicker(false)
                  }
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
                  statsFilter === filter.value
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          {(statsFilter === 'custom' || showCustomDatePicker) && (
            <div className="flex flex-wrap items-center justify-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-sm border border-primary/20">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">{t.common.from}:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-2 py-1 text-[11px] rounded-lg border border-primary/30 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">{t.common.to}:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-2 py-1 text-[11px] rounded-lg border border-primary/30 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: language === 'ta' ? 'மொத்த தரப்பினர்' : 'Total Parties', value: String(filteredParties.length), icon: Users },
            { label: language === 'ta' ? 'பெற வேண்டியது' : 'To Receive', value: `+₹${(partiesSummary.totalReceivables / 100000).toFixed(2)}L`, icon: TrendUp, color: 'success' },
            { label: language === 'ta' ? 'செலுத்த வேண்டியது' : 'To Pay', value: `-₹${(partiesSummary.totalPayables / 100000).toFixed(2)}L`, icon: TrendDown, color: 'destructive' },
            { label: language === 'ta' ? 'நிகர இருப்பு' : 'Net Balance', value: `₹${(partiesSummary.netBalance / 100000).toFixed(2)}L`, icon: Wallet }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2 }}
                className="relative overflow-hidden bg-card rounded-lg p-4 border border-border/50 hover:shadow-md transition-all"
            >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#7A35FF] to-[#9B63FF]" />
              <div className="flex items-center justify-between mb-2">
                <stat.icon
                  size={18}
                  weight="duotone"
                  className={cn(
                    stat.color === 'success' && "text-emerald-600",
                    stat.color === 'destructive' && "text-red-600",
                    !stat.color && "text-primary"
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn(
                "text-lg font-bold mt-1",
                stat.color === 'success' && "text-emerald-600",
                stat.color === 'destructive' && "text-red-600"
              )}>{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Search & Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-lg p-4 mb-4 border border-border/50"
      >
        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={language === 'ta' ? 'பெயர், தொலைபேசி அல்லது மின்னஞ்சலால் தேடு...' : 'Search by name, phone, or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { id: 'all', label: language === 'ta' ? 'அனைத்து தரப்பினர்' : 'All Parties', count: parties.length },
              { id: 'customers', label: language === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers', count: parties.filter(p => p.type === 'customer').length },
              { id: 'suppliers', label: language === 'ta' ? 'சப்ளையர்கள்' : 'Suppliers', count: parties.filter(p => p.type === 'supplier').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-accent text-white"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Parties Grid */}
      <div className="grid gap-3 md:gap-4 pb-20 md:pb-0">
          {filteredParties.map((party, index) => {
            const status = getPartyStatus(party)
            // Use new outstanding fields (2025 Standard - Vyapar/Marg/Zoho style)
            const outstanding = party.outstanding ?? party.currentBalance ?? 0

            // Color logic based on party type:
            // Customer: positive = green (To Receive), negative = red (Advance paid)
            // Supplier: positive = red (To Pay), negative = green (Credit balance)
            // Zero = grey (Settled)
            const getProperColor = () => {
              if (outstanding === 0) return 'grey'
              if (party.type === 'customer' || party.type === 'both') {
                return outstanding > 0 ? 'green' : 'red' // Positive = To Receive (green)
              } else {
                // Supplier
                return outstanding > 0 ? 'red' : 'green' // Positive = To Pay (red)
              }
            }
            const outstandingColor = getProperColor()
            const outstandingFormatted = `₹${Math.abs(outstanding).toLocaleString('en-IN')}`

            return (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl p-3 md:p-4 border border-border/50 hover:border-accent/50 transition-all"
              >
                {/* Mobile Compact Header */}
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-2 md:p-3 rounded-lg flex-shrink-0",
                      party.type === 'customer' ? "bg-success/10" : "bg-warning/10"
                    )}>
                      {party.type === 'customer' ? (
                        <UserCircle size={20} weight="duotone" className="text-success md:w-6 md:h-6" />
                      ) : (
                        <Storefront size={20} weight="duotone" className="text-warning md:w-6 md:h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm md:text-lg truncate">{party.displayName || party.companyName || party.name || party.customerName || party.partyName || party.fullName || party.businessName || 'Unknown'}</h3>
                          {party.phone && (
                            <div className="flex items-center gap-1 mt-0.5 md:mt-1 text-xs md:text-sm text-muted-foreground">
                              <Phone size={12} className="flex-shrink-0" />
                              <span>{party.phone}</span>
                            </div>
                          )}
                          {/* Email hidden on mobile */}
                          {party.email && (
                            <div className="hidden md:flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                              <Envelope size={12} />
                              <span>{party.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 ml-2",
                    status.color === 'success' && "bg-success/10 text-success",
                    status.color === 'warning' && "bg-warning/10 text-warning",
                    status.color === 'destructive' && "bg-destructive/10 text-destructive"
                  )}>
                    <status.icon size={12} weight="fill" className="md:w-3.5 md:h-3.5" />
                    <span className="hidden sm:inline">{status.label}</span>
                  </div>
                </div>

                {/* Mobile: Outstanding amount prominently displayed */}
                <div className="md:hidden mb-2">
                  <div className={cn(
                    "flex items-center justify-between p-2 rounded-lg",
                    outstandingColor === 'green' && "bg-emerald-50",
                    outstandingColor === 'red' && "bg-red-50",
                    outstandingColor === 'grey' && "bg-gray-50"
                  )}>
                    <span className="text-xs text-muted-foreground">
                      {outstanding > 0 ? (party.type === 'customer' ? (language === 'ta' ? 'பெற வேண்டியது' : 'To Receive') : (language === 'ta' ? 'செலுத்த வேண்டியது' : 'To Pay')) :
                       outstanding < 0 ? (party.type === 'customer' ? (language === 'ta' ? 'முன்பணம்' : 'Advance') : (language === 'ta' ? 'கடன்' : 'Credit')) :
                       (language === 'ta' ? 'இருப்பு' : 'Balance')}
                    </span>
                    <span className={cn(
                      "font-bold text-base",
                      outstandingColor === 'green' && "text-emerald-600",
                      outstandingColor === 'red' && "text-red-600",
                      outstandingColor === 'grey' && "text-gray-500"
                    )}>
                      {outstanding !== 0 && (outstandingColor === 'green' ? '+' : '-')}
                      {outstandingFormatted}
                    </span>
                  </div>
                </div>

                {/* Desktop: Full grid */}
                <div className="hidden md:grid grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{language === 'ta' ? 'நிலுவை' : 'Outstanding'}</p>
                    <p className={cn(
                      "font-semibold text-base",
                      outstandingColor === 'green' && "text-emerald-600",
                      outstandingColor === 'red' && "text-red-600",
                      outstandingColor === 'grey' && "text-gray-500"
                    )}>
                      {/* Show +/- prefix based on context */}
                      {outstanding !== 0 && (outstandingColor === 'green' ? '+' : '-')}
                      {outstandingFormatted}
                      <span className="text-xs text-muted-foreground ml-1">
                        {outstanding > 0 ? (party.type === 'customer' ? (language === 'ta' ? 'பெற வேண்டியது' : 'To Receive') : (language === 'ta' ? 'செலுத்த வேண்டியது' : 'To Pay')) :
                         outstanding < 0 ? (party.type === 'customer' ? (language === 'ta' ? 'முன்பணம்' : 'Advance') : (language === 'ta' ? 'கடன்' : 'Credit')) :
                         (language === 'ta' ? 'தீர்க்கப்பட்டது' : 'Settled')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {party.type === 'customer' ? (language === 'ta' ? 'மொத்த விற்பனை' : 'Total Sales') : (language === 'ta' ? 'மொத்த கொள்முதல்' : 'Total Purchases')}
                    </p>
                    <p className="font-semibold">
                      ₹{((party.type === 'customer' ? (party.totalSales || 0) : (party.totalPurchases || 0))).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{language === 'ta' ? 'கடன் வரம்பு' : 'Credit Limit'}</p>
                    <p className="font-semibold">₹{(party.creditLimit || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{language === 'ta' ? 'செலுத்தும் விதிமுறைகள்' : 'Payment Terms'}</p>
                    <p className="font-semibold">{party.paymentTerms || 'N/A'}</p>
                  </div>
                </div>

                {(party.overdue || 0) > 0 && (
                  <div className="mb-2 md:mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <WarningCircle size={14} weight="fill" className="text-destructive md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm font-medium text-destructive">
                        Overdue: ₹{(party.overdue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-border/50">
                  <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                    {(party.transactions || party.transactions === 0) && (
                      <span className="flex items-center gap-1">
                        <Receipt size={14} />
                        {party.transactions || 0} {language === 'ta' ? 'பரிவர்த்தனைகள்' : 'transactions'}
                      </span>
                    )}
                    {party.lastTransaction && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {language === 'ta' ? 'கடைசி' : 'Last'}: {party.lastTransaction}
                      </span>
                    )}
                    {party.gst && <span>GST: {party.gst}</span>}
                  </div>
                  {/* Mobile: Show total */}
                  <div className="md:hidden flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="bg-muted px-1.5 py-0.5 rounded">
                      {party.type === 'customer' ? (language === 'ta' ? 'விற்பனை' : 'Sales') : (language === 'ta' ? 'கொள்முதல்' : 'Purchases')}: ₹{((party.type === 'customer' ? (party.totalSales || 0) : (party.totalPurchases || 0))).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => viewLedger(party)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors active:scale-95"
                      title="View Ledger"
                    >
                      <FileText size={16} weight="duotone" />
                    </button>
                    <button
                      onClick={() => printParty(party)}
                      className="hidden md:block p-2 hover:bg-muted rounded-lg transition-colors active:scale-95"
                      title="Print Party Details"
                    >
                      <Printer size={16} weight="duotone" />
                    </button>
                    <button
                      onClick={() => handleEditParty(party)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors active:scale-95"
                      title="Edit Party"
                    >
                      <Pencil size={16} weight="duotone" />
                    </button>
                    <button
                      onClick={() => handleDeleteParty(party)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors active:scale-95"
                      title="Delete Party"
                    >
                      <Trash size={16} weight="duotone" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
      </div>

      {/* Add Party Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false)
                resetPartyForm()
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowAddModal(false)
                resetPartyForm()
              }}
            >
              <div
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-lg shadow-2xl p-4 sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="space-y-4">
                <h2 className="text-xl font-bold">
                  {isEditMode ? (language === 'ta' ? 'திருத்து' : 'Edit') : (language === 'ta' ? 'புதிதாக சேர்' : 'Add New')} {partyType === 'customer' ? (language === 'ta' ? 'வாடிக்கையாளர்' : 'Customer') : (language === 'ta' ? 'சப்ளையர்' : 'Supplier')}
                </h2>

                {/* Party Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{language === 'ta' ? 'தரப்பினர் வகை' : 'Party Type'}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPartyType('customer')}
                      className={cn(
                        "p-3 border-2 rounded-lg flex items-center justify-center gap-2 transition-all",
                        partyType === 'customer'
                          ? "bg-success/10 border-success"
                          : "bg-muted/50 border-border hover:bg-muted"
                      )}
                    >
                      <UserCircle size={20} weight="duotone" className={partyType === 'customer' ? "text-success" : ""} />
                      <span className="font-medium text-sm">{language === 'ta' ? 'வாடிக்கையாளர்' : 'Customer'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartyType('supplier')}
                      className={cn(
                        "p-3 border-2 rounded-lg flex items-center justify-center gap-2 transition-all",
                        partyType === 'supplier'
                          ? "bg-warning/10 border-warning"
                          : "bg-muted/50 border-border hover:bg-muted"
                      )}
                    >
                      <Storefront size={20} weight="duotone" className={partyType === 'supplier' ? "text-warning" : ""} />
                      <span className="font-medium text-sm">{language === 'ta' ? 'சப்ளையர்' : 'Supplier'}</span>
                    </button>
                  </div>
                </div>

                {/* Mandatory Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {partyType === 'customer' ? (language === 'ta' ? 'வாடிக்கையாளர்' : 'Customer') : (language === 'ta' ? 'சப்ளையர்' : 'Supplier')} {language === 'ta' ? 'பெயர்' : 'Name'} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={partyName}
                      onChange={(e) => setPartyName(validateCustomerName(e.target.value))}
                      placeholder={language === 'ta' ? `${partyType === 'customer' ? 'வாடிக்கையாளர்' : 'சப்ளையர்'} பெயர் உள்ளிடவும்` : `Enter ${partyType} name (letters only)`}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {language === 'ta' ? 'தொலைபேசி எண்' : 'Phone Number'} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      value={partyPhone}
                      onChange={(e) => setPartyPhone(validatePhoneNumber(e.target.value))}
                      placeholder={language === 'ta' ? 'எண் உள்ளிடவும் (எ.கா., +919876543210)' : 'Enter phone number (e.g., +919876543210)'}
                      maxLength={16}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                    {partyPhone && partyPhone.replace(/\D/g, '').length < 10 && (
                      <p className="text-xs text-destructive mt-1">{language === 'ta' ? 'தொலைபேசி எண் குறைந்தது 10 இலக்கங்களாக இருக்க வேண்டும்' : 'Phone number must be at least 10 digits'}</p>
                    )}
                  </div>
                </div>

                {/* Optional Fields - Expandable */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{language === 'ta' ? 'விருப்ப தகவல்' : 'Optional Information'}</p>

                  {/* Billing Address */}
                  <div>
                    {!showBillingAddress ? (
                      <button
                        onClick={() => setShowBillingAddress(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'பில்லிங் முகவரி' : 'Billing Address'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'பில்லிங் முகவரி' : 'Billing Address'}</label>
                        <textarea
                          rows={2}
                          value={partyAddress}
                          onChange={(e) => setPartyAddress(e.target.value)}
                          placeholder={language === 'ta' ? 'பில்லிங் முகவரி உள்ளிடவும்' : 'Enter billing address'}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                        ></textarea>
                      </motion.div>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    {!showState ? (
                      <button
                        onClick={() => setShowState(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'மாநிலம்' : 'State'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'மாநிலம்' : 'State'}</label>
                        <select
                          value={partyState}
                          onChange={(e) => setPartyState(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        >
                          <option value="">{language === 'ta' ? 'மாநிலம் தேர்ந்தெடு' : 'Select State'}</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </div>

                  {/* GST Number - Required if settings.requireGSTIN is true */}
                  <div>
                    {!showGstNumber && !partySettings.requireGSTIN ? (
                      <button
                        onClick={() => setShowGstNumber(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'GST எண்' : 'GST Number'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">
                          {language === 'ta' ? 'GST எண்' : 'GST Number'}
                          {partySettings.requireGSTIN && <span className="text-destructive ml-1">*</span>}
                        </label>
                        <input
                          type="text"
                          value={partyGst}
                          onChange={(e) => setPartyGst(e.target.value.toUpperCase())}
                          placeholder={language === 'ta' ? 'GST எண் உள்ளிடவும் (எ.கா: 33AAAAA0000A1Z5)' : 'Enter GST number (e.g., 33AAAAA0000A1Z5)'}
                          maxLength={15}
                          className={cn(
                            "w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all",
                            partySettings.requireGSTIN && !partyGst?.trim() ? "border-destructive" : "border-border"
                          )}
                        />
                        {partySettings.requireGSTIN && !partyGst?.trim() && (
                          <p className="text-xs text-destructive">{language === 'ta' ? 'GSTIN கட்டாயமாகும்' : 'GSTIN is required'}</p>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    {!showEmail ? (
                      <button
                        onClick={() => setShowEmail(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'மின்னஞ்சல் முகவரி' : 'Email Address'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'மின்னஞ்சல் முகவரி' : 'Email Address'}</label>
                        <input
                          type="email"
                          value={partyEmail}
                          onChange={(e) => setPartyEmail(e.target.value)}
                          placeholder={language === 'ta' ? 'மின்னஞ்சல் முகவரி உள்ளிடவும்' : 'Enter email address'}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Customer Type - Dynamic from Party Settings */}
                  <div>
                    {!showCustomerType ? (
                      <button
                        onClick={() => setShowCustomerType(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'வாடிக்கையாளர் வகை' : 'Party Category'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'வாடிக்கையாளர் வகை' : 'Party Category'}</label>
                        <select
                          value={partyCustomerType}
                          onChange={(e) => setPartyCustomerType(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        >
                          {partySettings.partyCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </div>

                  {/* Credit Limit - Only show if enabled in settings */}
                  {partySettings.enableCreditLimit && (
                    <div>
                      {!showCreditLimit ? (
                        <button
                          onClick={() => setShowCreditLimit(true)}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                          <Plus size={14} weight="bold" />
                          {language === 'ta' ? 'கடன் வரம்பு' : 'Credit Limit'}
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'கடன் வரம்பு' : 'Credit Limit'}</label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 py-2 bg-muted border border-r-0 border-border rounded-l-lg text-sm font-medium text-muted-foreground">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={partyCreditLimit}
                              onChange={(e) => setPartyCreditLimit(Number(e.target.value) || 0)}
                              placeholder={language === 'ta' ? 'கடன் வரம்பு உள்ளிடவும்' : 'Enter credit limit'}
                              className="flex-1 px-3 py-2 bg-background border border-border rounded-r-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ta' ? 'இந்த வரம்புக்கு மேல் கடன் விற்பனை அனுமதிக்கப்படாது' : 'Credit sales above this limit will be restricted'}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Credit Period (Days) - Always show with default from settings */}
                  <div>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'கடன் காலம் (நாட்கள்)' : 'Credit Period (Days)'}</label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={partyCreditDays}
                        onChange={(e) => setPartyCreditDays(Number(e.target.value) || 0)}
                        placeholder={language === 'ta' ? 'கடன் காலம் நாட்கள்' : 'Credit period in days'}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === 'ta' ? `அடிப்படை: ${partySettings.defaultCreditPeriod} நாட்கள்` : `Default: ${partySettings.defaultCreditPeriod} days`}
                      </p>
                    </motion.div>
                  </div>

                  {/* Opening Balance */}
                  <div>
                    {!showOpeningBalance ? (
                      <button
                        onClick={() => setShowOpeningBalance(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'ஆரம்ப இருப்பு' : 'Opening Balance'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'ஆரம்ப இருப்பு (₹)' : 'Opening Balance (₹)'}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={partyOpeningBalance}
                          onChange={(e) => setPartyOpeningBalance(e.target.value)}
                          placeholder={language === 'ta' ? 'ஆரம்ப இருப்பு உள்ளிடவும் (எ.கா., 5000)' : 'Enter opening balance (e.g., 5000)'}
                          className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                        <p className="text-xs text-muted-foreground">
                          {language === 'ta' ? 'நேர் = அவர்கள் கடன்பட்டுள்ளனர், எதிர் = நீங்கள் கடன்பட்டுள்ளீர்கள்' : 'Positive = They owe you, Negative = You owe them'}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Vehicle No */}
                  <div>
                    {!showVehicleNo ? (
                      <button
                        onClick={() => setShowVehicleNo(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'வாகன எண்' : 'Vehicle No'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'வாகன எண்' : 'Vehicle No'}</label>
                        <input
                          type="text"
                          value={partyVehicleNo}
                          onChange={(e) => setPartyVehicleNo(e.target.value.toUpperCase())}
                          placeholder={language === 'ta' ? 'வாகன எண் உள்ளிடவும் (எ.கா., TN01AB1234)' : 'Enter vehicle number (e.g., TN01AB1234)'}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    {!showNotes ? (
                      <button
                        onClick={() => setShowNotes(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'குறிப்புகள்' : 'Notes'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'குறிப்புகள்' : 'Notes'}</label>
                        <textarea
                          rows={2}
                          value={partyNotes}
                          onChange={(e) => setPartyNotes(e.target.value)}
                          placeholder={language === 'ta' ? 'கூடுதல் குறிப்புகளைச் சேர்க்கவும்' : 'Add any additional notes'}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                        ></textarea>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      resetPartyForm()
                    }}
                    className="flex-1 px-4 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleSaveParty}
                    disabled={isLoadingParties || !partyName?.trim() || !partyPhone || partyPhone.length !== 10}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoadingParties ? (
                      <>
                        <ArrowsClockwise size={18} weight="duotone" className="animate-spin" />
                        {language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...'}
                      </>
                    ) : (
                      `${isEditMode ? (language === 'ta' ? 'புதுப்பி' : 'Update') : (language === 'ta' ? 'சேர்' : 'Add')} ${partyType === 'customer' ? (language === 'ta' ? 'வாடிக்கையாளர்' : 'Customer') : (language === 'ta' ? 'சப்ளையர்' : 'Supplier')}`
                    )}
                  </button>
                </div>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Ledger Modal */}
      {showLedgerModal && selectedParty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card text-card-foreground sm:rounded-xl border border-border w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto"
          >
            <div className="p-3 sm:p-6 border-b border-border sticky top-0 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">{selectedParty.name} - {language === 'ta' ? 'லெட்ஜர்' : 'Ledger'}</h2>
                  <p className={cn(
                    "text-xs sm:text-sm mt-1 font-medium",
                    selectedParty.type === 'customer'
                      ? (selectedParty.currentBalance > 0 ? "text-emerald-600" : selectedParty.currentBalance < 0 ? "text-red-600" : "text-gray-500")
                      : (selectedParty.currentBalance > 0 ? "text-red-600" : selectedParty.currentBalance < 0 ? "text-emerald-600" : "text-gray-500")
                  )}>
                    Outstanding: {selectedParty.type === 'customer'
                      ? (selectedParty.currentBalance > 0 ? '+' : selectedParty.currentBalance < 0 ? '-' : '')
                      : (selectedParty.currentBalance > 0 ? '-' : selectedParty.currentBalance < 0 ? '+' : '')}
                    ₹{Math.abs(selectedParty.currentBalance || 0).toLocaleString()}
                    {selectedParty.currentBalance > 0
                      ? (selectedParty.type === 'customer' ? ' (To Receive)' : ' (To Pay)')
                      : selectedParty.currentBalance < 0
                        ? (selectedParty.type === 'customer' ? ' (Advance)' : ' (Credit)')
                        : ' (Settled)'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={printLedger}
                    className="p-2 hover:bg-muted rounded-lg transition-colors active:scale-95"
                    title="Print Ledger"
                  >
                    <Printer size={20} weight="duotone" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Credit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingLedger ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          Loading ledger entries...
                        </td>
                      </tr>
                    ) : ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No transactions yet. Ledger entries will appear here when you create invoices or record payments.
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              entry.type === 'invoice' ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                            )}>
                              {entry.type === 'invoice' ? 'Invoice' : 'Payment'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{entry.referenceNumber}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{entry.description}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-success">
                            {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className={cn(
                            "px-4 py-3 text-sm text-right font-semibold",
                            entry.balance > 0 ? "text-primary" : entry.balance < 0 ? "text-destructive" : ""
                          )}>
                            ₹{entry.balance.toLocaleString('en-IN')}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                  {ledgerEntries.length > 0 && (
                    <tfoot className="bg-muted/50 font-semibold">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right">Final Balance:</td>
                        <td className="px-4 py-3 text-right">
                          ₹{ledgerEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right text-success">
                          ₹{ledgerEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString('en-IN')}
                        </td>
                        <td className={cn(
                          "px-4 py-3 text-right",
                          ledgerEntries[ledgerEntries.length - 1]?.balance > 0 ? "text-primary" :
                          ledgerEntries[ledgerEntries.length - 1]?.balance < 0 ? "text-destructive" : ""
                        )}>
                          ₹{(ledgerEntries[ledgerEntries.length - 1]?.balance || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => setShowLedgerModal(false)}
                className="px-4 py-2 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                {t.common.close}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && partyToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card text-card-foreground rounded-xl border border-border w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <Trash size={24} weight="duotone" className="text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-destructive">{language === 'ta' ? 'தரப்பினர் நீக்கு' : 'Delete Party'}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'ta' ? 'இந்த செயலை செயல்தவிர்க்க முடியாது' : 'This action cannot be undone'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  {language === 'ta' ? 'இந்த தரப்பினரை நிச்சயமாக நீக்க விரும்புகிறீர்களா?' : 'Are you sure you want to delete this party?'}
                </p>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="font-semibold text-foreground">
                    {partyToDelete.displayName || partyToDelete.companyName || partyToDelete.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {partyToDelete.phone} • {partyToDelete.email}
                  </p>
                  {(() => {
                    // Use outstanding field (from getPartiesWithOutstanding) or currentBalance as fallback
                    const balance = partyToDelete.outstanding ?? partyToDelete.currentBalance ?? 0
                    // Skip if balance is 0, NaN, or undefined
                    if (!balance || isNaN(balance) || balance === 0) return null
                    return (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">Outstanding Balance:</p>
                        <p className={cn(
                          "text-sm font-semibold mt-1",
                          partyToDelete.type === 'customer'
                            ? (balance > 0 ? "text-emerald-600" : "text-red-600")
                            : (balance > 0 ? "text-red-600" : "text-emerald-600")
                        )}>
                          {partyToDelete.type === 'customer'
                            ? (balance > 0 ? '+' : '-')
                            : (balance > 0 ? '-' : '+')}
                          ₹{Math.abs(balance).toLocaleString()}
                          {balance > 0
                            ? (partyToDelete.type === 'customer' ? ' (To Receive)' : ' (To Pay)')
                            : (partyToDelete.type === 'customer' ? ' (Advance)' : ' (Credit)')}
                        </p>
                      </div>
                    )
                  })()}
                </div>
                {(() => {
                  const balance = partyToDelete.outstanding ?? partyToDelete.currentBalance ?? 0
                  if (!balance || isNaN(balance) || balance === 0) return null
                  return (
                    <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-xs text-destructive">
                        {language === 'ta' ? '⚠️ எச்சரிக்கை: இந்த தரப்பினருக்கு நிலுவை இருப்பு உள்ளது. நீக்குவது அனைத்து பரிவர்த்தனை வரலாற்றையும் அகற்றும்.' : '⚠️ Warning: This party has an outstanding balance. Deleting will remove all transaction history.'}
                      </p>
                    </div>
                  )
                })()}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setPartyToDelete(null)
                  }}
                  disabled={isLoadingParties}
                  className="px-4 py-2 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={confirmDeleteParty}
                  disabled={isLoadingParties}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoadingParties ? (
                    <>
                      <ArrowsClockwise size={18} weight="duotone" className="animate-spin" />
                      {language === 'ta' ? 'நீக்குகிறது...' : 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash size={18} weight="duotone" />
                      {language === 'ta' ? 'தரப்பினர் நீக்கு' : 'Delete Party'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Parties
