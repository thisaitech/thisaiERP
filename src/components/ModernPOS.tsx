import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  MagnifyingGlass,
  Plus,
  Minus,
  Trash,
  User,
  Phone,
  ShoppingCart,
  Coffee,
  Hamburger,
  Cookie,
  IceCream,
  Wine,
  Carrot,
  ForkKnife,
  Package,
  X,
  Receipt,
  Printer,
  Table,
  ShoppingBag,
  Storefront,
  Motorcycle,
  Fire,
  Clock,
  Heart,
  Star,
  Lightning,
  CookingPot,
  Bell,
  Check,
  ArrowsClockwise,
  UserPlus,
  CaretDown,
  // Additional category icons
  PencilSimple,
  FirstAid,
  House,
  Basket,
  Pill,
  Drop,
  Sparkle,
  TShirt,
  Baby,
  Bread,
  Egg,
  Fish,
  Leaf,
  Orange,
  Barbell,
  PaintBrush,
  Wrench,
  Lightning as LightningIcon,
  Gift,
  Dog,
  Cat,
  Broom,
  Lamp,
  Desktop,
  DeviceMobile,
  Headphones,
  GameController,
  Book,
  Notebook,
  Scissors,
  Tooth,
  Sun,
  SquaresFour as Squares,
  // Quick checkout icons
  Money,
  CreditCard,
  QrCode,
  Bank,
  CheckCircle,
  CurrencyInr,
  // Sharing icons
  WhatsappLogo,
  ShareNetwork,
  Link as LinkIcon,
  Copy,
  DownloadSimple,
  ArrowClockwise,
  EnvelopeSimple,
  ChatCircle,
  Percent
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { getItems } from '../services/itemService'
import { getCompanySettings, getTaxSettings, getItemSettings } from '../services/settingsService'
import { getParties, createParty } from '../services/partyService'
import type { Item, Party } from '../types'
import { usePOSSession } from '../contexts/POSSessionContext'
import { useLanguage } from '../contexts/LanguageContext'
import BarcodeScanner from './BarcodeScanner'

// POS Mode - Simple for grocery, Advanced for cafe
type POSMode = 'simple' | 'cafe'

// Category icons mapping - comprehensive list for various business types
const categoryIcons: Record<string, React.ReactNode> = {
  // Beverages
  'Hot Beverages': <Coffee size={20} weight="fill" />,
  'Cold Beverages': <IceCream size={20} weight="fill" />,
  'Beverages': <Wine size={20} weight="fill" />,
  'beverages': <Wine size={20} weight="fill" />,
  'drinks': <Wine size={20} weight="fill" />,
  'Drinks': <Wine size={20} weight="fill" />,

  // Food
  'Snacks': <Cookie size={20} weight="fill" />,
  'snacks': <Cookie size={20} weight="fill" />,
  'Fast Food': <Hamburger size={20} weight="fill" />,
  'fast food': <Hamburger size={20} weight="fill" />,
  'Desserts': <IceCream size={20} weight="fill" />,
  'desserts': <IceCream size={20} weight="fill" />,
  'Vegetables': <Carrot size={20} weight="fill" />,
  'vegetables': <Carrot size={20} weight="fill" />,
  'Main Course': <ForkKnife size={20} weight="fill" />,
  'Biscuits': <Cookie size={20} weight="fill" />,
  'biscuits': <Cookie size={20} weight="fill" />,
  'Chips': <Cookie size={20} weight="fill" />,
  'chips': <Cookie size={20} weight="fill" />,
  'Chocolate': <Cookie size={20} weight="fill" />,
  'chocolate': <Cookie size={20} weight="fill" />,
  'Bread': <Bread size={20} weight="fill" />,
  'bread': <Bread size={20} weight="fill" />,
  'Bakery': <Bread size={20} weight="fill" />,
  'bakery': <Bread size={20} weight="fill" />,
  'Dairy': <Drop size={20} weight="fill" />,
  'dairy': <Drop size={20} weight="fill" />,
  'Fruits': <Orange size={20} weight="fill" />,
  'fruits': <Orange size={20} weight="fill" />,
  'Eggs': <Egg size={20} weight="fill" />,
  'eggs': <Egg size={20} weight="fill" />,
  'Fish': <Fish size={20} weight="fill" />,
  'fish': <Fish size={20} weight="fill" />,
  'Meat': <ForkKnife size={20} weight="fill" />,
  'meat': <ForkKnife size={20} weight="fill" />,
  'Rice': <Leaf size={20} weight="fill" />,
  'rice': <Leaf size={20} weight="fill" />,
  'Dal': <CookingPot size={20} weight="fill" />,
  'dal': <CookingPot size={20} weight="fill" />,
  'Pulses': <CookingPot size={20} weight="fill" />,
  'pulses': <CookingPot size={20} weight="fill" />,
  'Spices': <Fire size={20} weight="fill" />,
  'spices': <Fire size={20} weight="fill" />,
  'Masala': <Fire size={20} weight="fill" />,
  'masala': <Fire size={20} weight="fill" />,
  'Oil': <Drop size={20} weight="fill" />,
  'oil': <Drop size={20} weight="fill" />,
  'Noodles': <CookingPot size={20} weight="fill" />,
  'noodles': <CookingPot size={20} weight="fill" />,

  // Grocery
  'Grocery': <Basket size={20} weight="fill" />,
  'grocery': <Basket size={20} weight="fill" />,
  'Groceries': <Basket size={20} weight="fill" />,
  'groceries': <Basket size={20} weight="fill" />,
  'Food': <ForkKnife size={20} weight="fill" />,
  'food': <ForkKnife size={20} weight="fill" />,

  // Stationery
  'Stationery': <PencilSimple size={20} weight="fill" />,
  'stationery': <PencilSimple size={20} weight="fill" />,
  'Office': <Notebook size={20} weight="fill" />,
  'office': <Notebook size={20} weight="fill" />,
  'Office Supplies': <Notebook size={20} weight="fill" />,
  'Books': <Book size={20} weight="fill" />,
  'books': <Book size={20} weight="fill" />,
  'Notebooks': <Notebook size={20} weight="fill" />,
  'notebooks': <Notebook size={20} weight="fill" />,
  'Pens': <PencilSimple size={20} weight="fill" />,
  'pens': <PencilSimple size={20} weight="fill" />,

  // Personal Care & Cosmetics
  'Cosmetics': <Sparkle size={20} weight="fill" />,
  'cosmetics': <Sparkle size={20} weight="fill" />,
  'Beauty': <Sparkle size={20} weight="fill" />,
  'beauty': <Sparkle size={20} weight="fill" />,
  'Personal Care': <Sparkle size={20} weight="fill" />,
  'personal care': <Sparkle size={20} weight="fill" />,
  'Skincare': <Sun size={20} weight="fill" />,
  'skincare': <Sun size={20} weight="fill" />,
  'Haircare': <Scissors size={20} weight="fill" />,
  'haircare': <Scissors size={20} weight="fill" />,

  // Health & Medicine
  'Medicine': <Pill size={20} weight="fill" />,
  'medicine': <Pill size={20} weight="fill" />,
  'Health': <FirstAid size={20} weight="fill" />,
  'health': <FirstAid size={20} weight="fill" />,
  'Healthcare': <FirstAid size={20} weight="fill" />,
  'healthcare': <FirstAid size={20} weight="fill" />,
  'Pharmacy': <Pill size={20} weight="fill" />,
  'pharmacy': <Pill size={20} weight="fill" />,
  'FirstAid': <FirstAid size={20} weight="fill" />,
  'firstaid': <FirstAid size={20} weight="fill" />,

  // Oral Care
  'Toothpaste': <Tooth size={20} weight="fill" />,
  'toothpaste': <Tooth size={20} weight="fill" />,
  'Oral Care': <Tooth size={20} weight="fill" />,
  'oral care': <Tooth size={20} weight="fill" />,
  'Dental': <Tooth size={20} weight="fill" />,
  'dental': <Tooth size={20} weight="fill" />,

  // Home & Cleaning
  'Home': <House size={20} weight="fill" />,
  'home': <House size={20} weight="fill" />,
  'Home Care': <House size={20} weight="fill" />,
  'home care': <House size={20} weight="fill" />,
  'Cleaning': <Broom size={20} weight="fill" />,
  'cleaning': <Broom size={20} weight="fill" />,
  'Detergent': <Drop size={20} weight="fill" />,
  'detergent': <Drop size={20} weight="fill" />,
  'Laundry': <TShirt size={20} weight="fill" />,
  'laundry': <TShirt size={20} weight="fill" />,
  'Household': <House size={20} weight="fill" />,
  'household': <House size={20} weight="fill" />,

  // Baby Products
  'Baby': <Baby size={20} weight="fill" />,
  'baby': <Baby size={20} weight="fill" />,
  'Baby Care': <Baby size={20} weight="fill" />,
  'baby care': <Baby size={20} weight="fill" />,
  'Kids': <Baby size={20} weight="fill" />,
  'kids': <Baby size={20} weight="fill" />,

  // Electronics
  'Electronics': <Desktop size={20} weight="fill" />,
  'electronics': <Desktop size={20} weight="fill" />,
  'Mobile': <DeviceMobile size={20} weight="fill" />,
  'mobile': <DeviceMobile size={20} weight="fill" />,
  'Phones': <DeviceMobile size={20} weight="fill" />,
  'phones': <DeviceMobile size={20} weight="fill" />,
  'Accessories': <Headphones size={20} weight="fill" />,
  'accessories': <Headphones size={20} weight="fill" />,
  'Gaming': <GameController size={20} weight="fill" />,
  'gaming': <GameController size={20} weight="fill" />,

  // Hardware & Tools
  'Hardware': <Wrench size={20} weight="fill" />,
  'hardware': <Wrench size={20} weight="fill" />,
  'Tools': <Wrench size={20} weight="fill" />,
  'tools': <Wrench size={20} weight="fill" />,
  'Electrical': <LightningIcon size={20} weight="fill" />,
  'electrical': <LightningIcon size={20} weight="fill" />,

  // Pet Products
  'Pets': <Dog size={20} weight="fill" />,
  'pets': <Dog size={20} weight="fill" />,
  'Pet Food': <Dog size={20} weight="fill" />,
  'pet food': <Dog size={20} weight="fill" />,
  'Dog': <Dog size={20} weight="fill" />,
  'dog': <Dog size={20} weight="fill" />,
  'Cat': <Cat size={20} weight="fill" />,
  'cat': <Cat size={20} weight="fill" />,

  // Fashion
  'Clothing': <TShirt size={20} weight="fill" />,
  'clothing': <TShirt size={20} weight="fill" />,
  'Fashion': <TShirt size={20} weight="fill" />,
  'fashion': <TShirt size={20} weight="fill" />,
  'Apparel': <TShirt size={20} weight="fill" />,
  'apparel': <TShirt size={20} weight="fill" />,

  // Sports & Fitness
  'Sports': <Barbell size={20} weight="fill" />,
  'sports': <Barbell size={20} weight="fill" />,
  'Fitness': <Barbell size={20} weight="fill" />,
  'fitness': <Barbell size={20} weight="fill" />,

  // Art & Crafts
  'Art': <PaintBrush size={20} weight="fill" />,
  'art': <PaintBrush size={20} weight="fill" />,
  'Crafts': <PaintBrush size={20} weight="fill" />,
  'crafts': <PaintBrush size={20} weight="fill" />,

  // Gifts
  'Gifts': <Gift size={20} weight="fill" />,
  'gifts': <Gift size={20} weight="fill" />,
  'Gift': <Gift size={20} weight="fill" />,
  'gift': <Gift size={20} weight="fill" />,

  // Organic/Natural
  'Organic': <Leaf size={20} weight="fill" />,
  'organic': <Leaf size={20} weight="fill" />,
  'Natural': <Leaf size={20} weight="fill" />,
  'natural': <Leaf size={20} weight="fill" />,

  // Lighting
  'Lighting': <Lamp size={20} weight="fill" />,
  'lighting': <Lamp size={20} weight="fill" />,
  'Lights': <Lamp size={20} weight="fill" />,
  'lights': <Lamp size={20} weight="fill" />,

  // Uncategorized/Default
  'Uncategorized': <Package size={20} weight="fill" />,
  'uncategorized': <Package size={20} weight="fill" />,
  'Others': <Package size={20} weight="fill" />,
  'others': <Package size={20} weight="fill" />,
  'General': <Package size={20} weight="fill" />,
  'general': <Package size={20} weight="fill" />,
  'default': <Package size={20} weight="fill" />
}

// Helper function to get icon for category (handles case-insensitivity)
const getCategoryIcon = (category: string | undefined): React.ReactNode => {
  if (!category) return categoryIcons['default']
  // Try exact match first
  if (categoryIcons[category]) return categoryIcons[category]
  // Try lowercase match
  const lowerCategory = category.toLowerCase()
  if (categoryIcons[lowerCategory]) return categoryIcons[lowerCategory]
  // Try partial match for common keywords
  const keywords = ['grocery', 'stationery', 'cosmetic', 'home', 'food', 'beverage', 'snack', 'medicine', 'health', 'baby', 'electronic', 'cloth', 'pet', 'tooth', 'clean']
  for (const keyword of keywords) {
    if (lowerCategory.includes(keyword)) {
      return categoryIcons[keyword] || categoryIcons['default']
    }
  }
  return categoryIcons['default']
}

// No demo items - each company should add their own inventory
// Empty array shown when no items exist

interface CartItem {
  id: string
  itemId: string
  name: string
  price: number
  quantity: number
  unit?: string
  tax: number
  taxAmount: number
  hsnCode?: string
  discount?: number
}

// Payment method type for quick checkout
type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit'

// Customer Tab for multi-customer POS (like QueueBuster)
interface CustomerTab {
  id: string
  tokenNumber: number
  customerName: string
  customerPhone?: string
  customerId?: string
  items: CartItem[]
  status: 'active' | 'processing' | 'completed'
  createdAt: number
  lastUpdated: number
  isInCheckout?: boolean // Track if tab is in checkout mode
}

