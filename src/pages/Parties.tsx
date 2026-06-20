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
  MapPin,
  TrendUp,
  TrendDown,
  Receipt,
  ShoppingCart,
  Wallet,
  Calendar,
  Export,
  Printer,
  Pencil,
  Trash,
  X,
  Eye,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { getPartyLedger, getPartyBalance, type LedgerEntry } from '../services/ledgerService'
import { getParties, getPartiesWithOutstanding, createParty, updateParty, deleteParty, findPartyByName, findPartyByGSTIN } from '../services/partyService'
import { getPartySettings, type PartySettings } from '../services/settingsService'
import { getInvoices, updateInvoice } from '../services/invoiceService'
import { toast } from 'sonner'
import { validateCustomerName, validatePhoneNumber, validateGSTIN } from '../utils/inputValidation'
import { getPartyName } from '../utils/partyUtils'
import StudentDetailsModal from '../components/StudentDetailsModal'
import AddAdmissionModal from '../components/AddAdmissionModal'
import PeriodFilterDropdown, { type PeriodFilterValue } from '../components/PeriodFilterDropdown'

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

  const [statsFilter, setStatsFilter] = useState<PeriodFilterValue>('all')
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
  const [viewingStudent, setViewingStudent] = useState<any>(null)
  const [admissionForStudent, setAdmissionForStudent] = useState<any>(null)

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
  const [showDob, setShowDob] = useState(false)
  const [showGender, setShowGender] = useState(false)
  const [showIdProof, setShowIdProof] = useState(false)
  const [showEmergencyContact, setShowEmergencyContact] = useState(false)
  const [showAdmissionDate, setShowAdmissionDate] = useState(false)
  const [showFocus, setShowFocus] = useState(false)
  const [showLeadSource, setShowLeadSource] = useState(false)

  // Form state for new party
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer')
  const [partyName, setPartyName] = useState('')
  const [partyPhone, setPartyPhone] = useState('') // Just the 10-digit number (91 prefix shown separately)
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
  const [studentDob, setStudentDob] = useState('')
  const [studentGender, setStudentGender] = useState('')
  const [studentIdProofType, setStudentIdProofType] = useState('')
  const [studentIdProofNumber, setStudentIdProofNumber] = useState('')
  const [studentAdmissionDate, setStudentAdmissionDate] = useState('')
  const [studentEmergencyName, setStudentEmergencyName] = useState('')
  const [studentEmergencyPhone, setStudentEmergencyPhone] = useState('')
  const [studentFocus, setStudentFocus] = useState('')
  const [studentSource, setStudentSource] = useState('')
  const [studentSourceOther, setStudentSourceOther] = useState('')

  // Dropdown menu state

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
    setPartyPhone('') // Just the 10-digit number (91 prefix shown separately)
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
    setShowDob(false)
    setShowGender(false)
    setShowIdProof(false)
    setShowEmergencyContact(false)
    setShowAdmissionDate(false)
    setShowFocus(false)
    setShowLeadSource(false)
    setShowCreditLimit(false)
    setPartyOpeningBalance('')
    setShowOpeningBalance(false)
    setStudentDob('')
    setStudentGender('')
    setStudentIdProofType('')
    setStudentIdProofNumber('')
    setStudentAdmissionDate('')
    setStudentEmergencyName('')
    setStudentEmergencyPhone('')
    setStudentFocus('')
    setStudentSource('')
    setStudentSourceOther('')
    setIsEditMode(false)
    setEditingPartyId(null)
  }

  // Handle save party (create or update)
  const handleSaveParty = async () => {
    if (!partyName?.trim() || !partyPhone?.trim()) {
      toast.error('Please fill Name and Phone Number')
      return
    }

    // Validate phone number - must be exactly 10 digits (91 prefix is added automatically)
    const phoneDigits = partyPhone.replace(/\D/g, '') // Remove non-digits
    if (phoneDigits.length !== 10) {
      toast.error('Phone number must be exactly 10 digits')
      return
    }

    // Validate GSTIN if required by settings (clients only)
    if (partyType === 'supplier' && partySettings.requireGSTIN && !partyGst?.trim()) {
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
      // Format phone with 91 prefix for storage
      const formattedPhone = '91' + phoneDigits

      console.log(isEditMode ? 'Updating' : 'Creating', 'party with data:', {
        type: partyType,
        companyName: partyName.trim(),
        displayName: partyName.trim(),
        phone: formattedPhone,
        email: partyEmail?.trim() || '',
      })

      // Build party data object, omitting undefined fields for Firebase
      const openingBal = parseFloat(partyOpeningBalance) || 0
      const admissionDetails = {
        dateOfBirth: studentDob?.trim() || '',
        gender: studentGender?.trim() || '',
        idProof: {
          type: studentIdProofType?.trim() || '',
          number: studentIdProofNumber?.trim() || ''
        },
        admissionDate: studentAdmissionDate?.trim() || '',
        emergencyContact: {
          name: studentEmergencyName?.trim() || '',
          phone: studentEmergencyPhone?.trim() || ''
        },
        focus: studentFocus?.trim() || '',
        leadSource: {
          channel: studentSource?.trim() || '',
          other: studentSourceOther?.trim() || ''
        },
        courseOrBatch: partyVehicleNo?.trim() || ''
      }

      const hasAdmissionDetails = Object.values(admissionDetails).some((value) => {
        if (typeof value === 'string') return value.length > 0
        if (value && typeof value === 'object') {
          return Object.values(value).some((nested) => (nested || '').toString().trim().length > 0)
        }
        return false
      })

      const partyData: any = {
        type: partyType,
        name: partyName.trim(),
        companyName: partyName.trim(),
        displayName: partyName.trim(),
        phone: formattedPhone,
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

      // Add admission details for students
      if (partyType === 'customer' && hasAdmissionDetails) {
        partyData.admissionDetails = admissionDetails
      }

      if (isEditMode && editingPartyId) {
        // Check for TRUE duplicate (excluding current party being edited)
        // Same name with different phone/GSTIN is allowed
        const existingByName = await findPartyByName(partyName.trim(), partyType)
        if (existingByName && existingByName.id !== editingPartyId) {
          // Normalize phone numbers for comparison
          const newPhone = (partyPhone || '').replace(/\D/g, '').trim()
          const existingPhone = (existingByName.phone || '').replace(/\D/g, '').trim()
          const newGstin = (partyGst || '').trim().toUpperCase()
          const existingGstin = (existingByName.gstDetails?.gstin || existingByName.gstin || '').trim().toUpperCase()

          // Only block if TRUE duplicate (same identifier OR both have no identifiers)
          const bothHaveNoIdentifiers = !newPhone && !existingPhone && !newGstin && !existingGstin
          const samePhone = newPhone && existingPhone && newPhone === existingPhone
          const sameGstin = newGstin && existingGstin && newGstin === existingGstin

          if (bothHaveNoIdentifiers || samePhone || sameGstin) {
            toast.error(`A ${partyType === 'customer' ? 'student' : 'client'} with the name "${existingByName.displayName || existingByName.companyName}" and same contact details already exists.`)
            setIsLoadingParties(false)
            return
          }
        }

        const oldPartySnapshot = parties.find((p) => p.id === editingPartyId)

        // Update existing party
        const success = await updateParty(editingPartyId, partyData)

        if (success) {
          // Sync student details to related admissions so Admissions page reflects updates automatically.
          if (partyType === 'customer') {
            try {
              const normalizeName = (value: any) => String(value || '').trim().toLowerCase()
              const normalizePhone = (value: any) => String(value || '').replace(/\D/g, '')
              const oldNames = Array.from(new Set([
                normalizeName((oldPartySnapshot as any)?.name),
                normalizeName((oldPartySnapshot as any)?.displayName),
                normalizeName((oldPartySnapshot as any)?.companyName),
                normalizeName(getPartyName(oldPartySnapshot as any)),
              ].filter(Boolean)))
              const oldPhones = Array.from(new Set([
                normalizePhone((oldPartySnapshot as any)?.phone),
              ].filter(Boolean)))

              const salesInvoices = await getInvoices('sale')
              const linkedAdmissions = (salesInvoices || []).filter((inv: any) => {
                if (inv.partyId === editingPartyId) return true

                const invName = normalizeName(inv.partyName)
                const invPhone = normalizePhone(inv.phone)
                const nameMatch = Boolean(invName) && oldNames.includes(invName)
                const phoneMatch = Boolean(invPhone) && oldPhones.some((p) => p === invPhone || p.endsWith(invPhone) || invPhone.endsWith(p))
                return nameMatch || phoneMatch
              })

              await Promise.all(
                linkedAdmissions.map((inv: any) =>
                  updateInvoice(inv.id, {
                    partyId: editingPartyId,
                    partyName: partyName.trim(),
                    phone: formattedPhone,
                    email: partyEmail?.trim() || '',
                  } as any)
                )
              )

              setAllInvoices((prev: any[]) =>
                prev.map((inv: any) => {
                  const matched = linkedAdmissions.some((a: any) => a.id === inv.id)
                  if (!matched) return inv
                  return {
                    ...inv,
                    partyId: editingPartyId,
                    partyName: partyName.trim(),
                    phone: formattedPhone,
                    email: partyEmail?.trim() || '',
                  }
                })
              )
            } catch (syncError) {
              console.error('Failed to sync admissions with updated student:', syncError)
            }
          }

          // Update party in local state
          setParties(parties.map(p => p.id === editingPartyId ? { ...p, ...partyData } : p))
          toast.success(`${partyType === 'customer' ? 'Student' : 'Client'} updated successfully!`)
          setShowAddModal(false)
          resetPartyForm()
        } else {
          toast.error('Failed to update record. Please try again.')
        }
      } else {
        // Check for duplicate by GSTIN first (if provided) - GSTIN must be unique
        if (partyGst?.trim()) {
          const existingByGstin = await findPartyByGSTIN(partyGst.trim().toUpperCase())
          if (existingByGstin) {
            toast.error(`A record with GSTIN "${partyGst.trim().toUpperCase()}" already exists: "${existingByGstin.displayName || existingByGstin.companyName}". Please use a different GSTIN.`)
            setIsLoadingParties(false)
            return
          }
        }

        // Check for TRUE duplicate - same name AND same phone/GSTIN (or both missing)
        // Parties with same name but different phone numbers are allowed
        const existingByName = await findPartyByName(partyName.trim(), partyType)
        if (existingByName) {
          // Normalize phone numbers for comparison (remove non-digits)
          const newPhone = (partyPhone || '').replace(/\D/g, '').trim()
          const existingPhone = (existingByName.phone || '').replace(/\D/g, '').trim()
          const newGstin = (partyGst || '').trim().toUpperCase()
          const existingGstin = (existingByName.gstDetails?.gstin || existingByName.gstin || '').trim().toUpperCase()

          // Check if this is a TRUE duplicate (same identifier OR both have no identifiers)
          const bothHaveNoIdentifiers = !newPhone && !existingPhone && !newGstin && !existingGstin
          const samePhone = newPhone && existingPhone && newPhone === existingPhone
          const sameGstin = newGstin && existingGstin && newGstin === existingGstin

          if (bothHaveNoIdentifiers || samePhone || sameGstin) {
            // TRUE duplicate - block creation
            toast.error(`A ${partyType === 'customer' ? 'student' : 'client'} with the name "${existingByName.displayName || existingByName.companyName}" and same contact details already exists. Please edit the existing ${partyType === 'customer' ? 'student' : 'client'}.`)
            setIsLoadingParties(false)
            return
          }
          // Different phone/GSTIN = different person with same name = allowed
        }

        // Create new party
        const newParty = await createParty(partyData)

        console.log('Party created:', newParty)

        if (newParty) {
          setParties([...parties, newParty])
          toast.success(`${partyType === 'customer' ? 'Student' : 'Client'} added successfully!`)
          setShowAddModal(false)
          resetPartyForm()
        } else {
          console.error('createParty returned null')
          toast.error('Failed to add record. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error saving party:', error)
      toast.error(`Failed to ${isEditMode ? 'update' : 'add'} record: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    setPartyName(getPartyName(party))
    // Extract just the 10-digit number (remove country code if present)
    const existingPhone = party.phone || ''
    const phoneDigits = existingPhone.replace(/\D/g, '') // Remove all non-digits
    // If starts with 91 and has more than 10 digits, remove the 91 prefix
    const cleanPhone = phoneDigits.startsWith('91') && phoneDigits.length > 10
      ? phoneDigits.slice(2)
      : phoneDigits.slice(-10) // Take last 10 digits
    setPartyPhone(cleanPhone)
    setPartyEmail(party.email || '')
    setPartyGst(party.gstDetails?.gstin || '')
    setPartyAddress(party.billingAddress?.street || '')
    setPartyState(party.billingAddress?.state || '')
    setPartyCustomerType(party.paymentTerms || settings.partyCategories[0] || 'Regular')
    setPartyNotes(party.notes || '')
    setPartyVehicleNo(party.vehicleNo || '')
    setPartyCreditLimit(party.creditLimit || 0)
    setPartyCreditDays(party.creditDays || settings.defaultCreditPeriod || 30)
    setStudentDob(party.admissionDetails?.dateOfBirth || '')
    setStudentGender(party.admissionDetails?.gender || '')
    setStudentIdProofType(party.admissionDetails?.idProof?.type || '')
    setStudentIdProofNumber(party.admissionDetails?.idProof?.number || '')
    setStudentAdmissionDate(party.admissionDetails?.admissionDate || '')
    setStudentEmergencyName(party.admissionDetails?.emergencyContact?.name || '')
    setStudentEmergencyPhone(party.admissionDetails?.emergencyContact?.phone || '')
    setStudentFocus(party.admissionDetails?.focus || '')
    setStudentSource(party.admissionDetails?.leadSource?.channel || '')
    setStudentSourceOther(party.admissionDetails?.leadSource?.other || '')

    // Show expandable sections if they have data
    if (party.billingAddress?.street) setShowBillingAddress(true)
    if (party.gstDetails?.gstin) setShowGstNumber(true)
    if (party.email) setShowEmail(true)
    if (party.paymentTerms) setShowCustomerType(true)
    if (party.notes) setShowNotes(true)
    if (party.billingAddress?.state) setShowState(true)
    if (party.vehicleNo) setShowVehicleNo(true)
    if (party.creditLimit > 0 && settings.enableCreditLimit) setShowCreditLimit(true)
    if (party.admissionDetails?.dateOfBirth) setShowDob(true)
    if (party.admissionDetails?.gender) setShowGender(true)
    if (party.admissionDetails?.idProof?.type || party.admissionDetails?.idProof?.number) setShowIdProof(true)
    if (party.admissionDetails?.emergencyContact?.name || party.admissionDetails?.emergencyContact?.phone) setShowEmergencyContact(true)
    if (party.admissionDetails?.admissionDate) setShowAdmissionDate(true)
    if (party.admissionDetails?.focus) setShowFocus(true)
    if (party.admissionDetails?.leadSource?.channel || party.admissionDetails?.leadSource?.other) setShowLeadSource(true)

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
        toast.success('Record deleted successfully!')
        setShowDeleteModal(false)
        setPartyToDelete(null)
      } else {
        toast.error('Failed to delete record. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting party:', error)
      toast.error(`Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingParties(false)
    }
  }

  // Filter parties by search and tab only (not by date - date filter is for summary cards)
  const filteredParties = parties.filter(party => {
    const matchesSearch = (getPartyName(party).toLowerCase().includes(searchQuery.toLowerCase())) ||
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
      const monthStart = new Date()
      monthStart.setDate(1)
      return invoiceDateStr >= monthStart.toISOString().split('T')[0]
    } else if (statsFilter === 'year') {
      const yearAgo = new Date()
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      return invoiceDateStr >= yearAgo.toISOString().split('T')[0]
    }
    return true
  }

  // Summary based on outstanding balances (due vs advance)
  const partiesSummary = useMemo(() => {
    let totalReceivables = 0
    let totalPayables = 0
    let totalPaid = 0

    filteredParties.forEach(party => {
      const outstanding = party.outstanding ?? party.currentBalance ?? 0

      if (outstanding > 0) {
        totalReceivables += outstanding
      } else if (outstanding < 0) {
        totalPayables += Math.abs(outstanding)
      }
    })

    allInvoices.forEach(inv => {
      if (inv.type === 'sales') {
        totalPaid += Number(inv.paidAmount) || Number(inv.payment?.paidAmount) || 0;
      }
    });

    return {
      totalParties: filteredParties.length,
      customers: filteredParties.filter(p => p.type === 'customer').length,
      suppliers: filteredParties.filter(p => p.type === 'supplier').length,
      totalReceivables,
      totalPayables,
      totalPaid,
      netBalance: totalReceivables - totalPayables,
      activeParties: filteredParties.filter(p => p.isActive !== false).length,
      overdueCustomers: 0
    }
  }, [filteredParties, allInvoices])

  const viewLedger = (party: typeof parties[0]) => {
    setSelectedParty(party)
    setShowLedgerModal(true)
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

    const partyName = getPartyName(selectedParty)
    const outstanding = selectedParty.currentBalance || 0
    // Positive = they owe us (Total Due), Negative = we owe them (Advance/Credit)
    const balanceLabel = outstanding > 0 ? 'Due' : outstanding < 0 ? 'Advance/Credit' : 'Settled'

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
          <h1>${partyName} - Account Statement</h1>
          <p>${selectedParty.type === 'customer' ? 'Student' : 'Client'} | ${selectedParty.phone || ''}</p>
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
            <label>Balance (${balanceLabel})</label>
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
    <div className="erp-module-page p-3 sm:p-4 lg:p-4 pb-16 sm:pb-20 lg:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3"
      >
        {/* Top Row: KPI Cards (Left) + Filters & Actions (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          {/* Left Side: KPI Cards */}
          <div className="flex-1 min-w-0 grid grid-cols-3 gap-1.5 sm:gap-2">
            {/* Total Students Card */}
            <div onClick={() => setActiveTab('customers')} className="relative p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md min-w-0">
              <div>
                <h3 className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{language === 'ta' ? 'மொத்த மாணவர்கள்' : 'Total Students'}</h3>
                <p className="text-sm sm:text-base font-bold mt-0.5 text-slate-700 dark:text-slate-200">
                  {parties.filter(p => p.type === 'customer').length}
                </p>
              </div>
            </div>

            {/* Paid Amount Card */}
            <div className="relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md min-w-0">
              <div>
                <h3 className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{language === 'ta' ? 'செலுத்திய தொகை' : 'Paid Amount'}</h3>
                <p className="text-sm sm:text-base font-bold mt-0.5 text-slate-700 dark:text-slate-200 truncate">
                  {"₹"}{partiesSummary.totalPaid >= 10000000 ? (partiesSummary.totalPaid / 10000000).toFixed(1) + ' Cr' : partiesSummary.totalPaid >= 100000 ? (partiesSummary.totalPaid / 100000).toFixed(1) + ' L' : partiesSummary.totalPaid >= 1000 ? (partiesSummary.totalPaid / 1000).toFixed(1) + ' K' : partiesSummary.totalPaid.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Pending Amount Card */}
            <div onClick={() => setActiveTab('customers')} className="relative p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md min-w-0">
              <div>
                <h3 className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{language === 'ta' ? 'நிலுவை தொகை' : 'Pending Amount'}</h3>
                <p className="text-sm sm:text-base font-bold mt-0.5 text-slate-700 dark:text-slate-200 truncate">
                  {"₹"}{partiesSummary.totalReceivables >= 10000000 ? (partiesSummary.totalReceivables / 10000000).toFixed(1) + ' Cr' : partiesSummary.totalReceivables >= 100000 ? (partiesSummary.totalReceivables / 100000).toFixed(1) + ' L' : partiesSummary.totalReceivables >= 1000 ? (partiesSummary.totalReceivables / 1000).toFixed(1) + ' K' : partiesSummary.totalReceivables.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Date Filters + Action Button */}
          <div className="flex flex-row items-center justify-end gap-1.5 flex-shrink-0 w-auto">
            <PeriodFilterDropdown value={statsFilter} onChange={setStatsFilter} />
            <button
              onClick={() => setShowAddModal(true)}
              className="erp-module-primary-btn"
            >
              <Plus size={14} weight="bold" />
              <span>{language === 'ta' ? 'மாணவர்' : 'Student'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-3"
      >
        <div className="relative">
          <MagnifyingGlass size={18} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'ta' ? 'à®ªà¯†à®¯à®°à¯, à®¤à¯Šà®²à¯ˆà®ªà¯‡à®šà®¿ à®…à®²à¯à®²à®¤à¯ à®®à®¿à®©à¯à®©à®žà¯à®šà®²à®¾à®²à¯ à®¤à¯‡à®Ÿà¯...' : 'Search by name, phone, or email...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
        </div>
      </motion.div>

      {/* Tab Filters */}
      <div className="grid grid-cols-3 gap-2 mb-3 md:flex md:items-center md:gap-2 md:overflow-x-auto md:pb-1">
        {[
          { id: 'all', label: language === 'ta' ? 'à®…à®©à¯ˆà®¤à¯à®¤à¯ à®¤à®°à®ªà¯à®ªà®¿à®©à®°à¯' : 'All', count: parties.length },
          { id: 'customers', label: language === 'ta' ? 'à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯à®•à®³à¯' : 'Students', count: parties.filter(p => p.type === 'customer').length },
          { id: 'suppliers', label: language === 'ta' ? 'à®šà®ªà¯à®³à¯ˆà®¯à®°à¯à®•à®³à¯' : 'Clients', count: parties.filter(p => p.type === 'supplier').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "erp-module-filter-chip w-full md:w-auto justify-center text-center",
              activeTab === tab.id
                ? "is-active"
                : "border border-slate-200 dark:border-slate-600"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Students / Clients Table */}
      {isLoadingParties ? (
        <div className="flex items-center justify-center py-20">
          <ArrowsClockwise size={32} weight="duotone" className="text-blue-600 animate-spin" />
        </div>
      ) : filteredParties.length === 0 ? (
        <div className="text-center py-20">
          <Users size={48} weight="duotone" className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{language === 'ta' ? 'தரப்பினர் எதுவும் இல்லை' : 'No students or clients found'}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Phone</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5 text-right">Balance</th>
                  <th className="px-3 py-2.5 text-right">Total Billed</th>
                  <th className="px-2 py-2.5 text-right w-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParties.map((party, index) => {
                  const outstanding = party.outstanding ?? party.currentBalance ?? 0
                  const getProperColor = () => {
                    if (outstanding === 0) return 'grey'
                    return outstanding > 0 ? 'green' : 'red'
                  }
                  const outstandingColor = getProperColor()
                  const outstandingFormatted = `₹${Math.abs(outstanding).toLocaleString('en-IN')}`

                  return (
                    <motion.tr
                      key={party.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className={cn(
                            'p-1.5 rounded-lg flex-shrink-0',
                            party.type === 'customer' ? 'bg-blue-50' : 'bg-orange-50'
                          )}>
                            {party.type === 'customer' ? (
                              <UserCircle size={16} weight="duotone" className="text-blue-600" />
                            ) : (
                              <Storefront size={16} weight="duotone" className="text-orange-600" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingStudent(party)}
                            title="View student details"
                            className="font-medium text-slate-800 dark:text-slate-100 truncate text-left cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                          >
                            {getPartyName(party)}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {party.phone || '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                          party.type === 'customer' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                        )}>
                          {party.type === 'customer' ? (language === 'ta' ? 'மாணவர்' : 'Student') : (language === 'ta' ? 'வாடிக்கையாளர்' : 'Client')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className={cn(
                          'font-semibold text-xs',
                          outstandingColor === 'green' && 'text-emerald-600',
                          outstandingColor === 'red' && 'text-red-600',
                          outstandingColor === 'grey' && 'text-slate-500'
                        )}>
                          {outstanding !== 0 && (outstandingColor === 'green' ? '+' : '-')}
                          {outstandingFormatted}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        ₹{((party.type === 'customer' ? (party.totalSales || 0) : (party.totalPurchases || 0))).toLocaleString('en-IN')}
                      </td>
                      <td className="px-2 py-2.5 w-0">
                        <div className="inline-flex items-center justify-end gap-0">
                          <button
                            type="button"
                            onClick={() => setAdmissionForStudent({
                              id: party.id,
                              name: getPartyName(party),
                              phone: party.phone || '',
                              email: party.email || '',
                              address: party.billingAddress?.street || (party as any).address || '',
                              admissionDetails: (party as any).admissionDetails,
                            })}
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="Add Admission"
                          >
                            <Plus size={15} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingStudent(party)}
                            className="p-1 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            title="View"
                          >
                            <Eye size={15} weight="duotone" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditParty(party)}
                            className="p-1 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            title="Edit"
                          >
                            <Pencil size={15} weight="duotone" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteParty(party)}
                            className="p-1 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete"
                          >
                            <Trash size={15} weight="duotone" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Student/Client Modal */}
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
                  {isEditMode ? (language === 'ta' ? 'à®¤à®¿à®°à¯à®¤à¯à®¤à¯' : 'Edit') : (language === 'ta' ? 'à®ªà¯à®¤à®¿à®¤à®¾à®• à®šà¯‡à®°à¯' : 'Add New')} {partyType === 'customer' ? (language === 'ta' ? 'à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯' : 'Student') : (language === 'ta' ? 'à®šà®ªà¯à®³à¯ˆà®¯à®°à¯' : 'Client')}
                </h2>

                {/* Record Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{language === 'ta' ? 'à®¤à®°à®ªà¯à®ªà®¿à®©à®°à¯ à®µà®•à¯ˆ' : 'Record Type'}</label>
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
                      <span className="font-medium text-sm">{language === 'ta' ? 'à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯' : 'Student'}</span>
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
                      <span className="font-medium text-sm">{language === 'ta' ? 'à®šà®ªà¯à®³à¯ˆà®¯à®°à¯' : 'Client'}</span>
                    </button>
                  </div>
                </div>

                {/* Mandatory Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {partyType === 'customer' ? (language === 'ta' ? 'à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯' : 'Student') : (language === 'ta' ? 'à®šà®ªà¯à®³à¯ˆà®¯à®°à¯' : 'Client')} {language === 'ta' ? 'à®ªà¯†à®¯à®°à¯' : 'Name'} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={partyName}
                      onChange={(e) => setPartyName(validateCustomerName(e.target.value))}
                      placeholder={language === 'ta' ? `${partyType === 'customer' ? 'à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯' : 'à®šà®ªà¯à®³à¯ˆà®¯à®°à¯'} à®ªà¯†à®¯à®°à¯ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯` : `Enter ${partyType === 'customer' ? 'student' : 'client'} name (letters only)`}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {language === 'ta' ? 'à®¤à¯Šà®²à¯ˆà®ªà¯‡à®šà®¿ à®Žà®£à¯' : 'Phone Number'} <span className="text-destructive">*</span>
                    </label>
                    <div className="flex">
                      {/* Fixed 91 prefix */}
                      <div className="flex items-center justify-center px-3 py-2.5 bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground font-medium select-none">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={partyPhone}
                        onChange={(e) => {
                          // Only allow digits, max 10
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setPartyPhone(digits)
                        }}
                        placeholder={language === 'ta' ? '10 à®‡à®²à®•à¯à®• à®Žà®£à¯' : '10 digit number'}
                        maxLength={10}
                        className="flex-1 px-3 py-2.5 bg-background border border-border rounded-r-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    {partyPhone && partyPhone.length > 0 && partyPhone.length < 10 && (
                      <p className="text-xs text-destructive mt-1">{language === 'ta' ? 'à®¤à¯Šà®²à¯ˆà®ªà¯‡à®šà®¿ à®Žà®£à¯ 10 à®‡à®²à®•à¯à®•à®™à¯à®•à®³à®¾à®• à®‡à®°à¯à®•à¯à®• à®µà¯‡à®£à¯à®Ÿà¯à®®à¯' : `Phone number must be 10 digits (${partyPhone.length}/10)`}</p>
                    )}
                  </div>
                </div>

                {/* Optional Fields - Expandable */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{language === 'ta' ? 'à®µà®¿à®°à¯à®ªà¯à®ª à®¤à®•à®µà®²à¯' : 'Optional Information'}</p>

                  {/* Address */}
                  <div>
                    {!showBillingAddress ? (
                      <button
                        onClick={() => setShowBillingAddress(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'à®ªà®¿à®²à¯à®²à®¿à®™à¯ à®®à¯à®•à®µà®°à®¿' : 'Address'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®ªà®¿à®²à¯à®²à®¿à®™à¯ à®®à¯à®•à®µà®°à®¿' : 'Address'}</label>
                        <textarea
                          rows={2}
                          value={partyAddress}
                          onChange={(e) => setPartyAddress(e.target.value)}
                          placeholder={language === 'ta' ? 'à®ªà®¿à®²à¯à®²à®¿à®™à¯ à®®à¯à®•à®µà®°à®¿ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯' : 'Enter address'}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                        ></textarea>
                      </motion.div>
                    )}
                  </div>

                  {partyType !== 'customer' && (
                    <>
                      {/* State */}
                      <div>
                        {!showState ? (
                          <button
                            onClick={() => setShowState(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®®à®¾à®¨à®¿à®²à®®à¯' : 'State'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®®à®¾à®¨à®¿à®²à®®à¯' : 'State'}</label>
                            <select
                              value={partyState}
                              onChange={(e) => setPartyState(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            >
                              <option value="">{language === 'ta' ? 'à®®à®¾à®¨à®¿à®²à®®à¯ à®¤à¯‡à®°à¯à®¨à¯à®¤à¯†à®Ÿà¯' : 'Select State'}</option>
                              {INDIAN_STATES.map((state) => (
                                <option key={state} value={state}>
                                  {state}
                                </option>
                              ))}
                            </select>
                          </motion.div>
                        )}
                      </div>
                    </>
                  )}

                  {partyType !== 'customer' && (
                    <>
                      {/* Tax ID / GST - Required if settings.requireGSTIN is true */}
                      <div>
                        {!showGstNumber && !partySettings.requireGSTIN ? (
                          <button
                            onClick={() => setShowGstNumber(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'GST à®Žà®£à¯' : 'Tax ID / GST'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">
                              {language === 'ta' ? 'GST à®Žà®£à¯' : 'Tax ID / GST'}
                              {partySettings.requireGSTIN && <span className="text-destructive ml-1">*</span>}
                            </label>
                            <input
                              type="text"
                              value={partyGst}
                              onChange={(e) => setPartyGst(e.target.value.toUpperCase())}
                              placeholder={language === 'ta' ? 'GST à®Žà®£à¯ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯ (à®Ž.à®•à®¾: 33AAAAA0000A1Z5)' : 'Enter GST / Tax ID (e.g., 33AAAAA0000A1Z5)'}
                              maxLength={15}
                              className={cn(
                                "w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all",
                                partySettings.requireGSTIN && !partyGst?.trim() ? "border-destructive" : "border-border"
                              )}
                            />
                            {partySettings.requireGSTIN && !partyGst?.trim() && (
                              <p className="text-xs text-destructive">{language === 'ta' ? 'GSTIN à®•à®Ÿà¯à®Ÿà®¾à®¯à®®à®¾à®•à¯à®®à¯' : 'GSTIN is required'}</p>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Email Address */}
                  <div>
                    {!showEmail ? (
                      <button
                        onClick={() => setShowEmail(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'à®®à®¿à®©à¯à®©à®žà¯à®šà®²à¯ à®®à¯à®•à®µà®°à®¿' : 'Email Address'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®®à®¿à®©à¯à®©à®žà¯à®šà®²à¯ à®®à¯à®•à®µà®°à®¿' : 'Email Address'}</label>
                        <input
                          type="email"
                          value={partyEmail}
                          onChange={(e) => setPartyEmail(e.target.value)}
                          placeholder={language === 'ta' ? 'à®®à®¿à®©à¯à®©à®žà¯à®šà®²à¯ à®®à¯à®•à®µà®°à®¿ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯' : 'Enter email address'}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                      </motion.div>
                    )}
                  </div>

                  {partyType === 'customer' && (
                    <>
                      {/* Date of Birth */}
                      <div>
                        {!showDob ? (
                          <button
                            onClick={() => setShowDob(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®ªà®¿à®±à®¨à¯à®¤à®¤à®¿à®©à¯ à®¤à¯‡à®¤à®¿' : 'Date of Birth'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®ªà®¿à®±à®¨à¯à®¤à®¤à®¿à®©à¯ à®¤à¯‡à®¤à®¿' : 'Date of Birth'}</label>
                            <input
                              type="date"
                              value={studentDob}
                              onChange={(e) => setStudentDob(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                          </motion.div>
                        )}
                      </div>

                      {/* Gender */}
                      <div>
                        {!showGender ? (
                          <button
                            onClick={() => setShowGender(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®ªà®¾à®²à¯' : 'Gender'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®ªà®¾à®²à¯' : 'Gender'}</label>
                            <select
                              value={studentGender}
                              onChange={(e) => setStudentGender(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            >
                              <option value="">{language === 'ta' ? 'à®¤à¯‡à®°à¯à®¨à¯à®¤à¯†à®Ÿà¯' : 'Select Gender'}</option>
                              <option value="male">{language === 'ta' ? 'à®†à®£à¯' : 'Male'}</option>
                              <option value="female">{language === 'ta' ? 'à®ªà¯†à®£à¯' : 'Female'}</option>
                              <option value="other">{language === 'ta' ? 'à®®à®±à¯à®±à®µà®°à¯' : 'Other'}</option>
                            </select>
                          </motion.div>
                        )}
                      </div>

                      {/* ID Proof */}
                      <div>
                        {!showIdProof ? (
                          <button
                            onClick={() => setShowIdProof(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®…à®Ÿà¯ˆà®¯à®¾à®³ à®†à®µà®£à®™à¯à®•à®³à¯' : 'ID Proof'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®…à®Ÿà¯ˆà®¯à®¾à®³ à®†à®µà®£à®™à¯à®•à®³à¯' : 'ID Proof'}</label>
                            <select
                              value={studentIdProofType}
                              onChange={(e) => setStudentIdProofType(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            >
                              <option value="">{language === 'ta' ? 'à®¤à¯‡à®°à¯à®¨à¯à®¤à¯†à®Ÿà¯' : 'Select ID Proof'}</option>
                              <option value="Aadhaar">Aadhaar</option>
                              <option value="PAN">PAN</option>
                              <option value="Driving License">Driving License</option>
                              <option value="Passport">Passport</option>
                              <option value="College ID">College ID</option>
                              <option value="Other">Other</option>
                            </select>
                            <input
                              type="text"
                              value={studentIdProofNumber}
                              onChange={(e) => setStudentIdProofNumber(e.target.value)}
                              placeholder={language === 'ta' ? 'à®…à®Ÿà¯ˆà®¯à®¾à®³ à®Žà®£à¯' : 'Enter ID number'}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                          </motion.div>
                        )}
                      </div>

                      {/* Emergency Contact */}
                      <div>
                        {!showEmergencyContact ? (
                          <button
                            onClick={() => setShowEmergencyContact(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®†à®ªà®¤à¯à®¤à¯ à®¤à¯Šà®Ÿà®°à¯à®ªà¯' : 'Emergency Contact'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®†à®ªà®¤à¯à®¤à¯ à®¤à¯Šà®Ÿà®°à¯à®ªà¯' : 'Emergency Contact'}</label>
                            <input
                              type="text"
                              value={studentEmergencyName}
                              onChange={(e) => setStudentEmergencyName(e.target.value)}
                              placeholder={language === 'ta' ? 'à®ªà¯†à®¯à®°à¯' : 'Contact name'}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                            <input
                              type="tel"
                              value={studentEmergencyPhone}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\\D/g, '').slice(0, 10)
                                setStudentEmergencyPhone(digits)
                              }}
                              placeholder={language === 'ta' ? 'à®¤à¯Šà®²à¯ˆà®ªà¯‡à®šà®¿ à®Žà®£à¯' : 'Phone number'}
                              maxLength={10}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                          </motion.div>
                        )}
                      </div>

                      {/* Admission Date */}
                      <div>
                        {!showAdmissionDate ? (
                          <button
                            onClick={() => setShowAdmissionDate(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®šà¯‡à®°à¯à®•à¯à®•à¯ˆ à®¤à¯‡à®¤à®¿' : 'Admission Date'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®šà¯‡à®°à¯à®•à¯à®•à¯ˆ à®¤à¯‡à®¤à®¿' : 'Admission Date'}</label>
                            <input
                              type="date"
                              value={studentAdmissionDate}
                              onChange={(e) => setStudentAdmissionDate(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                          </motion.div>
                        )}
                      </div>

                      {/* Focus */}
                      <div>
                        {!showFocus ? (
                          <button
                            onClick={() => setShowFocus(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®•à®µà®©à¯' : 'Focus'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®•à®µà®©à¯' : 'Focus'}</label>
                            <select
                              value={studentFocus}
                              onChange={(e) => setStudentFocus(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            >
                              <option value="">{language === 'ta' ? 'à®¤à¯‡à®°à¯à®¨à¯à®¤à¯†à®Ÿà¯' : 'Select focus'}</option>
                              <option value="Career">{language === 'ta' ? 'à®•à®°à®¿à®¯à®°à¯' : 'Career'}</option>
                              <option value="Education">{language === 'ta' ? 'à®•à®²à¯à®µà®¿' : 'Education'}</option>
                              <option value="Other">{language === 'ta' ? 'à®®à®±à¯à®±à®µà®°à¯' : 'Other'}</option>
                            </select>
                          </motion.div>
                        )}
                      </div>

                      {/* How did you hear about us */}
                      <div>
                        {!showLeadSource ? (
                          <button
                            onClick={() => setShowLeadSource(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®Žà®™à¯à®•à®³à¯ˆ à®•à¯à®±à®¿à®¤à¯à®¤à¯ à®Žà®ªà¯à®ªà®Ÿà®¿ à®¤à¯†à®°à®¿à®¨à¯à®¤à®¤à¯?' : 'How did you hear about us?'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®Žà®™à¯à®•à®³à¯ˆ à®•à¯à®±à®¿à®¤à¯à®¤à¯ à®Žà®ªà¯à®ªà®Ÿà®¿ à®¤à¯†à®°à®¿à®¨à¯à®¤à®¤à¯?' : 'How did you hear about us?'}</label>
                            <select
                              value={studentSource}
                              onChange={(e) => setStudentSource(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            >
                              <option value="">{language === 'ta' ? 'à®¤à¯‡à®°à¯à®¨à¯à®¤à¯†à®Ÿà¯' : 'Select source'}</option>
                              <option value="Google">Google</option>
                              <option value="Instagram">Instagram</option>
                              <option value="Friend">Friend</option>
                              <option value="Walk-in">Walk-in</option>
                              <option value="Other">Other</option>
                            </select>
                            {studentSource === 'Other' && (
                              <input
                                type="text"
                                value={studentSourceOther}
                                onChange={(e) => setStudentSourceOther(e.target.value)}
                                placeholder={language === 'ta' ? 'à®ªà¯†à®°à¯ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯' : 'Enter source'}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                              />
                            )}
                          </motion.div>
                        )}
                      </div>
                    </>
                  )}

                  {partyType !== 'customer' && (
                    <>
                      {/* Customer Type - Dynamic from Party Settings */}
                      <div>
                        {!showCustomerType ? (
                          <button
                            onClick={() => setShowCustomerType(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯ à®µà®•à¯ˆ' : 'Category'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯ à®µà®•à¯ˆ' : 'Category'}</label>
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
                    </>
                  )}

                  {partyType !== 'customer' && partySettings.enableCreditLimit && (
                    <div>
                      {!showCreditLimit ? (
                        <button
                          onClick={() => setShowCreditLimit(true)}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                          <Plus size={14} weight="bold" />
                          {language === 'ta' ? 'à®•à®Ÿà®©à¯ à®µà®°à®®à¯à®ªà¯' : 'Credit Limit'}
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®•à®Ÿà®©à¯ à®µà®°à®®à¯à®ªà¯' : 'Credit Limit'}</label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 py-2 bg-muted border border-r-0 border-border rounded-l-lg text-sm font-medium text-muted-foreground">
                              {"₹"}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={partyCreditLimit}
                              onChange={(e) => setPartyCreditLimit(Number(e.target.value) || 0)}
                              placeholder={language === 'ta' ? 'à®•à®Ÿà®©à¯ à®µà®°à®®à¯à®ªà¯ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯' : 'Enter credit limit'}
                              className="flex-1 px-3 py-2 bg-background border border-border rounded-r-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ta' ? 'à®‡à®¨à¯à®¤ à®µà®°à®®à¯à®ªà¯à®•à¯à®•à¯ à®®à¯‡à®²à¯ à®•à®Ÿà®©à¯ à®µà®¿à®±à¯à®ªà®©à¯ˆ à®…à®©à¯à®®à®¤à®¿à®•à¯à®•à®ªà¯à®ªà®Ÿà®¾à®¤à¯' : 'Credit sales above this limit will be restricted'}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {partyType !== 'customer' && (
                    <>
                      {/* Credit Period (Days) - Always show with default from settings */}
                      <div>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®•à®Ÿà®©à¯ à®•à®¾à®²à®®à¯ (à®¨à®¾à®Ÿà¯à®•à®³à¯)' : 'Payment Due (Days)'}</label>
                          <input
                            type="number"
                            min="0"
                            max="365"
                            value={partyCreditDays}
                            onChange={(e) => setPartyCreditDays(Number(e.target.value) || 0)}
                            placeholder={language === 'ta' ? 'à®•à®Ÿà®©à¯ à®•à®¾à®²à®®à¯ à®¨à®¾à®Ÿà¯à®•à®³à¯' : 'Payment due in days'}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                          />
                          <p className="text-xs text-muted-foreground">
                            {language === 'ta' ? `à®…à®Ÿà®¿à®ªà¯à®ªà®Ÿà¯ˆ: ${partySettings.defaultCreditPeriod} à®¨à®¾à®Ÿà¯à®•à®³à¯` : `Default: ${partySettings.defaultCreditPeriod} days`}
                          </p>
                        </motion.div>
                      </div>
                    </>
                  )}

                  {partyType !== 'customer' && (
                    <>
                      {/* Opening Balance */}
                      <div>
                        {!showOpeningBalance ? (
                          <button
                            onClick={() => setShowOpeningBalance(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {language === 'ta' ? 'à®†à®°à®®à¯à®ª à®‡à®°à¯à®ªà¯à®ªà¯' : 'Opening Balance'}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®†à®°à®®à¯à®ª à®‡à®°à¯à®ªà¯à®ªà¯ (₹)' : 'Opening Balance (₹)'}</label>
                            <input
                              type="number"
                              step="0.01"
                              value={partyOpeningBalance}
                              onChange={(e) => setPartyOpeningBalance(e.target.value)}
                              placeholder={language === 'ta' ? 'à®†à®°à®®à¯à®ª à®‡à®°à¯à®ªà¯à®ªà¯ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯ (à®Ž.à®•à®¾., 5000)' : 'Enter opening balance (e.g., 5000)'}
                              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                            <p className="text-xs text-muted-foreground">
                              {language === 'ta' ? 'à®¨à¯‡à®°à¯ = à®…à®µà®°à¯à®•à®³à¯ à®•à®Ÿà®©à¯à®ªà®Ÿà¯à®Ÿà¯à®³à¯à®³à®©à®°à¯, à®Žà®¤à®¿à®°à¯ = à®¨à¯€à®™à¯à®•à®³à¯ à®•à®Ÿà®©à¯à®ªà®Ÿà¯à®Ÿà¯à®³à¯à®³à¯€à®°à¯à®•à®³à¯' : 'Positive = They owe you, Negative = You owe them'}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Course / Batch */}
                  <div>
                    {!showVehicleNo ? (
                      <button
                        onClick={() => setShowVehicleNo(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        {language === 'ta' ? 'à®µà®¾à®•à®© à®Žà®£à¯' : partyType === 'customer' ? 'Course / Batch' : 'Project / Engagement'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®µà®¾à®•à®© à®Žà®£à¯' : partyType === 'customer' ? 'Course / Batch' : 'Project / Engagement'}</label>
                        <input
                          type="text"
                          value={partyVehicleNo}
                          onChange={(e) => setPartyVehicleNo(e.target.value)}
                          placeholder={language === 'ta' ? 'à®µà®¾à®•à®© à®Žà®£à¯ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯ (à®Ž.à®•à®¾., TN01AB1234)' : partyType === 'customer' ? 'Enter course or batch' : 'Enter project or engagement'}
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
                        {language === 'ta' ? 'à®•à¯à®±à®¿à®ªà¯à®ªà¯à®•à®³à¯' : 'Notes'}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">{language === 'ta' ? 'à®•à¯à®±à®¿à®ªà¯à®ªà¯à®•à®³à¯' : 'Notes'}</label>
                        <textarea
                          rows={2}
                          value={partyNotes}
                          onChange={(e) => setPartyNotes(e.target.value)}
                          placeholder={language === 'ta' ? 'à®•à¯‚à®Ÿà¯à®¤à®²à¯ à®•à¯à®±à®¿à®ªà¯à®ªà¯à®•à®³à¯ˆà®šà¯ à®šà¯‡à®°à¯à®•à¯à®•à®µà¯à®®à¯' : 'Add any additional notes'}
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
                        {language === 'ta' ? 'à®šà¯‡à®®à®¿à®•à¯à®•à®¿à®±à®¤à¯...' : 'Saving...'}
                      </>
                    ) : (
                      `${isEditMode ? (language === 'ta' ? 'à®ªà¯à®¤à¯à®ªà¯à®ªà®¿' : 'Update') : (language === 'ta' ? 'à®šà¯‡à®°à¯' : 'Add')} ${partyType === 'customer' ? (language === 'ta' ? 'à®µà®¾à®Ÿà®¿à®•à¯à®•à¯ˆà®¯à®¾à®³à®°à¯' : 'Student') : (language === 'ta' ? 'à®šà®ªà¯à®³à¯ˆà®¯à®°à¯' : 'Client')}`
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
                  <h2 className="text-lg sm:text-xl font-bold">{selectedParty.name} - {language === 'ta' ? 'à®²à¯†à®Ÿà¯à®œà®°à¯' : 'Ledger'}</h2>
                  <p className={cn(
                    "text-xs sm:text-sm mt-1 font-medium",
                    selectedParty.currentBalance > 0 ? "text-emerald-600" : selectedParty.currentBalance < 0 ? "text-red-600" : "text-gray-500"
                  )}>
                    Balance: {selectedParty.currentBalance > 0 ? '+' : selectedParty.currentBalance < 0 ? '-' : ''}
                    ₹ {Math.abs(selectedParty.currentBalance || 0).toLocaleString()}
                    {selectedParty.currentBalance > 0
                      ? ' (Due)'
                      : selectedParty.currentBalance < 0
                        ? ' (Advance/Credit)'
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
                            {"₹"}{entry.balance.toLocaleString('en-IN')}
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
                          {"₹"}{ledgerEntries.reduce((sum, e) => sum + e.debit, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right text-success">
                          {"₹"}{ledgerEntries.reduce((sum, e) => sum + e.credit, 0).toLocaleString('en-IN')}
                        </td>
                        <td className={cn(
                          "px-4 py-3 text-right",
                          ledgerEntries[ledgerEntries.length - 1]?.balance > 0 ? "text-primary" :
                          ledgerEntries[ledgerEntries.length - 1]?.balance < 0 ? "text-destructive" : ""
                        )}>
                          {"₹"}{(ledgerEntries[ledgerEntries.length - 1]?.balance || 0).toLocaleString('en-IN')}
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
                    <h2 className="text-xl font-bold text-destructive">{language === 'ta' ? 'à®¤à®°à®ªà¯à®ªà®¿à®©à®°à¯ à®¨à¯€à®•à¯à®•à¯' : 'Delete Record'}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'ta' ? 'à®‡à®¨à¯à®¤ à®šà¯†à®¯à®²à¯ˆ à®šà¯†à®¯à®²à¯à®¤à®µà®¿à®°à¯à®•à¯à®• à®®à¯à®Ÿà®¿à®¯à®¾à®¤à¯' : 'This action cannot be undone'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  {language === 'ta' ? 'à®‡à®¨à¯à®¤ à®¤à®°à®ªà¯à®ªà®¿à®©à®°à¯ˆ à®¨à®¿à®šà¯à®šà®¯à®®à®¾à®• à®¨à¯€à®•à¯à®• à®µà®¿à®°à¯à®®à¯à®ªà¯à®•à®¿à®±à¯€à®°à¯à®•à®³à®¾?' : 'Are you sure you want to delete this record?'}
                </p>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="font-semibold text-foreground">
                    {getPartyName(partyToDelete)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {partyToDelete.phone} {"\u2022"} {partyToDelete.email}
                  </p>
                  {(() => {
                    // Use outstanding field (from getPartiesWithOutstanding) or currentBalance as fallback
                    const balance = partyToDelete.outstanding ?? partyToDelete.currentBalance ?? 0
                    // Skip if balance is 0, NaN, or undefined
                    if (!balance || isNaN(balance) || balance === 0) return null
                    return (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">Balance Summary:</p>
                        <p className={cn(
                          "text-sm font-semibold mt-1",
                          balance > 0 ? "text-emerald-600" : balance < 0 ? "text-red-600" : "text-slate-500"
                        )}>
                          {balance > 0 ? '+' : balance < 0 ? '-' : ''}
                          ₹ {Math.abs(balance).toLocaleString()}
                          {balance > 0
                            ? ' (Due)'
                            : balance < 0
                              ? ' (Advance/Credit)'
                              : ' (Settled)'}
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
                        {language === 'ta' ? 'à®Žà®šà¯à®šà®°à®¿à®•à¯à®•à¯ˆ: à®‡à®¨à¯à®¤ à®¤à®°à®ªà¯à®ªà®¿à®©à®°à¯à®•à¯à®•à¯ à®¨à®¿à®²à¯à®µà¯ˆ à®‡à®°à¯à®ªà¯à®ªà¯ à®‰à®³à¯à®³à®¤à¯. à®¨à¯€à®•à¯à®•à¯à®µà®¤à¯ à®…à®©à¯ˆà®¤à¯à®¤à¯ à®ªà®°à®¿à®µà®°à¯à®¤à¯à®¤à®©à¯ˆ à®µà®°à®²à®¾à®±à¯à®±à¯ˆà®¯à¯à®®à¯ à®…à®•à®±à¯à®±à¯à®®à¯.' : 'Warning: This record has a balance. Deleting will remove all transaction history.'}
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
                      {language === 'ta' ? 'à®¨à¯€à®•à¯à®•à¯à®•à®¿à®±à®¤à¯...' : 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash size={18} weight="duotone" />
                      {language === 'ta' ? 'à®¤à®°à®ªà¯à®ªà®¿à®©à®°à¯ à®¨à¯€à®•à¯à®•à¯' : 'Delete Record'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StudentDetailsModal
        open={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
        student={viewingStudent}
        invoices={allInvoices}
      />

      <AddAdmissionModal
        open={!!admissionForStudent}
        onClose={() => setAdmissionForStudent(null)}
        student={admissionForStudent}
        existingInvoices={allInvoices}
        onSaved={() => loadPartiesFromDatabase()}
      />
    </div>
  )
}

export default Parties



