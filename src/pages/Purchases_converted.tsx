import React, { useState, useEffect, useRef } from 'react'
import {
  Plus,
  ShoppingCart,
  Download,
  Eye,
  Trash,
  MagnifyingGlass,
  Calendar,
  CalendarBlank,
  CheckCircle,
  Clock,
  XCircle,
  CurrencyCircleDollar,
  Sparkle,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  Envelope,
  Buildings,
  FileText,
  Truck,
  X,
  Package,
  Minus,
  Percent,
  CreditCard,
  Money,
  Bank,
  Printer,
  Share,
  Warning,
  Camera,
  WhatsappLogo,
  QrCode,
  Barcode,
  UploadSimple,
  ChartBar,
  Bell,
  Toolbox,
  DotsThreeVertical,
  Pencil,
  Copy,
  ArrowCounterClockwise,
  CookingPot,
  CaretDown,
  Cube,
  CurrencyInr
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { useAIAssistant } from '../contexts/AIAssistantContext'
import AIAssistant from '../components/AIAssistant'
import ShoppingCartScanner from '../components/ShoppingCartScanner'
import type { ScannedBillData } from '../types'
import { processScannedBill, getBills, deleteBill, createBill as createBillService } from '../services/BillService'
import { recordPayment, getBillPayments } from '../services/paymentService'
import type { Payment } from '../services/paymentService'
import { downloadBillPDF, printBillPDF, downloadEBillPDF, downloadEWayBillPDF } from '../services/pdfService'
import type { BillPDFData } from '../services/pdfService'
import { shareViaWhatsApp, sendPaymentReminderWhatsApp } from '../services/shareService'
import { UPIPaymentModal, CardPaymentModal } from '../components/PaymentModals'
import { generatePaymentRef, savePaymentStatus, type UPIPaymentDetails, type CardPaymentRequest, DEFAULT_TERMINAL_CONFIG } from '../utils/paymentIntegration'
import { generateIndianBillNumber } from '../utils/BillNumbering'
import { calculateGSTBreakdown, isIntraStateTransaction, isB2BTransaction, isHSNRequired, formatGSTDisplay } from '../utils/gstCalculations'
import { getCompanySettings } from '../services/settingsService'
import BillPreviewModal from '../components/BillPreviewModal'

// Indian States list with priority states first
const INDIAN_STATES = [
  // Priority states (South Indian states as requested)
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

interface BillItem {
  id: string
  name: string
  qty: number
  unit: string
  price: number
  discount: number
  discountAmount: number
  tax: number
  taxAmount: number
  // GST breakdown
  cgstPercent: number
  cgstAmount: number
  sgstPercent: number
  sgstAmount: number
  igstPercent: number
  igstAmount: number
  total: number
  // Additional fields from screenshot
  itemCategory?: string
  itemCode?: string
  hsnCode?: string
  description?: string
}

const Purchases = () => {
  // AI Assistant integration
  const { lastAction, clearAction } = useAIAssistant()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [BillToDelete, setBillToDelete] = useState<any>(null)

  // Tab system for multiple simultaneous Bills
  interface BillTab {
    id: string
    type: 'Purchase' | 'credit'
    mode: 'Bill' | 'pos' // Track which mode this tab belongs to
    SupplierName: string
    SupplierPhone: string
    SupplierEmail: string
    SupplierGST: string
    SupplierState: string
    BillItems: BillItem[]
    paymentMode: string
    BillDiscount: number
    notes: string
    SupplierSearch: string
  }

  // View mode: 'list' shows Bill list, 'create' shows create Bill form
  // Use lazy initialization to load from localStorage immediately
  const [viewMode, setViewMode] = useState<'list' | 'create'>(() => {
    try {
      const saved = localStorage.getItem('Purchases_viewMode')
      return (saved as 'list' | 'create') || 'list'
    } catch {
      return 'list'
    }
  })

  // Lazy initialization for tabs - load from localStorage immediately
  const [BillTabs, setBillTabs] = useState<BillTab[]>(() => {
    try {
      const saved = localStorage.getItem('Purchases_BillTabs')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.length > 0) {
          // Migrate old tabs without mode property
          return parsed.map((tab: any) => ({
            ...tab,
            mode: tab.mode || 'Bill' // Default to Bill mode for old tabs
          }))
        }
      }
    } catch (error) {
      console.error('Error loading saved tabs:', error)
    }
    // Default initial tab
    return [{
      id: '1',
      type: 'Purchase',
      mode: 'Bill', // Default to Bill mode
      SupplierName: '',
      SupplierPhone: '',
      SupplierEmail: '',
      SupplierGST: '',
      SupplierState: '',
      BillItems: [],
      paymentMode: 'cash',
      BillDiscount: 0,
      notes: '',
      SupplierSearch: ''
    }]
  })

  // Lazy initialization for active tab ID
  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      const saved = localStorage.getItem('Purchases_activeTabId')
      return saved || '1'
    } catch {
      return '1'
    }
  })

  // Bill Number and Date State
  const [BillNumber, setBillNumber] = useState('')
  const [BillDate, setBillDate] = useState(new Date().toISOString().split('T')[0])

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethodSelected, setPaymentMethodSelected] = useState<'cash' | 'bank' | 'upi' | 'card' | 'cheque'>('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [BillPayments, setBillPayments] = useState<Payment[]>([])

  // Bill Form State
  const [SupplierName, setSupplierName] = useState('')
  const [SupplierPhone, setSupplierPhone] = useState('')
  const [SupplierEmail, setSupplierEmail] = useState('')
  const [SupplierGST, setSupplierGST] = useState('')
  const [SupplierState, setSupplierState] = useState('')
  const [BillItems, setBillItems] = useState<BillItem[]>([])
  const [paymentMode, setPaymentMode] = useState('cash')
  const [BillDiscount, setBillDiscount] = useState(0)
  const [roundOff, setRoundOff] = useState(true)
  const [notes, setNotes] = useState('')

  // Split Payment State
  const [payments, setPayments] = useState<{ type: string; amount: number; reference: string }[]>([
    { type: 'cash', amount: 0, reference: '' }
  ])

  // Attachments State
  const [attachments, setAttachments] = useState<{ name: string; type: 'image' | 'document'; url: string }[]>([])
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  // Bill Preview Modal State
  const [showBillPreview, setShowBillPreview] = useState(false)

  // Supplier/Item Search State
  const [SupplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [allParties, setAllParties] = useState<any[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [allItems, setAllItems] = useState<any[]>([])
  const [loadingParties, setLoadingParties] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  // Add Supplier Modal State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')
  const [newSupplierEmail, setNewSupplierEmail] = useState('')
  const [newSupplierGST, setNewSupplierGST] = useState('')
  const [newSupplierAddress, setNewSupplierAddress] = useState('')
  const [newSupplierState, setNewSupplierState] = useState('')
  const [newSupplierType, setNewSupplierType] = useState('Regular')
  const [newSupplierNotes, setNewSupplierNotes] = useState('')
  const [showAddressField, setShowAddressField] = useState(false)
  const [showStateField, setShowStateField] = useState(false)
  const [showGstField, setShowGstField] = useState(false)
  const [showEmailField, setShowEmailField] = useState(false)
  const [showSupplierTypeField, setShowSupplierTypeField] = useState(false)
  const [showNotesField, setShowNotesField] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)

  // Add Item Modal State
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('pcs')
  const [newItemRetailPrice, setNewItemRetailPrice] = useState('')
  const [newItemGstRate, setNewItemGstRate] = useState('18')
  const [newItemCategory, setNewItemCategory] = useState('stationery')
  const [newItemDescription, setNewItemDescription] = useState('')
  const [newItemType, setNewItemType] = useState('Purchases')
  const [newItemWholePurchasePrice, setNewItemWholePurchasePrice] = useState('')
  const [newItemPurchasePrice, setNewItemPurchasePrice] = useState('')
  const [newItemHsnCode, setNewItemHsnCode] = useState('')
  const [newItemStockQty, setNewItemStockQty] = useState('')
  const [newItemLowStockAlert, setNewItemLowStockAlert] = useState('')
  const [newItemBrand, setNewItemBrand] = useState('')
  const [newItemBarcode, setNewItemBarcode] = useState('')
  const [showNewItemDescriptionAI, setShowNewItemDescriptionAI] = useState(false)
  const [showNewItemWholePurchasePrice, setShowNewItemWholePurchasePrice] = useState(false)
  const [showNewItemPurchasePrice, setShowNewItemPurchasePrice] = useState(false)
  const [showNewItemHSN, setShowNewItemHSN] = useState(false)
  const [showNewItemLowStockAlert, setShowNewItemLowStockAlert] = useState(false)
  const [showNewItemBrand, setShowNewItemBrand] = useState(false)
  const [showNewItemBarcode, setShowNewItemBarcode] = useState(false)
  const [savingItem, setSavingItem] = useState(false)

  // Refs for click-outside detection
  const SupplierDropdownRef = useRef<HTMLDivElement>(null)
  const itemDropdownRef = useRef<HTMLDivElement>(null)

  // Column visibility state for Bill items table
  const [visibleColumns, setVisibleColumns] = useState({
    hsnCode: false,
    description: false,
    discount: true,
    tax: true
  })
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const columnMenuRef = useRef<HTMLDivElement>(null)

  // Bill format state - Multiple print formats
  const [BillFormat, setBillFormat] = useState<'a4' | 'a5' | 'pos58' | 'pos80' | 'kot' | 'barcode' | 'sticker'>('a4')

  // Payment integration modals
  const [showUPIModal, setShowUPIModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [currentPaymentDetails, setCurrentPaymentDetails] = useState<UPIPaymentDetails | null>(null)
  const [currentCardPaymentRequest, setCurrentCardPaymentRequest] = useState<CardPaymentRequest | null>(null)
  const [pendingBillData, setPendingBillData] = useState<any>(null)

  // Purchases Mode: 'pos' for POS Purchases with payment, 'Bill' for traditional invoicing
  const [PurchasesMode, setPurchasesMode] = useState<'pos' | 'Bill'>('Bill')

  // Preview visibility state - collapsed by default
  const [showPreview, setShowPreview] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Get current active tab
  const activeTab = BillTabs.find(tab => tab.id === activeTabId) || BillTabs[0]

  // Sync current form state with active tab (read from tab)
  useEffect(() => {
    if (activeTab && viewMode === 'create') {
      setSupplierName(activeTab.SupplierName)
      setSupplierPhone(activeTab.SupplierPhone)
      setSupplierEmail(activeTab.SupplierEmail)
      setSupplierGST(activeTab.SupplierGST)
      setSupplierState(activeTab.SupplierState || '')
      setBillItems(activeTab.BillItems)
      setPaymentMode(activeTab.paymentMode)
      setBillDiscount(activeTab.BillDiscount)
      setNotes(activeTab.notes)
      setSupplierSearch(activeTab.SupplierSearch)
    }
  }, [activeTabId, viewMode])

  // Save current form state to active tab whenever it changes
  useEffect(() => {
    if (viewMode === 'create' && activeTab) {
      setBillTabs(tabs =>
        tabs.map(tab =>
          tab.id === activeTabId
            ? {
                ...tab,
                SupplierName,
                SupplierPhone,
                SupplierEmail,
                SupplierGST,
                SupplierState,
                BillItems,
                paymentMode,
                BillDiscount,
                notes,
                SupplierSearch
              }
            : tab
        )
      )
    }
  }, [SupplierName, SupplierPhone, SupplierEmail, SupplierGST, SupplierState, BillItems, paymentMode, BillDiscount, notes, SupplierSearch, viewMode])

  // Generate Bill number on mount
  useEffect(() => {
    if (!BillNumber) {
      const generatedBillNumber = generateIndianBillNumber()
      setBillNumber(generatedBillNumber)
    }
  }, [])

  // Persist viewMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('Purchases_viewMode', viewMode)
  }, [viewMode])

  // Persist tabs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('Purchases_BillTabs', JSON.stringify(BillTabs))
  }, [BillTabs])

  // Persist active tab ID to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('Purchases_activeTabId', activeTabId)
  }, [activeTabId])

  // Click outside handler for column menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false)
      }
    }

    if (showColumnMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColumnMenu])

  // Auto-show HSN column when Supplier has GSTIN (B2B transaction)
  useEffect(() => {
    if (SupplierGST && SupplierGST.trim().length > 0) {
      // B2B transaction - HSN is mandatory, auto-show column
      setVisibleColumns(prev => ({ ...prev, hsnCode: true }))
    }
  }, [SupplierGST])

  // Add new tab
  const addNewTab = (type: 'Purchase' | 'credit' = 'Purchase') => {
    const newTab: BillTab = {
      id: Date.now().toString(),
      type,
      mode: PurchasesMode, // Set mode based on current PurchasesMode (Bill or pos)
      SupplierName: '',
      SupplierPhone: '',
      SupplierEmail: '',
      SupplierGST: '',
      SupplierState: '',
      BillItems: [],
      paymentMode: 'cash',
      BillDiscount: 0,
      notes: '',
      SupplierSearch: ''
    }
    setBillTabs([...BillTabs, newTab])
    setActiveTabId(newTab.id)
  }

  // Close tab
  const closeTab = (tabId: string) => {
    if (BillTabs.length === 1) {
      toast.error('Cannot close the last tab')
      return
    }

    const tabIndex = BillTabs.findIndex(tab => tab.id === tabId)
    const newTabs = BillTabs.filter(tab => tab.id !== tabId)
    setBillTabs(newTabs)

    // If closing active tab, switch to adjacent tab
    if (tabId === activeTabId) {
      const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0
      setActiveTabId(newTabs[newActiveIndex].id)
    }
  }

  // Switch to tab
  const switchToTab = (tabId: string) => {
    setActiveTabId(tabId)
  }

  // Return to list view while preserving draft tabs
  const handleBackToList = () => {
    // Just switch to list view - DON'T clear tabs or localStorage
    setViewMode('list')

    // Update localStorage to remember we're in list view
    localStorage.setItem('Purchases_viewMode', 'list')

    // Keep all existing tabs and their data intact
    // When user clicks "Create Bill" again, they'll see all their draft tabs
  }

  // Close only the current tab after successful Bill creation
  const closeCurrentTab = () => {
    const currentTabIndex = BillTabs.findIndex(tab => tab.id === activeTabId)

    // If only one tab exists, reset it to blank instead of closing
    if (BillTabs.length === 1) {
      const newBillNumber = generateIndianBillNumber()
      const newDate = new Date().toISOString().split('T')[0]

      const resetTab: BillTab = {
        id: activeTabId,
        type: 'Purchase',
        SupplierName: '',
        SupplierPhone: '',
        SupplierEmail: '',
        SupplierGST: '',
        BillItems: [],
        paymentMode: 'cash',
        BillDiscount: 0,
        notes: '',
        SupplierSearch: ''
      }

      setBillTabs([resetTab])

      // Clear current form fields
      setSupplierName('')
      setSupplierPhone('')
      setSupplierEmail('')
      setSupplierGST('')
      setBillItems([])
      setPaymentMode('cash')
      setBillDiscount(0)
      setNotes('')
      setSupplierSearch('')
      setBillNumber(newBillNumber)
      setBillDate(newDate)

      // Save to localStorage
      localStorage.setItem('Purchases_BillTabs', JSON.stringify([resetTab]))
      return
    }

    // Multiple tabs exist - remove the current tab
    const updatedTabs = BillTabs.filter(tab => tab.id !== activeTabId)
    setBillTabs(updatedTabs)

    // Switch to adjacent tab
    let newActiveTab: BillTab
    if (currentTabIndex > 0) {
      // Switch to previous tab
      newActiveTab = updatedTabs[currentTabIndex - 1]
    } else {
      // Switch to next tab (now at index 0)
      newActiveTab = updatedTabs[0]
    }

    setActiveTabId(newActiveTab.id)

    // Load the new active tab's data
    setSupplierName(newActiveTab.SupplierName)
    setSupplierPhone(newActiveTab.SupplierPhone || '')
    setSupplierEmail(newActiveTab.SupplierEmail || '')
    setSupplierGST(newActiveTab.SupplierGST || '')
    setBillItems(newActiveTab.BillItems)
    setPaymentMode(newActiveTab.paymentMode)
    setBillDiscount(newActiveTab.BillDiscount || 0)
    setNotes(newActiveTab.notes || '')
    setSupplierSearch(newActiveTab.SupplierSearch || '')

    // Save to localStorage
    localStorage.setItem('Purchases_BillTabs', JSON.stringify(updatedTabs))
    localStorage.setItem('Purchases_activeTabId', newActiveTab.id)
  }

  // Reusable function to load Bills from database
  const loadBillsFromDatabase = async () => {
    try {
      setIsLoadingBills(true)
      const BillsData = await getBills('Purchase')

      if (BillsData && Array.isArray(BillsData) && BillsData.length > 0) {
        // Convert Bills to display format with safe fallbacks
        const formattedBills = BillsData.map(Bill => ({
          id: Bill?.id || `temp-${Date.now()}`,
          BillNumber: Bill?.BillNumber || 'N/A',
          partyName: Bill?.partyName || 'Unknown',
          partyPhone: Bill?.partyPhone || '',
          partyEmail: Bill?.partyEmail || '',
          partyId: Bill?.partyId || '',
          date: Bill?.BillDate || new Date().toISOString().split('T')[0],
          total: Bill?.grandTotal || 0,
          paidAmount: Bill?.payment?.paidAmount || 0,
          paymentStatus: (Bill?.payment?.status as any) || 'pending',
          items: Bill?.items?.length || 0,
          subtotal: Bill?.subtotal || 0,
          tax: Bill?.totalTaxAmount || 0,
          discount: Bill?.discountAmount || 0,
          paymentMode: Bill?.payment?.mode || 'cash',
          createdAt: Bill?.createdAt || Bill?.BillDate || new Date().toISOString()
        }))

        // Sort by date descending (most recent first)
        formattedBills.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date).getTime()
          const dateB = new Date(b.createdAt || b.date).getTime()
          return dateB - dateA
        })

        setBills(formattedBills)
      } else {
        // No Bills in database, show empty list
        setBills([])
      }
    } catch (error) {
      console.error('Error loading Bills:', error)
      setBills([])
    } finally {
      setIsLoadingBills(false)
    }
  }

  // Handle AI Scan Complete
  const handleScanComplete = async (BillData: ScannedBillData) => {
    let processingToast: string | number | undefined

    try {
      // Show processing toast
      processingToast = toast.loading('Processing Bill... Creating/updating Supplier and items')

      // Auto-process the Bill: create/update party and items
      const result = await processScannedBill(BillData, 'Purchase')

      if (result?.Bill && result?.party) {
        // Reload Bills list to show the new Bill
        await loadBillsFromDatabase()

        // Show comprehensive success message
        const successInfo = [
          result.party ? `Supplier: ${result.party.companyName}` : null,
          result.party?.gstDetails?.gstin && `GSTIN: ${result.party.gstDetails.gstin}`,
          result.items?.length > 0 && `${result.items.length} item(s) created/updated`,
          `Bill: ${BillData.BillNumber}`,
          `Total: ₹${BillData.grandTotal.toLocaleString()}`
        ].filter(Boolean).join(' | ')

        toast.success(`✓ Bill processed! ${successInfo}`, {
          duration: 5000
        })

        // Close the scanner
        setShowScanner(false)
      } else {
        toast.error('Failed to process Bill. Please try again.')
        setShowScanner(false)
      }
    } catch (error) {
      console.error('Error processing scanned Bill:', error)
      toast.error('Error processing Bill. Please try again.')
      setShowScanner(false)
    } finally {
      // ALWAYS dismiss the loading toast
      if (processingToast) {
        toast.dismiss(processingToast)
      }
      // Dismiss all toasts just to be safe
      setTimeout(() => toast.dismiss(), 100)
    }
  }

  // Navigation helper
  const navigate = useNavigate()

  // Available items for selection (loaded from item service)
  const [availableItems, setAvailableItems] = useState<Array<{ id: string; name: string; price: number; tax?: number }>>([])

  // Load items from DB/local storage
  useEffect(() => {
    let mounted = true
    async function loadItems() {
      try {
        const { getItems } = await import('../services/itemService')
        const items = await getItems()
        if (!mounted) return
        setAvailableItems(
          items.map(i => ({ id: i.id, name: i.name || 'Unnamed Item', price: (i.sellingPrice as any) || (i.purchasePrice as any) || 0, tax: i.tax?.gstRate || 0 }))
        )
      } catch (error) {
        console.error('Failed to load items for Purchases page:', error)
      }
    }
    loadItems()

    // Reload when page becomes visible (e.g., when navigating back from Inventory)
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        loadItems()
      }
    }
    const handleFocus = () => {
      if (mounted) loadItems()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Load parties from DB/local storage
  useEffect(() => {
    let mounted = true
    async function loadParties() {
      try {
        setLoadingParties(true)
        const { getParties } = await import('../services/partyService')
        const parties = await getParties()
        if (!mounted) return
        setAllParties(parties || [])
      } catch (error) {
        console.error('Failed to load parties for Purchases page:', error)
      } finally {
        if (mounted) setLoadingParties(false)
      }
    }
    loadParties()
    return () => {
      mounted = false
    }
  }, [])

  // Load all items for search
  useEffect(() => {
    let mounted = true
    async function loadAllItems() {
      try {
        setLoadingItems(true)
        const { getItems } = await import('../services/itemService')
        const items = await getItems()
        if (!mounted) return
        setAllItems(items || [])
      } catch (error) {
        console.error('Failed to load all items:', error)
      } finally {
        if (mounted) setLoadingItems(false)
      }
    }
    loadAllItems()

    // Reload when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        loadAllItems()
      }
    }
    const handleFocus = () => {
      if (mounted) loadAllItems()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Filter Suppliers based on search
  const filteredSuppliers = allParties.filter(party =>
    party.displayName?.toLowerCase().includes(SupplierSearch.toLowerCase()) ||
    party.companyName?.toLowerCase().includes(SupplierSearch.toLowerCase()) ||
    party.name?.toLowerCase().includes(SupplierSearch.toLowerCase()) ||
    party.SupplierName?.toLowerCase().includes(SupplierSearch.toLowerCase()) ||
    party.partyName?.toLowerCase().includes(SupplierSearch.toLowerCase()) ||
    party.fullName?.toLowerCase().includes(SupplierSearch.toLowerCase()) ||
    party.businessName?.toLowerCase().includes(SupplierSearch.toLowerCase()) ||
    party.phone?.includes(SupplierSearch) ||
    party.email?.toLowerCase().includes(SupplierSearch.toLowerCase())
  ).slice(0, 10) // Limit to 10 results

  // Filter items based on search - show all items if no search text
  const filteredItems = itemSearch.trim()
    ? allItems.filter(item =>
        item.name?.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.barcode?.includes(itemSearch)
      ).slice(0, 10)
    : allItems.slice(0, 10) // Show first 10 items when no search

  // Handle Supplier selection
  const handleSupplierSelect = (party: any) => {
    // Debug: Log the entire party object
    console.log('🔍 Selected party full data:', party)
    console.log('📝 All keys in party object:', Object.keys(party))
    console.log('🏷️ Name field values:', {
      displayName: party.displayName,
      companyName: party.companyName,
      name: party.name,
      SupplierName: party.SupplierName,
      partyName: party.partyName,
      fullName: party.fullName,
      businessName: party.businessName
    })

    // Try ALL possible name field variations
    const SupplierName = party.displayName ||
                        party.companyName ||
                        party.name ||
                        party.SupplierName ||
                        party.partyName ||
                        party.fullName ||
                        party.businessName ||
                        'Unknown Supplier'

    console.log('✅ Final Supplier name selected:', SupplierName)

    // If still unknown, show alert with debug info
    if (SupplierName === 'Unknown Supplier') {
      const allKeys = Object.keys(party).join(', ')
      const nameFieldsStr = JSON.stringify({
        displayName: party.displayName,
        companyName: party.companyName,
        name: party.name,
        SupplierName: party.SupplierName,
        partyName: party.partyName,
        fullName: party.fullName,
        businessName: party.businessName
      }, null, 2)
      alert('🔍 DEBUG INFO:\n\nAll fields in Supplier:\n' + allKeys + '\n\nName field values:\n' + nameFieldsStr)
    }

    setSupplierName(SupplierName)
    setSupplierPhone(party.phone || '')
    setSupplierEmail(party.email || '')
    setSupplierGST(party.gstDetails?.gstin || '')
    setSupplierState(party.billingAddress?.state || party.state || '')
    setSupplierSearch(SupplierName)
    setShowSupplierDropdown(false)
  }

  // Listen for AI Assistant actions
  useEffect(() => {
    if (!lastAction) return

    console.log('🎯 Handling AI action in Purchases page:', lastAction)

    // Handle the action based on type
    if (lastAction.data?.action === 'searchSupplier') {
      // If Supplier found, select it
      if (lastAction.success && lastAction.data?.selectedSupplier) {
        handleSupplierSelect(lastAction.data.selectedSupplier)
        toast.success(`Selected Supplier: ${lastAction.data.selectedSupplier.displayName}`)
      } else if (lastAction.data?.matches && lastAction.data.matches.length > 0) {
        // Multiple matches - auto-select first one or show dropdown
        handleSupplierSelect(lastAction.data.matches[0])
        if (lastAction.data.matches.length > 1) {
          toast.info(`Selected first of ${lastAction.data.matches.length} matches`)
        }
      }
    } else if (lastAction.data?.action === 'ADD_ITEM') {
      // Handle add item
      if (lastAction.success && lastAction.data?.item) {
        handleItemSelect(lastAction.data.item)
      }
    } else if (lastAction.data?.action === 'APPLY_DISCOUNT') {
      // Apply discount to Bill
      if (lastAction.success && lastAction.data?.discountPercent) {
        setBillDiscount(lastAction.data.discountPercent)
        toast.success(`Applied ${lastAction.data.discountPercent}% discount`)
      }
    } else if (lastAction.data?.action === 'SET_PAYMENT_MODE') {
      // Set payment mode
      if (lastAction.success && lastAction.data?.mode) {
        setPaymentMode(lastAction.data.mode)
        toast.success(`Payment mode set to ${lastAction.data.mode}`)
      }
    } else if (lastAction.data?.action === 'GENERATE_Bill') {
      // Generate/complete Bill
      if (lastAction.success) {
        createBill()
      }
    } else if (lastAction.data?.action === 'SHOW_TOTAL') {
      // Show total
      if (lastAction.success) {
        const totals = calculateTotals()
        toast.success(`Bill Total: ₹${totals.total.toLocaleString('en-IN')}`, { duration: 5000 })
      }
    } else if (lastAction.data?.action === 'CLEAR_Bill') {
      // Clear Bill
      if (lastAction.success) {
        closeCurrentTab()
        toast.success('Bill cleared')
      }
    }

    // Clear the action after handling
    clearAction()
  }, [lastAction])

  // Handle item selection from search
  const handleItemSelect = (item: any) => {
    const price = item.sellingPrice || item.purchasePrice || 0
    const qty = 1
    const discountPercent = 0
    // Get tax rate from inventory - check multiple possible locations
    const taxPercent = item.tax?.gstRate || item.tax?.igst || ((item.tax?.cgst || 0) + (item.tax?.sgst || 0)) || 0

    console.log('📊 Item selected:', item.name, 'Tax:', taxPercent, 'Item tax object:', item.tax)

    const discountedPricePerUnit = price - (price * discountPercent / 100)
    const lineBase = price * qty
    const discountAmount = lineBase - (discountedPricePerUnit * qty)
    const taxableAmount = discountedPricePerUnit * qty

    // Get seller state from settings
    const companySettings = getCompanySettings()
    const sellerState = companySettings.state || 'Tamil Nadu'

    // Calculate GST breakdown based on seller and Supplier states
    const gstBreakdown = calculateGSTBreakdown({
      taxableAmount,
      gstRate: taxPercent,
      sellerState,
      SupplierState: SupplierState || sellerState,
      SupplierGSTIN: SupplierGST
    })

    console.log('💰 GST Breakdown:', gstBreakdown)

    const total = taxableAmount + gstBreakdown.totalTaxAmount

    addItem({
      id: `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      qty,
      unit: item.unit || 'NONE',
      price,
      discount: discountPercent,
      discountAmount,
      tax: taxPercent,
      taxAmount: gstBreakdown.totalTaxAmount,
      cgstPercent: gstBreakdown.cgstPercent,
      cgstAmount: gstBreakdown.cgstAmount,
      sgstPercent: gstBreakdown.sgstPercent,
      sgstAmount: gstBreakdown.sgstAmount,
      igstPercent: gstBreakdown.igstPercent,
      igstAmount: gstBreakdown.igstAmount,
      total,
      itemCategory: item.category,
      itemCode: item.code,
      hsnCode: item.hsnCode,
      description: item.description
    })
    setItemSearch('')
    setShowItemDropdown(false)
  }

  // Reset Supplier form
  const resetSupplierForm = () => {
    setNewSupplierName('')
    setNewSupplierPhone('')
    setNewSupplierEmail('')
    setNewSupplierGST('')
    setNewSupplierAddress('')
    setNewSupplierState('')
    setNewSupplierType('Regular')
    setNewSupplierNotes('')
    setShowAddressField(false)
    setShowStateField(false)
    setShowGstField(false)
    setShowEmailField(false)
    setShowSupplierTypeField(false)
    setShowNotesField(false)
  }

  // Handle saving new Supplier
  const handleSaveNewSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error('Please enter Supplier name')
      return
    }

    setSavingSupplier(true)
    try {
      const { createParty } = await import('../services/partyService')
      const newParty = await createParty({
        name: newSupplierName.trim(),
        type: 'Supplier',
        phone: newSupplierPhone.trim() || undefined,
        email: newSupplierEmail.trim() || undefined,
        gstin: newSupplierGST.trim() || undefined,
        billingAddress: newSupplierAddress.trim() || undefined,
        state: newSupplierState.trim() || undefined,
        openingBalance: 0,
        balance: 0
      })

      if (newParty) {
        // Auto-fill Supplier details in Bill
        setSupplierName(newParty.name)
        setSupplierPhone(newParty.phone || '')
        setSupplierEmail(newParty.email || '')
        setSupplierGST(newParty.gstin || '')
        setSupplierState(newParty.state || '')
        setSupplierSearch(newParty.name)

        // Add to parties list
        setAllParties(prev => [newParty, ...prev])

        // Clear form and close modal
        resetSupplierForm()
        setShowAddSupplierModal(false)

        toast.success('Supplier added successfully!')
      } else {
        toast.error('Failed to create Supplier')
      }
    } catch (error) {
      console.error('Error creating Supplier:', error)
      toast.error('Failed to create Supplier')
    } finally {
      setSavingSupplier(false)
    }
  }

  // AI Description Suggestions for New Item
  const getNewItemDescriptionSuggestions = (itemName: string): string[] => {
    const name = itemName.toLowerCase()

    if (name.includes('pen')) {
      return [
        'Ball pen, blue ink, smooth writing',
        'Office writing pen with comfortable grip',
        'Fine tip ball pen for daily use'
      ]
    } else if (name.includes('chair')) {
      return [
        'Comfortable office chair with armrest',
        'Ergonomic seating with lumbar support',
        'Adjustable height office chair'
      ]
    } else if (name.includes('notebook') || name.includes('copy')) {
      return [
        'Ruled notebook for school/office use',
        'Premium quality paper notebook',
        'Spiral bound notebook with perforated sheets'
      ]
    } else if (name.includes('laptop')) {
      return [
        'Professional laptop for business use',
        'High-performance computing device',
        'Portable laptop with long battery life'
      ]
    } else {
      return [
        `Quality ${itemName} for professional use`,
        `Premium ${itemName} with excellent features`,
        `Durable ${itemName} for everyday needs`
      ]
    }
  }

  const resetNewItemForm = () => {
    setNewItemName('')
    setNewItemUnit('pcs')
    setNewItemRetailPrice('')
    setNewItemWholePurchasePrice('')
    setNewItemPurchasePrice('')
    setNewItemGstRate('18')
    setNewItemCategory('stationery')
    setNewItemHsnCode('')
    setNewItemStockQty('')
    setNewItemLowStockAlert('')
    setNewItemBrand('')
    setNewItemBarcode('')
    setNewItemDescription('')
    setNewItemType('Purchases')
    // Reset expandable sections
    setShowNewItemDescriptionAI(false)
    setShowNewItemWholePurchasePrice(false)
    setShowNewItemPurchasePrice(false)
    setShowNewItemHSN(false)
    setShowNewItemLowStockAlert(false)
    setShowNewItemBrand(false)
    setShowNewItemBarcode(false)
  }

  const handleSaveNewItem = async () => {
    if (!newItemName.trim() || !newItemRetailPrice.trim()) {
      toast.error('Please enter item name and price')
      return
    }

    setSavingItem(true)
    try {
      const { createItem } = await import('../services/itemService')

      const gst = parseInt(newItemGstRate || '0', 10) || 0
      const sellingPrice = parseFloat(newItemRetailPrice) || 0
      const purchasePrice = newItemPurchasePrice ? parseFloat(newItemPurchasePrice) : 0
      const stockQty = newItemStockQty ? parseInt(newItemStockQty) : 0

      const itemData: any = {
        name: newItemName.trim(),
        description: newItemDescription?.trim() || '',
        itemCode: `ITEM${Date.now()}`,
        unit: newItemUnit,
        sellingPrice,
        purchasePrice,
        taxPreference: gst > 0 ? 'taxable' : 'non-taxable',
        tax: {
          cgst: gst / 2,
          sgst: gst / 2,
          igst: gst,
          cess: 0
        },
        category: newItemCategory,
        hsnCode: newItemHsnCode?.trim() || undefined,
        brand: newItemBrand?.trim() || undefined,
        barcode: newItemBarcode?.trim() || undefined,
        stock: stockQty,
        minStock: 0,
        maxStock: stockQty * 2 || 100,
        reorderPoint: newItemLowStockAlert ? parseInt(newItemLowStockAlert) : 10,
        isActive: true
      }

      const savedItem = await createItem(itemData)

      console.log('📦 Item created from Purchases page:', savedItem)

      if (savedItem) {
        // Update local item lists
        setAllItems(prev => {
          const updated = [savedItem, ...prev]
          console.log('✅ Updated allItems in Purchases:', updated.length, 'items')
          return updated
        })
        setAvailableItems(prev => [
          ...prev,
          {
            id: savedItem.id,
            name: savedItem.name || savedItem.description || 'Unnamed Item',
            price: savedItem.sellingPrice || savedItem.retailPrice || savedItem.purchasePrice || 0,
            tax: savedItem.tax?.gstRate ?? (
              savedItem.tax
                ? (savedItem.tax.cgst || 0) + (savedItem.tax.sgst || 0) + (savedItem.tax.igst || 0)
                : 0
            )
          }
        ])

        // Immediately add to current Bill
        handleItemSelect(savedItem)

        toast.success('Item added successfully!')
        resetNewItemForm()
        setShowAddItemModal(false)
      } else {
        console.error('❌ Failed to create item - createItem returned null')
        toast.error('Failed to add item')
      }
    } catch (error) {
      console.error('Error adding item from Purchases page:', error)
      toast.error('Failed to add item. Please try again.')
    } finally {
      setSavingItem(false)
    }
  }

  const [Bills, setBills] = useState<any[]>([])
  const [isLoadingBills, setIsLoadingBills] = useState(false)

  // Load Bills from database on mount
  useEffect(() => {
    loadBillsFromDatabase().catch(err => {
      console.error('Failed to load Bills:', err)
      setIsLoadingBills(false)
    })
  }, [])

  // Click outside to close Supplier dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (SupplierDropdownRef.current && !SupplierDropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false)
      }
    }

    if (showSupplierDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSupplierDropdown])

  // Click outside to close item dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false)
      }
    }

    if (showItemDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showItemDropdown])

  // Keyboard navigation for dropdowns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key closes dropdowns
      if (event.key === 'Escape') {
        setShowSupplierDropdown(false)
        setShowItemDropdown(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const statusConfig = {
    paid: { icon: CheckCircle, color: 'success', label: 'Paid' },
    partial: { icon: Clock, color: 'warning', label: 'Partial' },
    pending: { icon: Clock, color: 'destructive', label: 'Pending' },
    overdue: { icon: XCircle, color: 'destructive', label: 'Overdue' }
  }

  const addItem = (item: BillItem | typeof availableItems[0]) => {
    // Get seller state for GST calculation
    const companySettings = getCompanySettings()
    const sellerState = companySettings.state || 'Tamil Nadu'

    // Check if item is already a complete BillItem
    if ('qty' in item && 'unit' in item && 'discountAmount' in item) {
      const existing = item as BillItem
      const price = Number(existing.price) || 0
      const qty = Number(existing.qty) || 1
      const discountPercent = Number(existing.discount) || 0
      const taxPercent = Number(existing.tax) || 0

      const discountedPricePerUnit = price - (price * discountPercent / 100)
      const lineBase = price * qty
      const discountAmount = lineBase - (discountedPricePerUnit * qty)
      const taxableAmount = discountedPricePerUnit * qty

      // Calculate GST breakdown
      const gstBreakdown = calculateGSTBreakdown({
        taxableAmount,
        gstRate: taxPercent,
        sellerState,
        SupplierState: SupplierState || sellerState,
        SupplierGSTIN: SupplierGST
      })

      const total = taxableAmount + gstBreakdown.totalTaxAmount

      const normalizedItem: BillItem = {
        ...existing,
        id: existing.id.includes('_') ? existing.id : `${existing.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        discountAmount,
        taxAmount: gstBreakdown.totalTaxAmount,
        cgstPercent: gstBreakdown.cgstPercent,
        cgstAmount: gstBreakdown.cgstAmount,
        sgstPercent: gstBreakdown.sgstPercent,
        sgstAmount: gstBreakdown.sgstAmount,
        igstPercent: gstBreakdown.igstPercent,
        igstAmount: gstBreakdown.igstAmount,
        total
      }

      setBillItems([...BillItems, normalizedItem])
    } else {
      // Convert from availableItems format
      const oldItem = item as typeof availableItems[0]
      const price = Number(oldItem.price) || 0
      const qty = 1
      const discountPercent = 0
      const taxPercent = Number(oldItem.tax) || 0

      const discountedPricePerUnit = price - (price * discountPercent / 100)
      const lineBase = price * qty
      const discountAmount = lineBase - (discountedPricePerUnit * qty)
      const taxableAmount = discountedPricePerUnit * qty

      // Calculate GST breakdown
      const gstBreakdown = calculateGSTBreakdown({
        taxableAmount,
        gstRate: taxPercent,
        sellerState,
        SupplierState: SupplierState || sellerState,
        SupplierGSTIN: SupplierGST
      })

      const total = taxableAmount + gstBreakdown.totalTaxAmount

      const newItem: BillItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: oldItem.name,
        qty,
        unit: 'NONE',
        price,
        discount: discountPercent,
        discountAmount,
        tax: taxPercent,
        taxAmount: gstBreakdown.totalTaxAmount,
        cgstPercent: gstBreakdown.cgstPercent,
        cgstAmount: gstBreakdown.cgstAmount,
        sgstPercent: gstBreakdown.sgstPercent,
        sgstAmount: gstBreakdown.sgstAmount,
        igstPercent: gstBreakdown.igstPercent,
        igstAmount: gstBreakdown.igstAmount,
        total
      }
      setBillItems([...BillItems, newItem])
    }
  }

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    // Get seller state for GST calculation
    const companySettings = getCompanySettings()
    const sellerState = companySettings.state || 'Tamil Nadu'

    setBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== id) return item

        const updated: BillItem = { ...item, [field]: value }

        const price = Number(updated.price) || 0
        const qty = Number(updated.qty) || 1
        const discountPercent = Number(updated.discount) || 0
        const taxPercent = Number(updated.tax) || 0

        const discountedPricePerUnit = price - (price * discountPercent / 100)
        const lineBase = price * qty
        const discountAmount = lineBase - (discountedPricePerUnit * qty)
        const taxableAmount = discountedPricePerUnit * qty

        // Calculate GST breakdown
        const gstBreakdown = calculateGSTBreakdown({
          taxableAmount,
          gstRate: taxPercent,
          sellerState,
          SupplierState: SupplierState || sellerState,
          SupplierGSTIN: SupplierGST
        })

        const total = taxableAmount + gstBreakdown.totalTaxAmount

        return {
          ...updated,
          discountAmount,
          taxAmount: gstBreakdown.totalTaxAmount,
          cgstPercent: gstBreakdown.cgstPercent,
          cgstAmount: gstBreakdown.cgstAmount,
          sgstPercent: gstBreakdown.sgstPercent,
          sgstAmount: gstBreakdown.sgstAmount,
          igstPercent: gstBreakdown.igstPercent,
          igstAmount: gstBreakdown.igstAmount,
          total
        }
      })
    )
  }

  // Update individual tax components manually (for manual override)
  const updateItemTax = (id: string, taxField: 'cgstPercent' | 'sgstPercent' | 'igstPercent', value: number) => {
    setBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== id) return item

        const updated = { ...item, [taxField]: value }

        // Recalculate tax amounts based on new percentages
        const price = Number(updated.price) || 0
        const qty = Number(updated.qty) || 1
        const discountPercent = Number(updated.discount) || 0
        const discountedPricePerUnit = price - (price * discountPercent / 100)
        const taxableAmount = discountedPricePerUnit * qty

        // Calculate amounts based on manual percentages
        const cgstAmount = (taxableAmount * updated.cgstPercent) / 100
        const sgstAmount = (taxableAmount * updated.sgstPercent) / 100
        const igstAmount = (taxableAmount * updated.igstPercent) / 100
        const totalTaxAmount = cgstAmount + sgstAmount + igstAmount

        // Update total tax percentage to match manual entry
        const totalTaxPercent = updated.cgstPercent + updated.sgstPercent + updated.igstPercent

        const total = taxableAmount + totalTaxAmount

        return {
          ...updated,
          cgstAmount: Math.round(cgstAmount * 100) / 100,
          sgstAmount: Math.round(sgstAmount * 100) / 100,
          igstAmount: Math.round(igstAmount * 100) / 100,
          taxAmount: Math.round(totalTaxAmount * 100) / 100,
          tax: totalTaxPercent,
          total
        }
      })
    )
  }

  const removeItem = (id: string) => {
    setBillItems(BillItems.filter(item => item.id !== id))
  }

  const calculateTotals = () => {
    const companySettings = getCompanySettings()
    const sellerState = companySettings.state || 'Tamil Nadu'

    const subtotal = BillItems.reduce((sum, item) => {
      const discountedPrice = item.price - (item.price * item.discount / 100)
      return sum + (discountedPrice * item.qty)
    }, 0)

    const discount = subtotal * (BillDiscount / 100)
    const subtotalAfterDiscount = subtotal - discount

    // Calculate GST breakdown totals - recalculate for old items that don't have breakdown
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0

    BillItems.forEach(item => {
      if (item.cgstAmount !== undefined && item.sgstAmount !== undefined && item.igstAmount !== undefined) {
        // New items with breakdown
        totalCGST += item.cgstAmount
        totalSGST += item.sgstAmount
        totalIGST += item.igstAmount
      } else {
        // Old items without breakdown - calculate on the fly
        const itemDiscountedPrice = item.price - (item.price * item.discount / 100)
        const itemTaxableAmount = itemDiscountedPrice * item.qty
        const gstBreakdown = calculateGSTBreakdown({
          taxableAmount: itemTaxableAmount,
          gstRate: item.tax,
          sellerState,
          SupplierState: SupplierState || sellerState,
          SupplierGSTIN: SupplierGST
        })
        totalCGST += gstBreakdown.cgstAmount
        totalSGST += gstBreakdown.sgstAmount
        totalIGST += gstBreakdown.igstAmount
      }
    })

    const totalTax = totalCGST + totalSGST + totalIGST
    const totalBeforeRound = subtotalAfterDiscount + totalTax

    // Calculate round off amount
    const roundOffAmount = roundOff ? (Math.round(totalBeforeRound) - totalBeforeRound) : 0
    const total = roundOff ? Math.round(totalBeforeRound) : totalBeforeRound

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      total: Math.round(total * 100) / 100,
      totalCGST: Math.round(totalCGST * 100) / 100,
      totalSGST: Math.round(totalSGST * 100) / 100,
      totalIGST: Math.round(totalIGST * 100) / 100,
      roundOffAmount: Math.round(roundOffAmount * 100) / 100
    }
  }

  const totals = calculateTotals()

  // Generate PDF filename: Bill_INV-2025-26-0020_Gane_20112025.pdf
  const generatePDFFilename = () => {
    const date = new Date(BillDate)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const formattedDate = `${day}${month}${year}`

    // Clean Supplier name - remove special characters and spaces
    const cleanSupplierName = SupplierName.trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20) || 'Supplier'

    // Clean Bill number - remove special characters
    const cleanBillNumber = BillNumber.replace(/[^a-zA-Z0-9-]/g, '_')

    return `Bill_${cleanBillNumber}_${cleanSupplierName}_${formattedDate}.pdf`
  }

  // Handle successful UPI payment
  const handleUPIPaymentSuccess = async (transactionId: string) => {
    if (!pendingBillData) return

    try {
      // Update Bill data with payment status
      const BillData = {
        ...pendingBillData,
        payment: {
          ...pendingBillData.payment,
          status: 'paid' as const,
          paidAmount: pendingBillData.grandTotal,
          dueAmount: 0,
          transactionId: transactionId
        }
      }

      // Save to database
      const savedBill = await createBillService(BillData)

      if (savedBill) {
        // Save payment status
        savePaymentStatus({
          paymentId: transactionId,
          orderId: BillData.BillNumber,
          method: 'upi',
          amount: BillData.grandTotal,
          status: 'success',
          transactionId: transactionId,
          timestamp: new Date().toISOString(),
          SupplierName: BillData.partyName,
          SupplierPhone: BillData.partyPhone
        })

        toast.success(`Bill ${BillData.BillNumber} created & payment received!`)

        // Reload Bills list
        await loadBillsFromDatabase()

        // Close modal and reset form
        setShowUPIModal(false)
        setPendingBillData(null)
        setCurrentPaymentDetails(null)
        closeCurrentTab()
      } else {
        toast.error('Failed to create Bill. Please try again.')
      }
    } catch (error) {
      console.error('Error creating Bill with payment:', error)
      toast.error('Error creating Bill. Please try again.')
    }
  }

  // Handle UPI payment cancellation
  const handleUPIPaymentCancel = () => {
    setShowUPIModal(false)
    setPendingBillData(null)
    setCurrentPaymentDetails(null)
    toast.info('Payment cancelled. Bill not created.')
  }

  // Handle successful card payment
  const handleCardPaymentSuccess = async (transactionId: string) => {
    if (!pendingBillData) return

    try {
      // Update Bill data with payment status
      const BillData = {
        ...pendingBillData,
        payment: {
          ...pendingBillData.payment,
          status: 'paid' as const,
          paidAmount: pendingBillData.grandTotal,
          dueAmount: 0,
          transactionId: transactionId
        }
      }

      // Save to database
      const savedBill = await createBillService(BillData)

      if (savedBill) {
        // Save payment status
        savePaymentStatus({
          paymentId: transactionId,
          orderId: BillData.BillNumber,
          method: 'card',
          amount: BillData.grandTotal,
          status: 'success',
          transactionId: transactionId,
          timestamp: new Date().toISOString(),
          SupplierName: BillData.partyName,
          SupplierPhone: BillData.partyPhone
        })

        toast.success(`Bill ${BillData.BillNumber} created & payment received!`)

        // Reload Bills list
        await loadBillsFromDatabase()

        // Close modal and reset form
        setShowCardModal(false)
        setPendingBillData(null)
        setCurrentCardPaymentRequest(null)
        closeCurrentTab()
      } else {
        toast.error('Failed to create Bill. Please try again.')
      }
    } catch (error) {
      console.error('Error creating Bill with payment:', error)
      toast.error('Error creating Bill. Please try again.')
    }
  }

  // Handle card payment cancellation
  const handleCardPaymentCancel = () => {
    setShowCardModal(false)
    setPendingBillData(null)
    setCurrentCardPaymentRequest(null)
    toast.info('Payment cancelled. Bill not created.')
  }

  // Create Bill only (without payment requirement) - for traditional invoicing
  const createBillOnly = async () => {
    if (!SupplierName || BillItems.length === 0) {
      toast.error('Please fill Supplier name and add at least one item')
      return
    }

    // Validate HSN for B2B transactions
    if (isHSNRequired(SupplierGST)) {
      const missingHSN = BillItems.filter(item => !item.hsnCode || item.hsnCode.trim() === '')
      if (missingHSN.length > 0) {
        toast.error(`HSN Code is mandatory for B2B Bills. Missing for: ${missingHSN.map(i => i.name).join(', ')}`)
        return
      }
    }

    try {
      // Calculate totals
      const totals = calculateTotals()

      // Use user-entered Bill number and date (from component state)

      // Create Bill data
      const BillData = {
        type: 'Purchase' as const,
        BillNumber,
        BillDate,
        dueDate: BillDate, // Same as Bill date for now

        // Party details
        partyName: SupplierName,
        partyPhone: SupplierPhone || undefined,
        partyEmail: SupplierEmail || undefined,
        partyGSTIN: SupplierGST || undefined,

        // Items
        items: BillItems.map((item, index) => ({
          id: `item_${index}`,
          description: item.name,
          hsn: '',
          quantity: item.qty,
          unit: 'pcs',
          rate: item.price,
          discount: item.discount,
          taxRate: item.tax,
          amount: item.total
        })),

        // Totals
        subtotal: totals.subtotal,
        discountAmount: totals.discount,
        totalTaxAmount: totals.totalTax,
        grandTotal: totals.total,

        // Payment - marked as pending for Bills
        payment: {
          mode: paymentMode as 'cash' | 'bank' | 'upi' | 'card' | 'cheque',
          status: 'pending' as const,
          paidAmount: 0,
          dueAmount: totals.total
        },

        // Additional
        notes: notes || undefined,
        createdBy: 'user'
      }

      // Save Bill without payment
      const savedBill = await createBillService(BillData)

      if (savedBill) {
        toast.success(`Bill ${BillNumber} created successfully!`)

        // Reload Bills list
        await loadBillsFromDatabase()

        // Close current tab only, preserve other tabs
        closeCurrentTab()
      } else {
        toast.error('Failed to create Bill. Please try again.')
      }
    } catch (error) {
      console.error('Error creating Bill:', error)
      toast.error('Error creating Bill. Please try again.')
    }
  }

  // Complete Purchase with payment (POS mode) - handles payment flow
  const createBill = async () => {
    if (!SupplierName || BillItems.length === 0) {
      toast.error('Please fill Supplier name and add at least one item')
      return
    }

    // Validate HSN for B2B transactions
    if (isHSNRequired(SupplierGST)) {
      const missingHSN = BillItems.filter(item => !item.hsnCode || item.hsnCode.trim() === '')
      if (missingHSN.length > 0) {
        toast.error(`HSN Code is mandatory for B2B Bills. Missing for: ${missingHSN.map(i => i.name).join(', ')}`)
        return
      }
    }

    try {
      // Calculate totals
      const totals = calculateTotals()

      // Use user-entered Bill number and date (from component state)

      // Create Bill data
      const BillData = {
        type: 'Purchase' as const,
        BillNumber,
        BillDate,
        dueDate: BillDate, // Same as Bill date for now

        // Party details
        partyName: SupplierName,
        partyPhone: SupplierPhone || undefined,
        partyEmail: SupplierEmail || undefined,
        partyGSTIN: SupplierGST || undefined,

        // Items
        items: BillItems.map((item, index) => ({
          id: `item_${index}`,
          description: item.name,
          hsn: '',
          quantity: item.qty,
          unit: 'pcs',
          rate: item.price,
          discount: item.discount,
          taxRate: item.tax,
          amount: item.total
        })),

        // Totals
        subtotal: totals.subtotal,
        discountAmount: totals.discount,
        totalTaxAmount: totals.totalTax,
        grandTotal: totals.total,

        // Payment
        payment: {
          mode: paymentMode as 'cash' | 'bank' | 'upi' | 'card' | 'cheque',
          status: 'pending' as const,
          paidAmount: 0,
          dueAmount: totals.total
        },

        // Additional
        notes: notes || undefined,
        createdBy: 'user'
      }

      // If payment mode is UPI, show UPI QR modal
      if (paymentMode === 'upi') {
        const paymentRef = generatePaymentRef()
        const upiDetails: UPIPaymentDetails = {
          merchantVPA: 'merchant@upi', // TODO: Get from settings
          merchantName: 'YOUR BUSINESS NAME', // TODO: Get from settings
          amount: totals.total,
          currency: 'INR',
          transactionNote: `Bill ${BillNumber}`,
          transactionRef: paymentRef
        }

        setCurrentPaymentDetails(upiDetails)
        setPendingBillData(BillData)
        setShowUPIModal(true)
        return
      }

      // If payment mode is card, show card terminal modal
      if (paymentMode === 'card') {
        const cardRequest: CardPaymentRequest = {
          amount: totals.total,
          currency: 'INR',
          orderId: BillNumber,
          SupplierName: SupplierName,
          SupplierPhone: SupplierPhone
        }

        setCurrentCardPaymentRequest(cardRequest)
        setPendingBillData(BillData)
        setShowCardModal(true)
        return
      }

      // For cash, bank, credit - save immediately with payment marked as pending
      const savedBill = await createBillService(BillData)

      if (savedBill) {
        toast.success(`Purchase completed! Bill ${BillNumber} created.`)

        // Reload Bills list
        await loadBillsFromDatabase()

        // Close current tab only, preserve other tabs
        closeCurrentTab()
      } else {
        toast.error('Failed to create Bill. Please try again.')
      }
    } catch (error) {
      console.error('Error creating Bill:', error)
      toast.error('Error creating Bill. Please try again.')
    }
  }

  const viewBill = (Bill: any) => {
    setSelectedBill(Bill)
    setShowViewModal(true)
  }

  const confirmDelete = (Bill: any) => {
    setBillToDelete(Bill)
    setShowDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (BillToDelete) {
      try {
        // Delete from database/storage
        const success = await deleteBill(BillToDelete.id)

        if (success) {
          // Reload Bills from database to ensure UI is in sync
          await loadBillsFromDatabase()
          toast.success(`Bill ${BillToDelete.BillNumber} deleted successfully`)
        } else {
          toast.error('Failed to delete Bill from database')
        }
      } catch (error) {
        console.error('Error deleting Bill:', error)
        toast.error('Error deleting Bill. Please try again.')
      } finally {
        setShowDeleteConfirm(false)
        setBillToDelete(null)
      }
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setBillToDelete(null)
  }

  // Open payment modal
  const openPaymentModal = async (Bill: any) => {
    setSelectedBillForPayment(Bill)
    const balanceDue = (Bill.total || Bill.grandTotal || 0) - (Bill.paidAmount || 0)
    setPaymentAmount(balanceDue.toString())
    setPaymentMethodSelected('cash')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentReference('')
    setPaymentNotes('')

    // Load existing payments for this Bill
    const payments = await getBillPayments(Bill.id)
    setBillPayments(payments)

    setShowPaymentModal(true)
  }

  // Record payment
  const handleRecordPayment = async () => {
    if (!selectedBillForPayment || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    const amount = parseFloat(paymentAmount)
    const balanceDue = (selectedBillForPayment.total || selectedBillForPayment.grandTotal || 0) - (selectedBillForPayment.paidAmount || 0)

    if (amount > balanceDue) {
      toast.error(`Payment amount cannot exceed balance due (₹${balanceDue.toLocaleString('en-IN')})`)
      return
    }

    try {
      console.log('🔍 Recording payment for Bill:', selectedBillForPayment)

      const paymentData: any = {
        BillId: selectedBillForPayment.id,
        BillNumber: selectedBillForPayment.BillNumber,
        BillType: 'Purchase' as const,  // Added for ledger tracking
        partyId: selectedBillForPayment.partyId || 'unknown',
        partyName: selectedBillForPayment.partyName,
        amount: amount,
        paymentMode: paymentMethodSelected,
        paymentDate: paymentDate
      }

      // Only add optional fields if they have values (Firebase doesn't allow undefined)
      if (paymentReference && paymentReference.trim()) {
        paymentData.reference = paymentReference.trim()
      }
      if (paymentNotes && paymentNotes.trim()) {
        paymentData.notes = paymentNotes.trim()
      }

      console.log('💰 Payment data:', paymentData)

      const result = await recordPayment(paymentData)

      console.log('✅ Payment result:', result)

      if (result) {
        toast.success(`Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully!`)

        // Reload Bills to update payment status
        await loadBillsFromDatabase()

        // Close modal
        setShowPaymentModal(false)
        setSelectedBillForPayment(null)
      } else {
        console.error('❌ Payment recording returned null')
        toast.error('Failed to record payment. Check browser console for details.')
      }
    } catch (error) {
      console.error('❌ Error recording payment:', error)
      toast.error(`Error recording payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Share Bill via WhatsApp
  const handleShareWhatsApp = (Bill: any) => {
    try {
      const phone = Bill.partyPhone || ''
      if (!phone) {
        toast.error('Supplier phone number not available')
        return
      }

      shareViaWhatsApp(
        phone,
        Bill.BillNumber,
        Bill.total,
        'ThisAI CRM'
      )
      toast.success('Opening WhatsApp...')
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error)
      toast.error('Failed to share via WhatsApp')
    }
  }

  // Download Bill PDF
  const handleDownloadPDF = async (Bill: any) => {
    try {
      // In a real app, fetch full Bill details from database
      // For now, use the display data
      const pdfData: BillPDFData = {
        companyName: 'ThisAI CRM',
        companyGSTIN: '29AABCT1332L1ZU',
        companyAddress: '123 Business Street, Bangalore, Karnataka 560001',
        companyPhone: '+91 9876543210',
        companyEmail: 'info@thisai-crm.com',

        BillNumber: Bill.BillNumber,
        BillDate: Bill.date,
        type: 'Purchase',

        partyName: Bill.partyName,
        partyPhone: Bill.partyPhone || '',

        items: [
          {
            name: 'Sample Item',
            quantity: 1,
            unit: 'pcs',
            rate: Bill.subtotal || 0,
            taxRate: Bill.tax ? (Bill.tax / Bill.subtotal * 100) : 0,
            amount: Bill.total
          }
        ],

        subtotal: Bill.subtotal || 0,
        totalTax: Bill.tax || 0,
        grandTotal: Bill.total,
        paidAmount: Bill.paidAmount || 0,
        balanceDue: Bill.total - (Bill.paidAmount || 0),
        paymentStatus: Bill.paymentStatus
      }

      downloadBillPDF(pdfData)
      toast.success('PDF downloaded successfully!')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  // Generate & download E-Bill data and PDF
  const handleGenerateEBill = async (Bill: any) => {
    try {
      toast.loading('Generating E-Bill...')
      // Simulate server processing
      await new Promise((r) => setTimeout(r, 900))

      const eBillData = {
        irn: `IRN${Date.now()}${Math.random().toString(36).substring(7)}`,
        ackNo: `ACK${Date.now()}`,
        ackDate: new Date().toISOString(),
        BillNumber: Bill.BillNumber,
        signedQRCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
      }

      // Download readable PDF
      try {
        downloadEBillPDF(eBillData)
      } catch (err) {
        // ignore
      }

      // Force JSON download as fallback
      const dataStr = JSON.stringify(eBillData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      const filename = `E-Bill-${Bill.BillNumber}.json`
      link.href = url
      link.download = filename
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 150)

      toast.success('E-Bill generated and downloaded')
    } catch (error) {
      console.error('Error generating E-Bill:', error)
      toast.error('Failed to generate E-Bill')
    }
  }

  const filteredBills = Bills.filter(Bill => {
    const matchesSearch = Bill.BillNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         Bill.partyName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || Bill.paymentStatus === filterStatus
    return matchesSearch && matchesFilter
  })

  // Generate & download E-Way Bill data and PDF
  const handleGenerateEWayBill = async (Bill: any) => {
    try {
      toast.loading('Generating E-Way Bill...')
      await new Promise((r) => setTimeout(r, 900))

      const ewayBillData = {
        ewbNo: `EWB${Date.now()}`,
        ewbDate: new Date().toISOString(),
        validUpto: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        BillNumber: Bill.BillNumber,
        distance: 150,
        vehicleNo: 'KA01AB1234'
      }

      // Download human-readable PDF
      try {
        downloadEWayBillPDF(ewayBillData)
      } catch (err) {
        // ignore
      }

      const dataStr = JSON.stringify(ewayBillData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      const filename = `E-Way-Bill-${Bill.BillNumber}.json`
      link.href = url
      link.download = filename
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 150)

      toast.success('E-Way Bill generated and downloaded')
    } catch (error) {
      console.error('Error generating E-Way Bill:', error)
      toast.error('Failed to generate E-Way Bill')
    }
  }

  const handlePrintBill = (Bill: any) => {
    try {
      window.print()
      toast.success('Opening print dialog...')
    } catch (error) {
      console.error('Error printing Bill:', error)
      toast.error('Failed to print Bill')
    }
  }

  const handleEditBill = (Bill: any) => {
    toast.info('Edit Bill - Coming soon!')
    console.log('Edit Bill:', Bill)
  }

  const handleDuplicateBill = (Bill: any) => {
    toast.success('Bill duplicated with new number!')
    console.log('Duplicate Bill:', Bill)
  }

  const handlePOSBill = (Bill: any) => {
    try {
      const posBill = `
=============================
       THIS AI CRM
=============================
Bill: ${Bill.BillNumber}
Date: ${new Date(Bill.createdAt).toLocaleDateString()}
-----------------------------
Supplier: ${Bill.partyName}
Phone: ${Bill.partyPhone || 'N/A'}
-----------------------------
ITEMS:
${Bill.items.map((item: any) => `${item.name} x ${item.quantity}
  @ ₹${item.rate} = ₹${item.amount}`).join('\n')}
-----------------------------
Subtotal:    ₹${Bill.subtotal}
Tax:         ₹${Bill.tax}
-----------------------------
TOTAL:       ₹${Bill.total}
=============================
    Thank You! Visit Again
=============================
    `
      const blob = new Blob([posBill], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `POS-${Bill.BillNumber}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('POS bill downloaded!')
    } catch (error) {
      console.error('Error generating POS bill:', error)
      toast.error('Failed to generate POS bill')
    }
  }

  const handlePurchaseReturn = (Bill: any) => {
    toast.info('Create Purchase Return - Coming soon!')
    console.log('Create Purchase return for:', Bill)
  }

  return (
    <div className="min-h-screen p-2 sm:p-3 pb-20 lg:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold flex items-center gap-1.5">
              <ShoppingCart size={20} weight="duotone" className="text-warning" />
              {viewMode === 'create' ? 'Create New Bill' : 'Purchases Bills'}
            </h1>
            {viewMode === 'create' && (
              <>
                <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-0.5 rounded-lg border border-slate-200/60 shadow-sm">
                  <button
                    onClick={() => setPurchasesMode('pos')}
                    className={cn(
                      "px-2.5 py-1 rounded font-semibold text-[11px] transition-all flex items-center gap-1",
                      PurchasesMode === 'pos'
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <CreditCard size={14} weight={PurchasesMode === 'pos' ? 'fill' : 'regular'} />
                    <span>POS</span>
                  </button>
                  <button
                    onClick={() => setPurchasesMode('Bill')}
                    className={cn(
                      "px-2.5 py-1 rounded font-semibold text-[11px] transition-all flex items-center gap-1",
                      PurchasesMode === 'Bill'
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <ShoppingCart size={14} weight={PurchasesMode === 'Bill' ? 'fill' : 'regular'} />
                    <span>Bill</span>
                  </button>
                </div>
                {/* Preview Buttons - Next to mode toggle */}
                {PurchasesMode === 'Bill' && BillItems.length > 0 && (
                  <>
                    {!showPreview && (
                      <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowPreviewModal(true)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-all flex items-center gap-1 font-semibold text-[11px]"
                        title="Preview Bill in Modal"
                      >
                        <Eye size={14} weight="duotone" />
                        <span>Preview</span>
                      </motion.button>
                    )}
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowPreview(!showPreview)}
                      className={cn(
                        "px-2.5 py-1 rounded shadow-sm transition-all flex items-center gap-1 font-semibold text-[11px]",
                        showPreview
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      )}
                      title={showPreview ? "Hide Live Preview" : "Show Live Preview"}
                    >
                      <Eye size={14} weight={showPreview ? "fill" : "duotone"} />
                      <span>{showPreview ? "Hide Live" : "Live Preview"}</span>
                    </motion.button>
                  </>
                )}
              </>
            )}
            {viewMode !== 'create' && (
              <p className="text-muted-foreground text-sm">
                Manage your Purchases and track payments
              </p>
            )}
          </div>
          <div className="flex gap-1.5">
            {viewMode === 'create' ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBackToList}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-white hover:bg-destructive/90 rounded-lg font-medium transition-colors text-xs"
              >
                <ArrowLeft size={14} weight="bold" />
                <span className="hidden sm:inline">Back to Purchases Screen</span>
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAIAssistant(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-warning to-accent text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  <Sparkle size={18} weight="duotone" />
                  <span className="hidden sm:inline">AI Bill</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('create')}
                  className="flex items-center gap-2 px-4 py-2 bg-warning text-warning-foreground rounded-lg font-medium hover:bg-warning/90 transition-colors"
                >
                  <Plus size={18} weight="bold" />
                  <span className="hidden sm:inline">New Bill</span>
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards - Only show in list mode */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Total Purchases', value: '₹4,58,750', icon: CurrencyCircleDollar, trend: '+12%' },
            { label: 'Paid', value: '₹3,12,450', icon: CheckCircle, color: 'success' },
            { label: 'Pending', value: '₹1,46,300', icon: Clock, color: 'warning' },
            { label: 'This Month', value: '₹89,200', icon: Calendar, trend: '+8%' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2 }}
              className="bg-card rounded-lg p-4 border border-border/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon
                  size={18}
                  weight="duotone"
                  className={cn(
                    stat.color === 'success' && "text-success",
                    stat.color === 'warning' && "text-warning",
                    !stat.color && "text-warning"
                  )}
                />
                {stat.trend && (
                  <span className={cn(
                    "text-xs font-medium",
                    stat.trend.startsWith('+') ? "text-success" : "text-destructive"
                  )}>
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>
        )}
      </motion.div>

      {/* Filters - Only show in list mode */}
      {viewMode === 'list' && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-lg p-4 mb-4 border border-border/50"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by Bill number, party name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-muted/30 rounded-lg outline-none focus:ring-2 focus:ring-warning/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'paid', 'pending', 'partial'].map((status) => (
              <motion.button
                key={status}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                  filterStatus === status
                    ? "bg-warning text-warning-foreground"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                {status}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
      )}

      {/* Bills List - Only show in list mode */}
      {viewMode === 'list' && (
      <div className="space-y-3">
        {isLoadingBills ? (
          // Loading skeleton
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-lg p-4 border border-border/50 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="hidden sm:block w-12 h-12 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-48"></div>
                    </div>
                  </div>
                  <div className="h-6 w-24 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredBills.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 bg-card rounded-lg border border-border/50"
          >
            <ShoppingCart size={48} weight="duotone" className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Purchases Bills Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by scanning an Bill or creating a new Purchase
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowScanner(true)}
                className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors flex items-center gap-2"
              >
                <Camera size={16} weight="bold" />
                AI Scan
              </button>
              <button
                onClick={() => setViewMode('create')}
                className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Plus size={16} weight="bold" />
                New Bill
              </button>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredBills.map((Bill, index) => {
            const statusInfo = statusConfig[Bill.paymentStatus] || statusConfig['pending']

            return (
              <motion.div
                key={Bill.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                className="bg-card rounded-lg p-4 border border-border/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="hidden sm:flex p-3 bg-warning/5 rounded-lg"
                    >
                      <ShoppingCart size={20} weight="duotone" className="text-warning" />
                    </motion.div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{Bill.BillNumber}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1",
                          Bill.paymentStatus === 'paid' && "bg-success/10 text-success",
                          Bill.paymentStatus === 'pending' && "bg-destructive/10 text-destructive",
                          Bill.paymentStatus === 'partial' && "bg-warning/10 text-warning"
                        )}>
                          <statusInfo.icon size={12} weight="duotone" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{Bill.partyName}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} weight="duotone" />
                          {new Date(Bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package size={14} weight="duotone" />
                          {Bill.items} items
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold">₹{Bill.total.toLocaleString('en-IN')}</p>
                      {Bill.paidAmount > 0 && Bill.paidAmount < Bill.total && (
                        <p className="text-xs text-muted-foreground">
                          Paid: ₹{Bill.paidAmount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {Bill.paymentStatus !== 'paid' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openPaymentModal(Bill)}
                          className="p-2 hover:bg-success/10 rounded-lg transition-colors text-success"
                          title="Record Payment"
                        >
                          <Money size={18} weight="duotone" />
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => viewBill(Bill)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Eye size={18} weight="duotone" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDownloadPDF(Bill)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download size={18} weight="duotone" />
                      </motion.button>
                        {/* E-Bill */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleGenerateEBill(Bill)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Generate E-Bill (PDF)"
                        >
                          <FileText size={18} weight="duotone" />
                        </motion.button>

                        {/* E-Way Bill */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleGenerateEWayBill(Bill)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Generate E-Way Bill (PDF)"
                        >
                          <Truck size={18} weight="duotone" />
                        </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleShareWhatsApp(Bill)}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                        title="Share on WhatsApp"
                      >
                        <WhatsappLogo size={18} weight="duotone" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => confirmDelete(Bill)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                      >
                        <Trash size={18} weight="duotone" />
                      </motion.button>

                      {/* 3-dot menu for additional actions */}
                      <div className="relative">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setOpenActionMenu(openActionMenu === Bill.id ? null : Bill.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <DotsThreeVertical size={18} weight="bold" />
                        </motion.button>

                        {/* Dropdown Menu */}
                        {openActionMenu === Bill.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                          >
                            {/* Print Bill */}
                            <button
                              onClick={() => {
                                handlePrintBill(Bill)
                                setOpenActionMenu(null)
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3"
                            >
                              <Printer size={18} weight="duotone" className="text-warning" />
                              <span className="font-medium">Print Bill</span>
                            </button>

                            {/* Edit Bill */}
                            <button
                              onClick={() => {
                                handleEditBill(Bill)
                                setOpenActionMenu(null)
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border"
                            >
                              <Pencil size={18} weight="duotone" className="text-warning" />
                              <span className="font-medium">Edit Bill</span>
                            </button>

                            {/* Duplicate Bill */}
                            <button
                              onClick={() => {
                                handleDuplicateBill(Bill)
                                setOpenActionMenu(null)
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3"
                            >
                              <Copy size={18} weight="duotone" className="text-warning" />
                              <span className="font-medium">Duplicate Bill</span>
                            </button>

                            {/* POS Bill */}
                            <button
                              onClick={() => {
                                handlePOSBill(Bill)
                                setOpenActionMenu(null)
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3"
                            >
                              <ShoppingCart size={18} weight="duotone" className="text-warning" />
                              <span className="font-medium">POS Bill</span>
                            </button>

                            {/* Create Purchase Return */}
                            <button
                              onClick={() => {
                                handlePurchaseReturn(Bill)
                                setOpenActionMenu(null)
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-3"
                            >
                              <ArrowCounterClockwise size={18} weight="duotone" className="text-warning" />
                              <span className="font-medium">Create Purchase Return</span>
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/parties?action=add')}
                      className="text-sm px-3 py-1 bg-warning/10 text-warning rounded hover:bg-warning/20"
                    >
                      + Add New Supplier
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
          </AnimatePresence>
        )}
      </div>
      )}

      {/* Create Bill Form - Show when in create mode */}
      {viewMode === 'create' && (
        <>
          <div className={cn(
            "gap-4 relative",
            (activeTab.mode === 'pos' && BillItems.length > 0)
              ? "grid grid-cols-[80%_20%]" // POS: 80% Main area + 20% ShoppingCart preview
              : showPreview
              ? "grid grid-cols-1 lg:grid-cols-[58%_42%]"  // Bill with preview
              : "grid grid-cols-1"  // Bill without preview (full width)
          )} style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Left Column - Bill Form / POS Product Area */}
          <div className={cn(
            "rounded-2xl border-2 shadow-xl flex flex-col overflow-hidden",
            PurchasesMode === 'pos'
              ? "bg-gradient-to-br from-slate-50 via-white to-slate-50/80 border-slate-200/80" // POS: Lighter, modern
              : "bg-gradient-to-br from-card via-card to-card/95 border-border/50" // Bill: Professional
          )}>


          {/* Tabs for multiple Bills */}
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border/50 flex-shrink-0">
            <div className="flex-1 flex items-center gap-0.5 overflow-x-auto">
              {BillTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={cn(
                    "relative flex items-center gap-1.5 px-2.5 py-1 rounded-t border border-b-0 cursor-pointer transition-all min-w-[100px]",
                    tab.id === activeTabId
                      ? "bg-background border-border text-foreground"
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                  )}
                  onClick={() => switchToTab(tab.id)}
                >
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      tab.mode === 'pos' ? "bg-green-500" : "bg-blue-500"
                    )} />
                    <span className="text-[11px] font-medium">
                      {tab.mode === 'pos' ? 'POS' : 'Bill'}
                    </span>
                    {tab.SupplierName && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                        - {tab.SupplierName}
                      </span>
                    )}
                  </div>
                  {BillTabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(tab.id)
                      }}
                      className="p-0.5 hover:bg-muted rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}

              {/* Add new tab button - color based on current mode */}
              <button
                onClick={() => addNewTab('Purchase')}
                className="p-1 hover:bg-muted rounded transition-colors group"
                title={`Add ${PurchasesMode === 'pos' ? 'POS' : 'Bill'} Tab`}
              >
                <div className="flex items-center gap-0.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    PurchasesMode === 'pos' ? "bg-green-500" : "bg-blue-500"
                  )} />
                  <Plus size={14} className="text-muted-foreground group-hover:text-foreground" />
                </div>
              </button>
            </div>
          </div>

          <div className={cn(
            "flex-1 overflow-y-auto space-y-1.5",
            activeTab.mode === 'pos' ? "p-2" : "p-2"
          )}>
            {/* Supplier Search Dropdown - Fixed positioned */}
            {showSupplierDropdown && SupplierDropdownRef.current && (
              <>
                <div className="fixed inset-0 z-[99]" onClick={() => setShowSupplierDropdown(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="fixed bg-card border border-border rounded-lg shadow-2xl z-[100] max-h-60 overflow-y-auto w-[400px]"
                  style={{
                    top: SupplierDropdownRef.current.getBoundingClientRect().bottom + 4,
                    left: SupplierDropdownRef.current.getBoundingClientRect().left,
                  }}
                >
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowSupplierDropdown(false)
                      setShowAddSupplierModal(true)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-warning/10 border-b border-border flex items-center gap-2 text-warning font-medium cursor-pointer"
                  >
                    <Plus size={16} weight="bold" />
                    Add New Supplier
                  </div>
                  {loadingParties ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Loading Suppliers...</div>
                  ) : filteredSuppliers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      {SupplierSearch ? 'No Suppliers found' : 'Start typing to search...'}
                    </div>
                  ) : (
                    filteredSuppliers.slice(0, 10).map((party) => (
                      <div
                        key={party.id}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSupplierSelect(party)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-b-0 cursor-pointer"
                      >
                        <div className="font-medium text-sm">{party.displayName || party.companyName || party.name || party.SupplierName || party.partyName || party.fullName || party.businessName || 'Unknown Supplier'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                          {party.phone && <span className="flex items-center gap-1"><Phone size={12} />{party.phone}</span>}
                          {party.email && <span className="flex items-center gap-1"><Envelope size={12} />{party.email}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              </>
            )}

            {/* Supplier + Bill Info - All in one row */}
            <div className="flex items-start gap-2">
              {/* Supplier Search */}
              <div className="flex-1" ref={SupplierDropdownRef}>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                  <input
                    type="text"
                    placeholder={activeTab.mode === 'pos' ? "Search Supplier..." : "Search Supplier..."}
                    value={SupplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value)
                      setShowSupplierDropdown(true)
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    className={cn(
                      "w-full pl-10 pr-3 py-2 text-sm outline-none transition-all",
                      activeTab.mode === 'pos'
                        ? "bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500"
                        : "bg-background border border-border rounded-lg focus:ring-1 focus:ring-warning/30 focus:border-warning"
                    )}
                  />
                </div>
              </div>

              {/* Selected Supplier Details */}
              {SupplierName && (
                <div className="flex-1 px-3 py-1.5 bg-warning/5 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs flex-1">
                      <div className="font-semibold text-foreground">{SupplierName}</div>
                      {SupplierPhone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone size={10} /> {SupplierPhone}
                        </div>
                      )}
                      {SupplierEmail && (
                        <div className="flex items-center gap-1 text-muted-foreground truncate">
                          <Envelope size={10} /> {SupplierEmail}
                        </div>
                      )}
                      {SupplierGST && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Buildings size={10} /> {SupplierGST}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSupplierName('')
                        setSupplierPhone('')
                        setSupplierEmail('')
                        setSupplierGST('')
                        setSupplierSearch('')
                      }}
                      className="text-xs text-destructive hover:underline ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Bill Number */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Inv#</label>
                <input
                  type="text"
                  value={BillNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="INV/2024-25/001"
                  className="w-32 px-2 py-2 text-xs bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-warning/30 focus:border-warning"
                />
              </div>

              {/* Bill Date */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={BillDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-28 px-2 py-2 text-xs bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-warning/30 focus:border-warning"
                />
              </div>
            </div>

              {/* Item Search Dropdown - Rendered outside table to avoid overflow clipping */}
              {showItemDropdown && itemDropdownRef.current && (
                <>
                  <div className="fixed inset-0 z-[99]" onClick={() => setShowItemDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed bg-card border border-border rounded-lg shadow-2xl z-[100] max-h-60 overflow-y-auto w-[400px]"
                    style={{
                      top: itemDropdownRef.current.getBoundingClientRect().bottom + 4,
                      left: itemDropdownRef.current.getBoundingClientRect().left,
                    }}
                  >
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowItemDropdown(false)
                        setShowAddItemModal(true)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-warning/10 border-b border-border flex items-center gap-2 text-warning font-medium cursor-pointer"
                    >
                      <Plus size={16} weight="bold" />
                      Create New Item
                    </div>
                    {loadingItems ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>
                    ) : filteredItems.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        {itemSearch ? 'No items found' : 'No items available'}
                      </div>
                    ) : (
                      filteredItems.slice(0, 10).map((item) => (
                        <div
                          key={item.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleItemSelect(item)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-b-0 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.name}</div>
                              {item.barcode && <div className="text-xs text-muted-foreground">{item.barcode}</div>}
                            </div>
                            <div className="text-sm font-semibold text-warning whitespace-nowrap">
                              ₹{item.sellingPrice || item.purchasePrice || 0}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                </>
              )}

              {/* Items List - Table Layout */}
              <div className="mt-4">
                <div className="overflow-x-auto border border-border rounded-lg bg-muted/10">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-center w-10">#</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        {visibleColumns.hsnCode && (
                          <th className="px-3 py-2 text-left w-24">HSN</th>
                        )}
                        {visibleColumns.description && (
                          <th className="px-3 py-2 text-left">Description</th>
                        )}
                        <th className="px-3 py-2 text-right w-16">Qty</th>
                        <th className="px-3 py-2 text-left w-24">Unit</th>
                        <th className="px-3 py-2 text-right w-28">Price/Unit</th>
                        {visibleColumns.discount && (
                          <>
                            <th className="px-3 py-2 text-right w-24">Disc %</th>
                            <th className="px-3 py-2 text-right w-28">Disc Amt</th>
                          </>
                        )}
                        {visibleColumns.tax && (
                          <>
                            <th className="px-3 py-2 text-right w-20 text-emerald-700">CGST%</th>
                            <th className="px-3 py-2 text-right w-20 text-emerald-700">SGST%</th>
                            <th className="px-3 py-2 text-right w-20 text-blue-700">IGST%</th>
                            <th className="px-3 py-2 text-right w-28">Tax Amt</th>
                          </>
                        )}
                        <th className="px-3 py-2 text-right w-32">Amount</th>
                        <th className="px-3 py-2 w-10"></th>
                        <th className="px-3 py-2 w-10 relative">
                          <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Add/Remove Columns"
                          >
                            <Plus size={16} weight="bold" />
                          </button>
                          {showColumnMenu && (
                            <div
                              ref={columnMenuRef}
                              className="absolute right-0 bottom-full mb-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[180px]"
                            >
                              <div className="p-2 text-xs">
                                <div className="font-semibold mb-2 text-foreground">Show Columns</div>
                                <label className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.hsnCode}
                                    onChange={(e) =>
                                      setVisibleColumns({
                                        ...visibleColumns,
                                        hsnCode: e.target.checked
                                      })
                                    }
                                    className="rounded"
                                  />
                                  <span className="text-foreground">HSN Code</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.description}
                                    onChange={(e) =>
                                      setVisibleColumns({
                                        ...visibleColumns,
                                        description: e.target.checked
                                      })
                                    }
                                    className="rounded"
                                  />
                                  <span className="text-foreground">Description</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.discount}
                                    onChange={(e) =>
                                      setVisibleColumns({
                                        ...visibleColumns,
                                        discount: e.target.checked
                                      })
                                    }
                                    className="rounded"
                                  />
                                  <span className="text-foreground">Discount</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.tax}
                                    onChange={(e) =>
                                      setVisibleColumns({
                                        ...visibleColumns,
                                        tax: e.target.checked
                                      })
                                    }
                                    className="rounded"
                                  />
                                  <span className="text-foreground">Tax</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {BillItems.length === 0 ? (
                        <>
                          {/* Inline Search Row - Always show for empty state */}
                          <tr className="bg-warning/5">
                            <td className="px-3 py-3 text-center align-middle">
                              <Plus size={16} className="text-warning mx-auto" />
                            </td>
                            <td className="px-3 py-3 align-middle" colSpan={1 + (visibleColumns.hsnCode ? 1 : 0) + (visibleColumns.description ? 1 : 0)}>
                              <div ref={itemDropdownRef}>
                                <input
                                  type="text"
                                  placeholder="Search & add item by name or barcode..."
                                  value={itemSearch}
                                  onChange={(e) => {
                                    setItemSearch(e.target.value)
                                    setShowItemDropdown(true)
                                  }}
                                  onFocus={() => setShowItemDropdown(true)}
                                  className="w-full px-3 py-2 bg-background border-2 border-warning/40 rounded-lg text-sm focus:ring-2 focus:ring-warning/50 focus:border-warning placeholder:text-muted-foreground/60"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center align-middle text-xs text-muted-foreground/70" colSpan={3 + (visibleColumns.discount ? 2 : 0) + (visibleColumns.tax ? 4 : 0) + 2}>
                              Search for items to add to Bill
                            </td>
                          </tr>
                        </>
                      ) : (
                        <>
                          {BillItems.map((item, index) => (
                            <tr
                              key={item.id}
                              className="border-t border-border/60 bg-background/40"
                            >
                              <td className="px-3 py-2 text-center align-middle">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2 align-middle">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
                                  placeholder="Item name"
                                />
                              </td>
                              {visibleColumns.hsnCode && (
                                <td className="px-3 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={item.hsnCode || ''}
                                    onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                                    className={cn(
                                      "w-full px-2 py-1 bg-background border rounded text-xs",
                                      isHSNRequired(SupplierGST) && (!item.hsnCode || item.hsnCode.trim() === '')
                                        ? "border-destructive focus:ring-destructive"
                                        : "border-border"
                                    )}
                                    placeholder={isHSNRequired(SupplierGST) ? "HSN (Required for B2B)" : "HSN"}
                                  />
                                </td>
                              )}
                              {visibleColumns.description && (
                                <td className="px-3 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
                                    placeholder="Description"
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2 text-right align-middle">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) =>
                                    updateItem(
                                      item.id,
                                      'qty',
                                      parseFloat(e.target.value) || 1
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-right"
                                />
                              </td>
                              <td className="px-3 py-2 align-middle">
                                <select
                                  value={item.unit || 'NONE'}
                                  onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
                                >
                                  <option value="NONE">NONE</option>
                                  <option value="PCS">PCS</option>
                                  <option value="KGS">KGS</option>
                                  <option value="LTRS">LTRS</option>
                                  <option value="MTR">MTR</option>
                                  <option value="BOX">BOX</option>
                                  <option value="PACK">PACK</option>
                                  <option value="SET">SET</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right align-middle">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price}
                                  onChange={(e) =>
                                    updateItem(
                                      item.id,
                                      'price',
                                      Math.round(parseFloat(e.target.value) * 100) / 100 || 0
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-right"
                                />
                              </td>
                              {visibleColumns.discount && (
                                <>
                                  <td className="px-3 py-2 text-right align-middle">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={item.discount}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          'discount',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-right"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    ₹{(item.discountAmount || 0).toFixed(2)}
                                  </td>
                                </>
                              )}
                              {visibleColumns.tax && (
                                <>
                                  <td className="px-3 py-2 text-right align-middle bg-emerald-50">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={item.cgstPercent || 0}
                                      onChange={(e) =>
                                        updateItemTax(
                                          item.id,
                                          'cgstPercent',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-16 px-1 py-0.5 bg-white border border-emerald-300 rounded text-xs text-right font-semibold text-emerald-700"
                                      title="CGST %"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle bg-emerald-50">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={item.sgstPercent || 0}
                                      onChange={(e) =>
                                        updateItemTax(
                                          item.id,
                                          'sgstPercent',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-16 px-1 py-0.5 bg-white border border-emerald-300 rounded text-xs text-right font-semibold text-emerald-700"
                                      title="SGST %"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle bg-blue-50">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={item.igstPercent || 0}
                                      onChange={(e) =>
                                        updateItemTax(
                                          item.id,
                                          'igstPercent',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-16 px-1 py-0.5 bg-white border border-blue-300 rounded text-xs text-right font-semibold text-blue-700"
                                      title="IGST %"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    ₹{(item.taxAmount || 0).toFixed(2)}
                                  </td>
                                </>
                              )}
                              <td className="px-3 py-2 text-right align-middle">
                                <div className="px-2 py-1 bg-success/10 border border-success/20 rounded text-xs font-semibold text-success inline-block min-w-[80px] text-right">
                                  ₹{item.total.toFixed(2)}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="p-1 hover:bg-destructive/10 text-destructive rounded"
                                >
                                  <Trash size={14} weight="duotone" />
                                </button>
                              </td>
                              <td className="px-3 py-2"></td>
                            </tr>
                          ))}
                          {/* Search + Total Row - Combined in same line */}
                          <tr className="border-t border-dashed border-warning/40 bg-warning/5">
                            <td className="px-3 py-1.5 text-center align-middle">
                              <Plus size={14} className="text-warning mx-auto" />
                            </td>
                            <td className="px-3 py-1.5 align-middle" colSpan={1 + (visibleColumns.hsnCode ? 1 : 0) + (visibleColumns.description ? 1 : 0)}>
                              <div ref={itemDropdownRef} className="relative">
                                <input
                                  type="text"
                                  placeholder="Search & add item..."
                                  value={itemSearch}
                                  onChange={(e) => {
                                    setItemSearch(e.target.value)
                                    setShowItemDropdown(true)
                                  }}
                                  onFocus={() => setShowItemDropdown(true)}
                                  className="w-full px-2 py-1 pr-36 bg-background border border-warning/30 rounded text-xs focus:ring-1 focus:ring-warning/50 focus:border-warning placeholder:text-muted-foreground/60"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 bg-yellow-100 px-2 py-0.5 rounded">
                                  Search by name or barcode
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5" colSpan={1 + (visibleColumns.discount ? 2 : 0) + (visibleColumns.tax ? 4 : 0)}>
                              {/* Round Off Checkbox */}
                              <div className="flex items-center justify-end gap-2">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={roundOff}
                                    onChange={(e) => setRoundOff(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-border text-warning focus:ring-warning"
                                  />
                                  <span className="text-[11px] font-medium text-muted-foreground">Round Off</span>
                                </label>
                                {roundOff && totals.roundOffAmount !== 0 && (
                                  <span className="text-[11px] font-semibold text-warning px-2 py-0.5 bg-warning/10 rounded">
                                    {totals.roundOffAmount >= 0 ? '+' : ''}₹{totals.roundOffAmount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-right text-[11px] font-semibold text-muted-foreground">
                              Total
                            </td>
                            <td className="px-3 py-1.5 text-right text-[11px] font-bold bg-warning/10 rounded min-w-[100px]">
                              ₹{totals.total.toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5" />
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Discount, Notes & Totals - Side by Side Layout */}
            <div className="grid grid-cols-2 gap-4 pl-10">
              {/* Left Side - Discount, Payment, Reference, Attachments & Notes */}
              <div className="space-y-2">
                {/* Discount Row */}
                <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Percent size={12} className="text-warning" />
                    Discount
                  </label>
                  <div className="flex items-center bg-background border border-border rounded-md w-fit">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={BillDiscount}
                      onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                      className="w-14 px-2 py-1.5 text-xs text-center bg-transparent outline-none"
                    />
                    <span className="px-2 text-xs text-muted-foreground border-l border-border">%</span>
                  </div>
                </div>

                {/* Payment Rows - Multiple payment types for split payment */}
                <div className="grid grid-cols-[80px_1fr] items-start gap-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 pt-1.5">
                    <CreditCard size={12} className="text-warning" />
                    Payment
                  </label>
                  <div className="space-y-2">
                    {payments.map((payment, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <div className="flex-1">
                          {index === 0 && <label className="text-[10px] text-muted-foreground mb-0.5 block">Payment Type</label>}
                          <select
                            value={payment.type}
                            onChange={(e) => {
                              const newPayments = [...payments]
                              newPayments[index].type = e.target.value
                              setPayments(newPayments)
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-warning/30 focus:border-warning"
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                            <option value="bank">Bank Account</option>
                            <option value="credit">Credit</option>
                            <option value="cheque">Cheque</option>
                          </select>
                        </div>
                        <div className="w-24">
                          {index === 0 && <label className="text-[10px] text-muted-foreground mb-0.5 block">Amount</label>}
                          <input
                            type="number"
                            value={payment.amount || ''}
                            onChange={(e) => {
                              const newPayments = [...payments]
                              newPayments[index].amount = parseFloat(e.target.value) || 0
                              setPayments(newPayments)
                            }}
                            placeholder="0"
                            className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-warning/30 focus:border-warning"
                          />
                        </div>
                        <div className="flex-1">
                          {index === 0 && <label className="text-[10px] text-muted-foreground mb-0.5 block">Reference No.</label>}
                          <input
                            type="text"
                            value={payment.reference}
                            onChange={(e) => {
                              const newPayments = [...payments]
                              newPayments[index].reference = e.target.value
                              setPayments(newPayments)
                            }}
                            placeholder="Cheque/Txn No."
                            className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-warning/30 focus:border-warning"
                          />
                        </div>
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPayments(payments.filter((_, i) => i !== index))}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setPayments([...payments, { type: 'cash', amount: 0, reference: '' }])}
                      className="text-xs text-warning hover:underline flex items-center gap-1 pt-1"
                    >
                      <Plus size={12} />
                      Add Payment type
                    </button>
                  </div>
                </div>

                {/* Attachments Row */}
                <div className="grid grid-cols-[80px_1fr] items-start gap-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 pt-1">
                    <UploadSimple size={12} className="text-warning" />
                    Attach
                  </label>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = URL.createObjectURL(file)
                            setAttachments([...attachments, { name: file.name, type: 'image', url }])
                          }
                          e.target.value = ''
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="px-2 py-1 text-xs bg-background border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-1"
                      >
                        <Camera size={12} />
                        Image
                      </button>
                      <input
                        type="file"
                        ref={documentInputRef}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = URL.createObjectURL(file)
                            setAttachments([...attachments, { name: file.name, type: 'document', url }])
                          }
                          e.target.value = ''
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => documentInputRef.current?.click()}
                        className="px-2 py-1 text-xs bg-background border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-1"
                      >
                        <FileText size={12} />
                        Document
                      </button>
                    </div>
                    {/* Show attached files */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded text-xs">
                            {att.type === 'image' ? <Camera size={10} /> : <FileText size={10} />}
                            <span className="max-w-[80px] truncate">{att.name}</span>
                            <button
                              type="button"
                              onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes Row */}
                <div className="grid grid-cols-[80px_1fr] items-start gap-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 pt-1.5">
                    <Pencil size={12} className="text-warning" />
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-warning/30 focus:border-warning resize-none"
                  />
                </div>
              </div>

              {/* Right Side - Totals Summary */}
              <div className="p-3 bg-background border border-border rounded-lg">
                {BillItems.length > 0 ? (
                  <div className="space-y-1.5 text-sm">
                    {/* Bill Type Badge */}
                    {SupplierGST && (
                      <div className="mb-2 pb-1.5 border-b border-border/50">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                          {(() => {
                            const companySettings = getCompanySettings()
                            const sellerState = companySettings.state || 'Tamil Nadu'
                            const isIntraState = isIntraStateTransaction(sellerState, SupplierState || sellerState)
                            return formatGSTDisplay(isIntraState, isB2BTransaction(SupplierGST))
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    {BillDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount ({BillDiscount}%):</span>
                        <span className="font-medium text-destructive">-₹{totals.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {totals.totalTax > 0 && (
                      <>
                        {totals.totalCGST > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">CGST:</span>
                            <span className="font-medium text-emerald-600">₹{totals.totalCGST.toFixed(2)}</span>
                          </div>
                        )}
                        {totals.totalSGST > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">SGST:</span>
                            <span className="font-medium text-emerald-600">₹{totals.totalSGST.toFixed(2)}</span>
                          </div>
                        )}
                        {totals.totalIGST > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">IGST:</span>
                            <span className="font-medium text-blue-600">₹{totals.totalIGST.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between pt-1.5 border-t border-border">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
                    </div>
                    {roundOff && totals.roundOffAmount !== 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Round Off:</span>
                        <span className="font-medium">{totals.roundOffAmount >= 0 ? '+' : ''}₹{totals.roundOffAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 mt-1 border-t-2 border-warning/30">
                      <span className="font-bold text-foreground">Total:</span>
                      <span className="font-bold text-lg text-warning">₹{totals.total.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {BillItems.length} item{BillItems.length !== 1 ? 's' : ''}
                    </div>
                    {/* Received and Balance */}
                    <div className="flex justify-between pt-1.5 mt-1 border-t border-border/50">
                      <span className="text-muted-foreground text-xs">Received:</span>
                      <span className="font-medium text-emerald-600">₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Balance:</span>
                      <span className={cn("font-semibold", (totals.total - payments.reduce((sum, p) => sum + p.amount, 0)) > 0 ? "text-destructive" : "text-emerald-600")}>
                        ₹{(totals.total - payments.reduce((sum, p) => sum + p.amount, 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Add items to see totals
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 border-t-2 border-border bg-muted/20 space-y-3">
            {/* Quick Action Buttons Row - Only show in POS mode */}
            {activeTab.mode === 'pos' && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleBackToList}
                  className="px-4 py-2.5 bg-muted hover:bg-muted/70 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <X size={16} weight="bold" />
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Hold bill functionality
                    toast.info('Bill held - Feature coming soon!')
                  }}
                  className="px-4 py-2.5 bg-warning/10 hover:bg-warning/20 text-warning rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 border border-warning/30"
                >
                  <Clock size={16} weight="bold" />
                  Hold
                </button>
                <button
                  onClick={() => {
                    setBillItems([])
                    toast.success('Cart cleared')
                  }}
                  className="px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 border border-destructive/30"
                >
                  <Trash size={16} weight="bold" />
                  Clear
                </button>
              </div>
            )}

            {/* Action Buttons - Generate Bill dropdown + Save */}
            <div className="flex items-center justify-end gap-3">
              {/* Generate Bill with dropdown */}
              <div className="relative">
                <div className="flex">
                  <button
                    type="button"
                    onClick={createBillOnly}
                    disabled={BillItems.length === 0}
                    className={cn(
                      "px-4 py-2 rounded-l-lg font-medium text-sm transition-all flex items-center gap-2 border border-r-0",
                      BillItems.length > 0
                        ? "bg-background border-border text-foreground hover:bg-muted"
                        : "bg-muted text-muted-foreground cursor-not-allowed border-border"
                    )}
                  >
                    Generate Bill
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const dropdown = e.currentTarget.nextElementSibling
                        dropdown?.classList.toggle('hidden')
                      }}
                      disabled={BillItems.length === 0}
                      className={cn(
                        "px-2 py-2 rounded-r-lg font-medium text-sm transition-all border",
                        BillItems.length > 0
                          ? "bg-background border-border text-foreground hover:bg-muted"
                          : "bg-muted text-muted-foreground cursor-not-allowed border-border"
                      )}
                    >
                      <CaretDown size={14} weight="bold" />
                    </button>
                    {/* Dropdown Menu */}
                    <div className="hidden absolute bottom-full right-0 mb-1 w-44 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                      <button
                        type="button"
                        onClick={() => {
                          createBillOnly()
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      >
                        Generate e-Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toast.info('E-Way Bill generation coming soon!')
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      >
                        Generate Eway Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toast.info('Share feature coming soon!')
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        Share <Share size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toast.info('Print feature coming soon!')
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        Print <Printer size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          createBillOnly()
                          // Reset form after saving
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      >
                        Save & New
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowBillPreview(true)}
                disabled={BillItems.length === 0}
                className={cn(
                  "px-8 py-2.5 rounded-lg font-semibold text-sm transition-all",
                  BillItems.length > 0
                    ? "bg-warning text-warning-foreground hover:bg-warning/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Save
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right Column - Bill Preview / POS Checkout - Show based on mode */}
        {((activeTab.mode === 'pos' && BillItems.length > 0) || showPreview) && (
        <div className={cn(
          "rounded-2xl border-2 overflow-hidden flex flex-col shadow-2xl",
          activeTab.mode === 'pos'
            ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700"
            : "bg-gradient-to-br from-white via-white to-gray-50/50 border-warning/20"
        )}>
          <div className={cn(
            "px-5 py-4 border-b-2",
            activeTab.mode === 'pos'
              ? "border-slate-700 bg-gradient-to-r from-slate-800/50 via-slate-800/30 to-slate-800/50"
              : "border-border bg-gradient-to-r from-warning/10 via-warning/5 to-warning/10"
          )}>
            <div className="flex items-center justify-between">
              <h3 className={cn(
                "font-bold text-base flex items-center gap-2 uppercase tracking-wide",
                activeTab.mode === 'pos' ? "text-white" : "text-foreground"
              )}>
                <Eye size={20} weight="duotone" className={cn(
                  activeTab.mode === 'pos' ? "text-emerald-400" : "text-warning"
                )} />
                {activeTab.mode === 'pos' ? 'CHECKOUT' : 'Print Preview'}
              </h3>
              {/* Format Selector - Different formats based on mode */}
              <div className={cn(
                "grid gap-1 bg-background rounded-lg p-1.5 border border-border",
                PurchasesMode === 'Bill' ? "grid-cols-2" : "grid-cols-3"
              )}>
                <button
                  onClick={() => setBillFormat('a4')}
                  className={cn(
                    "px-2 py-1.5 rounded text-[10px] font-semibold transition-all whitespace-nowrap",
                    BillFormat === 'a4'
                      ? "bg-warning text-warning-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="A4 Bill (Full GST)"
                >
                  <FileText size={12} weight="duotone" className="inline mr-0.5" />
                  A4
                </button>
                <button
                  onClick={() => setBillFormat('a5')}
                  className={cn(
                    "px-2 py-1.5 rounded text-[10px] font-semibold transition-all whitespace-nowrap",
                    BillFormat === 'a5'
                      ? "bg-warning text-warning-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="A5 Half Sheet"
                >
                  <FileText size={12} weight="duotone" className="inline mr-0.5" />
                  A5
                </button>
                {/* POS Mode - Show thermal and other formats */}
                {activeTab.mode === 'pos' && (
                  <>
                    <button
                      onClick={() => setBillFormat('pos58')}
                      className={cn(
                        "px-2 py-1.5 rounded text-[10px] font-semibold transition-all whitespace-nowrap",
                        BillFormat === 'pos58'
                          ? "bg-warning text-warning-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title="POS 58mm ShoppingCart"
                    >
                      <ShoppingCart size={12} weight="duotone" className="inline mr-0.5" />
                      58mm
                    </button>
                    <button
                      onClick={() => setBillFormat('pos80')}
                      className={cn(
                        "px-2 py-1.5 rounded text-[10px] font-semibold transition-all whitespace-nowrap",
                        BillFormat === 'pos80'
                          ? "bg-warning text-warning-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title="POS 80mm ShoppingCart"
                    >
                      <ShoppingCart size={12} weight="duotone" className="inline mr-0.5" />
                      80mm
                    </button>
                    <button
                      onClick={() => setBillFormat('kot')}
                      className={cn(
                        "px-2 py-1.5 rounded text-[10px] font-semibold transition-all whitespace-nowrap",
                        BillFormat === 'kot'
                          ? "bg-warning text-warning-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title="Kitchen Order Ticket"
                    >
                      <CookingPot size={12} weight="duotone" className="inline mr-0.5" />
                      KOT
                    </button>
                    <button
                      onClick={() => setBillFormat('barcode')}
                      className={cn(
                        "px-2 py-1.5 rounded text-[10px] font-semibold transition-all whitespace-nowrap",
                        BillFormat === 'barcode'
                          ? "bg-warning text-warning-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      title="Barcode Label"
                    >
                      <Barcode size={12} weight="duotone" className="inline mr-0.5" />
                      Label
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Bill Preview Content */}
            <div
              className={cn(
                "bg-white text-black",
                BillFormat === 'pos58' && "max-w-[58mm] mx-auto",
                BillFormat === 'pos80' && "max-w-[80mm] mx-auto",
                BillFormat === 'kot' && "max-w-[80mm] mx-auto",
                BillFormat === 'a5' && "max-w-[148mm] mx-auto",
                BillFormat === 'barcode' && "max-w-[100mm] mx-auto",
                BillFormat === 'sticker' && "max-w-[80mm] mx-auto",
                BillFormat === 'a4' && "w-full"
              )}
              style={{
                fontFamily: ['pos58', 'pos80', 'kot'].includes(BillFormat) ? 'monospace' : 'Arial, sans-serif'
              }}
            >
              {/* Business Header - Hide for Barcode/Sticker */}
              {!['barcode', 'sticker'].includes(BillFormat) && (
                <div className={cn(
                  "border-b-2 border-black mb-3",
                  ['pos58', 'pos80'].includes(BillFormat) ? "pb-2" : "pb-3"
                )}>
                  <h1 className={cn(
                    "font-bold text-center mb-2 uppercase tracking-wide",
                    BillFormat === 'pos58' && "text-xs",
                    BillFormat === 'pos80' && "text-sm",
                    BillFormat === 'kot' && "text-lg",
                    BillFormat === 'a5' && "text-base",
                    BillFormat === 'a4' && "text-xl"
                  )}>YOUR BUSINESS NAME</h1>
                  <p className={cn(
                    "text-center leading-relaxed text-gray-700",
                    BillFormat === 'pos58' && "text-[9px]",
                    BillFormat === 'pos80' && "text-[10px]",
                    BillFormat === 'kot' && "text-xs",
                    BillFormat === 'a5' && "text-xs",
                    BillFormat === 'a4' && "text-sm"
                  )}>
                    {['pos58', 'pos80', 'kot'].includes(BillFormat) ? (
                      <>
                        Address Line 1, Line 2<br />
                        Ph: +91 XXXXX XXXXX<br />
                        GST: XXXXXXXXXXXX
                      </>
                    ) : (
                      <>
                        Address Line 1, Address Line 2<br />
                        Phone: +91 XXXXX XXXXX | business@email.com<br />
                        GSTIN: XXXXXXXXXXXX
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Bill Info - Hide for KOT/Barcode/Sticker */}
              {!['kot', 'barcode', 'sticker'].includes(BillFormat) && (
                <div className="flex justify-between mb-3">
                  <div>
                    <h2 className={cn(
                      "font-bold mb-1",
                      BillFormat === 'a5' ? "text-xs" : "text-sm"
                    )}>TAX Bill</h2>
                    <p className={cn(
                      BillFormat === 'a5' ? "text-[10px]" : "text-xs"
                    )}>
                      <span className="font-semibold">Bill #:</span> {activeTab.type === 'Purchase' ? 'INV' : 'EST'}-{new Date().getFullYear()}-XXXX<br />
                      <span className="font-semibold">Date:</span> {new Date().toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "inline-block px-3 py-1 rounded bg-gray-200 font-bold",
                      BillFormat === 'a5' ? "text-[10px]" : "text-xs"
                    )}>
                      {activeTab.type === 'Purchase' ? 'Purchase' : 'CREDIT'}
                    </span>
                  </div>
                </div>
              )}

              {/* Supplier Details - Hide for Barcode/Sticker */}
              {!['barcode', 'sticker'].includes(BillFormat) && (
                <div className={cn(
                  "mb-3 p-2 border border-gray-400 rounded",
                  BillFormat === 'kot' && "bg-yellow-50"
                )}>
                  <h3 className={cn(
                    "font-bold mb-1",
                    ['pos58', 'pos80', 'a5', 'kot'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                  )}>
                    {BillFormat === 'kot' ? 'Table/Order:' : 'Bill To:'}
                  </h3>
                  {activeTab.SupplierName ? (
                    <>
                      <p className={cn(
                        ['pos58', 'pos80', 'a5', 'kot'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                      )}>
                        <span className="font-bold">{activeTab.SupplierName}</span><br />
                        {!BillFormat.includes('kot') && activeTab.SupplierPhone && <span>Phone: {activeTab.SupplierPhone}<br /></span>}
                        {!BillFormat.includes('kot') && activeTab.SupplierGST && <span>GSTIN: {activeTab.SupplierGST}</span>}
                      </p>
                    </>
                  ) : (
                    <p className={cn(
                      "text-gray-500 italic",
                      ['pos58', 'pos80', 'a5', 'kot'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                    )}>
                      {BillFormat === 'kot' ? 'No table/order #' : 'No Supplier selected'}
                    </p>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div className="mb-3">
                {(BillFormat === 'pos58' || BillFormat === 'pos80') ? (
                  // POS Format (58mm/80mm) - Simple List
                  <div className="border-t-2 border-b-2 border-black py-2">
                    <div className={cn(
                      "font-bold mb-2 border-b border-dashed border-black pb-1",
                      BillFormat === 'pos58' ? "text-[9px]" : "text-[10px]"
                    )}>
                      <div className="flex justify-between">
                        <span>ITEM</span>
                        <span>QTY x RATE</span>
                        <span>AMOUNT</span>
                      </div>
                    </div>
                    {activeTab.BillItems.length === 0 ? (
                      <div className={cn(
                        "text-center py-4 text-gray-500 italic",
                        BillFormat === 'pos58' ? "text-[9px]" : "text-[10px]"
                      )}>
                        No items
                      </div>
                    ) : (
                      activeTab.BillItems.map((item, index) => (
                        <div key={item.id} className={cn(
                          "mb-2 border-b border-dashed border-gray-300 pb-2",
                          BillFormat === 'pos58' ? "text-[9px]" : "text-[10px]"
                        )}>
                          <div className="flex justify-between font-bold">
                            <span className="flex-1">{item.name}</span>
                            <span className="text-right">₹{item.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600 mt-0.5">
                            <span>{item.qty} {item.unit} × ₹{item.price.toFixed(2)}</span>
                            {item.tax > 0 && <span>Tax: {item.tax}%</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : BillFormat === 'kot' ? (
                  // KOT Format - Kitchen Order Ticket (No Prices)
                  <div className="border-2 border-black p-2">
                    <div className="text-center text-base font-bold mb-2 border-b-2 border-black pb-2">
                      KITCHEN ORDER
                    </div>
                    {activeTab.BillItems.length === 0 ? (
                      <div className="text-center py-4 text-xs text-gray-500 italic">
                        No items
                      </div>
                    ) : (
                      activeTab.BillItems.map((item, index) => (
                        <div key={item.id} className="mb-3 text-xs border-b border-dashed border-gray-400 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-bold text-sm">{item.name}</div>
                              {item.description && <div className="text-gray-600 text-[10px] mt-0.5">{item.description}</div>}
                            </div>
                            <div className="text-right ml-3">
                              <div className="font-bold text-base">×{item.qty}</div>
                              <div className="text-[10px] text-gray-600">{item.unit}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="mt-3 text-center text-xs text-gray-600 border-t border-dashed border-gray-400 pt-2">
                      Total Items: {activeTab.BillItems.length}
                    </div>
                  </div>
                ) : BillFormat === 'barcode' ? (
                  // Barcode Label Format
                  <div className="space-y-2">
                    {activeTab.BillItems.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-500 italic border border-gray-300 rounded">
                        No items to print labels
                      </div>
                    ) : (
                      activeTab.BillItems.map((item, index) => (
                        <div key={item.id} className="border-2 border-black p-2 bg-white">
                          <div className="text-center">
                            <div className="font-bold text-xs mb-1">{item.name}</div>
                            <div className="text-[10px] text-gray-600 mb-2">
                              {item.hsnCode || 'N/A'} | {item.unit}
                            </div>
                            {/* Barcode placeholder */}
                            <div className="bg-black h-12 flex items-center justify-center mb-1">
                              <Barcode size={32} weight="fill" className="text-white" />
                            </div>
                            <div className="text-[8px] font-mono text-gray-600">
                              {item.id.toUpperCase().substring(0, 12)}
                            </div>
                            <div className="font-bold text-sm mt-2">
                              ₹{item.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : BillFormat === 'sticker' ? (
                  // Product Sticker Format
                  <div className="grid grid-cols-2 gap-2">
                    {activeTab.BillItems.length === 0 ? (
                      <div className="col-span-2 text-center py-6 text-xs text-gray-500 italic border border-gray-300 rounded">
                        No items to print stickers
                      </div>
                    ) : (
                      activeTab.BillItems.map((item, index) => (
                        <div key={item.id} className="border border-gray-400 p-2 rounded bg-white">
                          <div className="text-center">
                            <div className="font-bold text-[10px] mb-1 line-clamp-2">{item.name}</div>
                            <div className="text-[8px] text-gray-600 mb-1">
                              {item.hsnCode || 'N/A'}
                            </div>
                            <div className="font-bold text-lg text-warning">
                              ₹{item.price.toFixed(2)}
                            </div>
                            <div className="text-[8px] text-gray-500 mt-1">
                              {item.unit}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : BillFormat === 'a5' ? (
                  // A5 Format - Compact Table
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-gray-200 border border-gray-400">
                        <th className="text-left px-1 py-1 border-r border-gray-400" style={{ width: '8%' }}>#</th>
                        <th className="text-left px-1 py-1 border-r border-gray-400" style={{ width: '40%' }}>Item</th>
                        <th className="text-right px-1 py-1 border-r border-gray-400" style={{ width: '15%' }}>Qty</th>
                        <th className="text-right px-1 py-1 border-r border-gray-400" style={{ width: '17%' }}>Rate</th>
                        <th className="text-right px-1 py-1" style={{ width: '20%' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab.BillItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center p-4 text-gray-500 italic border border-gray-400">
                            No items added yet
                          </td>
                        </tr>
                      ) : (
                        activeTab.BillItems.map((item, index) => (
                          <tr key={item.id} className="border-b border-gray-400">
                            <td className="px-1 py-1 border-r border-gray-400 text-center">{index + 1}</td>
                            <td className="px-1 py-1 border-r border-gray-400">
                              <div className="font-bold text-[10px]">{item.name}</div>
                              {item.tax > 0 && <div className="text-[8px] text-gray-600">Tax: {item.tax}%</div>}
                            </td>
                            <td className="text-right px-1 py-1 border-r border-gray-400">{item.qty} {item.unit}</td>
                            <td className="text-right px-1 py-1 border-r border-gray-400">₹{item.price.toFixed(2)}</td>
                            <td className="text-right px-1 py-1 font-bold">₹{item.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  // A4 Format - Full Table
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-200 border border-gray-400">
                        <th className="text-left px-2 py-2 border-r border-gray-400" style={{ width: '8%' }}>#</th>
                        <th className="text-left px-2 py-2 border-r border-gray-400" style={{ width: visibleColumns.hsnCode || visibleColumns.description ? '25%' : '35%' }}>Item</th>
                        {visibleColumns.hsnCode && (
                          <th className="text-left px-2 py-2 border-r border-gray-400" style={{ width: '12%' }}>HSN</th>
                        )}
                        {visibleColumns.description && (
                          <th className="text-left px-2 py-2 border-r border-gray-400" style={{ width: '20%' }}>Description</th>
                        )}
                        <th className="text-right px-2 py-2 border-r border-gray-400" style={{ width: '12%' }}>Qty</th>
                        <th className="text-right px-2 py-2 border-r border-gray-400" style={{ width: '15%' }}>Rate</th>
                        {visibleColumns.discount && (
                          <th className="text-right px-2 py-2 border-r border-gray-400" style={{ width: '10%' }}>Disc%</th>
                        )}
                        {visibleColumns.tax && (
                          <th className="text-right px-2 py-2 border-r border-gray-400" style={{ width: '10%' }}>Tax%</th>
                        )}
                        <th className="text-right px-2 py-2" style={{ width: '15%' }}>Amount</th>
                      </tr>
                    </thead>
                  <tbody>
                    {activeTab.BillItems.length === 0 ? (
                      <tr>
                        <td colSpan={5 + (visibleColumns.hsnCode ? 1 : 0) + (visibleColumns.description ? 1 : 0) + (visibleColumns.discount ? 1 : 0) + (visibleColumns.tax ? 1 : 0)} className="text-center p-6 text-gray-500 italic border border-gray-400 text-xs">
                          No items added yet
                        </td>
                      </tr>
                    ) : (
                      activeTab.BillItems.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-400">
                          <td className="px-2 py-2 border-r border-gray-400 text-center">{index + 1}</td>
                          <td className="px-2 py-2 border-r border-gray-400">
                            <div className="font-bold">{item.name}</div>
                          </td>
                          {visibleColumns.hsnCode && (
                            <td className="px-2 py-2 border-r border-gray-400 text-xs text-gray-600">
                              {item.hsnCode || '-'}
                            </td>
                          )}
                          {visibleColumns.description && (
                            <td className="px-2 py-2 border-r border-gray-400 text-xs text-gray-600">
                              {item.description || '-'}
                            </td>
                          )}
                          <td className="text-right px-2 py-2 border-r border-gray-400">{item.qty} {item.unit}</td>
                          <td className="text-right px-2 py-2 border-r border-gray-400">₹{item.price.toFixed(2)}</td>
                          {visibleColumns.discount && (
                            <td className="text-right px-2 py-2 border-r border-gray-400">{item.discount}%</td>
                          )}
                          {visibleColumns.tax && (
                            <td className="text-right px-2 py-2 border-r border-gray-400">{item.tax}%</td>
                          )}
                          <td className="text-right px-2 py-2 font-bold">₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                )}
              </div>

              {/* Totals Section - Hide for KOT/Barcode/Sticker */}
              {activeTab.BillItems.length > 0 && !['kot', 'barcode', 'sticker'].includes(BillFormat) && (
                <>
                  <div className="border-t-2 border-gray-400 pt-3 mt-3">
                    <div className={cn(
                      "flex justify-between mb-2",
                      ['pos58', 'pos80', 'a5'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                    )}>
                      <span>Subtotal:</span>
                      <span className="font-semibold">
                        ₹{activeTab.BillItems.reduce((sum, item) => sum + (item.price * item.qty - item.discountAmount), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className={cn(
                      "flex justify-between mb-2",
                      ['pos58', 'pos80', 'a5'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                    )}>
                      <span>Tax:</span>
                      <span className="font-semibold">
                        ₹{activeTab.BillItems.reduce((sum, item) => sum + item.taxAmount, 0).toFixed(2)}
                      </span>
                    </div>
                    {activeTab.BillDiscount > 0 && (
                      <div className={cn(
                        "flex justify-between mb-2",
                        ['pos58', 'pos80', 'a5'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                      )}>
                        <span>Discount:</span>
                        <span className="font-semibold text-red-600">
                          -₹{activeTab.BillDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className={cn(
                      "flex justify-between py-2 px-3 bg-gray-200 border-2 border-gray-400 font-bold mt-2",
                      ['pos58', 'pos80'].includes(BillFormat) ? "text-xs" : "text-sm"
                    )}>
                      <span>GRAND TOTAL:</span>
                      <span>
                        ₹{(activeTab.BillItems.reduce((sum, item) => sum + item.total, 0) - activeTab.BillDiscount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="mt-3 py-2 px-3 border border-gray-400 rounded bg-gray-50">
                    <div className={cn(
                      "flex items-center justify-between",
                      ['pos58', 'pos80', 'a5'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                    )}>
                      <span className="font-bold">Payment Mode:</span>
                      <span className="uppercase font-bold">
                        {activeTab.paymentMode}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Notes - Hide for Barcode/Sticker */}
              {activeTab.notes && !['barcode', 'sticker'].includes(BillFormat) && (
                <div className={cn(
                  "mt-3 p-3 border border-gray-400 rounded bg-yellow-50",
                  BillFormat === 'kot' && "border-2 border-yellow-400"
                )}>
                  <h3 className={cn(
                    "font-bold mb-1",
                    ['pos58', 'pos80', 'a5', 'kot'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                  )}>
                    {BillFormat === 'kot' ? 'Special Instructions:' : 'Notes:'}
                  </h3>
                  <p className={cn(
                    "text-gray-700",
                    ['pos58', 'pos80', 'a5', 'kot'].includes(BillFormat) ? "text-[10px]" : "text-xs"
                  )}>{activeTab.notes}</p>
                </div>
              )}

              {/* Footer - Hide for Barcode/Sticker */}
              {!['barcode', 'sticker'].includes(BillFormat) && (
                <div className={cn(
                  "border-t-2 border-black pt-3 mt-4",
                  BillFormat === 'kot' && "hidden"
                )}>
                  <p className={cn(
                    "text-center text-gray-600 leading-relaxed",
                    ['pos58', 'pos80'].includes(BillFormat) ? "text-[9px]" : "text-[10px]"
                  )}>
                    Thank you for your business!<br />
                    This is a computer-generated Bill
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        </>
      )}

      {/* Create Bill Modal - Hidden when using inline create view */}
      <AnimatePresence>
        {showCreateModal && viewMode !== 'create' && (
          <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full h-full max-w-[98vw] max-h-[98vh] bg-card text-card-foreground rounded-lg shadow-2xl overflow-hidden flex flex-col"
              >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkle size={20} weight="duotone" className="text-warning" />
                  Create New Bill
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Supplier Search Dropdown */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Supplier Details</label>
                  <div className="relative" ref={SupplierDropdownRef}>
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                    <input
                      type="text"
                      placeholder="Search Supplier by name, phone, or email..."
                      value={SupplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value)
                        setShowSupplierDropdown(true)
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      className="w-full pl-10 pr-3 py-2.5 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-warning/20 transition-all"
                    />

                    {/* Supplier Dropdown */}
                    {showSupplierDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
                      >
                        {/* Add New Supplier */}
                        <button
                          type="button"
                          onClick={() => {
                            console.log('🔴🔴🔴 ADD Supplier BUTTON CLICKED 🔴🔴🔴')
                            setShowSupplierDropdown(false)
                            setShowAddSupplierModal(true)
                            console.log('🟢🟢🟢 showAddSupplierModal set to TRUE 🟢🟢🟢')
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-warning/10 border-b border-border flex items-center gap-2 text-warning font-medium"
                        >
                          <Plus size={16} weight="bold" />
                          Add New Supplier
                        </button>

                        {/* Loading State */}
                        {loadingParties ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            Loading Suppliers...
                          </div>
                        ) : filteredSuppliers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            {SupplierSearch ? 'No Suppliers found' : 'Start typing to search...'}
                          </div>
                        ) : (
                          filteredSuppliers.map((party) => (
                            <button
                              key={party.id}
                              type="button"
                              onClick={() => handleSupplierSelect(party)}
                              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
                            >
                              <div className="font-medium text-sm">{party.displayName || party.companyName || party.name || party.SupplierName || party.partyName || party.fullName || party.businessName || 'Unknown Supplier'}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                                {party.phone && <span className="flex items-center gap-1"><Phone size={12} />{party.phone}</span>}
                                {party.email && <span className="flex items-center gap-1"><Envelope size={12} />{party.email}</span>}
                              </div>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Selected Supplier Details */}
                  {SupplierName && (
                    <div className="mt-3 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{SupplierName}</span></div>
                        {SupplierPhone && <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{SupplierPhone}</span></div>}
                        {SupplierEmail && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{SupplierEmail}</span></div>}
                        {SupplierGST && <div><span className="text-muted-foreground">GST:</span> <span className="font-medium">{SupplierGST}</span></div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierName('')
                          setSupplierPhone('')
                          setSupplierEmail('')
                          setSupplierGST('')
                          setSupplierSearch('')
                        }}
                        className="mt-2 text-xs text-warning hover:underline"
                      >
                        Clear & choose different Supplier
                      </button>
                    </div>
                  )}

                  {/* Items List - Table Layout */}
                  <div className="mt-4">
                    <div className="overflow-x-auto border border-border rounded-lg bg-muted/10">
                      <table className="min-w-full text-xs">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 text-center w-10">#</th>
                            <th className="px-3 py-2 text-left">Item</th>
                            <th className="px-3 py-2 text-right w-16">Qty</th>
                            <th className="px-3 py-2 text-left w-24">Unit</th>
                            <th className="px-3 py-2 text-right w-28">Price/Unit</th>
                            <th className="px-3 py-2 text-right w-24">Disc %</th>
                            <th className="px-3 py-2 text-right w-28">Disc Amt</th>
                            <th className="px-3 py-2 text-right w-24">Tax %</th>
                            <th className="px-3 py-2 text-right w-28">Tax Amt</th>
                            <th className="px-3 py-2 text-right w-32">Amount</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {BillItems.length === 0 ? (
                            <tr>
                              <td
                                colSpan={11}
                                className="px-3 py-4 text-center text-[11px] text-muted-foreground"
                              >
                                No items added yet. Use search above or add a blank row.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {BillItems.map((item, index) => (
                                <tr
                                  key={item.id}
                                  className="border-t border-border/60 bg-background/40"
                                >
                                  <td className="px-3 py-2 text-center align-middle">
                                    {index + 1}
                                  </td>
                                  <td className="px-3 py-2 align-middle">
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
                                      placeholder="Item name"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.qty}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          'qty',
                                          parseFloat(e.target.value) || 1
                                        )
                                      }
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-right"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle">
                                    <select
                                      value={item.unit || 'NONE'}
                                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
                                    >
                                      <option value="NONE">NONE</option>
                                      <option value="PCS">PCS</option>
                                      <option value="KGS">KGS</option>
                                      <option value="LTRS">LTRS</option>
                                      <option value="MTR">MTR</option>
                                      <option value="BOX">BOX</option>
                                      <option value="PACK">PACK</option>
                                      <option value="SET">SET</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    <input
                                      type="number"
                                      value={item.price}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          'price',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-right"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={item.discount}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          'discount',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-right"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    �'�{(item.discountAmount || 0).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    <input
                                      type="number"
                                      value={item.tax}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          'tax',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-right"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    �'�{(item.taxAmount || 0).toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    <div className="px-2 py-1 bg-success/10 border border-success/20 rounded text-xs font-semibold text-success inline-block min-w-[80px] text-right">
                                      �'�{item.total.toFixed(2)}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center align-middle">
                                    <button
                                      type="button"
                                      onClick={() => removeItem(item.id)}
                                      className="p-1 hover:bg-destructive/10 text-destructive rounded"
                                    >
                                      <Trash size={14} weight="duotone" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t border-border/70 bg-muted/30">
                                <td className="px-3 py-2 text-right text-[11px] font-semibold" colSpan={2}>
                                  TOTAL
                                </td>
                                <td className="px-3 py-2 text-right text-[11px] font-semibold">
                                  {BillItems.reduce(
                                    (sum, i) => sum + (Number(i.qty) || 0),
                                    0
                                  )}
                                </td>
                                <td className="px-3 py-2" colSpan={6}></td>
                                <td className="px-3 py-2 text-right text-[11px] font-semibold">
                                  �'�
                                  {BillItems
                                    .reduce((sum, i) => sum + (Number(i.total) || 0), 0)
                                    .toFixed(2)}
                                </td>
                                <td className="px-3 py-2" />
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const price = 0
                          const qty = 1
                          const discountPercent = 0
                          const taxPercent = 0

                          const discountedPricePerUnit = price - (price * discountPercent / 100)
                          const lineBase = price * qty
                          const discountAmount = lineBase - (discountedPricePerUnit * qty)
                          const taxableAmount = discountedPricePerUnit * qty
                          const taxAmount = taxableAmount * taxPercent / 100
                          const total = taxableAmount + taxAmount

                          addItem({
                            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            name: '',
                            qty,
                            unit: 'NONE',
                            price,
                            discount: discountPercent,
                            discountAmount,
                            tax: taxPercent,
                            taxAmount,
                            total
                          })
                        }}
                        className="px-3 py-1.5 text-xs border border-dashed border-warning text-warning rounded hover:bg-warning/5"
                      >
                        Add Row
                      </button>
                    </div>
                  </div>
                </div>

                {/* Item Search Dropdown */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Add Items</label>
                  <div className="relative" ref={itemDropdownRef}>
                    <Package size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                    <input
                      type="text"
                      placeholder="Search items by name or barcode..."
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value)
                        setShowItemDropdown(true)
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      className="w-full pl-10 pr-3 py-2.5 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-warning/20 transition-all"
                    />

                    {/* Item Dropdown */}
                    {showItemDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
                      >
                        {/* Add New Item */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowItemDropdown(false)
                            setShowAddItemModal(true)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-warning/10 border-b border-border flex items-center gap-2 text-warning font-medium"
                        >
                          <Plus size={16} weight="bold" />
                          Add New Item
                        </button>

                        {/* Loading State */}
                        {loadingItems ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            Loading items...
                          </div>
                        ) : filteredItems.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            {itemSearch ? 'No items found' : 'Start typing to search...'}
                          </div>
                        ) : (
                          filteredItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleItemSelect(item)}
                              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{item.name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {item.barcode && <span>Barcode: {item.barcode}</span>}
                                    {item.stock !== undefined && <span className="ml-2">Stock: {item.stock}</span>}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-warning">
                                  ₹{item.sellingPrice || item.purchasePrice || 0}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Items List */}
                  {false && BillItems.length > 0 && (
                    <div className="space-y-2">
                      {BillItems.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-muted/30 border border-border rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{item.name}</span>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 hover:bg-destructive/10 text-destructive rounded"
                            >
                              <Trash size={16} weight="duotone" />
                            </button>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 1)}
                                className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Price</label>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Disc %</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Tax %</label>
                              <input
                                type="number"
                                value={item.tax}
                                onChange={(e) => updateItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Total</label>
                              <div className="px-2 py-1 bg-success/10 border border-success/20 rounded text-sm font-semibold text-success">
                                ₹{item.total.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bill Discount & Payment Mode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Discount %</label>
                    <div className="relative">
                      <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={BillDiscount}
                        onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-warning/20 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-warning/20 text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Add any additional notes..."
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-warning/20 resize-none"
                  />
                </div>

                {/* Totals Summary */}
                {BillItems.length > 0 && (
                  <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                      </div>
                      {BillDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount ({BillDiscount}%):</span>
                          <span className="font-medium text-destructive">-₹{totals.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Tax:</span>
                        <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
                      </div>
                      {roundOff && totals.roundOffAmount !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Round Off:</span>
                          <span className="font-medium">{totals.roundOffAmount >= 0 ? '+' : ''}₹{totals.roundOffAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="h-px bg-border my-2"></div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Grand Total:</span>
                        <span className="text-xl font-bold text-warning">₹{totals.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-border">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/70 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={createBill}
                  className="px-4 py-2 bg-warning text-warning-foreground rounded-lg font-medium hover:bg-warning/90 transition-colors flex items-center gap-2"
                >
                  Create Bill
                  <ArrowRight size={18} weight="bold" />
                </motion.button>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* View Bill Modal */}
      <AnimatePresence>
        {showViewModal && selectedBill && (
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
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Bill Details</h2>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <Printer size={20} weight="duotone" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <Share size={20} weight="duotone" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <Download size={20} weight="duotone" />
                    </button>
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X size={20} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bill Number</p>
                    <p className="font-semibold">{selectedBill.BillNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{selectedBill.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Supplier</p>
                    <p className="font-semibold">{selectedBill.partyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Mode</p>
                    <p className="font-semibold capitalize">{selectedBill.paymentMode}</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">₹{selectedBill.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedBill.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount ({selectedBill.discount}%):</span>
                      <span className="font-medium text-destructive">-₹{(selectedBill.subtotal * selectedBill.discount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">₹{selectedBill.tax.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold text-warning">₹{selectedBill.total.toLocaleString()}</span>
                  </div>
                  {selectedBill.paidAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium text-success">₹{selectedBill.paidAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Balance:</span>
                        <span className="text-lg font-bold text-warning">₹{(selectedBill.total - selectedBill.paidAmount).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Recording Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedBillForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-card text-card-foreground rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
                  <p className="text-sm text-slate-600">Bill: {selectedBillForPayment.BillNumber}</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Bill Summary */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Supplier:</span>
                    <span className="font-semibold">{selectedBillForPayment.partyName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Bill Total:</span>
                    <span className="font-semibold">₹{selectedBillForPayment.total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Paid Amount:</span>
                    <span className="font-semibold text-success">₹{(selectedBillForPayment.paidAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold">Balance Due:</span>
                    <span className="text-lg font-bold text-destructive">
                      ₹{(selectedBillForPayment.total - (selectedBillForPayment.paidAmount || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-warning focus:border-warning"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Method *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cash', 'upi', 'card', 'bank', 'cheque'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethodSelected(method)}
                        className={cn(
                          "px-4 py-2.5 rounded-lg border-2 transition-all capitalize flex items-center justify-center gap-2",
                          paymentMethodSelected === method
                            ? "border-warning bg-warning/5 text-warning font-semibold"
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        )}
                      >
                        {method === 'cash' && <Money size={16} weight="duotone" />}
                        {method === 'bank' && <Bank size={16} weight="duotone" />}
                        {method === 'upi' && <CurrencyCircleDollar size={16} weight="duotone" />}
                        {method === 'card' && <CreditCard size={16} weight="duotone" />}
                        {method === 'cheque' && <FileText size={16} weight="duotone" />}
                        <span className="text-xs">{method}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-warning focus:border-warning"
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, Cheque No, etc."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-warning focus:border-warning"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Add any additional notes..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-warning focus:border-warning resize-none"
                  />
                </div>

                {/* Previous Payments */}
                {BillPayments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Previous Payments</h3>
                    <div className="space-y-2">
                      {BillPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between text-xs bg-slate-50 rounded p-2">
                          <div>
                            <span className="font-medium">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</span>
                            <span className="text-slate-500 ml-2 capitalize">({payment.paymentMode})</span>
                          </div>
                          <span className="font-semibold text-success">₹{payment.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky mobile-sticky-offset bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="flex-1 px-4 py-2.5 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Money size={18} weight="bold" />
                  Record Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && BillToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelDelete}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-card text-card-foreground rounded-xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash size={24} weight="duotone" className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Purchases Bill?</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Are you sure you want to delete Bill <strong>{BillToDelete.BillNumber}</strong> for <strong>{BillToDelete.partyName}</strong>?
                    This action cannot be undone and will permanently remove this Bill from your records.
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <XCircle size={16} className="text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      <strong>Warning:</strong> Deleting this Bill will affect your Purchases records and may impact your accounting reports. Make sure this is what you want to do.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash size={16} weight="bold" />
                  Delete Bill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Supplier Modal - Matching Parties page design */}
      <AnimatePresence>
        {showAddSupplierModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddSupplierModal(false)
                resetSupplierForm()
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto bg-card sm:rounded-lg shadow-2xl z-[60] p-4 sm:p-6"
            >
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Add New Supplier</h2>

                {/* Mandatory Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Supplier Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      placeholder="Enter Supplier name"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Optional Fields - Expandable */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Optional Information</p>

                  {/* Billing Address */}
                  <div>
                    {!showAddressField ? (
                      <button
                        onClick={() => setShowAddressField(true)}
                        className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        Billing Address
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">Billing Address</label>
                        <textarea
                          rows={2}
                          value={newSupplierAddress}
                          onChange={(e) => setNewSupplierAddress(e.target.value)}
                          placeholder="Enter billing address"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all resize-none"
                        ></textarea>
                      </motion.div>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    {!showStateField ? (
                      <button
                        onClick={() => setShowStateField(true)}
                        className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        State
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">State</label>
                        <select
                          value={newSupplierState}
                          onChange={(e) => setNewSupplierState(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </div>

                  {/* GST Number */}
                  <div>
                    {!showGstField ? (
                      <button
                        onClick={() => setShowGstField(true)}
                        className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        GST Number
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                        <input
                          type="text"
                          value={newSupplierGST}
                          onChange={(e) => setNewSupplierGST(e.target.value)}
                          placeholder="Enter GST number"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    {!showEmailField ? (
                      <button
                        onClick={() => setShowEmailField(true)}
                        className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        Email Address
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                        <input
                          type="email"
                          value={newSupplierEmail}
                          onChange={(e) => setNewSupplierEmail(e.target.value)}
                          placeholder="Enter email address"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Supplier Type */}
                  <div>
                    {!showSupplierTypeField ? (
                      <button
                        onClick={() => setShowSupplierTypeField(true)}
                        className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        Supplier Type
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">Supplier Type</label>
                        <select
                          value={newSupplierType}
                          onChange={(e) => setNewSupplierType(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all"
                        >
                          <option>Regular</option>
                          <option>WholePurchase</option>
                          <option>Retail</option>
                          <option>Distributor</option>
                        </select>
                      </motion.div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    {!showNotesField ? (
                      <button
                        onClick={() => setShowNotesField(true)}
                        className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        Notes
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">Notes</label>
                        <textarea
                          rows={2}
                          value={newSupplierNotes}
                          onChange={(e) => setNewSupplierNotes(e.target.value)}
                          placeholder="Add any additional notes"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all resize-none"
                        ></textarea>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      setShowAddSupplierModal(false)
                      resetSupplierForm()
                    }}
                    className="flex-1 px-4 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewSupplier}
                    disabled={savingSupplier || !newSupplierName.trim()}
                    className="flex-1 px-4 py-2.5 bg-warning text-warning-foreground rounded-lg font-medium hover:bg-warning/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {savingSupplier ? (
                      <>
                        <div className="w-4 h-4 border-2 border-warning-foreground border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Add Supplier'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Item Modal - Matching Inventory page design */}
      <AnimatePresence>
        {showAddItemModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddItemModal(false)
                resetNewItemForm()
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />
            <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card text-card-foreground sm:rounded-xl shadow-2xl border border-border w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-border bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <Package size={24} weight="duotone" className="text-warning" />
                      Add New Item
                    </h2>
                    <button
                      onClick={() => {
                        setShowAddItemModal(false)
                        resetNewItemForm()
                      }}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X size={20} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <div className="space-y-5">
                    {/* Section 1: Basic Info */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
                        <Cube size={16} weight="duotone" />
                        Basic Information
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Item Name */}
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium mb-1.5 block">
                            Item Name <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Enter item name (e.g., Ball Pen, Office Chair)"
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning focus:border-transparent outline-none transition-all"
                            autoFocus
                          />
                        </div>

                        {/* Unit Type */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">
                            Unit Type <span className="text-destructive">*</span>
                          </label>
                          <select
                            value={newItemUnit}
                            onChange={(e) => setNewItemUnit(e.target.value)}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                          >
                            <option value="pcs">Pieces (pcs)</option>
                            <option value="kg">Kilogram (kg)</option>
                            <option value="g">Gram (g)</option>
                            <option value="l">Liter (L)</option>
                            <option value="ml">Milliliter (ml)</option>
                            <option value="m">Meter (m)</option>
                            <option value="box">Box</option>
                            <option value="dozen">Dozen</option>
                            <option value="pack">Pack</option>
                          </select>
                        </div>

                        {/* Category */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Category</label>
                          <select
                            value={newItemCategory}
                            onChange={(e) => setNewItemCategory(e.target.value)}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                          >
                            <option value="stationery">Stationery</option>
                            <option value="electronics">Electronics</option>
                            <option value="furniture">Furniture</option>
                            <option value="hardware">Hardware</option>
                            <option value="grocery">Grocery/Provisions</option>
                            <option value="clothing">Clothing/Apparel</option>
                            <option value="home">Home & Kitchen</option>
                            <option value="cosmetics">Cosmetics/Beauty</option>
                            <option value="toys">Toys & Games</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        {/* Description */}
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium mb-1.5 block">Description</label>
                          <textarea
                            value={newItemDescription}
                            onChange={(e) => setNewItemDescription(e.target.value)}
                            rows={2}
                            placeholder="Brief description of the item..."
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Pricing */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
                        <CurrencyInr size={16} weight="duotone" />
                        Pricing
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Retail Price */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">
                            Retail Selling Price (MRP) <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                            <input
                              type="number"
                              value={newItemRetailPrice}
                              onChange={(e) => setNewItemRetailPrice(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                            />
                          </div>
                        </div>

                        {/* Item Type */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">This item is for:</label>
                          <div className="flex gap-2">
                            {['Purchases', 'purchase', 'both'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setNewItemType(type)}
                                className={cn(
                                  "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize border-2",
                                  newItemType === type
                                    ? "bg-warning/10 border-warning text-warning"
                                    : "bg-muted border-border hover:border-warning/30"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Expandable: WholePurchase Price */}
                        <div className="sm:col-span-2">
                          {!showNewItemWholePurchasePrice ? (
                            <button
                              type="button"
                              onClick={() => setShowNewItemWholePurchasePrice(true)}
                              className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                            >
                              <Plus size={14} weight="bold" />
                              WholePurchase Price
                            </button>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                            >
                              <label className="text-xs font-medium mb-1.5 block">WholePurchase Price</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                <input
                                  type="number"
                                  value={newItemWholePurchasePrice}
                                  onChange={(e) => setNewItemWholePurchasePrice(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-8 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Expandable: Purchase Price */}
                        <div className="sm:col-span-2">
                          {!showNewItemPurchasePrice ? (
                            <button
                              type="button"
                              onClick={() => setShowNewItemPurchasePrice(true)}
                              className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                            >
                              <Plus size={14} weight="bold" />
                              Purchase Cost Price
                            </button>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                            >
                              <label className="text-xs font-medium mb-1.5 block">Purchase Cost Price</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                <input
                                  type="number"
                                  value={newItemPurchasePrice}
                                  onChange={(e) => setNewItemPurchasePrice(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-8 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Tax & Category */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
                        <Percent size={16} weight="duotone" />
                        Tax & Compliance
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* GST Rate */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">GST Rate (India)</label>
                          <select
                            value={newItemGstRate}
                            onChange={(e) => setNewItemGstRate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                          >
                            <option value="0">0% - Essential goods (milk, vegetables, books)</option>
                            <option value="5">5% - Common goods</option>
                            <option value="12">12% - Standard goods</option>
                            <option value="18">18% - Electronics, Stationery, Clothing</option>
                            <option value="28">28% - Luxury goods</option>
                          </select>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            CGST: {parseInt(newItemGstRate)/2}% + SGST: {parseInt(newItemGstRate)/2}%
                          </p>
                        </div>

                        {/* Expandable: HSN Code */}
                        <div>
                          {!showNewItemHSN ? (
                            <button
                              type="button"
                              onClick={() => setShowNewItemHSN(true)}
                              className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1 mt-6"
                            >
                              <Plus size={14} weight="bold" />
                              HSN Code
                            </button>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="space-y-2"
                            >
                              <label className="text-xs font-medium mb-1.5 block">HSN Code (Optional)</label>
                              <input
                                type="text"
                                value={newItemHsnCode}
                                onChange={(e) => setNewItemHsnCode(e.target.value)}
                                placeholder="e.g., 9609 for pens"
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Stock Management */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
                        <Package size={16} weight="duotone" />
                        Stock Management
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Stock Quantity */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Opening Stock Quantity</label>
                          <input
                            type="number"
                            value={newItemStockQty}
                            onChange={(e) => setNewItemStockQty(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                          />
                        </div>

                        {/* Expandable: Low Stock Alert */}
                        <div>
                          {!showNewItemLowStockAlert ? (
                            <button
                              type="button"
                              onClick={() => setShowNewItemLowStockAlert(true)}
                              className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1 mt-6"
                            >
                              <Bell size={14} weight="duotone" />
                              Low Stock Alert
                            </button>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                            >
                              <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                                <Bell size={12} weight="duotone" />
                                Low Stock Alert Level
                              </label>
                              <input
                                type="number"
                                value={newItemLowStockAlert}
                                onChange={(e) => setNewItemLowStockAlert(e.target.value)}
                                placeholder="e.g., 5"
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Alert when stock falls below this quantity
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Additional Details (Optional) */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground">Optional Details</p>

                      {/* Expandable: Brand */}
                      {!showNewItemBrand ? (
                        <button
                          type="button"
                          onClick={() => setShowNewItemBrand(true)}
                          className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                        >
                          <Plus size={14} weight="bold" />
                          Brand Name
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-1.5"
                        >
                          <label className="text-xs font-medium mb-1.5 block">Brand Name</label>
                          <input
                            type="text"
                            value={newItemBrand}
                            onChange={(e) => setNewItemBrand(e.target.value)}
                            placeholder="e.g., Cello, Parker, HP"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none"
                          />
                        </motion.div>
                      )}

                      {/* Expandable: Barcode */}
                      {!showNewItemBarcode ? (
                        <button
                          type="button"
                          onClick={() => setShowNewItemBarcode(true)}
                          className="text-sm text-warning hover:text-warning/80 font-medium flex items-center gap-1"
                        >
                          <Barcode size={14} weight="duotone" />
                          Barcode/SKU
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-1.5"
                        >
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                            <Barcode size={12} weight="duotone" />
                            Barcode/SKU Number
                          </label>
                          <input
                            type="text"
                            value={newItemBarcode}
                            onChange={(e) => setNewItemBarcode(e.target.value)}
                            placeholder="Enter or scan barcode"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none font-mono"
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-4 border-t border-border flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddItemModal(false)
                      resetNewItemForm()
                    }}
                    className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewItem}
                    disabled={savingItem || !newItemName.trim() || !newItemRetailPrice.trim()}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-warning to-accent text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingItem ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Package size={18} weight="duotone" />
                        Add Item
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Integration Modals */}
      {currentPaymentDetails && (
        <UPIPaymentModal
          isOpen={showUPIModal}
          onClose={handleUPIPaymentCancel}
          onSuccess={handleUPIPaymentSuccess}
          onCancel={handleUPIPaymentCancel}
          paymentDetails={currentPaymentDetails}
        />
      )}

      {currentCardPaymentRequest && (
        <CardPaymentModal
          isOpen={showCardModal}
          onClose={handleCardPaymentCancel}
          onSuccess={handleCardPaymentSuccess}
          onCancel={handleCardPaymentCancel}
          paymentRequest={currentCardPaymentRequest}
          terminalConfig={DEFAULT_TERMINAL_CONFIG}
        />
      )}

      {/* AI ShoppingCart Scanner */}
      <ShoppingCartScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
        type="Purchase"
      />

      {/* AI Bill Assistant */}
      <AIAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
      />

      {/* Bill Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreviewModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl h-[90vh] bg-card text-card-foreground rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-warning/5">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Eye size={28} weight="duotone" className="text-warning" />
                    Bill Preview
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const pdfData: BillPDFData = {
                          BillNumber,
                          BillDate,
                          SupplierName,
                          SupplierPhone,
                          SupplierEmail,
                          SupplierGST,
                          items: BillItems.map(item => ({
                            name: item.name,
                            qty: item.qty,
                            unit: item.unit,
                            price: item.price,
                            discount: item.discount,
                            tax: item.tax,
                            total: item.total,
                            hsnCode: item.hsnCode
                          })),
                          subtotal: totals.subtotal,
                          discount: totals.discount,
                          tax: totals.totalTax,
                          total: totals.total,
                          notes
                        }
                        downloadBillPDF(pdfData, generatePDFFilename())
                      }}
                      className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Download size={18} weight="bold" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X size={24} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Preview Content - Scrollable */}
                <div className="flex-1 overflow-auto p-6 bg-muted/20">
                  <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
                    {/* Bill Header */}
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-800">Bill</h1>
                        <p className="text-sm text-gray-600 mt-1">#{BillNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Date: {new Date(BillDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Supplier Details */}
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
                      <p className="font-medium text-gray-900">{SupplierName}</p>
                      {SupplierPhone && <p className="text-sm text-gray-600">Phone: {SupplierPhone}</p>}
                      {SupplierEmail && <p className="text-sm text-gray-600">Email: {SupplierEmail}</p>}
                      {SupplierGST && <p className="text-sm text-gray-600">GSTIN: {SupplierGST}</p>}
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-8">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-2 text-sm font-semibold text-gray-700">Item</th>
                          <th className="text-right py-2 text-sm font-semibold text-gray-700">Qty</th>
                          <th className="text-right py-2 text-sm font-semibold text-gray-700">Price</th>
                          <th className="text-right py-2 text-sm font-semibold text-gray-700">Tax</th>
                          <th className="text-right py-2 text-sm font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {BillItems.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-3 text-sm text-gray-800">{item.name}</td>
                            <td className="py-3 text-sm text-right text-gray-800">{item.qty}</td>
                            <td className="py-3 text-sm text-right text-gray-800">₹{item.price.toFixed(2)}</td>
                            <td className="py-3 text-sm text-right text-gray-800">{item.tax}%</td>
                            <td className="py-3 text-sm text-right font-medium text-gray-900">₹{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end mb-8">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium text-gray-900">₹{totals.subtotal.toFixed(2)}</span>
                        </div>
                        {totals.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Discount:</span>
                            <span className="font-medium text-red-600">-₹{totals.discount.toFixed(2)}</span>
                          </div>
                        )}
                        {totals.totalCGST > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">CGST:</span>
                            <span className="font-medium text-emerald-600">₹{totals.totalCGST.toFixed(2)}</span>
                          </div>
                        )}
                        {totals.totalSGST > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">SGST:</span>
                            <span className="font-medium text-emerald-600">₹{totals.totalSGST.toFixed(2)}</span>
                          </div>
                        )}
                        {totals.totalIGST > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">IGST:</span>
                            <span className="font-medium text-blue-600">₹{totals.totalIGST.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                          <span className="text-gray-600">Total Tax:</span>
                          <span className="font-medium text-gray-900">₹{totals.totalTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-800">
                          <span className="text-gray-900">Grand Total:</span>
                          <span className="text-gray-900">₹{totals.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {notes && (
                      <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-2">Notes:</h3>
                        <p className="text-sm text-gray-600">{notes}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                      <p>Thank you for your business!</p>
                      <p>This is a computer-generated Bill</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Bill Preview Modal */}
      <BillPreviewModal
        isOpen={showBillPreview}
        onClose={() => {
          setShowBillPreview(false)
          // Save the Bill when closing
          if (activeTab.mode === 'Bill') {
            createBillOnly()
          } else {
            createBill()
          }
        }}
        BillData={{
          BillNumber,
          BillDate,
          SupplierName,
          SupplierPhone,
          items: BillItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            gst: item.gst
          })),
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.totalTax,
          total: totals.total,
          received: payments.reduce((sum, p) => sum + p.amount, 0),
          balance: totals.total - payments.reduce((sum, p) => sum + p.amount, 0),
          companyName: getCompanySettings().companyName,
          companyPhone: getCompanySettings().phone
        }}
      />
    </div>
  )
}

export default Purchases