// Local storage key for customer tabs
const CUSTOMER_TABS_KEY = 'thisai_pos_customer_tabs'
const ACTIVE_TAB_KEY = 'thisai_pos_active_tab'
const MAX_CUSTOMER_TABS = 10

// Get all customer tabs from localStorage
const getCustomerTabs = (): CustomerTab[] => {
  try {
    const saved = localStorage.getItem(CUSTOMER_TABS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

// Save customer tabs to localStorage
const saveCustomerTabs = (tabs: CustomerTab[]) => {
  localStorage.setItem(CUSTOMER_TABS_KEY, JSON.stringify(tabs))
}

// Get active tab ID from localStorage
const getActiveTabId = (): string | null => {
  return localStorage.getItem(ACTIVE_TAB_KEY)
}

// Save active tab ID to localStorage
const saveActiveTabId = (tabId: string) => {
  localStorage.setItem(ACTIVE_TAB_KEY, tabId)
}

// Generate next token number
const getNextTokenNumber = (tabs: CustomerTab[]): number => {
  if (tabs.length === 0) return 1
  const maxToken = Math.max(...tabs.map(t => t.tokenNumber))
  return maxToken + 1
}

// Quick checkout data structure
export interface QuickCheckoutData {
  customer: {
    id?: string
    name: string
    phone?: string
    isWalkIn: boolean
  }
  payment: {
    method: PaymentMethod
    amount: number
    receivedAmount?: number
    changeAmount?: number
    transactionId?: string
  }
  discount: {
    type: 'percentage' | 'amount'
    value: number
    discountAmount: number
  }
  roundOff: number
  grandTotal: number
  items: CartItem[]
}

interface ModernPOSProps {
  onCheckout: (items: CartItem[], customerName: string) => void
  onQuickCheckout?: (data: QuickCheckoutData) => void // Quick checkout callback
  onClose?: () => void
  mode?: POSMode // 'simple' for grocery, 'cafe' for cafe
  onAddCustomer?: () => void // Callback to open external Add Customer modal
  onCustomerAdded?: (customer: Party) => void // Callback when a customer is added externally
}

const ModernPOS: React.FC<ModernPOSProps> = ({ onCheckout, onQuickCheckout, onClose, mode = 'simple', onAddCustomer, onCustomerAdded }) => {
  const { t } = useLanguage()

  // Multi-tab session support - each tab has independent cart
  const {
    sessionId,
    shortId,
    cart: sessionCart,
    addToCart: sessionAddToCart,
    updateCartItem: sessionUpdateCart,
    removeFromCart: sessionRemoveFromCart,
    clearCart: sessionClearCart,
    customerName: sessionCustomerName,
    setCustomer: sessionSetCustomer
  } = usePOSSession()

  const [items, setItems] = useState<Item[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const categoryHoverTimeout = useRef<NodeJS.Timeout | null>(null)

  // Cart synced with session for multi-tab support
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Initialize from session cart
    return sessionCart.map(item => ({
      id: item.id,
      itemId: item.itemId || item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit || 'PCS',
      tax: item.gstRate || 0,
      taxAmount: (item.price * item.quantity * (item.gstRate || 0)) / 100
    }))
  })

  const [customerName, setCustomerName] = useState(sessionCustomerName || '')
  const [loading, setLoading] = useState(true)
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('80mm')
  const [companySettings, setCompanySettings] = useState<any>(null)

  // Sync cart changes to session
  useEffect(() => {
    const sessionItems = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      tax: item.tax || 0,
      taxAmount: item.taxAmount || 0,
      itemId: item.itemId || item.id
    }))
    // Update session storage directly to avoid circular updates
    const sessions = JSON.parse(localStorage.getItem('thisai_pos_sessions') || '{}')
    if (sessions[sessionId]) {
      sessions[sessionId] = {
        ...sessions[sessionId],
        cart: sessionItems,
        lastUpdated: Date.now()
      }
      localStorage.setItem('thisai_pos_sessions', JSON.stringify(sessions))
    }
  }, [cart, sessionId])

  // Customer search state
  const [parties, setParties] = useState<Party[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [customerPhone, setCustomerPhone] = useState('') // Phone number for WhatsApp
  const customerDropdownRef = useRef<HTMLDivElement>(null)

  // Quick Checkout state
  const [showQuickCheckout, setShowQuickCheckout] = useState(false)
  const [showBillPreview, setShowBillPreview] = useState(false) // Bill preview modal
  const [showMobileCart, setShowMobileCart] = useState(false) // Mobile cart drawer
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false) // Barcode scanner modal
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amountTendered, setAmountTendered] = useState<string>('')
  const [transactionId, setTransactionId] = useState('')
  const [invoiceDiscount, setInvoiceDiscount] = useState(0) // Manual discount percentage
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent') // Discount type
  const [discountInputValue, setDiscountInputValue] = useState('') // For clean input handling
  const [isProcessingSale, setIsProcessingSale] = useState(false)
  const [selectedShareMethod, setSelectedShareMethod] = useState<'whatsapp' | 'sms' | 'print' | 'none'>('none') // Share method selection

  // Post-checkout sharing panel state
  const [showBillComplete, setShowBillComplete] = useState(false)
  const [completedSale, setCompletedSale] = useState<{
    billNumber: string
    customerName: string
    customerPhone?: string
    grandTotal: number
    paymentMethod: PaymentMethod
    items: CartItem[]
    changeAmount: number
  } | null>(null)

  // ========== MULTI-CUSTOMER TABS (QueueBuster-style) ==========
  // Initialize customer tabs from localStorage
  const [customerTabs, setCustomerTabs] = useState<CustomerTab[]>(() => {
    const savedTabs = getCustomerTabs()
    // Clean up completed tabs older than 1 hour
    const now = Date.now()
    const activeTabs = savedTabs.filter(tab =>
      tab.status !== 'completed' || (now - tab.lastUpdated) < 3600000
    )
    if (activeTabs.length === 0) {
      // Create first customer tab
      const firstTab: CustomerTab = {
        id: 'tab_' + Date.now() + '_1',
        tokenNumber: 1,
        customerName: '',
        items: [],
        status: 'active',
        createdAt: Date.now(),
        lastUpdated: Date.now()
      }
      return [firstTab]
    }
    return activeTabs
  })

  // Active tab ID
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActiveId = getActiveTabId()
    const savedTabs = getCustomerTabs()
    // Validate saved active tab exists
    if (savedActiveId && savedTabs.some(t => t.id === savedActiveId)) {
      return savedActiveId
    }
    // Return first tab or create new
    return savedTabs[0]?.id || 'tab_' + Date.now() + '_1'
  })

  // Get current active tab
  const activeTab = useMemo(() => {
    return customerTabs.find(t => t.id === activeTabId) || customerTabs[0]
  }, [customerTabs, activeTabId])

  // Save tabs to localStorage when they change
  useEffect(() => {
    saveCustomerTabs(customerTabs)
  }, [customerTabs])

  // Save active tab ID to localStorage when it changes
  useEffect(() => {
    saveActiveTabId(activeTabId)
  }, [activeTabId])

  // Sync active tab's cart with component cart state
  useEffect(() => {
    if (activeTab) {
      setCart(activeTab.items)
      setCustomerName(activeTab.customerName || '')
      setCustomerSearch(activeTab.customerName || '')
      if (activeTab.customerId) {
        const party = parties.find(p => p.id === activeTab.customerId)
        if (party) setSelectedParty(party)
      } else {
        setSelectedParty(null)
      }
      // Restore checkout state when switching tabs
      setShowQuickCheckout(activeTab.isInCheckout || false)
    }
  }, [activeTabId, activeTab?.id])

  // Update active tab when cart changes
  useEffect(() => {
    if (activeTab && cart !== activeTab.items) {
      setCustomerTabs(prev => prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, items: cart, lastUpdated: Date.now() }
          : tab
      ))
    }
  }, [cart])

  // Update active tab's customer info
  useEffect(() => {
    if (activeTab) {
      setCustomerTabs(prev => prev.map(tab =>
        tab.id === activeTabId
          ? {
              ...tab,
              customerName: customerName,
              customerId: selectedParty?.id,
              customerPhone: selectedParty?.phone,
              lastUpdated: Date.now()
            }
          : tab
      ))
    }
  }, [customerName, selectedParty])

  // Create new customer tab
  const createNewCustomerTab = useCallback(() => {
    if (customerTabs.length >= MAX_CUSTOMER_TABS) {
      toast.error(`Maximum ${MAX_CUSTOMER_TABS} customers allowed`)
      return null
    }

    const newTab: CustomerTab = {
      id: 'tab_' + Date.now() + '_' + (customerTabs.length + 1),
      tokenNumber: getNextTokenNumber(customerTabs),
      customerName: '',
      items: [],
      status: 'active',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }

    setCustomerTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)

    // Reset checkout state
    setShowQuickCheckout(false)
    setPaymentMethod('cash')
    setAmountTendered('')
    setTransactionId('')

    toast.success(`Customer #${newTab.tokenNumber} added`, { duration: 1500 })
    return newTab
  }, [customerTabs])

  // Switch to a customer tab
  const switchToTab = useCallback((tabId: string) => {
    const tab = customerTabs.find(t => t.id === tabId)
    if (tab && tab.status !== 'completed') {
      setActiveTabId(tabId)
      // Checkout state will be restored by the useEffect that syncs activeTab
    }
  }, [customerTabs])

  // Remove a customer tab
  const removeCustomerTab = useCallback((tabId: string) => {
    const tab = customerTabs.find(t => t.id === tabId)
    if (!tab) return

    // Don't allow removing if only one tab
    if (customerTabs.length <= 1) {
      // Just clear the tab instead
      setCustomerTabs([{
        id: 'tab_' + Date.now() + '_1',
        tokenNumber: getNextTokenNumber(customerTabs),
        customerName: '',
        items: [],
        status: 'active',
        createdAt: Date.now(),
        lastUpdated: Date.now()
      }])
      setCart([])
      setCustomerName('')
      setCustomerSearch('')
      setSelectedParty(null)
      return
    }

    // If removing active tab, switch to another
    if (tabId === activeTabId) {
      const currentIndex = customerTabs.findIndex(t => t.id === tabId)
      const nextTab = customerTabs[currentIndex + 1] || customerTabs[currentIndex - 1]
      if (nextTab) {
        setActiveTabId(nextTab.id)
      }
    }

    setCustomerTabs(prev => prev.filter(t => t.id !== tabId))
  }, [customerTabs, activeTabId])

  // Mark tab as processing (during checkout)
  const markTabAsProcessing = useCallback((tabId: string) => {
    setCustomerTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, status: 'processing' as const, lastUpdated: Date.now() } : tab
    ))
  }, [])

  // Mark tab as completed and auto-switch to next
  const completeTabAndSwitchToNext = useCallback((tabId: string) => {
    const currentIndex = customerTabs.findIndex(t => t.id === tabId)

    // Mark as completed
    setCustomerTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, status: 'completed' as const, items: [], lastUpdated: Date.now() } : tab
    ))

    // Find next active tab to switch to
    const nextActiveTab = customerTabs.find((t, i) =>
      i !== currentIndex && t.status === 'active' && t.items.length > 0
    )

    if (nextActiveTab) {
      // Switch to next customer with items
      setActiveTabId(nextActiveTab.id)
    } else {
      // Remove completed tab and create new one if needed
      setTimeout(() => {
        setCustomerTabs(prev => {
          const activeTabs = prev.filter(t => t.status !== 'completed')
          if (activeTabs.length === 0) {
            // Create fresh tab
            const newTab: CustomerTab = {
              id: 'tab_' + Date.now() + '_1',
              tokenNumber: getNextTokenNumber(prev),
              customerName: '',
              items: [],
              status: 'active',
              createdAt: Date.now(),
              lastUpdated: Date.now()
            }
            setActiveTabId(newTab.id)
            return [newTab]
          }
          return activeTabs
        })
      }, 500)
    }
  }, [customerTabs])

  // Count active tabs with items
  const activeTabsCount = useMemo(() => {
    return customerTabs.filter(t => t.status !== 'completed' && t.items.length > 0).length
  }, [customerTabs])

  // Load items, company settings, and parties
  useEffect(() => {
    const loadData = async () => {
      try {
        const [inventoryItems, settings, partiesData] = await Promise.all([
          getItems(),
          getCompanySettings(),
          getParties('customer')
        ])
        // Only show company's own items - no demo items
        setItems(inventoryItems.filter(item => item.isActive))
        setCompanySettings(settings)
        setParties(partiesData)
      } catch (error) {
        console.error('Error loading data:', error)
        setItems([]) // Empty array on error - no demo items
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Refresh parties list - can be called externally
  const refreshParties = async () => {
    try {
      const partiesData = await getParties('customer')
      setParties(partiesData)
    } catch (error) {
      console.error('Error refreshing parties:', error)
    }
  }

  // Expose refresh function for external use
  useEffect(() => {
    // Store refresh function for external access
    (window as any).__modernPOSRefreshParties = refreshParties
    return () => {
      delete (window as any).__modernPOSRefreshParties
    }
  }, [])

  // Filter parties based on search
  const filteredParties = useMemo(() => {
    if (!customerSearch || !customerSearch.trim()) return parties
    const search = customerSearch.toLowerCase()
    return parties.filter(party =>
      party.companyName?.toLowerCase().includes(search) ||
      party.displayName?.toLowerCase().includes(search) ||
      party.phone?.includes(search)
    )
  }, [parties, customerSearch])

  // Handle customer selection
  const handleSelectCustomer = (party: Party) => {
    setSelectedParty(party)
    setCustomerName(party.displayName || party.companyName)
    setCustomerSearch(party.displayName || party.companyName)
    setCustomerPhone(party.phone || '') // Set phone from party
    setShowCustomerDropdown(false)
  }

  // Handle customer search input change
  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value)
    setCustomerName(value) // Allow manual entry
    setSelectedParty(null) // Clear selected party when typing
    setShowCustomerDropdown(true)
  }

  // Handle Add New Customer
  const handleAddNewCustomer = () => {
    setShowCustomerDropdown(false)
    // Use external modal if callback provided, otherwise use internal modal
    if (onAddCustomer) {
      onAddCustomer()
    } else {
      setShowAddCustomerModal(true)
    }
  }

  // New customer form state
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)

  // Save new customer
  const handleSaveNewCustomer = async () => {
    if (!newCustomerName.trim()) return

    setSavingCustomer(true)
    try {
      const newParty = await createParty({
        type: 'customer',
        companyName: newCustomerName.trim(),
        displayName: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || '',
        email: '',
        contacts: [],
        billingAddress: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        },
        sameAsShipping: true
      })

      if (newParty) {
        // Add to parties list
        setParties(prev => [newParty, ...prev])
        // Select the new customer
        handleSelectCustomer(newParty)
        // Close modal and reset form
        setShowAddCustomerModal(false)
        setNewCustomerName('')
        setNewCustomerPhone('')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
    } finally {
      setSavingCustomer(false)
    }
  }

  // Get unique categories - merge from items AND settings
  const categories = useMemo(() => {
    const itemSettings = getItemSettings()
    const settingsCategories = itemSettings.productCategories || []
    const itemCategories = items.map(item => item.category || 'Uncategorized')
    // Merge both sources and remove duplicates
    const allCategories = [...new Set([...settingsCategories, ...itemCategories])]
    return ['All', ...allCategories.sort()]
  }, [items])

  // Get subcategories for a category
  const getSubcategories = useCallback((category: string) => {
    const categoryItems = items.filter(i => i.category === category)
    const subcategories = [...new Set(categoryItems.map(i => i.subcategory).filter(Boolean))]
    return subcategories as string[]
  }, [items])

  // Get brands for a category
  const getBrands = useCallback((category: string) => {
    const categoryItems = items.filter(i => i.category === category)
    const brands = [...new Set(categoryItems.map(i => i.brand).filter(Boolean))]
    return brands as string[]
  }, [items])

  // Get top items in a category (most stock = most popular assumption)
  const getTopItemsInCategory = useCallback((category: string, limit: number = 6) => {
    return items
      .filter(i => i.category === category && i.stock > 0)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, limit)
  }, [items])

  // Filter items based on search, category, and subcategory
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemCode?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || selectedCategory === 'Popular' || item.category === selectedCategory
      const matchesSubcategory = !selectedSubcategory || item.subcategory === selectedSubcategory || item.brand === selectedSubcategory
      return matchesSearch && matchesCategory && matchesSubcategory
    })
  }, [items, searchQuery, selectedCategory, selectedSubcategory])

  // Add item to cart - simple and fast for grocery
  // IMPORTANT: Properly handles tax-inclusive and tax-exclusive pricing
  const addToCart = (item: Item) => {
    // Check available stock before adding
    const existingCartItem = cart.find(c => c.itemId === item.id)
    const currentCartQty = existingCartItem ? existingCartItem.quantity : 0
    const availableStock = item.stock - currentCartQty

    // Don't add if no stock available
    if (availableStock <= 0) {
      return
    }

    const taxRate = (item.tax?.cgst || 0) + (item.tax?.sgst || 0)

    // Get tax settings to determine if price is inclusive or exclusive
    const taxSettings = getTaxSettings()
    const itemTaxMode = (item as any).taxMode || taxSettings.defaultTaxMode || 'exclusive'

    // Calculate base price (price without tax) based on tax mode
    // For inclusive: sellingPrice includes GST, so extract base price
    // For exclusive: sellingPrice is already the base price
    let basePrice: number
    if (itemTaxMode === 'inclusive' && taxRate > 0) {
      basePrice = item.sellingPrice / (1 + taxRate / 100)
      basePrice = Math.round(basePrice * 100) / 100
    } else {
      basePrice = item.sellingPrice
    }

    if (existingCartItem) {
      setCart(cart.map(c =>
        c.id === existingCartItem.id
          ? {
              ...c,
              quantity: c.quantity + 1,
              taxAmount: ((c.quantity + 1) * c.price * taxRate) / 100
            }
          : c
      ))
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        itemId: item.id,
        name: item.name,
        price: basePrice, // Use base price (without tax) for correct calculations
        quantity: 1,
        unit: item.unit,
        tax: taxRate,
        taxAmount: (basePrice * taxRate) / 100
      }
      setCart([...cart, newItem])
    }
  }

  // Update cart item quantity
  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === cartItemId) {
        const newQty = Math.max(0, item.quantity + delta)
        if (newQty === 0) return item // Will be filtered out below
        return {
          ...item,
          quantity: newQty,
          taxAmount: (newQty * item.price * item.tax) / 100
        }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  // Remove item from cart
  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter(item => item.id !== cartItemId))
  }

  // Get quantity of an item in cart (for real-time stock display)
  const getCartQuantity = (itemId: string): number => {
    const cartItem = cart.find(c => c.itemId === itemId)
    return cartItem ? cartItem.quantity : 0
  }

  // Get available stock (current stock minus cart quantity)
  const getAvailableStock = (item: Item): number => {
    const inCart = getCartQuantity(item.id)
    return Math.max(0, item.stock - inCart)
  }

  // Calculate totals with discount
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalTax = cart.reduce((sum, item) => sum + item.taxAmount, 0)
  const discountAmount = discountType === 'percent' 
    ? subtotal * (invoiceDiscount / 100)
    : Math.min(invoiceDiscount, subtotal) // Amount discount can't exceed subtotal
  const grandTotal = Math.max(0, subtotal + totalTax - discountAmount)

  // Handle checkout - show bill preview modal first
  const handleCheckout = () => {
    if (cart.length === 0) return
    // Show bill preview modal first
    setShowBillPreview(true)
  }

  // Proceed from bill preview to payment
  const handleProceedToPayment = () => {
    setShowBillPreview(false)
    setShowQuickCheckout(true)
    setAmountTendered('')
    setTransactionId('')
    setPaymentMethod('cash')
    // Save checkout state to current tab
    setCustomerTabs(prev => prev.map(tab =>
      tab.id === activeTabId
        ? { ...tab, isInCheckout: true, lastUpdated: Date.now() }
        : tab
    ))
  }

  // Print bill from preview and proceed to payment
  const handlePrintAndProceed = () => {
    // Generate and print receipt
    const settings = companySettings || {}
    const width = paperSize === '58mm' ? '48mm' : '72mm'
    const fontSize = paperSize === '58mm' ? '10px' : '12px'
    const titleSize = paperSize === '58mm' ? '13px' : '16px'
    const billNumber = `POS-${Date.now().toString().slice(-6)}`

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>POS Receipt</title>
        <style>
          @page { size: ${paperSize} auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', Courier, monospace; font-size: ${fontSize}; line-height: 1.3; width: ${width}; padding: 4px; margin: 0 auto; background: #fff; color: #000; }
          .receipt { width: 100%; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border: none; border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border: none; border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; padding: 1px 0; }
          .item-row { margin: 3px 0; border-bottom: 1px dotted #ccc; padding-bottom: 3px; }
          .item-name { font-weight: bold; font-size: ${paperSize === '58mm' ? '10px' : '11px'}; }
          .item-detail { font-size: ${paperSize === '58mm' ? '9px' : '10px'}; color: #333; }
          .shop-name { font-size: ${titleSize}; font-weight: bold; margin-bottom: 2px; letter-spacing: 1px; }
          .shop-address { font-size: ${paperSize === '58mm' ? '8px' : '10px'}; margin: 2px 0; }
          .gstin { font-size: ${paperSize === '58mm' ? '8px' : '9px'}; font-weight: bold; }
          .bill-title { font-size: ${paperSize === '58mm' ? '11px' : '13px'}; font-weight: bold; padding: 4px 0; letter-spacing: 2px; }
          .total-row { font-size: ${paperSize === '58mm' ? '12px' : '14px'}; font-weight: bold; padding: 4px 0; }
          .footer { font-size: ${paperSize === '58mm' ? '8px' : '10px'}; margin-top: 8px; }
          .thanks { font-size: ${paperSize === '58mm' ? '10px' : '12px'}; font-weight: bold; margin: 6px 0; }
          @media print { body { width: ${width} !important; padding: 2mm !important; } .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center">
            <div class="shop-name">${settings.companyName || 'YOUR SHOP'}</div>
            <div class="shop-address">${settings.address || ''}</div>
            <div class="shop-address">${settings.city || ''}${settings.state ? ', ' + settings.state : ''} ${settings.pincode || ''}</div>
            <div class="shop-address">Ph: ${settings.phone || 'N/A'}</div>
            ${settings.gstin ? `<div class="gstin">GSTIN: ${settings.gstin}</div>` : ''}
          </div>
          <hr class="double-divider">
          <div class="center bill-title">*** BILL ***</div>
          <hr class="divider">
          <div class="row"><span>Bill No: ${billNumber}</span></div>
          <div class="row"><span>Date: ${new Date().toLocaleDateString('en-IN')}</span><span>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
          ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
          <hr class="divider">
          <div class="row bold" style="font-size: ${paperSize === '58mm' ? '9px' : '10px'};"><span style="flex:2">ITEM</span><span style="flex:1;text-align:center">QTY</span><span style="flex:1;text-align:right">AMT</span></div>
          <hr class="divider">
          ${cart.map(item => `<div class="item-row"><div class="item-name">${item.name}</div><div class="row item-detail"><span>₹${item.price.toFixed(2)} x ${item.quantity}</span><span>₹${(item.price * item.quantity).toFixed(2)}</span></div></div>`).join('')}
          <hr class="double-divider">
          <div class="row"><span>Sub Total:</span><span>₹${subtotal.toFixed(2)}</span></div>
          <div class="row"><span>CGST:</span><span>₹${(totalTax / 2).toFixed(2)}</span></div>
          <div class="row"><span>SGST:</span><span>₹${(totalTax / 2).toFixed(2)}</span></div>
          <hr class="double-divider">
          <div class="row total-row"><span>GRAND TOTAL:</span><span>₹${grandTotal.toFixed(2)}</span></div>
          <hr class="divider">
          <div class="center footer">
            <div class="thanks">Thank You! Visit Again!</div>
            <div>--------------------------------</div>
            <div>Items: ${cart.length} | Qty: ${cart.reduce((s, i) => s + i.quantity, 0)}</div>
            <div style="margin-top:4px;font-size:${paperSize === '58mm' ? '7px' : '8px'};">Powered by Anna ERP</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.onafterprint = function() { window.close(); };
            window.print();
            setTimeout(function() { if (!window.closed) window.close(); }, 2000);
          }
        </script>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
    }

    // After print, proceed to payment
    handleProceedToPayment()
  }

  // Handle full checkout (wizard) - for advanced options
  const handleFullCheckout = () => {
    if (cart.length === 0) return
    onCheckout(cart, customerName)
  }

  // Calculate change for cash payments
  const changeAmount = useMemo(() => {
    const tendered = parseFloat(amountTendered) || 0
    return Math.max(0, tendered - grandTotal)
  }, [amountTendered, grandTotal])

  // Quick denomination buttons for cash
  const quickAmounts = useMemo(() => {
    // Smart Indian currency denomination logic
    // Indian notes: ₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹5, ₹2, ₹1
    const denominations = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1]

    // Calculate smart amounts based on total
    const smartAmounts: number[] = []

    // 1. Exact amount rounded to nearest ₹10
    const exactRounded = Math.ceil(grandTotal / 10) * 10
    if (exactRounded >= grandTotal) {
      smartAmounts.push(exactRounded)
    }

    // 2. Calculate nearest round numbers using common denominations
    // Find the best denomination combinations that customer would typically give
    const generateSmartAmounts = (total: number): number[] => {
      const amounts: number[] = []

      // Round up to nearest common denomination
      for (const denom of [500, 200, 100, 50, 20, 10]) {
        const roundedUp = Math.ceil(total / denom) * denom
        if (roundedUp >= total && roundedUp <= total * 2 && !amounts.includes(roundedUp)) {
          amounts.push(roundedUp)
          if (amounts.length >= 6) break
        }
      }

      // Add some convenient extra amounts
      if (total < 500) {
        // For small amounts, add common note combinations
        [100, 200, 500].forEach(amt => {
          if (amt >= total && !amounts.includes(amt)) {
            amounts.push(amt)
          }
        })
      }

      return amounts.sort((a, b) => a - b).slice(0, 6)
    }

    const generated = generateSmartAmounts(grandTotal)
    generated.forEach(amt => {
      if (!smartAmounts.includes(amt)) {
        smartAmounts.push(amt)
      }
    })

    // Return unique sorted amounts, maximum 6
    return [...new Set(smartAmounts)].sort((a, b) => a - b).slice(0, 6)
  }, [grandTotal])

  // Complete quick checkout - NON-BLOCKING (QueueBuster-style)
  // Immediately clears cart for next customer, saves in background, shows toast when done
  const handleQuickCheckoutComplete = async (options?: {
    shareVia?: 'whatsapp' | 'sms' | 'print' | 'none',
    showToast?: boolean
  }) => {
    if (cart.length === 0) return

    const shareVia = options?.shareVia || 'none'
    const showToast = options?.showToast !== false

    // Capture current tab ID for completing later
    const currentTabId = activeTabId
    const currentTokenNumber = activeTab?.tokenNumber || 0

    // Capture current data BEFORE clearing (for background processing)
    const capturedCart = [...cart]
    const capturedCustomerName = customerName || 'Walk-in Customer'
    const capturedCustomerPhone = customerPhone || selectedParty?.phone // Use manual phone or party phone
    const capturedGrandTotal = grandTotal
    const capturedSubtotal = subtotal
    const capturedTotalTax = totalTax
    const capturedPaymentMethod = paymentMethod
    const capturedChangeAmount = paymentMethod === 'cash' ? changeAmount : 0
    const capturedAmountTendered = paymentMethod === 'cash' ? (parseFloat(amountTendered) || grandTotal) : grandTotal
    const capturedTransactionId = transactionId
    const capturedSelectedParty = selectedParty
    const billNumber = `POS-${Date.now().toString().slice(-6)}`

    // Mark current tab as processing
    markTabAsProcessing(currentTabId)

    // IMMEDIATELY complete tab and switch to next customer (zero wait time!)
    completeTabAndSwitchToNext(currentTabId)

    // Reset checkout UI state
    setShowQuickCheckout(false)
    setShowBillComplete(false)
    setCompletedSale(null)
    setPaymentMethod('cash')
    setAmountTendered('')
    setTransactionId('')

    // Show instant feedback with customer token
    if (showToast) {
      toast.loading(`Customer #${currentTokenNumber} - Saving ₹${capturedGrandTotal.toFixed(0)}...`, { id: billNumber })
    }

    // Handle sharing IMMEDIATELY (before save completes)
    if (shareVia === 'whatsapp') {
      const itemsList = capturedCart
        .map((item, i) => `${i + 1}. ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toFixed(0)}`)
        .join('\n')
      const message = `🧾 *Bill from ${companySettings?.companyName || 'Our Store'}*\n\n` +
        `Bill: ${billNumber}\n` +
        `Customer: ${capturedCustomerName}\n` +
        `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
        `*Items:*\n${itemsList}\n\n` +
        `*Total: ₹${capturedGrandTotal.toFixed(2)}*\n` +
        `Payment: ${capturedPaymentMethod.toUpperCase()}\n\n` +
        `Thank you! 🙏`
      const phone = capturedCustomerPhone?.replace(/\D/g, '') || ''
      const url = phone
        ? `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
    } else if (shareVia === 'sms') {
      const message = `Bill ${billNumber} - Total: ₹${capturedGrandTotal.toFixed(2)}. Thank you for shopping with ${companySettings?.companyName || 'us'}!`
      const phone = capturedCustomerPhone || ''
      window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank')
    } else if (shareVia === 'print') {
      // Generate and print receipt with captured data
      const settings = companySettings || {}
      const width = paperSize === '58mm' ? '48mm' : '72mm'
      const fontSize = paperSize === '58mm' ? '10px' : '12px'
      const titleSize = paperSize === '58mm' ? '13px' : '16px'
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>POS Receipt</title>
          <style>
            @page { size: ${paperSize} auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', Courier, monospace; font-size: ${fontSize}; line-height: 1.3; width: ${width}; padding: 4px; margin: 0 auto; background: #fff; color: #000; }
            .receipt { width: 100%; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border: none; border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border: none; border-top: 2px solid #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; padding: 1px 0; }
            .item-row { margin: 3px 0; border-bottom: 1px dotted #ccc; padding-bottom: 3px; }
            .item-name { font-weight: bold; font-size: ${paperSize === '58mm' ? '10px' : '11px'}; }
            .item-detail { font-size: ${paperSize === '58mm' ? '9px' : '10px'}; color: #333; }
            .shop-name { font-size: ${titleSize}; font-weight: bold; margin-bottom: 2px; letter-spacing: 1px; }
            .shop-address { font-size: ${paperSize === '58mm' ? '8px' : '10px'}; margin: 2px 0; }
            .gstin { font-size: ${paperSize === '58mm' ? '8px' : '9px'}; font-weight: bold; }
            .bill-title { font-size: ${paperSize === '58mm' ? '11px' : '13px'}; font-weight: bold; padding: 4px 0; letter-spacing: 2px; }
            .total-row { font-size: ${paperSize === '58mm' ? '12px' : '14px'}; font-weight: bold; padding: 4px 0; }
            .footer { font-size: ${paperSize === '58mm' ? '8px' : '10px'}; margin-top: 8px; }
            .thanks { font-size: ${paperSize === '58mm' ? '10px' : '12px'}; font-weight: bold; margin: 6px 0; }
            @media print { body { width: ${width} !important; padding: 2mm !important; } .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="shop-name">${settings.companyName || 'YOUR SHOP'}</div>
              <div class="shop-address">${settings.address || ''}</div>
              <div class="shop-address">${settings.city || ''}${settings.state ? ', ' + settings.state : ''} ${settings.pincode || ''}</div>
              <div class="shop-address">Ph: ${settings.phone || 'N/A'}</div>
              ${settings.gstin ? `<div class="gstin">GSTIN: ${settings.gstin}</div>` : ''}
            </div>
            <hr class="double-divider">
            <div class="center bill-title">*** CASH BILL ***</div>
            <hr class="divider">
            <div class="row"><span>Bill No: ${billNumber}</span></div>
            <div class="row"><span>Date: ${new Date().toLocaleDateString('en-IN')}</span><span>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
            ${capturedCustomerName ? `<div>Customer: ${capturedCustomerName}</div>` : ''}
            <hr class="divider">
            <div class="row bold" style="font-size: ${paperSize === '58mm' ? '9px' : '10px'};"><span style="flex:2">ITEM</span><span style="flex:1;text-align:center">QTY</span><span style="flex:1;text-align:right">AMT</span></div>
            <hr class="divider">
            ${capturedCart.map(item => `<div class="item-row"><div class="item-name">${item.name}</div><div class="row item-detail"><span>₹${item.price.toFixed(2)} x ${item.quantity}</span><span>₹${(item.price * item.quantity).toFixed(2)}</span></div></div>`).join('')}
            <hr class="double-divider">
            <div class="row"><span>Sub Total:</span><span>₹${capturedSubtotal.toFixed(2)}</span></div>
            <div class="row"><span>CGST:</span><span>₹${(capturedTotalTax / 2).toFixed(2)}</span></div>
            <div class="row"><span>SGST:</span><span>₹${(capturedTotalTax / 2).toFixed(2)}</span></div>
            <hr class="double-divider">
            <div class="row total-row"><span>GRAND TOTAL:</span><span>₹${capturedGrandTotal.toFixed(2)}</span></div>
            <hr class="divider">
            <div class="center footer">
              <div class="thanks">Thank You! Visit Again!</div>
              <div>--------------------------------</div>
              <div>Items: ${capturedCart.length} | Qty: ${capturedCart.reduce((s, i) => s + i.quantity, 0)}</div>
              <div style="margin-top:4px;font-size:${paperSize === '58mm' ? '7px' : '8px'};">Powered by Anna ERP</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.onafterprint = function() { window.close(); };
              window.print();
              setTimeout(function() { if (!window.closed) window.close(); }, 2000);
            }
          </script>
        </body>
        </html>
      `
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(receiptHTML)
        printWindow.document.close()
      }
    }

    // BACKGROUND SAVE - Fire and forget with toast notification
    const checkoutData: QuickCheckoutData = {
      customer: {
        id: capturedSelectedParty?.id,
        name: capturedCustomerName,
        phone: capturedCustomerPhone,
        isWalkIn: !capturedSelectedParty
      },
      payment: {
        method: capturedPaymentMethod,
        amount: capturedGrandTotal,
        receivedAmount: capturedAmountTendered,
        changeAmount: capturedChangeAmount,
        transactionId: capturedTransactionId || undefined
      },
      discount: {
        type: 'amount',
        value: 0,
        discountAmount: 0
      },
      roundOff: 0,
      grandTotal: capturedGrandTotal,
      items: capturedCart.map(item => ({
        ...item,
        hsnCode: ''
      }))
    }

    // Save in background (non-blocking)
    try {
      if (onQuickCheckout) {
        await onQuickCheckout(checkoutData)
      } else {
        onCheckout(capturedCart, capturedCustomerName)
      }

      // Success toast with customer token
      if (showToast) {
        toast.success(`✓ Customer #${currentTokenNumber} completed - ₹${capturedGrandTotal.toFixed(0)}`, {
          id: billNumber,
          duration: 3000,
          description: `${billNumber} • ${capturedCustomerName}`
        })
      }
    } catch (error) {
      console.error('Background save error:', error)
      toast.error(`Failed to save bill ${billNumber}`, {
        id: billNumber,
        description: 'Please check your connection'
      })
    }
  }

  // Start new bill - clears everything and returns to cart view
  const handleNewBill = () => {
    setShowBillComplete(false)
    setCompletedSale(null)
    setCart([])
    setCustomerName('')
    setCustomerSearch('')
    setSelectedParty(null)
    setAmountTendered('')
    setTransactionId('')
  }

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    if (!completedSale) return

    const itemsList = completedSale.items
      .map((item, i) => `${i + 1}. ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toFixed(0)}`)
      .join('\n')

    const message = `🧾 *Bill from ${companySettings?.companyName || 'Our Store'}*\n\n` +
      `Bill No: ${completedSale.billNumber}\n` +
      `Customer: ${completedSale.customerName}\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Total: ₹${completedSale.grandTotal.toFixed(2)}*\n` +
      `Payment: ${completedSale.paymentMethod.toUpperCase()}\n\n` +
      `Thank you for shopping with us! 🙏`

    const phone = completedSale.customerPhone?.replace(/\D/g, '') || ''
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  // Copy UPI payment link
  const handleCopyUPILink = () => {
    if (!completedSale || !companySettings?.upiId) {
      alert('UPI ID not configured in settings')
      return
    }

    const upiLink = `upi://pay?pa=${companySettings.upiId}&pn=${encodeURIComponent(companySettings.companyName || 'Store')}&am=${completedSale.grandTotal}&cu=INR&tn=${encodeURIComponent(`Bill ${completedSale.billNumber}`)}`

    navigator.clipboard.writeText(upiLink).then(() => {
      alert('UPI link copied!')
    }).catch(() => {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = upiLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('UPI link copied!')
    })
  }

  // Share via SMS
  const handleShareSMS = () => {
    if (!completedSale) return

    const message = `Bill ${completedSale.billNumber} - Total: ₹${completedSale.grandTotal.toFixed(2)}. Thank you for shopping with ${companySettings?.companyName || 'us'}!`
    const phone = completedSale.customerPhone || ''

    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank')
  }

  // Preview Share handlers - work with current cart data WITHOUT completing the sale
  // These allow users to share/preview the bill before finalizing

  // Preview Share on WhatsApp (no sale completion)
  const handlePreviewShareWhatsApp = () => {
    if (cart.length === 0) return

    const itemsList = cart
      .map((item, i) => `${i + 1}. ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toFixed(0)}`)
      .join('\n')

    const message = `🧾 *Bill Preview from ${companySettings?.companyName || 'Our Store'}*\n\n` +
      `Customer: ${customerName || 'Walk-in'}\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Total: ₹${grandTotal.toFixed(2)}*\n` +
      `Payment: ${paymentMethod.toUpperCase()}\n\n` +
      `Thank you for shopping with us! 🙏`

    const phone = selectedParty?.phone?.replace(/\D/g, '') || ''
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  // Preview Share via SMS (no sale completion)
  const handlePreviewShareSMS = () => {
    if (cart.length === 0) return

    const message = `Bill Preview - Total: ₹${grandTotal.toFixed(2)}. Thank you for shopping with ${companySettings?.companyName || 'us'}!`
    const phone = selectedParty?.phone || ''

    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank')
  }

  // Preview Print (no sale completion) - prints current cart as preview (Full Page A4)
  const handlePreviewPrint = () => {
    if (cart.length === 0) return

    const settings = companySettings || {}
    const billNumber = `POS-${Date.now().toString().slice(-6)}`
    const currentDate = new Date()

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${billNumber}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: #fff;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 5px;
          }
          .company-details {
            font-size:  13px;
            color: #666;
            line-height: 1.6;
          }
          .gstin {
            font-weight: bold;
            color: #333;
            margin-top: 5px;
          }
          .invoice-title {
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            color: #10b981;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            background: #f0fdf4;
            padding: 15px;
            border-radius: 8px;
          }
          .info-block h4 {
            font-size: 12px;
            color: #10b981;
            text-transform: uppercase;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .info-block p {
            font-size: 14px;
            margin: 3px 0;
          }
          .info-block .value {
            font-weight: 600;
            color: #111;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: #10b981;
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
          }
          th:last-child, td:last-child { text-align: right; }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          tr:nth-child(even) { background: #f9fafb; }
          .totals {
            margin-top: 20px;
            margin-left: auto;
            width: 300px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .totals-row.grand-total {
            font-size: 18px;
            font-weight: bold;
            color: #10b981;
            border-bottom: none;
            border-top: 2px solid #10b981;
            padding-top: 12px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .footer .thanks {
            font-size: 16px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
          }
          .barcode {
            margin: 10px 0;
            text-align: center;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-name">${settings.companyName || 'Your Business'}</div>
            <div class="company-details">
              ${settings.address ? settings.address + '<br>' : ''}
              ${settings.city || ''}${settings.state ? ', ' + settings.state : ''} ${settings.pincode || ''}
              ${settings.phone ? '<br>Phone: ' + settings.phone : ''}
              ${settings.email ? ' | Email: ' + settings.email : ''}
            </div>
            ${settings.gstin ? '<div class="gstin">GSTIN: ' + settings.gstin + '</div>' : ''}
          </div>

          <div class="invoice-title">Tax Invoice</div>

          <div class="info-section">
            <div class="info-block">
              <h4>Bill To</h4>
              <p class="value">${customerName || 'Walk-in Customer'}</p>
            </div>
            <div class="info-block" style="text-align: right;">
              <h4>Invoice Details</h4>
              <p>Invoice No: <span class="value">${billNumber}</span></p>
              <p>Date: <span class="value">${currentDate.toLocaleDateString('en-IN')}</span></p>
              <p>Time: <span class="value">${currentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Item</th>
                <th style="width: 80px;">Qty</th>
                <th style="width: 100px;">Rate</th>
                <th style="width: 80px;">Tax</th>
                <th style="width: 110px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${cart.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price.toLocaleString('en-IN')}</td>
                  <td>${item.tax || 0}%</td>
                  <td>₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row">
              <span>CGST:</span>
              <span>₹${(totalTax / 2).toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row">
              <span>SGST:</span>
              <span>₹${(totalTax / 2).toLocaleString('en-IN')}</span>
            </div>
            ${discountAmount > 0 ? `
              <div class="totals-row" style="color: #16a34a;">
                <span>Discount (${invoiceDiscount}%):</span>
                <span>-₹${discountAmount.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div class="totals-row grand-total">
              <span>Grand Total:</span>
              <span>₹${grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="footer">
            <div class="thanks">Thank You for Your Business!</div>
            <p>Items: ${cart.length} | Total Qty: ${cart.reduce((s, i) => s + i.quantity, 0)}</p>
            <div style="font-size:10px;">Powered by Anna ERP</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(printHTML)
      printWindow.document.close()
    }
  }

  // Cancel quick checkout
  const handleQuickCheckoutCancel = () => {
    setShowQuickCheckout(false)
    setAmountTendered('')
    setTransactionId('')
    // Clear checkout state from current tab
    setCustomerTabs(prev => prev.map(tab =>
      tab.id === activeTabId
        ? { ...tab, isInCheckout: false, lastUpdated: Date.now() }
        : tab
    ))
  }

  // Generate thermal receipt HTML
  const generateReceiptHTML = (forPreview: boolean = false) => {
    const settings = companySettings || {}
    const width = paperSize === '58mm' ? '48mm' : '72mm'
    const fontSize = paperSize === '58mm' ? '10px' : '12px'
    const titleSize = paperSize === '58mm' ? '13px' : '16px'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>POS Receipt</title>
        <style>
          @page {
            size: ${paperSize} auto;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${fontSize};
            line-height: 1.3;
            width: ${width};
            padding: 4px;
            margin: 0 auto;
            background: #fff;
            color: #000;
          }
          .receipt {
            width: 100%;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider {
            border: none;
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border: none;
            border-top: 2px solid #000;
            margin: 6px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 1px 0;
          }
          .item-row {
            margin: 3px 0;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 3px;
          }
          .item-name {
            font-weight: bold;
            font-size: ${paperSize === '58mm' ? '10px' : '11px'};
          }
          .item-detail {
            font-size: ${paperSize === '58mm' ? '9px' : '10px'};
            color: #333;
          }
          .shop-name {
            font-size: ${titleSize};
            font-weight: bold;
            margin-bottom: 2px;
            letter-spacing: 1px;
          }
          .shop-address {
            font-size: ${paperSize === '58mm' ? '8px' : '10px'};
            margin: 2px 0;
          }
          .gstin {
            font-size: ${paperSize === '58mm' ? '8px' : '9px'};
            font-weight: bold;
          }
          .bill-title {
            font-size: ${paperSize === '58mm' ? '11px' : '13px'};
            font-weight: bold;
            padding: 4px 0;
            letter-spacing: 2px;
          }
          .total-row {
            font-size: ${paperSize === '58mm' ? '12px' : '14px'};
            font-weight: bold;
            padding: 4px 0;
          }
          .footer {
            font-size: ${paperSize === '58mm' ? '8px' : '10px'};
            margin-top: 8px;
          }
          .thanks {
            font-size: ${paperSize === '58mm' ? '10px' : '12px'};
            font-weight: bold;
            margin: 6px 0;
          }
          @media print {
            body {
              width: ${width} !important;
              padding: 2mm !important;
            }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- Header -->
          <div class="center">
            <div class="shop-name">${settings.companyName || 'YOUR SHOP'}</div>
            <div class="shop-address">${settings.address || ''}</div>
            <div class="shop-address">${settings.city || ''}${settings.state ? ', ' + settings.state : ''} ${settings.pincode || ''}</div>
            <div class="shop-address">Ph: ${settings.phone || 'N/A'}</div>
            ${settings.gstin ? `<div class="gstin">GSTIN: ${settings.gstin}</div>` : ''}
          </div>

          <hr class="double-divider">

          <div class="center bill-title">*** CASH BILL ***</div>

          <hr class="divider">

          <!-- Bill Info -->
          <div class="row">
            <span>Bill No: POS-${Date.now().toString().slice(-6)}</span>
          </div>
          <div class="row">
            <span>Date: ${new Date().toLocaleDateString('en-IN')}</span>
            <span>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          ${customerName ? `<div>Customer: ${customerName}</div>` : ''}

          <hr class="divider">

          <!-- Column Headers -->
          <div class="row bold" style="font-size: ${paperSize === '58mm' ? '9px' : '10px'};">
            <span style="flex:2">ITEM</span>
            <span style="flex:1;text-align:center">QTY</span>
            <span style="flex:1;text-align:right">AMT</span>
          </div>

          <hr class="divider">

          <!-- Items -->
          ${cart.map(item => `
            <div class="item-row">
              <div class="item-name">${item.name}</div>
              <div class="row item-detail">
                <span>₹${item.price.toFixed(2)} x ${item.quantity}</span>
                <span>₹${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}

          <hr class="double-divider">

          <!-- Totals -->
          <div class="row">
            <span>Sub Total:</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>CGST:</span>
            <span>₹${(totalTax / 2).toFixed(2)}</span>
          </div>
          <div class="row">
            <span>SGST:</span>
            <span>₹${(totalTax / 2).toFixed(2)}</span>
          </div>

          <hr class="double-divider">

          <div class="row total-row">
            <span>GRAND TOTAL:</span>
            <span>₹${grandTotal.toFixed(2)}</span>
          </div>

          <hr class="divider">

          <!-- Footer -->
          <div class="center footer">
            <div class="thanks">Thank You! Visit Again!</div>
            <div>--------------------------------</div>
            <div>Items: ${cart.length} | Qty: ${cart.reduce((s, i) => s + i.quantity, 0)}</div>
            <div style="margin-top:4px;font-size:${paperSize === '58mm' ? '7px' : '8px'};">
              Powered by Anna ERP
            </div>
          </div>
        </div>

        ${!forPreview ? `
        <script>
          window.onload = function() {
            window.onafterprint = function() { window.close(); };
            window.print();
            // Fallback for browsers that don't support onafterprint
            setTimeout(function() { if (!window.closed) window.close(); }, 2000);
          }
        </script>
        ` : ''}

        <!-- Barcode Scanner Script - Only for preview, not actual print -->
        ${forPreview ? `
        <script>
          window.onload = function() {
            // Simulate barcode scan after a delay (for demo)
            setTimeout(function() {
              const demoBarcode = 'ITEM1234';
              const itemName = 'Demo Item';
              const itemPrice = 100;
              const itemQuantity = 1;

              // Add demo item to cart
              const cartItem = {
                id: 'demo-item',
                itemId: demoBarcode,
                name: itemName,
                price: itemPrice,
                quantity: itemQuantity,
                unit: 'PCS',
                tax: 0,
                taxAmount: 0
              };

              window.openerModernPOS.addToCart(cartItem);

              // Close preview window
              window.close();
            }, 2000);
          }
        </script>
        ` : ''}
      </body>
      </html>
    `
  }

  // Print thermal receipt
  const printReceipt = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(generateReceiptHTML(false))
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/30 overflow-hidden">
      {/* Left Side - Items Grid */}
      <div className="flex-1 flex flex-col p-2 md:p-4 pb-20 md:pb-4 overflow-y-auto">
        {/* Header with Search - Premium Glass Effect */}
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          {/* Search */}
          <div className="flex-1 relative group">
            <MagnifyingGlass
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 z-10"
            />
            <input
              type="text"
              placeholder={t.posPage.searchItems}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-12 md:pr-14 py-2.5 md:py-3 bg-white/80 backdrop-blur-sm text-sm md:text-base border-2 border-white/50 rounded-2xl outline-none shadow-lg shadow-emerald-500/5 focus:border-emerald-400 focus:shadow-emerald-500/10 transition-all duration-300 dark:text-white dark:bg-slate-800/80"
              autoFocus
            />
            {/* Barcode scanner icon button */}
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all duration-300 hover:scale-105"
              onClick={() => setShowBarcodeScanner(true)}
              title="Scan Barcode"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M4 5a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H6v2a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Zm14-1a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0V6h1a1 1 0 1 0 0-2h-2ZM5 17a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 1 0 0-2H6v-2a1 1 0 1 0-2 0Zm14 1a1 1 0 0 1-1 1v1h-1a1 1 0 1 0 0 2h2a1 1 0 0 0 1-1v-2a1 1 0 1 0-2 0ZM8 6a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H9A1 1 0 0 1 8 6Zm3 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1Zm4-1a1 1 0 0 0-1 1v1a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1ZM8 18a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Zm3 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1Zm4-1a1 1 0 0 0-1 1v1a1 1 0 1 0 2 0v-1a1 1 0 0 0-1-1Z"/></svg>
            </button>
            {/* Barcode Scanner Modal */}
            <BarcodeScanner
              isOpen={showBarcodeScanner}
              onClose={() => setShowBarcodeScanner(false)}
              onScan={(barcode) => {
                setSearchQuery(barcode)
                setShowBarcodeScanner(false)
              }}
              title="Scan Item Barcode"
            />
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="h-9 md:h-10 px-3 md:px-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold flex items-center gap-1.5 md:gap-2 shadow-md hover:shadow-lg hover:from-red-600 hover:to-rose-600 transition-all text-sm md:text-base"
            >
              <X size={16} weight="bold" className="md:hidden" />
              <X size={18} weight="bold" className="hidden md:block" />
              <span className="hidden md:inline">{t.posPage.back}</span>
            </button>
          )}
        </div>

        {/* Mobile Customer Tabs Bar */}
        <div className="md:hidden mb-2 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
          <div className="flex items-center overflow-x-auto scrollbar-hide">
            {/* Customer Tabs */}
            {customerTabs.filter(tab => tab.status !== 'completed').map((tab) => (
              <div
                key={tab.id}
                onClick={() => switchToTab(tab.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-2 cursor-pointer border-r border-gray-200 min-w-[70px] transition-all relative group",
                  tab.id === activeTabId
                    ? "bg-emerald-50 text-emerald-700 shadow-sm"
                    : "text-gray-600 active:bg-gray-50",
                  tab.status === 'processing' && "bg-amber-50"
                )}
              >
                {/* Status indicator dot */}
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  tab.status === 'processing' ? "bg-amber-500 animate-pulse" :
                  tab.items.length > 0 ? "bg-emerald-500" : "bg-gray-300"
                )} />

                {/* Tab content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[10px]">#{tab.tokenNumber}</span>
                    {tab.items.length > 0 && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded">
                        {tab.items.reduce((sum, i) => sum + i.quantity, 0)}
                      </span>
                    )}
                  </div>
                  {tab.customerName ? (
                    <p className="text-[9px] truncate max-w-[50px]">{tab.customerName}</p>
                  ) : (
                    <p className="text-[9px] text-gray-400 italic">Walk-in</p>
                  )}
                </div>

                {/* Close button (show if more than 1 tab) */}
                {customerTabs.filter(t => t.status !== 'completed').length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCustomerTab(tab.id)
                    }}
                    className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <X size={10} weight="bold" />
                  </button>
                )}
              </div>
            ))}

            {/* Add New Customer Tab Button */}
            <button
              onClick={createNewCustomerTab}
              disabled={customerTabs.length >= MAX_CUSTOMER_TABS}
              className={cn(
                "flex items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-all flex-shrink-0",
                customerTabs.length >= MAX_CUSTOMER_TABS
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-emerald-600 active:bg-emerald-50"
              )}
              title={customerTabs.length >= MAX_CUSTOMER_TABS ? `Max ${MAX_CUSTOMER_TABS} customers` : "Add new customer"}
            >
              <Plus size={16} weight="bold" />
              <span className="text-xs font-semibold">New</span>
            </button>
          </div>
        </div>

        {/* Categories - Horizontal scroll on mobile with large icons, wrap on desktop */}
        <div className="flex-shrink-0 mb-3 md:mb-4">
          {/* Mobile: Horizontal scroll with large icons above text */}
          <div className="md:hidden flex gap-3 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'thin' }}>
            <button
              onClick={() => {
                setSelectedCategory('All')
                setSelectedSubcategory(null)
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 min-w-[70px] transition-all flex-shrink-0",
                selectedCategory === 'All' && "scale-105"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all",
                selectedCategory === 'All'
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white"
                  : "bg-white text-gray-600"
              )}>
                <Squares size={28} weight="fill" />
              </div>
              <span className={cn(
                "text-xs font-semibold text-center",
                selectedCategory === 'All' ? "text-emerald-600" : "text-gray-600"
              )}>All</span>
            </button>
            {categories.filter(c => c !== 'All').map(category => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category)
                  setSelectedSubcategory(null)
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 min-w-[70px] transition-all flex-shrink-0",
                  selectedCategory === category && "scale-105"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all",
                  selectedCategory === category
                    ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white"
                    : "bg-white text-gray-600"
                )}>
                  <span className="[&>svg]:w-7 [&>svg]:h-7">{categoryIcons[category] || categoryIcons['default']}</span>
                </div>
                <span className={cn(
                  "text-xs font-semibold text-center leading-tight max-w-[70px] line-clamp-2",
                  selectedCategory === category ? "text-emerald-600" : "text-gray-600"
                )}>{category}</span>
              </button>
            ))}
          </div>

          {/* Desktop: Wrap with hover dropdowns */}
          <div className="hidden md:flex flex-wrap gap-1.5 pb-1 relative z-50" style={{ overflow: 'visible' }}>
            {/* All Category */}
            <button
              onClick={() => {
                setSelectedCategory('All')
                setSelectedSubcategory(null)
                setHoveredCategory(null)
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all",
                selectedCategory === 'All'
                  ? "bg-emerald-500 text-white shadow-md"
                  : "neu-btn text-gray-600"
              )}
            >
              <Squares size={14} weight="fill" />
              All
            </button>
            
            {/* Popular */}
            <button
              onClick={() => {
                setSelectedCategory('Popular')
                setSelectedSubcategory(null)
                setHoveredCategory(null)
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all",
                selectedCategory === 'Popular'
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
              )}
            >
              <Fire size={14} weight="fill" />
              Hot
            </button>

            {/* Other Categories - With Hover Dropdown */}
            {categories.filter(c => c !== 'All').map(category => {
              const categoryItems = items.filter(i => i.category === category)
              const topItems = categoryItems.filter(i => i.stock > 0).slice(0, 6)
              const subcategories = [...new Set(categoryItems.map(i => i.subcategory).filter(Boolean))] as string[]
              const brands = [...new Set(categoryItems.map(i => i.brand).filter(Boolean))] as string[]
              
              return (
                <div key={category} className="relative group/cat">
                  <button
                    onClick={() => {
                      setSelectedCategory(category)
                      setSelectedSubcategory(null)
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all",
                      selectedCategory === category
                        ? "bg-emerald-500 text-white shadow-md"
                        : "neu-btn text-gray-600"
                    )}
                  >
                    <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{categoryIcons[category] || categoryIcons['default']}</span>
                    {category}
                    <CaretDown size={10} className="ml-0.5 opacity-50" />
                  </button>
                  
                  {/* CSS Hover Dropdown */}
                  <div className="absolute left-0 top-full pt-1 hidden group-hover/cat:block z-[9999]">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[300px] p-3">
                      {/* Category Header */}
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500">{categoryIcons[category] || categoryIcons['default']}</span>
                          <span className="font-bold text-gray-800 text-sm">{category}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{categoryItems.length} items</span>
                      </div>

                      {/* Quick Add Items */}
                      {topItems.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] font-semibold text-orange-500 uppercase mb-1.5 flex items-center gap-1">
                            <Fire size={10} weight="fill" /> Quick Add
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            {topItems.map(item => (
                              <button
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToCart(item)
                                }}
                                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-1 text-left"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-medium text-gray-700 truncate">{item.name}</p>
                                  <p className="text-[10px] font-bold text-emerald-600">₹{item.sellingPrice}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Subcategories */}
                      {subcategories.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Subcategories</p>
                          <div className="flex flex-wrap gap-1">
                            {subcategories.slice(0, 6).map(sub => (
                              <button
                                key={sub}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCategory(category)
                                  setSelectedSubcategory(sub)
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700"
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Brands */}
                      {brands.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Brands</p>
                          <div className="flex flex-wrap gap-1">
                            {brands.slice(0, 6).map(brand => (
                              <button
                                key={brand}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCategory(category)
                                  setSelectedSubcategory(brand)
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                              >
                                {brand}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* View All */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCategory(category)
                          setSelectedSubcategory(null)
                        }}
                        className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg"
                      >
                        View All {category} →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Active Subcategory/Brand Filter Chip */}
          {selectedSubcategory && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-gray-400">Filtered by:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                {selectedSubcategory}
                <button 
                  onClick={() => setSelectedSubcategory(null)}
                  className="hover:bg-emerald-200 rounded-full p-0.5"
                >
                  <X size={10} weight="bold" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Items Grid - Original compact mobile layout */}
        <div>
          <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1.5 md:gap-3 auto-rows-min">
            <AnimatePresence>
              {(selectedCategory === 'Popular' 
                ? items.filter(item => item.stock > 0).slice(0, 50)
                : filteredItems
              ).map(item => {
                const availableStock = getAvailableStock(item)
                const inCart = getCartQuantity(item.id)
                return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "bg-white cursor-pointer border transition-all group relative",
                    "rounded-lg md:rounded-xl p-1.5 md:p-3",
                    "border-gray-100 hover:border-emerald-300 hover:shadow-lg",
                    inCart > 0 && "md:border-emerald-200"
                  )}
                >
                  {/* Cart quantity badge - Mobile only */}
                  {inCart > 0 && (
                    <div className="md:hidden absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md z-10">
                      {inCart}
                    </div>
                  )}

                  {/* Desktop: Original layout with icon */}
                  <div className="hidden md:flex md:items-start md:gap-2">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:from-emerald-100 group-hover:to-teal-100 transition-all">
                      {getCategoryIcon(item.category)}
                    </div>
                    <h3 className="flex-1 font-semibold text-gray-800 text-sm leading-tight group-hover:text-emerald-600 transition-colors line-clamp-2 min-h-[2.25rem]">
                      {item.name}
                    </h3>
                  </div>

                  {/* Mobile: Compact card */}
                  <div className="md:hidden">
                    <h3 className="font-semibold text-gray-800 text-[11px] leading-snug line-clamp-2 min-h-[2rem]">
                      {item.name}
                    </h3>
                  </div>

                  {/* Price - Desktop shows unit, mobile compact */}
                  <div className="mt-1 md:mt-2 flex items-baseline gap-0.5 md:gap-1">
                    <span className="font-bold text-emerald-600 text-sm md:text-xl">
                      ₹{item.sellingPrice}
                    </span>
                    <span className="hidden md:inline text-xs text-gray-400">
                      /{item.unit || 'pc'}
                    </span>
                  </div>

                  {/* Stock & Add button */}
                  <div className="mt-1 md:mt-2 flex items-center justify-between">
                    {/* Stock badge - Mobile shows number only, Desktop shows with unit */}
                    <span className={cn(
                      "text-[9px] md:text-xs font-medium px-1 md:px-2 py-0.5 md:py-1 rounded-md",
                      availableStock <= 0
                        ? "bg-red-100 text-red-700 md:border md:border-red-300"
                        : availableStock <= item.minStock
                        ? "bg-red-50 text-red-600 md:border md:border-red-200"
                        : availableStock <= item.minStock * 2
                        ? "bg-amber-50 text-amber-600 md:border md:border-amber-200"
                        : "bg-emerald-50 text-emerald-600 md:border md:border-emerald-200"
                    )}>
                      <span className="md:hidden">{availableStock}</span>
                      <span className="hidden md:inline">
                        {availableStock} {item.unit || 'pcs'}
                        {inCart > 0 && (
                          <span className="ml-1 text-purple-600">(-{inCart})</span>
                        )}
                      </span>
                    </span>

                    {/* Add button - Always visible on mobile, hover on desktop */}
                    <div className={cn(
                      "w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all md:opacity-0 md:group-hover:opacity-100 md:shadow-md",
                      availableStock <= 0
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-emerald-500"
                    )}>
                      <Plus size={12} className="text-white md:hidden" weight="bold" />
                      <Plus size={16} className="text-white hidden md:block" weight="bold" />
                    </div>
                  </div>
                </motion.div>
              )})}
            </AnimatePresence>
          </div>

          {filteredItems.length === 0 && selectedCategory !== 'Popular' && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 px-4">
              <Package size={40} className="mb-2" />
              {items.length === 0 ? (
                <>
                  <p className="font-medium text-sm text-gray-500">No inventory items yet</p>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Go to Inventory to add your products and services
                  </p>
                </>
              ) : (
                <p className="font-medium text-sm">No items found for this search</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Cart / Bill - Wider for typical POS (Hidden on mobile, drawer used instead) */}
      <div className="hidden md:flex w-96 xl:w-[420px] h-full bg-white border-l border-gray-200 flex-col shadow-xl overflow-hidden flex-shrink-0">
        {/* ========== MULTI-CUSTOMER TABS BAR ========== */}
        <div className="bg-gray-100 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center overflow-x-auto scrollbar-hide">
            {/* Customer Tabs */}
            {customerTabs.filter(tab => tab.status !== 'completed').map((tab) => (
              <div
                key={tab.id}
                onClick={() => switchToTab(tab.id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 cursor-pointer border-r border-gray-200 min-w-[70px] transition-all relative group",
                  tab.id === activeTabId
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "hover:bg-gray-50 text-gray-600",
                  tab.status === 'processing' && "bg-amber-50"
                )}
              >
                {/* Status indicator dot */}
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  tab.status === 'processing' ? "bg-amber-500 animate-pulse" :
                  tab.items.length > 0 ? "bg-emerald-500" : "bg-gray-300"
                )} />

                {/* Tab content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[10px]">#{tab.tokenNumber}</span>
                    {tab.items.length > 0 && (
                      <span className="text-[9px] bg-gray-200 px-1 rounded">
                        {tab.items.reduce((sum, i) => sum + i.quantity, 0)}
                      </span>
                    )}
                  </div>
                  {tab.customerName ? (
                    <p className="text-[9px] truncate max-w-[50px]">{tab.customerName}</p>
                  ) : (
                    <p className="text-[9px] text-gray-400 italic">{t.posPage.walkIn}</p>
                  )}
                </div>

                {/* Close button (show on hover, only if not the only tab) */}
                {customerTabs.filter(t => t.status !== 'completed').length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCustomerTab(tab.id)
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X size={10} weight="bold" />
                  </button>
                )}
              </div>
            ))}

            {/* Add New Customer Tab Button */}
            <button
              onClick={createNewCustomerTab}
              disabled={customerTabs.length >= MAX_CUSTOMER_TABS}
              className={cn(
                "flex items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-all",
                customerTabs.length >= MAX_CUSTOMER_TABS
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              )}
              title={customerTabs.length >= MAX_CUSTOMER_TABS ? `Max ${MAX_CUSTOMER_TABS} customers` : "Add new customer"}
            >
              <Plus size={16} weight="bold" />
              <span className="text-xs font-semibold">{t.posPage.new}</span>
            </button>
          </div>

          {/* Active tabs count indicator */}
          {activeTabsCount > 1 && (
            <div className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] flex items-center gap-1.5 border-t border-amber-100">
              <Lightning size={12} weight="fill" className="text-amber-500" />
              <span>{activeTabsCount} customers in queue</span>
            </div>
          )}
        </div>

        {/* Cart Header - Compact with current customer info */}
        <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              <ShoppingCart size={20} weight="fill" />
              {t.posPage.customer} #{activeTab?.tokenNumber || 1}
              {/* Processing indicator */}
              {activeTab?.status === 'processing' && (
                <span className="bg-amber-400 text-amber-900 text-[10px] px-1.5 py-0.5 rounded animate-pulse">
                  Processing...
                </span>
              )}
            </h2>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} {t.posPage.items}
            </span>
          </div>

          {/* Customer Name - Searchable Dropdown */}
          <div className="relative" ref={customerDropdownRef}>
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="text"
              placeholder={t.posPage.searchCustomer}
              value={customerSearch}
              onChange={(e) => handleCustomerSearchChange(e.target.value)}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full pl-9 pr-10 py-2 rounded-lg bg-white text-gray-800 placeholder-gray-400 neu-input border-0 focus:outline-none transition-all text-sm"
            />
            <CaretDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
            />

            {/* Customer Dropdown */}
            <AnimatePresence>
              {showCustomerDropdown && (
                <>
                  <div className="fixed inset-0 z-[99]" onClick={() => setShowCustomerDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-[100]"
                  >
                  {/* Add New Customer Option */}
                  <button
                    onClick={handleAddNewCustomer}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-emerald-50 border-b border-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <UserPlus size={16} className="text-emerald-600" weight="bold" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-600">+ Add New Customer</p>
                      <p className="text-xs text-gray-400">Create a new customer entry</p>
                    </div>
                  </button>

                  {/* Customer List */}
                  {filteredParties.length > 0 ? (
                    filteredParties.slice(0, 10).map((party) => (
                      <button
                        key={party.id}
                        onClick={() => handleSelectCustomer(party)}
                        className={cn(
                          "w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors",
                          selectedParty?.id === party.id && "bg-emerald-50"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User size={16} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {party.displayName || party.companyName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {party.phone || 'No phone'}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-center text-gray-400 text-sm">
                      {customerSearch ? 'No customers found' : 'Start typing to search...'}
                    </div>
                  )}

                  {filteredParties.length > 10 && (
                    <div className="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-100">
                      Showing 10 of {filteredParties.length} results
                    </div>
                  )}
                </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Cart Items, Inline Checkout, or Add Customer - All Inline, No Modals */}
        {showAddCustomerModal ? (
          /* Inline Add Customer Panel - No Modal */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2.5 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus size={18} weight="bold" />
                Add New Customer
              </h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X size={14} className="text-white" weight="bold" />
              </button>
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Enter phone number (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewCustomer}
                disabled={!newCustomerName.trim() || savingCustomer}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                {savingCustomer ? (
                  <>
                    <ArrowsClockwise size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} weight="bold" />
                    Save Customer
                  </>
                )}
              </button>
            </div>
          </div>
        ) : showBillComplete && completedSale ? (
          /* Bill Complete - Sharing Options Panel - Inline, No Modal */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-4 text-center flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={28} weight="fill" className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Sale Complete!</h3>
              <p className="text-white/80 text-xs mt-1">Bill #{completedSale.billNumber}</p>
            </div>

            {/* Sale Summary */}
            <div className="p-3 bg-emerald-50 border-b border-emerald-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Customer</span>
                <span className="text-sm font-semibold text-gray-800">{completedSale.customerName}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Items</span>
                <span className="text-sm font-semibold text-gray-800">{completedSale.items.reduce((s, i) => s + i.quantity, 0)} items</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Payment</span>
                <span className="text-sm font-semibold text-gray-800 capitalize">{completedSale.paymentMethod}</span>
              </div>
              {completedSale.changeAmount > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-amber-600">Change</span>
                  <span className="text-sm font-bold text-amber-600">₹{completedSale.changeAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-emerald-200 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-800">Total Paid</span>
                <span className="text-xl font-bold text-emerald-600">₹{completedSale.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Sharing Options - All Inline */}
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Share Bill</p>

              {/* WhatsApp - Primary Action */}
              <button
                onClick={handleShareWhatsApp}
                className="w-full flex items-center gap-3 p-3 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl mb-2 transition-all shadow-lg shadow-green-500/20"
              >
                <WhatsappLogo size={24} weight="fill" />
                <div className="text-left">
                  <p className="font-semibold text-sm">WhatsApp</p>
                  <p className="text-[10px] text-white/80">
                    {completedSale.customerPhone ? `Send to ${completedSale.customerPhone}` : 'Share bill via WhatsApp'}
                  </p>
                </div>
              </button>

              {/* SMS */}
              <button
                onClick={handleShareSMS}
                className="w-full flex items-center gap-3 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl mb-2 transition-all"
              >
                <ChatCircle size={24} weight="fill" />
                <div className="text-left">
                  <p className="font-semibold text-sm">SMS</p>
                  <p className="text-[10px] text-white/80">Send bill summary via SMS</p>
                </div>
              </button>

              {/* UPI Payment Link */}
              <button
                onClick={handleCopyUPILink}
                className="w-full flex items-center gap-3 p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl mb-2 transition-all"
              >
                <LinkIcon size={24} weight="bold" />
                <div className="text-left">
                  <p className="font-semibold text-sm">UPI Payment Link</p>
                  <p className="text-[10px] text-white/80">Copy payment link for pending amount</p>
                </div>
              </button>

              {/* Print Receipt */}
              <button
                onClick={printReceipt}
                className="w-full flex items-center gap-3 p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl mb-2 transition-all"
              >
                <Printer size={24} weight="bold" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Print Receipt</p>
                  <p className="text-[10px] text-gray-500">Print thermal receipt ({paperSize})</p>
                </div>
              </button>

              {/* Download / Save */}
              <button
                onClick={() => {
                  // Generate PDF-like download using print
                  const printWindow = window.open('', '_blank')
                  if (printWindow) {
                    printWindow.document.write(generateReceiptHTML(true))
                    printWindow.document.close()
                  }
                }}
                className="w-full flex items-center gap-3 p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all"
              >
                <DownloadSimple size={24} weight="bold" />
                <div className="text-left">
                  <p className="font-semibold text-sm">View / Download</p>
                  <p className="text-[10px] text-gray-500">Open bill in new tab</p>
                </div>
              </button>
            </div>

            {/* New Bill Button - Fixed at Bottom */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={handleNewBill}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowClockwise size={18} weight="bold" />
                Start New Bill
              </button>
            </div>
          </div>
        ) : !showQuickCheckout ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Cart Items - Compact for more items - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
              <AnimatePresence>
                {cart.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-gray-400"
                  >
                    <ShoppingCart size={40} className="mb-2 text-gray-200" />
                    <p className="text-sm font-medium">{t.posPage.cartEmpty}</p>
                    <p className="text-xs">{t.posPage.tapToAdd}</p>
                  </motion.div>
                ) : (
                  cart.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-gray-50 rounded-lg p-2 border border-gray-100 hover:border-emerald-200 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="flex-shrink-0 w-4 h-4 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-gray-800 text-xs truncate">{item.name}</h4>
                          </div>
                          <p className="text-emerald-600 font-semibold text-xs mt-0.5 ml-5">
                            ₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(0)}
                          </p>
                        </div>
                        {/* Quantity Controls - Very Compact */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                          >
                            <Minus size={12} weight="bold" />
                          </button>
                          <span className="w-6 text-center font-bold text-gray-800 text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500 transition-colors"
                          >
                            <Plus size={12} weight="bold" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-red-400 hover:text-red-500 transition-colors ml-0.5"
                          >
                            <Trash size={12} weight="bold" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Cart Footer - Totals & Actions - ALWAYS Visible at Bottom */}
            <div className="border-t border-gray-200 p-3 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex-shrink-0">
              {/* Totals - Clean POS Style */}
              <div className="space-y-1.5 mb-3">
                {/* Subtotal Row */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                  <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span>
                </div>
                
                {/* Discount Row - Modern POS Style */}
                <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-2 -mx-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                      <Percent size={12} className="text-orange-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">Discount</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Clean Toggle Pills */}
                    <div className="flex bg-white rounded-full p-0.5 shadow-sm border border-orange-200">
                      <button
                        onClick={() => {
                          setDiscountType('percent')
                          setInvoiceDiscount(0)
                          setDiscountInputValue('')
                        }}
                        className={cn(
                          "w-7 h-6 text-xs font-bold rounded-full transition-all",
                          discountType === 'percent'
                            ? "bg-orange-500 text-white shadow"
                            : "text-gray-400 hover:text-orange-500"
                        )}
                      >
                        %
                      </button>
                      <button
                        onClick={() => {
                          setDiscountType('amount')
                          setInvoiceDiscount(0)
                          setDiscountInputValue('')
                        }}
                        className={cn(
                          "w-7 h-6 text-xs font-bold rounded-full transition-all",
                          discountType === 'amount'
                            ? "bg-orange-500 text-white shadow"
                            : "text-gray-400 hover:text-orange-500"
                        )}
                      >
                        ₹
                      </button>
                    </div>
                    {/* Input with integrated symbol */}
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={discountInputValue}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setDiscountInputValue(val)
                            const numVal = parseFloat(val) || 0
                            if (discountType === 'percent') {
                              setInvoiceDiscount(Math.min(100, Math.max(0, numVal)))
                            } else {
                              setInvoiceDiscount(Math.max(0, numVal))
                            }
                          }
                        }}
                        onFocus={(e) => e.target.value === '0' && setDiscountInputValue('')}
                        className="w-16 pl-2 pr-5 py-1 text-right text-sm font-semibold bg-white border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
                        placeholder="0"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                        {discountType === 'percent' ? '%' : ''}
                      </span>
                    </div>
                    {/* Calculated Amount Badge */}
                    {discountAmount > 0 && (
                      <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm">
                        -₹{discountAmount.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tax Row */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Tax (GST)</span>
                  <span className="font-medium text-gray-700">₹{totalTax.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Grand Total - Prominent */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3 -mx-0.5 mb-3 shadow-lg">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">GRAND TOTAL</span>
                  <span className="font-bold text-2xl text-white">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons - Prominent */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={printReceipt}
                  disabled={cart.length === 0}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm transition-all",
                    cart.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "neu-btn text-emerald-600"
                  )}
                >
                  <Printer size={16} weight="bold" />
                  Print
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm transition-all",
                    cart.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                  )}
                >
                  <Receipt size={16} weight="bold" />
                  Checkout
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Inline Checkout Panel - No Modal, Direct Access */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Checkout Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3">
              {/* Total Amount - Compact */}
              <div className="text-center mb-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                <p className="text-xs text-emerald-600 font-medium">Total Amount</p>
                <p className="text-3xl font-bold text-emerald-700">₹{grandTotal.toFixed(2)}</p>
                <p className="text-xs text-emerald-500">{cart.reduce((s, i) => s + i.quantity, 0)} items</p>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { method: 'cash' as PaymentMethod, icon: <Money size={18} weight="fill" />, label: 'Cash', color: 'emerald' },
                    { method: 'upi' as PaymentMethod, icon: <QrCode size={18} weight="fill" />, label: 'UPI', color: 'purple' },
                    { method: 'card' as PaymentMethod, icon: <CreditCard size={18} weight="fill" />, label: 'Card', color: 'blue' },
                    { method: 'credit' as PaymentMethod, icon: <Clock size={18} weight="fill" />, label: 'Credit', color: 'amber' }
                  ].map(({ method, icon, label, color }) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all",
                        paymentMethod === method
                          ? "border-2 border-emerald-500 bg-emerald-50"
                          : "neu-btn"
                      )}
                      style={{
                        borderColor: paymentMethod === method
                          ? (color === 'emerald' ? '#10b981' : color === 'purple' ? '#a855f7' : color === 'blue' ? '#3b82f6' : '#f59e0b')
                          : undefined,
                        backgroundColor: paymentMethod === method
                          ? (color === 'emerald' ? '#ecfdf5' : color === 'purple' ? '#faf5ff' : color === 'blue' ? '#eff6ff' : '#fffbeb')
                          : undefined
                      }}
                    >
                      <span style={{ color: paymentMethod === method
                          ? (color === 'emerald' ? '#059669' : color === 'purple' ? '#9333ea' : color === 'blue' ? '#2563eb' : '#d97706')
                          : '#6b7280'
                        }}>{icon}</span>
                        <span className="text-xs font-semibold" style={{ color: paymentMethod === method
                          ? (color === 'emerald' ? '#059669' : color === 'purple' ? '#9333ea' : color === 'blue' ? '#2563eb' : '#d97706')
                          : '#6b7280'
                        }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Payment Section - Compact */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  {/* Quick Amount Buttons */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Quick Select</label>
                    <div className="flex flex-wrap gap-1.5">
                      {quickAmounts.slice(0, 4).map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setAmountTendered(amount.toString())}
                          className={cn(
                            "px-3 py-1.5 rounded-lg font-semibold text-xs transition-all",
                            parseFloat(amountTendered) === amount
                              ? "bg-emerald-500 text-white shadow-md"
                              : "neu-btn text-gray-700"
                          )}
                        >
                          ₹{amount}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Tendered Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount Received</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base font-medium">₹</span>
                      <input
                        type="number"
                        value={amountTendered}
                        onChange={(e) => setAmountTendered(e.target.value)}
                        placeholder={grandTotal.toFixed(0)}
                        className="w-full pl-8 pr-3 py-2.5 text-lg font-bold text-center rounded-lg neu-input border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Change Amount */}
                  {parseFloat(amountTendered) > grandTotal && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-700 font-medium text-sm">Change to Return</span>
                        <span className="text-xl font-bold text-amber-600">₹{changeAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* UPI/Card Section */}
              {(paymentMethod === 'upi' || paymentMethod === 'card') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction reference"
                    className="w-full px-3 py-2.5 rounded-lg neu-input border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all text-sm"
                  />
                </div>
              )}

              {/* Credit Section */}
              {paymentMethod === 'credit' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <Clock size={20} className="text-amber-600" weight="fill" />
                    <div>
                      <p className="font-semibold text-amber-700 text-sm">Credit Sale</p>
                      <p className="text-xs text-amber-600">Payment will be collected later</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Share Receipt Options - Select Method */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-gray-700 mb-2.5">📤 Choose Receipt Option:</p>
                <div className="flex gap-2 justify-center">
                  {/* None Option */}
                  <button
                    onClick={() => setSelectedShareMethod('none')}
                    className={cn(
                      "w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-md",
                      selectedShareMethod === 'none'
                        ? "bg-gradient-to-br from-gray-600 to-gray-700 text-white scale-105 ring-2 ring-gray-500 ring-offset-2"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <X size={24} weight="bold" />
                    <span className="text-[9px] font-semibold">None</span>
                  </button>

                  {/* WhatsApp Option */}
                  <button
                    onClick={() => setSelectedShareMethod('whatsapp')}
                    className={cn(
                      "w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-md",
                      selectedShareMethod === 'whatsapp'
                        ? "bg-gradient-to-br from-green-500 to-green-600 text-white scale-105 ring-2 ring-green-500 ring-offset-2"
                        : "bg-white text-green-600 hover:bg-green-50"
                    )}
                  >
                    <WhatsappLogo size={24} weight="fill" />
                    <span className="text-[9px] font-semibold">WhatsApp</span>
                  </button>

                  {/* SMS Option */}
                  <button
                    onClick={() => setSelectedShareMethod('sms')}
                    className={cn(
                      "w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-md",
                      selectedShareMethod === 'sms'
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white scale-105 ring-2 ring-blue-500 ring-offset-2"
                        : "bg-white text-blue-600 hover:bg-blue-50"
                    )}
                  >
                    <EnvelopeSimple size={24} weight="fill" />
                    <span className="text-[9px] font-semibold">SMS</span>
                  </button>

                  {/* Print Option */}
                  <button
                    onClick={() => setSelectedShareMethod('print')}
                    className={cn(
                      "w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-md",
                      selectedShareMethod === 'print'
                        ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white scale-105 ring-2 ring-purple-500 ring-offset-2"
                        : "bg-white text-purple-600 hover:bg-purple-50"
                    )}
                  >
                    <Printer size={24} weight="fill" />
                    <span className="text-[9px] font-semibold">Print</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Checkout Footer - Action Buttons - Fixed at bottom */}
            <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex gap-2 flex-shrink-0">
              <button
                onClick={handleQuickCheckoutCancel}
                className="px-3 py-2 rounded-lg neu-btn text-gray-600 font-semibold text-xs"
              >
                Back
              </button>
              <button
                onClick={handleFullCheckout}
                className="px-2 py-2 rounded-lg neu-btn text-emerald-600 font-semibold text-xs flex items-center gap-1"
                title="Advanced checkout with more options"
              >
                <Receipt size={14} weight="bold" />
                Full
              </button>
              <button
                onClick={() => handleQuickCheckoutComplete({ shareVia: selectedShareMethod })}
                disabled={isProcessingSale || (paymentMethod === 'cash' && (parseFloat(amountTendered) || 0) < grandTotal)}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isProcessingSale ? (
                  <>
                    <ArrowsClockwise size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} weight="fill" />
                    Complete Sale
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== MOBILE FLOATING CART BUTTON ========== */}
      <AnimatePresence>
        {!showMobileCart && (
          <motion.div
            className="md:hidden fixed bottom-[153px] right-3 z-40"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <button
              onClick={() => setShowMobileCart(true)}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center relative active:scale-95 transition-transform"
            >
              <ShoppingCart size={24} weight="fill" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
            {/* Total amount badge */}
            {cart.length > 0 && (
              <div className="absolute -top-1 -left-6 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
                ₹{grandTotal.toFixed(0)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MOBILE CART DRAWER ========== */}
      <AnimatePresence>
        {showMobileCart && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileCart(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-[72px] left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[75vh] flex flex-col"
            >
              {/* Drawer Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>

              {/* Cart Header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={24} weight="fill" />
                  <h2 className="text-lg font-bold">{t.posPage.cart}</h2>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} {t.posPage.items}
                  </span>
                </div>
                <button
                  onClick={() => setShowMobileCart(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Customer Search - Mobile */}
              <div className="p-3 bg-emerald-50 border-b border-emerald-100">
                <div className="relative" ref={customerDropdownRef}>
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 z-10" />
                  <input
                    type="text"
                    placeholder={t.posPage.searchCustomer}
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearchChange(e.target.value)}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-emerald-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-sm"
                  />
                  <CaretDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 cursor-pointer"
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  />

                  {/* Customer Dropdown - Mobile */}
                  <AnimatePresence>
                    {showCustomerDropdown && (
                      <>
                        <div className="fixed inset-0 z-[99]" onClick={() => setShowCustomerDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-[100]"
                        >
                        {/* Add New Customer Option */}
                        <button
                          onClick={handleAddNewCustomer}
                          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-emerald-50 border-b border-gray-100 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <UserPlus size={16} className="text-emerald-600" weight="bold" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-emerald-600">+ Add New Customer</p>
                            <p className="text-xs text-gray-400">Create a new customer entry</p>
                          </div>
                        </button>

                        {/* Customer List */}
                        {filteredParties.length > 0 ? (
                          filteredParties.slice(0, 10).map((party) => (
                            <button
                              key={party.id}
                              onClick={() => handleSelectCustomer(party)}
                              className={cn(
                                "w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors",
                                selectedParty?.id === party.id && "bg-emerald-50"
                              )}
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <User size={16} className="text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {party.displayName || party.companyName}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {party.phone || 'No phone'}
                                </p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-gray-400 text-sm">
                            {customerSearch ? 'No customers found' : 'Start typing to search...'}
                          </div>
                        )}

                        {filteredParties.length > 10 && (
                          <div className="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-100">
                            Showing 10 of {filteredParties.length} results
                          </div>
                        )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Phone Number Input - Mobile */}
                <div className="mt-2">
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 z-10" />
                    <input
                      type="tel"
                      placeholder="Phone number (for WhatsApp)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-emerald-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Cart Items - Mobile */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <ShoppingCart size={48} className="mb-2 text-gray-200" />
                    <p className="text-sm font-medium">{t.posPage.cartEmpty}</p>
                    <p className="text-xs">{t.posPage.tapToAdd}</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-gray-800 text-sm truncate">{item.name}</h4>
                          </div>
                          <p className="text-emerald-600 font-semibold text-sm mt-1 ml-7">
                            ₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(0)}
                          </p>
                        </div>
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                          >
                            <Minus size={14} weight="bold" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-800 text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500 transition-colors"
                          >
                            <Plus size={14} weight="bold" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-red-400 hover:text-red-500 transition-colors ml-1"
                          >
                            <Trash size={14} weight="bold" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Cart Footer - Totals & Actions - Mobile */}
              {cart.length > 0 && (
                <div className="border-t border-gray-100 p-3 bg-gray-50 flex-shrink-0">
                  {/* Discount Input - With Type Toggle */}
                  <div className="flex justify-between items-center text-sm py-2 px-3 bg-orange-50 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <Percent size={14} className="text-orange-600" />
                      <span className="text-gray-600">Discount:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Discount Type Toggle */}
                      <div className="flex bg-orange-100 rounded p-0.5">
                        <button
                          onClick={() => {
                            setDiscountType('percent')
                            setInvoiceDiscount(0)
                            setDiscountInputValue('')
                          }}
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded transition-all",
                            discountType === 'percent'
                              ? "bg-orange-500 text-white"
                              : "text-orange-600 hover:bg-orange-200"
                          )}
                        >
                          %
                        </button>
                        <button
                          onClick={() => {
                            setDiscountType('amount')
                            setInvoiceDiscount(0)
                            setDiscountInputValue('')
                          }}
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded transition-all",
                            discountType === 'amount'
                              ? "bg-orange-500 text-white"
                              : "text-orange-600 hover:bg-orange-200"
                          )}
                        >
                          ₹
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={discountInputValue}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setDiscountInputValue(val)
                            const numVal = parseFloat(val) || 0
                            if (discountType === 'percent') {
                              setInvoiceDiscount(Math.min(100, Math.max(0, numVal)))
                            } else {
                              setInvoiceDiscount(Math.max(0, numVal))
                            }
                          }
                        }}
                        onFocus={(e) => {
                          if (e.target.value === '0') {
                            setDiscountInputValue('')
                          }
                        }}
                        onBlur={() => {
                          if (discountInputValue === '') {
                            setDiscountInputValue('')
                            setInvoiceDiscount(0)
                          }
                        }}
                        className="w-16 px-2 py-1 text-right text-sm font-medium border border-orange-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                        placeholder="0"
                      />
                      <span className="text-gray-500 w-4">{discountType === 'percent' ? '%' : ''}</span>
                      {discountAmount > 0 && (
                        <span className="text-orange-600 font-medium">-₹{discountAmount.toFixed(0)}</span>
                      )}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                      <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax (CGST + SGST)</span>
                      <span className="font-medium text-gray-700">₹{totalTax.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-gray-200 my-1"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-base">Grand Total</span>
                      <span className="font-bold text-xl text-emerald-600">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        printReceipt()
                        setShowMobileCart(false)
                      }}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl neu-btn text-emerald-600 font-semibold text-sm"
                    >
                      <Printer size={18} weight="bold" />
                      Print
                    </button>
                    <button
                      onClick={() => {
                        handleCheckout()
                        setShowMobileCart(false)
                      }}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all"
                    >
                      <Receipt size={18} weight="bold" />
                      Checkout
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========== MOBILE CHECKOUT MODAL ========== */}
      <AnimatePresence>
        {showQuickCheckout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/50 z-50"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-[72px] left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col md:bottom-0 md:max-h-[90vh]"
            >
              {/* Drawer Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>

              {/* Checkout Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={20} weight="bold" />
                  <span className="font-bold text-lg">Checkout</span>
                </div>
                <button
                  onClick={handleQuickCheckoutCancel}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
              {/* Checkout Body - Compact spacing to prevent scrolling */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Total Amount - Compact */}
                <div className="text-center p-2.5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <p className="text-[10px] text-emerald-600 font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-emerald-700">₹{grandTotal.toFixed(2)}</p>
                  <p className="text-[10px] text-emerald-500">{cart.reduce((s, i) => s + i.quantity, 0)} items</p>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { method: 'cash' as PaymentMethod, icon: <Money size={20} weight="fill" />, label: 'Cash', color: 'emerald' },
                      { method: 'upi' as PaymentMethod, icon: <QrCode size={20} weight="fill" />, label: 'UPI', color: 'purple' },
                      { method: 'card' as PaymentMethod, icon: <CreditCard size={20} weight="fill" />, label: 'Card', color: 'blue' },
                      { method: 'credit' as PaymentMethod, icon: <Clock size={20} weight="fill" />, label: 'Credit', color: 'amber' }
                    ].map(({ method, icon, label, color }) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all text-xs",
                          paymentMethod === method
                            ? "border-2 border-emerald-500 bg-emerald-50"
                            : "neu-btn"
                        )}
                        style={{
                          borderColor: paymentMethod === method
                            ? (color === 'emerald' ? '#10b981' : color === 'purple' ? '#a855f7' : color === 'blue' ? '#3b82f6' : '#f59e0b')
                            : undefined,
                          backgroundColor: paymentMethod === method
                            ? (color === 'emerald' ? '#ecfdf5' : color === 'purple' ? '#faf5ff' : color === 'blue' ? '#eff6ff' : '#fffbeb')
                            : undefined
                        }}
                      >
                        <span style={{ color: paymentMethod === method
                          ? (color === 'emerald' ? '#059669' : color === 'purple' ? '#9333ea' : color === 'blue' ? '#2563eb' : '#d97706')
                          : '#6b7280'
                        }}>{icon}</span>
                        <span className="text-xs font-semibold" style={{ color: paymentMethod === method
                          ? (color === 'emerald' ? '#059669' : color === 'purple' ? '#9333ea' : color === 'blue' ? '#2563eb' : '#d97706')
                          : '#6b7280'
                        }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Payment Section - Compact */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-2">
                    {/* Quick Amount Buttons */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quick Select</label>
                      <div className="flex flex-wrap gap-1.5">
                        {quickAmounts.slice(0, 4).map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setAmountTendered(amount.toString())}
                            className={cn(
                              "px-3 py-1.5 rounded-lg font-semibold text-xs transition-all",
                              parseFloat(amountTendered) === amount
                                ? "bg-emerald-500 text-white shadow-md"
                                : "neu-btn text-gray-700"
                            )}
                          >
                            ₹{amount}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount Tendered Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-medium">₹</span>
                        <input
                          type="number"
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value)}
                          placeholder={grandTotal.toFixed(0)}
                          className="w-full pl-8 pr-3 py-2 text-lg font-bold text-center rounded-lg neu-input border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Change Amount - Compact */}
                    {parseFloat(amountTendered) > grandTotal && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                        <p className="text-[10px] text-green-600 font-medium">Change to Return</p>
                        <p className="text-xl font-bold text-green-700">₹{(parseFloat(amountTendered) - grandTotal).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* UPI Payment - Compact */}
                {paymentMethod === 'upi' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Transaction ID</label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter UPI Transaction ID"
                        className="w-full px-3 py-2 rounded-lg neu-input border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Card Payment - Compact */}
                {paymentMethod === 'card' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Transaction ID</label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter Card Transaction ID"
                        className="w-full px-3 py-2 rounded-lg neu-input border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Credit Payment - Compact */}
                {paymentMethod === 'credit' && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium text-center">
                      Amount of ₹{grandTotal.toFixed(2)} will be added to {customerName || 'Walk-in Customer'}'s credit balance
                    </p>
                  </div>
                )}

                {/* Share Receipt Options - Compact */}
                <div className="p-2.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-gray-700 mb-2">📤 Receipt:</p>
                  <div className="flex gap-1.5 justify-center">
                    {/* None Option */}
                    <button
                      onClick={() => setSelectedShareMethod('none')}
                      className={cn(
                        "w-14 h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm",
                        selectedShareMethod === 'none'
                          ? "bg-gradient-to-br from-gray-600 to-gray-700 text-white ring-2 ring-gray-500"
                          : "bg-white text-gray-500"
                      )}
                    >
                      <X size={20} weight="bold" />
                      <span className="text-[8px] font-semibold">None</span>
                    </button>

                    {/* WhatsApp Option */}
                    <button
                      onClick={() => setSelectedShareMethod('whatsapp')}
                      className={cn(
                        "w-14 h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm",
                        selectedShareMethod === 'whatsapp'
                          ? "bg-gradient-to-br from-green-500 to-green-600 text-white ring-2 ring-green-500"
                          : "bg-white text-green-600"
                      )}
                    >
                      <WhatsappLogo size={20} weight="fill" />
                      <span className="text-[8px] font-semibold">WhatsApp</span>
                    </button>

                    {/* SMS Option */}
                    <button
                      onClick={() => setSelectedShareMethod('sms')}
                      className={cn(
                        "w-14 h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm",
                        selectedShareMethod === 'sms'
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-500"
                          : "bg-white text-blue-600"
                      )}
                    >
                      <EnvelopeSimple size={20} weight="fill" />
                      <span className="text-[8px] font-semibold">SMS</span>
                    </button>

                    {/* Print Option */}
                    <button
                      onClick={() => setSelectedShareMethod('print')}
                      className={cn(
                        "w-14 h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm",
                        selectedShareMethod === 'print'
                          ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-2 ring-purple-500"
                          : "bg-white text-purple-600"
                      )}
                    >
                      <Printer size={20} weight="fill" />
                      <span className="text-[8px] font-semibold">Print</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Checkout Footer - Compact */}
              <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex gap-2">
                <button
                  onClick={handleQuickCheckoutCancel}
                  className="px-3 py-2.5 rounded-lg neu-btn text-gray-600 font-semibold text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => handleQuickCheckoutComplete({ shareVia: selectedShareMethod })}
                  disabled={isProcessingSale || (paymentMethod === 'cash' && (parseFloat(amountTendered) || 0) < grandTotal)}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessingSale ? (
                    <>
                      <ArrowsClockwise size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} weight="fill" />
                      Complete Sale
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill Preview Modal */}
      {showBillPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Receipt size={20} weight="bold" />
                <span className="font-bold text-lg">Bill Preview</span>
              </div>
              <button
                onClick={() => setShowBillPreview(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Bill Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Shop Header */}
              <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
                <h2 className="font-bold text-lg">{companySettings?.companyName || 'YOUR SHOP'}</h2>
                {companySettings?.address && <p className="text-xs text-gray-600">{companySettings.address}</p>}
                {(companySettings?.city || companySettings?.state) && (
                  <p className="text-xs text-gray-600">
                    {companySettings?.city}{companySettings?.state ? `, ${companySettings.state}` : ''} {companySettings?.pincode || ''}
                  </p>
                )}
                {companySettings?.phone && <p className="text-xs text-gray-600">Ph: {companySettings.phone}</p>}
                {companySettings?.gstin && <p className="text-xs font-semibold">GSTIN: {companySettings.gstin}</p>}
              </div>

              {/* Bill Info */}
              <div className="flex justify-between text-xs text-gray-600 mb-3">
                <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {customerName && (
                <div className="text-sm mb-3">
                  <span className="text-gray-600">Customer: </span>
                  <span className="font-semibold">{customerName}</span>
                </div>
              )}

              {/* Items Header */}
              <div className="grid grid-cols-12 text-xs font-bold text-gray-600 border-b border-gray-200 pb-1 mb-2">
                <div className="col-span-6">ITEM</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-2 text-right">RATE</div>
                <div className="col-span-2 text-right">AMT</div>
              </div>

              {/* Items List */}
              <div className="space-y-2 mb-3">
                {cart.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 text-sm border-b border-gray-100 pb-1">
                    <div className="col-span-6 font-medium truncate">{item.name}</div>
                    <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
                    <div className="col-span-2 text-right text-gray-600">{item.price.toFixed(0)}</div>
                    <div className="col-span-2 text-right font-semibold">{(item.price * item.quantity).toFixed(0)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t-2 border-dashed border-gray-300 pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sub Total</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
                {totalTax > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CGST</span>
                      <span>{(totalTax / 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">SGST</span>
                      <span>{(totalTax / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({invoiceDiscount}%)</span>
                    <span>-{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>GRAND TOTAL</span>
                  <span className="text-emerald-600">{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Item Summary */}
              <div className="text-center text-xs text-gray-500 mt-3 pt-3 border-t border-dashed border-gray-200">
                Items: {cart.length} | Qty: {cart.reduce((s, i) => s + i.quantity, 0)}
              </div>
            </div>

            {/* Modal Footer - Action Buttons */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowBillPreview(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintAndProceed}
                className="flex-1 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer size={14} weight="bold" />
                Print & Continue
              </button>
              <button
                onClick={handleProceedToPayment}
                className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all"
              >
                <CheckCircle size={14} weight="fill" />
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default ModernPOS
