import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  WarningCircle,
  CheckCircle,
  Export,
  Printer,
  Pencil,
  Trash,
  Eye,
  FileText,
  ArrowsClockwise,
  DotsThreeVertical
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
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null)

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

  const getPartyStatus = (party: typeof parties[0]) => {
    if ((party.overdue || 0) > 0) return { label: 'Overdue', color: 'destructive', icon: WarningCircle }
    // Treat party as active if isActive is true OR undefined (default to active for parties without this field)
    // Only show as Inactive if explicitly set to false
    if (party.isActive === false) return { label: 'Inactive', color: 'warning', icon: WarningCircle }
    return { label: 'Active', color: 'success', icon: CheckCircle }
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

  // Summary based on outstanding balances (due vs advance)
  const partiesSummary = useMemo(() => {
    let totalReceivables = 0
    let totalPayables = 0

    filteredParties.forEach(party => {
      const outstanding = party.outstanding ?? party.currentBalance ?? 0

      if (outstanding > 0) {
        totalReceivables += outstanding
      } else if (outstanding < 0) {
        totalPayables += Math.abs(outstanding)
      }
    })

    return {
      totalParties: filteredParties.length,
      customers: filteredParties.filter(p => p.type === 'customer').length,
      suppliers: filteredParties.filter(p => p.type === 'supplier').length,
      totalReceivables,
      totalPayables,
      netBalance: totalReceivables - totalPayables,
      activeParties: filteredParties.filter(p => p.isActive !== false).length,
      overdueCustomers: 0
    }
  }, [filteredParties])

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

    const partyName = getPartyName(party)
    const outstanding = party.outstanding ?? party.currentBalance ?? 0
    // Positive = they owe us (Total Due), Negative = we owe them (Advance/Credit)
    const balanceLabel = outstanding > 0 ? 'Due' : outstanding < 0 ? 'Advance/Credit' : 'Settled'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${partyName} - Student/Client Details</title>
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
          <p>${party.type === 'customer' ? 'Student' : 'Client'}</p>
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
          ${party.vehicleNo ? `<div class="details-row"><span class="details-label">Course / Batch:</span><span class="details-value">${party.vehicleNo}</span></div>` : ''}
        </div>
        <div class="balance ${outstanding > 0 ? 'positive' : outstanding < 0 ? 'negative' : 'zero'}">
          <h2>Balance Summary</h2>
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

  // Handle action menu click
  const handleActionMenuClick = (e: React.MouseEvent, partyId: string) => {
    e.stopPropagation()

    if (openActionMenu === partyId) {
      setOpenActionMenu(null)
      setDropdownPosition(null)
    } else {
      const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setDropdownPosition({
        top: buttonRect.bottom + 4,
        right: window.innerWidth - buttonRect.right
      })
      setOpenActionMenu(partyId)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      if (openActionMenu) {
        setOpenActionMenu(null)
        setDropdownPosition(null)
      }
    }

    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [openActionMenu])

  return (
    <div className="erp-module-page p-3 sm:p-4 lg:p-4 pb-16 sm:pb-20 lg:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3"
      >
        {/* Top Row: KPI Cards (Left) + Filters & Actions (Right) */}
        <div className="flex flex-col gap-2 md:gap-3 mb-3">
          {/* Left Side: KPI Cards - Rectangular filling space */}
          <div className="erp-legacy-kpi-grid flex-1 grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-3">
            {/* Parties Card - Blue Theme */}
            <div className="erp-legacy-kpi-shell !min-h-[66px] sm:!min-h-[84px] md:!min-h-[108px] p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-500 shadow-[6px_6px_12px_rgba(59,130,246,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(59,130,246,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button
                onClick={() => setActiveTab('all')}
                className="erp-legacy-kpi-button !min-h-[62px] sm:!min-h-[78px] md:!min-h-[104px] !px-1 !py-1 sm:!px-2.5 sm:!py-2 md:!px-4 md:!py-3 w-full h-full bg-[#e4ebf5] rounded-[6px] md:rounded-[14px] transition-all active:scale-[0.98] flex flex-col md:flex-row items-center md:gap-3"
              >
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <Users size={20} weight="duotone" className="text-blue-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] sm:text-[10px] md:text-xs bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">{'Warning: This record has a balance. Deleting will remove all transaction history.'}
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
    </div>
  )
}

export default Parties


