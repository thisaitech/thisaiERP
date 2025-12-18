import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Plus,
  Receipt,
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
  ArrowUUpLeft,
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
  CurrencyInr,
  FloppyDisk,
  Storefront,
  MapPin
} from '@phosphor-icons/react'
import { useBanking } from '../hooks/useBanking'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { useAIAssistant } from '../contexts/AIAssistantContext'
import AIAssistant from '../components/AIAssistant'
import ReceiptScanner from '../components/ReceiptScanner'
import type { ScannedInvoiceData } from '../types'
import { processScannedInvoice, getInvoices, deleteInvoice, createInvoice as createInvoiceService, getInvoiceById, updateInvoice } from '../services/invoiceService'
import { recordPayment, getInvoicePayments, deletePayment } from '../services/paymentService'
import type { Payment } from '../services/paymentService'
import { downloadInvoicePDF, printInvoicePDF } from '../services/pdfService'
import type { InvoicePDFData } from '../services/pdfService'
import { shareViaWhatsApp, sendPaymentReminderWhatsApp } from '../services/shareService'
import { UPIPaymentModal, CardPaymentModal } from '../components/PaymentModals'
import { generatePaymentRef, savePaymentStatus, type UPIPaymentDetails, type CardPaymentRequest, DEFAULT_TERMINAL_CONFIG } from '../utils/paymentIntegration'
import { generateIndianInvoiceNumber } from '../utils/invoiceNumbering'
import { exportToTallyExcel, exportToTallyCSV, downloadTallyXML } from '../utils/exportUtils'
import { calculateGSTBreakdown, isIntraStateTransaction, isB2BTransaction, isHSNRequired, formatGSTDisplay } from '../utils/gstCalculations'
import { validateCustomerName, validateBusinessName, validateItemName, validatePhoneNumber, validateGSTIN, validateHSNCode, validateBarcode } from '../utils/inputValidation'
import { getCompanySettings, getTaxSettings, getInvoiceTableColumnSettings } from '../services/settingsService'
import { calculateTax } from '../utils/gstTaxCalculator'
import { getUnitPrice, getBaseQtyForSale, getStockDisplay, hasEnoughStock, getAvailableStockMessage } from '../utils/multiUnitUtils'
import InvoicePreviewModal from '../components/InvoicePreviewModal'
import ModernPOS, { QuickCheckoutData } from '../components/ModernPOS'
import POSCheckoutWizard, { CheckoutData } from '../components/POSCheckoutWizard'
import BarcodeScanner from '../components/BarcodeScanner'
import { findItemByBarcode } from '../services/itemService'
import { searchItems, type MasterItem } from '../services/itemMasterService'
import { getItemSettings } from '../services/settingsService'
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'

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

interface InvoiceItem {
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
  // Stock tracking
  itemId?: string
  availableStock?: number
  // GST Tax Mode (Vyapar Style)
  taxMode?: 'inclusive' | 'exclusive' // Whether price is inclusive or exclusive of GST
  basePrice?: number // Auto-calculated base if price is inclusive
  // Multi-Unit Conversion Fields
  hasMultiUnit?: boolean
  baseUnit?: string // e.g., 'Pcs'
  purchaseUnit?: string // e.g., 'Box'
  piecesPerPurchaseUnit?: number // e.g., 12
  sellingPricePerPiece?: number // Price per single piece
  selectedUnit?: string // Current selected unit for this line item
  qtyInBaseUnits?: number // Quantity converted to base units for stock deduction
}

const Sales = () => {
  // Language support
  const { t, language } = useLanguage()

  // AI Assistant integration
  const { lastAction, clearAction } = useAIAssistant()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showTallyDropdown, setShowTallyDropdown] = useState(false)
  const [tallyDropdownPosition, setTallyDropdownPosition] = useState({ top: 0, left: 0 })
  const [showBillDropdown, setShowBillDropdown] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null)

  // Tab system for multiple simultaneous invoices
  interface InvoiceTab {
    id: string
    type: 'sale' | 'credit'
    mode: 'invoice' | 'pos' // Track which mode this tab belongs to
    customerName: string
    customerPhone: string
    customerEmail: string
    customerGST: string
    customerState: string
    customerVehicleNo?: string // Vehicle number for transport invoices
    invoiceItems: InvoiceItem[]
    paymentMode: string
    invoiceDiscount: number
    discountType: 'percent' | 'amount'
    notes: string
    customerSearch: string
  }

  // Dashboard stats filter
  const [statsFilter, setStatsFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('today')
  const [customDateFrom, setCustomDateFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [customDateTo, setCustomDateTo] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)

  // Detect if we just navigated with a converted quotation draft to skip list-mode render flicker
  const hasConvertedDraft = (() => {
    try {
      return !!sessionStorage.getItem('converted_invoice')
    } catch {
      return false
    }
  })()

  // View mode: 'list' shows invoice list, 'create' shows create invoice form
  // Use lazy initialization to load from localStorage immediately
  const [viewMode, setViewMode] = useState<'list' | 'create'>(() => {
    try {
      if (hasConvertedDraft) return 'create'
      const saved = localStorage.getItem('sales_viewMode')
      if (saved === 'list' || saved === 'create') return saved as 'list' | 'create'
      // Default to create mode when landing directly on /sales to avoid mode flip animations
      if (typeof window !== 'undefined' && window.location.pathname === '/sales') return 'create'
      return 'list'
    } catch {
      return 'create'
    }
  })

  // Lazy initialization for tabs - load from localStorage immediately
  const [invoiceTabs, setInvoiceTabs] = useState<InvoiceTab[]>(() => {
    try {
      const saved = localStorage.getItem('sales_invoiceTabs')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.length > 0) {
          // Migrate old tabs without mode/discountType properties
          return parsed.map((tab: any) => ({
            ...tab,
            mode: tab.mode || 'invoice', // Default to invoice mode for old tabs
            customerState: tab.customerState || '',
            discountType: tab.discountType || 'percent' // Default to percent for old tabs
          }))
        }
      }
    } catch (error) {
      console.error('Error loading saved tabs:', error)
    }
    // Default initial tab
    return [{
      id: '1',
      type: 'sale',
      mode: 'invoice', // Default to invoice mode
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerGST: '',
      customerState: '',
      invoiceItems: [],
      paymentMode: 'cash',
      invoiceDiscount: 0,
      discountType: 'percent',
      notes: '',
      customerSearch: ''
    }]
  })

  // Lazy initialization for active tab ID
  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      const saved = localStorage.getItem('sales_activeTabId')
      return saved || '1'
    } catch {
      return '1'
    }
  })

  // Invoice Number and Date State
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const hasProcessedConvertedInvoice = useRef(false)
  // Flag to avoid feedback loop when syncing tab -> form -> tab
  const isApplyingTabRef = useRef(false)

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethodSelected, setPaymentMethodSelected] = useState<'cash' | 'bank' | 'upi' | 'card' | 'cheque'>('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [openItemMenu, setOpenItemMenu] = useState<string | null>(null) // For mobile item options menu
  const [itemMenuPosition, setItemMenuPosition] = useState<{ top: number; right: number } | null>(null) // Position for item menu
  const [invoicePayments, setInvoicePayments] = useState<Payment[]>([])
  const [paymentBankAccountId, setPaymentBankAccountId] = useState<string>('') // Bank account for payment modal

  // List Invoice Preview State - for printing existing invoices with InvoicePreviewModal
  const [showListInvoicePreview, setShowListInvoicePreview] = useState(false)
  const [listInvoicePreviewData, setListInvoicePreviewData] = useState<any>(null)

  // Invoice Form State
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerGST, setCustomerGST] = useState('')
  const [customerState, setCustomerState] = useState('')
  const [customerVehicleNo, setCustomerVehicleNo] = useState('')
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [paymentMode, setPaymentMode] = useState('cash')
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('')
  const [invoiceDiscount, setInvoiceDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent')
  const [roundOff, setRoundOff] = useState(true)
  const [notes, setNotes] = useState('Thank you')
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)

  // Banking accounts (subscribe for live updates)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const { accounts: bankingAccountsObj, refresh: refreshBanking } = useBanking()

  useEffect(() => {
    try {
      if (bankingAccountsObj && bankingAccountsObj.bankAccounts) {
        setBankAccounts(bankingAccountsObj.bankAccounts)
      } else if (bankingAccountsObj) {
        // If banking object present but no bankAccounts array, try mapping
        const banks = (bankingAccountsObj.accounts || [])
        setBankAccounts(banks)
      } else {
        // Fallback: read from localStorage once
        const raw = localStorage.getItem('bankingAccounts')
        if (raw) {
          const parsed = JSON.parse(raw)
          setBankAccounts(parsed.bankAccounts || parsed.accounts || [])
        }
      }
    } catch (e) {
      console.warn('Failed to parse bankingAccounts in Sales page', e)
      setBankAccounts([])
    }
  }, [bankingAccountsObj])

  // Load custom units from Item Settings
  useEffect(() => {
    const itemSettings = getItemSettings()
    setCustomUnits(itemSettings.itemUnits || [])
  }, [])

  // Split Payment State
  const [payments, setPayments] = useState<{ type: string; amount: number; reference: string }[]>([
    { type: 'cash', amount: 0, reference: '' }
  ])


  // Invoice Preview Modal State
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [printOnlyPreview, setPrintOnlyPreview] = useState(false) // Print preview without saving

  // Customer/Item Search State
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [allParties, setAllParties] = useState<any[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [allItems, setAllItems] = useState<any[]>([])
  const [loadingParties, setLoadingParties] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [highlightedItemIndex, setHighlightedItemIndex] = useState(-1)
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1)

  // Add Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerGST, setNewCustomerGST] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [newCustomerState, setNewCustomerState] = useState('')
  const [newCustomerType, setNewCustomerType] = useState('Regular')
  const [newCustomerNotes, setNewCustomerNotes] = useState('')
  const [newCustomerOpeningBalance, setNewCustomerOpeningBalance] = useState('')
  const [newCustomerCreditDays, setNewCustomerCreditDays] = useState(30)
  const [showAddressField, setShowAddressField] = useState(false)
  const [showStateField, setShowStateField] = useState(false)
  const [showGstField, setShowGstField] = useState(false)
  const [showEmailField, setShowEmailField] = useState(false)
  const [showCustomerTypeField, setShowCustomerTypeField] = useState(false)
  const [showNotesField, setShowNotesField] = useState(false)
  const [showOpeningBalanceField, setShowOpeningBalanceField] = useState(false)
  const [showCreditDaysField, setShowCreditDaysField] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)

  // POS Preview Modal State
  const [showPosPreview, setShowPosPreview] = useState(false)

  // Add Item Modal State
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('pcs')
  const [newItemRetailPrice, setNewItemRetailPrice] = useState('')
  const [newItemGstRate, setNewItemGstRate] = useState('18')
  const [newItemCategory, setNewItemCategory] = useState('stationery')
  const [newItemDescription, setNewItemDescription] = useState('')
  const [newItemType, setNewItemType] = useState('sales')
  const [newItemWholesalePrice, setNewItemWholesalePrice] = useState('')
  const [newItemPurchasePrice, setNewItemPurchasePrice] = useState('')
  const [newItemHsnCode, setNewItemHsnCode] = useState('')
  const [newItemStockQty, setNewItemStockQty] = useState('')
  const [newItemLowStockAlert, setNewItemLowStockAlert] = useState('')
  const [newItemBrand, setNewItemBrand] = useState('')
  const [newItemBarcode, setNewItemBarcode] = useState('')
  const [showNewItemDescriptionAI, setShowNewItemDescriptionAI] = useState(false)
  const [showNewItemWholesalePrice, setShowNewItemWholesalePrice] = useState(false)
  const [showNewItemPurchasePrice, setShowNewItemPurchasePrice] = useState(false)
  const [showNewItemHSN, setShowNewItemHSN] = useState(false)
  const [showNewItemLowStockAlert, setShowNewItemLowStockAlert] = useState(false)
  const [showNewItemBrand, setShowNewItemBrand] = useState(false)
  const [showNewItemBarcode, setShowNewItemBarcode] = useState(false)
  const [savingItem, setSavingItem] = useState(false)

  // Add Item Modal - Autocomplete States (matching Inventory page)
  const [newItemSuggestions, setNewItemSuggestions] = useState<MasterItem[]>([])
  const [showNewItemSuggestions, setShowNewItemSuggestions] = useState(false)
  const [selectedNewItemIndex, setSelectedNewItemIndex] = useState(-1)
  const [customUnits, setCustomUnits] = useState<string[]>([])

  // Refs for click-outside detection
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  const itemDropdownRef = useRef<HTMLDivElement>(null)
  const desktopItemDropdownRef = useRef<HTMLDivElement>(null)
  const itemSearchInputRef = useRef<HTMLInputElement>(null)
  const itemTableContainerRef = useRef<HTMLDivElement>(null)
  const mobileItemsContainerRef = useRef<HTMLDivElement>(null)

  // Column visibility state for invoice items table
  const [visibleColumns, setVisibleColumns] = useState({
    hsnCode: false,
    description: false,
    discount: true,
    gstBreakdown: false  // CGST/SGST/IGST breakdown - hidden by default, single GST% shown
  })
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const columnMenuRef = useRef<HTMLDivElement>(null)

  // Invoice table column labels from settings
  const [columnLabels, setColumnLabels] = useState(getInvoiceTableColumnSettings())

  // Invoice format state - Multiple print formats
  const [invoiceFormat, setInvoiceFormat] = useState<'a4' | 'a5' | 'pos58' | 'pos80' | 'kot' | 'barcode' | 'sticker'>('pos80')

  // Payment integration modals
  const [showUPIModal, setShowUPIModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [currentPaymentDetails, setCurrentPaymentDetails] = useState<UPIPaymentDetails | null>(null)
  const [currentCardPaymentRequest, setCurrentCardPaymentRequest] = useState<CardPaymentRequest | null>(null)
  const [pendingInvoiceData, setPendingInvoiceData] = useState<any>(null)

  // Sales Mode: 'pos' for POS sales with payment, 'invoice' for traditional invoicing
  const [salesMode, setSalesMode] = useState<'pos' | 'invoice'>('invoice')

  // Café POS View: Toggle between traditional form and modern café-style POS
  const [showCafePOS, setShowCafePOS] = useState(false)

  // POS Checkout Wizard - Professional step-by-step checkout flow
  const [showPOSCheckoutWizard, setShowPOSCheckoutWizard] = useState(false)
  const [posResetKey, setPosResetKey] = useState(0) // Key to force ModernPOS reset after checkout
  const [posCartItems, setPosCartItems] = useState<Array<{
    id: string
    itemId?: string  // Inventory item ID for stock update
    name: string
    price: number
    quantity: number
    unit: string
    tax: number
    taxAmount: number
    hsnCode?: string
  }>>([])

  // Preview visibility state - collapsed by default
  const [showPreview, setShowPreview] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Sale Return Modal states
  const [showSaleReturnModal, setShowSaleReturnModal] = useState(false)
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<any>(null)
  const [returnItems, setReturnItems] = useState<{id: string, itemId?: string, name: string, qty: number, maxQty: number, price: number, tax?: number, taxMode?: 'inclusive' | 'exclusive', basePrice?: number, total?: number, selected: boolean}[]>([])
  const [returnReason, setReturnReason] = useState('')
  const [returnNotes, setReturnNotes] = useState('')
  const [isProcessingReturn, setIsProcessingReturn] = useState(false)

  // Track returned items per invoice - { invoiceId: { totalReturned: number, returnCount: number } }
  const [invoiceReturnsMap, setInvoiceReturnsMap] = useState<Record<string, { totalReturned: number, returnCount: number, totalAmount: number }>>({})

  // Function to fetch all returns for displayed invoices
  const fetchInvoiceReturns = async (invoiceIds: string[]) => {
    if (!db || invoiceIds.length === 0) return

    try {
      const returnsQuery = query(collection(db, 'sale_returns'))
      const returnsSnapshot = await getDocs(returnsQuery)

      const returnsMap: Record<string, { totalReturned: number, returnCount: number, totalAmount: number }> = {}

      returnsSnapshot.docs.forEach(doc => {
        const returnData = doc.data()
        const invoiceId = returnData.originalInvoiceId

        if (invoiceId && invoiceIds.includes(invoiceId)) {
          if (!returnsMap[invoiceId]) {
            returnsMap[invoiceId] = { totalReturned: 0, returnCount: 0, totalAmount: 0 }
          }

          // Count total returned items
          if (returnData.items && Array.isArray(returnData.items)) {
            returnData.items.forEach((item: any) => {
              returnsMap[invoiceId].totalReturned += (item.qty || 0)
            })
          }
          returnsMap[invoiceId].returnCount += 1
          returnsMap[invoiceId].totalAmount += (returnData.total || 0)
        }
      })

      setInvoiceReturnsMap(returnsMap)
    } catch (err) {
      console.warn('Could not fetch invoice returns:', err)
    }
  }

  // Dropdown menu position (for fixed positioning)
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, right: number} | null>(null)
  const [dropdownInvoiceId, setDropdownInvoiceId] = useState<string | null>(null) // Track which invoice the dropdown is for
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const [dropdownButtonElement, setDropdownButtonElement] = useState<HTMLElement | null>(null)

  // Update dropdown position on scroll (keep it visible and follow the button)
  useEffect(() => {
    if (!openActionMenu || !dropdownButtonElement) return

    let rafId: number | null = null
    let isUpdating = false

    const updatePosition = () => {
      // Prevent multiple rapid updates
      if (isUpdating) return
      isUpdating = true

      // Use requestAnimationFrame for smooth updates
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        isUpdating = false
        if (dropdownButtonElement && document.body.contains(dropdownButtonElement)) {
          const rect = dropdownButtonElement.getBoundingClientRect()
          // Check if button is still visible in viewport (with generous padding)
          if (rect.top < -100 || rect.bottom > window.innerHeight + 100) {
            // Button scrolled out of view, close dropdown
            setOpenActionMenu(null)
            setDropdownPosition(null)
            setDropdownInvoiceId(null)
            setDropdownButtonElement(null)
          } else {
            // Update position to follow the button
            setDropdownPosition({
              top: rect.bottom + 4,
              right: window.innerWidth - rect.right
            })
          }
        }
      })
    }

    // Listen to scroll on list container, all parent scrollable elements, and window
    const listContainer = listContainerRef.current
    const scrollableParents: Element[] = []

    // Find all scrollable parent elements
    let element = dropdownButtonElement.parentElement
    while (element) {
      const style = window.getComputedStyle(element)
      if (style.overflow === 'auto' || style.overflow === 'scroll' ||
          style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollableParents.push(element)
      }
      element = element.parentElement
    }

    // Add scroll listeners to all scrollable parents
    scrollableParents.forEach(parent => {
      parent.addEventListener('scroll', updatePosition, { passive: true })
    })

    if (listContainer && !scrollableParents.includes(listContainer)) {
      listContainer.addEventListener('scroll', updatePosition, { passive: true })
    }

    // Also listen to window scroll with capture phase
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      scrollableParents.forEach(parent => {
        parent.removeEventListener('scroll', updatePosition)
      })
      if (listContainer) {
        listContainer.removeEventListener('scroll', updatePosition)
      }
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [openActionMenu, dropdownButtonElement])

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const closeMenu = () => {
      if (openActionMenu) {
        setOpenActionMenu(null)
        setDropdownPosition(null)
        setDropdownInvoiceId(null)
        setDropdownButtonElement(null)
      }
    }

    // Close on click outside
    document.addEventListener('click', closeMenu)

    return () => {
      document.removeEventListener('click', closeMenu)
    }
  }, [openActionMenu])

  // Quick Edit Modal states
  const [showQuickEditModal, setShowQuickEditModal] = useState(false)
  const [quickEditInvoice, setQuickEditInvoice] = useState<any>(null)
  const [quickEditDate, setQuickEditDate] = useState('')
  const [quickEditPartyName, setQuickEditPartyName] = useState('')
  const [quickEditItems, setQuickEditItems] = useState<{id: string, name: string, qty: number, rate: number, tax: number, amount: number}[]>([])
  const [quickEditDiscount, setQuickEditDiscount] = useState(0)
  const [quickEditNotes, setQuickEditNotes] = useState('')
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false)
  const [quickEditActiveItemId, setQuickEditActiveItemId] = useState<string | null>(null)
  const [quickEditItemSearch, setQuickEditItemSearch] = useState('')

  // Get current active tab
  const activeTab = invoiceTabs.find(tab => tab.id === activeTabId) || invoiceTabs[0]

  // Sync current form state with active tab (read from tab)
  useEffect(() => {
    if (!activeTab || viewMode !== 'create') return

    // Mark that we're applying the tab values so the "save to tab" effect
    // doesn't immediately write them back and cause a loop.
    isApplyingTabRef.current = true

    setCustomerName(activeTab.customerName)
    setCustomerPhone(activeTab.customerPhone)
    setCustomerEmail(activeTab.customerEmail)
    setCustomerGST(activeTab.customerGST)
    setCustomerState(activeTab.customerState || '')
    setCustomerVehicleNo(activeTab.customerVehicleNo || '')
    setInvoiceItems(activeTab.invoiceItems)
    setPaymentMode(activeTab.paymentMode)
    setInvoiceDiscount(activeTab.invoiceDiscount)
    setDiscountType(activeTab.discountType || 'percent')
    setNotes(activeTab.notes)
    setCustomerSearch(activeTab.customerSearch)

    // Release the flag after this event loop tick so subsequent user edits
    // can be saved back to the tab by the other effect.
    setTimeout(() => {
      isApplyingTabRef.current = false
    }, 0)
  }, [activeTab, viewMode])

  // Save current form state to active tab whenever it changes
  useEffect(() => {
    if (viewMode !== 'create' || !activeTab) return

    // If we're currently applying values from the tab to the form,
    // skip saving back to the tab to avoid an infinite update loop.
    if (isApplyingTabRef.current) return

    // Prevent unnecessary tab updates that can cascade into re-renders
    const tabAlreadyCurrent =
      activeTab.customerName === customerName &&
      activeTab.customerPhone === customerPhone &&
      activeTab.customerEmail === customerEmail &&
      activeTab.customerGST === customerGST &&
      (activeTab.customerState || '') === customerState &&
      (activeTab.customerVehicleNo || '') === customerVehicleNo &&
      activeTab.invoiceItems === invoiceItems &&
      activeTab.paymentMode === paymentMode &&
      activeTab.invoiceDiscount === invoiceDiscount &&
      (activeTab.discountType || 'percent') === discountType &&
      activeTab.notes === notes &&
      activeTab.customerSearch === customerSearch

    if (tabAlreadyCurrent) return

    setInvoiceTabs(tabs =>
      tabs.map(tab =>
        tab.id === activeTabId
          ? {
              ...tab,
              customerName,
              customerPhone,
              customerEmail,
              customerGST,
              customerState,
              customerVehicleNo,
              invoiceItems,
              paymentMode,
              invoiceDiscount,
              discountType,
              notes,
              customerSearch
            }
          : tab
      )
    )
  }, [
    activeTab,
    activeTabId,
    customerName,
    customerPhone,
    customerEmail,
    customerGST,
    customerState,
    customerVehicleNo,
    invoiceItems,
    paymentMode,
    invoiceDiscount,
    discountType,
    notes,
    customerSearch,
    viewMode
  ])

  // Generate invoice number on mount
  useEffect(() => {
    if (!invoiceNumber) {
      const generatedInvoiceNumber = generateIndianInvoiceNumber('QTN')
      setInvoiceNumber(generatedInvoiceNumber)
    }
  }, [])

  // Persist viewMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sales_viewMode', viewMode)
  }, [viewMode])

  // Persist tabs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sales_invoiceTabs', JSON.stringify(invoiceTabs))
  }, [invoiceTabs])

  // Persist active tab ID to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sales_activeTabId', activeTabId)
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

  // Auto-show HSN column when customer has GSTIN (B2B transaction)
  useEffect(() => {
    if (customerGST && customerGST.trim().length > 0) {
      // B2B transaction - HSN is mandatory, auto-show column
      setVisibleColumns(prev => ({ ...prev, hsnCode: true }))
    }
  }, [customerGST])

  // Listen for AI Assistant trigger from Dashboard
  useEffect(() => {
    if (lastAction && lastAction.type === 'open_ai_assistant' && lastAction.payload?.target === 'sales') {
      setShowAIAssistant(true)
      clearAction()
    }
  }, [lastAction, clearAction])

  // Sync salesMode to active tab's mode and auto-select invoice format
  useEffect(() => {
    // Update the current tab's mode when salesMode changes
    if (activeTab && activeTab.mode !== salesMode) {
      setInvoiceTabs(tabs =>
        tabs.map(tab =>
          tab.id === activeTabId
            ? { ...tab, mode: salesMode }
            : tab
        )
      )
    }

    // Auto-select appropriate invoice format based on mode
    if (salesMode === 'pos') {
      // When switching to POS mode, default to 58mm thermal format
      if (!['pos58', 'pos80', 'kot', 'barcode', 'sticker'].includes(invoiceFormat)) {
        setInvoiceFormat('pos58')
      }
    } else {
      // When switching to Invoice mode, default to A4 format
      if (['pos58', 'pos80', 'kot', 'barcode', 'sticker'].includes(invoiceFormat)) {
        setInvoiceFormat('a4')
      }
    }
  }, [salesMode, activeTabId])

  // Auto-scroll to last item when items are added
  useEffect(() => {
    if (invoiceItems.length > 0) {
      // Scroll desktop table container
      if (itemTableContainerRef.current) {
        itemTableContainerRef.current.scrollTop = itemTableContainerRef.current.scrollHeight
      }
      // Scroll mobile items container
      if (mobileItemsContainerRef.current) {
        mobileItemsContainerRef.current.scrollTop = mobileItemsContainerRef.current.scrollHeight
      }
    }
  }, [invoiceItems.length])

  // Add new tab
  const addNewTab = (type: 'sale' | 'credit' = 'sale') => {
    const newTab: InvoiceTab = {
      id: Date.now().toString(),
      type,
      mode: salesMode, // Set mode based on current salesMode (invoice or pos)
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerGST: '',
      customerState: '',
      customerVehicleNo: '',
      invoiceItems: [],
      paymentMode: 'cash',
      invoiceDiscount: 0,
      discountType: 'percent',
      notes: '',
      customerSearch: ''
    }
    setInvoiceTabs([...invoiceTabs, newTab])
    setActiveTabId(newTab.id)
  }

  // Close tab
  const closeTab = (tabId: string) => {
    if (invoiceTabs.length === 1) {
      toast.error('Cannot close the last tab')
      return
    }

    const tabIndex = invoiceTabs.findIndex(tab => tab.id === tabId)
    const newTabs = invoiceTabs.filter(tab => tab.id !== tabId)
    setInvoiceTabs(newTabs)

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
    console.log('🔙 handleBackToList called - current path:', location.pathname, 'viewMode:', viewMode)

    // Check if on POS route - show POS list view
    if (location.pathname === '/pos') {
      // Keep POS mode and go to list view
      setSalesMode('pos')
      setShowCafePOS(false) // Exit Café POS but stay in POS list
      setViewMode('list')
      localStorage.setItem('pos_viewMode', 'list')
      console.log('✅ POS: Set viewMode to list')
    } else {
      // Regular sales - just switch to list view
      setViewMode('list')
      localStorage.setItem('sales_viewMode', 'list')
      console.log('✅ Sales: Set viewMode to list')
    }

    // Keep all existing tabs and their data intact
    // When user clicks "Create Invoice" again, they'll see all their draft tabs
  }

  // Close only the current tab after successful invoice creation
  const closeCurrentTab = () => {
    const currentTabIndex = invoiceTabs.findIndex(tab => tab.id === activeTabId)

    // If only one tab exists, reset it to blank instead of closing
    if (invoiceTabs.length === 1) {
      const newInvoiceNumber = generateIndianInvoiceNumber('QTN')
      const newDate = new Date().toISOString().split('T')[0]

      const resetTab: InvoiceTab = {
        id: activeTabId,
        type: 'sale',
        mode: 'invoice',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerGST: '',
        customerState: '',
        invoiceItems: [],
        paymentMode: 'cash',
        invoiceDiscount: 0,
        discountType: 'percent',
        notes: '',
        customerSearch: ''
      }

      setInvoiceTabs([resetTab])

      // Clear current form fields
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
      setCustomerGST('')
      setInvoiceItems([])
      setPaymentMode('cash')
      setInvoiceDiscount(0)
      setDiscountType('percent')
      setNotes('')
      setCustomerSearch('')
      setInvoiceNumber(newInvoiceNumber)
      setInvoiceDate(newDate)

      // Save to localStorage
      localStorage.setItem('sales_invoiceTabs', JSON.stringify([resetTab]))
      return
    }

    // Multiple tabs exist - remove the current tab
    const updatedTabs = invoiceTabs.filter(tab => tab.id !== activeTabId)
    setInvoiceTabs(updatedTabs)

    // Switch to adjacent tab
    let newActiveTab: InvoiceTab
    if (currentTabIndex > 0) {
      // Switch to previous tab
      newActiveTab = updatedTabs[currentTabIndex - 1]
    } else {
      // Switch to next tab (now at index 0)
      newActiveTab = updatedTabs[0]
    }

    setActiveTabId(newActiveTab.id)

    // Load the new active tab's data
    setCustomerName(newActiveTab.customerName)
    setCustomerPhone(newActiveTab.customerPhone || '')
    setCustomerEmail(newActiveTab.customerEmail || '')
    setCustomerGST(newActiveTab.customerGST || '')
    setCustomerVehicleNo(newActiveTab.customerVehicleNo || '')
    setInvoiceItems(newActiveTab.invoiceItems)
    setPaymentMode(newActiveTab.paymentMode)
    setInvoiceDiscount(newActiveTab.invoiceDiscount || 0)
    setDiscountType(newActiveTab.discountType || 'percent')
    setNotes(newActiveTab.notes || '')
    setCustomerSearch(newActiveTab.customerSearch || '')

    // Save to localStorage
    localStorage.setItem('sales_invoiceTabs', JSON.stringify(updatedTabs))
    localStorage.setItem('sales_activeTabId', newActiveTab.id)
  }

  // Reusable function to load invoices from database
  const loadInvoicesFromDatabase = async () => {
    try {
      setIsLoadingInvoices(true)
      const invoicesData = await getInvoices('sale')

      if (invoicesData && Array.isArray(invoicesData) && invoicesData.length > 0) {
        // STEP 1: Calculate customer outstanding directly from invoice data (2025 Standard)
        // Sum (total - paid) for ALL invoices of each customer - most reliable method
        const customerOutstandingMap: Map<string, number> = new Map()

        invoicesData.forEach(invoice => {
          // Get customer key (normalize to lowercase for consistent matching)
          const customerKey = (invoice?.partyName || invoice?.customerName || '').toLowerCase().trim()
          if (!customerKey || customerKey === 'unknown') return

          // Calculate this invoice's unpaid balance
          const invoiceTotal = Number(invoice?.grandTotal || invoice?.total || 0)
          const invoicePaid = Number(invoice?.payment?.paidAmount || 0)
          const invoiceBalance = invoiceTotal - invoicePaid

          // Add to customer's total outstanding
          const currentOutstanding = customerOutstandingMap.get(customerKey) || 0
          customerOutstandingMap.set(customerKey, currentOutstanding + invoiceBalance)
        })

        console.log('📊 Customer Outstanding Map:', Object.fromEntries(customerOutstandingMap))

        // STEP 2: Convert invoices to display format with customer outstanding attached
        const formattedInvoices = invoicesData.map(invoice => {
          // Look up customer's TOTAL outstanding across ALL their invoices
          const customerKey = (invoice?.partyName || invoice?.customerName || '').toLowerCase().trim()
          const customerOutstanding = customerOutstandingMap.get(customerKey) || 0

          // Debug: Log items for converted invoices
          if (invoice?.convertedFrom || invoice?.invoiceNumber?.includes('INV/2025-26/380')) {
            console.log('📊 Sales - Loading invoice:', invoice?.invoiceNumber)
            console.log('📊 Sales - Invoice items:', invoice?.items)
            console.log('📊 Sales - Invoice items isArray:', Array.isArray(invoice?.items))
            console.log('📊 Sales - Invoice items length:', invoice?.items?.length)
          }

          return {
            id: invoice?.id || `temp-${Date.now()}`,
            invoiceNumber: invoice?.invoiceNumber || 'N/A',
            partyName: invoice?.partyName || 'Unknown',
            partyPhone: invoice?.partyPhone || '',
            partyEmail: invoice?.partyEmail || '',
            partyGSTIN: invoice?.partyGSTIN || '',
            partyState: invoice?.partyAddress?.state || '',
            partyId: invoice?.partyId || '',
            date: invoice?.invoiceDate || new Date().toISOString().split('T')[0],
            total: invoice?.grandTotal || 0,
            paidAmount: invoice?.paidAmount ?? invoice?.payment?.paidAmount ?? 0,
            // Auto-fix status for fully returned invoices (total = 0 with returns)
            paymentStatus: ((invoice?.grandTotal === 0 || invoice?.total === 0) && (invoice?.hasReturns || invoice?.returnedAmount > 0))
              ? 'returned'
              : (invoice?.paymentStatus || invoice?.payment?.status || 'pending') as any,
            itemsCount: invoice?.items?.length || 0,
            items: invoice?.items || [], // Keep full items array for duplication
            subtotal: invoice?.subtotal || 0,
            tax: invoice?.totalTaxAmount || 0,
            discount: invoice?.discountAmount || 0,
            invoiceDiscount: invoice?.discountPercent || 0,
            // Payment mode - check top level first, then inside payment object
            paymentMode: invoice?.paymentMode || invoice?.payment?.mode || 'cash',
            notes: invoice?.notes || '',
            vehicleNo: invoice?.vehicleNo || '',
            createdAt: invoice?.createdAt || invoice?.invoiceDate || new Date().toISOString(),
            // Track if payment was reversed
            isReversed: invoice?.isReversed || false,
            // Customer total outstanding (2025 Standard - shows customer's total balance across all invoices)
            customerOutstanding: customerOutstanding,
            // Track invoice source (pos/invoice/ai)
            source: invoice?.source || 'invoice'
          }
        })

        // Sort by date descending (most recent first)
        formattedInvoices.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date).getTime()
          const dateB = new Date(b.createdAt || b.date).getTime()
          return dateB - dateA
        })

        setInvoices(formattedInvoices)

        // Fetch return data for all invoices
        const invoiceIds = formattedInvoices.map(inv => inv.id)
        fetchInvoiceReturns(invoiceIds)
      } else {
        // No invoices in database, show empty list
        setInvoices([])
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
      setInvoices([])
    } finally {
      setIsLoadingInvoices(false)
    }
  }

  // Handle AI Scan Complete
  const handleScanComplete = async (invoiceData: ScannedInvoiceData) => {
    let processingToast: string | number | undefined

    try {
      // Show processing toast
      processingToast = toast.loading('Processing invoice... Creating/updating customer and items')

      // Auto-process the invoice: create/update party and items
      const result = await processScannedInvoice(invoiceData, 'sale')

      if (result?.invoice && result?.party) {
        // Reload invoices list to show the new invoice
        await loadInvoicesFromDatabase()

        // Show comprehensive success message
        const successInfo = [
          result.party ? `Customer: ${result.party.companyName}` : null,
          result.party?.gstDetails?.gstin && `GSTIN: ${result.party.gstDetails.gstin}`,
          result.items?.length > 0 && `${result.items.length} item(s) created/updated`,
          `Invoice: ${invoiceData.invoiceNumber}`,
          `Total: ₹${invoiceData.grandTotal.toLocaleString()}`
        ].filter(Boolean).join(' | ')

        toast.success(`✓ Invoice processed! ${successInfo}`, {
          duration: 5000
        })

        // Close the scanner
        setShowScanner(false)
      } else {
        toast.error('Failed to process invoice. Please try again.')
        setShowScanner(false)
      }
    } catch (error) {
      console.error('Error processing scanned invoice:', error)
      toast.error('Error processing invoice. Please try again.')
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
  const location = useLocation()

  // Detect route and set appropriate mode
  // /pos → Check if coming from Back button (show list) or fresh navigation (show ModernPOS)
  // /sales → Direct to invoice creation view
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const forceOpen = params.get('open')

    if (location.pathname === '/pos') {
      setSalesMode('pos')
      // Check if user clicked Back to see POS list
      const savedViewMode = localStorage.getItem('pos_viewMode')
      if (savedViewMode === 'list') {
        // User clicked Back - show POS list
        setShowCafePOS(false)
        setViewMode('list')
      } else {
        // Fresh navigation - show ModernPOS grid
        setShowCafePOS(true)
        setViewMode('create')
      }
    } else if (location.pathname === '/sales') {
      // Go directly to invoice creation view
      setSalesMode('invoice')
      setShowCafePOS(false)
      // If caller explicitly requested create via query param, respect it.
      if (forceOpen === 'create') {
        setViewMode('create')
        try { localStorage.setItem('sales_viewMode', 'create') } catch {}
      } else {
        setViewMode('create')
      }
      // Clear POS viewMode when navigating to sales
      localStorage.removeItem('pos_viewMode')
    }
  }, [location.pathname])

  // Handle converted invoice from Quotations page
  useEffect(() => {
    if (hasProcessedConvertedInvoice.current) return
    const state = location.state as { convertedInvoice?: any } | null
    const stored = sessionStorage.getItem('converted_invoice')
    const converted = state?.convertedInvoice || (stored ? JSON.parse(stored) : null)
    if (converted) {
      console.log('📥 Received converted invoice from Quotations:', converted)

      // Map the converted invoice items to InvoiceItem format
      const mappedItems: InvoiceItem[] = (converted.items || []).map((item: any, index: number) => ({
        id: item.id || `converted_${Date.now()}_${index}`,
        name: item.name || item.description || '',
        qty: item.quantity || item.qty || 1,
        unit: item.unit || 'Pcs',
        price: item.rate || item.price || 0,
        basePrice: item.basePrice || undefined,
        taxMode: item.taxMode || 'exclusive',
        discount: item.discount || 0,
        discountAmount: item.discountAmount || 0,
        tax: item.taxRate || item.tax || 0,
        taxAmount: item.taxAmount || 0,
        cgstPercent: item.cgst || (item.taxRate || 0) / 2,
        cgstAmount: item.cgstAmount || 0,
        sgstPercent: item.sgst || (item.taxRate || 0) / 2,
        sgstAmount: item.sgstAmount || 0,
        igstPercent: item.igstPercent || 0,
        igstAmount: item.igstAmount || 0,
        total: item.amount || item.total || 0,
        hsnCode: item.hsnCode || '',
        description: item.description || '',
        itemId: item.itemId || ''
      }))

      console.log('📥 Mapped items for Sales form:', mappedItems)

      // Create a new tab with the converted invoice data (stable id for dedupe)
      const newTabId = converted.invoiceNumber || `converted_${Date.now()}`
      const newTab: InvoiceTab = {
        id: newTabId,
        type: 'sale',
        mode: 'invoice',
        customerName: converted.partyName || '',
        customerPhone: converted.partyPhone || '',
        customerEmail: converted.partyEmail || '',
        customerGST: converted.partyGSTIN || '',
        customerState: converted.partyState || '',
        invoiceItems: mappedItems,
        paymentMode: converted.paymentMode || 'cash',
        invoiceDiscount: converted.discount || 0,
        discountType: 'percent',
        notes: converted.notes || '',
        customerSearch: converted.partyName || ''
      }

      // Set the invoice number
      if (converted.invoiceNumber) {
        setInvoiceNumber(converted.invoiceNumber)
      }

      // IMPORTANT: Directly set the form states to ensure items are displayed immediately
      setCustomerName(converted.partyName || '')
      setCustomerPhone(converted.partyPhone || '')
      setCustomerEmail(converted.partyEmail || '')
      setCustomerGST(converted.partyGSTIN || '')
      setCustomerState(converted.partyState || '')
      setCustomerSearch(converted.partyName || '')
      setInvoiceItems(mappedItems)  // This is the key - set items directly!
      setPaymentMode(converted.paymentMode || 'cash')
      setInvoiceDiscount(converted.discount || 0)
      setNotes(converted.notes || '')

      // Add the new tab and activate it (force new entry to avoid empty items)
      setInvoiceTabs(prev => {
        if (prev.some(tab => tab.id === newTabId || (converted.invoiceNumber && tab.customerSearch === converted.invoiceNumber))) {
          return prev
        }
        return [...prev, newTab]
      })
      setActiveTabId(newTabId)
      localStorage.setItem('sales_activeTabId', newTabId)
      // Ensure the Sales page stays in `create` mode when loading a converted quotation
      // This avoids immediately falling back to the invoice list view.
      try {
        localStorage.setItem('sales_viewMode', 'create')
        localStorage.removeItem('pos_viewMode')
      } catch (e) {
        // ignore localStorage errors
      }

      // Ensure we're in create mode
      setViewMode('create')
      setSalesMode('invoice')

      // Clear the navigation state to prevent re-processing on refresh
      window.history.replaceState({}, document.title)
      sessionStorage.removeItem('converted_invoice')
      hasProcessedConvertedInvoice.current = true

      toast.success(`Quotation loaded! ${mappedItems.length} item(s) added to invoice.`)
    }
  }, [location.state])

  // Available items for selection (loaded from item service)
  const [availableItems, setAvailableItems] = useState<Array<{
    id: string;
    name: string;
    price: number;
    tax?: number;
    unit?: string;
    hasMultiUnit?: boolean;
    baseUnit?: string;
    purchaseUnit?: string;
    piecesPerPurchaseUnit?: number;
    sellingPricePerPiece?: number;
    purchasePricePerBox?: number;
    stockBase?: number;
  }>>([])

  // Normalize invoice items to ensure CGST/SGST/IGST percentages are always calculated
  // This is MANDATORY for GST compliance - percentages must always show if GST rate > 0
  // CRITICAL: Recalculate ALL items when customerState changes (interstate vs intrastate)
  useEffect(() => {
    const companySettings = getCompanySettings()
    const sellerState = companySettings.state || 'Tamil Nadu'

    console.log(`🔄 useEffect TRIGGERED - Recalculating items | Seller: ${sellerState}, Customer: ${customerState || '(none)'}`)

    setInvoiceItems(prevItems =>
      prevItems.map(item => {
        const taxPercent = Number(item.tax) || 0

        // Recalculate GST breakdown for items with tax rate > 0
        // This ensures CGST/SGST/IGST updates when customer state changes
        if (taxPercent > 0) {
          const price = Number(item.price) || 0
          const qty = Number(item.qty) || 1
          const discountPercent = Number(item.discount) || 0
          const taxMode = item.taxMode || 'exclusive'

          // IMPORTANT: For inclusive items, extract base price first
          let taxablePerUnit: number
          if (taxMode === 'inclusive') {
            // With GST: price includes GST, extract base
            taxablePerUnit = price / (1 + taxPercent / 100)
          } else {
            // Without GST: price is the base
            taxablePerUnit = price
          }

          const discountedTaxablePerUnit = taxablePerUnit - (taxablePerUnit * discountPercent / 100)
          const taxableAmount = discountedTaxablePerUnit * qty

          const gstBreakdown = calculateGSTBreakdown({
            taxableAmount,
            gstRate: taxPercent,
            sellerState,
            customerState: customerState,
            customerGSTIN: customerGST
          })

          console.log(`🔧 Recalculating ${item.name}:`, {
            seller: sellerState,
            customer: customerState,
            breakdown: `CGST=${gstBreakdown.cgstAmount}, SGST=${gstBreakdown.sgstAmount}, IGST=${gstBreakdown.igstAmount}`
          })

          // Calculate total based on taxMode
          const total = taxMode === 'inclusive'
            ? price * qty  // For inclusive, total = MRP × qty
            : taxableAmount + gstBreakdown.totalTaxAmount  // For exclusive, total = base + GST

          return {
            ...item,
            basePrice: taxablePerUnit,
            cgstPercent: gstBreakdown.cgstPercent,
            cgstAmount: gstBreakdown.cgstAmount,
            sgstPercent: gstBreakdown.sgstPercent,
            sgstAmount: gstBreakdown.sgstAmount,
            igstPercent: gstBreakdown.igstPercent,
            igstAmount: gstBreakdown.igstAmount,
            taxAmount: gstBreakdown.totalTaxAmount,
            total
          }
        }

        return item
      })
    )
  }, [customerState, customerGST]) // Recalculate when customer changes

  // Load items from DB/local storage
  useEffect(() => {
    let mounted = true
    async function loadItems() {
      try {
        const { getItems } = await import('../services/itemService')
        const items = await getItems()
        if (!mounted) return
        setAvailableItems(
          items.map(i => ({
            id: i.id,
            name: i.name || 'Unnamed Item',
            price: (i.sellingPrice as any) || (i.purchasePrice as any) || 0,
            tax: i.tax?.gstRate || 0,
            unit: i.unit,
            // Multi-unit fields
            hasMultiUnit: i.hasMultiUnit || false,
            baseUnit: i.baseUnit || 'Pcs',
            purchaseUnit: i.purchaseUnit || 'Box',
            piecesPerPurchaseUnit: i.piecesPerPurchaseUnit || 12,
            sellingPricePerPiece: i.sellingPricePerPiece,
            purchasePricePerBox: i.purchasePricePerBox,
            stockBase: i.stockBase || i.stock || 0
          }))
        )
      } catch (error) {
        console.error('Failed to load items for Sales page:', error)
      }
    }
    loadItems()

    // Reload when page becomes visible (e.g., when navigating back from Inventory or Settings)
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        loadItems()
        // Reload column labels in case they were changed in Settings
        setColumnLabels(getInvoiceTableColumnSettings())
      }
    }
    const handleFocus = () => {
      if (mounted) {
        loadItems()
        // Reload column labels in case they were changed in Settings
        setColumnLabels(getInvoiceTableColumnSettings())
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Load parties from DB/local storage with live outstanding balances
  useEffect(() => {
    let mounted = true
    async function loadParties() {
      try {
        setLoadingParties(true)
        // Use getPartiesWithOutstanding to get live outstanding balances (2025 Standard)
        const { getPartiesWithOutstanding } = await import('../services/partyService')
        const parties = await getPartiesWithOutstanding()
        if (!mounted) return
        setAllParties(parties || [])
      } catch (error) {
        console.error('Failed to load parties for Sales page:', error)
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

  // Filter customers based on search
  const filteredCustomers = allParties.filter(party =>
    party.displayName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    party.companyName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    party.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    party.customerName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    party.partyName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    party.fullName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    party.businessName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    party.phone?.includes(customerSearch) ||
    party.email?.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 10) // Limit to 10 results

  // Filter items based on search - show all items if no search text
  const filteredItems = itemSearch.trim()
    ? allItems.filter(item =>
        item.name?.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.barcode?.includes(itemSearch)
      ).slice(0, 10)
    : allItems.slice(0, 10) // Show first 10 items when no search

  // Handle customer selection
  const handleCustomerSelect = (party: any) => {
    // Debug: Log the entire party object
    console.log('🔍 Selected party full data:', party)
    console.log('📝 All keys in party object:', Object.keys(party))
    console.log('🏷️ Name field values:', {
      displayName: party.displayName,
      companyName: party.companyName,
      name: party.name,
      customerName: party.customerName,
      partyName: party.partyName,
      fullName: party.fullName,
      businessName: party.businessName
    })

    // Try ALL possible name field variations
    const customerName = party.displayName ||
                        party.companyName ||
                        party.name ||
                        party.customerName ||
                        party.partyName ||
                        party.fullName ||
                        party.businessName ||
                        'Unknown Customer'

    console.log('✅ Final customer name selected:', customerName)

    // If still unknown, show alert with debug info
    if (customerName === 'Unknown Customer') {
      const allKeys = Object.keys(party).join(', ')
      const nameFieldsStr = JSON.stringify({
        displayName: party.displayName,
        companyName: party.companyName,
        name: party.name,
        customerName: party.customerName,
        partyName: party.partyName,
        fullName: party.fullName,
        businessName: party.businessName
      }, null, 2)
      alert('🔍 DEBUG INFO:\n\nAll fields in customer:\n' + allKeys + '\n\nName field values:\n' + nameFieldsStr)
    }

    setCustomerName(customerName)
    setCustomerPhone(party.phone || '')
    setCustomerEmail(party.email || '')
    setCustomerGST(party.gstDetails?.gstin || '')
    setCustomerState(party.billingAddress?.state || party.state || '')
    setCustomerSearch(customerName)
    setShowCustomerDropdown(false)
    setHighlightedCustomerIndex(-1)
  }

  // Listen for AI Assistant actions
  useEffect(() => {
    if (!lastAction) return

    console.log('🎯 Handling AI action in Sales page:', lastAction)

    // Handle the action based on type
    if (lastAction.data?.action === 'searchCustomer') {
      // If customer found, select it
      if (lastAction.success && lastAction.data?.selectedCustomer) {
        handleCustomerSelect(lastAction.data.selectedCustomer)
        const customer = lastAction.data.selectedCustomer
        const customerDisplayName = customer.name || customer.displayName || customer.companyName || 'Customer'
        toast.success(`Selected customer: ${customerDisplayName}`)
      } else if (lastAction.data?.matches && lastAction.data.matches.length > 0) {
        // Multiple matches - auto-select first one or show dropdown
        handleCustomerSelect(lastAction.data.matches[0])
        if (lastAction.data.matches.length > 1) {
          toast.info(`Selected first of ${lastAction.data.matches.length} matches`)
        }
      }
    } else if (lastAction.data?.action === 'NEW_SALE') {
      // Handle new sale / bill for customer
      if (lastAction.success && lastAction.data?.customer) {
        handleCustomerSelect(lastAction.data.customer)
        const customer = lastAction.data.customer
        const customerDisplayName = customer.name || customer.displayName || customer.companyName || 'Customer'
        toast.success(`New bill for: ${customerDisplayName}`)
      } else if (!lastAction.success && lastAction.data?.alternatives?.length > 0) {
        // Customer not found exactly - show alternatives but DON'T auto-select
        // Let user pick from dropdown instead
        toast.warning(`Customer not found. ${lastAction.data.alternatives.length} similar customers available.`)
        // Open customer dropdown for manual selection
        setShowCustomerDropdown(true)
      } else if (!lastAction.success) {
        toast.error(lastAction.message || 'Customer not found')
      }
    } else if (lastAction.data?.action === 'ADD_ITEM') {
      // Handle add item
      if (lastAction.success && lastAction.data?.item) {
        handleItemSelect(lastAction.data.item)
      }
    } else if (lastAction.data?.action === 'APPLY_DISCOUNT') {
      // Apply discount to invoice
      if (lastAction.success && lastAction.data?.discountPercent) {
        setInvoiceDiscount(lastAction.data.discountPercent)
        toast.success(`Applied ${lastAction.data.discountPercent}% discount`)
      }
    } else if (lastAction.data?.action === 'SET_PAYMENT_MODE') {
      // Set payment mode
      if (lastAction.success && lastAction.data?.mode) {
        setPaymentMode(lastAction.data.mode)
        toast.success(`Payment mode set to ${lastAction.data.mode}`)
      }
    } else if (lastAction.data?.action === 'GENERATE_INVOICE') {
      // Generate/complete invoice
      if (lastAction.success) {
        // If customer data was passed from multi-command flow, select it first
        if (lastAction.data?.customerData) {
          console.log('🔄 Setting customer from multi-command flow:', lastAction.data.customerData)
          handleCustomerSelect(lastAction.data.customerData)
          // Wait for state to update before creating invoice
          setTimeout(() => {
            createInvoice()
          }, 200)
        } else {
          createInvoice()
        }
      }
    } else if (lastAction.data?.action === 'SHOW_TOTAL') {
      // Show total
      if (lastAction.success) {
        const totals = calculateTotals()
        toast.success(`Invoice Total: ₹${totals.total.toLocaleString('en-IN')}`, { duration: 5000 })
      }
    } else if (lastAction.data?.action === 'CLEAR_INVOICE') {
      // Clear invoice
      if (lastAction.success) {
        closeCurrentTab()
        toast.success('Invoice cleared')
      }
    }

    // Clear the action after handling
    clearAction()
  }, [lastAction])

  // Handle item selection from search
  const handleItemSelect = (item: any) => {
    const originalPrice = item.sellingPrice || item.purchasePrice || 0
    const qty = 1
    const discountPercent = 0
    // Get tax rate from inventory - check multiple possible locations
    const taxPercent = item.tax?.gstRate || item.tax?.igst || ((item.tax?.cgst || 0) + (item.tax?.sgst || 0)) || 0

    // Check if item has multi-unit enabled - MUST do this FIRST
    const hasMultiUnitEnabled = item.hasMultiUnit || false
    const baseUnit = item.baseUnit || 'Pcs'
    const purchaseUnit = item.purchaseUnit || 'Box'
    const piecesPerPurchaseUnit = item.piecesPerPurchaseUnit || 12
    const sellingPricePerPiece = item.sellingPricePerPiece || originalPrice

    // For sales, default to base unit (Pcs) so customers can buy individual items
    const selectedUnit = hasMultiUnitEnabled ? baseUnit : (item.unit || 'NONE')

    // Calculate the actual unit price - KEY FIX for multi-unit pricing!
    const unitPrice = hasMultiUnitEnabled
      ? getUnitPrice(selectedUnit, sellingPricePerPiece, piecesPerPurchaseUnit)
      : originalPrice

    // Stock notification when adding item (informational only - doesn't block)
    const stock = item.stock ?? 0
    const lowStockLevel = item.lowStockLevel ?? 5 // Use item's low stock level, default to 5
    if (stock === 0) {
      toast.error(`🚫 OUT OF STOCK - ${item.name}`, { duration: 4000 })
    } else if (stock <= lowStockLevel) {
      // Only show warning if stock is at or below the item's configured low stock alert level
      toast.warning(`⚠️ Low stock: Only ${stock} units available - ${item.name}`, { duration: 3000 })
    }

    console.log('📊 Item selected:', item.name, 'Tax:', taxPercent, 'MultiUnit:', hasMultiUnitEnabled, 'UnitPrice:', unitPrice)

    // Get seller state and tax settings
    const companySettings = getCompanySettings()
    const taxSettings = getTaxSettings()
    const sellerState = companySettings.state || 'Tamil Nadu'
    const itemTaxMode = item.taxMode || taxSettings.defaultTaxMode || 'exclusive'

    // GST Calculation - Vyapar/Standard Logic
    // Exclusive (Without GST): MRP is base price, add GST on top
    // Inclusive (With GST): MRP includes GST, extract base from it
    let taxablePerUnit: number
    let gstPerUnit: number

    if (itemTaxMode === 'inclusive') {
      // With GST: MRP includes GST
      taxablePerUnit = unitPrice / (1 + taxPercent / 100)
      gstPerUnit = unitPrice - taxablePerUnit
    } else {
      // Without GST: MRP is base price
      taxablePerUnit = unitPrice
      gstPerUnit = unitPrice * (taxPercent / 100)
    }

    // Round to 2 decimals
    taxablePerUnit = Math.round(taxablePerUnit * 100) / 100
    gstPerUnit = Math.round(gstPerUnit * 100) / 100

    // Apply discount on taxable amount
    const discountedTaxablePerUnit = taxablePerUnit - (taxablePerUnit * discountPercent / 100)
    const discountAmount = (taxablePerUnit - discountedTaxablePerUnit) * qty
    const taxableAmount = discountedTaxablePerUnit * qty

    // Calculate GST breakdown based on seller and customer states
    const gstBreakdown = calculateGSTBreakdown({
      taxableAmount,
      gstRate: taxPercent,
      sellerState,
      customerState: customerState,
      customerGSTIN: customerGST
    })

    console.log('💰 GST Breakdown:', gstBreakdown, 'TaxMode:', itemTaxMode, 'TaxablePerUnit:', taxablePerUnit)

    const total = taxableAmount + gstBreakdown.totalTaxAmount

    addItem({
      id: `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      qty,
      unit: selectedUnit,
      price: unitPrice,
      basePrice: taxablePerUnit, // Store taxable (base) price for display
      discount: discountPercent,
      discountAmount,
      tax: taxPercent,
      taxMode: itemTaxMode, // Use determined tax mode
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
      description: item.description,
      itemId: item.id,
      availableStock: item.stock,
      // Multi-Unit fields
      hasMultiUnit: hasMultiUnitEnabled,
      baseUnit,
      purchaseUnit,
      piecesPerPurchaseUnit,
      sellingPricePerPiece,
      selectedUnit,
      qtyInBaseUnits: hasMultiUnitEnabled ? getBaseQtyForSale(selectedUnit, qty, piecesPerPurchaseUnit) : undefined
    })
    setItemSearch('')
    setShowItemDropdown(false)
    setHighlightedItemIndex(-1)

    // Auto-focus and scroll into view the search input for next item
    setTimeout(() => {
      itemSearchInputRef.current?.focus()
      setShowItemDropdown(true)
      // Avoid smooth scrolling on mobile to prevent viewport shaking
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        itemSearchInputRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' })
      }
    }, 100)
  }

  // Reset customer form
  const resetCustomerForm = () => {
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewCustomerEmail('')
    setNewCustomerGST('')
    setNewCustomerAddress('')
    setNewCustomerState('')
    setNewCustomerType('Regular')
    setNewCustomerNotes('')
    setNewCustomerOpeningBalance('')
    setNewCustomerCreditDays(30)
    setShowAddressField(false)
    setShowStateField(false)
    setShowGstField(false)
    setShowEmailField(false)
    setShowCustomerTypeField(false)
    setShowNotesField(false)
    setShowOpeningBalanceField(false)
    setShowCreditDaysField(false)
  }

  // Handle saving new customer
  const handleSaveNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Please enter customer name')
      return
    }

    setSavingCustomer(true)
    try {
      const { createParty } = await import('../services/partyService')
      const openingBal = parseFloat(newCustomerOpeningBalance) || 0
      const newParty = await createParty({
        name: newCustomerName.trim(),
        type: 'customer',
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
        gstin: newCustomerGST.trim() || undefined,
        billingAddress: newCustomerAddress.trim() || undefined,
        state: newCustomerState.trim() || undefined,
        openingBalance: openingBal,
        balance: openingBal,
        creditDays: newCustomerCreditDays
      })

      if (newParty) {
        // Auto-fill customer details in invoice
        setCustomerName(newParty.name)
        setCustomerPhone(newParty.phone || '')
        setCustomerEmail(newParty.email || '')
        setCustomerGST(newParty.gstin || '')
        setCustomerState(newParty.state || '')
        setCustomerSearch(newParty.name)

        // Add to parties list
        setAllParties(prev => [newParty, ...prev])

        // Clear form and close modal
        resetCustomerForm()
        setShowAddCustomerModal(false)

        toast.success('Customer added successfully!')

        // Refresh parties list in ModernPOS if it's open
        if ((window as any).__modernPOSRefreshParties) {
          (window as any).__modernPOSRefreshParties()
        }
      } else {
        toast.error('Failed to create customer')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('Failed to create customer')
    } finally {
      setSavingCustomer(false)
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
    setNewItemWholesalePrice('')
    setNewItemPurchasePrice('')
    setNewItemGstRate('18')
    setNewItemCategory('stationery')
    setNewItemHsnCode('')
    setNewItemStockQty('')
    setNewItemLowStockAlert('')
    setNewItemBrand('')
    setNewItemBarcode('')
    setNewItemDescription('')
    setNewItemType('sales')
    // Reset expandable sections
    setShowNewItemDescriptionAI(false)
    setShowNewItemWholesalePrice(false)
    setShowNewItemPurchasePrice(false)
    setShowNewItemHSN(false)
    setShowNewItemLowStockAlert(false)
    setShowNewItemBrand(false)
    setShowNewItemBarcode(false)
    // Reset autocomplete
    setNewItemSuggestions([])
    setShowNewItemSuggestions(false)
    setSelectedNewItemIndex(-1)
  }

  // Handle item name change with autocomplete (matching Inventory page)
  const handleNewItemNameChange = (value: string) => {
    setNewItemName(value)
    
    if (value.length >= 2) {
      const suggestions = searchItems(value)
      setNewItemSuggestions(suggestions)
      setShowNewItemSuggestions(suggestions.length > 0)
      setSelectedNewItemIndex(-1)
    } else {
      setNewItemSuggestions([])
      setShowNewItemSuggestions(false)
    }
  }

  // Auto-fill all fields when item is selected from suggestions (matching Inventory page)
  const handleSelectNewItemSuggestion = (masterItem: MasterItem) => {
    // Fill item name
    setNewItemName(masterItem.name)

    // Auto-fill Category with proper mapping
    const categoryMap: { [key: string]: string } = {
      'Dairy & Milk Products': 'grocery',
      'Biscuits & Cookies': 'grocery',
      'Atta & Flour': 'grocery',
      'Oil & Ghee': 'grocery',
      'Rice & Pulses': 'grocery',
      'Instant Noodles': 'grocery',
      'Salt & Spices': 'grocery',
      'Health Drinks': 'grocery',
      'Beverages': 'grocery',
      'Toothpaste & Oral Care': 'cosmetics',
      'Soap & Body Wash': 'cosmetics',
      'Personal Care': 'cosmetics',
      'Sanitary Napkins': 'cosmetics',
      'Baby Care': 'cosmetics',
      'Condoms & Contraceptives': 'cosmetics',
      'Detergent & Laundry': 'home',
      'Medicines & Health': 'cosmetics',
      'Electronics': 'electronics',
      'Stationery': 'stationery'
    }
    setNewItemCategory(categoryMap[masterItem.category] || 'other')

    // Auto-fill Unit Type
    const unitMap: { [key: string]: string } = {
      'Pieces': 'pcs',
      'Kilograms': 'kg',
      'Grams': 'g',
      'Litres': 'l',
      'Millilitres': 'ml',
      'Packets': 'pack',
      'Jars': 'pcs',
      'Meters': 'm'
    }
    setNewItemUnit(unitMap[masterItem.unit] || 'pcs')

    // Auto-fill Description
    setNewItemDescription(masterItem.description || `${masterItem.name} - Premium Quality`)

    // Auto-fill Retail Price (MRP)
    setNewItemRetailPrice(masterItem.mrp.toString())

    // Auto-fill Purchase Price
    setNewItemPurchasePrice(masterItem.purchase_price.toString())
    setShowNewItemPurchasePrice(true)

    // Auto-fill Wholesale Price (70% of MRP)
    const wholesalePrice = (masterItem.mrp * 0.7).toFixed(2)
    setNewItemWholesalePrice(wholesalePrice)
    setShowNewItemWholesalePrice(true)

    // Auto-fill GST Rate
    setNewItemGstRate(masterItem.gst_rate.toString())

    // Auto-fill HSN Code
    setNewItemHsnCode(masterItem.hsn)
    setShowNewItemHSN(true)

    // Close suggestions
    setShowNewItemSuggestions(false)
    setNewItemSuggestions([])

    // Show success toast
    toast.success('🎉 All fields auto-filled! Like magic!', {
      description: `${masterItem.name} ready to add`,
      duration: 2000
    })
  }

  // Handle keyboard navigation in autocomplete
  const handleNewItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showNewItemSuggestions || newItemSuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedNewItemIndex(prev => prev < newItemSuggestions.length - 1 ? prev + 1 : 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedNewItemIndex(prev => prev > 0 ? prev - 1 : newItemSuggestions.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedNewItemIndex >= 0 && selectedNewItemIndex < newItemSuggestions.length) {
        handleSelectNewItemSuggestion(newItemSuggestions[selectedNewItemIndex])
      }
    } else if (e.key === 'Escape') {
      setShowNewItemSuggestions(false)
      setSelectedNewItemIndex(-1)
    }
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

      console.log('📦 Item created from Sales page:', savedItem)

      if (savedItem) {
        // Update local item lists
        setAllItems(prev => {
          const updated = [savedItem, ...prev]
          console.log('✅ Updated allItems in Sales:', updated.length, 'items')
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

        // Immediately add to current invoice
        handleItemSelect(savedItem)

        toast.success('Item added successfully!')
        resetNewItemForm()
        setShowAddItemModal(false)
      } else {
        console.error('❌ Failed to create item - createItem returned null')
        toast.error('Failed to add item')
      }
    } catch (error) {
      console.error('Error adding item from Sales page:', error)
      toast.error('Failed to add item. Please try again.')
    } finally {
      setSavingItem(false)
    }
  }

  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)

  // Calculate real-time dashboard statistics from invoices - recalculates when invoices change
  const dashboardStats = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // Get start date based on filter
    const getStartDate = () => {
      const d = new Date()
      switch (statsFilter) {
        case 'today':
          return today
        case 'week':
          d.setDate(d.getDate() - 7)
          return d.toISOString().split('T')[0]
        case 'month':
          d.setMonth(d.getMonth() - 1)
          return d.toISOString().split('T')[0]
        case 'year':
          d.setFullYear(d.getFullYear() - 1)
          return d.toISOString().split('T')[0]
        case 'custom':
          return customDateFrom
        default:
          return '1900-01-01' // All time
      }
    }
    const startDate = getStartDate()

    // Filter invoices by selected period and source (POS vs regular invoices)
    const isPOSView = location.pathname === '/pos' || salesMode === 'pos'
    const filteredInvoices = invoices.filter(inv => {
      // Filter by source - POS page shows only POS, Sales page shows only Sales (not POS)
      if (isPOSView && inv.source !== 'pos') return false
      if (!isPOSView && inv.source === 'pos') return false

      if (statsFilter === 'all') return true
      if (statsFilter === 'custom') {
        return inv.date >= customDateFrom && inv.date <= customDateTo
      }
      return inv.date >= startDate
    })

    // Previous period for comparison
    const getPrevPeriodInvoices = () => {
      const d = new Date()
      let prevStart: string, prevEnd: string
      switch (statsFilter) {
        case 'today':
          d.setDate(d.getDate() - 1)
          prevStart = d.toISOString().split('T')[0]
          prevEnd = prevStart
          break
        case 'week':
          d.setDate(d.getDate() - 14)
          prevStart = d.toISOString().split('T')[0]
          d.setDate(d.getDate() + 7)
          prevEnd = d.toISOString().split('T')[0]
          break
        case 'month':
          d.setMonth(d.getMonth() - 2)
          prevStart = d.toISOString().split('T')[0]
          d.setMonth(d.getMonth() + 1)
          prevEnd = d.toISOString().split('T')[0]
          break
        case 'year':
          d.setFullYear(d.getFullYear() - 2)
          prevStart = d.toISOString().split('T')[0]
          d.setFullYear(d.getFullYear() + 1)
          prevEnd = d.toISOString().split('T')[0]
          break
        default:
          return []
      }
      return invoices.filter(inv => {
        // Filter by source - POS page shows only POS, Sales page shows only Sales (not POS)
        if (isPOSView && inv.source !== 'pos') return false
        if (!isPOSView && inv.source === 'pos') return false
        return inv.date >= prevStart && inv.date <= prevEnd
      })
    }
    const prevPeriodInvoices = getPrevPeriodInvoices()

    // Sales for selected period
    const periodSales = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
    const prevPeriodSales = prevPeriodInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
    const growthPercent = prevPeriodSales > 0 ? Math.round(((periodSales - prevPeriodSales) / prevPeriodSales) * 100) : 0

    // Paid collected for period
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
    const customersPaid = new Set(filteredInvoices.filter(inv => (inv.paidAmount || 0) > 0).map(inv => inv.partyId || inv.partyName)).size

    // Pending recovery for period
    const pendingInvoices = filteredInvoices.filter(inv => (inv.total || 0) > (inv.paidAmount || 0))
    const pendingRecovery = pendingInvoices.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paidAmount || 0)), 0)

    return {
      periodSales,
      growthPercent,
      totalPaid,
      customersPaid,
      pendingRecovery,
      pendingCount: pendingInvoices.length,
      invoiceCount: filteredInvoices.length
    }
  }, [invoices, statsFilter, customDateFrom, customDateTo, salesMode, location.pathname])

  // Load invoices from database on mount
  useEffect(() => {
    loadInvoicesFromDatabase().catch(err => {
      console.error('Failed to load invoices:', err)
      setIsLoadingInvoices(false)
    })
  }, [])

  // Click outside to close customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomerDropdown])

  // Click outside to close item dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false)
        setHighlightedItemIndex(-1)
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
        setShowCustomerDropdown(false)
        setShowItemDropdown(false)
        setHighlightedItemIndex(-1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const statusConfig = {
    paid: { icon: CheckCircle, color: 'success', label: 'Paid' },
    partial: { icon: Clock, color: 'warning', label: 'Partial' },
    pending: { icon: Clock, color: 'destructive', label: 'Pending' },
    overdue: { icon: XCircle, color: 'destructive', label: 'Overdue' },
    returned: { icon: ArrowUUpLeft, color: 'slate', label: 'Returned' }
  }

  const addItem = (item: InvoiceItem | typeof availableItems[0]) => {
    // Get seller state for GST calculation
    const companySettings = getCompanySettings()
    const taxSettings = getTaxSettings()
    const sellerState = companySettings.state || 'Tamil Nadu'
    const defaultTaxMode = taxSettings.defaultTaxMode || 'exclusive'

    // Helper function to check if two items are the same (can be merged)
    const isSameItem = (existingItem: InvoiceItem, newName: string, newPrice: number, newTax: number, newTaxMode: string, newDiscount: number) => {
      return existingItem.name === newName &&
             existingItem.price === newPrice &&
             existingItem.tax === newTax &&
             existingItem.taxMode === newTaxMode &&
             existingItem.discount === newDiscount
    }

    // Check if item is already a complete InvoiceItem
    if ('qty' in item && 'unit' in item && 'discountAmount' in item) {
      const existing = item as InvoiceItem
      const price = Number(existing.price) || 0
      const qty = Number(existing.qty) || 1
      const discountPercent = Number(existing.discount) || 0
      const taxPercent = Number(existing.tax) || 0
      const taxMode = existing.taxMode || defaultTaxMode

      // Check for existing item with same properties
      const existingItemIndex = invoiceItems.findIndex(i =>
        isSameItem(i, existing.name, price, taxPercent, taxMode, discountPercent)
      )

      if (existingItemIndex !== -1) {
        // Item exists, increase quantity
        const existingItem = invoiceItems[existingItemIndex]
        const newQty = existingItem.qty + qty
        updateItem(existingItem.id, 'qty', newQty)
        return
      }

      // IMPORTANT: For inclusive items, extract base price first
      let taxablePerUnit: number
      if (taxMode === 'inclusive') {
        // With GST: price includes GST, extract base
        taxablePerUnit = price / (1 + taxPercent / 100)
      } else {
        // Without GST: price is the base
        taxablePerUnit = price
      }
      taxablePerUnit = Math.round(taxablePerUnit * 100) / 100

      const discountedTaxablePerUnit = taxablePerUnit - (taxablePerUnit * discountPercent / 100)
      const discountAmount = (taxablePerUnit - discountedTaxablePerUnit) * qty
      const taxableAmount = discountedTaxablePerUnit * qty

      // Calculate GST breakdown
      const gstBreakdown = calculateGSTBreakdown({
        taxableAmount,
        gstRate: taxPercent,
        sellerState,
        customerState: customerState,
        customerGSTIN: customerGST
      })

      // Total: for inclusive, MRP × qty; for exclusive, taxable + GST
      const total = taxMode === 'inclusive'
        ? price * qty
        : taxableAmount + gstBreakdown.totalTaxAmount

      const normalizedItem: InvoiceItem = {
        ...existing,
        id: existing.id.includes('_') ? existing.id : `${existing.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taxMode, // Set default tax mode
        basePrice: taxablePerUnit, // Store taxable (base) price for display
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

      setInvoiceItems([...invoiceItems, normalizedItem])
    } else {
      // Convert from availableItems format
      const oldItem = item as typeof availableItems[0]
      const originalPrice = Number(oldItem.price) || 0
      const qty = 1
      const discountPercent = 0
      const taxPercent = Number(oldItem.tax) || 0

      // Check if item has multi-unit enabled (from inventory) - MUST do this FIRST
      const itemWithMultiUnit = oldItem as any
      const hasMultiUnitEnabled = itemWithMultiUnit.hasMultiUnit || false
      const baseUnit = itemWithMultiUnit.baseUnit || 'Pcs'
      const purchaseUnit = itemWithMultiUnit.purchaseUnit || 'Box'
      const piecesPerPurchaseUnit = itemWithMultiUnit.piecesPerPurchaseUnit || 12
      const sellingPricePerPiece = itemWithMultiUnit.sellingPricePerPiece || originalPrice

      // For sales, default to base unit (Pcs) so customers can buy individual items
      const selectedUnit = hasMultiUnitEnabled ? baseUnit : (oldItem.unit || 'NONE')

      // Calculate the actual unit price BEFORE other calculations
      const unitPrice = hasMultiUnitEnabled
        ? getUnitPrice(selectedUnit, sellingPricePerPiece, piecesPerPurchaseUnit)
        : originalPrice

      // Check for existing item with same properties (use unitPrice for comparison)
      const existingItemIndex = invoiceItems.findIndex(i =>
        isSameItem(i, oldItem.name, unitPrice, taxPercent, defaultTaxMode, discountPercent)
      )

      if (existingItemIndex !== -1) {
        // Item exists, increase quantity by 1
        const existingItem = invoiceItems[existingItemIndex]
        const newQty = existingItem.qty + 1
        updateItem(existingItem.id, 'qty', newQty)
        return
      }

      // IMPORTANT: For inclusive items, extract base price first
      let taxablePerUnit: number
      if (defaultTaxMode === 'inclusive') {
        // With GST: unitPrice includes GST, extract base
        taxablePerUnit = unitPrice / (1 + taxPercent / 100)
      } else {
        // Without GST: unitPrice is the base
        taxablePerUnit = unitPrice
      }
      taxablePerUnit = Math.round(taxablePerUnit * 100) / 100

      const discountedTaxablePerUnit = taxablePerUnit - (taxablePerUnit * discountPercent / 100)
      const discountAmount = (taxablePerUnit - discountedTaxablePerUnit) * qty
      const taxableAmount = discountedTaxablePerUnit * qty

      // Calculate GST breakdown
      const gstBreakdown = calculateGSTBreakdown({
        taxableAmount,
        gstRate: taxPercent,
        sellerState,
        customerState: customerState,
        customerGSTIN: customerGST
      })

      // Total: for inclusive, MRP × qty; for exclusive, taxable + GST
      const total = defaultTaxMode === 'inclusive'
        ? unitPrice * qty
        : taxableAmount + gstBreakdown.totalTaxAmount

      const newItem: InvoiceItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        itemId: oldItem.id, // Store the item ID for inventory tracking
        name: oldItem.name,
        qty,
        unit: selectedUnit,
        price: unitPrice,
        basePrice: taxablePerUnit, // Store taxable (base) price for display
        discount: discountPercent,
        discountAmount,
        tax: taxPercent,
        taxAmount: gstBreakdown.totalTaxAmount,
        taxMode: defaultTaxMode, // Set default tax mode from settings
        cgstPercent: gstBreakdown.cgstPercent,
        cgstAmount: gstBreakdown.cgstAmount,
        sgstPercent: gstBreakdown.sgstPercent,
        sgstAmount: gstBreakdown.sgstAmount,
        igstPercent: gstBreakdown.igstPercent,
        igstAmount: gstBreakdown.igstAmount,
        total,
        // Multi-Unit fields
        hasMultiUnit: hasMultiUnitEnabled,
        baseUnit,
        purchaseUnit,
        piecesPerPurchaseUnit,
        sellingPricePerPiece,
        selectedUnit,
        qtyInBaseUnits: hasMultiUnitEnabled ? getBaseQtyForSale(selectedUnit, qty, piecesPerPurchaseUnit) : undefined
      }
      setInvoiceItems([...invoiceItems, newItem])
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    // Get seller state for GST calculation
    const companySettings = getCompanySettings()
    const sellerState = companySettings.state || 'Tamil Nadu'

    setInvoiceItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== id) return item

        let updated: InvoiceItem = { ...item, [field]: value }

        // Handle unit change for multi-unit items - recalculate price
        // Check for both 'unit' and 'selectedUnit' field changes
        if ((field === 'selectedUnit' || field === 'unit') && item.hasMultiUnit) {
          const newUnit = value as string
          const pricePerPiece = item.sellingPricePerPiece || item.price
          const conversionFactor = item.piecesPerPurchaseUnit || 12
          updated.price = getUnitPrice(newUnit, pricePerPiece, conversionFactor)
          updated.unit = newUnit
          updated.selectedUnit = newUnit
          console.log('🔄 Unit changed to:', newUnit, 'New price:', updated.price)
        }

        // Handle taxMode change - convert price between inclusive/exclusive
        if (field === 'taxMode' && item.taxMode !== value) {
          const oldMode = item.taxMode || 'exclusive'
          const newMode = value as 'inclusive' | 'exclusive'
          const currentPrice = Number(item.price) || 0
          const taxRate = Number(item.tax) || 0

          if (oldMode === 'exclusive' && newMode === 'inclusive') {
            // Converting from base price to inclusive price
            updated.price = currentPrice * (1 + taxRate / 100)
          } else if (oldMode === 'inclusive' && newMode === 'exclusive') {
            // Converting from inclusive price to base price
            updated.price = currentPrice / (1 + taxRate / 100)
          }
          updated.price = parseFloat(updated.price.toFixed(2))
        }

        // Stock notification (informational only - doesn't block or limit quantity)
        if (field === 'qty' && item.availableStock !== undefined) {
          const requestedQty = Number(value) || 1
          // For multi-unit items, convert to base units for comparison
          if (item.hasMultiUnit) {
            const qtyInBase = getBaseQtyForSale(updated.selectedUnit || item.baseUnit || 'Pcs', requestedQty, item.piecesPerPurchaseUnit || 12)
            if (qtyInBase > item.availableStock) {
              const stockDisplay = getStockDisplay(item.availableStock, item.piecesPerPurchaseUnit || 12, item.purchaseUnit || 'Box', item.baseUnit || 'Pcs')
              toast.warning(`⚠️ Only ${stockDisplay.displayText} available - ${item.name}`, { duration: 3000 })
            }
          } else {
            if (requestedQty > item.availableStock) {
              if (item.availableStock === 0) {
                toast.error(`🚫 OUT OF STOCK - ${item.name}`, { duration: 4000 })
              } else {
                toast.warning(`⚠️ Only ${item.availableStock} units available - ${item.name}`, { duration: 3000 })
              }
            }
          }
        }

        const price = Number(updated.price) || 0
        const qty = Number(updated.qty) || 1
        const discountPercent = Number(updated.discount) || 0
        const taxPercent = Number(updated.tax) || 0
        const taxMode = updated.taxMode || 'exclusive' // Default to exclusive
        const isInterstate = sellerState !== customerState

        // GST Calculation - Vyapar/Standard Logic
        // Exclusive (Without GST): MRP is base price, add GST on top
        // Inclusive (With GST): MRP includes GST, extract base from it

        let taxablePerUnit: number
        let gstPerUnit: number
        let totalPerUnit: number

        if (taxMode === 'inclusive') {
          // With GST: MRP includes GST
          // total = mrp, taxable = total / (1 + rate), gst = total - taxable
          totalPerUnit = price
          taxablePerUnit = price / (1 + taxPercent / 100)
          gstPerUnit = price - taxablePerUnit
        } else {
          // Without GST: MRP is base price
          // taxable = mrp, gst = taxable × rate, total = taxable + gst
          taxablePerUnit = price
          gstPerUnit = price * (taxPercent / 100)
          totalPerUnit = price + gstPerUnit
        }

        // Round to 2 decimals
        taxablePerUnit = Math.round(taxablePerUnit * 100) / 100
        gstPerUnit = Math.round(gstPerUnit * 100) / 100
        totalPerUnit = Math.round(totalPerUnit * 100) / 100

        // Apply discount on taxable (base) amount
        const discountedTaxablePerUnit = taxablePerUnit - (taxablePerUnit * discountPercent / 100)
        const discountAmount = (taxablePerUnit - discountedTaxablePerUnit) * qty
        const taxableAmount = discountedTaxablePerUnit * qty

        // Recalculate GST on discounted taxable amount
        const gstBreakdown = calculateGSTBreakdown({
          taxableAmount,
          gstRate: taxPercent,
          sellerState,
          customerState: customerState,
          customerGSTIN: customerGST
        })

        // Final total: for inclusive, recalculate based on discounted taxable
        // For exclusive, add GST to discounted taxable
        const total = taxableAmount + gstBreakdown.totalTaxAmount

        // DEBUG - Remove after testing
        console.log('🧮 GST CALC DEBUG:', {
          field,
          value,
          price,
          taxMode,
          taxPercent,
          taxablePerUnit,
          taxableAmount,
          gstFromBreakdown: gstBreakdown.totalTaxAmount,
          total
        })

        // Calculate base units for multi-unit items
        let qtyInBaseUnits = updated.qtyInBaseUnits
        if (updated.hasMultiUnit) {
          const selectedUnit = updated.selectedUnit || updated.baseUnit || 'Pcs'
          qtyInBaseUnits = getBaseQtyForSale(selectedUnit, qty, updated.piecesPerPurchaseUnit || 12)
        }

        return {
          ...updated,
          basePrice: taxablePerUnit, // Store taxable (base) price for display
          discountAmount,
          taxAmount: gstBreakdown.totalTaxAmount,
          cgstPercent: gstBreakdown.cgstPercent,
          cgstAmount: gstBreakdown.cgstAmount,
          sgstPercent: gstBreakdown.sgstPercent,
          sgstAmount: gstBreakdown.sgstAmount,
          igstPercent: gstBreakdown.igstPercent,
          igstAmount: gstBreakdown.igstAmount,
          total,
          qtyInBaseUnits
        }
      })
    )
  }

  // Update individual tax components manually (for manual override)
  const updateItemTax = (id: string, taxField: 'cgstPercent' | 'sgstPercent' | 'igstPercent', value: number) => {
    setInvoiceItems(prevItems =>
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
    setInvoiceItems(invoiceItems.filter(item => item.id !== id))
  }

  // Add empty manual row at the top of the items list
  const addEmptyRow = () => {
    const taxSettings = getTaxSettings()
    const defaultTaxMode = taxSettings.defaultTaxMode || 'exclusive'
    const newEmptyItem: InvoiceItem = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: '',
      qty: 1,
      unit: 'PCS',
      price: 0,
      discount: 0,
      discountAmount: 0,
      tax: 0,
      taxAmount: 0,
      cgstPercent: 0,
      cgstAmount: 0,
      sgstPercent: 0,
      sgstAmount: 0,
      igstPercent: 0,
      igstAmount: 0,
      total: 0,
      taxMode: defaultTaxMode
    }
    // Add at the end (bottom) of the list
    setInvoiceItems([...invoiceItems, newEmptyItem])
  }

  const calculateTotals = () => {
    const companySettings = getCompanySettings()
    const sellerState = companySettings.state || 'Tamil Nadu'

    console.log(`💰 Calculating Totals - Seller: ${sellerState}, Customer: ${customerState || '(none)'}`)

    // Calculate GST breakdown totals and taxable subtotal
    // Use basePrice (taxable value) for subtotal - NOT item.price which may include GST
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0
    let taxableSubtotal = 0

    // IMPORTANT: Always recalculate GST based on current transaction type
    // This ensures consistent CGST/SGST OR IGST (never mixed)
    invoiceItems.forEach(item => {
      // Use basePrice for taxable amount (this is the value without GST)
      // For inclusive items: basePrice = price / (1 + tax/100)
      // For exclusive items: basePrice = price
      const basePrice = item.basePrice !== undefined ? item.basePrice : item.price
      const discountedBase = basePrice - (basePrice * (item.discount || 0) / 100)
      const lineTaxable = discountedBase * item.qty
      taxableSubtotal += lineTaxable

      // ALWAYS recalculate GST breakdown based on current seller/customer state
      // This prevents mixed CGST/SGST + IGST when items were added at different times
      const gstBreakdown = calculateGSTBreakdown({
        taxableAmount: lineTaxable,
        gstRate: item.tax || 0,
        sellerState,
        customerState: customerState,
        customerGSTIN: customerGST
      })
      
      console.log(`  Item: ${item.name} - CGST: ₹${gstBreakdown.cgstAmount}, SGST: ₹${gstBreakdown.sgstAmount}, IGST: ₹${gstBreakdown.igstAmount}`)
      totalCGST += gstBreakdown.cgstAmount
      totalSGST += gstBreakdown.sgstAmount
      totalIGST += gstBreakdown.igstAmount
    })

    // Apply invoice-level discount on taxable subtotal
    const discount = discountType === 'percent'
      ? taxableSubtotal * (invoiceDiscount / 100)
      : invoiceDiscount
    const subtotalAfterDiscount = taxableSubtotal - discount

    // GST should be calculated on discounted amount (GST compliance)
    // Proportionally reduce GST when invoice-level discount is applied
    const discountRatio = taxableSubtotal > 0 ? subtotalAfterDiscount / taxableSubtotal : 1
    const adjustedCGST = totalCGST * discountRatio
    const adjustedSGST = totalSGST * discountRatio
    const adjustedIGST = totalIGST * discountRatio
    const totalTax = adjustedCGST + adjustedSGST + adjustedIGST

    // Total = Taxable Subtotal + GST (this is correct for both inclusive and exclusive)
    // For inclusive: basePrice is already extracted, so adding tax back gives correct total
    // For exclusive: basePrice = price, adding tax gives correct total
    const totalBeforeRound = subtotalAfterDiscount + totalTax

    // Calculate round off amount - round only the final customer amount
    const roundOffAmount = roundOff ? (Math.round(totalBeforeRound) - totalBeforeRound) : 0
    const total = roundOff ? Math.round(totalBeforeRound) : totalBeforeRound

    const result = {
      subtotal: Math.round(taxableSubtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      total: Math.round(total * 100) / 100,
      totalCGST: Math.round(adjustedCGST * 100) / 100,
      totalSGST: Math.round(adjustedSGST * 100) / 100,
      totalIGST: Math.round(adjustedIGST * 100) / 100,
      roundOffAmount: Math.round(roundOffAmount * 100) / 100
    }

    console.log(`📊 FINAL TOTALS: CGST=₹${result.totalCGST}, SGST=₹${result.totalSGST}, IGST=₹${result.totalIGST}, Tax=₹${result.totalTax}`)

    return result
  }

  // Use useMemo to ensure totals are recalculated only after invoiceItems are updated by useEffect
  // This prevents race conditions where calculateTotals() runs before useEffect finishes updating items
  const totals = useMemo(() => calculateTotals(), [
    invoiceItems,
    invoiceDiscount,
    discountType,
    roundOff,
    customerState,
    customerGST
  ])

  // Generate PDF filename: Invoice_INV-2025-26-0020_Gane_20112025.pdf
  const generatePDFFilename = () => {
    const date = new Date(invoiceDate)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const formattedDate = `${day}${month}${year}`

    // Clean customer name - remove special characters and spaces
    const cleanCustomerName = customerName.trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20) || 'Customer'

    // Clean invoice number - remove special characters
    const cleanInvoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')

    return `Invoice_${cleanInvoiceNumber}_${cleanCustomerName}_${formattedDate}.pdf`
  }

  // Handle successful UPI payment
  const handleUPIPaymentSuccess = async (transactionId: string) => {
    if (!pendingInvoiceData) return

    try {
      // Update invoice data with payment status
      const invoiceData = {
        ...pendingInvoiceData,
        payment: {
          ...pendingInvoiceData.payment,
          status: 'paid' as const,
          paidAmount: pendingInvoiceData.grandTotal,
          dueAmount: 0,
          transactionId: transactionId
        }
      }

      // Save to database
      const savedInvoice = await createInvoiceService(invoiceData)

      if (savedInvoice) {
        // Save payment status
        savePaymentStatus({
          paymentId: transactionId,
          orderId: invoiceData.invoiceNumber,
          method: 'upi',
          amount: invoiceData.grandTotal,
          status: 'success',
          transactionId: transactionId,
          timestamp: new Date().toISOString(),
          customerName: invoiceData.partyName,
          customerPhone: invoiceData.partyPhone
        })

        toast.success(`Invoice ${invoiceData.invoiceNumber} created & payment received!`)

        // Reload invoices list
        await loadInvoicesFromDatabase()

        // Close modal and reset form
        setShowUPIModal(false)
        setPendingInvoiceData(null)
        setCurrentPaymentDetails(null)
        closeCurrentTab()

        // Redirect to list page (POS list if on /pos route)
        if (location.pathname === '/pos') {
          setSalesMode('pos')
          setShowCafePOS(false)
          localStorage.setItem('pos_viewMode', 'list')
        }
        setViewMode('list')
      } else {
        toast.error('Failed to create invoice. Please try again.')
      }
    } catch (error) {
      console.error('Error creating invoice with payment:', error)
      toast.error('Error creating invoice. Please try again.')
    }
  }

  // Handle UPI payment cancellation
  const handleUPIPaymentCancel = () => {
    setShowUPIModal(false)
    setPendingInvoiceData(null)
    setCurrentPaymentDetails(null)
    toast.info('Payment cancelled. Invoice not created.')
  }

  // Handle successful card payment
  const handleCardPaymentSuccess = async (transactionId: string) => {
    if (!pendingInvoiceData) return

    try {
      // Update invoice data with payment status
      const invoiceData = {
        ...pendingInvoiceData,
        payment: {
          ...pendingInvoiceData.payment,
          status: 'paid' as const,
          paidAmount: pendingInvoiceData.grandTotal,
          dueAmount: 0,
          transactionId: transactionId
        }
      }

      // Save to database
      const savedInvoice = await createInvoiceService(invoiceData)

      if (savedInvoice) {
        // Save payment status
        savePaymentStatus({
          paymentId: transactionId,
          orderId: invoiceData.invoiceNumber,
          method: 'card',
          amount: invoiceData.grandTotal,
          status: 'success',
          transactionId: transactionId,
          timestamp: new Date().toISOString(),
          customerName: invoiceData.partyName,
          customerPhone: invoiceData.partyPhone
        })

        toast.success(`Invoice ${invoiceData.invoiceNumber} created & payment received!`)

        // Reload invoices list
        await loadInvoicesFromDatabase()

        // Close modal and reset form
        setShowCardModal(false)
        setPendingInvoiceData(null)
        setCurrentCardPaymentRequest(null)
        closeCurrentTab()

        // Redirect to list page (POS list if on /pos route)
        if (location.pathname === '/pos') {
          setSalesMode('pos')
          setShowCafePOS(false)
          localStorage.setItem('pos_viewMode', 'list')
        }
        setViewMode('list')
      } else {
        toast.error('Failed to create invoice. Please try again.')
      }
    } catch (error) {
      console.error('Error creating invoice with payment:', error)
      toast.error('Error creating invoice. Please try again.')
    }
  }

  // Handle card payment cancellation
  const handleCardPaymentCancel = () => {
    setShowCardModal(false)
    setPendingInvoiceData(null)
    setCurrentCardPaymentRequest(null)
    toast.info('Payment cancelled. Invoice not created.')
  }

  // Build current form data as invoice object (without saving to database)
  // Used for preview actions like e-invoice, e-way bill, share, print
  const buildCurrentInvoiceData = () => {
    if (!customerName || invoiceItems.length === 0) {
      return null
    }

    const totals = calculateTotals()
    const totalPaidAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount.toString()) || 0), 0)

    let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending'
    if (totalPaidAmount >= totals.total) {
      paymentStatus = 'paid'
    } else if (totalPaidAmount > 0) {
      paymentStatus = 'partial'
    }

    return {
      id: `preview_${Date.now()}`,
      type: 'sale' as const,
      invoiceNumber,
      invoiceDate,
      date: invoiceDate,
      partyName: customerName,
      partyPhone: customerPhone || '',
      partyEmail: customerEmail || '',
      partyGSTIN: customerGST || '',
      items: invoiceItems.map((item, index) => ({
        id: `item_${index}`,
        itemId: item.itemId,
        description: item.name,
        name: item.name,
        hsn: item.hsnCode || '',
        hsnCode: item.hsnCode || '',
        quantity: item.qty,
        qty: item.qty,
        unit: item.unit || 'pcs',
        rate: item.price,
        price: item.price,
        discount: item.discount,
        taxRate: item.tax,
        tax: item.tax,
        amount: item.total,
        total: item.total
      })),
      subtotal: totals.subtotal,
      tax: totals.totalTax,
      totalTaxAmount: totals.totalTax,
      total: totals.total,
      grandTotal: totals.total,
      paidAmount: totalPaidAmount,
      paymentStatus,
      paymentMode: payments.length > 0 ? payments[0].type : paymentMode
    }
  }

  // Create invoice only (without payment requirement) - for traditional invoicing
  const createInvoiceOnly = async (): Promise<any> => {
    // Prevent double submission
    if (isCreatingInvoice) {
      console.log('Invoice creation already in progress, skipping...')
      return null
    }

    if (!customerName || invoiceItems.length === 0) {
      toast.error('Please fill customer name and add at least one item')
      return null
    }

    // Validate HSN for B2B transactions
    if (isHSNRequired(customerGST)) {
      const missingHSN = invoiceItems.filter(item => !item.hsnCode || item.hsnCode.trim() === '')
      if (missingHSN.length > 0) {
        toast.error(`HSN Code is mandatory for B2B invoices. Missing for: ${missingHSN.map(i => i.name).join(', ')}`)
        return null
      }
    }

    setIsCreatingInvoice(true)
    try {
      // Calculate totals
      const totals = calculateTotals()

      // Calculate total paid amount from payments array
      const totalPaidAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount.toString()) || 0), 0)

      // Determine payment status
      let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending'
      if (totalPaidAmount >= totals.total) {
        paymentStatus = 'paid'
      } else if (totalPaidAmount > 0) {
        paymentStatus = 'partial'
      }

      // Use user-entered invoice number and date (from component state)

      // Create invoice data
      const invoiceData = {
        type: 'sale' as const,
        source: (location.pathname === '/pos' || salesMode === 'pos') ? 'pos' as const : 'invoice' as const,
        invoiceNumber,
        invoiceDate,
        dueDate: invoiceDate, // Same as invoice date for now

        // Party details
        partyName: customerName,
        partyPhone: customerPhone || undefined,
        partyEmail: customerEmail || undefined,
        partyGSTIN: customerGST || undefined,
        partyVehicleNo: customerVehicleNo || undefined,

        // Items
        items: invoiceItems.map((item, index) => ({
          id: `item_${index}`,
          itemId: item.itemId, // Include itemId for inventory tracking
          description: item.name,
          hsn: item.hsnCode || '',
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

        // Payment mode at top level for easy badge display
        paymentMode: (payments.length > 0 ? payments[0].type : paymentMode) as 'cash' | 'bank' | 'upi' | 'card' | 'cheque',

        // Payment - use actual payment type from payments array, not paymentMode state
        payment: {
          mode: (payments.length > 0 ? payments[0].type : paymentMode) as 'cash' | 'bank' | 'upi' | 'card' | 'cheque',
          status: paymentStatus,
          paidAmount: totalPaidAmount,
          dueAmount: totals.total - totalPaidAmount,
          // Store bank details if payment is via bank (use null instead of undefined for Firebase)
          bankAccountId: payments.length > 0 && payments[0].type === 'bank' ? payments[0].reference : null,
          bankName: payments.length > 0 && payments[0].type === 'bank' && payments[0].reference
            ? payments[0].reference.split('(')[0]?.trim()
            : null
        },

        // Additional
        notes: notes || null,
        createdBy: 'user'
      }

      // Save invoice without payment
      const savedInvoice = await createInvoiceService(invoiceData)

      if (savedInvoice) {
        // Update Banking - Process split payments array (Firebase real-time sync)
        if (totalPaidAmount > 0) {
          try {
            const { updateCashInHand, updateBankAccountBalance, getBankingPageData } = await import('../services/bankingService')
            const bankingData = await getBankingPageData()

            // Process each payment in the payments array
            for (const payment of payments) {
              if (payment.amount > 0) {
                if (payment.type === 'cash') {
                  // Update Cash in Hand via Firebase
                  await updateCashInHand(payment.amount, `Invoice #${invoiceNumber} (${customerName})`)
                } else if (payment.type === 'bank' && payment.reference && bankingData) {
                  // Find bank account and update via Firebase
                  const bankAccount = bankingData.bankAccounts?.find((acc: any) =>
                    payment.reference.includes(acc.accountNo.slice(-4))
                  )
                  if (bankAccount) {
                    await updateBankAccountBalance(bankAccount.id, payment.amount)
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to update banking:', error)
          }
        }

        toast.success(`Invoice ${invoiceNumber} created successfully!${totalPaidAmount > 0 ? ' Banking updated.' : ''}`)

        // Reload invoices list
        await loadInvoicesFromDatabase()

        // Close current tab only, preserve other tabs
        closeCurrentTab()

        // Redirect to list page (POS list if on /pos route)
        if (location.pathname === '/pos') {
          setSalesMode('pos')
          setShowCafePOS(false)
          localStorage.setItem('pos_viewMode', 'list')
        }
        setViewMode('list')

        // Return the saved invoice for chaining with other actions
        return savedInvoice
      } else {
        toast.error('Failed to create invoice. Please try again.')
        return null
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Error creating invoice. Please try again.')
      return null
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  // Complete sale with payment (POS mode) - handles payment flow
  const createInvoice = async () => {
    if (!customerName || invoiceItems.length === 0) {
      toast.error('Please fill customer name and add at least one item')
      return
    }

    // Validate HSN for B2B transactions
    if (isHSNRequired(customerGST)) {
      const missingHSN = invoiceItems.filter(item => !item.hsnCode || item.hsnCode.trim() === '')
      if (missingHSN.length > 0) {
        toast.error(`HSN Code is mandatory for B2B invoices. Missing for: ${missingHSN.map(i => i.name).join(', ')}`)
        return
      }
    }

    try {
      // Calculate totals
      const totals = calculateTotals()

      // Calculate total paid amount from payments array
      const totalPaidAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount.toString()) || 0), 0)

      // Determine payment status
      let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending'
      if (totalPaidAmount >= totals.total) {
        paymentStatus = 'paid'
      } else if (totalPaidAmount > 0) {
        paymentStatus = 'partial'
      }

      // Use user-entered invoice number and date (from component state)

      // Create invoice data
      const invoiceData = {
        type: 'sale' as const,
        source: (location.pathname === '/pos' || salesMode === 'pos') ? 'pos' as const : 'invoice' as const,
        invoiceNumber,
        invoiceDate,
        dueDate: invoiceDate, // Same as invoice date for now

        // Party details
        partyName: customerName,
        partyPhone: customerPhone || undefined,
        partyEmail: customerEmail || undefined,
        partyGSTIN: customerGST || undefined,
        partyVehicleNo: customerVehicleNo || undefined,

        // Items
        items: invoiceItems.map((item, index) => ({
          id: `item_${index}`,
          itemId: item.itemId, // Include itemId for inventory tracking
          description: item.name,
          hsn: item.hsnCode || '',
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

        // Payment mode at top level for easy badge display
        paymentMode: (payments.length > 0 ? payments[0].type : paymentMode) as 'cash' | 'bank' | 'upi' | 'card' | 'cheque',

        // Payment - use actual payment type from payments array, not paymentMode state
        payment: {
          mode: (payments.length > 0 ? payments[0].type : paymentMode) as 'cash' | 'bank' | 'upi' | 'card' | 'cheque',
          status: paymentStatus,
          paidAmount: totalPaidAmount,
          dueAmount: totals.total - totalPaidAmount,
          // Store bank details if payment is via bank (use null instead of undefined for Firebase)
          bankAccountId: payments.length > 0 && payments[0].type === 'bank' ? payments[0].reference : null,
          bankName: payments.length > 0 && payments[0].type === 'bank' && payments[0].reference
            ? payments[0].reference.split('(')[0]?.trim()
            : null
        },

        // Additional
        notes: notes || null,
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
          transactionNote: `Invoice ${invoiceNumber}`,
          transactionRef: paymentRef
        }

        setCurrentPaymentDetails(upiDetails)
        setPendingInvoiceData(invoiceData)
        setShowUPIModal(true)
        return
      }

      // If payment mode is card, show card terminal modal
      if (paymentMode === 'card') {
        const cardRequest: CardPaymentRequest = {
          amount: totals.total,
          currency: 'INR',
          orderId: invoiceNumber,
          customerName: customerName,
          customerPhone: customerPhone
        }

        setCurrentCardPaymentRequest(cardRequest)
        setPendingInvoiceData(invoiceData)
        setShowCardModal(true)
        return
      }

      // For cash, bank, credit - save immediately
      const savedInvoice = await createInvoiceService(invoiceData)

      if (savedInvoice) {
        // Update Banking - Process split payments array (Firebase real-time sync)
        if (totalPaidAmount > 0) {
          try {
            const { updateCashInHand, updateBankAccountBalance, getBankingPageData } = await import('../services/bankingService')
            const bankingData = await getBankingPageData()

            // Process each payment in the payments array
            for (const payment of payments) {
              if (payment.amount > 0) {
                if (payment.type === 'cash') {
                  // Update Cash in Hand via Firebase
                  await updateCashInHand(payment.amount, `Invoice #${invoiceNumber} (${customerName})`)
                } else if (payment.type === 'bank' && payment.reference && bankingData) {
                  // Find bank account and update via Firebase
                  const bankAccount = bankingData.bankAccounts?.find((acc: any) =>
                    payment.reference.includes(acc.accountNo.slice(-4))
                  )
                  if (bankAccount) {
                    await updateBankAccountBalance(bankAccount.id, payment.amount)
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to update banking:', error)
          }
        }

        toast.success(`Sale completed! Invoice ${invoiceNumber} created.${totalPaidAmount > 0 ? ' Banking updated.' : ''}`)

        // Reload invoices list
        await loadInvoicesFromDatabase()

        // Close current tab only, preserve other tabs
        closeCurrentTab()

        // Redirect to list page (POS list if on /pos route)
        if (location.pathname === '/pos') {
          setSalesMode('pos')
          setShowCafePOS(false)
          localStorage.setItem('pos_viewMode', 'list')
        }
        setViewMode('list')
      } else {
        toast.error('Failed to create invoice. Please try again.')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Error creating invoice. Please try again.')
    }
  }

  // Handle POS Checkout Wizard completion - Professional flow
  const handlePOSCheckoutComplete = async (checkoutData: CheckoutData) => {
    try {
      // Generate invoice number
      const newInvoiceNumber = await generateIndianInvoiceNumber('QTN')
      const today = new Date().toISOString().split('T')[0]

      // Calculate totals from checkout data
      const subtotal = checkoutData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const totalTax = checkoutData.items.reduce((sum, item) => sum + item.taxAmount, 0)

      // Determine payment status based on payment method
      let paymentStatus: 'pending' | 'partial' | 'paid' = 'paid'
      let paidAmount = checkoutData.grandTotal
      if (checkoutData.payment.method === 'credit') {
        paymentStatus = 'pending'
        paidAmount = 0
      }

      // Create invoice data
      const invoiceData = {
        type: 'sale' as const,
        source: 'pos' as const,
        invoiceNumber: newInvoiceNumber,
        invoiceDate: today,
        dueDate: today,

        // Party details from checkout
        partyId: checkoutData.customer.id || null,
        partyName: checkoutData.customer.name || 'Walk-in Customer',
        partyPhone: checkoutData.customer.phone || null,

        // Items - use itemId for inventory stock update
        items: checkoutData.items.map((item, index) => ({
          id: `item_${index}`,
          itemId: item.itemId || item.id, // Use itemId (actual inventory item ID) if available
          description: item.name,
          hsn: item.hsnCode || '',
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          rate: item.price,
          discount: item.discount || 0,
          taxRate: item.tax,
          amount: (item.price * item.quantity) + item.taxAmount
        })),

        // Totals
        subtotal: subtotal,
        discountAmount: checkoutData.discount.discountAmount,
        totalTaxAmount: totalTax,
        grandTotal: checkoutData.grandTotal,

        // Payment mode
        paymentMode: checkoutData.payment.method as 'cash' | 'bank' | 'upi' | 'card',

        // Payment details
        payment: {
          mode: checkoutData.payment.method as 'cash' | 'bank' | 'upi' | 'card',
          status: paymentStatus,
          paidAmount: paidAmount,
          dueAmount: checkoutData.grandTotal - paidAmount,
          transactionId: checkoutData.payment.transactionId || null,
          receivedAmount: checkoutData.payment.receivedAmount || null,
          changeGiven: checkoutData.payment.changeAmount || null
        },

        // Additional
        notes: null,
        createdBy: 'pos'
      }

      // Save invoice to database
      const savedInvoice = await createInvoiceService(invoiceData)

      if (savedInvoice) {
        // Update Banking for paid transactions (Firebase real-time sync)
        if (paidAmount > 0) {
          try {
            const { updateCashInHand } = await import('../services/bankingService')
            // All POS payments go to Cash in Hand
            await updateCashInHand(paidAmount, `POS Sale - Invoice #${newInvoiceNumber} (${checkoutData.customer.name})`)
          } catch (error) {
            console.error('Failed to update banking:', error)
          }
        }

        // Reload invoices
        await loadInvoicesFromDatabase()

        toast.success(`POS Sale completed! Invoice #${newInvoiceNumber}`)
      }
    } catch (error) {
      console.error('Error creating POS invoice:', error)
      toast.error('Failed to create invoice. Please try again.')
    }
  }

  // Handle POS Checkout Wizard close - back to POS items grid
  const handlePOSCheckoutCancel = () => {
    setShowPOSCheckoutWizard(false)
    setPosCartItems([])
    // Stay on POS items grid - don't navigate away
  }

  // Handle POS Checkout Wizard complete - close wizard and go back to POS grid
  const handlePOSCheckoutDone = async (checkoutData: CheckoutData) => {
    await handlePOSCheckoutComplete(checkoutData)
    setShowPOSCheckoutWizard(false)
    setPosCartItems([])
    // Increment reset key to force ModernPOS to remount with fresh/empty cart
    setPosResetKey(prev => prev + 1)
    // Stay on POS items grid for next customer
    setShowCafePOS(true)
  }

  // Handle Quick Checkout from ModernPOS (Receive button click)
  const handleQuickCheckout = async (data: QuickCheckoutData) => {
    try {
      // Generate invoice number
      const newInvoiceNumber = await generateIndianInvoiceNumber('QTN')
      const today = new Date().toISOString().split('T')[0]

      // Calculate totals from checkout data
      const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const totalTax = data.items.reduce((sum, item) => sum + item.taxAmount, 0)

      // Determine payment status
      let paymentStatus: 'pending' | 'partial' | 'paid' = 'paid'
      let paidAmount = data.grandTotal
      if (data.payment.method === 'credit') {
        paymentStatus = 'pending'
        paidAmount = 0
      }

      // Create invoice data with source: 'pos'
      const invoiceData = {
        type: 'sale' as const,
        source: 'pos' as const, // IMPORTANT: Mark as POS sale
        invoiceNumber: newInvoiceNumber,
        invoiceDate: today,
        dueDate: today,

        // Party details
        partyId: data.customer.id || null,
        partyName: data.customer.name || 'Walk-in Customer',
        partyPhone: data.customer.phone || null,

        // Items - use itemId for inventory stock update
        items: data.items.map((item, index) => ({
          id: `item_${index}`,
          itemId: item.itemId, // Use itemId (actual inventory item ID) not id (cart item ID)
          description: item.name,
          hsn: item.hsnCode || '',
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          rate: item.price,
          discount: item.discount || 0,
          taxRate: item.tax,
          amount: (item.price * item.quantity) + item.taxAmount
        })),

        // Totals
        subtotal: subtotal,
        discountAmount: data.discount.discountAmount,
        totalTaxAmount: totalTax,
        grandTotal: data.grandTotal,

        // Payment
        paymentMode: data.payment.method as 'cash' | 'bank' | 'upi' | 'card',
        payment: {
          mode: data.payment.method as 'cash' | 'bank' | 'upi' | 'card',
          status: paymentStatus,
          paidAmount: paidAmount,
          dueAmount: data.grandTotal - paidAmount,
          transactionId: data.payment.transactionId || null,
          receivedAmount: data.payment.receivedAmount || null,
          changeGiven: data.payment.changeAmount || null
        },

        notes: null,
        createdBy: 'pos'
      }

      // Save invoice to database
      const savedInvoice = await createInvoiceService(invoiceData)

      if (savedInvoice) {
        // Update Banking for paid transactions (Firebase real-time sync)
        if (paidAmount > 0) {
          try {
            const { updateCashInHand } = await import('../services/bankingService')
            // All POS payments go to Cash in Hand
            await updateCashInHand(paidAmount, `POS Quick Checkout - Invoice #${newInvoiceNumber} (${data.customer.name})`)
          } catch (error) {
            console.error('Failed to update banking:', error)
          }
        }

        // Reload invoices to show in POS history
        await loadInvoicesFromDatabase()

        console.log(`✅ POS Quick Checkout completed! Invoice #${newInvoiceNumber}`)
      }
    } catch (error) {
      console.error('Error in quick checkout:', error)
      toast.error('Failed to save POS sale. Please try again.')
    }
  }

  const viewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setShowViewModal(true)
  }

  // Print Invoice using InvoicePreviewModal - includes payment details
  const handlePrintInvoice = async (invoice: any) => {
    console.log('🖨️ Print Invoice - Invoice data:', invoice)

    // Load payment history for this invoice (with fallback)
    let payments: Payment[] = []
    try {
      if (invoice.id) {
        payments = await getInvoicePayments(invoice.id)
        console.log('🖨️ Loaded payments:', payments)
      }
    } catch (err) {
      console.warn('Could not load payment history:', err)
    }

    // Get bank account name if payment was via bank
    let bankName = ''
    let bankAccount = ''

    // First check if bank name is stored directly on invoice
    if (invoice.payment?.bankName) {
      bankName = invoice.payment.bankName
    }

    // Check stored payment info on invoice via bankAccountId
    if (!bankName && invoice.payment?.bankAccountId) {
      // Try to find in bank accounts list
      const account = bankAccounts.find(b =>
        b.id?.toString() === invoice.payment.bankAccountId?.toString() ||
        invoice.payment.bankAccountId.includes(b.accountNo?.slice(-4) || '')
      )
      if (account) {
        bankName = account.name || account.bankName || ''
        bankAccount = account.accountNo || account.accountNumber || ''
      } else {
        // Use the stored bankAccountId as name (it contains "Bank Name (*1234)")
        bankName = invoice.payment.bankAccountId.split('(')[0]?.trim() || ''
      }
    }

    // Also check payments history
    if (payments.length > 0) {
      const firstPayment = payments[0]
      if (firstPayment.paymentMode === 'bank' && !bankName) {
        // Try to find bank from reference or notes
        bankName = firstPayment.reference?.split('(')[0]?.trim() || firstPayment.reference || ''
      }
    }

    // Build preview data
    const previewData = {
      invoiceNumber: invoice.invoiceNumber || 'N/A',
      invoiceDate: invoice.date || new Date().toISOString().split('T')[0],
      customerName: invoice.partyName || invoice.customerName || 'Walk-in Customer',
      customerPhone: invoice.partyPhone || invoice.phone || '',
      customerVehicleNo: invoice.partyVehicleNo || invoice.vehicleNo || '',
      items: invoice.items?.length > 0 ? invoice.items.map((item: any) => ({
        name: item.description || item.name || item.itemName || 'Item',
        quantity: item.quantity || item.qty || 1,
        price: item.price || item.rate || 0,
        total: item.total || item.amount || 0,
        gst: item.gst || item.taxRate || 0,
        taxMode: item.taxMode || 'exclusive',
        basePrice: item.basePrice || item.price || item.rate || 0,
        cgstAmount: item.cgstAmount || 0,
        sgstAmount: item.sgstAmount || 0,
        igstAmount: item.igstAmount || 0
      })) : [{
        name: 'Sale Item',
        quantity: 1,
        price: invoice.subtotal || invoice.total || 0,
        total: invoice.total || 0,
        gst: invoice.tax && invoice.subtotal ? (invoice.tax / invoice.subtotal * 100) : 0
      }],
      subtotal: invoice.subtotal || invoice.total || 0,
      discount: invoice.discount || 0,
      tax: invoice.tax || 0,
      total: invoice.total || invoice.grandTotal || 0,
      received: invoice.paidAmount || invoice.payment?.paidAmount || 0,
      balance: (invoice.total || invoice.grandTotal || 0) - (invoice.paidAmount || invoice.payment?.paidAmount || 0),
      companyName: getCompanySettings().companyName || 'ThisAI CRM',
      companyPhone: getCompanySettings().phone || '',
      // Payment details for invoice display
      payment: {
        mode: invoice.paymentMode || invoice.payment?.mode || (payments.length > 0 ? payments[0].paymentMode : 'cash'),
        paidAmount: invoice.paidAmount || invoice.payment?.paidAmount || 0,
        bankName: bankName || invoice.payment?.bankName || '',
        bankAccount: bankAccount || invoice.payment?.bankAccount || '',
        reference: invoice.payment?.reference || (payments.length > 0 ? payments[0].reference : ''),
        status: invoice.paymentStatus || invoice.payment?.status || 'pending'
      },
      // Payment history
      payments: payments.map(p => ({
        amount: p.amount,
        mode: p.paymentMode,
        date: p.paymentDate,
        reference: p.reference
      }))
    }

    console.log('🖨️ Preview data:', previewData)
    setListInvoicePreviewData(previewData)
    setShowListInvoicePreview(true)
  }

  const confirmDelete = (invoice: any) => {
    setInvoiceToDelete(invoice)
    setShowDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (invoiceToDelete) {
      try {
        // Delete from database/storage
        const success = await deleteInvoice(invoiceToDelete.id)

        if (success) {
          // Reload invoices from database to ensure UI is in sync
          await loadInvoicesFromDatabase()
          toast.success(`Invoice ${invoiceToDelete.invoiceNumber} deleted successfully`)
        } else {
          toast.error('Failed to delete invoice from database')
        }
      } catch (error) {
        console.error('Error deleting invoice:', error)
        toast.error('Error deleting invoice. Please try again.')
      } finally {
        setShowDeleteConfirm(false)
        setInvoiceToDelete(null)
      }
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setInvoiceToDelete(null)
  }

  // Open payment modal
  const openPaymentModal = async (invoice: any) => {
    // IMPORTANT: Fetch fresh invoice data from database to get latest totals after any edits
    // This ensures the payment modal shows correct balance due after invoice was edited
    let freshInvoice = invoice
    try {
      const latestInvoice = await getInvoiceById(invoice.id)
      if (latestInvoice) {
        freshInvoice = latestInvoice
        console.log('💰 Payment modal: Using fresh invoice data from database')
      }
    } catch (error) {
      console.warn('Failed to fetch fresh invoice, using cached data:', error)
    }

    setSelectedInvoiceForPayment(freshInvoice)

    // Calculate balance due using fresh data
    const invoiceTotal = freshInvoice.grandTotal || freshInvoice.total || 0
    const paidAmount = freshInvoice.paidAmount || freshInvoice.payment?.paidAmount || 0
    const balanceDue = invoiceTotal - paidAmount

    // Round to 2 decimal places to avoid floating point precision issues
    setPaymentAmount(Math.round(balanceDue * 100) / 100 + '')
    setPaymentMethodSelected('cash')
    setPaymentBankAccountId('') // Reset bank account selection
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentReference('')
    setPaymentNotes('')

    // Reload bank accounts from Firebase to get latest balances
    try {
      const { getBankingPageData } = await import('../services/bankingService')
      const bankingData = await getBankingPageData()
      console.log('🏦 Loaded banking data from Firebase:', bankingData)

      if (bankingData && bankingData.bankAccounts && Array.isArray(bankingData.bankAccounts)) {
        console.log('🏦 Setting bank accounts:', bankingData.bankAccounts.map((a: any) => `${a.name}: ₹${a.balance}`))
        setBankAccounts(bankingData.bankAccounts)
        console.log('🏦 Refreshed bank accounts for payment modal (Firebase):', bankingData.bankAccounts.length, 'accounts')
      } else {
        console.warn('⚠️ No bankAccounts array found in Firebase data')
        setBankAccounts([])
      }
    } catch (error) {
      console.error('Failed to refresh bank accounts from Firebase:', error)
      // Fallback to empty array
      setBankAccounts([])
    }

    // Load existing payments for this invoice
    const payments = await getInvoicePayments(freshInvoice.id)
    setInvoicePayments(payments)

    setShowPaymentModal(true)
  }

  // Record payment
  const handleRecordPayment = async () => {
    if (!selectedInvoiceForPayment || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    const amount = parseFloat(paymentAmount)
    // Use grandTotal first (updated value after edit), then fall back to total
    const invoiceTotal = selectedInvoiceForPayment.grandTotal || selectedInvoiceForPayment.total || 0
    const paidAmount = selectedInvoiceForPayment.paidAmount || selectedInvoiceForPayment.payment?.paidAmount || 0
    const balanceDue = Math.round((invoiceTotal - paidAmount) * 100) / 100

    if (amount > balanceDue + 1) { // Allow 1 rupee tolerance for rounding
      toast.error(`Payment amount cannot exceed balance due (₹${balanceDue.toLocaleString('en-IN')})`)
      return
    }

    // Validate bank account selection for bank payments
    if (paymentMethodSelected === 'bank' && !paymentBankAccountId) {
      toast.error('Please select a bank account for bank transfer')
      return
    }

    try {
      console.log('🔍 Recording payment for invoice:', selectedInvoiceForPayment)

      const paymentData: any = {
        invoiceId: selectedInvoiceForPayment.id,
        invoiceNumber: selectedInvoiceForPayment.invoiceNumber,
        invoiceType: 'quotation' as const,  // Added for ledger tracking
        partyId: selectedInvoiceForPayment.partyId || 'unknown',
        partyName: selectedInvoiceForPayment.partyName,
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
        // Update Cash in Hand if payment method is cash (Firebase real-time sync)
        if (paymentMethodSelected === 'cash') {
          try {
            const { updateCashInHand, saveBankingPageTransactions, getBankingPageTransactions } = await import('../services/bankingService')
            await updateCashInHand(amount, `Cash received - Invoice #${selectedInvoiceForPayment.invoiceNumber} (${selectedInvoiceForPayment.partyName})`)

            // Add transaction to banking (Firebase)
            const transactions = await getBankingPageTransactions()
            const newTransaction = {
              id: Date.now(),
              type: 'credit' as const,
              description: `Cash received - Invoice #${selectedInvoiceForPayment.invoiceNumber} (${selectedInvoiceForPayment.partyName})`,
              amount: amount,
              date: paymentDate,
              account: 'Cash in Hand'
            }
            transactions.unshift(newTransaction)
            await saveBankingPageTransactions(transactions)

            console.log('💰 Cash in Hand updated (Firebase): +₹', amount)
          } catch (error) {
            console.error('Failed to update Cash in Hand:', error)
            // Don't block payment success even if banking update fails
          }
        }

        // Update Bank Account balance if payment method is bank (Firebase real-time sync)
        if (paymentMethodSelected === 'bank' && paymentBankAccountId) {
          try {
            const { updateBankAccountBalance, getBankingPageData, saveBankingPageTransactions, getBankingPageTransactions } = await import('../services/bankingService')
            const bankingData = await getBankingPageData()

            if (bankingData && bankingData.bankAccounts) {
              // Find the bank account name for transaction description
              const bankAccount = bankingData.bankAccounts.find(
                (acc: any) => acc.id.toString() === paymentBankAccountId
              )

              if (bankAccount) {
                await updateBankAccountBalance(parseInt(paymentBankAccountId), amount)

                // Add transaction to banking (Firebase)
                const transactions = await getBankingPageTransactions()
                const newTransaction = {
                  id: Date.now(),
                  type: 'credit' as const,
                  description: `Bank Transfer received - Invoice #${selectedInvoiceForPayment.invoiceNumber} (${selectedInvoiceForPayment.partyName})`,
                  amount: amount,
                  date: paymentDate,
                  account: bankAccount.name
                }
                transactions.unshift(newTransaction)
                await saveBankingPageTransactions(transactions)

                console.log('🏦 Bank account updated (Firebase):', bankAccount.name, '+₹', amount)
              }
            }
          } catch (error) {
            console.error('Failed to update Bank Account:', error)
            // Don't block payment success even if banking update fails
          }
        }

        // Clear isReversed flag if it was set
        if (db && selectedInvoiceForPayment.isReversed) {
          try {
            const invoiceRef = doc(db, 'invoices', selectedInvoiceForPayment.id)
            await updateDoc(invoiceRef, { isReversed: false })
          } catch (e) {
            console.warn('Could not clear isReversed flag:', e)
          }
        }

        // Success message with banking update info
        let bankingUpdateMsg = ''
        if (paymentMethodSelected === 'cash') bankingUpdateMsg = ' Cash in Hand updated.'
        else if (paymentMethodSelected === 'bank') bankingUpdateMsg = ' Bank account updated.'

        toast.success(`Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully!${bankingUpdateMsg}`)

        // Reload invoices to update payment status
        await loadInvoicesFromDatabase()

        // Close modal
        setShowPaymentModal(false)
        setSelectedInvoiceForPayment(null)
      } else {
        console.error('❌ Payment recording returned null')
        toast.error('Failed to record payment. Check browser console for details.')
      }
    } catch (error) {
      console.error('❌ Error recording payment:', error)
      toast.error(`Error recording payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Delete/Reverse payment
  const handleDeletePayment = async (payment: Payment) => {
    if (!selectedInvoiceForPayment) return

    const confirmed = window.confirm(
      `Are you sure you want to reverse this payment of ₹${payment.amount.toLocaleString('en-IN')}?\n\nThis will:\n• Remove the payment record\n• Update the invoice status\n• Reverse cash/bank balance changes`
    )

    if (!confirmed) return

    try {
      const success = await deletePayment(payment.id, selectedInvoiceForPayment.id)

      if (success) {
        toast.success(`Payment of ₹${payment.amount.toLocaleString('en-IN')} reversed successfully!`)

        // Reload payments for this invoice
        const updatedPayments = await getInvoicePayments(selectedInvoiceForPayment.id)
        setInvoicePayments(updatedPayments)

        // Reload invoices to update payment status
        await loadInvoicesFromDatabase()

        // Update the selected invoice data
        const stored = localStorage.getItem('thisai_crm_invoices')
        if (stored) {
          const invoices = JSON.parse(stored)
          const updatedInvoice = invoices.find((inv: any) => inv.id === selectedInvoiceForPayment.id)
          if (updatedInvoice) {
            setSelectedInvoiceForPayment(updatedInvoice)
            // Update payment amount field
            const balanceDue = (updatedInvoice.total || updatedInvoice.grandTotal || 0) - (updatedInvoice.paidAmount || 0)
            setPaymentAmount(balanceDue.toString())
          }
        }
      } else {
        toast.error('Failed to reverse payment')
      }
    } catch (error) {
      console.error('Error reversing payment:', error)
      toast.error('Error reversing payment')
    }
  }

  // Reset invoice to pending status (for paid invoices with no payment records)
  const handleResetToPending = async () => {
    if (!selectedInvoiceForPayment) {
      toast.error('No invoice selected')
      return
    }

    const confirmed = window.confirm(
      'Reset this invoice to "Pending" status?\n\nThis will:\n• Change payment status from Paid to Pending\n• Set paid amount to ₹0\n• Allow you to record new payments'
    )

    if (!confirmed) return

    try {
      console.log('🔄 Resetting invoice:', selectedInvoiceForPayment.id)
      
      // Update in Firebase if available
      if (db) {
        try {
          const invoiceRef = doc(db, 'invoices', selectedInvoiceForPayment.id)
          await updateDoc(invoiceRef, {
            paymentStatus: 'pending',
            paidAmount: 0,
            isReversed: true,
            'payment.paidAmount': 0,
            'payment.paymentStatus': 'pending',
            updatedAt: new Date().toISOString()
          })
          console.log('✅ Firebase updated')
        } catch (fbError) {
          console.warn('Firebase update failed:', fbError)
        }
      }

      // Also update localStorage directly
      const stored = localStorage.getItem('thisai_crm_invoices')
      if (stored) {
        try {
          const invoices = JSON.parse(stored)
          const updatedInvoices = invoices.map((inv: any) => {
            if (inv.id === selectedInvoiceForPayment.id) {
              return {
                ...inv,
                paymentStatus: 'pending',
                paidAmount: 0,
                isReversed: true,
                payment: {
                  ...inv.payment,
                  paidAmount: 0,
                  paymentStatus: 'pending'
                },
                updatedAt: new Date().toISOString()
              }
            }
            return inv
          })
          localStorage.setItem('thisai_crm_invoices', JSON.stringify(updatedInvoices))
          console.log('✅ LocalStorage updated')
        } catch (lsError) {
          console.warn('LocalStorage update failed:', lsError)
        }
      }

      // Update state directly for immediate UI update
      setInvoices(prev => prev.map(inv => {
        if (inv.id === selectedInvoiceForPayment.id) {
          return {
            ...inv,
            paymentStatus: 'pending',
            paidAmount: 0,
            isReversed: true // Mark as reversed
          }
        }
        return inv
      }))
      console.log('✅ State updated')

      toast.success('Payment reversed! Invoice reset to Pending status.')
      setShowPaymentModal(false)
      setSelectedInvoiceForPayment(null)
      
      // Reload invoices to reflect changes from database
      setTimeout(() => {
        loadInvoicesFromDatabase()
        console.log('✅ Invoices reloaded from database')
      }, 500)
    } catch (error) {
      console.error('Error resetting invoice:', error)
      toast.error('Failed to reset invoice status. Please try again.')
    }
  }

  // Share invoice via WhatsApp
  const handleShareWhatsApp = (invoice: any) => {
    try {
      const phone = invoice.partyPhone || ''
      if (!phone) {
        toast.error('Customer phone number not available')
        return
      }

      // Format phone number - add country code if not present
      let formattedPhone = phone.replace(/[^\d+]/g, '')
      // If phone doesn't start with + or country code, add India country code
      if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('91') && formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone
      } else if (formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.substring(1)
      }

      shareViaWhatsApp(
        formattedPhone,
        invoice.invoiceNumber,
        invoice.total || invoice.grandTotal,
        'ThisAI CRM'
      )
      toast.success('Opening WhatsApp...')
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error)
      toast.error('Failed to share via WhatsApp')
    }
  }

  // Download invoice PDF
  const handleDownloadPDF = async (invoice: any) => {
    try {
      // Fetch full invoice details from database to get items array
      const { getInvoiceById } = await import('../services/invoiceService')
      const fullInvoice = await getInvoiceById(invoice.id)

      // Use fullInvoice if available, otherwise fall back to passed invoice
      const invoiceData = fullInvoice || invoice
      const companySettings = getCompanySettings()

      // Build items array from invoice items or create single item from totals
      const pdfItems = invoiceData.items?.length > 0
        ? invoiceData.items.map((item: any) => {
            const itemName = item.description || item.name || item.itemName || 'Item'
            const quantity = item.quantity || item.qty || 1
            const rate = item.price || item.rate || 0
            const taxRate = item.gst || item.taxRate || 0
            const amount = item.total || item.amount || (quantity * rate)
            return {
              name: itemName,
              quantity: quantity,
              unit: item.unit || 'pcs',
              rate: rate,
              taxRate: taxRate,
              amount: amount,
              hsnCode: item.hsnCode || item.hsn || ''
            }
          })
        : [{
            name: 'Sale Item',
            quantity: 1,
            unit: 'pcs',
            rate: invoiceData.subtotal || invoiceData.total || 0,
            taxRate: invoiceData.tax && invoiceData.subtotal ? (invoiceData.tax / invoiceData.subtotal * 100) : 0,
            amount: invoiceData.total || 0
          }]

      const pdfData: InvoicePDFData = {
        companyName: companySettings.companyName || 'ThisAI CRM',
        companyGSTIN: companySettings.gstin || '',
        companyAddress: companySettings.address || '',
        companyPhone: companySettings.phone || '',
        companyEmail: companySettings.email || '',

        invoiceNumber: invoiceData.invoiceNumber || invoice.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate || invoiceData.date || invoice.date,
        type: 'sale',

        partyName: invoiceData.partyName || invoiceData.customerName || invoice.partyName || 'Walk-in Customer',
        partyPhone: invoiceData.partyPhone || invoice.partyPhone || '',

        items: pdfItems,

        subtotal: invoiceData.subtotal || invoice.subtotal || 0,
        totalTax: invoiceData.totalTaxAmount || invoiceData.tax || invoice.tax || 0,
        grandTotal: invoiceData.grandTotal || invoiceData.total || invoice.total,
        paidAmount: invoiceData.paidAmount || invoice.paidAmount || 0,
        balanceDue: (invoiceData.grandTotal || invoiceData.total || invoice.total) - (invoiceData.paidAmount || invoice.paidAmount || 0),
        paymentStatus: invoiceData.paymentStatus || invoice.paymentStatus
      }

      downloadInvoicePDF(pdfData)
      toast.success('PDF downloaded successfully!')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
                         invoice.partyName.toLowerCase().includes(searchLower) ||
                         (invoice.partyPhone && invoice.partyPhone.toLowerCase().includes(searchLower))
    const matchesFilter = filterStatus === 'all' || invoice.paymentStatus === filterStatus

    // Source filter - POS page shows only POS invoices, Sales page shows only Sales invoices
    const isPOSView = location.pathname === '/pos' || salesMode === 'pos'
    const matchesSource = isPOSView
      ? (invoice.source === 'pos') // POS page: only POS invoices
      : (invoice.source !== 'pos') // Sales page: only Sales invoices (not POS)

    // Date filter based on statsFilter
    let matchesDate = true
    if (statsFilter !== 'all') {
      const invoiceDate = invoice.date
      const today = new Date().toISOString().split('T')[0]

      if (statsFilter === 'today') {
        matchesDate = invoiceDate === today
      } else if (statsFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        matchesDate = invoiceDate >= weekAgo.toISOString().split('T')[0]
      } else if (statsFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        matchesDate = invoiceDate >= monthAgo.toISOString().split('T')[0]
      } else if (statsFilter === 'year') {
        const yearAgo = new Date()
        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
        matchesDate = invoiceDate >= yearAgo.toISOString().split('T')[0]
      } else if (statsFilter === 'custom') {
        matchesDate = invoiceDate >= customDateFrom && invoiceDate <= customDateTo
      }
    }

    return matchesSearch && matchesFilter && matchesDate && matchesSource
  })

  const handleConvertToInvoice = async (invoice: any) => {
    const converted = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.date || invoice.invoiceDate,
      partyName: invoice.partyName || invoice.customerName,
      partyPhone: invoice.partyPhone || '',
      partyEmail: invoice.partyEmail || '',
      partyGSTIN: invoice.partyGSTIN || invoice.customerGST || '',
      partyState: invoice.partyState || '',
      paymentMode: invoice.paymentMode || invoice.payment?.mode || 'cash',
      discount: invoice.discountAmount || invoice.discountPercent || 0,
      notes: invoice.notes || '',
      items: (invoice.items || []).map((item: any, index: number) => {
        const qty = item.quantity ?? item.qty ?? 1
        const taxRate = Number(item.taxRate ?? item.tax ?? 0)
        const providedAmount = item.amount ?? item.total ?? null
        const isAmountInclusive = providedAmount != null && (item.rate == null || Number(item.rate) === Number(providedAmount)) && taxRate > 0
        const basePrice = isAmountInclusive ? +(Number(providedAmount) / (1 + taxRate / 100) / qty) : (item.rate ?? item.price ?? item.amount ?? 0)
        const inclusivePerUnit = isAmountInclusive ? +(Number(providedAmount) / qty) : undefined

        return {
          id: item.id || `q_item_${Date.now()}_${index}`,
          name: item.name || item.description || '',
          description: item.description || '',
          quantity: qty,
          qty: qty,
          unit: item.unit || 'Pcs',
          rate: isAmountInclusive ? inclusivePerUnit : (item.rate ?? item.price ?? item.amount ?? 0),
          price: isAmountInclusive ? inclusivePerUnit : (item.rate ?? item.price ?? item.amount ?? 0),
          taxMode: isAmountInclusive ? 'inclusive' : (item.taxMode || 'exclusive'),
          basePrice: isAmountInclusive ? Math.round(basePrice * 100) / 100 : undefined,
          discount: item.discount || 0,
          discountAmount: item.discountAmount || 0,
          tax: taxRate,
          taxRate: taxRate,
          taxAmount: item.taxAmount || 0,
          cgst: item.cgstPercent || item.cgst || 0,
          cgstAmount: item.cgstAmount || 0,
          sgst: item.sgstPercent || item.sgst || 0,
          sgstAmount: item.sgstAmount || 0,
          igstPercent: item.igstPercent || 0,
          igstAmount: item.igstAmount || 0,
          amount: providedAmount != null ? providedAmount : item.amount || item.total || 0,
          hsnCode: item.hsnCode || item.hsn || ''
        }
      })
    }

    try {
      if (invoice?.invoiceNumber) {
        const userRaw = localStorage.getItem('user')
        const createdBy = userRaw ? JSON.parse(userRaw).id || 'system' : 'system'

        let subtotal = 0
        let totalTax = 0
        const items = (converted.items || []).map((it: any) => {
          const qty = Number(it.quantity ?? it.qty ?? 1)
          const rawRate = Number(it.rate ?? it.price ?? it.amount ?? 0)
          const discountPercent = Number(it.discount ?? 0)
          const providedAmount = it.amount ?? it.total ?? null
          const providedTaxAmount = it.taxAmount ?? it.totalTax ?? null
          const taxRate = Number(it.taxRate ?? it.tax ?? 0)

          let rate: number
          let taxAmount: number
          let totalAmount: number
          let taxableAmount: number
          let discountAmount = Number(it.discountAmount ?? 0)

          if (providedAmount != null && (it.rate == null || Number(it.rate) === Number(providedAmount))) {
            if (taxRate > 0) {
              const lineInclusive = Number(providedAmount)
              const baseLine = +(lineInclusive / (1 + taxRate / 100))
              const basePerUnit = +(baseLine / qty)
              rate = Math.round(basePerUnit * 100) / 100
              taxAmount = Math.round((lineInclusive - baseLine) * 100) / 100
              totalAmount = Math.round(lineInclusive * 100) / 100
              discountAmount = Number(it.discountAmount ?? 0)
              taxableAmount = Math.round((basePerUnit * qty - discountAmount) * 100) / 100
            } else {
              rate = Math.round((Number(providedAmount) / qty) * 100) / 100
              taxAmount = 0
              totalAmount = Math.round(Number(providedAmount) * 100) / 100
              taxableAmount = Math.round((rate * qty - discountAmount) * 100) / 100
            }
          } else if (providedTaxAmount != null) {
            taxAmount = Number(providedTaxAmount)
            totalAmount = providedAmount != null ? Number(providedAmount) : (rawRate * qty + taxAmount)
            rate = Math.round((totalAmount - taxAmount) / qty * 100) / 100
            discountAmount = Number(it.discountAmount ?? 0)
            taxableAmount = Math.round((rate * qty - discountAmount) * 100) / 100
          } else {
            rate = rawRate
            discountAmount = Number(it.discountAmount ?? ((rate * qty) * discountPercent / 100))
            taxableAmount = Math.round((rate * qty - discountAmount) * 100) / 100
            taxAmount = Math.round((taxableAmount * (taxRate / 100)) * 100) / 100
            totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100
          }

          subtotal += +taxableAmount
          totalTax += +taxAmount

          return {
            itemId: it.itemId || it.id || '',
            itemName: it.name || it.description || '',
            description: it.description || '',
            hsnCode: it.hsnCode || it.hsn || '',
            quantity: qty,
            unit: it.unit || 'Pcs',
            rate,
            discountPercent,
            discountAmount,
            taxableAmount: +taxableAmount,
            taxRate,
            taxAmount: +taxAmount,
            cgstPercent: it.cgst || it.cgstPercent || (taxRate ? taxRate / 2 : 0),
            cgstAmount: it.cgstAmount || (taxAmount ? Math.round((taxAmount / 2) * 100) / 100 : 0),
            sgstPercent: it.sgst || it.sgstPercent || (taxRate ? taxRate / 2 : 0),
            sgstAmount: it.sgstAmount || (taxAmount ? Math.round((taxAmount / 2) * 100) / 100 : 0),
            igstPercent: it.igstPercent || 0,
            igstAmount: it.igstAmount || 0,
            totalAmount: +totalAmount
          }
        })

        const invoiceLevelDiscount = Number(converted.discount ?? 0)
        const grandTotal = +(subtotal + totalTax - invoiceLevelDiscount)

        const invoicePayload: any = {
          type: 'sale',
          source: 'quotation',
          invoiceNumber: converted.invoiceNumber || generateIndianInvoiceNumber(),
          invoiceDate: converted.invoiceDate || new Date().toISOString(),
          dueDate: converted.invoiceDate || new Date().toISOString(),
          partyName: converted.partyName || '',
          partyPhone: converted.partyPhone || '',
          partyEmail: converted.partyEmail || '',
          partyGSTIN: converted.partyGSTIN || '',
          partyState: converted.partyState || '',
          items,
          paymentMode: converted.paymentMode || 'cash',
          invoiceDiscount: invoiceLevelDiscount,
          notes: converted.notes || '',
          subtotal: +subtotal,
          totalTax: +totalTax,
          grandTotal: +grandTotal,
          createdBy
        }

        const saved = await createInvoiceService(invoicePayload as any)
        if (saved) {
          toast.success(`Invoice ${invoicePayload.invoiceNumber} created and added to Sales`)
          try { localStorage.setItem('sales_viewMode', 'list') } catch {}
          await new Promise(res => setTimeout(res, 150))
          navigate('/sales')
        } else {
          toast.error('Failed to create invoice from quotation. Opening create form instead.')
          navigate('/sales?open=create', { state: { convertedInvoice: converted } })
          sessionStorage.setItem('converted_invoice', JSON.stringify(converted))
        }
      } else {
        navigate('/sales?open=create', { state: { convertedInvoice: converted } })
        sessionStorage.setItem('converted_invoice', JSON.stringify(converted))
      }
    } catch (error) {
      console.error('Error converting quotation to invoice:', error)
      navigate('/sales?open=create', { state: { convertedInvoice: converted } })
      sessionStorage.setItem('converted_invoice', JSON.stringify(converted))
    } finally {
      setOpenActionMenu(null)
      setDropdownPosition(null)
      setDropdownInvoiceId(null)
      setDropdownButtonElement(null)
    }
  }

  const handleQuickEdit = async (invoice: any) => {
    try {
      console.log('Quick Edit - Loading invoice:', invoice.id)

      // Use offline-first service to fetch full invoice data (handles IndexedDB → localStorage → Firebase)
      let fullInvoice: any = await getInvoiceById(invoice.id)

      // Fallback to direct Firestore fetch if service didn't find it
      if (!fullInvoice && db) {
        const invoiceDoc = await getDoc(doc(db, 'invoices', invoice.id))
        if (invoiceDoc.exists()) {
          fullInvoice = { id: invoiceDoc.id, ...invoiceDoc.data() }
        }
      }

      if (!fullInvoice) {
        toast.error('Invoice not found in database')
        return
      }

      console.log('Quick Edit - Full invoice data:', fullInvoice)

      // Get items array - check multiple possible field names
      // Firestore stores as 'items' array, but some may use 'itemsList'
      let itemsArray = fullInvoice.items || fullInvoice.itemsList || []

      // Make sure itemsArray is actually an array (not a number)
      if (!Array.isArray(itemsArray)) {
        console.log('Items is not an array, checking other fields')
        itemsArray = []
      }

      console.log('Quick Edit - Items array:', itemsArray)

      // Parse items from the invoice
      // IMPORTANT: Use basePrice (taxable amount) for rate to ensure correct calculations
      // basePrice is the price without GST for inclusive items, or same as price for exclusive items
      const items = itemsArray.map((item: any, index: number) => {
        const qty = item.quantity || item.qty || 1
        // Prefer basePrice for accurate calculations, fallback to rate/price
        const rate = item.basePrice || item.rate || item.price || 0
        const tax = item.taxRate || item.tax || item.gst || 0
        return {
          id: item.id || `item-${index}`,
          name: item.description || item.name || item.itemName || '',
          qty,
          rate,
          tax,
          amount: qty * rate
        }
      })

      // If no items found, add a blank one
      if (items.length === 0) {
        items.push({
          id: `item-0`,
          name: '',
          qty: 1,
          rate: 0,
          tax: 18,
          amount: 0
        })
      }

      // Set all the quick edit state
      setQuickEditInvoice(fullInvoice)
      setQuickEditDate(fullInvoice.invoiceDate || fullInvoice.date || new Date().toISOString().split('T')[0])
      setQuickEditPartyName(fullInvoice.partyName || fullInvoice.customerName || '')
      setQuickEditItems(items)
      setQuickEditDiscount(fullInvoice.discountPercent || fullInvoice.discount || 0)
      setQuickEditNotes(fullInvoice.notes || '')
      setShowQuickEditModal(true)
    } catch (error) {
      console.error('Error loading invoice for edit:', error)
      toast.error('Failed to load invoice details. Check console for details.')
    }
  }

  const handleEditInvoice = (invoice: any) => {
    handleQuickEdit(invoice)
  }

  const saveQuickEdit = async () => {
    if (!quickEditInvoice) return

    setIsSavingQuickEdit(true)
    try {
      // Calculate new totals
      let subtotal = 0
      let totalTax = 0

      // Get original items to preserve HSN codes
      const originalItems = quickEditInvoice.items || []

      // Format items to match Firestore structure
      const updatedItems = quickEditItems.map((item, index) => {
        const lineTotal = item.qty * item.rate
        const lineTax = lineTotal * (item.tax / 100)
        subtotal += lineTotal
        totalTax += lineTax

        // Find original item to preserve HSN code
        const originalItem = originalItems.find((orig: any) => orig.id === item.id)

        return {
          id: item.id || `item_${index}`,
          description: item.name,
          quantity: item.qty,
          rate: item.rate,
          taxRate: item.tax,
          amount: lineTotal,
          discount: 0,
          hsn: originalItem?.hsn || originalItem?.hsnCode || '',
          unit: originalItem?.unit || 'pcs'
        }
      })

      const discountAmount = subtotal * (quickEditDiscount / 100)
      const grandTotal = subtotal - discountAmount + totalTax

      // Preserve the existing paidAmount and recalculate dueAmount and paymentStatus
      const existingPaidAmount = quickEditInvoice.paidAmount ?? quickEditInvoice.payment?.paidAmount ?? 0
      const newDueAmount = Math.max(0, grandTotal - existingPaidAmount)

      // Recalculate payment status based on new total
      let newPaymentStatus: 'pending' | 'partial' | 'paid' = 'pending'
      if (existingPaidAmount >= grandTotal) {
        newPaymentStatus = 'paid'
      } else if (existingPaidAmount > 0) {
        newPaymentStatus = 'partial'
      }

      // Use updateInvoice from invoiceService - this properly updates:
      // 1. IndexedDB (offline storage)
      // 2. localStorage (for payment validation)
      // 3. Firebase (when online)
      // This ensures all storage layers have the correct grandTotal
      const invoiceUpdates = {
        invoiceDate: quickEditDate,
        partyName: quickEditPartyName,
        items: updatedItems,
        subtotal: subtotal,
        totalTaxAmount: totalTax,
        discountPercent: quickEditDiscount,
        discountAmount: discountAmount,
        grandTotal: grandTotal,
        total: grandTotal,
        // Preserve existing paid amount and recalculate due amount
        paidAmount: existingPaidAmount,
        dueAmount: newDueAmount,
        paymentStatus: newPaymentStatus,
        payment: {
          paidAmount: existingPaidAmount,
          dueAmount: newDueAmount,
          status: newPaymentStatus
        },
        notes: quickEditNotes
      }

      const success = await updateInvoice(quickEditInvoice.id, invoiceUpdates as any)

      if (!success) {
        throw new Error('Failed to update invoice in storage')
      }

      console.log('✅ Invoice updated via invoiceService (IndexedDB + localStorage + Firebase)')

      toast.success('Invoice updated successfully!')
      setShowQuickEditModal(false)
      setQuickEditInvoice(null)

      // Reload invoices list
      loadInvoicesFromDatabase()
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast.error('Failed to update invoice')
    } finally {
      setIsSavingQuickEdit(false)
    }
  }

  // Quick Edit item helpers
  const updateQuickEditItem = (itemId: string, field: string, value: any) => {
    setQuickEditItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value }
        // Recalculate amount when qty or rate changes
        if (field === 'qty' || field === 'rate') {
          updated.amount = updated.qty * updated.rate
        }
        return updated
      }
      return item
    }))
  }

  const addQuickEditItem = () => {
    setQuickEditItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      name: '',
      qty: 1,
      rate: 0,
      tax: 18,
      amount: 0
    }])
  }

  // Handle item selection from dropdown in Quick Edit modal
  const handleQuickEditItemSelect = (itemId: string, inventoryItem: any) => {
    const price = inventoryItem.sellingPrice || inventoryItem.purchasePrice || 0
    const taxPercent = inventoryItem.tax?.gstRate || inventoryItem.tax?.igst ||
      ((inventoryItem.tax?.cgst || 0) + (inventoryItem.tax?.sgst || 0)) || 0

    // Get tax mode to calculate base price correctly
    const taxSettings = getTaxSettings()
    const itemTaxMode = inventoryItem.taxMode || taxSettings.defaultTaxMode || 'exclusive'

    // Calculate base price (taxable amount) based on tax mode
    // For inclusive: price includes GST, so extract base price
    // For exclusive: price is already the base price
    let basePrice: number
    if (itemTaxMode === 'inclusive' && taxPercent > 0) {
      basePrice = price / (1 + taxPercent / 100)
      basePrice = Math.round(basePrice * 100) / 100
    } else {
      basePrice = price
    }

    setQuickEditItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const amount = item.qty * basePrice
        return {
          ...item,
          name: inventoryItem.name,
          rate: basePrice, // Use base price for correct calculations
          tax: taxPercent,
          amount: amount
        }
      }
      return item
    }))
    setQuickEditActiveItemId(null)
    setQuickEditItemSearch('')
  }

  // Filter items for Quick Edit search
  const getQuickEditFilteredItems = () => {
    if (!quickEditItemSearch.trim()) return []
    return allItems.filter(item =>
      item.name?.toLowerCase().includes(quickEditItemSearch.toLowerCase()) ||
      item.barcode?.includes(quickEditItemSearch)
    ).slice(0, 8)
  }

  const removeQuickEditItem = (itemId: string) => {
    if (quickEditItems.length <= 1) {
      toast.error('Invoice must have at least one item')
      return
    }
    setQuickEditItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleDuplicateInvoice = async (invoice: any) => {
    try {
      // Generate new invoice number
      const newInvoiceNumber = await generateIndianInvoiceNumber('QTN')
      
      // Get items array - handle both array and non-array cases
      const itemsArray = Array.isArray(invoice.items) ? invoice.items : []
      
      if (itemsArray.length === 0) {
        toast.error('No items found in invoice to duplicate')
        return
      }
      
      // Map invoice items to InvoiceItem format
      const duplicatedItems: InvoiceItem[] = itemsArray.map((item: any, index: number) => ({
        id: `dup_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        name: item.description || item.name || item.itemName || '',
        qty: item.quantity || item.qty || 1,
        unit: item.unit || 'Pcs',
        price: item.rate || item.price || 0,
        discount: item.discountPercent || item.discount || 0,
        discountAmount: item.discountAmount || 0,
        tax: item.cgstPercent + item.sgstPercent || item.taxRate || item.tax || 0,
        taxAmount: (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0) || item.taxAmount || 0,
        cgstPercent: item.cgstPercent || 0,
        cgstAmount: item.cgstAmount || 0,
        sgstPercent: item.sgstPercent || 0,
        sgstAmount: item.sgstAmount || 0,
        igstPercent: item.igstPercent || 0,
        igstAmount: item.igstAmount || 0,
        total: item.totalAmount || item.amount || item.total || 0,
        itemCategory: item.itemCategory || '',
        itemCode: item.itemCode || '',
        hsnCode: item.hsnCode || '',
        description: item.description || '',
        taxMode: item.taxMode || 'inclusive',
        hasMultiUnit: item.hasMultiUnit || false,
        baseUnit: item.baseUnit || '',
        purchaseUnit: item.purchaseUnit || '',
        piecesPerPurchaseUnit: item.piecesPerPurchaseUnit || 0,
        sellingPricePerPiece: item.sellingPricePerPiece || 0,
        selectedUnit: item.selectedUnit || item.unit || 'Pcs',
      }))

      // Create new tab with duplicated invoice data
      const newTab: InvoiceTab = {
        id: Date.now().toString(),
        type: 'sale',
        mode: salesMode,
        customerName: invoice.partyName || '',
        customerPhone: invoice.partyPhone || '',
        customerEmail: invoice.partyEmail || '',
        customerGST: invoice.partyGSTIN || '',
        customerState: invoice.partyState || '',
        customerVehicleNo: invoice.vehicleNo || '',
        invoiceItems: duplicatedItems,
        paymentMode: invoice.paymentMode || 'cash',
        invoiceDiscount: invoice.invoiceDiscount || invoice.discount || 0,
        discountType: invoice.discountType || 'percent',
        notes: invoice.notes || '',
        customerSearch: invoice.partyName || ''
      }

      // Add the new tab
      setInvoiceTabs(prev => [...prev, newTab])
      setActiveTabId(newTab.id)
      
      // Set the new invoice number
      setInvoiceNumber(newInvoiceNumber)
      
      // Switch to create mode
      setViewMode('create')
      localStorage.setItem('sales_viewMode', 'create')

      toast.success(`Invoice duplicated! New invoice number: ${newInvoiceNumber}`)
      console.log('Duplicated invoice:', { original: invoice, newTab, newInvoiceNumber })
    } catch (error) {
      console.error('Failed to duplicate invoice:', error)
      toast.error('Failed to duplicate invoice')
    }
  }

  const handlePOSBill = (invoice: any) => {
    try {
      const posBill = `
=============================
       THIS AI CRM
=============================
Invoice: ${invoice.invoiceNumber}
Date: ${new Date(invoice.createdAt).toLocaleDateString()}
-----------------------------
Customer: ${invoice.partyName}
Phone: ${invoice.partyPhone || 'N/A'}
-----------------------------
ITEMS:
${invoice.items.map((item: any) => `${item.name} x ${item.quantity}
  @ ₹${item.rate} = ₹${item.amount}`).join('\n')}
-----------------------------
Subtotal:    ₹${invoice.subtotal}
Tax:         ₹${invoice.tax}
-----------------------------
TOTAL:       ₹${invoice.total}
=============================
    Thank You! Visit Again
=============================
    `
      const blob = new Blob([posBill], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `POS-${invoice.invoiceNumber}.txt`
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

  const handleSaleReturn = async (invoice: any) => {
    try {
      // Always fetch full invoice details from database since list view only has summary
      let fullInvoice = invoice

      // Try fetching from 'invoices' collection first (main collection)
      const invoiceDoc = await getDoc(doc(db, 'invoices', invoice.id))
      if (invoiceDoc.exists()) {
        fullInvoice = { id: invoiceDoc.id, ...invoiceDoc.data() }
      } else {
        // Fallback to 'sales' collection if not found
        const salesDoc = await getDoc(doc(db, 'sales', invoice.id))
        if (salesDoc.exists()) {
          fullInvoice = { id: salesDoc.id, ...salesDoc.data() }
        }
      }

      // Get the items array - check multiple possible field names
      let itemsArray = fullInvoice.itemsList || []

      // If itemsList is not an array or empty, check other fields
      if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
        // Check if 'items' is an array (not a number)
        if (Array.isArray(fullInvoice.items)) {
          itemsArray = fullInvoice.items
        }
      }

      // If still no items, show error
      if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
        toast.error('No items found in this invoice')
        console.error('Invoice data:', fullInvoice)
        return
      }

      // Check for previously returned items from this invoice
      // Store by itemId, name (lowercase), and index for better matching
      const returnedByItemId: Record<string, number> = {}
      const returnedByName: Record<string, number> = {}
      const returnedByIndex: Record<number, number> = {} // Track by item index as fallback

      // First check if we already know this invoice has returns from the indicator
      if (invoiceReturnsMap[invoice.id]) {
        console.log('Invoice has returns according to indicator:', invoiceReturnsMap[invoice.id])
      }

      // Query the database for detailed return info
      if (db) {
        try {
          const returnsQuery = query(
            collection(db, 'sale_returns'),
            where('originalInvoiceId', '==', invoice.id)
          )
          const returnsSnapshot = await getDocs(returnsQuery)
          console.log('Found previous returns:', returnsSnapshot.docs.length)
          returnsSnapshot.docs.forEach(returnDoc => {
            const returnData = returnDoc.data()
            console.log('Return record:', returnData)
            if (returnData.items && Array.isArray(returnData.items)) {
              returnData.items.forEach((returnedItem: any, idx: number) => {
                const returnQty = returnedItem.qty || returnedItem.quantity || 0

                // Track by itemId if available
                if (returnedItem.itemId) {
                  returnedByItemId[returnedItem.itemId] = (returnedByItemId[returnedItem.itemId] || 0) + returnQty
                }
                // Track by original item id if available
                if (returnedItem.originalItemId) {
                  returnedByItemId[returnedItem.originalItemId] = (returnedByItemId[returnedItem.originalItemId] || 0) + returnQty
                }
                // Also track by name (lowercase for case-insensitive matching)
                if (returnedItem.name) {
                  const nameKey = returnedItem.name.toLowerCase().trim()
                  returnedByName[nameKey] = (returnedByName[nameKey] || 0) + returnQty
                }
                // Track by itemName as well
                if (returnedItem.itemName) {
                  const nameKey = returnedItem.itemName.toLowerCase().trim()
                  returnedByName[nameKey] = (returnedByName[nameKey] || 0) + returnQty
                }
              })
            }
          })
          console.log('Returned by itemId:', returnedByItemId)
          console.log('Returned by name:', returnedByName)
        } catch (err) {
          console.error('Could not fetch previous returns:', err)
        }
      } else {
        console.warn('Database not available for return check')
      }

      // Prepare return items from invoice, reducing by already returned quantities
      const items = itemsArray.map((item: any, index: number) => {
        const itemId = item.itemId || item.inventoryId || item.productId || ''
        const uniqueItemId = item.id || `item_${index}` // The unique ID of this specific item in the invoice
        const itemName = item.description || item.name || item.itemName || 'Unknown Item'
        const originalQty = item.qty || item.quantity || 1

        // Check returned quantity - try multiple matching strategies
        let alreadyReturned = 0

        // Try matching by inventory itemId
        if (itemId && returnedByItemId[itemId]) {
          alreadyReturned = Math.max(alreadyReturned, returnedByItemId[itemId])
          console.log(`Matched by itemId: ${itemId}, returned: ${alreadyReturned}`)
        }

        // Try matching by unique item id from invoice
        if (uniqueItemId && returnedByItemId[uniqueItemId]) {
          alreadyReturned = Math.max(alreadyReturned, returnedByItemId[uniqueItemId])
          console.log(`Matched by uniqueItemId: ${uniqueItemId}, returned: ${alreadyReturned}`)
        }

        // Also check by name (lowercase for case-insensitive matching)
        if (itemName) {
          const nameKey = itemName.toLowerCase().trim()
          const returnedByThisName = returnedByName[nameKey] || 0
          if (returnedByThisName > alreadyReturned) {
            alreadyReturned = returnedByThisName
            console.log(`Matched by name: ${nameKey}, returned: ${alreadyReturned}`)
          }
        }

        const remainingQty = Math.max(0, originalQty - alreadyReturned)
        console.log(`Item: ${itemName} (id: ${itemId}, uniqueId: ${uniqueItemId}), Original: ${originalQty}, Returned: ${alreadyReturned}, Remaining: ${remainingQty}`)

        return {
          id: uniqueItemId,
          itemId: itemId, // Link to inventory item for stock update
          name: itemName,
          qty: 0, // Start with 0, user will select quantity to return
          maxQty: remainingQty, // Only allow returning remaining quantity
          price: item.price || item.rate || 0,
          tax: item.tax || item.taxRate || item.gst || 0,
          selected: false
        }
      }).filter(item => item.maxQty > 0) // Remove items that are fully returned

      // If all items are already returned, show message
      if (items.length === 0) {
        toast.info('All items from this invoice have already been returned')
        return
      }

      setSelectedInvoiceForReturn(fullInvoice)
      setReturnItems(items)
      setReturnReason('')
      setReturnNotes('')
      setShowSaleReturnModal(true)
    } catch (error) {
      console.error('Error fetching invoice for return:', error)
      toast.error('Failed to load invoice details')
    }
  }

  const processSaleReturn = async () => {
    if (!selectedInvoiceForReturn) {
      toast.error('No invoice selected')
      return
    }

    if (!db) {
      toast.error('Database not initialized')
      return
    }

    const selectedItems = returnItems.filter(item => item.selected && item.qty > 0)
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return')
      return
    }

    if (!returnReason.trim()) {
      toast.error('Please provide a reason for the return')
      return
    }

    setIsProcessingReturn(true)

    try {
      // Calculate return totals - use basePrice for correct taxable amount
      const returnSubtotal = selectedItems.reduce((sum, item) => {
        const taxablePerUnit = item.basePrice || (item.taxMode === 'inclusive' ? item.price / (1 + (item.tax || 0) / 100) : item.price)
        return sum + (taxablePerUnit * item.qty)
      }, 0)
      const returnTax = selectedItems.reduce((sum, item) => {
        const taxablePerUnit = item.basePrice || (item.taxMode === 'inclusive' ? item.price / (1 + (item.tax || 0) / 100) : item.price)
        return sum + (taxablePerUnit * item.qty * (item.tax || 0) / 100)
      }, 0)
      const returnTotal = returnSubtotal + returnTax

      // Generate return number
      const returnNumber = `RET-${selectedInvoiceForReturn.invoiceNumber || 'INV'}-${Date.now().toString().slice(-4)}`

      // Create sale return record
      const saleReturnData = {
        returnNumber,
        originalInvoiceId: selectedInvoiceForReturn.id || '',
        originalInvoiceNumber: selectedInvoiceForReturn.invoiceNumber || '',
        partyId: selectedInvoiceForReturn.partyId || '',
        partyName: selectedInvoiceForReturn.partyName || selectedInvoiceForReturn.customerName || 'Walk-in Customer',
        returnDate: new Date().toISOString().split('T')[0],
        items: selectedItems.map(item => ({
          itemId: item.itemId || '',
          originalItemId: item.id || '', // Store the original item id from the invoice for better matching
          name: item.name || 'Unknown Item',
          qty: item.qty || 0,
          price: item.price || 0,
          tax: item.tax || 0,
          total: (item.price || 0) * (item.qty || 0)
        })),
        subtotal: returnSubtotal,
        tax: returnTax,
        total: returnTotal,
        reason: returnReason,
        notes: returnNotes || '',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      console.log('Creating sale return:', saleReturnData)

      // Save sale return to database
      const docRef = await addDoc(collection(db, 'sale_returns'), saleReturnData)
      console.log('Sale return created with ID:', docRef.id)

      // Update inventory - add returned quantities back to stock
      for (const item of selectedItems) {
        if (item.itemId) {
          try {
            console.log('Updating stock for item:', item.itemId, 'Adding qty:', item.qty)
            const itemRef = doc(db, 'items', item.itemId)
            const itemDoc = await getDoc(itemRef)
            if (itemDoc.exists()) {
              const currentStock = itemDoc.data().stock || itemDoc.data().currentStock || 0
              const newStock = currentStock + item.qty
              await updateDoc(itemRef, {
                stock: newStock,
                currentStock: newStock,
                updatedAt: new Date().toISOString()
              })
              console.log('Stock updated successfully:', item.name, 'from', currentStock, 'to', newStock)
            } else {
              console.warn('Item not found in inventory:', item.itemId)
            }
          } catch (invError) {
            console.error('Could not update inventory for item:', item.itemId, invError)
          }
        } else {
          console.log('No itemId found for item:', item.name, '- skipping inventory update')
        }
      }

      // Update original invoice - reduce totals and mark items as returned
      try {
        const invoiceRef = doc(db, 'invoices', selectedInvoiceForReturn.id)
        const invoiceDoc = await getDoc(invoiceRef)
        
        if (invoiceDoc.exists()) {
          const invoiceData = invoiceDoc.data()
          const currentTotal = invoiceData.total || invoiceData.grandTotal || 0
          const currentPaidAmount = invoiceData.paidAmount || 0
          const newTotal = Math.max(0, currentTotal - returnTotal)
          const newDueAmount = Math.max(0, newTotal - currentPaidAmount)
          
          // Calculate new payment status
          let newPaymentStatus = invoiceData.paymentStatus
          if (newTotal === 0) {
            newPaymentStatus = 'returned' // Fully returned - all items returned
          } else if (currentPaidAmount >= newTotal && newTotal > 0) {
            newPaymentStatus = 'paid'
          } else if (currentPaidAmount > 0 && currentPaidAmount < newTotal) {
            newPaymentStatus = 'partial'
          }
          
          // Track returned amounts on the invoice
          const returnedAmount = (invoiceData.returnedAmount || 0) + returnTotal
          const returnedCount = (invoiceData.returnedCount || 0) + 1
          
          await updateDoc(invoiceRef, {
            total: newTotal,
            grandTotal: newTotal,
            dueAmount: newDueAmount,
            paymentStatus: newPaymentStatus,
            returnedAmount: returnedAmount,
            returnedCount: returnedCount,
            hasReturns: true,
            isFullyReturned: newTotal === 0,
            lastReturnId: docRef.id,
            lastReturnDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          
          console.log('✅ Invoice updated - New Total:', newTotal, 'Returned:', returnedAmount)
        }
      } catch (invoiceUpdateError) {
        console.error('Could not update invoice totals:', invoiceUpdateError)
      }

      // Update party balance if exists (optional)
      if (selectedInvoiceForReturn.partyId) {
        try {
          const partyRef = doc(db, 'parties', selectedInvoiceForReturn.partyId)
          const partyDoc = await getDoc(partyRef)
          if (partyDoc.exists()) {
            const currentBalance = partyDoc.data().balance || 0
            await updateDoc(partyRef, {
              balance: currentBalance - returnTotal,
              updatedAt: new Date().toISOString()
            })
          }
        } catch (partyError) {
          console.warn('Could not update party balance:', partyError)
        }
      }

      // Update Cash in Hand - reduce balance for refund (Firebase real-time sync)
      if (returnTotal > 0) {
        try {
          const { updateCashInHand, saveBankingPageTransactions, getBankingPageTransactions } = await import('../services/bankingService')

          // Reduce Cash in Hand (negative amount for deduction)
          await updateCashInHand(-returnTotal, `Sales Return Refund - ${returnNumber} (${saleReturnData.partyName})`)

          // Add transaction record to Firebase
          const transactions = await getBankingPageTransactions()
          const newTransaction = {
            id: Date.now() + Math.random(),
            type: 'debit' as const,
            description: `Sales Return Refund - ${returnNumber} (${saleReturnData.partyName})`,
            amount: returnTotal,
            date: new Date().toISOString().split('T')[0],
            account: 'Cash in Hand'
          }
          transactions.unshift(newTransaction)
          await saveBankingPageTransactions(transactions)

          console.log('💰 Sales Return: Cash in Hand reduced by ₹', returnTotal, '(Firebase)')
        } catch (bankingError) {
          console.error('Failed to update banking for sales return:', bankingError)
        }
      }

      toast.success(`Sale Return ${returnNumber} created successfully! ₹${returnTotal.toFixed(2)} refunded from Cash in Hand.`)
      setShowSaleReturnModal(false)
      setSelectedInvoiceForReturn(null)
      setReturnItems([])
      setReturnReason('')
      setReturnNotes('')

      // Refresh the invoices list to show updated totals
      await loadInvoicesFromDatabase()

      // Refresh the returns map to show the indicator immediately
      const invoiceIds = invoices.map(inv => inv.id)
      fetchInvoiceReturns(invoiceIds)

    } catch (error: any) {
      console.error('Error processing sale return:', error)
      toast.error(`Failed to process sale return: ${error.message || 'Unknown error'}`)
    } finally {
      setIsProcessingReturn(false)
    }
  }

  const desktopTableStyle = {
    maxHeight: '55vh',
    minHeight: invoiceItems.length > 0 ? '120px' : '0'
  }

  return (
    <div className={cn(
      "overflow-x-hidden flex flex-col max-w-[100vw] w-full",
      viewMode === 'list' ? "px-3 py-2 bg-[#f5f7fa] min-h-screen" : "bg-white"
    )}>
      {/* Header - Only show in list mode */}
      {viewMode === 'list' && (
      <div className="flex-shrink-0">
        {/* Top Row: Period Filter Left + Action Button Right */}
        <div className="flex items-center justify-between mb-3">
          {/* Period Filter Tabs - Left Side */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center gap-1 text-xs bg-[#f5f7fa] dark:bg-slate-800 rounded-xl p-1.5 shadow-[inset_3px_3px_6px_#e0e3e7,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]">
              {['today', 'week', 'month', 'year', 'all', 'custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setSelectedPeriod(period)
                    setStatsFilter(period as any)
                    if (period === 'custom') {
                      setShowCustomDatePicker(true)
                    } else {
                      setShowCustomDatePicker(false)
                    }
                  }}
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

          {/* Action Buttons - Right Side */}
          <div className="flex items-center gap-2 flex-shrink-0">
                {/* Tally Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTallyDropdownPosition({
                        top: rect.bottom + 4,
                        left: rect.right - 160
                      })
                      setShowTallyDropdown(!showTallyDropdown)
                    }}
                    className="h-8 px-3 rounded-lg border border-emerald-200 bg-white text-xs text-emerald-600 font-semibold flex items-center gap-1.5 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                  >
                    <Download size={14} weight="bold" />
                    <span>Tally</span>
                    <CaretDown size={12} />
                  </button>
                  {showTallyDropdown && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setShowTallyDropdown(false)} />
                      <div
                        className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[101] min-w-[160px]"
                        style={{
                          top: tallyDropdownPosition.top,
                          left: Math.max(8, tallyDropdownPosition.left)
                        }}
                      >
                        <button
                          onClick={() => {
                            exportToTallyExcel(invoices)
                            setShowTallyDropdown(false)
                            toast.success('Tally Excel exported!')
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2"
                        >
                          <Download size={14} className="text-emerald-600" />
                          Export Excel
                        </button>
                        <button
                          onClick={() => {
                            exportToTallyCSV(invoices)
                            setShowTallyDropdown(false)
                            toast.success('Tally CSV exported!')
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2"
                        >
                          <Download size={14} className="text-emerald-600" />
                          Export CSV
                        </button>
                        <button
                          onClick={() => {
                            downloadTallyXML(invoices)
                            setShowTallyDropdown(false)
                            toast.success('Tally XML exported!')
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2"
                        >
                          <Download size={14} className="text-emerald-600" />
                          Export XML
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {/* Add Quotation/New POS Bill */}
                <button
                  onClick={() => {
                    if (location.pathname === '/pos') {
                      setShowCafePOS(true)
                      localStorage.removeItem('pos_viewMode')
                    }
                    setViewMode('create')
                  }}
                  className="h-9 px-4 rounded-xl bg-blue-600 text-xs text-white font-semibold flex items-center gap-1.5
                    shadow-[4px_4px_8px_#e0e3e7,-4px_-4px_8px_#ffffff]
                    dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
                    hover:shadow-[6px_6px_12px_#e0e3e7,-6px_-6px_12px_#ffffff]
                    active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15)]
                    transition-all duration-200"
                >
                  <Plus size={14} weight="bold" />
                  <span>{location.pathname === '/pos' ? 'POS' : 'Quotation'}</span>
                </button>
          </div>
        </div>

        {/* Stats Grid - Dashboard Style Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">

          {/* Sales Card */}
          <button
            onClick={() => setFilterStatus('all')}
            className="bg-[#e4ebf5] rounded-2xl p-4 shadow-[10px_10px_20px_#c5ccd6,-10px_-10px_20px_#ffffff] hover:shadow-[14px_14px_28px_#c5ccd6,-14px_-14px_28px_#ffffff] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{t.nav.sales}</span>
              <div className="w-10 h-10 rounded-xl bg-green-100/80 flex items-center justify-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">₹{dashboardStats.periodSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </button>

          {/* Collected Card */}
          <button
            onClick={() => setFilterStatus('paid')}
            className="bg-[#e4ebf5] rounded-2xl p-4 shadow-[10px_10px_20px_#c5ccd6,-10px_-10px_20px_#ffffff] hover:shadow-[14px_14px_28px_#c5ccd6,-14px_-14px_28px_#ffffff] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{t.sales.collected}</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600">₹{dashboardStats.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </button>

          {/* Pending Card */}
          <button
            onClick={() => setFilterStatus('pending')}
            className="bg-[#e4ebf5] rounded-2xl p-4 shadow-[10px_10px_20px_#c5ccd6,-10px_-10px_20px_#ffffff] hover:shadow-[14px_14px_28px_#c5ccd6,-14px_-14px_28px_#ffffff] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{t.sales.pending}</span>
              <div className="w-10 h-10 rounded-xl bg-orange-100/80 flex items-center justify-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-red-500">₹{dashboardStats.pendingRecovery.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </button>

          {/* Invoices Card */}
          <button
            onClick={() => setFilterStatus('all')}
            className="bg-[#e4ebf5] rounded-2xl p-4 shadow-[10px_10px_20px_#c5ccd6,-10px_-10px_20px_#ffffff] hover:shadow-[14px_14px_28px_#c5ccd6,-14px_-14px_28px_#ffffff] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{t.sales.invoice}</span>
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 flex items-center justify-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{dashboardStats.invoiceCount}</div>
          </button>
        </div>
      </div>
      )}

      {/* Filters - Modern Clean */}
      {viewMode === 'list' && (
      <div className="bg-white rounded-xl px-3 py-2 mb-2 border border-slate-200 shadow-sm flex-shrink-0">
        {/* Mobile: Stack vertically, Desktop: Single row */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder={language === 'ta' ? 'பில், வாடிக்கையாளர், மொபைல் தேடு...' : 'Search invoice, customer, mobile...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[12px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>
          {/* Filter Chips */}
          <div className="flex gap-2 justify-center md:justify-end flex-shrink-0">
            {[
              { key: 'all', label: t.common.all },
              { key: 'paid', label: t.sales.paid },
              { key: 'pending', label: t.sales.pending },
              { key: 'partial', label: t.sales.partial },
              { key: 'returned', label: 'Returned' }
            ].map((status) => (
              <motion.button
                key={status.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterStatus(status.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200",
                  filterStatus === status.key
                    ? "bg-slate-800 text-white border-transparent shadow-sm"
                    : "border-slate-200 text-slate-600 bg-white hover:border-slate-400"
                )}
              >
                {status.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Invoices List - Only show in list mode */}
      {viewMode === 'list' && (
      <div ref={listContainerRef} className="flex-1 overflow-y-auto space-y-1">
        {isLoadingInvoices ? (
          // Loading skeleton
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-slate-200 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="hidden sm:block w-10 h-10 bg-slate-100 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-32"></div>
                      <div className="h-3 bg-slate-100 rounded w-48"></div>
                    </div>
                  </div>
                  <div className="h-6 w-24 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 bg-white rounded-lg border border-slate-200"
          >
            <Receipt size={40} weight="duotone" className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-semibold mb-1.5 text-slate-700">{language === 'ta' ? 'விற்பனை பில்கள் இல்லை' : 'No Sales Invoices Yet'}</h3>
            <p className="text-sm text-slate-500 mb-3">
              {language === 'ta' ? 'பில் ஸ்கேன் செய்யவும் அல்லது புதிய விற்பனை உருவாக்கவும்' : 'Start by scanning an invoice or creating a new sale'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowScanner(true)}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Camera size={16} weight="bold" />
                {t.dashboard.aiScan}
              </button>
              <button
                onClick={() => setViewMode('create')}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <Plus size={16} weight="bold" />
                {t.sales.newSale}
              </button>
            </div>
          </motion.div>
        ) : (
          <>
          {/* Sticky Header Row */}
          <div className="bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 sticky top-0 z-10 hidden md:flex">
            <div style={{ width: '9%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t.common.date}</div>
            <div style={{ width: '14%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t.sales.invoice}</div>
            <div style={{ width: '16%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t.sales.customer}</div>
            <div style={{ width: '11%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t.parties.phone}</div>
            <div style={{ width: '8%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-center">{t.inventory.items}</div>
            <div style={{ width: '9%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-center">{t.common.status}</div>
            <div style={{ width: '9%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-right">{language === 'ta' ? 'பில் நிலுவை' : 'Inv Bal'}</div>
            <div style={{ width: '9%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-right">{language === 'ta' ? 'கஸ்ட் நிலுவை' : 'Cust Bal'}</div>
            <div style={{ width: '15%' }} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-center">{t.common.actions}</div>
          </div>
          <AnimatePresence>
            {filteredInvoices.map((invoice, index) => {
            const statusInfo = statusConfig[invoice.paymentStatus] || statusConfig['pending']

            // Calculate invoice age
            const invoiceDate = new Date(invoice.date)
            const today = new Date()
            const diffTime = Math.abs(today.getTime() - invoiceDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            const ageText = diffDays === 0 ? t.common.today : diffDays === 1 ? '1d' : `${diffDays}d`
            const ageColor = diffDays > 30 ? 'text-red-600 bg-red-50' : diffDays > 7 ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100'

            // Calculate balance and payment progress
            const balance = invoice.total - (invoice.paidAmount || 0)
            const paymentPercent = invoice.total > 0 ? Math.round(((invoice.paidAmount || 0) / invoice.total) * 100) : 0

            // Invoice type badge - shows payment method selected during sale
            const getInvoiceType = () => {
              // Check payment status first
              const isPending = invoice.paymentStatus === 'pending' || invoice.paymentStatus === 'unpaid'
              const paidAmount = invoice.paidAmount || 0
              const total = invoice.total || 0
              const hasNoPayment = paidAmount === 0 || isPending

              // Check for multiple payment methods (if payments array exists)
              const payments = invoice.payments || []
              const uniquePaymentModes = new Set(
                payments.map((p: any) => p.paymentMode || p.type || p.mode).filter(Boolean)
              )
              const hasMultiplePayments = uniquePaymentModes.size > 1

              // If pending with no payment, show "No Pay"
              if (hasNoPayment && !invoice.paymentMode && !invoice.payment?.mode) {
                return 'No Pay'
              }

              // If multiple payment methods, show "Mixed"
              if (hasMultiplePayments) {
                return 'Mixed'
              }

              // Otherwise, show the payment method
              const paymentMode = (invoice.paymentMode || invoice.payment?.mode || (payments.length > 0 ? payments[0].paymentMode || payments[0].type : '') || '').toLowerCase()

              if (paymentMode === 'cash') return 'Cash'
              if (paymentMode === 'bank') return 'Bank'
              if (paymentMode === 'upi') return 'UPI'
              if (paymentMode === 'card') return 'Card'
              if (paymentMode === 'cheque') return 'Chq'
              if (paymentMode === 'credit') return 'Credit'

              // If pending but has a payment method selected, still show it
              // But if truly no payment method, show "No Pay"
              if (isPending && hasNoPayment) {
                return 'No Pay'
              }

              // Fallback
              return 'No Pay'
            }
            const invoiceType = getInvoiceType()

            // Payment mode icon
            const paymentModeIcon = () => {
              const mode = invoice.paymentMode || invoice.payment?.mode || 'cash'
              if (mode === 'cash') return <span title={language === 'ta' ? 'ரொக்க பணம்' : 'Cash Payment'} className="text-emerald-600">💵</span>
              if (mode === 'bank') return <span title={language === 'ta' ? 'வங்கி பரிமாற்றம்' : 'Bank Transfer'} className="text-blue-600">🏦</span>
              if (mode === 'upi') return <span title={language === 'ta' ? 'UPI பணம்' : 'UPI Payment'} className="text-purple-600">📲</span>
              if (mode === 'card') return <span title={language === 'ta' ? 'கார்டு பணம்' : 'Card Payment'} className="text-orange-600">💳</span>
              if (mode === 'cheque') return <span title={language === 'ta' ? 'காசோலை பணம்' : 'Cheque Payment'} className="text-gray-600">📄</span>
              return <span title={language === 'ta' ? 'ரொக்க பணம்' : 'Cash Payment'} className="text-emerald-600">💵</span>
            }

            return (
              <motion.div
                key={invoice.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => viewInvoice(invoice)}
                className="md:border-b md:border-border/30 md:hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
              >
                {/* MOBILE CARD VIEW - Clean & Nice */}
                <div className="md:hidden bg-white rounded-xl px-2.5 py-2.5 border border-slate-100 shadow-sm mb-1.5 overflow-hidden">
                  <div className="flex items-center gap-2">
                    {/* Left: Customer & Invoice Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[13px] font-semibold text-slate-800 truncate max-w-[120px]">{invoice.partyName || 'Walk-in'}</span>
                        <span className={cn(
                          "text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap",
                          invoice.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700" :
                          invoice.paymentStatus === 'partial' ? "bg-blue-100 text-blue-700" :
                          invoice.paymentStatus === 'returned' ? "bg-slate-200 text-slate-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {invoice.paymentStatus === 'paid' ? 'Paid' : invoice.paymentStatus === 'partial' ? 'Partial' : invoice.paymentStatus === 'returned' ? 'Returned' : 'Pending'}
                        </span>
                        {/* Returned Items Indicator - hide if fully returned */}
                        {invoiceReturnsMap[invoice.id] && invoice.paymentStatus !== 'returned' && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 bg-red-100 text-red-700 flex items-center gap-0.5 whitespace-nowrap" title={`${invoiceReturnsMap[invoice.id].totalReturned} items returned (₹${invoiceReturnsMap[invoice.id].totalAmount.toLocaleString('en-IN')})`}>
                            <ArrowCounterClockwise size={9} weight="bold" />
                            {invoiceReturnsMap[invoice.id].totalReturned}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 overflow-hidden">
                        <span className="truncate max-w-[80px]">{invoice.invoiceNumber}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className="flex-shrink-0 whitespace-nowrap">{new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className={cn(
                          "px-1 py-0.5 rounded text-[8px] font-semibold flex-shrink-0 whitespace-nowrap",
                          invoiceType === 'Cash' && "bg-emerald-100 text-emerald-700",
                          invoiceType === 'Bank' && "bg-blue-100 text-blue-700",
                          invoiceType === 'UPI' && "bg-purple-100 text-purple-700",
                          invoiceType === 'Card' && "bg-orange-100 text-orange-700",
                          invoiceType === 'Chq' && "bg-slate-100 text-slate-700",
                          invoiceType === 'Credit' && "bg-red-100 text-red-700",
                          invoiceType === 'Mixed' && "bg-purple-100 text-purple-700",
                          invoiceType === 'No Pay' && "bg-gray-100 text-gray-500"
                        )}>
                          {invoiceType}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0 min-w-[70px]">
                      <div className="text-[13px] font-bold text-slate-800 whitespace-nowrap">₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      {invoice.paymentStatus !== 'paid' && (
                        <div className="text-[9px] text-amber-600 font-medium whitespace-nowrap">Due ₹{(invoice.dueAmount || invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openPaymentModal(invoice) }}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                          invoice.paymentStatus === 'paid' ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        )}
                      >
                        {invoice.paymentStatus === 'paid' ? <ArrowCounterClockwise size={15} weight="bold" /> : <CheckCircle size={15} weight="duotone" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (openActionMenu === invoice.id) {
                            setOpenActionMenu(null)
                            setDropdownPosition(null)
                            setDropdownInvoiceId(null)
                            setDropdownButtonElement(null)
                          } else {
                            setDropdownButtonElement(e.currentTarget)
                            const rect = e.currentTarget.getBoundingClientRect()
                            setDropdownPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                            setDropdownInvoiceId(invoice.id)
                            setOpenActionMenu(invoice.id)
                          }
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
                      >
                        <DotsThreeVertical size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:flex items-center px-3 py-2 bg-white rounded-lg border border-slate-100 mb-1 hover:border-blue-200 hover:shadow-sm transition-all">
                {/* Date (9%) */}
                <div style={{ width: '9%' }} className="text-xs text-slate-600">
                  {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </div>

                {/* Invoice + Type Badge (14%) */}
                <div style={{ width: '14%' }} className="flex items-center gap-1 pr-1">
                  <span className="font-medium text-xs text-slate-800 truncate">{invoice.invoiceNumber}</span>
                  <span className={cn(
                    "px-1 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap",
                    invoiceType === 'Cash' && "bg-emerald-100 text-emerald-700",
                    invoiceType === 'Bank' && "bg-blue-100 text-blue-700",
                    invoiceType === 'UPI' && "bg-purple-100 text-purple-700",
                    invoiceType === 'Card' && "bg-orange-100 text-orange-700",
                    invoiceType === 'Chq' && "bg-slate-100 text-slate-700",
                    invoiceType === 'Credit' && "bg-red-100 text-red-700",
                    invoiceType === 'Mixed' && "bg-purple-100 text-purple-700",
                    invoiceType === 'No Pay' && "bg-gray-100 text-gray-500"
                  )}>
                    {invoiceType}
                  </span>
                </div>

                {/* Customer (16%) */}
                <div style={{ width: '16%' }} className="pr-1 overflow-hidden">
                  <span className="font-medium text-xs truncate block text-slate-800">{invoice.partyName || 'Walk-in'}</span>
                </div>

                {/* Phone (11%) */}
                <div style={{ width: '11%' }} className="text-xs text-slate-500">
                  {invoice.partyPhone || '-'}
                </div>

                {/* Items (8%) */}
                <div style={{ width: '8%' }} className="text-center text-xs text-slate-500">
                  {invoice.itemsCount} item{invoice.itemsCount !== 1 ? 's' : ''}
                </div>

                {/* Status (9%) */}
                <div style={{ width: '9%' }} className="flex flex-col items-center gap-0.5">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    invoice.paymentStatus === 'paid' && "bg-emerald-100 text-emerald-700",
                    invoice.paymentStatus === 'pending' && "bg-red-100 text-red-700",
                    invoice.paymentStatus === 'partial' && "bg-amber-100 text-amber-700",
                    invoice.paymentStatus === 'returned' && "bg-slate-200 text-slate-700"
                  )}>
                    {statusInfo.label}
                  </span>
                  {/* Returned Items Indicator */}
                  {invoiceReturnsMap[invoice.id] && invoice.paymentStatus !== 'returned' && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold bg-red-100 text-red-700 flex items-center gap-0.5 cursor-help"
                      title={`${invoiceReturnsMap[invoice.id].totalReturned} items returned in ${invoiceReturnsMap[invoice.id].returnCount} return(s) - ₹${invoiceReturnsMap[invoice.id].totalAmount.toLocaleString('en-IN')}`}
                    >
                      <ArrowCounterClockwise size={9} weight="bold" />
                      {invoiceReturnsMap[invoice.id].totalReturned} Ret
                    </span>
                  )}
                </div>

                {/* Invoice Balance (9%) */}
                <div style={{ width: '9%' }} className="text-right pr-1">
                  <div className="font-semibold text-xs text-slate-800">₹{(balance > 0 ? balance : invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>

                {/* Customer Balance (9%) */}
                <div style={{ width: '9%' }} className="text-right pr-1">
                  <div className={cn(
                    "font-semibold text-xs",
                    invoice.customerOutstanding > 0 ? "text-emerald-600" :
                    invoice.customerOutstanding < 0 ? "text-red-600" : "text-slate-500"
                  )}>
                    {invoice.customerOutstanding > 0 ? '+' : invoice.customerOutstanding < 0 ? '' : ''}₹{Math.abs(invoice.customerOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Actions (15%) - Compact */}
                <div style={{ width: '15%' }} className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); viewInvoice(invoice) }}
                        className="w-7 h-7 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                        title="View"
                      >
                        <Eye size={16} weight="duotone" className="text-blue-600" />
                      </button>
                      {/* Hide payment button for fully returned invoices */}
                      {invoice.paymentStatus !== 'returned' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openPaymentModal(invoice) }}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                          invoice.isReversed
                            ? "bg-amber-50 hover:bg-amber-100"
                            : invoice.paymentStatus === 'paid'
                              ? "bg-amber-50 hover:bg-amber-100"
                              : "bg-emerald-50 hover:bg-emerald-100"
                        )}
                        title={invoice.isReversed ? (language === 'ta' ? "பணம் திருப்பப்பட்டது - புதிய பணம் பதிவு செய்ய கிளிக் செய்யவும்" : "Payment Reversed - Click to record new payment") : invoice.paymentStatus === 'paid' ? (language === 'ta' ? "பணத்தை திருப்பு" : "Reverse Payment") : (language === 'ta' ? "பணம் பதிவு" : "Record Payment")}
                      >
                        {invoice.isReversed
                          ? <ArrowCounterClockwise size={16} weight="duotone" className="text-amber-600" />
                          : invoice.paymentStatus === 'paid'
                            ? <ArrowCounterClockwise size={16} weight="duotone" className="text-amber-600" />
                            : <CheckCircle size={16} weight="duotone" className="text-emerald-600" />
                        }
                      </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrintInvoice(invoice) }}
                        className="w-7 h-7 flex items-center justify-center bg-amber-50 hover:bg-amber-100 rounded-lg transition-all"
                        title="Print"
                      >
                        <Printer size={16} weight="duotone" className="text-amber-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(invoice) }}
                        className="w-7 h-7 flex items-center justify-center bg-green-50 hover:bg-green-100 rounded-lg transition-all"
                        title="WhatsApp"
                      >
                        <WhatsappLogo size={16} weight="duotone" className="text-green-600" />
                      </button>

                      {/* 3-dot menu for additional actions */}
                      <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (openActionMenu === invoice.id) {
                              setOpenActionMenu(null)
                              setDropdownPosition(null)
                              setDropdownInvoiceId(null)
                              setDropdownButtonElement(null)
                            } else {
                              setDropdownButtonElement(e.currentTarget as HTMLElement)
                              const rect = e.currentTarget.getBoundingClientRect()
                              setDropdownPosition({
                                top: rect.bottom + 4,
                                right: window.innerWidth - rect.right
                              })
                              setDropdownInvoiceId(invoice.id)
                              setOpenActionMenu(invoice.id)
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                        >
                          <DotsThreeVertical size={16} weight="bold" className="text-gray-500" />
                        </motion.button>

                      </div>
                </div>
                </div>

                {/* Dropdown Menu - Rendered via Portal to avoid transform stacking context issues */}
                {/* Moved outside mobile/desktop views so it works on both */}
                {openActionMenu === invoice.id && dropdownPosition && dropdownInvoiceId === invoice.id && createPortal(
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-[100]"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenActionMenu(null)
                        setDropdownPosition(null)
                        setDropdownInvoiceId(null)
                        setDropdownButtonElement(null)
                      }}
                    />
                    {/* Menu - Professional dropdown with scroll support */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                      className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-[101] w-52 overflow-y-auto"
                      style={{
                        top: (() => {
                          const menuHeight = 480; // Approximate height for all menu items
                          const spaceBelow = window.innerHeight - dropdownPosition.top;
                          const spaceAbove = dropdownPosition.top;
                          // If not enough space below and more space above, position above
                          if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                            return Math.max(8, dropdownPosition.top - Math.min(menuHeight, spaceAbove - 16));
                          }
                          return dropdownPosition.top;
                        })(),
                        right: Math.max(8, dropdownPosition.right),
                        maxHeight: (() => {
                          const menuHeight = 480;
                          const spaceBelow = window.innerHeight - dropdownPosition.top - 16;
                          const spaceAbove = dropdownPosition.top - 16;
                          // Use available space with a minimum of 300px for usability
                          if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                            return Math.min(menuHeight, spaceAbove);
                          }
                          return Math.min(menuHeight, spaceBelow);
                        })()
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Edit Invoice */}
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          handleEditInvoice(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <Pencil size={18} weight="duotone" className="text-primary" />
                        <span>{language === 'ta' ? 'பில் திருத்து' : 'Edit Invoice'}</span>
                      </button>

                      {/* View Invoice */}
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          viewInvoice(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <Eye size={18} weight="duotone" className="text-indigo-600" />
                        <span>{language === 'ta' ? 'பார்க்க' : 'View Invoice'}</span>
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          handleShareWhatsApp(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <WhatsappLogo size={18} weight="fill" className="text-green-600" />
                        <span>{language === 'ta' ? 'வாட்ஸ்அப்' : 'WhatsApp'}</span>
                      </button>

                      {/* Record/Reverse Payment - Hide for fully returned */}
                      {invoice.paymentStatus !== 'returned' && (
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          openPaymentModal(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        {invoice.paymentStatus === 'paid'
                          ? <ArrowCounterClockwise size={18} weight="bold" className="text-amber-600" />
                          : <CheckCircle size={18} weight="duotone" className="text-emerald-600" />
                        }
                        <span>{invoice.paymentStatus === 'paid'
                          ? (language === 'ta' ? 'பணம் திருப்பு' : 'Reverse Payment')
                          : (language === 'ta' ? 'பணம் பதிவு' : 'Record Payment')
                        }</span>
                      </button>
                      )}

                      {/* Convert to Invoice */}
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          handleConvertToInvoice(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <ArrowRight size={18} weight="duotone" className="text-purple-600" />
                        <span>Convert to Invoice</span>
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-700 my-1.5 mx-2" />

                      {/* Download PDF */}
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          handleDownloadPDF(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <Download size={18} weight="duotone" className="text-primary" />
                        <span>{language === 'ta' ? 'PDF பதிவிறக்கு' : 'Download PDF'}</span>
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-700 my-1.5 mx-2" />

                      {/* Duplicate Invoice */}
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          handleDuplicateInvoice(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <Copy size={18} weight="duotone" className="text-slate-500" />
                        <span>{language === 'ta' ? 'நகலெடு' : 'Duplicate'}</span>
                      </button>

                      {/* POS Bill */}
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          handlePOSBill(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <Receipt size={18} weight="duotone" className="text-slate-500" />
                        <span>{t.sales.pos}</span>
                      </button>

                      {/* Create Sale Return - Hide for fully returned */}
                      {invoice.paymentStatus !== 'returned' && (
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          handleSaleReturn(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <ArrowUUpLeft size={18} weight="duotone" className="text-orange-500" />
                        <span>{language === 'ta' ? 'திருப்பி' : 'Sale Return'}</span>
                      </button>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-700 my-1.5 mx-2" />

                      {/* Delete Invoice */}
                      <button
                        onClick={() => {
                          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
                          confirmDelete(invoice)
                          setOpenActionMenu(null)
                          setDropdownPosition(null)
                          setDropdownInvoiceId(null)
                          setDropdownButtonElement(null)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 text-sm text-red-600"
                      >
                        <Trash size={18} weight="duotone" />
                        <span>{t.common.delete}</span>
                      </button>
                    </motion.div>
                  </>,
                  document.body
                )}
              </motion.div>
            )
          })}
          </AnimatePresence>
          </>
        )}
      </div>
      )}

      {/* Create Invoice Form - Show when in create mode */}
      {viewMode === 'create' && (
        <div className="flex flex-col h-[calc(100vh-64px)]">
          {/* Modern Café POS View */}
          {showCafePOS ? (
            <div className="flex-1 overflow-hidden h-full">
              <ModernPOS
                key={`pos-${posResetKey}`}
                onAddCustomer={() => setShowAddCustomerModal(true)}
                onCheckout={(cartItems, custName) => {
                  // Store cart items and show the professional checkout wizard
                  setPosCartItems(cartItems)
                  setShowPOSCheckoutWizard(true)
                }}
                onQuickCheckout={handleQuickCheckout}
                onClose={handleBackToList}
              />
            </div>
          ) : (
          <div
            className={cn(
              "flex flex-col",
              (salesMode === 'pos' || showPosPreview)
                ? "lg:flex-row gap-2"
                : ""
            )}
          >
          {/* Left Column - Invoice Form / POS Product Area */}
          <div className="flex flex-col bg-white">


          {/* Tabs for multiple invoices + Mode Toggle + Back */}
          <div className="flex items-center gap-2 px-2 py-1 border-b border-border/50 flex-shrink-0">
            {/* Invoice Tabs */}
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {invoiceTabs.map((tab) => (
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
                      {tab.mode === 'pos' ? 'POS' : 'Invoice'}
                    </span>
                    {tab.customerName && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                        - {tab.customerName}
                      </span>
                    )}
                  </div>
                  {invoiceTabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(tab.id)
                      }}
                      className="p-0.5 hover:bg-muted rounded transition-colors"
                    >
                      <X size={14} className="text-black" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add new tab button - color based on current mode */}
              <button
                onClick={() => addNewTab('sale')}
                className="p-1 hover:bg-muted rounded transition-colors group"
                title={`Add ${salesMode === 'pos' ? 'POS' : 'Invoice'} Tab`}
              >
                <div className="flex items-center gap-0.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    salesMode === 'pos' ? "bg-green-500" : "bg-blue-500"
                  )} />
                  <Plus size={14} className="text-black" />
                </div>
              </button>
            </div>

            {/* Spacer to push back button to right */}
            <div className="ml-auto" />

            {/* Back Button */}
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white hover:bg-slate-600 rounded-lg font-semibold transition-colors text-sm shadow-sm"
            >
              <ArrowLeft size={18} weight="bold" />
              <span>Back to List</span>
            </button>
          </div>

          <div className={cn(
            "flex flex-col overflow-y-auto",
            salesMode === 'pos' ? "p-2" : "p-2"
          )}>
            {/* HEADER - Fixed at top */}
            <div className="flex-shrink-0">
            {/* Mobile Header - Compact */}
            <div className="md:hidden mb-1">
              <div className="relative" ref={customerDropdownRef}>
                {/* Customer Search - Full Width */}
                <User size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  placeholder={customerName || "Search customer..."}
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className={cn(
                    "w-full pl-6 pr-[115px] py-1.5 text-[11px] bg-white border rounded outline-none",
                    customerName 
                      ? "border-blue-300 bg-blue-50 text-blue-700 font-medium" 
                      : "border-slate-200 focus:border-blue-400"
                  )}
                />
                {/* Invoice # and Date - Small text inside search box on right */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-auto bg-inherit">
                  {customerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName('')
                        setCustomerPhone('')
                        setCustomerEmail('')
                        setCustomerGST('')
                        setCustomerSearch('')
                      }}
                      className="text-blue-400 hover:text-blue-600 mr-1"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  )}
                  <span 
                    className="text-[9px] text-slate-400 cursor-pointer hover:text-slate-600"
                    onClick={() => {
                      const newNum = prompt('Invoice Number:', invoiceNumber)
                      if (newNum) setInvoiceNumber(newNum)
                    }}
                  >
                    {invoiceNumber}
                  </span>
                  <span className="text-[9px] text-slate-300 mx-0.5">|</span>
                  <label className="text-[9px] text-slate-400 cursor-pointer hover:text-slate-600 relative">
                    {new Date(invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    />
                  </label>
                </div>
                {/* Customer Search Dropdown - Absolute positioned below search bar */}
                {showCustomerDropdown && (
                  <>
                    <div className="fixed inset-0 z-[99]" onClick={() => setShowCustomerDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-2xl z-[100] max-h-60 overflow-y-auto"
                    >
                      {loadingParties ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Loading customers...</div>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          {customerSearch ? 'No customers found' : 'Type to search...'}
                        </div>
                      ) : (
                        filteredCustomers.slice(0, 10).map((party) => (
                          <div
                            key={party.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleCustomerSelect(party)
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm">{party.displayName || party.companyName || party.name || party.customerName || party.partyName || party.fullName || party.businessName || 'Unknown Customer'}</div>
                              {(party.outstanding !== undefined || party.currentBalance !== undefined) && (() => {
                                const outstanding = party.outstanding ?? party.currentBalance ?? 0
                                const colorClass = outstanding > 0 ? 'text-emerald-600' : outstanding < 0 ? 'text-red-600' : 'text-gray-500'
                                const prefix = outstanding !== 0 ? (outstanding > 0 ? '+' : '-') : ''
                                return (
                                  <span className={`text-sm font-semibold ml-2 ${colorClass}`}>
                                    {prefix}₹{Math.abs(outstanding).toLocaleString('en-IN')}
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                              {party.phone && <span className="flex items-center gap-1"><Phone size={12} />{party.phone}</span>}
                              {party.email && <span className="flex items-center gap-1"><Envelope size={12} />{party.email}</span>}
                            </div>
                          </div>
                        ))
                      )}
                      {/* Add New Customer Button - At Bottom */}
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowCustomerDropdown(false)
                          setShowAddCustomerModal(true)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-primary/10 border-t border-border flex items-center gap-2 text-primary font-medium cursor-pointer sticky bottom-0 bg-card"
                      >
                        <Plus size={14} weight="bold" />
                        Add New Customer
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
              {/* Mobile Item Search Bar - Below customer search */}
              <div className="flex gap-2 mt-1.5">
                <div ref={itemDropdownRef} className="relative flex-1">
                  <MagnifyingGlass size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500 z-10 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search & add item..."
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value)
                      setShowItemDropdown(true)
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-amber-50 border-2 border-amber-400 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-amber-600/60"
                  />
                  {/* Mobile Item Search Dropdown */}
                  {showItemDropdown && itemDropdownRef.current && createPortal(
                      <div 
                        className="item-search-dropdown fixed bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
                        style={{
                          zIndex: 999999,
                          top: itemDropdownRef.current.getBoundingClientRect().bottom + 4,
                          left: itemDropdownRef.current.getBoundingClientRect().left,
                          width: itemDropdownRef.current.getBoundingClientRect().width,
                        }}
                      >
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowItemDropdown(false)
                          setShowAddItemModal(true)
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-slate-200 flex items-center gap-2 text-blue-600 font-medium cursor-pointer text-sm"
                      >
                        <Plus size={14} weight="bold" />
                        Create New Item
                      </div>
                      {loadingItems ? (
                        <div className="px-3 py-2 text-xs text-slate-500">Loading items...</div>
                      ) : filteredItems.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500">
                          {itemSearch ? `No items found for "${itemSearch}"` : 'Start typing to search...'}
                        </div>
                      ) : (
                        filteredItems.slice(0, 8).map((item, index) => (
                          <div
                            key={item.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleItemSelect(item)
                              setItemSearch('')
                            }}
                            className="w-full px-3 py-2 text-left border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-slate-800 truncate">{item.name}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  {item.barcode && <span>{item.barcode}</span>}
                                  {item.stock !== undefined && <span>Stock: {item.stock}</span>}
                                </div>
                              </div>
                              <div className="text-sm font-bold text-emerald-600 whitespace-nowrap">
                                ₹{item.sellingPrice || item.purchasePrice || 0}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>,
                    document.body
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg flex items-center justify-center transition-colors"
                  title="Scan Barcode"
                >
                  <Barcode size={18} weight="bold" />
                </button>
              </div>
            </div>

            {/* Desktop Header - Item Search on Left, Customer on Right - 50/50 split */}
            <div className="hidden md:grid md:grid-cols-2 gap-6 mb-4 px-1">
              {/* Left: Item Search Bar - 50% width */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <MagnifyingGlass size={18} className="text-amber-600" />
                </div>
                <div ref={desktopItemDropdownRef} className="relative flex-1">
                  <input
                    ref={itemSearchInputRef}
                    type="text"
                    placeholder="Search & add item..."
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value)
                      setShowItemDropdown(true)
                      setHighlightedItemIndex(-1)
                    }}
                    onFocus={() => {
                      setShowItemDropdown(true)
                      setHighlightedItemIndex(-1)
                    }}
                    onClick={() => setShowItemDropdown(true)}
                    onBlur={(e) => {
                      const relatedTarget = e.relatedTarget as HTMLElement
                      if (!relatedTarget?.closest('.item-search-dropdown')) {
                        setTimeout(() => setShowItemDropdown(false), 150)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!showItemDropdown) return
                      const itemCount = filteredItems.slice(0, 10).length
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setHighlightedItemIndex(prev => prev < itemCount - 1 ? prev + 1 : 0)
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setHighlightedItemIndex(prev => prev > 0 ? prev - 1 : itemCount - 1)
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        if (highlightedItemIndex >= 0 && highlightedItemIndex < itemCount) {
                          handleItemSelect(filteredItems.slice(0, 10)[highlightedItemIndex])
                        } else if (itemCount > 0) {
                          handleItemSelect(filteredItems[0])
                        }
                      } else if (e.key === 'Escape') {
                        setShowItemDropdown(false)
                        setHighlightedItemIndex(-1)
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 placeholder:text-slate-400 shadow-sm transition-all"
                  />
                  {/* Desktop Item Search Dropdown - Top Header */}
                  {showItemDropdown && desktopItemDropdownRef.current && createPortal(
                      <div 
                        className="item-search-dropdown fixed bg-white border border-slate-200 rounded-lg shadow-2xl max-h-72 overflow-y-auto"
                        style={{
                          zIndex: 999999,
                          top: desktopItemDropdownRef.current.getBoundingClientRect().bottom + 4,
                          left: desktopItemDropdownRef.current.getBoundingClientRect().left,
                          width: desktopItemDropdownRef.current.getBoundingClientRect().width,
                        }}
                      >
                      {loadingItems ? (
                        <div className="px-4 py-3 text-sm text-slate-500">Loading items...</div>
                      ) : filteredItems.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          {itemSearch ? `No items found for "${itemSearch}"` : 'Start typing to search...'}
                        </div>
                      ) : (
                        filteredItems.slice(0, 10).map((item, index) => (
                          <div
                            key={item.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleItemSelect(item)
                              setItemSearch('')
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left border-b border-slate-100 cursor-pointer",
                              highlightedItemIndex === index ? "bg-blue-50" : "hover:bg-slate-50"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-slate-800 truncate">{item.name}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  {item.barcode && <span>{item.barcode}</span>}
                                  {item.stock !== undefined && <span>Stock: {item.stock}</span>}
                                </div>
                              </div>
                              <div className="text-sm font-bold text-emerald-600 whitespace-nowrap">
                                ₹{item.sellingPrice || item.purchasePrice || 0}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      {/* Create New Item - At Bottom */}
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowItemDropdown(false)
                          setShowAddItemModal(true)
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 border-t border-slate-200 flex items-center gap-2 text-emerald-600 font-medium cursor-pointer sticky bottom-0 bg-white"
                      >
                        <Plus size={16} weight="bold" />
                        Create New Item
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center gap-1.5 transition-all hover:scale-105 font-medium text-sm shadow-sm"
                  title="Scan Barcode"
                >
                  <Barcode size={16} weight="bold" />
                </button>
              </div>

              {/* Right: Customer Search + Details - 50% width */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User size={18} className="text-blue-600" />
                </div>
                {/* Customer Search Input */}
                <div className={cn("relative", customerName ? "w-40" : "flex-1")} ref={customerDropdownRef}>
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setShowCustomerDropdown(true)
                      setHighlightedCustomerIndex(-1)
                    }}
                    onFocus={() => {
                      setShowCustomerDropdown(true)
                      setHighlightedCustomerIndex(-1)
                    }}
                    onKeyDown={(e) => {
                      if (!showCustomerDropdown) return
                      const customerCount = filteredCustomers.slice(0, 10).length
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setHighlightedCustomerIndex(prev => prev < customerCount - 1 ? prev + 1 : 0)
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setHighlightedCustomerIndex(prev => prev > 0 ? prev - 1 : customerCount - 1)
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        if (highlightedCustomerIndex >= 0 && highlightedCustomerIndex < customerCount) {
                          handleCustomerSelect(filteredCustomers.slice(0, 10)[highlightedCustomerIndex])
                        } else if (customerCount > 0) {
                          handleCustomerSelect(filteredCustomers[0])
                        }
                      } else if (e.key === 'Escape') {
                        setShowCustomerDropdown(false)
                        setHighlightedCustomerIndex(-1)
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 placeholder:text-slate-400 shadow-sm transition-all"
                  />
                  {/* Desktop Customer Dropdown */}
                  {showCustomerDropdown && (
                    <>
                      <div className="fixed inset-0 z-[99]" onClick={() => setShowCustomerDropdown(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full left-0 mt-1 bg-white border border-slate-200/60 rounded-xl shadow-xl z-[100] max-h-64 overflow-y-auto min-w-[320px]"
                      >
                        {loadingParties ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">Loading customers...</div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            {customerSearch ? 'No customers found' : 'Type to search...'}
                          </div>
                        ) : (
                          filteredCustomers.slice(0, 10).map((party, index) => (
                            <div
                              key={party.id}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleCustomerSelect(party)
                              }}
                              onMouseEnter={() => setHighlightedCustomerIndex(index)}
                              className={cn(
                                "w-full px-4 py-3 text-left transition-colors border-b border-border/50 cursor-pointer",
                                highlightedCustomerIndex === index ? "bg-blue-50" : "hover:bg-muted"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{party.displayName || party.companyName || party.name || party.customerName || party.partyName || party.fullName || party.businessName || 'Unknown Customer'}</div>
                                {(party.outstanding !== undefined || party.currentBalance !== undefined) && (() => {
                                  const outstanding = party.outstanding ?? party.currentBalance ?? 0
                                  const colorClass = outstanding > 0 ? 'text-emerald-600' : outstanding < 0 ? 'text-red-600' : 'text-gray-500'
                                  const prefix = outstanding !== 0 ? (outstanding > 0 ? '+' : '-') : ''
                                  return (
                                    <span className={`text-sm font-semibold ml-2 ${colorClass}`}>
                                      {prefix}₹{Math.abs(outstanding).toLocaleString('en-IN')}
                                    </span>
                                  )
                                })()}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                                {party.phone && <span className="flex items-center gap-1"><Phone size={12} />{party.phone}</span>}
                                {party.email && <span className="flex items-center gap-1"><Envelope size={12} />{party.email}</span>}
                              </div>
                            </div>
                          ))
                        )}
                        {/* Add New Customer Button - At Bottom */}
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowCustomerDropdown(false)
                            setShowAddCustomerModal(true)
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-primary/10 border-t border-border flex items-center gap-2 text-primary font-medium cursor-pointer sticky bottom-0 bg-card"
                        >
                          <Plus size={14} weight="bold" />
                          Add New Customer
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>

                {/* Selected Customer Details - 2 Rows Layout */}
                {customerName && (
                  <div className="flex-1 px-3 py-0.5 border-l border-blue-300 ml-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        {/* Row 1: Name & Phone */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-800">
                            <User size={12} className="text-blue-600 flex-shrink-0" />
                            <span className="truncate">{customerName}</span>
                          </div>
                          {customerPhone && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Phone size={11} className="text-blue-500 flex-shrink-0" /> {customerPhone}
                            </div>
                          )}
                        </div>
                        {/* Row 2: GSTN & Email */}
                        <div className="flex items-center gap-4">
                          {customerGST && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Buildings size={11} className="text-blue-500 flex-shrink-0" /> {customerGST}
                            </div>
                          )}
                          {customerEmail && (
                            <div className="flex items-center gap-1 text-xs text-slate-600 truncate">
                              <Envelope size={11} className="text-blue-500 flex-shrink-0" /> {customerEmail}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName('')
                          setCustomerPhone('')
                          setCustomerEmail('')
                          setCustomerGST('')
                          setCustomerState('')
                          setCustomerSearch('')
                        }}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded p-1 transition-colors flex-shrink-0"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>

              {/* Items List - Scrollable Table for All Devices */}
              <div>
                {/* Mobile Card Layout - Clean & Consistent */}
                <div ref={mobileItemsContainerRef} className="md:hidden space-y-1.5 max-h-[35vh] overflow-y-auto">
                  {invoiceItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-[#f5f7fa] rounded-lg border border-dashed border-slate-200">
                      <Package size={24} className="mx-auto mb-1 text-slate-300" />
                      <p className="text-xs">No items added</p>
                    </div>
                  ) : (
                    invoiceItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          {/* Index Badge */}
                          <span className="text-[9px] font-bold text-white bg-blue-600 rounded w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </span>
                          
                          {/* Item Name + Price inline */}
                          <div className="flex-1 min-w-0 flex items-center gap-1">
                            <span className="text-[12px] font-semibold text-slate-800 truncate max-w-[90px]">{item.name}</span>
                            <span className="text-[10px] text-slate-400">₹{item.price}×{item.qty}</span>
                            {item.tax > 0 && <span className={`text-[9px] font-medium ${item.taxMode === 'inclusive' ? "text-green-600" : "text-violet-600"}`}>G{item.tax}%</span>}
                          </div>
                          
                          {/* Qty Controls - Compact */}
                          <div className="flex items-center bg-slate-100 rounded border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, 'qty', Math.max(1, item.qty - 1))}
                              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:bg-slate-300 rounded-l transition-colors"
                            >
                              <Minus size={10} weight="bold" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 1)}
                              className="w-7 h-6 text-center text-[12px] font-semibold text-slate-700 bg-white border-x border-slate-200 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, 'qty', item.qty + 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:bg-slate-300 rounded-r transition-colors"
                            >
                              <Plus size={10} weight="bold" />
                            </button>
                          </div>

                          {/* Amount */}
                          <div className="text-[12px] font-bold text-slate-800 min-w-[40px] text-right">
                            ₹{item.total.toFixed(0)}
                          </div>
                          
                          {/* Menu */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                if (openItemMenu === item.id) {
                                  setOpenItemMenu(null)
                                  setItemMenuPosition(null)
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setItemMenuPosition({
                                    top: rect.bottom + 4,
                                    right: window.innerWidth - rect.right
                                  })
                                  setOpenItemMenu(item.id)
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded"
                            >
                              <DotsThreeVertical size={14} weight="bold" />
                            </button>
                            {openItemMenu === item.id && itemMenuPosition && (
                              <>
                                <div className="fixed inset-0 z-[100]" onClick={() => { setOpenItemMenu(null); setItemMenuPosition(null); }} />
                                <div
                                  className="fixed bg-white border border-slate-200 rounded-lg shadow-xl z-[101] p-1.5"
                                  style={{
                                    top: itemMenuPosition.top,
                                    right: itemMenuPosition.right,
                                    width: '160px'
                                  }}>
                                  {/* HSN Code - Editable */}
                                  <div className="mb-1">
                                    <span className="text-[8px] text-slate-400">HSN Code</span>
                                    <input 
                                      type="text" 
                                      value={item.hsnCode || ''}
                                      onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                                      placeholder="Enter HSN"
                                      className={cn(
                                        "w-full h-6 px-1.5 text-[10px] border rounded",
                                        isHSNRequired(customerGST) && (!item.hsnCode || item.hsnCode.trim() === '')
                                          ? "border-red-300 bg-red-50 placeholder:text-red-300"
                                          : "border-slate-200"
                                      )}
                                      onClick={(e) => e.stopPropagation()} 
                                    />
                                  </div>
                                  {/* Row 1: Price + Unit */}
                                  <div className="flex gap-1 mb-1">
                                    <div className="flex-1">
                                      <span className="text-[8px] text-slate-400">Price</span>
                                      <input type="number" step="0.01" value={item.price}
                                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                        className="w-full h-6 px-1 text-[10px] text-center border border-slate-200 rounded"
                                        onClick={(e) => e.stopPropagation()} />
                                    </div>
                                    <div className="w-14">
                                      <span className="text-[8px] text-slate-400">Unit</span>
                                      <select value={item.unit || 'PCS'} onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                        className="w-full h-6 px-0.5 text-[9px] border border-slate-200 rounded" onClick={(e) => e.stopPropagation()}>
                                        <option value="PCS">PCS</option>
                                        <option value="KGS">KG</option>
                                        <option value="BOX">BOX</option>
                                        <option value="LTRS">LTR</option>
                                      </select>
                                    </div>
                                  </div>
                                  {/* Row 2: GST toggle + GST% + Disc% */}
                                  <div className="flex gap-1 items-end mb-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateItem(item.id, 'taxMode', item.taxMode === 'inclusive' ? 'exclusive' : 'inclusive'); }}
                                      className={cn("h-6 px-1.5 text-[8px] rounded border flex items-center gap-0.5", item.taxMode === 'inclusive' ? "bg-green-50 border-green-200 text-green-700" : "bg-violet-50 border-violet-200 text-violet-700")}
                                    >
                                      <span className={cn("w-1 h-1 rounded-full", item.taxMode === 'inclusive' ? "bg-green-500" : "bg-violet-500")} />
                                      {item.taxMode === 'inclusive' ? 'Incl' : 'Excl'}
                                    </button>
                                    <div className="flex-1">
                                      <span className="text-[8px] text-slate-400">GST%</span>
                                      <input type="number" min="0" max="100" value={item.tax || 0}
                                        onChange={(e) => updateItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                                        className="w-full h-6 px-1 text-[10px] text-center border border-slate-200 rounded"
                                        onClick={(e) => e.stopPropagation()} />
                                    </div>
                                    <div className="flex-1">
                                      <span className="text-[8px] text-slate-400">Disc%</span>
                                      <input type="number" min="0" max="100" value={item.discount || 0}
                                        onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                        className="w-full h-6 px-1 text-[10px] text-center border border-slate-200 rounded"
                                        onClick={(e) => e.stopPropagation()} />
                                    </div>
                                  </div>
                                  {/* Remove button */}
                                  <button onClick={() => { removeItem(item.id); setOpenItemMenu(null); setItemMenuPosition(null); }}
                                    className="w-full h-6 text-[9px] text-red-600 hover:bg-red-50 rounded border border-red-100 flex items-center justify-center gap-1">
                                    <Trash size={10} /> Remove
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Scrollable Items Table - Desktop */}
                <div
                  ref={itemTableContainerRef}
                  className="hidden md:block border border-slate-200/60 rounded-xl overflow-x-auto overflow-y-auto bg-white shadow-sm"
                  style={desktopTableStyle}
                >
                  <table className="w-full text-sm border-collapse" style={{ minWidth: '720px' }}>
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100/80 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2.5 text-center" style={{ width: '28px', minWidth: '28px' }}>
                          <button
                            type="button"
                            onClick={() => addEmptyRow()}
                            className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full transition-all hover:scale-110 shadow-sm"
                            title="Add manual item row"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                        </th>
                        <th className="px-2 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ width: '170px', minWidth: '170px' }}>ITEM NAME</th>
                        {visibleColumns.hsnCode && (
                          <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ width: '65px', minWidth: '65px' }}>HSN</th>
                        )}
                        {visibleColumns.description && (
                          <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ width: '45px', minWidth: '45px' }}>DESC</th>
                        )}
                        <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ width: '30px', minWidth: '30px' }}>QTY</th>
                        <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ width: '48px', minWidth: '48px' }}>UNIT</th>
                        <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ width: '58px', minWidth: '58px' }}>TAX</th>
                        <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ width: '60px', minWidth: '60px' }}>MRP</th>
                        <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ width: '60px', minWidth: '60px' }}>TAXABLE</th>
                        {visibleColumns.discount && (
                          <>
                            <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ width: '38px', minWidth: '38px' }}>Dis%</th>
                            <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ width: '45px', minWidth: '45px' }}>Dis₹</th>
                          </>
                        )}
                        {/* Single GST % column - always visible */}
                        <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ width: '38px', minWidth: '38px' }}>GST%</th>
                        <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ width: '45px', minWidth: '45px' }}>GST₹</th>
                        {/* CGST/SGST/IGST breakdown - optional */}
                        {visibleColumns.gstBreakdown && (
                          <>
                            <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ width: '35px', minWidth: '35px' }}>CGST%</th>
                            <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ width: '35px', minWidth: '35px' }}>SGST%</th>
                            <th className="px-1 py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ width: '35px', minWidth: '35px' }}>IGST%</th>
                          </>
                        )}
                        <th className="px-1 py-2.5 text-center text-[10px] font-bold text-emerald-600 uppercase tracking-wider" style={{ width: '65px', minWidth: '65px' }}>TOTAL</th>
                        <th className="px-1 py-2.5 relative" style={{ width: '28px', minWidth: '28px' }}>
                          <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-all"
                            title={language === 'ta' ? 'நெடுவரிசைகளைக் காட்டு/மறை' : 'Show/Hide Columns'}
                          >
                            <Plus size={12} weight="bold" />
                          </button>
                          {showColumnMenu && (
                            <div
                              ref={columnMenuRef}
                              className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-[100] min-w-[180px]"
                            >
                              <div className="p-2 text-xs">
                                <div className="font-semibold mb-2 text-foreground">{language === 'ta' ? 'நெடுவரிசைகளைக் காட்டு' : 'Show Columns'}</div>
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
                                  <span className="text-foreground">{t.sales.hsnCode}</span>
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
                                  <span className="text-foreground">{t.common.description}</span>
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
                                  <span className="text-foreground">{t.common.discount}</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.gstBreakdown}
                                    onChange={(e) =>
                                      setVisibleColumns({
                                        ...visibleColumns,
                                        gstBreakdown: e.target.checked
                                      })
                                    }
                                    className="rounded"
                                  />
                                  <span className="text-foreground">{t.sales.cgst}/{t.sales.sgst}/{t.sales.igst}</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Always show item rows when items exist */}
                      {invoiceItems.length > 0 && invoiceItems.map((item, index) => (
                            <tr
                              key={item.id}
                              className="hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/40 transition-all duration-200 border-b border-slate-100/60 group"
                            >
                              <td className="px-2 py-2 text-center align-middle" style={{ width: '28px', minWidth: '28px' }}>
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-slate-100 to-slate-200/80 text-[10px] font-bold text-slate-500">{index + 1}</span>
                              </td>
                              <td className="px-1 py-1.5 align-middle" style={{ width: '170px', minWidth: '170px' }}>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                  className="w-full h-7 px-1 bg-transparent border-0 text-sm font-semibold text-slate-700 focus:ring-0 focus:outline-none placeholder:text-slate-300 tracking-tight"
                                  style={{ minWidth: '140px' }}
                                  placeholder="Item name"
                                />
                              </td>
                              {visibleColumns.hsnCode && (
                                <td className="px-1 py-1.5 align-middle" style={{ width: '65px', minWidth: '65px' }}>
                                  <input
                                    type="text"
                                    value={item.hsnCode || ''}
                                    onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                                    className={cn(
                                      "w-full h-6 px-1 bg-transparent border-0 text-xs text-center font-medium focus:ring-0 focus:outline-none placeholder:text-slate-300/70 font-mono tracking-wide",
                                      isHSNRequired(customerGST) && (!item.hsnCode || item.hsnCode.trim() === '')
                                        ? "text-orange-500 placeholder:text-orange-300"
                                        : "text-slate-600"
                                    )}
                                    placeholder="HSN"
                                  />
                                </td>
                              )}
                              {visibleColumns.description && (
                                <td className="px-1 py-1.5 align-middle" style={{ width: '45px', minWidth: '45px' }}>
                                  <input
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    className="w-full h-6 px-1.5 bg-transparent border-0 text-xs focus:ring-0 focus:outline-none text-slate-600 placeholder:text-slate-300"
                                    placeholder="Desc"
                                  />
                                </td>
                              )}
                              <td className="px-1 py-1.5 text-center align-middle" style={{ width: '30px', minWidth: '30px' }}>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? '' : parseFloat(e.target.value)
                                    updateItem(item.id, 'qty', value)
                                  }}
                                  onBlur={(e) => {
                                    const enteredQty = parseFloat(e.target.value) || 1
                                    // Stock warning only - don't block or reset quantity
                                    if (item.availableStock !== undefined && enteredQty > item.availableStock) {
                                      if (item.availableStock === 0) {
                                        toast.warning(`⚠️ OUT OF STOCK - ${item.name} (Order will be created)`, { duration: 3000 })
                                      } else {
                                        toast.warning(`⚠️ Only ${item.availableStock} in stock - ${item.name}`, { duration: 3000 })
                                      }
                                    }
                                    // Only reset if empty or less than 1
                                    if (!e.target.value || enteredQty < 1) {
                                      updateItem(item.id, 'qty', 1)
                                    }
                                  }}
                                  className="w-full h-6 px-0.5 bg-transparent border-0 text-xs text-center font-semibold focus:ring-0 focus:outline-none text-slate-700"
                                />
                              </td>
                              <td className="px-1 py-1.5 align-middle" style={{ width: '48px', minWidth: '48px' }}>
                                {item.hasMultiUnit ? (
                                  <select
                                    value={item.unit || item.baseUnit || 'Pcs'}
                                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                    className="w-full h-6 px-0 bg-transparent border-0 text-xs font-medium text-slate-600 focus:ring-0 focus:outline-none cursor-pointer"
                                    title={`1 ${item.purchaseUnit || 'Box'} = ${item.piecesPerPurchaseUnit || 12} ${item.baseUnit || 'Pcs'}`}
                                  >
                                    <option value={item.baseUnit || 'Pcs'}>{item.baseUnit || 'Pcs'}</option>
                                    <option value={item.purchaseUnit || 'Box'}>{item.purchaseUnit || 'Box'}</option>
                                  </select>
                                ) : (
                                  <select
                                    value={item.unit || 'NONE'}
                                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                    className="w-full h-6 px-0.5 bg-transparent border-0 text-xs font-medium focus:ring-0 focus:outline-none text-slate-600 cursor-pointer"
                                  >
                                    <option value="NONE">-</option>
                                    <option value="PCS">PCS</option>
                                    <option value="KGS">KGS</option>
                                    <option value="LTRS">LTR</option>
                                    <option value="MTR">MTR</option>
                                    <option value="BOX">BOX</option>
                                    <option value="PACK">PCK</option>
                                    <option value="SET">SET</option>
                                  </select>
                                )}
                              </td>
                              <td className="px-0.5 py-1.5 text-center align-middle" style={{ width: '58px', minWidth: '58px' }}>
                                <select
                                  value={item.taxMode || 'exclusive'}
                                  onChange={(e) => updateItem(item.id, 'taxMode', e.target.value)}
                                  className="h-6 text-[9px] px-0.5 bg-transparent border-0 rounded font-medium text-slate-600 focus:ring-0 focus:outline-none cursor-pointer"
                                  title="GST Tax Mode"
                                >
                                  <option value="exclusive">Without GST</option>
                                  <option value="inclusive">With GST</option>
                                </select>
                              </td>
                              <td className="px-1 py-1.5 text-center align-middle" style={{ width: '60px', minWidth: '60px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={Number(item.price || 0).toFixed(2)}
                                  onChange={(e) => {
                                    const enteredPrice = parseFloat(e.target.value) || 0
                                    // Simply store what user enters - updateItem handles tax calculation based on mode
                                    updateItem(item.id, 'price', enteredPrice)
                                  }}
                                  className="w-full h-6 px-1 bg-transparent border-0 text-xs text-center font-semibold text-slate-700 focus:ring-0 focus:outline-none"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-1 py-1.5 text-center align-middle" style={{ width: '60px', minWidth: '60px' }}>
                                <span className="text-xs font-semibold text-slate-600">₹{(item.basePrice || item.price).toFixed(2)}</span>
                              </td>
                              {visibleColumns.discount && (
                                <>
                                  <td className="px-0.5 py-1.5 text-center align-middle" style={{ width: '32px', minWidth: '32px' }}>
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
                                      className="w-full h-6 px-0.5 bg-transparent border-0 text-xs text-center text-slate-600 font-medium focus:ring-0 focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-1 py-1.5 text-center align-middle" style={{ width: '45px', minWidth: '45px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={item.discountAmount ? Math.round(item.discountAmount * 100) / 100 : ''}
                                      onChange={(e) => {
                                        const discAmt = parseFloat(e.target.value) || 0
                                        // Calculate discount % from amount
                                        const basePrice = item.basePrice || item.price
                                        const totalBase = basePrice * item.qty
                                        const discPercent = totalBase > 0 ? (discAmt / totalBase) * 100 : 0
                                        updateItem(item.id, 'discount', Math.round(discPercent * 100) / 100)
                                      }}
                                      placeholder="0"
                                      className="w-full h-6 px-1 bg-transparent border-0 text-xs text-center text-slate-600 font-medium focus:ring-0 focus:outline-none"
                                    />
                                  </td>
                                </>
                              )}
                              {/* Single GST % - Always visible */}
                              <td className="px-0.5 py-1.5 text-center align-middle" style={{ width: '35px', minWidth: '35px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={item.tax || 0}
                                  onChange={(e) => {
                                    const totalGst = parseFloat(e.target.value) || 0
                                    // Update the main tax field for calculations
                                    updateItem(item.id, 'tax', totalGst)
                                  }}
                                  className="w-full h-6 px-0.5 bg-transparent border-0 text-xs font-semibold text-center text-slate-700 focus:ring-0 focus:outline-none"
                                  title="GST % (Total)"
                                />
                              </td>
                              {/* GST ₹ - Always visible */}
                              <td className="px-1 py-1.5 text-center align-middle" style={{ width: '42px', minWidth: '42px' }}>
                                <span className="text-xs font-medium text-slate-600">₹{(item.taxAmount || 0).toFixed(2)}</span>
                              </td>
                              {/* CGST/SGST/IGST breakdown - Optional */}
                              {visibleColumns.gstBreakdown && (
                                <>
                                  {/* CGST% */}
                                  <td className="px-2 py-1.5 text-center align-middle" style={{ width: '45px', minWidth: '45px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={item.cgstPercent || 0}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          'cgstPercent',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full h-6 px-1 bg-transparent border-0 text-[11px] font-semibold text-center text-slate-500 focus:ring-0 focus:outline-none"
                                      title="CGST %"
                                    />
                                  </td>
                                  {/* SGST% */}
                                  <td className="px-2 py-1.5 text-center align-middle" style={{ width: '45px', minWidth: '45px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={item.sgstPercent || 0}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          'sgstPercent',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full h-6 px-1 bg-transparent border-0 text-[11px] font-semibold text-center text-slate-500 focus:ring-0 focus:outline-none"
                                      title="SGST %"
                                    />
                                  </td>
                                  {/* IGST% */}
                                  <td className="px-2 py-1.5 text-center align-middle" style={{ width: '45px', minWidth: '45px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={item.igstPercent || 0}
                                      onChange={(e) =>
                                        updateItem(
                                          item.id,
                                          'igstPercent',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full h-6 px-1 bg-transparent border-0 text-[11px] font-semibold text-center text-slate-500 focus:ring-0 focus:outline-none"
                                      title="IGST %"
                                    />
                                  </td>
                                </>
                              )}
                              <td className="px-1 py-1.5 text-center align-middle" style={{ width: '65px', minWidth: '65px' }}>
                                <span className="text-sm font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">₹{item.total.toFixed(2)}</span>
                              </td>
                              <td className="px-1 py-1.5 text-center align-middle" style={{ width: '28px', minWidth: '28px' }}>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-all"
                                >
                                  <Trash size={14} weight="bold" />
                                </button>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
                {/* Invoice Details + Discount/Payment/Notes + Totals - Desktop (side by side) */}
                <div className="hidden md:grid md:grid-cols-2 gap-4 mt-3 px-2 items-stretch">
                {/* Left Column - Invoice Details + Discount/Payment/Notes */}
                <div className="p-4 bg-background border border-border rounded-lg flex flex-col justify-between overflow-hidden">
                {/* Line 1: Invoice #, Date and Discount */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-slate-600 whitespace-nowrap">Inv #</label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="INV/2024-25/001"
                        className="w-36 px-1.5 py-1 text-xs bg-white border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-slate-600">Date</label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="px-1.5 py-1 text-xs bg-white border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                  {/* Discount */}
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-slate-600 flex items-center gap-0.5">
                      <Percent size={10} className="text-orange-500" />
                      Discount
                    </label>
                    <div className="flex items-center bg-white border border-slate-300 rounded">
                      <button
                        type="button"
                        onClick={() => setDiscountType(discountType === 'percent' ? 'amount' : 'percent')}
                        className={`px-1.5 py-1 text-xs font-medium border-r border-slate-300 transition-colors ${
                          discountType === 'percent'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-green-50 text-green-600'
                        }`}
                        title={discountType === 'percent' ? 'Switch to Amount' : 'Switch to Percent'}
                      >
                        {discountType === 'percent' ? '%' : '₹'}
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '')
                          setInvoiceDiscount(parseFloat(val) || 0)
                        }}
                        placeholder="0"
                        className="w-10 px-1 py-1 text-xs text-center bg-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Line 2: Terms & Conditions */}
                <div className="flex items-center gap-1">
                  <label className="text-xs text-slate-600 flex items-center gap-0.5 whitespace-nowrap">
                    <Pencil size={10} className="text-purple-500" />
                    Terms & Conditions
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Thank you"
                    className="flex-1 min-w-0 px-1.5 py-1 text-xs bg-white border border-slate-300 rounded outline-none"
                  />
                </div>

                {/* Line 3: Payment */}
                <div className="space-y-1.5">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex items-center gap-1 flex-wrap">
                      <label className={cn("text-xs text-slate-600 flex items-center gap-0.5", index > 0 && "invisible")}>
                        <CreditCard size={10} className="text-green-600" />
                        Payment
                      </label>
                      <select
                        value={payment.type}
                        onChange={(e) => {
                          const newPayments = [...payments]
                          newPayments[index].type = e.target.value
                          setPayments(newPayments)
                          if (e.target.value !== 'bank') {
                            setSelectedBankAccountId('')
                          }
                        }}
                        className="px-1.5 py-1 text-xs bg-white border border-slate-300 rounded outline-none"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank">Bank</option>
                        <option value="credit">Credit</option>
                        <option value="cheque">Cheque</option>
                      </select>
                      {payment.type === 'bank' && (
                        <>
                          <select
                            value={payment.reference}
                            onChange={(e) => {
                              const newPayments = [...payments]
                              const selectedAccount = bankAccounts.find(acc => acc.id.toString() === e.target.value)
                              if (selectedAccount) {
                                newPayments[index].reference = `${selectedAccount.name} (*${selectedAccount.accountNo.slice(-4)})`
                                setPayments(newPayments)
                                setSelectedBankAccountId(e.target.value)
                              } else {
                                newPayments[index].reference = ''
                                setPayments(newPayments)
                                setSelectedBankAccountId('')
                              }
                            }}
                            className="px-1.5 py-1 text-xs bg-blue-50 border border-blue-300 rounded outline-none min-w-[80px]"
                          >
                            <option value="">{bankAccounts.length > 0 ? '-- Select --' : 'No accounts'}</option>
                            {bankAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name} {account.accountNo ? `(*${account.accountNo.slice(-4)})` : ''}
                              </option>
                            ))}
                          </select>
                          {bankAccounts.length === 0 && (
                            <button
                              type="button"
                              onClick={() => navigate('/banking')}
                              className="px-1.5 py-1 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Add Bank
                            </button>
                          )}
                        </>
                      )}
                      <input
                        type="number"
                        value={payment.amount || ''}
                        onChange={(e) => {
                          const newPayments = [...payments]
                          newPayments[index].amount = parseFloat(e.target.value) || 0
                          setPayments(newPayments)
                        }}
                        placeholder="₹0"
                        className="w-12 px-1.5 py-1 text-xs bg-white border border-slate-300 rounded outline-none"
                      />
                      <input
                        type="text"
                        value={payment.reference}
                        onChange={(e) => {
                          const newPayments = [...payments]
                          newPayments[index].reference = e.target.value
                          setPayments(newPayments)
                        }}
                        placeholder="Ref No."
                        className="flex-1 min-w-0 px-1.5 py-1 text-xs bg-white border border-slate-300 rounded outline-none"
                      />
                      {payments.length > 1 && (
                        <button type="button" onClick={() => setPayments(payments.filter((_, i) => i !== index))} className="p-0.5 text-red-500 hover:bg-red-50 rounded">
                          <X size={10} />
                        </button>
                      )}
                      {index === payments.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setPayments([...payments, { type: 'cash', amount: 0, reference: '' }])}
                          className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-primary border border-primary/30 rounded hover:bg-primary/10"
                          title="Add Payment"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                </div>
                {/* Right Side - Totals Summary */}
                <div className="p-4 bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 rounded-xl">
                  {invoiceItems.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Subtotal:</span>
                        <span className="font-semibold text-slate-700">₹{totals.subtotal.toFixed(2)}</span>
                      </div>
                      {invoiceDiscount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Discount ({discountType === 'percent' ? `${invoiceDiscount}%` : `₹${invoiceDiscount}`}):</span>
                          <span className="font-semibold text-orange-500">-₹{totals.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {/* Tax Row - Consolidated with CGST/SGST/IGST breakdown inline */}
                      {totals.totalTax > 0 && (
                        <div className="flex justify-between items-center py-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Tax</span>
                            {totals.totalIGST > 0 ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">Interstate</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-medium">Intra</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {totals.totalIGST > 0 ? (
                              <span className="text-xs text-slate-600">IGST ₹{totals.totalIGST.toFixed(2)}</span>
                            ) : (
                              <>
                                <span className="text-[11px] text-slate-500">CGST</span>
                                <span className="text-xs font-medium text-slate-700">₹{totals.totalCGST.toFixed(2)}</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-[11px] text-slate-500">SGST</span>
                                <span className="text-xs font-medium text-slate-700">₹{totals.totalSGST.toFixed(2)}</span>
                              </>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">₹{totals.totalTax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-emerald-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">TOTAL</span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{invoiceItems.length} item{invoiceItems.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={roundOff}
                              onChange={(e) => setRoundOff(e.target.checked)}
                              className="w-3 h-3 rounded accent-emerald-600"
                            />
                            <span className="text-[10px] text-slate-400">Round Off</span>
                          </label>
                          {roundOff && totals.roundOffAmount !== 0 && (
                            <span className="text-[10px] text-emerald-600">{totals.roundOffAmount >= 0 ? '+' : ''}₹{totals.roundOffAmount.toFixed(2)}</span>
                          )}
                        </div>
                        <span className="font-bold text-2xl text-emerald-600">₹{totals.total.toFixed(0)}</span>
                      </div>
                      {totals.received > 0 && (
                        <>
                          <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                            <span className="text-muted-foreground">Paid:</span>
                            <span className="font-medium text-emerald-600">₹{totals.received.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Balance:</span>
                            <span className={cn("font-semibold", totals.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                              ₹{Math.abs(totals.balance).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-4">
                      Add items to see totals
                    </div>
                  )}
                </div>
              </div>
              </div>
            {/* FOOTER - Mobile Only */}
            <div className="md:hidden flex flex-col gap-2">
              {/* Totals Summary - First */}
              <div className="p-2 bg-gradient-to-r from-slate-50 via-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm">
                {invoiceItems.length > 0 ? (
                  <div className="flex items-center justify-between text-[11px]">
                    {/* Add Row Button - Far Left */}
                    <button
                      type="button"
                      onClick={() => addEmptyRow()}
                      className="flex items-center justify-center w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded transition-colors flex-shrink-0"
                      title="Add manual item row"
                    >
                      <Plus size={14} weight="bold" />
                    </button>
                    {/* LEFT - Subtotal, Discount & Round */}
                    <div className="flex flex-col gap-0.5 ml-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Subtotal: <strong className="text-gray-800">₹{totals.subtotal.toFixed(2)}</strong></span>
                        {invoiceDiscount > 0 && (
                          <span className="text-orange-600 text-[10px]">-₹{totals.discount.toFixed(2)} <span className="text-orange-400">({discountType === 'percent' ? `${invoiceDiscount}%` : `₹${invoiceDiscount}`})</span></span>
                        )}
                      </div>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roundOff}
                          onChange={(e) => setRoundOff(e.target.checked)}
                          className="w-3 h-3 rounded accent-blue-600"
                        />
                        <span className="text-[10px] text-gray-400">Round Off</span>
                        {roundOff && totals.roundOffAmount !== 0 && (
                          <span className="text-[9px] text-blue-600">{totals.roundOffAmount >= 0 ? '+' : ''}₹{totals.roundOffAmount.toFixed(2)}</span>
                        )}
                      </label>
                    </div>
                    
                    {/* MIDDLE - Tax breakdown */}
                    <div className="flex flex-col items-center gap-0.5 px-3 border-l border-r border-blue-200">
                      {totals.totalCGST > 0 && <span className="text-gray-500">CGST: <strong className="text-gray-700">₹{totals.totalCGST.toFixed(2)}</strong></span>}
                      {totals.totalSGST > 0 && <span className="text-gray-500">SGST: <strong className="text-gray-700">₹{totals.totalSGST.toFixed(2)}</strong></span>}
                      {totals.totalIGST > 0 && <span className="text-gray-500">IGST: <strong className="text-gray-700">₹{totals.totalIGST.toFixed(2)}</strong></span>}
                      {totals.totalTax === 0 && <span className="text-gray-400 text-[10px]">No Tax</span>}
                    </div>
                    
                    {/* RIGHT - Total */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">Total</span>
                      <span className="font-bold text-xl text-blue-600">₹{totals.total.toFixed(0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-xs py-2">Add items to see total</div>
                )}
              </div>

              {/* Discount & Payment - Clean Compact */}
              <div className="px-2 py-1.5 bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-lg space-y-1">
                {/* ROW 1: Discount + Payment */}
                <div className="flex items-center gap-2 text-[11px]">
                  {/* Discount */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === 'percent' ? 'amount' : 'percent')}
                      className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${
                        discountType === 'percent'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                      title={discountType === 'percent' ? 'Switch to Amount' : 'Switch to Percent'}
                    >
                      {discountType === 'percent' ? '%' : '₹'}
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '')
                        setInvoiceDiscount(parseFloat(val) || 0)
                      }}
                      placeholder="0"
                      className="w-10 h-6 px-1 text-[11px] text-center bg-white border border-slate-200 rounded outline-none text-gray-800"
                    />
                  </div>
                  
                  <div className="w-px h-5 bg-slate-200" />
                  
                  {/* Payment */}
                  <div className="flex items-center gap-1">
                    <CreditCard size={12} className="text-green-600" />
                    <select
                      value={payments[0]?.type || 'cash'}
                      onChange={(e) => {
                        const newPayments = [...payments]
                        if (newPayments[0]) newPayments[0].type = e.target.value
                        setPayments(newPayments)
                        // Reset bank account when not bank
                        if (e.target.value !== 'bank') {
                          setSelectedBankAccountId('')
                        }
                      }}
                      className="h-6 px-1 text-[11px] bg-white border border-slate-200 rounded outline-none text-gray-700"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank">Bank</option>
                      <option value="credit">Credit</option>
                    </select>
                    {/* Bank Account Dropdown - Show when Bank is selected */}
                    {payments[0]?.type === 'bank' && (
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        className="h-6 px-1 text-[11px] bg-blue-50 border border-blue-300 rounded outline-none text-gray-700 max-w-[140px]"
                      >
                        <option value="">{bankAccounts.length > 0 ? '-- Select Account --' : 'No bank accounts'}</option>
                        {bankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} {account.accountNo ? `(*${account.accountNo.slice(-4)})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="number"
                      value={payments[0]?.amount || ''}
                      onChange={(e) => {
                        const newPayments = [...payments]
                        if (newPayments[0]) newPayments[0].amount = parseFloat(e.target.value) || 0
                        setPayments(newPayments)
                      }}
                      placeholder="₹0"
                      className="w-14 h-6 px-1.5 text-[11px] bg-white border border-slate-200 rounded outline-none text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => setPayments([...payments, { type: 'cash', amount: 0, reference: '' }])}
                      className="w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-50 border border-slate-200 rounded"
                      title="Add Payment"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* ROW 2: Notes (full width) OR Notes + Additional Payments */}
                <div className="flex items-center gap-2 text-[11px]">
                  <Pencil size={12} className="text-purple-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    className={cn(
                      "h-6 px-2 text-[11px] bg-white border border-slate-200 rounded outline-none text-gray-700 placeholder:text-gray-400 transition-all",
                      payments.length > 1 ? "w-20" : "flex-1"
                    )}
                  />
                  
                  {/* Additional Payments appear here when added */}
                  {payments.length > 1 && (
                    <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                      {payments.slice(1).map((payment, idx) => (
                        <div key={idx + 1} className="flex items-center gap-0.5 bg-slate-100 rounded px-1 py-0.5 flex-shrink-0">
                          <select
                            value={payment.type}
                            onChange={(e) => {
                              const newPayments = [...payments]
                              newPayments[idx + 1].type = e.target.value
                              setPayments(newPayments)
                            }}
                            className="h-5 px-0.5 text-[10px] bg-white border border-slate-200 rounded outline-none text-gray-700"
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                            <option value="bank">Bank</option>
                            <option value="credit">Cr</option>
                          </select>
                          <input
                            type="number"
                            value={payment.amount || ''}
                            onChange={(e) => {
                              const newPayments = [...payments]
                              newPayments[idx + 1].amount = parseFloat(e.target.value) || 0
                              setPayments(newPayments)
                            }}
                            placeholder="₹0"
                            className="w-12 h-5 px-1 text-[10px] bg-white border border-slate-200 rounded outline-none text-gray-700"
                          />
                          <button type="button" onClick={() => setPayments(payments.filter((_, i) => i !== idx + 1))} className="text-red-400 hover:text-red-600">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
          {/* Bottom Action Bar */}
          <div className="px-3 md:px-4 py-2 md:py-1.5 border-t border-slate-200 bg-white flex-shrink-0">
            
            {/* Mobile Search Bar - MOVED TO TOP (near customer search) */}
            <div className="hidden">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search & add item..."
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value)
                      setShowItemDropdown(true)
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full pl-10 pr-4 py-3 text-base bg-slate-50 border-2 border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400"
                  />
                </div>
                {/* Barcode Scan Button */}
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                  title="Scan Barcode"
                >
                  <Barcode size={22} weight="bold" />
                </button>
                {/* Mobile Item Search Dropdown - Opens upward */}
                {showItemDropdown && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[200] max-h-64 overflow-y-auto">
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowItemDropdown(false)
                        setShowAddItemModal(true)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-200 flex items-center gap-2 text-blue-600 font-medium cursor-pointer"
                    >
                      <Plus size={18} weight="bold" />
                      Create New Item
                    </div>
                    {loadingItems ? (
                      <div className="px-4 py-3 text-sm text-slate-500">Loading items...</div>
                    ) : filteredItems.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        {itemSearch ? `No items found for "${itemSearch}"` : 'Start typing to search...'}
                      </div>
                    ) : (
                      filteredItems.slice(0, 8).map((item, index) => (
                        <div
                          key={item.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleItemSelect(item)
                            setItemSearch('')
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer active:bg-blue-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-base text-slate-800 truncate">{item.name}</div>
                              {item.barcode && <div className="text-xs text-slate-500">{item.barcode}</div>}
                            </div>
                            <div className="text-base font-bold text-green-600 whitespace-nowrap">
                              ₹{item.sellingPrice || item.purchasePrice || 0}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Buttons Row - Only show in POS mode */}
            {salesMode === 'pos' && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-2 md:mb-0">
                <button
                  onClick={handleBackToList}
                  className="px-3 md:px-4 py-3 md:py-2.5 bg-muted hover:bg-muted/70 rounded-xl md:rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 active:scale-95 text-black"
                >
                  <X size={18} weight="bold" className="md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
                <button
                  onClick={() => {
                    // Hold bill functionality
                    toast.info('Bill held - Feature coming soon!')
                  }}
                  className="px-3 md:px-4 py-3 md:py-2.5 bg-warning/10 hover:bg-warning/20 text-warning rounded-xl md:rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 border border-warning/30 active:scale-95"
                >
                  <Clock size={18} weight="bold" className="md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Hold</span>
                </button>
                <button
                  onClick={() => {
                    setInvoiceItems([])
                    toast.success(language === 'ta' ? 'கார்ட் அழிக்கப்பட்டது' : 'Cart cleared')
                  }}
                  className="px-3 md:px-4 py-3 md:py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl md:rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 border border-destructive/30 active:scale-95"
                >
                  <Trash size={18} weight="bold" className="md:w-4 md:h-4" />
                  <span className="hidden sm:inline">{t.common.clear}</span>
                </button>
                {/* Toggle POS Bill Preview - Desktop only */}
                <button
                  onClick={() => setShowPosPreview(!showPosPreview)}
                  className={cn(
                    "hidden lg:flex px-4 py-2.5 rounded-lg font-medium transition-colors text-sm items-center justify-center gap-2 border",
                    showPosPreview
                      ? "bg-orange-500 text-white border-orange-600 hover:bg-orange-600"
                      : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                  )}
                >
                  <Receipt size={16} weight="bold" />
                  {showPosPreview ? 'Hide Bill' : 'Show Bill'}
                </button>
              </div>
            )}

            {/* Action Buttons - Mobile: Compact icon buttons, Desktop: Full buttons */}
            <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-fit md:ml-auto">
              {/* Mobile: Compact Button Row */}
              <div className="flex md:hidden items-center gap-1.5 flex-1">
                {/* Bill Button with Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBillDropdown(!showBillDropdown)}
                    disabled={invoiceItems.length === 0 || isCreatingInvoice}
                    className={cn(
                      "py-2.5 px-3 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1 border active:scale-95",
                      invoiceItems.length > 0 && !isCreatingInvoice
                        ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                        : "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"
                    )}
                  >
                    <Receipt size={12} weight="bold" />
                    <span>{isCreatingInvoice ? '...' : 'Bill'}</span>
                    <CaretDown size={10} weight="bold" className={cn("transition-transform", showBillDropdown && "rotate-180")} />
                  </button>
                  {/* Mobile Bill Dropdown Menu with Backdrop */}
                  <AnimatePresence>
                    {showBillDropdown && (
                      <>
                        {/* Backdrop */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 bg-black/30 z-40"
                          onClick={() => setShowBillDropdown(false)}
                        />
                        {/* Dropdown Menu */}
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-0 mb-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setShowBillDropdown(false)
                              const invoice = buildCurrentInvoiceData()
                              if (invoice) {
                                handleShareWhatsApp(invoice)
                              } else {
                                toast.error('Please add customer and items first')
                              }
                            }}
                            className="w-full px-3 py-2.5 text-left text-xs hover:bg-slate-50 transition-colors flex items-center gap-2"
                          >
                            <Share size={12} />
                            <span>Share</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowBillDropdown(false)
                              if (customerName && invoiceItems.length > 0) {
                                setPrintOnlyPreview(true)
                                setShowInvoicePreview(true)
                              } else {
                                toast.error('Please add customer and items first')
                              }
                            }}
                            className="w-full px-3 py-2.5 text-left text-xs hover:bg-slate-50 transition-colors flex items-center gap-2"
                          >
                            <Printer size={12} />
                            <span>Print</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowPosPreview(!showPosPreview); setShowBillDropdown(false) }}
                            className="w-full px-3 py-2.5 text-left text-xs text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-2"
                          >
                            <Receipt size={12} />
                            <span>POS Preview</span>
                          </button>
                          <div className="border-t border-slate-100 my-1" />
                          <button
                            type="button"
                            onClick={async () => {
                              setShowBillDropdown(false)
                              await createInvoiceOnly()
                              clearCurrentTab()
                            }}
                            className="w-full px-3 py-2.5 text-left text-xs hover:bg-slate-50 transition-colors"
                          >
                            Save & New
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Save + WhatsApp Button */}
                <button
                  type="button"
                  onClick={async () => {
                    const invoice = await createInvoiceOnly()
                    if (invoice) {
                      handleShareWhatsApp(invoice)
                    }
                  }}
                  disabled={invoiceItems.length === 0 || isCreatingInvoice}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95",
                    invoiceItems.length > 0 && !isCreatingInvoice
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-green-200 text-green-400 cursor-not-allowed"
                  )}
                >
                  <span>Save</span>
                  <WhatsappLogo size={14} weight="fill" />
                </button>

                {/* Save + Print Button */}
                <button
                  type="button"
                  onClick={() => setShowInvoicePreview(true)}
                  disabled={invoiceItems.length === 0 || isCreatingInvoice}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95",
                    invoiceItems.length > 0 && !isCreatingInvoice
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-primary/30 text-primary/50 cursor-not-allowed"
                  )}
                >
                  <span>Save</span>
                  <Printer size={14} weight="bold" />
                </button>
              </div>

              {/* Desktop: Back Button - Before Generate Bill */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBackToList}
                className="hidden md:flex px-4 py-2.5 rounded-lg font-semibold text-sm transition-all items-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
              >
                <ArrowLeft size={16} weight="bold" />
                Back
              </motion.button>

              {/* Desktop: Generate Bill with dropdown */}
              <div className="relative hidden md:block flex-none">
                <div className="flex">
                  <button
                    type="button"
                    onClick={createInvoiceOnly}
                    disabled={invoiceItems.length === 0 || isCreatingInvoice}
                    className={cn(
                      "px-4 py-2 rounded-l-lg font-medium text-sm transition-all flex items-center justify-center gap-2 border border-r-0 active:scale-95",
                      invoiceItems.length > 0 && !isCreatingInvoice
                        ? "bg-background border-border text-foreground hover:bg-muted"
                        : "bg-muted text-muted-foreground cursor-not-allowed border-border"
                    )}
                  >
                    {isCreatingInvoice ? 'Creating...' : 'Generate Bill'}
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowBillDropdown(!showBillDropdown)}
                      disabled={invoiceItems.length === 0 || isCreatingInvoice}
                      className={cn(
                        "px-2 py-2 rounded-r-lg font-medium text-sm transition-all border active:scale-95",
                        invoiceItems.length > 0 && !isCreatingInvoice
                          ? "bg-background border-border text-foreground hover:bg-muted"
                          : "bg-muted text-muted-foreground cursor-not-allowed border-border"
                      )}
                    >
                      <CaretDown size={14} weight="bold" className={cn("transition-transform", showBillDropdown && "rotate-180")} />
                    </button>
                    {/* Desktop Bill Dropdown Menu with Backdrop */}
                    <AnimatePresence>
                      {showBillDropdown && (
                        <>
                          {/* Backdrop */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/30 z-40"
                            onClick={() => setShowBillDropdown(false)}
                          />
                          {/* Dropdown Menu */}
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full right-0 mb-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 py-1"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setShowBillDropdown(false)
                                const invoice = buildCurrentInvoiceData()
                                if (invoice) {
                                  handleShareWhatsApp(invoice)
                                } else {
                                  toast.error('Please add customer and items first')
                                }
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                            >
                              Share <Share size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowBillDropdown(false)
                                if (customerName && invoiceItems.length > 0) {
                                  setPrintOnlyPreview(true)
                                  setShowInvoicePreview(true)
                                } else {
                                  toast.error('Please add customer and items first')
                                }
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                            >
                              Print <Printer size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowPosPreview(true); setShowBillDropdown(false) }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 text-orange-600 font-medium"
                            >
                              POS Preview <Receipt size={12} />
                            </button>
                            <div className="border-t border-border my-1" />
                            <button
                              type="button"
                              onClick={() => { createInvoiceOnly(); setShowBillDropdown(false) }}
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                            >
                              Save & New
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* POS Preview Button - Shows when in POS mode (hide on mobile, show preview directly) */}
              {salesMode === 'pos' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPosPreview(true)}
                  disabled={invoiceItems.length === 0}
                  className={cn(
                    "hidden md:flex px-6 py-2.5 rounded-lg font-semibold text-sm transition-all items-center gap-2",
                    invoiceItems.length > 0
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Receipt size={18} weight="bold" />
                  POS Preview
                </motion.button>
              )}

              {/* Save Button (without print) */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createInvoiceOnly}
                disabled={invoiceItems.length === 0}
                className={cn(
                  "hidden md:block px-5 py-2.5 rounded-lg font-semibold text-sm transition-all",
                  invoiceItems.length > 0
                    ? "bg-slate-600 text-white hover:bg-slate-700"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Save
              </motion.button>

              {/* Save & Print Button - Desktop only */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowInvoicePreview(true)}
                disabled={invoiceItems.length === 0}
                className={cn(
                  "hidden md:flex px-5 py-2.5 rounded-lg font-semibold text-sm transition-all items-center justify-center gap-2",
                  invoiceItems.length > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {t.sales.saveAndPrint}
              </motion.button>
            </div>
          </div>
        </div>
        {/* End of Left Column */}

        {/* Right Column - Live POS Bill Preview (Fixed Width) - Show in Invoice mode with Live Preview only (not in café POS mode) */}
        {!showCafePOS && showPosPreview && (
        <div className={cn(
          "print-area-container rounded-2xl border-2 overflow-hidden flex-col shadow-2xl flex-shrink-0",
          "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700",
          "hidden lg:flex w-[350px] xl:w-[400px]"
        )}
        style={{ height: 'calc(100vh - 60px)' }}>
          <div className="px-4 py-3 border-b-2 border-slate-700 bg-gradient-to-r from-slate-800/50 via-slate-800/30 to-slate-800/50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-wide text-white">
                <Receipt size={18} weight="fill" className="text-orange-400" />
                Live POS Bill
              </h3>
              {/* Format Selector - 58mm/80mm thermal options */}
              <div className="flex bg-slate-700 rounded-lg p-0.5">
                <button
                  onClick={() => setInvoiceFormat('pos58')}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap",
                    invoiceFormat === 'pos58'
                      ? "bg-orange-500 text-white shadow-md"
                      : "text-gray-400 hover:text-white hover:bg-slate-600"
                  )}
                  title="58mm Thermal Receipt"
                >
                  58mm
                </button>
                <button
                  onClick={() => setInvoiceFormat('pos80')}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap",
                    invoiceFormat === 'pos80'
                      ? "bg-orange-500 text-white shadow-md"
                      : "text-gray-400 hover:text-white hover:bg-slate-600"
                  )}
                  title="80mm Thermal Receipt"
                >
                  80mm
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Invoice Preview Content */}
            <div
              id="invoice-print-area"
              className={cn(
                "bg-white text-black print-area shadow-lg",
                invoiceFormat === 'pos58' && "max-w-[220px] ml-auto print-58mm",
                invoiceFormat === 'pos80' && "max-w-[300px] ml-auto print-80mm",
                invoiceFormat === 'kot' && "max-w-[300px] ml-auto print-80mm",
                invoiceFormat === 'a5' && "max-w-[148mm] mx-auto",
                invoiceFormat === 'barcode' && "max-w-[100mm] mx-auto",
                invoiceFormat === 'sticker' && "max-w-[80mm] mx-auto",
                invoiceFormat === 'a4' && "w-full"
              )}
              style={{
                fontFamily: ['pos58', 'pos80', 'kot'].includes(invoiceFormat) ? "'Courier New', Courier, monospace" : 'Arial, sans-serif'
              }}
            >
              {/* ============================================
                  THERMAL POS RECEIPT (58mm / 80mm) - Vyapar Style
                  ============================================ */}
              {(invoiceFormat === 'pos58' || invoiceFormat === 'pos80') && (
                <div
                  id="pos-thermal-preview"
                  className={cn(
                    "p-3 leading-tight",
                    invoiceFormat === 'pos58' ? "text-[10px]" : "text-[11px]"
                  )}
                >
                  {/* Shop Header */}
                  <div className="text-center border-b-2 border-dashed border-black pb-2 mb-2">
                    <h1 className={cn(
                      "font-bold uppercase tracking-wide",
                      invoiceFormat === 'pos58' ? "text-sm" : "text-base"
                    )}>
                      {getCompanySettings().companyName || 'YOUR SHOP NAME'}
                    </h1>
                    <p className="mt-1">
                      {getCompanySettings().address && `${getCompanySettings().address}, `}
                      {getCompanySettings().city || 'City'} - {getCompanySettings().pincode || '000000'}<br />
                      Ph: {getCompanySettings().phone || '00000 00000'}
                    </p>
                    {getCompanySettings().gstin && (
                      <p className="font-semibold mt-1">
                        GSTIN: {getCompanySettings().gstin}
                      </p>
                    )}
                  </div>

                  {/* Bill Info Row */}
                  <div className="flex justify-between text-[9px] mb-2 pb-2 border-b border-dashed border-gray-400">
                    <div>
                      <span className="font-bold">Bill To:</span><br />
                      {activeTab.customerName || 'Cash Customer'}
                      {activeTab.customerPhone && <><br />Ph: {activeTab.customerPhone}</>}
                    </div>
                    <div className="text-right">
                      <span className="font-bold">Bill#:</span> {invoiceNumber || 'TEMP-001'}<br />
                      {new Date().toLocaleDateString('en-IN')}<br />
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Items Table Header */}
                  <div className="border-b border-dashed border-black pb-1 mb-1">
                    <div className="flex font-bold text-[9px]">
                      <span className="flex-1">Item</span>
                      <span className="w-8 text-center">Qty</span>
                      <span className="w-16 text-right">Amount</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="mb-2">
                    {activeTab.invoiceItems.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 italic">
                        Add items to see preview
                      </div>
                    ) : (
                      activeTab.invoiceItems.map((item, index) => (
                        <div key={item.id} className="py-1 border-b border-dotted border-gray-300">
                          <div className="flex">
                            <span className="flex-1 font-medium truncate pr-1">{item.name}</span>
                            <span className="w-8 text-center">{item.qty}</span>
                            <span className="w-16 text-right font-bold">₹{item.total.toFixed(2)}</span>
                          </div>
                          <div className="text-[8px] text-gray-500 flex justify-between">
                            <span>{item.qty} × ₹{item.price.toFixed(2)}</span>
                            {item.tax > 0 && <span>GST: {item.tax}%</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Totals Section */}
                  {activeTab.invoiceItems.length > 0 && (
                    <>
                      <div className="totals-section border-t-2 border-dashed border-black pt-2 space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{activeTab.invoiceItems.reduce((sum, item) => {
                            // Use basePrice (taxable amount) for correct subtotal calculation
                            const taxablePerUnit = item.basePrice || (item.taxMode === 'inclusive' ? item.price / (1 + (item.tax || 0) / 100) : item.price)
                            return sum + (taxablePerUnit * item.qty - item.discountAmount)
                          }, 0).toFixed(2)}</span>
                        </div>
                        {(() => {
                          const totalTax = activeTab.invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
                          const cgst = totalTax / 2;
                          const sgst = totalTax / 2;
                          return totalTax > 0 ? (
                            <>
                              <div className="flex justify-between text-[9px]">
                                <span>CGST:</span>
                                <span>₹{cgst.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[9px]">
                                <span>SGST:</span>
                                <span>₹{sgst.toFixed(2)}</span>
                              </div>
                            </>
                          ) : null;
                        })()}
                        {activeTab.invoiceDiscount > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Discount:</span>
                            <span>-₹{activeTab.invoiceDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        {(() => {
                          const grandTotal = activeTab.invoiceItems.reduce((sum, item) => sum + item.total, 0) - activeTab.invoiceDiscount;
                          const roundOff = Math.round(grandTotal) - grandTotal;
                          return Math.abs(roundOff) > 0.01 ? (
                            <div className="flex justify-between text-[9px]">
                              <span>Round Off:</span>
                              <span>{roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {/* Grand Total */}
                      <div className={cn(
                        "flex justify-between font-bold border-t-2 border-b-2 border-black py-2 mt-2",
                        invoiceFormat === 'pos58' ? "text-sm" : "text-base"
                      )}>
                        <span>TOTAL:</span>
                        <span>₹{Math.round(activeTab.invoiceItems.reduce((sum, item) => sum + item.total, 0) - activeTab.invoiceDiscount).toFixed(2)}</span>
                      </div>

                      {/* Payment Mode */}
                      <div className="flex justify-between mt-2 text-[9px]">
                        <span className="font-bold">Payment:</span>
                        <span className="uppercase font-bold">{activeTab.paymentMode}</span>
                      </div>
                    </>
                  )}

                  {/* Footer */}
                  <div className="border-t-2 border-dashed border-black mt-3 pt-2 text-center">
                    <p className="font-bold">Thank You! Visit Again 😊</p>
                    <p className="text-[8px] text-gray-500 mt-1">
                      Powered by Thisai CRM
                    </p>
                    {activeTab.notes && (
                      <p className="text-[8px] mt-1 italic">Note: {activeTab.notes}</p>
                    )}
                  </div>

                  {/* Print Button - Below thermal receipt */}
                  {activeTab.invoiceItems.length > 0 && (
                    <div className="mt-4 text-center print:hidden">
                      <button
                        onClick={() => {
                          const printContent = document.getElementById('pos-thermal-preview');
                          if (printContent) {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              const paperWidth = invoiceFormat === 'pos58' ? '58mm' : '80mm';
                              const printWidth = invoiceFormat === 'pos58' ? '48mm' : '72mm';
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>POS Bill - ${invoiceNumber || 'TEMP'}</title>
                                    <style>
                                      @page { size: ${paperWidth} auto; margin: 0; }
                                      body {
                                        margin: 0;
                                        padding: 3mm;
                                        font-family: 'Courier New', Courier, monospace;
                                        font-size: ${invoiceFormat === 'pos58' ? '9px' : '10px'};
                                        line-height: 1.3;
                                        width: ${printWidth};
                                      }
                                      * { box-sizing: border-box; }
                                      .border-dashed { border-style: dashed; }
                                      .border-black { border-color: black; }
                                      .border-t-2 { border-top-width: 2px; }
                                      .border-b-2 { border-bottom-width: 2px; }
                                      .text-center { text-align: center; }
                                      .font-bold { font-weight: bold; }
                                      .flex { display: flex; }
                                      .justify-between { justify-content: space-between; }
                                      .text-right { text-align: right; }
                                      .mt-1 { margin-top: 4px; }
                                      .mt-2 { margin-top: 8px; }
                                      .mt-3 { margin-top: 12px; }
                                      .mb-2 { margin-bottom: 8px; }
                                      .pb-2 { padding-bottom: 8px; }
                                      .pt-2 { padding-top: 8px; }
                                      .py-2 { padding-top: 8px; padding-bottom: 8px; }
                                      .py-1 { padding-top: 4px; padding-bottom: 4px; }
                                    </style>
                                  </head>
                                  <body>${printContent.innerHTML}</body>
                                </html>
                              `);
                              printWindow.document.close();
                              printWindow.onafterprint = function() { printWindow.close(); };
                              printWindow.print();
                              // Fallback for browsers that don't support onafterprint
                              setTimeout(function() { if (!printWindow.closed) printWindow.close(); }, 2000);
                            }
                          }
                        }}
                        className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Printer size={20} weight="bold" />
                        Print {invoiceFormat === 'pos58' ? '58mm' : '80mm'} Bill
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================
                  KOT - Kitchen Order Ticket
                  ============================================ */}
              {invoiceFormat === 'kot' && (
                <div className="p-3">
                  <div className="border-2 border-black p-3">
                    <div className="text-center text-lg font-bold mb-3 border-b-2 border-black pb-2">
                      🍳 KITCHEN ORDER
                    </div>
                    <div className="flex justify-between text-xs mb-3 pb-2 border-b border-dashed border-gray-400">
                      <span>Order#: {invoiceNumber || 'KOT-001'}</span>
                      <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {activeTab.invoiceItems.length === 0 ? (
                      <div className="text-center py-6 text-sm text-gray-500 italic">
                        No items added
                      </div>
                    ) : (
                      activeTab.invoiceItems.map((item, index) => (
                        <div key={item.id} className="mb-3 border-b border-dashed border-gray-400 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-bold text-base">{item.name}</div>
                              {item.description && <div className="text-gray-600 text-xs mt-0.5 italic">{item.description}</div>}
                            </div>
                            <div className="text-right ml-3">
                              <div className="font-bold text-xl">×{item.qty}</div>
                              <div className="text-xs text-gray-600">{item.unit}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="mt-3 text-center text-sm font-bold border-t-2 border-black pt-2">
                      Total Items: {activeTab.invoiceItems.reduce((sum, item) => sum + item.qty, 0)}
                    </div>
                    {activeTab.notes && (
                      <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 text-xs">
                        <span className="font-bold">Note:</span> {activeTab.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================
                  BARCODE LABELS
                  ============================================ */}
              {invoiceFormat === 'barcode' && (
                <div className="p-3 space-y-3">
                  {activeTab.invoiceItems.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500 italic border-2 border-dashed border-gray-300 rounded">
                      Add items to generate barcode labels
                    </div>
                  ) : (
                    activeTab.invoiceItems.map((item, index) => (
                      <div key={item.id} className="border-2 border-black p-3 bg-white">
                        <div className="text-center">
                          <div className="font-bold text-sm mb-1">{item.name}</div>
                          <div className="text-xs text-gray-600 mb-2">
                            HSN: {item.hsnCode || 'N/A'} | {item.unit}
                          </div>
                          <div className="bg-black h-14 flex items-center justify-center mb-1">
                            <Barcode size={36} weight="fill" className="text-white" />
                          </div>
                          <div className="text-[9px] font-mono text-gray-600 mb-2">
                            {item.id.toUpperCase().substring(0, 12)}
                          </div>
                          <div className="font-bold text-lg">
                            ₹{item.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ============================================
                  PRODUCT STICKERS
                  ============================================ */}
              {invoiceFormat === 'sticker' && (
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {activeTab.invoiceItems.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-sm text-gray-500 italic border-2 border-dashed border-gray-300 rounded">
                        Add items to generate stickers
                      </div>
                    ) : (
                      activeTab.invoiceItems.map((item, index) => (
                        <div key={item.id} className="border border-gray-400 p-2 rounded bg-white">
                          <div className="text-center">
                            <div className="font-bold text-[11px] mb-1 line-clamp-2">{item.name}</div>
                            <div className="text-[9px] text-gray-600 mb-1">
                              {item.hsnCode || 'N/A'}
                            </div>
                            <div className="font-bold text-xl text-primary">
                              ₹{item.price.toFixed(2)}
                            </div>
                            <div className="text-[9px] text-gray-500 mt-1">
                              {item.unit}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ============================================
                  A5 FORMAT
                  ============================================ */}
              {invoiceFormat === 'a5' && (
                <div className="p-4">
                  {/* A5 Header */}
                  <div className="text-center border-b-2 border-black pb-3 mb-3">
                    <h1 className="font-bold text-base uppercase">YOUR BUSINESS NAME</h1>
                    <p className="text-xs mt-1">123, Main Road, City - 600001 | Ph: 98765 43210</p>
                    <p className="text-xs font-semibold">GSTIN: 33AABCU9603R1ZM</p>
                  </div>

                  {/* Invoice Info */}
                  <div className="flex justify-between mb-3 text-xs">
                    <div>
                      <p className="font-bold">TAX INVOICE</p>
                      <p>Invoice #: {invoiceNumber || 'QTN-XXXX'}</p>
                      <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Bill To:</p>
                      <p>{activeTab.customerName || 'Cash Customer'}</p>
                      {activeTab.customerPhone && <p>Ph: {activeTab.customerPhone}</p>}
                    </div>
                  </div>

                  {/* Items Table */}
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
                      {activeTab.invoiceItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center p-4 text-gray-500 italic border border-gray-400">
                            No items added yet
                          </td>
                        </tr>
                      ) : (
                        activeTab.invoiceItems.map((item, index) => (
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

                  {/* Totals */}
                  {activeTab.invoiceItems.length > 0 && (
                    <div className="border-t-2 border-gray-400 pt-2 mt-2 text-[10px]">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{activeTab.invoiceItems.reduce((sum, item) => {
                          // Use basePrice (taxable amount) for correct subtotal calculation
                          const taxablePerUnit = item.basePrice || (item.taxMode === 'inclusive' ? item.price / (1 + (item.tax || 0) / 100) : item.price)
                          return sum + (taxablePerUnit * item.qty - item.discountAmount)
                        }, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>₹{activeTab.invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0).toFixed(2)}</span>
                      </div>
                      {activeTab.invoiceDiscount > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>Discount:</span>
                          <span>-₹{activeTab.invoiceDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-xs border-t border-black pt-1 mt-1">
                        <span>TOTAL:</span>
                        <span>₹{(activeTab.invoiceItems.reduce((sum, item) => sum + item.total, 0) - activeTab.invoiceDiscount).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-center text-[9px] text-gray-600 mt-3 pt-2 border-t border-gray-400">
                    Thank you for your business!
                  </div>
                </div>
              )}

              {/* ============================================
                  A4 FORMAT
                  ============================================ */}
              {invoiceFormat === 'a4' && (
                <div className="p-6">
                  {/* A4 Header */}
                  <div className="text-center border-b-2 border-black pb-4 mb-4">
                    <h1 className="font-bold text-xl uppercase">{getCompanySettings().companyName || 'YOUR BUSINESS NAME'}</h1>
                    <p className="text-sm mt-1">
                      {getCompanySettings().address && `${getCompanySettings().address}, `}
                      {getCompanySettings().city || 'City'} - {getCompanySettings().pincode || '000000'}
                    </p>
                    <p className="text-sm">
                      Phone: {getCompanySettings().phone || '00000 00000'}
                      {getCompanySettings().email && ` | Email: ${getCompanySettings().email}`}
                    </p>
                    {getCompanySettings().gstin && (
                      <p className="text-sm font-semibold">GSTIN: {getCompanySettings().gstin}</p>
                    )}
                  </div>

                  {/* Invoice Info */}
                  <div className="flex justify-between mb-4 text-sm">
                    <div>
                      <h2 className="font-bold text-lg">TAX INVOICE</h2>
                      <p>Invoice #: {invoiceNumber || 'QTN-XXXX'}</p>
                      <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Bill To:</p>
                      <p className="font-semibold">{activeTab.customerName || 'Cash Customer'}</p>
                      {activeTab.customerPhone && <p>Ph: {activeTab.customerPhone}</p>}
                      {activeTab.customerGST && <p>GSTIN: {activeTab.customerGST}</p>}
                    </div>
                  </div>

                  {/* Items Table */}
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
                      {activeTab.invoiceItems.length === 0 ? (
                        <tr>
                          <td colSpan={5 + (visibleColumns.hsnCode ? 1 : 0) + (visibleColumns.description ? 1 : 0) + (visibleColumns.discount ? 1 : 0) + (visibleColumns.tax ? 1 : 0)} className="text-center p-6 text-gray-500 italic border border-gray-400 text-xs">
                            No items added yet
                          </td>
                        </tr>
                      ) : (
                        activeTab.invoiceItems.map((item, index) => (
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

                  {/* A4 Totals */}
                  {activeTab.invoiceItems.length > 0 && (
                    <div className="totals-section border-t-2 border-gray-400 pt-3 mt-3 text-sm">
                      <div className="flex justify-between mb-2">
                        <span>Subtotal:</span>
                        <span className="font-semibold">
                          ₹{activeTab.invoiceItems.reduce((sum, item) => {
                            // Use basePrice (taxable amount) for correct subtotal calculation
                            const taxablePerUnit = item.basePrice || (item.taxMode === 'inclusive' ? item.price / (1 + (item.tax || 0) / 100) : item.price)
                            return sum + (taxablePerUnit * item.qty - item.discountAmount)
                          }, 0).toFixed(2)}
                        </span>
                      </div>
                      {(() => {
                        const totalTax = activeTab.invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
                        const cgst = totalTax / 2;
                        const sgst = totalTax / 2;
                        return totalTax > 0 ? (
                          <>
                            <div className="flex justify-between mb-1 text-xs">
                              <span>CGST:</span>
                              <span>₹{cgst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-2 text-xs">
                              <span>SGST:</span>
                              <span>₹{sgst.toFixed(2)}</span>
                            </div>
                          </>
                        ) : null;
                      })()}
                      {activeTab.invoiceDiscount > 0 && (
                        <div className="flex justify-between mb-2 text-green-700">
                          <span>Discount:</span>
                          <span>-₹{activeTab.invoiceDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 px-3 bg-gray-200 border-2 border-gray-400 font-bold mt-2 text-base">
                        <span>GRAND TOTAL:</span>
                        <span>₹{(activeTab.invoiceItems.reduce((sum, item) => sum + item.total, 0) - activeTab.invoiceDiscount).toFixed(2)}</span>
                      </div>
                      <div className="mt-3 py-2 px-3 border border-gray-400 rounded bg-gray-50">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold">Payment Mode:</span>
                          <span className="uppercase font-bold">{activeTab.paymentMode}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* A4 Footer */}
                  <div className="text-center text-xs text-gray-600 mt-4 pt-3 border-t border-gray-400">
                    <p>Thank you for your business!</p>
                    <p className="text-[10px] mt-1">This is a computer-generated invoice</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
        )}
        </div>
        )}
        </div>
      )}

      {/* Create Invoice Modal - Hidden when using inline create view */}
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
                  <Sparkle size={20} weight="duotone" className="text-primary" />
                  Create New Invoice
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Customer Search Dropdown */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Customer Details</label>
                  <div className="relative" ref={customerDropdownRef}>
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search customer by name, phone, or email..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value)
                        setShowCustomerDropdown(true)
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="w-full pl-10 pr-3 py-2.5 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />

                    {/* Customer Dropdown */}
                    {showCustomerDropdown && (
                      <>
                        <div className="fixed inset-0 z-[99]" onClick={() => setShowCustomerDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-2xl z-[100] max-h-64 overflow-y-auto"
                        >
                        {/* Loading State */}
                        {loadingParties ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            Loading customers...
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            {customerSearch ? 'No customers found' : 'Start typing to search...'}
                          </div>
                        ) : (
                          filteredCustomers.map((party) => (
                            <button
                              key={party.id}
                              type="button"
                              onClick={() => handleCustomerSelect(party)}
                              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{party.displayName || party.companyName || party.name || party.customerName || party.partyName || party.fullName || party.businessName || 'Unknown Customer'}</div>
                                {/* Live Outstanding Balance - For Customers: Positive = To Receive (GREEN), Negative = To Pay (RED) */}
                                {(party.outstanding !== undefined || party.currentBalance !== undefined) && (() => {
                                  const outstanding = party.outstanding ?? party.currentBalance ?? 0
                                  // For customers: positive = To Receive (green), negative = To Pay (red)
                                  const colorClass = outstanding > 0 ? 'text-emerald-600' : outstanding < 0 ? 'text-red-600' : 'text-gray-500'
                                  const prefix = outstanding !== 0 ? (outstanding > 0 ? '+' : '-') : ''
                                  return (
                                    <span className={`text-sm font-semibold ml-2 ${colorClass}`}>
                                      {prefix}₹{Math.abs(outstanding).toLocaleString('en-IN')}
                                    </span>
                                  )
                                })()}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                                {party.phone && <span className="flex items-center gap-1"><Phone size={12} />{party.phone}</span>}
                                {party.email && <span className="flex items-center gap-1"><Envelope size={12} />{party.email}</span>}
                              </div>
                            </button>
                          ))
                        )}
                        {/* Add New Customer - At Bottom */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomerDropdown(false)
                            setShowAddCustomerModal(true)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-primary/10 border-t border-border flex items-center gap-2 text-primary font-medium sticky bottom-0 bg-card"
                        >
                          <Plus size={16} weight="bold" />
                          Add New Customer
                        </button>
                      </motion.div>
                      </>
                    )}
                  </div>

                  {/* Selected Customer Details */}
                  {customerName && (
                    <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{customerName}</span></div>
                        {customerPhone && <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{customerPhone}</span></div>}
                        {customerEmail && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{customerEmail}</span></div>}
                        {customerGST && <div><span className="text-muted-foreground">GST:</span> <span className="font-medium">{customerGST}</span></div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName('')
                          setCustomerPhone('')
                          setCustomerEmail('')
                          setCustomerGST('')
                          setCustomerState('')
                          setCustomerSearch('')
                        }}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Clear & choose different customer
                      </button>
                    </div>
                  )}

                  {/* Items List - Table Layout */}
                  <div className="mt-4 flex-1 min-h-0">
                    <div
                      className="border border-border rounded-lg bg-muted/10 h-full"
                      style={{
                        maxHeight: invoiceItems.length > 6 ? '30vh' : 'none',
                        overflowY: invoiceItems.length > 6 ? 'auto' : 'visible',
                        overflowX: 'auto'
                      }}
                    >
                      <table className="min-w-full text-xs">
                        <thead className="bg-background sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="px-3 py-2 text-center w-10">#</th>
                            <th className="px-3 py-2 text-left">Item</th>
                            <th className="px-3 py-2 text-right w-20">Qty</th>
                            <th className="px-3 py-2 text-left w-24">Unit</th>
                            <th className="px-3 py-2 text-center w-28">Tax Mode</th>
                            <th className="px-3 py-2 text-right w-28">
                              <div className="text-emerald-700 font-bold text-xs">MRP</div>
                            </th>
                            <th className="px-3 py-2 text-right w-28">
                              <div className="text-gray-600 font-semibold text-xs">Taxable</div>
                            </th>
                            <th className="px-3 py-2 text-right w-24">Disc %</th>
                            <th className="px-3 py-2 text-right w-28">Disc ₹</th>
                            <th className="px-3 py-2 text-right w-20">GST %</th>
                            <th className="px-3 py-2 text-right w-28">GST ₹</th>
                            <th className="px-3 py-2 text-right w-32">Total</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceItems.length === 0 ? (
                            <tr>
                              <td
                                colSpan={13}
                                className="px-3 py-4 text-center text-[11px] text-muted-foreground"
                              >
                                No items added yet. Use search above or add a blank row.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {invoiceItems.map((item, index) => (
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
                                    {item.hasMultiUnit ? (
                                      <select
                                        value={item.unit || item.baseUnit || 'Pcs'}
                                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                        className="w-full px-2 py-1 bg-blue-50 border border-blue-300 rounded text-xs font-semibold text-blue-700"
                                        title={`1 ${item.purchaseUnit || 'Box'} = ${item.piecesPerPurchaseUnit || 12} ${item.baseUnit || 'Pcs'}`}
                                      >
                                        <option value={item.baseUnit || 'Pcs'}>{item.baseUnit || 'Pcs'}</option>
                                        <option value={item.purchaseUnit || 'Box'}>{item.purchaseUnit || 'Box'}</option>
                                      </select>
                                    ) : (
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
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center align-middle">
                                    <select
                                      value={item.taxMode || 'exclusive'}
                                      onChange={(e) => updateItem(item.id, 'taxMode', e.target.value)}
                                      className="text-[11px] px-2 py-1 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded text-primary font-bold"
                                    >
                                      <option value="exclusive">Excl. GST</option>
                                      <option value="inclusive">Incl. GST</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={Number(item.price || 0).toFixed(2)}
                                      onChange={(e) => {
                                        const enteredPrice = parseFloat(e.target.value) || 0
                                        // Simply store what user enters - updateItem handles tax calculation based on mode
                                        updateItem(item.id, 'price', enteredPrice)
                                      }}
                                      className="w-full px-2 py-1 bg-emerald-50 border border-emerald-300 rounded text-sm text-right font-bold text-emerald-700"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right align-middle">
                                    <span className="text-xs font-medium text-gray-600">
                                      ₹{(item.basePrice || item.price).toFixed(2)}
                                    </span>
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
                                  {invoiceItems.reduce(
                                    (sum, i) => sum + (Number(i.qty) || 0),
                                    0
                                  )}
                                </td>
                                <td className="px-3 py-2" colSpan={6}></td>
                                <td className="px-3 py-2 text-right text-[11px] font-semibold">
                                  �'�
                                  {invoiceItems
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
                        className="px-3 py-1.5 text-xs border border-dashed border-primary text-primary rounded hover:bg-primary/5"
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
                    <Package size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search items by name or barcode..."
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value)
                        setShowItemDropdown(true)
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      className="w-full pl-10 pr-3 py-2.5 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />

                    {/* Item Dropdown - Only show in this modal context to prevent duplicate dropdowns */}
                    {showItemDropdown && showCreateModal && viewMode !== 'create' && (
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
                          className="w-full px-4 py-3 text-left hover:bg-primary/10 border-b border-border flex items-center gap-2 text-primary font-medium"
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
                                <div className="text-sm font-medium text-primary">
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
                  {false && invoiceItems.length > 0 && (
                    <div className="space-y-2">
                      {invoiceItems.map((item, index) => (
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
                          <div className="grid grid-cols-6 gap-2">
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
                            <div className="col-span-2">
                              <div className="flex items-center gap-1 mb-1">
                                <label className="text-xs text-muted-foreground">Price</label>
                                <select
                                  value={item.taxMode || 'exclusive'}
                                  onChange={(e) => updateItem(item.id, 'taxMode', e.target.value)}
                                  className="text-xs px-2 py-0.5 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded text-primary font-bold"
                                  title="GST Tax Mode: How GST is calculated"
                                >
                                  <option value="exclusive">Without GST</option>
                                  <option value="inclusive">With GST</option>
                                </select>
                              </div>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                              />
                              {item.taxMode === 'inclusive' && item.basePrice && (
                                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                  Base Price: ₹{item.basePrice.toFixed(2)}
                                </div>
                              )}
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

                {/* Invoice Discount & Payment Mode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Discount</label>
                    <div className="flex items-center bg-muted/30 border border-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDiscountType(discountType === 'percent' ? 'amount' : 'percent')}
                        className={`px-3 py-2 text-sm font-medium border-r border-border transition-colors ${
                          discountType === 'percent'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-green-100 text-green-600'
                        }`}
                        title={discountType === 'percent' ? 'Switch to Amount' : 'Switch to Percent'}
                      >
                        {discountType === 'percent' ? '%' : '₹'}
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '')
                          setInvoiceDiscount(parseFloat(val) || 0)
                        }}
                        placeholder="0"
                        className="flex-1 px-3 py-2 bg-transparent outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => {
                        setPaymentMode(e.target.value)
                        // Reset bank account selection when changing payment mode
                        if (e.target.value !== 'bank') {
                          setSelectedBankAccountId('')
                        }
                      }}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="cash">{t.sales.cash}</option>
                      <option value="card">{t.sales.card}</option>
                      <option value="upi">{t.sales.upi}</option>
                      <option value="bank">{language === 'ta' ? 'வங்கி பரிமாற்றம்' : 'Bank Transfer'}</option>
                      <option value="credit">{t.sales.credit}</option>
                    </select>
                  </div>

                </div>

                {/* Bank Account Selection - Only show when Bank Transfer is selected */}
                {(() => {
                  console.log('🔍 Payment Mode:', paymentMode, '| Bank Accounts:', bankAccounts.length, '| Should show:', paymentMode === 'bank')
                  return null
                })()}
                {paymentMode === 'bank' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Bank Account</label>
                    <select
                      value={selectedBankAccountId}
                      onChange={(e) => setSelectedBankAccountId(e.target.value)}
                      className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="">-- Select Bank Account --</option>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} (*{account.accountNo.slice(-4)}) - ₹{account.balance.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Add any additional notes..."
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                {/* Totals Summary */}
                {invoiceItems.length > 0 && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                      </div>
                      {invoiceDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount ({discountType === 'percent' ? `${invoiceDiscount}%` : `₹${invoiceDiscount}`}):</span>
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
                        <span className="text-xl font-bold text-primary">₹{totals.total.toFixed(2)}</span>
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
                  onClick={createInvoice}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  Create Invoice
                  <ArrowRight size={18} weight="bold" />
                </motion.button>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* View Invoice Modal */}
      <AnimatePresence>
        {showViewModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-card text-card-foreground rounded-xl shadow-2xl overflow-y-auto"
            >
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Invoice Details</h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        handlePrintInvoice(selectedInvoice)
                        setShowViewModal(false)
                      }}
                      className="p-2 hover:bg-amber-100 rounded-lg transition-colors text-amber-600"
                      title="Print Invoice"
                    >
                      <Printer size={20} weight="duotone" />
                    </button>
                    <button 
                      onClick={() => {
                        handleShareWhatsApp(selectedInvoice)
                      }}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                      title="Share via WhatsApp"
                    >
                      <Share size={20} weight="duotone" />
                    </button>
                    <button 
                      onClick={() => {
                        handleDownloadPDF(selectedInvoice)
                      }}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                      title="Download PDF"
                    >
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
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{selectedInvoice.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-semibold">{selectedInvoice.partyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Mode</p>
                    <p className="font-semibold capitalize">{selectedInvoice.paymentMode}</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">₹{selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount ({selectedInvoice.discount}%):</span>
                      <span className="font-medium text-destructive">-₹{(selectedInvoice.subtotal * selectedInvoice.discount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">₹{selectedInvoice.tax.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold text-primary">₹{selectedInvoice.total.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.paidAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium text-success">₹{selectedInvoice.paidAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Balance:</span>
                        <span className="text-lg font-bold text-warning">₹{(selectedInvoice.total - selectedInvoice.paidAmount).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Recording Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedInvoiceForPayment && (
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
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedInvoiceForPayment.paymentStatus === 'paid' ? 'Payment History' : 'Record Payment'}
                  </h2>
                  <p className="text-sm text-slate-600">Invoice: {selectedInvoiceForPayment.invoiceNumber}</p>
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
                {/* Invoice Summary */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Customer:</span>
                    <span className="font-semibold">{selectedInvoiceForPayment.partyName || 'Customer'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Invoice Total:</span>
                    <span className="font-semibold">₹{(selectedInvoiceForPayment.grandTotal || selectedInvoiceForPayment.total || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Paid Amount:</span>
                    <span className="font-semibold text-success">₹{(selectedInvoiceForPayment.paidAmount || selectedInvoiceForPayment.payment?.paidAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold">Balance Due:</span>
                    <span className="text-lg font-bold text-destructive">
                      ₹{((selectedInvoiceForPayment.grandTotal || selectedInvoiceForPayment.total || 0) - (selectedInvoiceForPayment.paidAmount || selectedInvoiceForPayment.payment?.paidAmount || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Payment Form - Only show if not fully paid */}
                {selectedInvoiceForPayment.paymentStatus !== 'paid' && (
                  <>
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
                          className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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
                                ? "border-primary bg-primary/5 text-primary font-semibold"
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

                    {/* Bank Account Selection - Show only when Bank is selected */}
                    {paymentMethodSelected === 'bank' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Bank Account *
                        </label>
                        <select
                          value={paymentBankAccountId}
                          onChange={(e) => setPaymentBankAccountId(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">-- Select Bank Account --</option>
                          {bankAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} (*{account.accountNo?.slice(-4) || '****'}) - ₹{(account.balance || 0).toLocaleString('en-IN')}
                            </option>
                          ))}
                        </select>
                        {bankAccounts.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No bank accounts found. Please add bank accounts in the Banking module first.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Payment Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Payment History - Always show if payments exist */}
                {invoicePayments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                      {selectedInvoiceForPayment.paymentStatus === 'paid' ? 'Payment Records' : 'Previous Payments'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      Click the reverse button to undo a payment
                    </p>
                    <div className="space-y-2">
                      {invoicePayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg p-3 group hover:bg-slate-100 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</span>
                              <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] uppercase font-medium">{payment.paymentMode}</span>
                            </div>
                            {payment.reference && (
                              <span className="text-slate-500 text-[10px]">Ref: {payment.reference}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-600">₹{payment.amount.toLocaleString('en-IN')}</span>
                            <button
                              onClick={() => handleDeletePayment(payment)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors opacity-60 group-hover:opacity-100"
                              title="Reverse Payment"
                            >
                              <ArrowCounterClockwise size={14} weight="bold" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info message for paid invoices with no payment records - allow reset */}
                {selectedInvoiceForPayment.paymentStatus === 'paid' && invoicePayments.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-700 mb-3 text-center">No payment records found for this invoice.</p>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-amber-600 text-center">
                        This invoice is marked as paid but has no payment history. You can:
                      </p>
                      <button
                        onClick={() => handleResetToPending()}
                        className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <ArrowCounterClockwise size={16} weight="bold" />
                        Reset to Pending Status
                      </button>
                      <p className="text-[10px] text-amber-600 text-center">
                        After resetting, you can record a new payment properly.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  {selectedInvoiceForPayment.paymentStatus === 'paid' ? 'Close' : 'Cancel'}
                </button>
                {selectedInvoiceForPayment.paymentStatus !== 'paid' && (
                  <button
                    onClick={handleRecordPayment}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Money size={18} weight="bold" />
                    Record Payment
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && invoiceToDelete && (
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
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Sales Invoice?</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Are you sure you want to delete invoice <strong>{invoiceToDelete.invoiceNumber}</strong> for <strong>{invoiceToDelete.partyName}</strong>?
                    This action cannot be undone and will permanently remove this invoice from your records.
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <XCircle size={16} className="text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      <strong>Warning:</strong> Deleting this invoice will affect your sales records and may impact your accounting reports. Make sure this is what you want to do.
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
                  Delete Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal - Matching Parties page design */}
      <AnimatePresence>
        {showAddCustomerModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddCustomerModal(false)
                resetCustomerForm()
              }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-xl shadow-2xl p-4 sm:p-6"
            >
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Add New Customer</h2>

                {/* Mandatory Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Customer Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(validateCustomerName(e.target.value))}
                      placeholder="Enter customer name (letters only)"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(validatePhoneNumber(e.target.value))}
                      placeholder="Enter phone number (e.g., +919876543210)"
                      maxLength={16}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                          value={newCustomerAddress}
                          onChange={(e) => setNewCustomerAddress(e.target.value)}
                          placeholder="Enter billing address"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                        ></textarea>
                      </motion.div>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    {!showStateField ? (
                      <button
                        onClick={() => setShowStateField(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                          value={newCustomerState}
                          onChange={(e) => setNewCustomerState(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                          value={newCustomerGST}
                          onChange={(e) => setNewCustomerGST(validateGSTIN(e.target.value))}
                          placeholder="Enter GST number (15 chars)"
                          maxLength={15}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    {!showEmailField ? (
                      <button
                        onClick={() => setShowEmailField(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                          value={newCustomerEmail}
                          onChange={(e) => setNewCustomerEmail(e.target.value)}
                          placeholder="Enter email address"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Customer Type */}
                  <div>
                    {!showCustomerTypeField ? (
                      <button
                        onClick={() => setShowCustomerTypeField(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        Customer Type
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">Customer Type</label>
                        <select
                          value={newCustomerType}
                          onChange={(e) => setNewCustomerType(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        >
                          <option>Regular</option>
                          <option>Wholesale</option>
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
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                          value={newCustomerNotes}
                          onChange={(e) => setNewCustomerNotes(e.target.value)}
                          placeholder="Add any additional notes"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                        ></textarea>
                      </motion.div>
                    )}
                  </div>

                  {/* Opening Balance */}
                  <div>
                    {!showOpeningBalanceField ? (
                      <button
                        onClick={() => setShowOpeningBalanceField(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        Opening Balance
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">Opening Balance (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newCustomerOpeningBalance}
                          onChange={(e) => setNewCustomerOpeningBalance(e.target.value)}
                          placeholder="Enter opening balance (e.g., 5000)"
                          className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                        <p className="text-xs text-muted-foreground">Positive = Customer owes you, Negative = You owe customer</p>
                      </motion.div>
                    )}
                  </div>

                  {/* Credit Days */}
                  <div>
                    {!showCreditDaysField ? (
                      <button
                        onClick={() => setShowCreditDaysField(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Plus size={14} weight="bold" />
                        Credit Period (Days)
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-medium mb-1.5 block">Credit Period (Days)</label>
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={newCustomerCreditDays}
                          onChange={(e) => setNewCustomerCreditDays(Number(e.target.value) || 0)}
                          placeholder="Enter credit period in days"
                          className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                        <p className="text-xs text-muted-foreground">Default: 30 days</p>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      setShowAddCustomerModal(false)
                      resetCustomerForm()
                    }}
                    className="flex-1 px-4 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewCustomer}
                    disabled={savingCustomer || !newCustomerName.trim()}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {savingCustomer ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Add Customer'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
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
                      <Package size={24} weight="duotone" className="text-primary" />
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
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Cube size={16} weight="duotone" />
                        Basic Information
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Item Name with Magic Autocomplete (matching Inventory page) */}
                        <div className="sm:col-span-2 relative">
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-2">
                            Item Name <span className="text-destructive">*</span>
                            <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-semibold">
                              ✨ Auto-Fill Magic
                            </span>
                          </label>
                          <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => handleNewItemNameChange(validateItemName(e.target.value))}
                            onKeyDown={handleNewItemKeyDown}
                            onBlur={() => setTimeout(() => setShowNewItemSuggestions(false), 200)}
                            placeholder="Start typing to see suggestions..."
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            autoFocus
                          />

                          {/* Autocomplete Suggestions Dropdown */}
                          {showNewItemSuggestions && newItemSuggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-2xl max-h-80 overflow-y-auto"
                            >
                              <div className="p-2 bg-primary/5 border-b border-border">
                                <p className="text-xs text-muted-foreground font-medium">
                                  ✨ {newItemSuggestions.length} items found - Click to auto-fill all details
                                </p>
                              </div>
                              {newItemSuggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSelectNewItemSuggestion(suggestion)}
                                  className={cn(
                                    'w-full p-3 text-left hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0',
                                    selectedNewItemIndex === index && 'bg-primary/10'
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm truncate">{suggestion.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{suggestion.category}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-bold text-sm text-primary">₹{suggestion.mrp}</p>
                                      <p className="text-xs text-muted-foreground">GST {suggestion.gst_rate}%</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {newItemName.length >= 2 && !showNewItemSuggestions && newItemSuggestions.length === 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-3">
                              <p className="text-xs text-muted-foreground">
                                No suggestions found. Fill in the details manually below.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Unit Type */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">
                            Unit Type <span className="text-destructive">*</span>
                          </label>
                          <select
                            value={newItemUnit}
                            onChange={(e) => setNewItemUnit(e.target.value)}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          >
                            <option value="NONE">None</option>
                            <option value="pcs">Pieces (PCS)</option>
                            <option value="kg">Kilogram (KG)</option>
                            <option value="g">Gram (G)</option>
                            <option value="l">Liter (L)</option>
                            <option value="ml">Milliliter (ML)</option>
                            <option value="m">Meter (M)</option>
                            <option value="box">Box</option>
                            <option value="dozen">Dozen</option>
                            <option value="pack">Pack</option>
                            <option value="set">Set</option>
                            {/* Custom units from Item Settings */}
                            {(() => {
                              const defaultUnits = ['NONE', 'pcs', 'kg', 'g', 'l', 'ml', 'm', 'box', 'dozen', 'pack', 'set', 'pieces', 'kilogram', 'liter', 'meter']
                              const filteredUnits = customUnits.filter(unit => {
                                const unitLower = unit.toLowerCase()
                                return !defaultUnits.some(def => unitLower.includes(def.toLowerCase()))
                              })
                              return filteredUnits.length > 0 ? (
                                <optgroup label="Custom Units">
                                  {filteredUnits.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </optgroup>
                              ) : null
                            })()}
                          </select>
                        </div>

                        {/* Category */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Category</label>
                          <select
                            value={newItemCategory}
                            onChange={(e) => {
                              const category = e.target.value
                              setNewItemCategory(category)

                              // HSN Code mapping based on category
                              const hsnMapping: Record<string, string> = {
                                stationery: '4820',
                                electronics: '8518',
                                furniture: '9403',
                                hardware: '7326',
                                grocery: '1101',
                                clothing: '6109',
                                home: '3402',
                                cosmetics: '3304',
                                toys: '9503',
                                other: '9999'
                              }

                              // Auto-fill HSN code based on category
                              const hsnCode = hsnMapping[category] || '9999'
                              setNewItemHsnCode(hsnCode)
                              setShowNewItemHSN(true)
                            }}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
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
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Pricing */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
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
                              onChange={(e) => {
                                const retailPrice = e.target.value
                                setNewItemRetailPrice(retailPrice)

                                // Auto-calculate wholesale price as 70% of retail price
                                if (retailPrice && parseFloat(retailPrice) > 0) {
                                  const wholesalePrice = (parseFloat(retailPrice) * 0.7).toFixed(2)
                                  setNewItemWholesalePrice(wholesalePrice)
                                  setShowNewItemWholesalePrice(true)
                                }
                              }}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>
                        </div>

                        {/* Item Type */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">This item is for:</label>
                          <div className="flex gap-2">
                            {['sales', 'purchase', 'both'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setNewItemType(type)}
                                className={cn(
                                  "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize border-2",
                                  newItemType === type
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-muted border-border hover:border-primary/30"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Expandable: Wholesale Price */}
                        <div className="sm:col-span-2">
                          {!showNewItemWholesalePrice ? (
                            <button
                              type="button"
                              onClick={() => setShowNewItemWholesalePrice(true)}
                              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                            >
                              <Plus size={14} weight="bold" />
                              Wholesale Price
                            </button>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                            >
                              <label className="text-xs font-medium mb-1.5 block">
                                Wholesale Price
                                <span className="ml-1.5 text-[10px] text-emerald-600 font-normal">(Auto-filled: 70% of MRP)</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                <input
                                  type="number"
                                  value={newItemWholesalePrice}
                                  onChange={(e) => setNewItemWholesalePrice(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-8 pr-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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
                              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                                  className="w-full pl-8 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Tax & Category */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
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
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
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
                              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 mt-6"
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
                              <label className="text-xs font-medium mb-1.5 block">
                                HSN Code (Optional)
                                <span className="ml-1.5 text-[10px] text-blue-600 font-normal">(Auto-filled from Category)</span>
                              </label>
                              <input
                                type="text"
                                value={newItemHsnCode}
                                onChange={(e) => setNewItemHsnCode(e.target.value)}
                                placeholder="e.g., 9609 for pens"
                                className="w-full px-3 py-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Stock Management */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
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
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>

                        {/* Expandable: Low Stock Alert */}
                        <div>
                          {!showNewItemLowStockAlert ? (
                            <button
                              type="button"
                              onClick={() => setShowNewItemLowStockAlert(true)}
                              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 mt-6"
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
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
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
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        </motion.div>
                      )}

                      {/* Expandable: Barcode */}
                      {!showNewItemBarcode ? (
                        <button
                          type="button"
                          onClick={() => setShowNewItemBarcode(true)}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
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
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
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
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* POS Checkout Wizard - Professional Step-by-Step Flow (Only in POS mode) */}
      {showCafePOS && showPOSCheckoutWizard && posCartItems.length > 0 && (
        <POSCheckoutWizard
          items={posCartItems}
          onComplete={handlePOSCheckoutDone}
          onCancel={handlePOSCheckoutCancel}
        />
      )}

      {/* AI Receipt Scanner */}
      <ReceiptScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
        type="sale"
      />

      {/* Barcode Scanner for Items */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={async (barcode) => {
          try {
            const item = await findItemByBarcode(barcode)
            if (item) {
              handleItemSelect(item)
              toast.success(`Added: ${item.name}`)
            } else {
              toast.error('Item not found with this barcode')
            }
          } catch (error) {
            toast.error('Error scanning barcode')
          }
          setShowBarcodeScanner(false)
        }}
      />

      {/* AI Bill Assistant */}
      <AIAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
      />

      {/* Invoice Preview Modal */}
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
                <div className="flex items-center justify-between p-6 border-b border-border bg-primary/5">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Eye size={28} weight="duotone" className="text-primary" />
                    Invoice Preview
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const pdfData: InvoicePDFData = {
                          invoiceNumber,
                          invoiceDate,
                          customerName,
                          customerPhone,
                          customerEmail,
                          customerGST,
                          items: invoiceItems.map(item => ({
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
                        downloadInvoicePDF(pdfData, generatePDFFilename())
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium"
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
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
                        <p className="text-sm text-gray-600 mt-1">#{invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Date: {new Date(invoiceDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
                      <p className="font-medium text-gray-900">{customerName}</p>
                      {customerPhone && <p className="text-sm text-gray-600">Phone: {customerPhone}</p>}
                      {customerEmail && <p className="text-sm text-gray-600">Email: {customerEmail}</p>}
                      {customerGST && <p className="text-sm text-gray-600">GSTIN: {customerGST}</p>}
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
                        {invoiceItems.map((item, index) => (
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
                      <p>This is a computer-generated invoice</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Sale Return Modal */}
      <AnimatePresence>
        {showSaleReturnModal && selectedInvoiceForReturn && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaleReturnModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-border bg-gradient-to-r from-orange-500 to-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Create Sale Return</h2>
                    <p className="text-sm text-white/80">Invoice: {selectedInvoiceForReturn.invoiceNumber}</p>
                  </div>
                  <button
                    onClick={() => setShowSaleReturnModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <X size={20} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Original Invoice Info */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="ml-2 font-medium">{selectedInvoiceForReturn.partyName || selectedInvoiceForReturn.customerName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <span className="ml-2 font-medium">{selectedInvoiceForReturn.date}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Original Total:</span>
                      <span className="ml-2 font-medium">₹{(selectedInvoiceForReturn.total || selectedInvoiceForReturn.grandTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Items Selection */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Select Items to Return</h3>
                  {returnItems.length === 0 ? (
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-muted-foreground text-sm">All items from this invoice have already been returned.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {returnItems.map((item, index) => {
                        const isFullyReturned = item.maxQty <= 0
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3 border rounded-lg transition-all",
                              isFullyReturned ? "border-muted bg-muted/30 opacity-60" :
                              item.selected ? "border-primary bg-primary/5" : "border-border"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                disabled={isFullyReturned}
                                onChange={(e) => {
                                  if (isFullyReturned) return
                                  const newItems = [...returnItems]
                                  newItems[index].selected = e.target.checked
                                  if (e.target.checked && newItems[index].qty === 0) {
                                    newItems[index].qty = newItems[index].maxQty
                                  }
                                  setReturnItems(newItems)
                                }}
                                className={cn(
                                  "w-5 h-5 rounded border-border text-primary focus:ring-primary",
                                  isFullyReturned && "cursor-not-allowed"
                                )}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={cn("font-medium text-sm", isFullyReturned && "line-through text-muted-foreground")}>{item.name}</p>
                                  {isFullyReturned && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                      Fully Returned
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  ₹{item.price} × {isFullyReturned ? 'All returned' : `Returnable: ${item.maxQty}`}
                                </p>
                              </div>
                              {item.selected && !isFullyReturned && (
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-muted-foreground">Qty:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={item.maxQty}
                                    value={item.qty}
                                    onChange={(e) => {
                                      const newItems = [...returnItems]
                                      const val = parseInt(e.target.value) || 0
                                      newItems[index].qty = Math.min(Math.max(val, 1), item.maxQty)
                                      setReturnItems(newItems)
                                    }}
                                    className="w-16 px-2 py-1 text-sm border border-border rounded focus:ring-primary focus:border-primary"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Reason for Return */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Reason for Return <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Select reason...</option>
                    <option value="Defective/Damaged">Defective/Damaged Product</option>
                    <option value="Wrong Item">Wrong Item Delivered</option>
                    <option value="Quality Issue">Quality Issue</option>
                    <option value="Customer Changed Mind">Customer Changed Mind</option>
                    <option value="Expired">Product Expired</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Additional Notes</label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Enter any additional notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none resize-none"
                  />
                </div>

                {/* Return Summary */}
                {returnItems.some(i => i.selected && i.qty > 0) && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-2">Return Summary</h4>
                    <div className="space-y-1 text-sm">
                      {returnItems.filter(i => i.selected && i.qty > 0).map(item => (
                        <div key={item.id} className="flex justify-between text-orange-700">
                          <span>{item.name} × {item.qty}</span>
                          <span>₹{(item.total || (item.price * item.qty)).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-orange-300 pt-2 mt-2 flex justify-between font-bold text-orange-900">
                        <span>Refund Amount:</span>
                        <span>₹{returnItems.filter(i => i.selected && i.qty > 0).reduce((sum, item) => sum + (item.total || (item.price * item.qty)), 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-muted/30 flex gap-3">
                <button
                  onClick={() => setShowSaleReturnModal(false)}
                  className="flex-1 px-4 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processSaleReturn}
                  disabled={isProcessingReturn || !returnItems.some(i => i.selected && i.qty > 0) || !returnReason}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessingReturn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowCounterClockwise size={18} weight="bold" />
                      Process Return
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Edit Modal */}
      <AnimatePresence>
        {showQuickEditModal && quickEditInvoice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickEditModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Pencil size={20} weight="duotone" className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Quick Edit Invoice</h2>
                    <p className="text-sm text-muted-foreground">{quickEditInvoice.invoiceNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickEditModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Basic Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                      <Calendar size={14} weight="duotone" className="text-primary" />
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={quickEditDate}
                      onChange={(e) => setQuickEditDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  {/* Party Name */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                      <User size={14} weight="duotone" className="text-primary" />
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={quickEditPartyName}
                      onChange={(e) => setQuickEditPartyName(e.target.value)}
                      placeholder="Customer name"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Package size={14} weight="duotone" className="text-primary" />
                      Invoice Items
                    </label>
                    <button
                      onClick={addQuickEditItem}
                      className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} weight="bold" />
                      Add Item
                    </button>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                      <span>Item Name</span>
                      <span className="text-center">Qty</span>
                      <span className="text-center">Rate</span>
                      <span className="text-center">Tax %</span>
                      <span className="text-right">Amount</span>
                      <span></span>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-border max-h-[240px] overflow-y-auto">
                      {quickEditItems.map((item) => (
                        <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2 px-3 py-2 items-center">
                          <div>
                            <input
                              type="text"
                              value={quickEditActiveItemId === item.id ? quickEditItemSearch : item.name}
                              onChange={(e) => {
                                setQuickEditActiveItemId(item.id)
                                setQuickEditItemSearch(e.target.value)
                                updateQuickEditItem(item.id, 'name', e.target.value)
                              }}
                              onFocus={() => {
                                setQuickEditActiveItemId(item.id)
                                setQuickEditItemSearch(item.name)
                              }}
                              onBlur={() => {
                                // Delay to allow click on dropdown
                                setTimeout(() => {
                                  setQuickEditActiveItemId(null)
                                  setQuickEditItemSearch('')
                                }, 200)
                              }}
                              placeholder="Search item..."
                              className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                          </div>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateQuickEditItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="1"
                            className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-center focus:ring-1 focus:ring-primary outline-none"
                          />
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateQuickEditItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-center focus:ring-1 focus:ring-primary outline-none"
                          />
                          <input
                            type="number"
                            value={item.tax}
                            onChange={(e) => updateQuickEditItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="28"
                            step="1"
                            className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-center focus:ring-1 focus:ring-primary outline-none"
                          />
                          <span className="text-sm font-medium text-right">
                            ₹{(item.qty * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => removeQuickEditItem(item.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash size={16} weight="duotone" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Item Search Dropdown - Rendered outside the table for clean appearance */}
                  {quickEditActiveItemId && quickEditItemSearch && getQuickEditFilteredItems().length > 0 && (
                    <div className="mt-2 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {getQuickEditFilteredItems().map((inventoryItem) => (
                        <div
                          key={inventoryItem.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleQuickEditItemSelect(quickEditActiveItemId, inventoryItem)
                          }}
                          className="px-3 py-2.5 hover:bg-primary/10 cursor-pointer border-b border-border last:border-0 transition-colors"
                        >
                          <div className="font-medium text-sm">{inventoryItem.name}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>₹{inventoryItem.sellingPrice || inventoryItem.purchasePrice || 0}</span>
                            <span>•</span>
                            <span>Tax: {inventoryItem.tax?.gstRate || inventoryItem.tax?.igst || ((inventoryItem.tax?.cgst || 0) + (inventoryItem.tax?.sgst || 0)) || 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Discount & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Discount */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                      <Percent size={14} weight="duotone" className="text-primary" />
                      Discount %
                    </label>
                    <input
                      type="number"
                      value={quickEditDiscount}
                      onChange={(e) => setQuickEditDiscount(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                      <FileText size={14} weight="duotone" className="text-primary" />
                      Notes
                    </label>
                    <input
                      type="text"
                      value={quickEditNotes}
                      onChange={(e) => setQuickEditNotes(e.target.value)}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <CurrencyInr size={16} weight="duotone" className="text-primary" />
                    Invoice Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const subtotal = quickEditItems.reduce((sum, item) => sum + (item.qty * item.rate), 0)
                      const totalTax = quickEditItems.reduce((sum, item) => sum + ((item.qty * item.rate) * (item.tax / 100)), 0)
                      const discountAmt = subtotal * (quickEditDiscount / 100)
                      const grandTotal = subtotal - discountAmt + totalTax
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="font-medium">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {quickEditDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount ({quickEditDiscount}%):</span>
                              <span>-₹{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax:</span>
                            <span className="font-medium">₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border text-base font-bold">
                            <span>Grand Total:</span>
                            <span className="text-primary">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-muted/30 flex gap-3">
                <button
                  onClick={() => setShowQuickEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveQuickEdit}
                  disabled={isSavingQuickEdit || quickEditItems.length === 0}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingQuickEdit ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FloppyDisk size={18} weight="bold" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POS Preview Modal - Vyapar/Marg Style Thermal Bill */}
      {showPosPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPosPreview(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Receipt size={24} weight="fill" />
                POS Bill Preview
              </h2>
              <button
                onClick={() => setShowPosPreview(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Thermal Bill Container - 80mm style */}
            <div className="p-4 bg-gray-100 max-h-[70vh] overflow-y-auto">
              <div
                id="pos-thermal-bill"
                className="w-80 mx-auto bg-white p-5 text-xs font-mono leading-tight border-2 border-gray-300 shadow-lg"
                style={{ fontFamily: "'Courier New', Courier, monospace" }}
              >
                {/* Shop Header */}
                <div className="text-center mb-3">
                  <h1 className="text-lg font-bold uppercase tracking-wide">
                    {getCompanySettings().companyName || 'YOUR SHOP NAME'}
                  </h1>
                  {getCompanySettings().address && (
                    <p className="text-[10px] mt-1">
                      {getCompanySettings().address}, {getCompanySettings().city} - {getCompanySettings().pincode}
                    </p>
                  )}
                  <p className="text-[10px]">Ph: {getCompanySettings().phone || '0000000000'}</p>
                  {getCompanySettings().gstin && (
                    <p className="font-semibold mt-1">GSTIN: {getCompanySettings().gstin}</p>
                  )}
                </div>

                <div className="border-t-2 border-dashed border-black my-3"></div>

                {/* Bill Info */}
                <div className="text-[10px] space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="font-bold">Bill#:</span>
                    <span>{invoiceNumber || 'QTN-XXXX'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Date:</span>
                    <span>{new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Customer:</span>
                    <span>{activeTab.customerName || 'Cash Customer'}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-black my-2"></div>

                {/* Items Header */}
                <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-gray-400">
                  <span className="flex-1">Item</span>
                  <span className="w-12 text-center">Qty</span>
                  <span className="w-16 text-right">Amount</span>
                </div>

                {/* Items List */}
                <div className="my-2 space-y-1">
                  {activeTab.invoiceItems.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 italic">No items added</div>
                  ) : (
                    activeTab.invoiceItems.map((item, i) => (
                      <div key={item.id || i} className="py-1 border-b border-dotted border-gray-300">
                        <div className="flex justify-between text-[10px]">
                          <span className="flex-1 font-medium truncate pr-1">{item.name}</span>
                          <span className="w-12 text-center">{item.qty}</span>
                          <span className="w-16 text-right font-bold">₹{item.total.toFixed(2)}</span>
                        </div>
                        <div className="text-[8px] text-gray-500">
                          {item.qty} × ₹{item.price.toFixed(2)}
                          {item.tax > 0 && ` (GST: ${item.tax}%)`}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t-2 border-dashed border-black my-2"></div>

                {/* Totals */}
                {activeTab.invoiceItems.length > 0 && (
                  <div className="text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{activeTab.invoiceItems.reduce((sum, item) => {
                        // Use basePrice (taxable amount) for correct subtotal calculation
                        const taxablePerUnit = item.basePrice || (item.taxMode === 'inclusive' ? item.price / (1 + (item.tax || 0) / 100) : item.price)
                        return sum + (taxablePerUnit * item.qty - item.discountAmount)
                      }, 0).toFixed(2)}</span>
                    </div>
                    {(() => {
                      const totalTax = activeTab.invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
                      const cgst = totalTax / 2;
                      const sgst = totalTax / 2;
                      return totalTax > 0 ? (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>CGST:</span>
                            <span>₹{cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>SGST:</span>
                            <span>₹{sgst.toFixed(2)}</span>
                          </div>
                        </>
                      ) : null;
                    })()}
                    {activeTab.invoiceDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-₹{activeTab.invoiceDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Grand Total */}
                    <div className="flex justify-between font-bold text-sm border-t-2 border-b-2 border-black py-2 mt-2">
                      <span>TOTAL:</span>
                      <span>₹{Math.round(activeTab.invoiceItems.reduce((sum, item) => sum + item.total, 0) - activeTab.invoiceDiscount).toFixed(2)}</span>
                    </div>

                    {/* Payment Mode */}
                    <div className="flex justify-between mt-2">
                      <span className="font-bold">Payment:</span>
                      <span className="uppercase font-bold">{activeTab.paymentMode}</span>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t-2 border-dashed border-black mt-4 pt-3 text-center">
                  <p className="font-bold text-sm">Thank You!</p>
                  <p className="text-[10px]">Visit Again 😊</p>
                  <p className="text-[8px] text-gray-400 mt-2">Powered by Thisai CRM</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-gray-50 border-t flex gap-3 justify-center">
              <button
                onClick={() => {
                  // Print the thermal bill
                  const printContent = document.getElementById('pos-thermal-bill');
                  if (printContent) {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>POS Bill - ${invoiceNumber || 'TEMP'}</title>
                            <style>
                              @page { size: 80mm auto; margin: 0; }
                              * { box-sizing: border-box; margin: 0; padding: 0; }
                              body {
                                margin: 0;
                                padding: 5mm;
                                font-family: 'Courier New', Courier, monospace;
                                font-size: 10px;
                                line-height: 1.4;
                                width: 80mm;
                              }
                              .flex { display: flex; }
                              .flex-1 { flex: 1; }
                              .justify-between { justify-content: space-between; }
                              .items-center { align-items: center; }
                              .text-center { text-align: center; }
                              .text-right { text-align: right; }
                              .text-left { text-align: left; }
                              .font-bold { font-weight: bold; }
                              .font-medium { font-weight: 500; }
                              .font-semibold { font-weight: 600; }
                              .uppercase { text-transform: uppercase; }
                              .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                              .text-lg { font-size: 14px; }
                              .text-sm { font-size: 11px; }
                              .text-xs { font-size: 10px; }
                              .text-\\[10px\\] { font-size: 10px; }
                              .text-\\[8px\\] { font-size: 8px; }
                              .text-gray-400 { color: #9ca3af; }
                              .text-gray-500 { color: #6b7280; }
                              .text-gray-600 { color: #4b5563; }
                              .text-green-600 { color: #16a34a; }
                              .italic { font-style: italic; }
                              .tracking-wide { letter-spacing: 0.025em; }
                              .space-y-1 > * + * { margin-top: 4px; }
                              .my-2 { margin-top: 8px; margin-bottom: 8px; }
                              .my-3 { margin-top: 12px; margin-bottom: 12px; }
                              .mb-3 { margin-bottom: 12px; }
                              .mt-1 { margin-top: 4px; }
                              .mt-2 { margin-top: 8px; }
                              .py-1 { padding-top: 4px; padding-bottom: 4px; }
                              .py-2 { padding-top: 8px; padding-bottom: 8px; }
                              .py-4 { padding-top: 16px; padding-bottom: 16px; }
                              .pb-1 { padding-bottom: 4px; }
                              .pr-1 { padding-right: 4px; }
                              .w-12 { width: 48px; }
                              .w-16 { width: 64px; }
                              .border-t { border-top: 1px solid #d1d5db; }
                              .border-t-2 { border-top: 2px solid #000; }
                              .border-b { border-bottom: 1px solid #d1d5db; }
                              .border-b-2 { border-bottom: 2px solid #000; }
                              .border-dashed { border-style: dashed; }
                              .border-dotted { border-style: dotted; }
                              .border-black { border-color: #000; }
                              .border-gray-300 { border-color: #d1d5db; }
                              .border-gray-400 { border-color: #9ca3af; }
                            </style>
                          </head>
                          <body>${printContent.innerHTML}</body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                      printWindow.close();
                    }
                  }
                }}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Printer size={20} weight="bold" />
                Print Bill
              </button>
              <button
                onClick={() => {
                  // Save and close
                  createInvoice();
                  setShowPosPreview(false);
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FloppyDisk size={20} weight="bold" />
                Save & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={showInvoicePreview}
        onClose={() => {
          setShowInvoicePreview(false)
          // Only save the invoice when closing if NOT in print-only mode
          if (!printOnlyPreview) {
            if (activeTab.mode === 'invoice') {
              createInvoiceOnly()
            } else {
              createInvoice()
            }
          }
          // Reset print-only flag
          setPrintOnlyPreview(false)
        }}
        invoiceData={{
          invoiceNumber,
          invoiceDate,
          customerName,
          customerPhone,
          items: invoiceItems.map(item => ({
            name: item.name,
            quantity: item.qty,
            price: item.price,
            total: item.total,
            gst: item.tax,
            taxMode: item.taxMode,
            basePrice: item.basePrice,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            igstAmount: item.igstAmount
          })),
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.totalTax,
          total: totals.total,
          received: payments.reduce((sum, p) => sum + p.amount, 0),
          balance: totals.total - payments.reduce((sum, p) => sum + p.amount, 0),
          companyName: getCompanySettings().companyName,
          companyPhone: getCompanySettings().phone,
          // Payment details for invoice display
          payment: payments.length > 0 ? {
            mode: payments[0].type,
            paidAmount: payments.reduce((sum, p) => sum + p.amount, 0),
            reference: payments[0].reference,
            // Get bank name if payment is bank type
            bankName: payments[0].type === 'bank' && selectedBankAccountId
              ? bankAccounts.find(b => b.id?.toString() === selectedBankAccountId)?.name
              : undefined,
            bankAccount: payments[0].type === 'bank' && selectedBankAccountId
              ? bankAccounts.find(b => b.id?.toString() === selectedBankAccountId)?.accountNo
              : undefined
          } : undefined,
          // All payments for history
          payments: payments.map(p => ({
            amount: p.amount,
            mode: p.type,
            reference: p.reference
          }))
        }}
      />

      {/* Invoice Preview Modal for Existing Invoices from List */}
      {listInvoicePreviewData && (
        <InvoicePreviewModal
          isOpen={showListInvoicePreview}
          onClose={() => {
            setShowListInvoicePreview(false)
            setListInvoicePreviewData(null)
          }}
          invoiceData={listInvoicePreviewData}
        />
      )}
    </div>
  )
}

export default Sales
