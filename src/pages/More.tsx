import React, { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { useLanguage } from '../contexts/LanguageContext'
import { usePlan } from '../hooks/usePlan'
import {
  Truck,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Receipt,
  Barcode,
  Tag,
  Users,
  CalendarCheck,
  CurrencyCircleDollar,
  DeviceMobile,
  Wallet,
  FileArrowUp,
  QrCode,
  ListNumbers,
  Notepad,
  Gift,
  Percent,
  ClipboardText,
  MapPin,
  Phone,
  Storefront,
  CheckCircle,
  Plus,
  X,
  ArrowRight
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import {
  getDeliveryChallans,
  createDeliveryChallan,
  generateChallanNumber,
  updateChallanStatus,
  CHALLAN_PURPOSE_LABELS,
  type DeliveryChallan,
  type ChallanPurpose
} from '../services/deliveryChallanService'
import {
  getPurchaseOrders,
  createPurchaseOrder,
  generatePONumber,
  updatePOStatus,
  type PurchaseOrder
} from '../services/purchaseOrderService'
import {
  getProformaInvoices,
  createProformaInvoice,
  generateProformaNumber,
  updateProformaStatus,
  deleteProformaInvoice,
  numberToWords,
  getDefaultTerms,
  type ProformaInvoice
} from '../services/proformaInvoiceService'
import { getParties } from '../services/partyService'
import { getItems, findItemByBarcode } from '../services/itemService'
import { Party, Item } from '../types'
import { getCompanySettings } from '../services/settingsService'
import { getPartyName } from '../utils/partyUtils'
import BarcodeScanner from '../components/BarcodeScanner'
import PaymentAllocationModal from '../components/PaymentAllocationModal'
import {
  createPaymentIn,
  createPaymentOut,
  getPaymentsIn,
  getPaymentsOut,
  type PaymentIn,
  type PaymentOut
} from '../services/paymentInOutService'
import {
  getAllocatedPayments,
  type AllocatedPayment
} from '../services/paymentAllocationService'
import {
  createPriceList,
  getPriceLists,
  deletePriceList,
  type PriceList
} from '../services/priceListService'

const More = () => {
  const { t, language } = useLanguage()
  const { hasFeature } = usePlan()
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([])
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [lastScannedItem, setLastScannedItem] = useState<Item | null>(null)

  // Notes feature states
  const [notes, setNotes] = useState<{id: string; title: string; content: string; partyId?: string; partyName?: string; date: string}[]>([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteParty, setNoteParty] = useState<Party | null>(null)

  // Schemes feature states
  const [schemes, setSchemes] = useState<{id: string; name: string; description: string; discountType: 'percentage' | 'amount'; discountValue: number; minQty?: number; validFrom: string; validTo: string}[]>([])
  const [schemeName, setSchemeName] = useState('')
  const [schemeDesc, setSchemeDesc] = useState('')
  const [schemeDiscountType, setSchemeDiscountType] = useState<'percentage' | 'amount'>('percentage')
  const [schemeDiscountValue, setSchemeDiscountValue] = useState(0)
  const [schemeMinQty, setSchemeMinQty] = useState('')
  const [schemeValidFrom, setSchemeValidFrom] = useState('')
  const [schemeValidTo, setSchemeValidTo] = useState('')

  // Discount Management states
  const [discounts, setDiscounts] = useState<{id: string; code: string; type: 'percentage' | 'amount'; value: number; maxDiscount?: number; validFrom: string; validTo: string}[]>([])
  const [discountCode, setDiscountCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountMaxValue, setDiscountMaxValue] = useState('')
  const [discountValidFrom, setDiscountValidFrom] = useState('')

  // UPI Payment Links states
  const [upiLinks, setUpiLinks] = useState<{id: string; partyName: string; amount: number; upiId: string; link: string; createdAt: string}[]>([])
  const [upiPartyName, setUpiPartyName] = useState('')
  const [upiAmount, setUpiAmount] = useState('')
  const [upiId, setUpiId] = useState('')

  // Multiple Locations states
  const [locations, setLocations] = useState<{id: string; name: string; address: string; city: string; state: string; pincode: string; isDefault: boolean}[]>([])
  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [locationState, setLocationState] = useState('')
  const [locationPincode, setLocationPincode] = useState('')

  // Staff Attendance states
  const [attendanceRecords, setAttendanceRecords] = useState<{id: string; staffName: string; date: string; status: 'present' | 'absent' | 'half-day' | 'leave'; notes?: string}[]>([])
  const [attendanceStaffName, setAttendanceStaffName] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'half-day' | 'leave'>('present')
  const [attendanceNotes, setAttendanceNotes] = useState('')

  // Salary Management states
  const [salaryRecords, setSalaryRecords] = useState<{id: string; staffName: string; month: string; basicSalary: number; allowances: number; deductions: number; netSalary: number; paidDate?: string; status: 'pending' | 'paid'}[]>([])
  const [salaryStaffName, setSalaryStaffName] = useState('')
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7))
  const [salaryBasic, setSalaryBasic] = useState('')
  const [salaryAllowances, setSalaryAllowances] = useState('')
  const [salaryDeductions, setSalaryDeductions] = useState('')

  // Serial Number Tracking states
  const [serialNumbers, setSerialNumbers] = useState<{id: string; itemName: string; serialNumber: string; purchaseDate: string; warrantyExpiry?: string; status: 'in-stock' | 'sold' | 'defective'; soldTo?: string}[]>([])
  const [serialItemName, setSerialItemName] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [serialPurchaseDate, setSerialPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [serialWarrantyExpiry, setSerialWarrantyExpiry] = useState('')
  const [serialStatus, setSerialStatus] = useState<'in-stock' | 'sold' | 'defective'>('in-stock')

  // Online Store states
  const [onlineStoreUrl, setOnlineStoreUrl] = useState('')
  const [onlineStoreEnabled, setOnlineStoreEnabled] = useState(false)

  // Barcode Generator states
  const [barcodeItems, setBarcodeItems] = useState<Item[]>([])
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState<Item | null>(null)
  const [barcodeQuantity, setBarcodeQuantity] = useState(1)
  const [barcodeSize, setBarcodeSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [showPrice, setShowPrice] = useState(true)
  const [showProductName, setShowProductName] = useState(true)
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState('')
  const [generatedBarcodes, setGeneratedBarcodes] = useState<{item: Item; quantity: number}[]>([])

  // Form states for Delivery Challan
  const [dcCustomerSearch, setDcCustomerSearch] = useState('')
  const [dcSelectedCustomer, setDcSelectedCustomer] = useState<Party | null>(null)
  const [dcPurpose, setDcPurpose] = useState<ChallanPurpose>('job-work')
  const [dcReference, setDcReference] = useState('')
  const [dcItems, setDcItems] = useState<{ itemId?: string; name: string; hsnCode?: string; qty: number; unit: string; rate?: number }[]>([])
  const [dcVehicleNo, setDcVehicleNo] = useState('')
  const [dcTransporterName, setDcTransporterName] = useState('')
  const [dcDriverName, setDcDriverName] = useState('')
  const [dcRemarks, setDcRemarks] = useState('')
  const [dcItemSearch, setDcItemSearch] = useState('')
  const [showDcCustomerDropdown, setShowDcCustomerDropdown] = useState(false)
  const [showDcItemDropdown, setShowDcItemDropdown] = useState(false)

  // Form states for Purchase Order
  const [showPOModal, setShowPOModal] = useState(false)
  const [poSupplierSearch, setPoSupplierSearch] = useState('')
  const [poSelectedSupplier, setPoSelectedSupplier] = useState<Party | null>(null)
  const [showPoSupplierDropdown, setShowPoSupplierDropdown] = useState(false)
  const [poSupplierName, setPoSupplierName] = useState('')
  const [poItems, setPoItems] = useState<{ itemId?: string; name: string; qty: number; rate: number; unit: string }[]>([])
  const [poItemSearch, setPoItemSearch] = useState('')
  const [showPoItemDropdown, setShowPoItemDropdown] = useState(false)
  const [poNotes, setPoNotes] = useState('')
  const [poExpectedDate, setPoExpectedDate] = useState('')

  // Form states for Payment In/Out (New Allocation Modal)
  const [showPaymentInModal, setShowPaymentInModal] = useState(false)
  const [showPaymentOutModal, setShowPaymentOutModal] = useState(false)
  const [allocatedPaymentsIn, setAllocatedPaymentsIn] = useState<AllocatedPayment[]>([])
  const [allocatedPaymentsOut, setAllocatedPaymentsOut] = useState<AllocatedPayment[]>([])

  // Legacy form states for Payment In (kept for backward compatibility)

  // Legacy form states for Payment Out (kept for backward compatibility)

  // Form states for Price List
  const [showPriceListModal, setShowPriceListModal] = useState(false)
  const [plName, setPlName] = useState('')
  const [plDiscount, setPlDiscount] = useState(0)
  const [plIsDefault, setPlIsDefault] = useState(false)

  // Form states for E-Way Bill
  const [showEwayBillModal, setShowEwayBillModal] = useState(false)
  const [ewayDocType, setEwayDocType] = useState<'INV' | 'CHL' | 'BIL' | 'BOE' | 'OTH'>('INV')
  const [ewayDocNo, setEwayDocNo] = useState('')
  const [ewayDocDate, setEwayDocDate] = useState(new Date().toISOString().split('T')[0])
  const [ewaySupplyType, setEwaySupplyType] = useState<'O' | 'I'>('O') // Outward/Inward
  const [ewaySubType, setEwaySubType] = useState<'1' | '2' | '3' | '4'>('1') // Supply, Import, Export, Job Work
  const [ewayFromGstin, setEwayFromGstin] = useState('')
  const [ewayFromName, setEwayFromName] = useState('')
  const [ewayFromAddr, setEwayFromAddr] = useState('')
  const [ewayFromPlace, setEwayFromPlace] = useState('')
  const [ewayFromPincode, setEwayFromPincode] = useState('')
  const [ewayFromState, setEwayFromState] = useState('')
  const [ewayToGstin, setEwayToGstin] = useState('')
  const [ewayToName, setEwayToName] = useState('')
  const [ewayToAddr, setEwayToAddr] = useState('')
  const [ewayToPlace, setEwayToPlace] = useState('')
  const [ewayToPincode, setEwayToPincode] = useState('')
  const [ewayToState, setEwayToState] = useState('')
  const [ewayTransMode, setEwayTransMode] = useState<'1' | '2' | '3' | '4'>('1') // Road, Rail, Air, Ship
  const [ewayDistance, setEwayDistance] = useState('')
  const [ewayTransName, setEwayTransName] = useState('')
  const [ewayTransId, setEwayTransId] = useState('')
  const [ewayVehicleNo, setEwayVehicleNo] = useState('')
  const [ewayVehicleType, setEwayVehicleType] = useState<'R' | 'O'>('R') // Regular, Over Dimensional
  const [ewayTransDocNo, setEwayTransDocNo] = useState('')
  const [ewayTransDocDate, setEwayTransDocDate] = useState('')
  const [ewayTotalValue, setEwayTotalValue] = useState(0)
  const [ewayTaxableValue, setEwayTaxableValue] = useState(0)
  const [ewayCgst, setEwayCgst] = useState(0)
  const [ewaySgst, setEwaySgst] = useState(0)
  const [ewayIgst, setEwayIgst] = useState(0)
  const [ewayCess, setEwayCess] = useState(0)
  const [ewayItems, setEwayItems] = useState<{
    productName: string
    productDesc: string
    hsnCode: string
    quantity: number
    unit: string
    taxableAmount: number
    cgstRate: number
    sgstRate: number
    igstRate: number
    cessRate: number
  }[]>([])
  const [ewayItemSearch, setEwayItemSearch] = useState('')
  const [ewayCustomerSearch, setEwayCustomerSearch] = useState('')
  const [ewaySelectedCustomer, setEwaySelectedCustomer] = useState<Party | null>(null)
  const [ewayBillsList, setEwayBillsList] = useState<{
    ewbNo: string
    ewbDate: string
    docNo: string
    fromGstin: string
    toGstin: string
    totalValue: number
    validUpto: string
    status: 'active' | 'cancelled' | 'expired'
  }[]>([])

  // Form states for Proforma Invoice
  const [piCustomerSearch, setPiCustomerSearch] = useState('')
  const [piSelectedCustomer, setPiSelectedCustomer] = useState<Party | null>(null)
  const [piValidDays, setPiValidDays] = useState(15)
  const [piItems, setPiItems] = useState<{ 
    itemId?: string
    name: string
    hsnCode?: string
    qty: number
    rate: number
    discount: number
    tax: number
    unit: string
  }[]>([])
  const [piNotes, setPiNotes] = useState('')
  const [piTerms, setPiTerms] = useState(getDefaultTerms())
  const [piAdvance, setPiAdvance] = useState(0)
  const [piItemSearch, setPiItemSearch] = useState('')
  const [showPiCustomerDropdown, setShowPiCustomerDropdown] = useState(false)
  const [showPiItemDropdown, setShowPiItemDropdown] = useState(false)
  
  // Available parties and items
  const [availableParties, setAvailableParties] = useState<Party[]>([])
  const [availableItems, setAvailableItems] = useState<Item[]>([])
  const [companyState, setCompanyState] = useState('Tamil Nadu')

  // State for payments and price lists (fetched from Firebase)
  const [paymentsIn, setPaymentsIn] = useState<PaymentIn[]>([])
  const [paymentsOut, setPaymentsOut] = useState<PaymentOut[]>([])
  const [priceLists, setPriceLists] = useState<PriceList[]>([])

  // Load counts on initial mount for Quick Actions cards
  useEffect(() => {
    const loadInitialCounts = async () => {
      try {
        const [challans, orders, proformas, paymentsInData, paymentsOutData, priceListsData] = await Promise.all([
          getDeliveryChallans(),
          getPurchaseOrders(),
          getProformaInvoices(),
          getPaymentsIn(),
          getPaymentsOut(),
          getPriceLists()
        ])
        setDeliveryChallans(challans)
        setPurchaseOrders(orders)
        setProformaInvoices(proformas)
        setPaymentsIn(paymentsInData)
        setPaymentsOut(paymentsOutData)
        setPriceLists(priceListsData)
      } catch (error) {
        console.error('Error loading initial counts:', error)
      }
    }
    loadInitialCounts()

    // Load localStorage data for new features
    try {
      const savedAttendance = localStorage.getItem('attendance_records')
      if (savedAttendance) setAttendanceRecords(JSON.parse(savedAttendance))

      const savedSalary = localStorage.getItem('salary_records')
      if (savedSalary) setSalaryRecords(JSON.parse(savedSalary))

      const savedSerials = localStorage.getItem('serial_numbers')
      if (savedSerials) setSerialNumbers(JSON.parse(savedSerials))

      const savedStoreEnabled = localStorage.getItem('online_store_enabled')
      if (savedStoreEnabled) setOnlineStoreEnabled(savedStoreEnabled === 'true')

      const savedStoreUrl = localStorage.getItem('online_store_url')
      if (savedStoreUrl) setOnlineStoreUrl(savedStoreUrl)
    } catch (error) {
      console.error('Error loading localStorage data:', error)
    }
  }, [])

  // Load data when module is selected
  useEffect(() => {
    if (selectedModule === 'delivery-challan') {
      loadDeliveryChallans()
      loadPartiesAndItems()
    } else if (selectedModule === 'purchase-orders') {
      loadPurchaseOrders()
    } else if (selectedModule === 'proforma') {
      loadProformaInvoices()
      loadPartiesAndItems()
    } else if (selectedModule === 'payment-in') {
      loadPaymentsInData()
      loadPartiesAndItems()
    } else if (selectedModule === 'payment-out') {
      loadPaymentsOutData()
      loadPartiesAndItems()
    } else if (selectedModule === 'price-lists') {
      loadPriceListsData()
    } else if (selectedModule === 'eway-bill') {
      loadPartiesAndItems()
    }
  }, [selectedModule])

  // Load functions for payments and price lists
  const loadPaymentsInData = async () => {
    try {
      // Load legacy payments
      const data = await getPaymentsIn()
      setPaymentsIn(data)
      // Load allocated payments
      const allocatedData = await getAllocatedPayments('IN')
      setAllocatedPaymentsIn(allocatedData)
    } catch (error) {
      console.error('Error loading payments in:', error)
    }
  }

  const loadPaymentsOutData = async () => {
    try {
      // Load legacy payments
      const data = await getPaymentsOut()
      setPaymentsOut(data)
      // Load allocated payments
      const allocatedData = await getAllocatedPayments('OUT')
      setAllocatedPaymentsOut(allocatedData)
    } catch (error) {
      console.error('Error loading payments out:', error)
    }
  }

  const loadPriceListsData = async () => {
    try {
      const data = await getPriceLists()
      setPriceLists(data)
    } catch (error) {
      console.error('Error loading price lists:', error)
    }
  }

  const loadPartiesAndItems = async () => {
    try {
      const [parties, items] = await Promise.all([getParties(), getItems()])
      setAvailableParties(parties)
      setAvailableItems(items)
      // Get company state from settings
      const settings = getCompanySettings()
      if (settings?.state) {
        setCompanyState(settings.state)
      }
    } catch (error) {
      console.error('Error loading parties/items:', error)
    }
  }

  const loadDeliveryChallans = async () => {
    const data = await getDeliveryChallans()
    setDeliveryChallans(data)
  }

  const loadPurchaseOrders = async () => {
    const data = await getPurchaseOrders()
    setPurchaseOrders(data)
  }

  const loadProformaInvoices = async () => {
    const data = await getProformaInvoices()
    setProformaInvoices(data)
  }

  const handleCreateDeliveryChallan = async () => {
    if (!dcSelectedCustomer && !dcCustomerSearch) {
      toast.error('Please select or enter customer/party name')
      return
    }
    if (dcItems.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    const customerName = dcSelectedCustomer ? getPartyName(dcSelectedCustomer) : dcCustomerSearch
    const totalQty = dcItems.reduce((sum, item) => sum + item.qty, 0)
    const totalValue = dcItems.reduce((sum, item) => sum + (item.qty * (item.rate || 0)), 0)

    const challanData: any = {
      challanNumber: generateChallanNumber(),
      challanDate: new Date().toISOString().split('T')[0],
      partyId: dcSelectedCustomer?.id,
      customerName,
      customerPhone: dcSelectedCustomer?.phone || '',
      customerEmail: dcSelectedCustomer?.email || '',
      customerGSTIN: dcSelectedCustomer?.gstDetails?.gstin || '',
      customerAddress: dcSelectedCustomer?.billingAddress?.street || '',
      customerState: dcSelectedCustomer?.billingAddress?.state || '',
      purpose: dcPurpose,
      purposeLabel: CHALLAN_PURPOSE_LABELS[dcPurpose],
      reference: dcReference,
      items: dcItems.map((item, i) => ({
        id: `item_${i}`,
        itemId: item.itemId,
        itemName: item.name,
        hsnCode: item.hsnCode,
        quantity: item.qty,
        unit: item.unit,
        rate: item.rate,
        value: item.qty * (item.rate || 0)
      })),
      totalQuantity: totalQty,
      totalValue,
      vehicleNumber: dcVehicleNo,
      transporterName: dcTransporterName,
      driverName: dcDriverName,
      remarks: dcRemarks,
      status: 'pending' as const
    }

    const result = await createDeliveryChallan(challanData)
    if (result) {
      toast.success(`Delivery Challan ${result.challanNumber} created! Stock will be reduced.`)
      setShowCreateModal(false)
      // Reset form
      setDcCustomerSearch('')
      setDcSelectedCustomer(null)
      setDcPurpose('job-work')
      setDcReference('')
      setDcItems([])
      setDcVehicleNo('')
      setDcTransporterName('')
      setDcDriverName('')
      setDcRemarks('')
      loadDeliveryChallans()
    }
  }

  // Handle module click with plan check
  const handleModuleClick = (moduleId: string, moduleTitle: string) => {
    // Map module IDs to plan features
    const featureMap: Record<string, { feature: string; name: string; description: string }> = {
      'online-store': {
        feature: 'onlineStore',
        name: 'Online Store',
        description: 'Set up your e-commerce website and manage online orders. Available in Gold Plan.'
      },
      'delivery-challan': {
        feature: 'deliveryChallan',
        name: 'Delivery Challan',
        description: 'Create and manage delivery challans for goods transportation. Available in Gold Plan.'
      },
      'purchase-orders': {
        feature: 'purchaseOrders',
        name: 'Purchase Orders',
        description: 'Manage purchase orders to suppliers with complete tracking. Available in Gold Plan.'
      },
      'eway-bill': {
        feature: 'ewayBiller',
        name: 'E-Way Bill',
        description: 'Generate E-Way bills for GST compliance during goods transportation. Available in Gold Plan.'
      },
      'attendance': {
        feature: 'staffAttendance',
        name: 'Staff Attendance',
        description: 'Track employee attendance and work hours. Available in Gold Plan.'
      },
      'salary': {
        feature: 'salaryManagement',
        name: 'Salary Management',
        description: 'Manage staff salaries, payroll, and payment processing. Available in Gold Plan.'
      },
      'proforma': {
        feature: 'performanceInvoice',
        name: 'Proforma Invoice',
        description: 'Create proforma invoices for quotations and advance orders. Available in Gold Plan.'
      },
      'notes': {
        feature: 'notes',
        name: 'Notes',
        description: 'Add notes for tasks & parties. Available in all plans.'
      },
      'schemes': {
        feature: 'schemes',
        name: 'Promotional Schemes',
        description: 'Create promotional schemes for customers. Available in Gold Plan.'
      },
      'discounts': {
        feature: 'discountManagement',
        name: 'Discount Management',
        description: 'Manage various discount types and codes. Available in Gold Plan.'
      },
      'ledger': {
        feature: 'ledgerReport',
        name: 'Ledger Report',
        description: 'View detailed ledger accounts. Available in all plans.'
      },
      'location': {
        feature: 'multipleLocations',
        name: 'Multiple Locations',
        description: 'Manage multiple business locations. Available in Gold Plan.'
      },
      'whatsapp': {
        feature: 'whatsappIntegration',
        name: 'WhatsApp Integration',
        description: 'Send invoices via WhatsApp. Available in Gold Plan.'
      },
      'upi': {
        feature: 'upiPaymentLinks',
        name: 'UPI Payment Links',
        description: 'Generate UPI payment links for customers. Available in all plans.'
      }
    }

    // All features are now available - no premium check needed
    setSelectedModule(moduleId)

    // Only show modal for features that have modal panels implemented
    // Features with dedicated sections (payment-in, payment-out, etc.) don't need the modal
    const modalFeatures = [
      'notes', 'schemes', 'discounts', 'whatsapp', 'upi', 'ledger', 'location',
      'attendance', 'salary', 'item-serial', 'online-store'
    ]
    if (modalFeatures.includes(moduleId)) {
      setShowCreateModal(true)
    }

    // Scroll to top so the panel is visible
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  const handleCreateProformaInvoice = async () => {
    if (!piSelectedCustomer && !piCustomerSearch) {
      toast.error('Please select or enter customer name')
      return
    }
    if (piItems.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    const customerName = piSelectedCustomer ? getPartyName(piSelectedCustomer) : piCustomerSearch
    const customerState = piSelectedCustomer?.billingAddress?.state || 'Tamil Nadu'
    const isInterState = companyState.toLowerCase() !== customerState.toLowerCase()

    // Calculate totals
    let subtotal = 0
    let totalDiscount = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0

    const calculatedItems = piItems.map((item, i) => {
      const lineTotal = item.qty * item.rate
      const discountAmt = lineTotal * (item.discount / 100)
      const taxableAmount = lineTotal - discountAmt
      const taxAmount = taxableAmount * (item.tax / 100)
      
      subtotal += lineTotal
      totalDiscount += discountAmt

      if (isInterState) {
        totalIGST += taxAmount
        return {
          id: `item_${i}`,
          itemId: item.itemId,
          itemName: item.name,
          hsnCode: item.hsnCode,
          quantity: item.qty,
          unit: item.unit || 'pcs',
          rate: item.rate,
          discountPercent: item.discount,
          discountAmount: discountAmt,
          taxableAmount,
          taxRate: item.tax,
          igstRate: item.tax,
          igstAmount: taxAmount,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          amount: taxableAmount + taxAmount
        }
      } else {
        const halfTax = taxAmount / 2
        totalCGST += halfTax
        totalSGST += halfTax
        return {
          id: `item_${i}`,
          itemId: item.itemId,
          itemName: item.name,
          hsnCode: item.hsnCode,
          quantity: item.qty,
          unit: item.unit || 'pcs',
          rate: item.rate,
          discountPercent: item.discount,
          discountAmount: discountAmt,
          taxableAmount,
          taxRate: item.tax,
          cgstRate: item.tax / 2,
          cgstAmount: halfTax,
          sgstRate: item.tax / 2,
          sgstAmount: halfTax,
          igstRate: 0,
          igstAmount: 0,
          amount: taxableAmount + taxAmount
        }
      }
    })

    const taxableAmount = subtotal - totalDiscount
    const totalTaxAmount = totalCGST + totalSGST + totalIGST
    const grandTotalRaw = taxableAmount + totalTaxAmount
    const roundOff = Math.round(grandTotalRaw) - grandTotalRaw
    const grandTotal = Math.round(grandTotalRaw)
    const balanceDue = grandTotal - piAdvance

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + piValidDays)

    const proformaData: any = {
      proformaNumber: generateProformaNumber(),
      proformaDate: new Date().toISOString().split('T')[0],
      validUntil: validUntil.toISOString().split('T')[0],
      partyId: piSelectedCustomer?.id,
      partyName: customerName,
      partyPhone: piSelectedCustomer?.phone || '',
      partyEmail: piSelectedCustomer?.email || '',
      partyGSTIN: piSelectedCustomer?.gstDetails?.gstin || '',
      partyAddress: piSelectedCustomer?.billingAddress?.street || '',
      partyState: customerState,
      sellerState: companyState,
      items: calculatedItems,
      subtotal,
      discountAmount: totalDiscount,
      taxableAmount,
      cgstAmount: totalCGST,
      sgstAmount: totalSGST,
      igstAmount: totalIGST,
      totalTaxAmount,
      roundOff,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
      advanceReceived: piAdvance,
      balanceDue,
      notes: piNotes,
      termsAndConditions: piTerms,
      status: 'draft' as const
    }

    const result = await createProformaInvoice(proformaData)
    if (result) {
      toast.success(`Proforma Invoice ${result.proformaNumber} created!`)
      setShowCreateModal(false)
      // Reset form
      setPiCustomerSearch('')
      setPiSelectedCustomer(null)
      setPiItems([])
      setPiNotes('')
      setPiAdvance(0)
      setPiTerms(getDefaultTerms())
      loadProformaInvoices()
    }
  }

  const modules = [
    {
      id: 'online-store',
      title: t.more.onlineStore,
      description: t.more.onlineStoreDesc,
      icon: Storefront,
      color: 'primary',
      badge: 'Popular'
    },
    {
      id: 'delivery-challan',
      title: t.more.deliveryChallan,
      description: t.more.deliveryChallanDesc,
      icon: Truck,
      color: 'primary',
      badge: 'Popular'
    },
    {
      id: 'purchase-orders',
      title: t.more.purchaseOrders,
      description: t.more.purchaseOrdersDesc,
      icon: ShoppingBag,
      color: 'warning'
    },
    {
      id: 'credit-debit-notes',
      title: t.more.creditDebitNotes,
      description: t.more.creditDebitNotesDesc,
      icon: CreditCard,
      color: 'accent'
    },
    {
      id: 'payment-in',
      title: t.more.paymentIn,
      description: t.more.paymentInDesc,
      icon: Wallet,
      color: 'success',
      badge: 'Essential'
    },
    {
      id: 'payment-out',
      title: t.more.paymentOut,
      description: t.more.paymentOutDesc,
      icon: CurrencyCircleDollar,
      color: 'destructive',
      badge: 'Essential'
    },
    {
      id: 'eway-bill',
      title: t.more.ewayBill,
      description: t.more.ewayBillDesc,
      icon: FileArrowUp,
      color: 'primary',
      badge: 'GST'
    },
    {
      id: 'barcode-scanner',
      title: t.more.barcodeScanner,
      description: t.more.barcodeScannerDesc,
      icon: Barcode,
      color: 'accent',
      badge: 'New'
    },
    {
      id: 'barcode-generator',
      title: t.more.barcodeGenerator || 'Barcode Generator',
      description: t.more.barcodeGeneratorDesc || 'Generate barcodes for product labels',
      icon: Barcode,
      color: 'primary',
      badge: 'New'
    },
    {
      id: 'qr-scanner',
      title: t.more.qrCodeScanner,
      description: t.more.qrCodeScannerDesc,
      icon: QrCode,
      color: 'success'
    },
    {
      id: 'price-lists',
      title: t.more.priceLists,
      description: t.more.priceListsDesc,
      icon: Tag,
      color: 'warning'
    },
    {
      id: 'attendance',
      title: t.more.staffAttendance,
      description: t.more.staffAttendanceDesc,
      icon: CalendarCheck,
      color: 'primary'
    },
    {
      id: 'salary',
      title: t.more.salaryManagement,
      description: t.more.salaryManagementDesc,
      icon: Users,
      color: 'success'
    },
    {
      id: 'proforma',
      title: t.more.proformaInvoice,
      description: t.more.proformaInvoiceDesc,
      icon: Receipt,
      color: 'accent'
    },
    {
      id: 'item-serial',
      title: t.more.serialNumberTracking,
      description: t.more.serialNumberTrackingDesc,
      icon: ListNumbers,
      color: 'warning'
    },
    {
      id: 'notes',
      title: t.more.notes,
      description: t.more.notesDesc,
      icon: Notepad,
      color: 'primary'
    },
    {
      id: 'schemes',
      title: t.more.schemes,
      description: t.more.schemesDesc,
      icon: Gift,
      color: 'destructive'
    },
    {
      id: 'discounts',
      title: t.more.discountManagement,
      description: t.more.discountManagementDesc,
      icon: Percent,
      color: 'success'
    },
    {
      id: 'ledger',
      title: t.more.ledgerReport,
      description: t.more.ledgerReportDesc,
      icon: ClipboardText,
      color: 'accent'
    },
    {
      id: 'location',
      title: t.more.multipleLocations,
      description: t.more.multipleLocationsDesc,
      icon: MapPin,
      color: 'warning'
    },
    {
      id: 'whatsapp',
      title: t.more.whatsappIntegration,
      description: t.more.whatsappIntegrationDesc,
      icon: Phone,
      color: 'success',
      badge: 'Popular'
    },
    {
      id: 'upi',
      title: t.more.upiPaymentLinks,
      description: t.more.upiPaymentLinksDesc,
      icon: DeviceMobile,
      color: 'primary',
      badge: 'Popular'
    }
  ]

  return (
    <div className="min-h-screen p-3 sm:p-4 pb-20 lg:pb-4">
      {/* Quick Actions - 2 rows of 3 cards each */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t.more.quickActions}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Row 1: Proforma Invoice */}
          <div
            className={cn(
              "bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-4 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl",
              selectedModule === 'proforma' && "ring-2 ring-orange-300"
            )}
            onClick={() => handleModuleClick('proforma', t.more.proformaInvoice)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={24} weight="duotone" />
              <h3 className="text-sm font-bold line-clamp-1">{t.more.proformaInvoice}</h3>
            </div>
            <p className="text-xs text-white/80 mb-2 line-clamp-1">{t.more.proformaInvoiceDesc}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleModuleClick('proforma', t.more.proformaInvoice)
                if (hasFeature('performanceInvoice' as any)) {
                  setSelectedModule('proforma')
                  setShowCreateModal(true)
                }
              }}
              className="px-3 py-1.5 bg-white text-orange-600 rounded-lg text-xs font-semibold hover:bg-white/90 flex items-center gap-1"
            >
              <Plus size={14} weight="bold" /> {t.more.createNew}
            </button>
          </div>

          {/* Row 1: Delivery Challan */}
          <div
            className={cn(
              "bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl p-4 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl",
              selectedModule === 'delivery-challan' && "ring-2 ring-cyan-300"
            )}
            onClick={() => handleModuleClick('delivery-challan', t.more.deliveryChallan)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Truck size={24} weight="duotone" />
              <h3 className="text-sm font-bold line-clamp-1">{t.more.deliveryChallan}</h3>
            </div>
            <p className="text-xs text-white/80 mb-2 line-clamp-1">{t.more.deliveryChallanDesc}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleModuleClick('delivery-challan', t.more.deliveryChallan)
                if (hasFeature('deliveryChallan' as any)) {
                  setSelectedModule('delivery-challan')
                  setShowCreateModal(true)
                }
              }}
              className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-xs font-semibold hover:bg-white/90 flex items-center gap-1"
            >
              <Plus size={14} weight="bold" /> {t.more.createNew}
            </button>
          </div>

          {/* Row 1: Payment In */}
          <div
            className={cn(
              "bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl",
              selectedModule === 'payment-in' && "ring-2 ring-emerald-300"
            )}
            onClick={() => handleModuleClick('payment-in', t.more.paymentIn)}
          >
            <div className="flex items-center gap-2 mb-2">
              <CurrencyCircleDollar size={24} weight="duotone" />
              <h3 className="text-sm font-bold line-clamp-1">{t.more.paymentIn}</h3>
            </div>
            <p className="text-xs text-white/80 mb-2 line-clamp-1">{t.more.paymentInDesc}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleModuleClick('payment-in', t.more.paymentIn)
              }}
              className="px-3 py-1.5 bg-white text-green-600 rounded-lg text-xs font-semibold hover:bg-white/90 flex items-center gap-1"
            >
              <Plus size={14} weight="bold" /> {t.more.createNew}
            </button>
          </div>

          {/* Row 2: Payment Out */}
          <div
            className={cn(
              "bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl p-4 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl",
              selectedModule === 'payment-out' && "ring-2 ring-violet-300"
            )}
            onClick={() => handleModuleClick('payment-out', t.more.paymentOut)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={24} weight="duotone" />
              <h3 className="text-sm font-bold line-clamp-1">{t.more.paymentOut}</h3>
            </div>
            <p className="text-xs text-white/80 mb-2 line-clamp-1">{t.more.paymentOutDesc}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleModuleClick('payment-out', t.more.paymentOut)
              }}
              className="px-3 py-1.5 bg-white text-purple-600 rounded-lg text-xs font-semibold hover:bg-white/90 flex items-center gap-1"
            >
              <Plus size={14} weight="bold" /> {t.more.createNew}
            </button>
          </div>

          {/* Row 2: Barcode Generator */}
          <div
            className={cn(
              "bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl p-4 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl",
              selectedModule === 'barcode-generator' && "ring-2 ring-slate-400"
            )}
            onClick={() => handleModuleClick('barcode-generator', t.more.barcodeGenerator)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Barcode size={24} weight="duotone" />
              <h3 className="text-sm font-bold line-clamp-1">{t.more.barcodeGenerator}</h3>
            </div>
            <p className="text-xs text-white/80 mb-2 line-clamp-1">{t.more.barcodeGeneratorDesc}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleModuleClick('barcode-generator', t.more.barcodeGenerator)
              }}
              className="px-3 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-white/90 flex items-center gap-1"
            >
              <Plus size={14} weight="bold" /> Generate
            </button>
          </div>

          {/* Row 2: Barcode Scanner */}
          <div
            className={cn(
              "bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-4 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl",
              selectedModule === 'barcode-scanner' && "ring-2 ring-teal-300"
            )}
            onClick={() => handleModuleClick('barcode-scanner', t.more.barcodeScanner)}
          >
            <div className="flex items-center gap-2 mb-2">
              <QrCode size={24} weight="duotone" />
              <h3 className="text-sm font-bold line-clamp-1">{t.more.barcodeScanner}</h3>
            </div>
            <p className="text-xs text-white/80 mb-2 line-clamp-1">{t.more.barcodeScannerDesc}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleModuleClick('barcode-scanner', t.more.barcodeScanner)
              }}
              className="px-3 py-1.5 bg-white text-teal-600 rounded-lg text-xs font-semibold hover:bg-white/90 flex items-center gap-1"
            >
              <Plus size={14} weight="bold" /> Scan
            </button>
          </div>
        </div>
      </motion.div>

      {/* Module Details - Show IMMEDIATELY after Quick Actions when selected */}
      <AnimatePresence>
        {selectedModule && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            {selectedModule === 'proforma' && (
              <div className="bg-card rounded-lg shadow-lg border border-orange-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Receipt size={24} weight="duotone" className="text-orange-500" />
                    Proforma Invoices
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
                    >
                      <Plus size={16} /> New Proforma
                    </button>
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs text-muted-foreground">{t.more.total}</p>
                    <p className="text-xl font-bold">{proformaInvoices.length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-muted-foreground">{t.more.sent}</p>
                    <p className="text-xl font-bold text-blue-500">{proformaInvoices.filter(pi => pi.status === 'sent').length}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-muted-foreground">{t.more.accepted}</p>
                    <p className="text-xl font-bold text-green-500">{proformaInvoices.filter(pi => pi.status === 'accepted' || pi.status === 'converted').length}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-muted-foreground">{t.more.pending}</p>
                    <p className="text-xl font-bold text-yellow-600">{proformaInvoices.filter(pi => pi.status === 'draft' || pi.status === 'sent').length}</p>
                  </div>
                </div>

                {/* Proforma List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {proformaInvoices.length === 0 ? (
                    <div className="p-8 text-center bg-muted/30 rounded-lg border border-dashed">
                      <Receipt size={48} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">{t.more.noProformaInvoices}</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium"
                      >
                        Create Your First Proforma
                      </button>
                    </div>
                  ) : (
                    proformaInvoices.slice(0, 5).map((pi) => (
                      <div key={pi.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors border">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            pi.status === 'converted' ? "bg-green-100" :
                            pi.status === 'sent' ? "bg-blue-100" :
                            "bg-yellow-100"
                          )}>
                            <Receipt size={16} className={cn(
                              pi.status === 'converted' ? "text-green-500" :
                              pi.status === 'sent' ? "text-blue-500" :
                              "text-yellow-600"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{pi.proformaNumber}</p>
                            <p className="text-xs text-muted-foreground">{pi.partyName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">₹{pi.grandTotal?.toLocaleString() || 0}</p>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            pi.status === 'converted' ? "bg-green-100 text-green-600" :
                            pi.status === 'sent' ? "bg-blue-100 text-blue-600" :
                            "bg-yellow-100 text-yellow-600"
                          )}>
                            {pi.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedModule === 'delivery-challan' && (
              <div className="bg-card rounded-lg shadow-lg border border-cyan-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Truck size={24} weight="duotone" className="text-blue-500" />
                    Delivery Challans
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
                    >
                      <Plus size={16} /> New Challan
                    </button>
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-muted-foreground">{t.more.total}</p>
                    <p className="text-xl font-bold">{deliveryChallans.length}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-muted-foreground">{t.more.pending}</p>
                    <p className="text-xl font-bold text-yellow-600">{deliveryChallans.filter(dc => dc.status === 'pending').length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-muted-foreground">{t.more.inTransit}</p>
                    <p className="text-xl font-bold text-blue-500">{deliveryChallans.filter(dc => dc.status === 'in-transit').length}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-muted-foreground">{t.more.delivered}</p>
                    <p className="text-xl font-bold text-green-500">{deliveryChallans.filter(dc => dc.status === 'delivered').length}</p>
                  </div>
                </div>

                {/* Challans List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {deliveryChallans.length === 0 ? (
                    <div className="p-8 text-center bg-muted/30 rounded-lg border border-dashed">
                      <Truck size={48} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">{t.more.noDeliveryChallans}</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
                      >
                        Create Your First Challan
                      </button>
                    </div>
                  ) : (
                    deliveryChallans.slice(0, 5).map((dc) => (
                      <div key={dc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors border">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            dc.status === 'delivered' ? "bg-green-100" :
                            dc.status === 'in-transit' ? "bg-blue-100" :
                            "bg-yellow-100"
                          )}>
                            <Truck size={16} className={cn(
                              dc.status === 'delivered' ? "text-green-500" :
                              dc.status === 'in-transit' ? "text-blue-500" :
                              "text-yellow-600"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{dc.challanNumber}</p>
                            <p className="text-xs text-muted-foreground">{dc.customerName} • {dc.totalQuantity} items</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            dc.status === 'delivered' ? "bg-green-100 text-green-600" :
                            dc.status === 'in-transit' ? "bg-blue-100 text-blue-600" :
                            "bg-yellow-100 text-yellow-600"
                          )}>
                            {dc.status === 'in-transit' ? t.more.inTransit : dc.status}
                          </span>
                          {dc.status === 'pending' && (
                            <button
                              onClick={async () => {
                                await updateChallanStatus(dc.id, 'in-transit')
                                toast.success('Marked as In Transit')
                                loadDeliveryChallans()
                              }}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Start
                            </button>
                          )}
                          {dc.status === 'in-transit' && (
                            <button
                              onClick={async () => {
                                await updateChallanStatus(dc.id, 'delivered', new Date().toISOString().split('T')[0])
                                toast.success('Marked as Delivered!')
                                loadDeliveryChallans()
                              }}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Delivered
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Online Store */}
            {selectedModule === 'online-store' && (
              <div className="bg-card rounded-lg shadow-lg border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Storefront size={24} weight="duotone" className="text-primary" />
                    Online Store
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.location.href = '/online-store'}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                    >
                      Open Store Dashboard
                    </button>
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ShoppingCart size={24} weight="duotone" className="text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">156</p>
                        <p className="text-xs text-muted-foreground">{t.more.totalOrders}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-success">
                      <span>+23% this month</span>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-success/5 to-accent/5 rounded-lg border border-success/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <CurrencyCircleDollar size={24} weight="duotone" className="text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">₹4.6L</p>
                        <p className="text-xs text-muted-foreground">{t.more.revenue}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-success">
                      <span>+18% this month</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">{t.more.features}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-xs">{t.more.productCatalog}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-xs">{t.more.shoppingCart}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-xs">{t.more.paymentGateway}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-xs">{t.more.orderManagement}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-xs">{t.more.customDomain}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-xs">{t.more.mobileResponsive}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Orders */}
            {selectedModule === 'purchase-orders' && (
              <div className="bg-card rounded-lg shadow-lg border border-orange-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShoppingBag size={24} weight="duotone" className="text-warning" />
                    {t.more.purchaseOrders}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        loadPartiesAndItems()
                        setShowPOModal(true)
                      }}
                      className="px-4 py-2 bg-warning text-white rounded-lg text-sm font-medium hover:bg-warning/90"
                    >
                      + New PO
                    </button>
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {purchaseOrders.map((po) => (
                    <div key={po.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium">{po.poNumber}</p>
                        <p className="text-sm text-muted-foreground">{po.supplierName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{po.totalAmount.toLocaleString()}</p>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          po.status === 'approved' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        )}>
                          {po.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment In */}
            {selectedModule === 'payment-in' && (
              <div className="bg-card rounded-lg shadow-lg border border-green-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Wallet size={24} weight="duotone" className="text-success" />
                    {t.more.paymentIn}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        loadPartiesAndItems()
                        setShowPaymentInModal(true)
                      }}
                      className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90"
                    >
                      + Record Payment
                    </button>
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {/* Show both old payments and new allocated payments */}
                  {paymentsIn.length === 0 && allocatedPaymentsIn.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payments recorded yet
                    </div>
                  ) : (
                    <>
                      {/* New Allocated Payments (from PaymentAllocationModal) */}
                      {allocatedPaymentsIn.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-success/5 rounded-lg border border-success/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                              <Wallet size={20} weight="duotone" className="text-success" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.partyName}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {payment.mode}{payment.referenceNo ? ` • ${payment.referenceNo}` : ''}
                                {payment.allocations && payment.allocations.length > 0 && (
                                  <span className="ml-2 text-xs text-success">
                                    ({payment.allocations.length} invoice{payment.allocations.length > 1 ? 's' : ''})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-success">+₹{payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                      {/* Old Legacy Payments */}
                      {paymentsIn.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-success/5 rounded-lg border border-success/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                              <Wallet size={20} weight="duotone" className="text-success" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.partyName}</p>
                              <p className="text-sm text-muted-foreground capitalize">{payment.paymentMode}{payment.reference ? ` • ${payment.reference}` : ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-success">+₹{payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Payment Out */}
            {selectedModule === 'payment-out' && (
              <div className="bg-card rounded-lg shadow-lg border border-red-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <CurrencyCircleDollar size={24} weight="duotone" className="text-destructive" />
                    {t.more.paymentOut}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        loadPartiesAndItems()
                        setShowPaymentOutModal(true)
                      }}
                      className="px-4 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90"
                    >
                      + Record Payment
                    </button>
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {/* Show both old payments and new allocated payments */}
                  {paymentsOut.length === 0 && allocatedPaymentsOut.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payments recorded yet
                    </div>
                  ) : (
                    <>
                      {/* New Allocated Payments (from PaymentAllocationModal) */}
                      {allocatedPaymentsOut.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                              <CurrencyCircleDollar size={20} weight="duotone" className="text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.partyName}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {payment.mode}{payment.referenceNo ? ` • ${payment.referenceNo}` : ''}
                                {payment.allocations && payment.allocations.length > 0 && (
                                  <span className="ml-2 text-xs text-destructive">
                                    ({payment.allocations.length} bill{payment.allocations.length > 1 ? 's' : ''})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-destructive">-₹{payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                      {/* Old Legacy Payments */}
                      {paymentsOut.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                              <CurrencyCircleDollar size={20} weight="duotone" className="text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.partyName}</p>
                              <p className="text-sm text-muted-foreground capitalize">{payment.paymentMode}{payment.reference ? ` • ${payment.reference}` : ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-destructive">-₹{payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Price Lists */}
            {selectedModule === 'price-lists' && (
              <div className="bg-card rounded-lg shadow-lg border border-yellow-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Tag size={24} weight="duotone" className="text-warning" />
                    {t.more.priceLists}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPriceListModal(true)}
                      className="px-4 py-2 bg-warning text-white rounded-lg text-sm font-medium hover:bg-warning/90"
                    >
                      + New Price List
                    </button>
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {priceLists.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No price lists created yet
                    </div>
                  ) : priceLists.map((list) => (
                    <div key={list.id} className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{list.name}</h4>
                          {list.isDefault && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setPlName(list.name)
                            setPlDiscount(list.discount)
                            setPlIsDefault(list.isDefault)
                            setShowPriceListModal(true)
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {list.discount > 0 ? `${list.discount}% discount` : 'No discount'} • {list.itemCount || 0} items
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E-Way Bill */}
            {selectedModule === 'eway-bill' && (
              <div className="bg-card rounded-lg shadow-lg border border-purple-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileArrowUp size={24} weight="duotone" className="text-primary" />
                    {t.more.ewayBill}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        loadPartiesAndItems()
                        setShowEwayBillModal(true)
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                    >
                      + Generate E-Way Bill
                    </button>
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* E-Way Bills List */}
                {ewayBillsList.length > 0 ? (
                  <div className="space-y-3">
                    {ewayBillsList.map((bill, idx) => (
                      <div key={idx} className="p-4 bg-white border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-bold text-primary">{bill.ewbNo}</p>
                          <p className="text-sm text-muted-foreground">Doc: {bill.docNo} | {bill.ewbDate}</p>
                          <p className="text-xs text-muted-foreground">From: {bill.fromGstin} → To: {bill.toGstin}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{bill.totalValue.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Valid: {bill.validUpto}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            bill.status === 'active' ? 'bg-green-100 text-green-700' :
                            bill.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {bill.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-primary/5 rounded-lg border border-primary/20 text-center">
                    <FileArrowUp size={48} weight="duotone" className="text-primary mx-auto mb-4" />
                    <h3 className="font-bold mb-2">Generate E-Way Bills</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate E-Way bills for goods transportation as per GST rules
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="p-3 bg-background rounded">
                        <p className="text-xs text-muted-foreground">{t.more.totalGenerated}</p>
                        <p className="text-xl font-bold">{ewayBillsList.length}</p>
                      </div>
                      <div className="p-3 bg-background rounded">
                        <p className="text-xs text-muted-foreground">{t.more.active}</p>
                        <p className="text-xl font-bold">{ewayBillsList.filter(b => b.status === 'active').length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Barcode Scanner */}
            {selectedModule === 'barcode-scanner' && (
              <div className="bg-card rounded-lg shadow-lg border border-orange-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Barcode size={24} weight="duotone" className="text-accent" />
                    {t.more.barcodeScanner}
                  </h2>
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-8 bg-accent/5 rounded-lg border border-accent/20 text-center">
                  <Barcode size={64} weight="duotone" className="text-accent mx-auto mb-4" />
                  <h3 className="font-bold mb-2">{t.more.scanProductBarcodes}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t.more.barcodeScannerDesc}
                  </p>
                  <button
                    onClick={() => setShowBarcodeScanner(true)}
                    className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
                  >
                    {t.more.openScanner}
                  </button>
                </div>
              </div>
            )}

            {/* Barcode Generator */}
            {selectedModule === 'barcode-generator' && (
              <div className="bg-card rounded-lg shadow-lg border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Barcode size={24} weight="duotone" className="text-primary" />
                    {t.more.barcodeGenerator || 'Barcode Generator'}
                  </h2>
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Search and Select Product */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t.more.selectProduct || 'Select Product'}
                    </label>

                    {/* Action Buttons - Scan & Add New */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setShowBarcodeScanner(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors"
                      >
                        <Barcode size={20} />
                        {t.more.scanBarcode || 'Scan Barcode'}
                      </button>
                      <button
                        onClick={() => {
                          // Navigate to inventory to add new product
                          window.location.href = '/inventory?action=add'
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success/10 text-success border border-success/30 rounded-lg hover:bg-success/20 transition-colors"
                      >
                        <Plus size={20} />
                        {t.more.addNewProduct || 'Add New Product'}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={barcodeSearchQuery}
                        onChange={(e) => {
                          setBarcodeSearchQuery(e.target.value)
                          // Filter items based on search
                          if (e.target.value.length > 0) {
                            getItems().then(items => {
                              const filtered = items.filter(item =>
                                item.name.toLowerCase().includes(e.target.value.toLowerCase()) ||
                                (item.barcode && item.barcode.includes(e.target.value)) ||
                                (item.itemCode && item.itemCode.toLowerCase().includes(e.target.value.toLowerCase()))
                              )
                              setBarcodeItems(filtered.slice(0, 10)) // Limit to 10 results
                            })
                          } else {
                            // Show all items when empty (limited)
                            getItems().then(items => {
                              setBarcodeItems(items.slice(0, 10))
                            })
                          }
                        }}
                        onFocus={() => {
                          // Show items on focus
                          if (barcodeSearchQuery.length === 0) {
                            getItems().then(items => {
                              setBarcodeItems(items.slice(0, 10))
                            })
                          }
                        }}
                        placeholder={t.more.searchProductBarcode || 'Search by product name, code or barcode...'}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {barcodeItems.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-72 overflow-auto">
                          {barcodeItems.map(item => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedBarcodeItem(item)
                                setBarcodeSearchQuery('')
                                setBarcodeItems([])
                              }}
                              className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.itemCode && <span className="mr-2">Code: {item.itemCode}</span>}
                                    {item.barcode ? <span>Barcode: {item.barcode}</span> : <span className="text-warning">No barcode set</span>}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-primary">₹{item.salePrice}</div>
                                  <div className="text-xs text-muted-foreground">Stock: {item.stock || 0}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Product Info */}
                  {selectedBarcodeItem && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{selectedBarcodeItem.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t.more.barcode || 'Barcode'}: {selectedBarcodeItem.barcode || <span className="text-warning">Not set (will use product ID)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t.more.price || 'Price'}: ₹{selectedBarcodeItem.salePrice}
                          </p>
                          {selectedBarcodeItem.itemCode && (
                            <p className="text-sm text-muted-foreground">
                              Code: {selectedBarcodeItem.itemCode}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedBarcodeItem(null)
                            setBarcodeSearchQuery('')
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t.more.quantity || 'Quantity'} ({t.more.numberOfLabels || 'Number of Labels'})
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBarcodeQuantity(Math.max(1, barcodeQuantity - 1))}
                        className="px-4 py-3 bg-muted rounded-lg hover:bg-muted/80 font-bold text-lg"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={barcodeQuantity}
                        onChange={(e) => setBarcodeQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                        className="flex-1 px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-center text-lg font-bold"
                      />
                      <button
                        onClick={() => setBarcodeQuantity(Math.min(500, barcodeQuantity + 1))}
                        className="px-4 py-3 bg-muted rounded-lg hover:bg-muted/80 font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[10, 25, 50, 100].map(qty => (
                        <button
                          key={qty}
                          onClick={() => setBarcodeQuantity(qty)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                            barcodeQuantity === qty
                              ? "bg-primary text-white"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selection with Dimensions */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t.more.labelSize || 'Label Size'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'small' as const, name: t.more.small || 'Small', width: '38mm', height: '25mm', desc: '1.5" × 1"' },
                        { key: 'medium' as const, name: t.more.medium || 'Medium', width: '50mm', height: '25mm', desc: '2" × 1"' },
                        { key: 'large' as const, name: t.more.large || 'Large', width: '75mm', height: '38mm', desc: '3" × 1.5"' }
                      ].map(size => (
                        <button
                          key={size.key}
                          onClick={() => setBarcodeSize(size.key)}
                          className={cn(
                            "py-4 px-4 rounded-lg border-2 transition-all text-left",
                            barcodeSize === size.key
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="font-bold">{size.name}</div>
                          <div className="text-sm text-muted-foreground">{size.width} × {size.height}</div>
                          <div className="text-xs text-muted-foreground mt-1">{size.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 {t.more.labelSizeHint || 'Standard label rolls: 38×25mm (small), 50×25mm (medium), 75×38mm (large)'}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="text-sm font-medium mb-2">{t.more.labelOptions || 'Label Options'}</div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showProductName}
                        onChange={(e) => setShowProductName(e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>{t.more.showProductName || 'Show Product Name'}</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPrice}
                        onChange={(e) => setShowPrice(e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>{t.more.showPrice || 'Show Price'}</span>
                    </label>
                  </div>

                  {/* Add to Print Queue */}
                  <button
                    onClick={() => {
                      if (selectedBarcodeItem) {
                        setGeneratedBarcodes(prev => [...prev, { item: selectedBarcodeItem, quantity: barcodeQuantity }])
                        setSelectedBarcodeItem(null)
                        setBarcodeSearchQuery('')
                        setBarcodeQuantity(1)
                        toast.success(t.more.addedToPrintQueue || 'Added to print queue')
                      }
                    }}
                    disabled={!selectedBarcodeItem}
                    className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    {t.more.addToPrintQueue || 'Add to Print Queue'}
                  </button>

                  {/* Print Queue */}
                  {generatedBarcodes.length > 0 && (
                    <div className="mt-6 p-4 bg-success/5 rounded-lg border border-success/20">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold flex items-center gap-2">
                          <CheckCircle size={20} className="text-success" />
                          {t.more.printQueue || 'Print Queue'} ({generatedBarcodes.reduce((acc, b) => acc + b.quantity, 0)} {t.more.labels || 'labels'})
                        </h3>
                        <button
                          onClick={() => setGeneratedBarcodes([])}
                          className="text-sm text-destructive hover:underline"
                        >
                          {t.more.clearAll || 'Clear All'}
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-auto">
                        {generatedBarcodes.map((barcode, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
                            <div>
                              <div className="font-medium">{barcode.item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {barcode.quantity} {t.more.labels || 'labels'} • ₹{barcode.item.salePrice}
                              </div>
                            </div>
                            <button
                              onClick={() => setGeneratedBarcodes(prev => prev.filter((_, i) => i !== index))}
                              className="p-1 hover:bg-muted rounded text-destructive"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Print Info */}
                      <div className="mt-4 p-3 bg-background rounded-lg text-sm">
                        <div className="font-medium mb-1">{t.more.printingInfo || 'Printing Information'}:</div>
                        <ul className="text-muted-foreground space-y-1">
                          <li>• {t.more.labelSizeSelected || 'Label Size'}: {barcodeSize === 'small' ? '38mm × 25mm (1.5" × 1")' : barcodeSize === 'medium' ? '50mm × 25mm (2" × 1")' : '75mm × 38mm (3" × 1.5")'}</li>
                          <li>• {t.more.totalLabels || 'Total Labels'}: {generatedBarcodes.reduce((acc, b) => acc + b.quantity, 0)}</li>
                          <li>• {t.more.barcodeFormat || 'Barcode Format'}: CODE128</li>
                        </ul>
                      </div>

                      {/* Print Buttons */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            // Preview barcodes
                            const printWindow = window.open('', '_blank')
                            if (printWindow) {
                              const sizeStyles = {
                                small: { width: '38mm', height: '25mm', fontSize: '7px', barcodeHeight: 20, barcodeWidth: 1.2 },
                                medium: { width: '50mm', height: '25mm', fontSize: '8px', barcodeHeight: 25, barcodeWidth: 1.5 },
                                large: { width: '75mm', height: '38mm', fontSize: '10px', barcodeHeight: 35, barcodeWidth: 2 }
                              }
                              const style = sizeStyles[barcodeSize]

                              let labelsHtml = ''
                              generatedBarcodes.forEach(({ item, quantity }) => {
                                for (let i = 0; i < quantity; i++) {
                                  labelsHtml += `
                                    <div class="label" style="
                                      width: ${style.width};
                                      height: ${style.height};
                                      border: 1px dashed #ccc;
                                      padding: 2mm;
                                      display: inline-flex;
                                      flex-direction: column;
                                      align-items: center;
                                      justify-content: center;
                                      margin: 1mm;
                                      box-sizing: border-box;
                                      page-break-inside: avoid;
                                      overflow: hidden;
                                    ">
                                      ${showProductName ? `<div style="font-size: ${style.fontSize}; font-weight: bold; text-align: center; margin-bottom: 1mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${item.name}</div>` : ''}
                                      <svg id="barcode-${item.id}-${i}"></svg>
                                      ${showPrice ? `<div style="font-size: ${style.fontSize}; font-weight: bold; margin-top: 1mm;">₹${item.salePrice}</div>` : ''}
                                    </div>
                                  `
                                }
                              })

                              printWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                  <title>Barcode Labels - Preview</title>
                                  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
                                  <style>
                                    * { margin: 0; padding: 0; box-sizing: border-box; }
                                    @media print {
                                      body { margin: 0; padding: 0; }
                                      @page {
                                        margin: 2mm;
                                        size: auto;
                                      }
                                      .no-print { display: none !important; }
                                      .label { border: none !important; }
                                    }
                                    body {
                                      font-family: Arial, sans-serif;
                                      display: flex;
                                      flex-wrap: wrap;
                                      align-content: flex-start;
                                      padding: 5mm;
                                      background: #f5f5f5;
                                    }
                                    .print-header {
                                      width: 100%;
                                      padding: 10px 20px;
                                      background: #fff;
                                      border-bottom: 1px solid #ddd;
                                      display: flex;
                                      justify-content: space-between;
                                      align-items: center;
                                      margin-bottom: 10px;
                                    }
                                    .print-btn {
                                      padding: 10px 30px;
                                      background: #22c55e;
                                      color: white;
                                      border: none;
                                      border-radius: 8px;
                                      font-size: 16px;
                                      font-weight: bold;
                                      cursor: pointer;
                                    }
                                    .print-btn:hover { background: #16a34a; }
                                    .label { background: white; }
                                  </style>
                                </head>
                                <body>
                                  <div class="print-header no-print">
                                    <div>
                                      <strong>Label Preview</strong> - ${generatedBarcodes.reduce((acc, b) => acc + b.quantity, 0)} labels (${barcodeSize === 'small' ? '38×25mm' : barcodeSize === 'medium' ? '50×25mm' : '75×38mm'})
                                    </div>
                                    <button class="print-btn" onclick="window.print()">🖨️ Print Labels</button>
                                  </div>
                                  ${labelsHtml}
                                  <script>
                                    window.onload = function() {
                                      ${generatedBarcodes.map(({ item, quantity }) => {
                                        let scripts = ''
                                        for (let i = 0; i < quantity; i++) {
                                          const barcodeValue = item.barcode || item.id || 'NOCODE'
                                          scripts += `
                                            try {
                                              JsBarcode("#barcode-${item.id}-${i}", "${barcodeValue}", {
                                                format: "CODE128",
                                                width: ${sizeStyles[barcodeSize].barcodeWidth},
                                                height: ${sizeStyles[barcodeSize].barcodeHeight},
                                                displayValue: true,
                                                fontSize: ${parseInt(style.fontSize)},
                                                margin: 0,
                                                textMargin: 1
                                              });
                                            } catch(e) {
                                              console.error('Barcode error:', e);
                                              document.getElementById('barcode-${item.id}-${i}').innerHTML = '<text>Invalid</text>';
                                            }
                                          `
                                        }
                                        return scripts
                                      }).join('')}
                                    }
                                  <\/script>
                                </body>
                                </html>
                              `)
                              printWindow.document.close()
                            }
                          }}
                          className="flex-1 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        >
                          <QrCode size={20} />
                          {t.more.previewLabels || 'Preview Labels'}
                        </button>
                        <button
                          onClick={() => {
                            // Direct print
                            const printWindow = window.open('', '_blank')
                            if (printWindow) {
                              const sizeStyles = {
                                small: { width: '38mm', height: '25mm', fontSize: '7px', barcodeHeight: 20, barcodeWidth: 1.2 },
                                medium: { width: '50mm', height: '25mm', fontSize: '8px', barcodeHeight: 25, barcodeWidth: 1.5 },
                                large: { width: '75mm', height: '38mm', fontSize: '10px', barcodeHeight: 35, barcodeWidth: 2 }
                              }
                              const style = sizeStyles[barcodeSize]

                              let labelsHtml = ''
                              generatedBarcodes.forEach(({ item, quantity }) => {
                                for (let i = 0; i < quantity; i++) {
                                  labelsHtml += `
                                    <div class="label" style="
                                      width: ${style.width};
                                      height: ${style.height};
                                      padding: 2mm;
                                      display: inline-flex;
                                      flex-direction: column;
                                      align-items: center;
                                      justify-content: center;
                                      margin: 0;
                                      box-sizing: border-box;
                                      page-break-inside: avoid;
                                      overflow: hidden;
                                    ">
                                      ${showProductName ? `<div style="font-size: ${style.fontSize}; font-weight: bold; text-align: center; margin-bottom: 1mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${item.name}</div>` : ''}
                                      <svg id="barcode-${item.id}-${i}"></svg>
                                      ${showPrice ? `<div style="font-size: ${style.fontSize}; font-weight: bold; margin-top: 1mm;">₹${item.salePrice}</div>` : ''}
                                    </div>
                                  `
                                }
                              })

                              printWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                  <title>Print Labels</title>
                                  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
                                  <style>
                                    * { margin: 0; padding: 0; box-sizing: border-box; }
                                    @media print {
                                      body { margin: 0; padding: 0; }
                                      @page { margin: 0; size: auto; }
                                    }
                                    body {
                                      font-family: Arial, sans-serif;
                                      display: flex;
                                      flex-wrap: wrap;
                                      align-content: flex-start;
                                      padding: 0;
                                    }
                                    .label { background: white; }
                                  </style>
                                </head>
                                <body>
                                  ${labelsHtml}
                                  <script>
                                    window.onload = function() {
                                      ${generatedBarcodes.map(({ item, quantity }) => {
                                        let scripts = ''
                                        for (let i = 0; i < quantity; i++) {
                                          const barcodeValue = item.barcode || item.id || 'NOCODE'
                                          scripts += `
                                            try {
                                              JsBarcode("#barcode-${item.id}-${i}", "${barcodeValue}", {
                                                format: "CODE128",
                                                width: ${sizeStyles[barcodeSize].barcodeWidth},
                                                height: ${sizeStyles[barcodeSize].barcodeHeight},
                                                displayValue: true,
                                                fontSize: ${parseInt(style.fontSize)},
                                                margin: 0,
                                                textMargin: 1
                                              });
                                            } catch(e) { console.error(e); }
                                          `
                                        }
                                        return scripts
                                      }).join('')}
                                      setTimeout(function() { window.print(); window.close(); }, 800);
                                    }
                                  <\/script>
                                </body>
                                </html>
                              `)
                              printWindow.document.close()
                            }
                          }}
                          className="flex-1 py-3 bg-success text-white rounded-lg font-medium hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                        >
                          <Barcode size={20} />
                          {t.more.printNow || 'Print Now'}
                        </button>
                      </div>

                      {/* Printing Tips */}
                      <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20 text-sm">
                        <div className="font-medium text-warning mb-1">💡 {t.more.printingTips || 'Printing Tips'}:</div>
                        <ul className="text-muted-foreground space-y-1 text-xs">
                          <li>• Use a thermal label printer for best results</li>
                          <li>• Set printer margins to 0 or minimum</li>
                          <li>• Select correct paper size in printer settings</li>
                          <li>• For regular printers, use sticker paper sheets</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* QR Scanner */}
            {selectedModule === 'qr-scanner' && (
              <div className="bg-card rounded-lg shadow-lg border border-green-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <QrCode size={24} weight="duotone" className="text-success" />
                    {t.more.qrCodeScanner}
                  </h2>
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-8 bg-success/5 rounded-lg border border-success/20 text-center">
                  <QrCode size={64} weight="duotone" className="text-success mx-auto mb-4" />
                  <h3 className="font-bold mb-2">{t.more.scanQrCodes}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t.more.qrCodeScannerDesc}
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">{t.more.upiPayments}</p>
                      <p className="text-lg font-bold text-success">₹2.4L</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">{t.more.scansToday}</p>
                      <p className="text-lg font-bold">18</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">{t.more.successRate}</p>
                      <p className="text-lg font-bold">98%</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="px-6 py-3 bg-success text-white rounded-lg font-medium hover:bg-success/90 transition-colors"
                  >
                    {t.more.openScanner}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Other Features Section */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t.more.allFeatures}</h2>

      {/* Features Grid - Same size as Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {modules.filter(m => !['proforma', 'delivery-challan', 'payment-in', 'payment-out', 'barcode-generator', 'barcode-scanner'].includes(m.id)).map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => handleModuleClick(module.id, module.title)}
              className={cn(
                "bg-card rounded-xl shadow-lg border p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl relative",
                selectedModule === module.id ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
              )}
            >
              {module.badge && (
                <span className={cn(
                  "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium",
                  module.badge === 'Popular' && "bg-success/10 text-success",
                  module.badge === 'Essential' && "bg-primary/10 text-primary",
                  module.badge === 'New' && "bg-accent/10 text-accent",
                  module.badge === 'GST' && "bg-warning/10 text-warning"
                )}>
                  {module.badge === 'Popular' ? t.more.badgePopular :
                   module.badge === 'Essential' ? t.more.badgeEssential :
                   module.badge === 'New' ? t.more.badgeNew :
                   module.badge === 'GST' ? t.more.badgeGst : module.badge}
                </span>
              )}
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                module.color === 'primary' && "bg-primary/10",
                module.color === 'accent' && "bg-accent/10",
                module.color === 'success' && "bg-success/10",
                module.color === 'warning' && "bg-warning/10",
                module.color === 'destructive' && "bg-destructive/10"
              )}>
                <module.icon
                  size={24}
                  className={cn(
                    module.color === 'primary' && "text-primary",
                    module.color === 'accent' && "text-accent",
                    module.color === 'success' && "text-success",
                    module.color === 'warning' && "text-warning",
                    module.color === 'destructive' && "text-destructive"
                  )}
                  weight="duotone"
                />
              </div>
              <h3 className="font-semibold text-sm mb-1 line-clamp-1">{module.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{module.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Create Delivery Challan Modal */}
        <AnimatePresence>
          {showCreateModal && selectedModule === 'delivery-challan' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Truck size={20} />
                        {t.more.deliveryChallanTitle}
                      </h3>
                      <p className="text-xs text-white/80">{t.more.goodsDeliveryWithoutInvoice}</p>
                    </div>
                    <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg text-white">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-5 bg-white">
                  {/* Customer & Purpose */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t.more.partyCustomer} *</label>
                      <input
                        type="text"
                        name="dc-customer-search-field"
                        value={dcSelectedCustomer ? getPartyName(dcSelectedCustomer) : dcCustomerSearch}
                        onChange={e => {
                          setDcCustomerSearch(e.target.value)
                          setDcSelectedCustomer(null)
                        }}
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        aria-autocomplete="none"
                        list=""
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                        placeholder={t.more.searchOrTypeParty}
                      />
                      {dcCustomerSearch && dcCustomerSearch.trim().length > 0 && (() => {
                        const filteredParties = availableParties.filter(p => getPartyName(p).toLowerCase().includes(dcCustomerSearch.toLowerCase())).slice(0, 5);
                        if (filteredParties.length === 0) return null;
                        return (
                          <div className="relative">
                            <div className="absolute left-0 right-0 top-0 z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                              {filteredParties.map(party => (
                                <div
                                  key={party.id}
                                  onMouseDown={() => {
                                    setDcSelectedCustomer(party)
                                    setDcCustomerSearch('')
                                  }}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                >
                                  <p className="font-medium">{getPartyName(party)}</p>
                                  <p className="text-xs text-gray-500">{party.phone}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {dcSelectedCustomer && (
                        <div className="mt-1 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          ✓ {getPartyName(dcSelectedCustomer)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t.more.purpose} *</label>
                      <select
                        value={dcPurpose}
                        onChange={e => setDcPurpose(e.target.value as ChallanPurpose)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      >
                        {Object.entries(CHALLAN_PURPOSE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reference */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.more.reference}</label>
                    <input
                      type="text"
                      value={dcReference}
                      onChange={e => setDcReference(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g., PO-2025-001 or Order Ref"
                    />
                  </div>

                  {/* Add Item Search */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.more.addItems} *</label>
                    <input
                      type="text"
                      name="dc-item-search-field"
                      value={dcItemSearch}
                      onChange={e => setDcItemSearch(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      aria-autocomplete="none"
                      list=""
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                      placeholder={t.more.searchItems}
                    />
                    {dcItemSearch.trim().length > 0 && (() => {
                      const filteredItems = availableItems.filter(item => item.name.toLowerCase().includes(dcItemSearch.toLowerCase())).slice(0, 8);
                      if (filteredItems.length === 0) return null;
                      return (
                        <div className="relative">
                          <div className="absolute left-0 right-0 top-0 z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {filteredItems.map(item => (
                              <div
                                key={item.id}
                                onMouseDown={() => {
                                  setDcItems([...dcItems, {
                                    itemId: item.id,
                                    name: item.name,
                                    hsnCode: item.hsnCode,
                                    qty: 1,
                                    unit: item.unit || 'PCS',
                                    rate: item.sellingPrice || 0
                                  }])
                                  setDcItemSearch('')
                                }}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex justify-between"
                              >
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-xs text-gray-500">Stock: {item.stock} {item.unit}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Items Table */}
                  {dcItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="text-left p-2 font-medium">Item</th>
                            <th className="text-center p-2 font-medium w-20">Qty</th>
                            <th className="text-center p-2 font-medium w-20">Unit</th>
                            <th className="text-right p-2 font-medium w-24">Rate (Optional)</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dcItems.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={e => {
                                    const updated = [...dcItems]
                                    updated[i].name = e.target.value
                                    setDcItems(updated)
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                                {item.hsnCode && <span className="text-xs text-muted-foreground">HSN: {item.hsnCode}</span>}
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={e => {
                                    const updated = [...dcItems]
                                    updated[i].qty = parseInt(e.target.value) || 1
                                    setDcItems(updated)
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm text-center"
                                  min="1"
                                />
                              </td>
                              <td className="p-2">
                                <select
                                  value={item.unit}
                                  onChange={e => {
                                    const updated = [...dcItems]
                                    updated[i].unit = e.target.value
                                    setDcItems(updated)
                                  }}
                                  className="w-full px-1 py-1 border rounded text-sm"
                                >
                                  <option value="PCS">PCS</option>
                                  <option value="KGS">KGS</option>
                                  <option value="LTRS">LTRS</option>
                                  <option value="MTR">MTR</option>
                                  <option value="BOX">BOX</option>
                                  <option value="SET">SET</option>
                                </select>
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={item.rate || ''}
                                  onChange={e => {
                                    const updated = [...dcItems]
                                    updated[i].rate = parseFloat(e.target.value) || 0
                                    setDcItems(updated)
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm text-right"
                                  placeholder="₹"
                                />
                              </td>
                              <td className="p-2">
                                <button
                                  onClick={() => setDcItems(dcItems.filter((_, idx) => idx !== i))}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {dcItems.length === 0 && (
                    <div className="py-8 border-2 border-dashed border-muted-foreground/30 rounded-lg text-center text-muted-foreground">
                      <p className="text-sm">Search and add items to deliver</p>
                    </div>
                  )}

                  {/* Summary */}
                  {dcItems.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
                      <span className="font-medium">Total Quantity:</span>
                      <span className="text-xl font-bold text-blue-600">
                        {dcItems.reduce((sum, item) => sum + item.qty, 0)} items
                      </span>
                    </div>
                  )}

                  {/* Transport Details */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Truck size={16} /> {t.more.transporterName} ({t.common.optional})
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">{t.more.vehicleNumber}</label>
                        <input
                          type="text"
                          value={dcVehicleNo}
                          onChange={e => setDcVehicleNo(e.target.value.toUpperCase())}
                          className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                          placeholder="MH04 AB 1234"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">{t.more.transporterName}</label>
                        <input
                          type="text"
                          value={dcTransporterName}
                          onChange={e => setDcTransporterName(e.target.value)}
                          className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                          placeholder="ABC Logistics"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">{t.more.driverName}</label>
                        <input
                          type="text"
                          value={dcDriverName}
                          onChange={e => setDcDriverName(e.target.value)}
                          className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                          placeholder={t.more.driverName}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.more.remarks}</label>
                    <textarea
                      value={dcRemarks}
                      onChange={e => setDcRemarks(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      rows={2}
                      placeholder={t.more.additionalNotes}
                    />
                  </div>
                </div>

                <div className="p-4 border-t border-border flex gap-3 bg-muted/30">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleCreateDeliveryChallan}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <Truck size={16} />
                    {t.more.createDeliveryChallan}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Proforma Invoice Modal */}
        <AnimatePresence>
          {showCreateModal && selectedModule === 'proforma' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Header with Proforma Badge */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-500 to-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Receipt size={20} />
                        {t.more.proformaInvoiceTitle}
                      </h3>
                      <p className="text-xs text-white/80">{t.more.notForTaxPurposes}</p>
                    </div>
                    <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg text-white">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5 bg-white">
                  {/* Customer Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t.more.selectCustomer} *</label>
                      <input
                        type="text"
                        name="pi-customer-search-field"
                        value={piSelectedCustomer ? getPartyName(piSelectedCustomer) : piCustomerSearch}
                        onChange={e => {
                          setPiCustomerSearch(e.target.value)
                          setPiSelectedCustomer(null)
                        }}
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        aria-autocomplete="none"
                        list=""
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                        placeholder={t.more.searchCustomer}
                      />
                      {piCustomerSearch && piCustomerSearch.trim().length > 0 && (() => {
                        const filteredParties = availableParties.filter(p => getPartyName(p).toLowerCase().includes(piCustomerSearch.toLowerCase())).slice(0, 5);
                        if (filteredParties.length === 0) return null;
                        return (
                          <div className="relative">
                            <div className="absolute left-0 right-0 top-0 z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                              {filteredParties.map(party => (
                                <div
                                  key={party.id}
                                  onMouseDown={() => {
                                    setPiSelectedCustomer(party)
                                    setPiCustomerSearch('')
                                  }}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                >
                                  <p className="font-medium">{getPartyName(party)}</p>
                                  <p className="text-xs text-gray-500">{party.phone} • {party.billingAddress?.state}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {piSelectedCustomer && (
                        <div className="mt-1 p-2 bg-green-50 rounded text-xs text-green-700">
                          ✓ {getPartyName(piSelectedCustomer)} | {piSelectedCustomer.gstDetails?.gstin || t.more.noGstin} | {piSelectedCustomer.billingAddress?.state}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t.more.validFor}</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={piValidDays}
                          onChange={e => setPiValidDays(parseInt(e.target.value) || 15)}
                          className="w-20 px-3 py-2 border rounded-lg text-sm text-center"
                          min="1"
                          max="90"
                        />
                        <span className="text-sm text-muted-foreground">{t.more.days}</span>
                      </div>
                    </div>
                  </div>

                  {/* Add Item Search */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.more.addItems} *</label>
                    <input
                      type="text"
                      name="pi-item-search-field"
                      value={piItemSearch}
                      onChange={e => setPiItemSearch(e.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      aria-autocomplete="none"
                      list=""
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                      placeholder={t.more.searchItemsHsn}
                    />
                    {piItemSearch.trim().length > 0 && (() => {
                      const filtered = availableItems.filter(item =>
                        item.name.toLowerCase().includes(piItemSearch.toLowerCase()) ||
                        (item.hsnCode && item.hsnCode.includes(piItemSearch))
                      ).slice(0, 8);
                      if (filtered.length === 0) return null;
                      return (
                        <div className="relative">
                          <div className="absolute left-0 right-0 top-0 z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {filtered.map(item => (
                              <div
                                key={item.id}
                                onMouseDown={() => {
                                  const taxRate = (item.tax?.cgst || 0) + (item.tax?.sgst || 0) + (item.tax?.igst || 0)
                                  setPiItems([...piItems, {
                                    itemId: item.id,
                                    name: item.name,
                                    hsnCode: item.hsnCode,
                                    qty: 1,
                                    rate: item.sellingPrice || item.mrp || 0,
                                    discount: 0,
                                    tax: taxRate || 18,
                                    unit: item.unit || 'PCS'
                                  }])
                                  setPiItemSearch('')
                                }}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex justify-between"
                              >
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-xs text-gray-500">HSN: {item.hsnCode || 'N/A'} • {item.unit}</p>
                                </div>
                                <p className="text-blue-600 font-medium">₹{item.sellingPrice || item.mrp || 0}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Items Table */}
                  {piItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">Item</th>
                            <th className="text-center p-2 font-medium w-16">Qty</th>
                            <th className="text-right p-2 font-medium w-20">Rate</th>
                            <th className="text-center p-2 font-medium w-16">Disc%</th>
                            <th className="text-center p-2 font-medium w-16">GST%</th>
                            <th className="text-right p-2 font-medium w-24">Amount</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {piItems.map((item, i) => {
                            const lineTotal = item.qty * item.rate
                            const discAmt = lineTotal * (item.discount / 100)
                            const taxable = lineTotal - discAmt
                            const taxAmt = taxable * (item.tax / 100)
                            const amount = taxable + taxAmt
                            return (
                              <tr key={i} className="border-t">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={e => {
                                      const updated = [...piItems]
                                      updated[i].name = e.target.value
                                      setPiItems(updated)
                                    }}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                  />
                                  {item.hsnCode && <span className="text-xs text-muted-foreground">HSN: {item.hsnCode}</span>}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={item.qty}
                                    onChange={e => {
                                      const updated = [...piItems]
                                      updated[i].qty = parseInt(e.target.value) || 1
                                      setPiItems(updated)
                                    }}
                                    className="w-full px-2 py-1 border rounded text-sm text-center"
                                    min="1"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={item.rate}
                                    onChange={e => {
                                      const updated = [...piItems]
                                      updated[i].rate = parseFloat(e.target.value) || 0
                                      setPiItems(updated)
                                    }}
                                    className="w-full px-2 py-1 border rounded text-sm text-right"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={item.discount}
                                    onChange={e => {
                                      const updated = [...piItems]
                                      updated[i].discount = parseFloat(e.target.value) || 0
                                      setPiItems(updated)
                                    }}
                                    className="w-full px-2 py-1 border rounded text-sm text-center"
                                    min="0"
                                    max="100"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={item.tax}
                                    onChange={e => {
                                      const updated = [...piItems]
                                      updated[i].tax = parseFloat(e.target.value)
                                      setPiItems(updated)
                                    }}
                                    className="w-full px-1 py-1 border rounded text-sm"
                                  >
                                    <option value={0}>0%</option>
                                    <option value={5}>5%</option>
                                    <option value={12}>12%</option>
                                    <option value={18}>18%</option>
                                    <option value={28}>28%</option>
                                  </select>
                                </td>
                                <td className="p-2 text-right font-medium">₹{amount.toFixed(2)}</td>
                                <td className="p-2">
                                  <button
                                    onClick={() => setPiItems(piItems.filter((_, idx) => idx !== i))}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {piItems.length === 0 && (
                    <div className="py-4 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
                      <Receipt size={24} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-sm text-gray-500">Search and add items above</p>
                    </div>
                  )}

                  {/* Totals */}
                  {piItems.length > 0 && (() => {
                    const subtotal = piItems.reduce((sum, item) => sum + (item.qty * item.rate), 0)
                    const discount = piItems.reduce((sum, item) => sum + (item.qty * item.rate * item.discount / 100), 0)
                    const taxable = subtotal - discount
                    const tax = piItems.reduce((sum, item) => {
                      const lineTotal = item.qty * item.rate
                      const discAmt = lineTotal * (item.discount / 100)
                      return sum + ((lineTotal - discAmt) * item.tax / 100)
                    }, 0)
                    const grandTotal = Math.round(taxable + tax)
                    const balance = grandTotal - piAdvance
                    
                    return (
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>₹{subtotal.toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-sm text-red-600">
                            <span>Discount:</span>
                            <span>-₹{discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>{t.more.taxableAmount}:</span>
                          <span>₹{taxable.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-blue-600">
                          <span>{t.more.gst}:</span>
                          <span>₹{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>{t.more.grandTotal}:</span>
                          <span className="text-accent">₹{grandTotal.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <label className="text-sm">{t.more.advanceReceived}</label>
                            <input
                              type="number"
                              value={piAdvance}
                              onChange={e => setPiAdvance(parseFloat(e.target.value) || 0)}
                              className="w-28 px-2 py-1 border rounded text-sm text-right"
                            />
                          </div>
                          {piAdvance > 0 && (
                            <div className="flex justify-between text-sm font-medium text-orange-600 mt-1">
                              <span>{t.sales.balanceDue}:</span>
                              <span>₹{balance.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground italic pt-1">
                          {numberToWords(grandTotal)}
                        </p>
                      </div>
                    )
                  })()}

                  {/* Terms & Notes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t.more.notes}</label>
                      <textarea
                        value={piNotes}
                        onChange={e => setPiNotes(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        rows={3}
                        placeholder={t.more.additionalNotes}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t.more.termsConditions}</label>
                      <textarea
                        value={piTerms}
                        onChange={e => setPiTerms(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border flex gap-3 bg-muted/30">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleCreateProformaInvoice}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <Receipt size={16} />
                    {t.more.createProformaInvoice}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Purchase Order Modal */}
      <AnimatePresence>
        {showPOModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPOModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingBag size={24} weight="duotone" className="text-warning" />
                  New Purchase Order
                </h2>
                <button onClick={() => setShowPOModal(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Supplier Search */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">Supplier *</label>
                  <input
                    type="text"
                    value={poSupplierSearch}
                    onChange={(e) => {
                      setPoSupplierSearch(e.target.value)
                      setShowPoSupplierDropdown(true)
                    }}
                    onFocus={() => setShowPoSupplierDropdown(true)}
                    placeholder="Search supplier..."
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-warning"
                  />
                  {showPoSupplierDropdown && poSupplierSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {availableParties
                        .filter(p => p.companyName?.toLowerCase().includes(poSupplierSearch.toLowerCase()))
                        .slice(0, 5)
                        .map(party => (
                          <button
                            key={party.id}
                            onClick={() => {
                              setPoSelectedSupplier(party)
                              setPoSupplierSearch(party.companyName || '')
                              setShowPoSupplierDropdown(false)
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-muted"
                          >
                            {party.companyName}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Expected Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poExpectedDate}
                    onChange={(e) => setPoExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-warning"
                  />
                </div>

                {/* Items */}
                <div>
                  <label className="block text-sm font-medium mb-1">Items</label>
                  <div className="space-y-2">
                    {poItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center p-2 bg-muted/50 rounded-lg">
                        <span className="flex-1">{item.name}</span>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...poItems]
                            newItems[idx].qty = parseInt(e.target.value) || 1
                            setPoItems(newItems)
                          }}
                          className="w-16 px-2 py-1 border rounded text-center"
                          min="1"
                        />
                        <span className="text-sm text-muted-foreground">{item.unit}</span>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => {
                            const newItems = [...poItems]
                            newItems[idx].rate = parseFloat(e.target.value) || 0
                            setPoItems(newItems)
                          }}
                          className="w-20 px-2 py-1 border rounded text-right"
                          placeholder="Rate"
                        />
                        <button
                          onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={poItemSearch}
                      onChange={(e) => {
                        setPoItemSearch(e.target.value)
                        setShowPoItemDropdown(true)
                      }}
                      onFocus={() => setShowPoItemDropdown(true)}
                      placeholder="Search and add items..."
                      className="w-full px-3 py-2 border border-input rounded-lg"
                    />
                    {showPoItemDropdown && poItemSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {availableItems
                          .filter(item => item.name?.toLowerCase().includes(poItemSearch.toLowerCase()))
                          .slice(0, 5)
                          .map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setPoItems([...poItems, {
                                  itemId: item.id,
                                  name: item.name || '',
                                  qty: 1,
                                  rate: item.purchasePrice || 0,
                                  unit: item.unit || 'Pcs'
                                }])
                                setPoItemSearch('')
                                setShowPoItemDropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-muted flex justify-between"
                            >
                              <span>{item.name}</span>
                              <span className="text-sm text-muted-foreground">₹{item.purchasePrice || 0}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 border border-input rounded-lg h-20"
                  />
                </div>

                {/* Total */}
                {poItems.length > 0 && (
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <div className="flex justify-between font-bold">
                      <span>Total Amount:</span>
                      <span>₹{poItems.reduce((sum, item) => sum + (item.qty * item.rate), 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="sticky mobile-sticky-offset bg-card border-t border-border px-6 py-4 flex gap-3">
                <button
                  onClick={() => setShowPOModal(false)}
                  className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!poSelectedSupplier || poItems.length === 0) {
                      toast.error('Please select supplier and add items')
                      return
                    }
                    try {
                      const poNumber = await generatePONumber()
                      await createPurchaseOrder({
                        poNumber,
                        supplierName: poSelectedSupplier.companyName || '',
                        supplierId: poSelectedSupplier.id,
                        items: poItems.map(item => ({
                          id: item.itemId || '',
                          itemName: item.name,
                          quantity: item.qty,
                          unit: item.unit || 'pcs',
                          rate: item.rate,
                          taxRate: item.taxRate || 0,
                          amount: item.qty * item.rate
                        })),
                        totalAmount: poItems.reduce((sum, item) => sum + (item.qty * item.rate), 0),
                        expectedDeliveryDate: poExpectedDate,
                        notes: poNotes,
                        status: 'draft'
                      })
                      toast.success(`Purchase Order ${poNumber} created!`)
                      setShowPOModal(false)
                      setPoSelectedSupplier(null)
                      setPoSupplierSearch('')
                      setPoItems([])
                      setPoNotes('')
                      setPoExpectedDate('')
                      loadPurchaseOrders()
                    } catch (error) {
                      console.error('Error creating PO:', error)
                      toast.error('Failed to create purchase order')
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-warning text-white rounded-lg hover:bg-warning/90 font-medium"
                >
                  Create PO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment In Modal - New Allocation Modal */}
      <PaymentAllocationModal
        isOpen={showPaymentInModal}
        onClose={() => setShowPaymentInModal(false)}
        type="IN"
        onSuccess={() => loadPaymentsInData()}
      />

      {/* Payment Out Modal - New Allocation Modal */}
      <PaymentAllocationModal
        isOpen={showPaymentOutModal}
        onClose={() => setShowPaymentOutModal(false)}
        type="OUT"
        onSuccess={() => loadPaymentsOutData()}
      />

      {/* Price List Modal */}
      <AnimatePresence>
        {showPriceListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPriceListModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Tag size={24} weight="duotone" className="text-warning" />
                  {plName ? 'Edit Price List' : 'New Price List'}
                </h2>
                <button onClick={() => {
                  setShowPriceListModal(false)
                  setPlName('')
                  setPlDiscount(0)
                  setPlIsDefault(false)
                }} className="p-2 hover:bg-muted rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Price List Name *</label>
                  <input
                    type="text"
                    value={plName}
                    onChange={(e) => setPlName(e.target.value)}
                    placeholder="e.g., Wholesale Price List"
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-warning"
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-sm font-medium mb-1">Default Discount (%)</label>
                  <input
                    type="number"
                    value={plDiscount}
                    onChange={(e) => setPlDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-input rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This discount will be applied to all items in this price list
                  </p>
                </div>

                {/* Default */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="pl-default"
                    checked={plIsDefault}
                    onChange={(e) => setPlIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  <label htmlFor="pl-default" className="text-sm font-medium">
                    Set as default price list
                  </label>
                </div>
              </div>
              <div className="sticky mobile-sticky-offset bg-card border-t border-border px-6 py-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowPriceListModal(false)
                    setPlName('')
                    setPlDiscount(0)
                    setPlIsDefault(false)
                  }}
                  className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!plName.trim()) {
                      toast.error('Please enter price list name')
                      return
                    }
                    try {
                      await createPriceList({
                        name: plName.trim(),
                        discount: plDiscount,
                        isDefault: plIsDefault
                      })
                      toast.success(`Price list "${plName}" saved!`)
                      // Refresh the list
                      loadPriceListsData()
                      setShowPriceListModal(false)
                      setPlName('')
                      setPlDiscount(0)
                      setPlIsDefault(false)
                    } catch (error) {
                      console.error('Error saving price list:', error)
                      toast.error('Failed to save price list')
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-warning text-white rounded-lg hover:bg-warning/90 font-medium"
                >
                  Save Price List
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        title={language === 'ta' ? 'பார்கோடு ஸ்கேன்' : 'Scan Product Barcode'}
        onScan={async (barcode) => {
          try {
            const item = await findItemByBarcode(barcode)
            if (item) {
              setLastScannedItem(item)
              toast.success(
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm">Price: ₹{item.sellingPrice || item.purchasePrice || 0}</p>
                  {item.stock !== undefined && <p className="text-sm">Stock: {item.stock}</p>}
                </div>,
                { duration: 5000 }
              )
            } else {
              toast.error(language === 'ta' ? 'இந்த பார்கோடில் பொருள் இல்லை' : 'Item not found with this barcode')
            }
          } catch (error) {
            toast.error(language === 'ta' ? 'பார்கோடு ஸ்கேனிங் பிழை' : 'Error scanning barcode')
          }
        }}
      />

      {/* QR Code Scanner Modal */}
      <BarcodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        title={language === 'ta' ? 'QR கோடு ஸ்கேன்' : 'Scan QR Code'}
        onScan={async (qrData) => {
          try {
            // QR codes can contain various data - UPI payment links, URLs, plain text
            if (qrData.includes('upi://')) {
              toast.success(
                <div>
                  <p className="font-bold">{language === 'ta' ? 'UPI QR கண்டறியப்பட்டது' : 'UPI QR Detected'}</p>
                  <p className="text-sm truncate max-w-[200px]">{qrData}</p>
                </div>,
                { duration: 5000 }
              )
            } else {
              toast.success(
                <div>
                  <p className="font-bold">{language === 'ta' ? 'QR கோடு ஸ்கேன் செய்யப்பட்டது' : 'QR Code Scanned'}</p>
                  <p className="text-sm truncate max-w-[200px]">{qrData}</p>
                </div>,
                { duration: 5000 }
              )
            }
          } catch (error) {
            toast.error(language === 'ta' ? 'QR ஸ்கேனிங் பிழை' : 'Error scanning QR code')
          }
        }}
      />

      {/* Feature Panels - Shown when a module is selected */}
      <AnimatePresence>
        {selectedModule && showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {setShowCreateModal(false); setSelectedModule(null)}}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Notes Panel */}
              {selectedModule === 'notes' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">📝 Notes</h2>
                  <p className="text-muted-foreground mb-4">Add notes for tasks & parties</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        type="text"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter note title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Content</label>
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="w-full p-2 border rounded h-32"
                        placeholder="Enter note content"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (noteTitle && noteContent) {
                          const newNote = {
                            id: `note_${Date.now()}`,
                            title: noteTitle,
                            content: noteContent,
                            date: new Date().toISOString()
                          }
                          setNotes([...notes, newNote])
                          toast.success('Note created successfully!')
                          setNoteTitle('')
                          setNoteContent('')
                        }
                      }}
                      className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Save Note
                    </button>
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Recent Notes ({notes.length})</h3>
                      {notes.map(note => (
                        <div key={note.id} className="p-3 border rounded mb-2">
                          <h4 className="font-semibold">{note.title}</h4>
                          <p className="text-sm text-muted-foreground">{note.content}</p>
                          <small className="text-xs text-muted-foreground">{new Date(note.date).toLocaleDateString()}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp Integration Panel */}
              {selectedModule === 'whatsapp' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">📱 WhatsApp Integration</h2>
                  <p className="text-muted-foreground mb-4">Send invoices via WhatsApp</p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm mb-2">This feature allows you to send invoices, quotations, and payment reminders directly to your customers via WhatsApp.</p>
                    <p className="text-sm font-semibold mb-4">Setup Instructions:</p>
                    <ol className="text-sm space-y-2 list-decimal list-inside">
                      <li>You'll need WhatsApp Business API access</li>
                      <li>Or use direct WhatsApp link integration (available now)</li>
                      <li>Configure in Settings → Integrations</li>
                    </ol>
                    <button
                      onClick={() => toast.info('Navigate to Settings → Integrations to configure WhatsApp')}
                      className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                    >
                      Configure WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* UPI Payment Links Panel */}
              {selectedModule === 'upi' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">💳 UPI Payment Links</h2>
                  <p className="text-muted-foreground mb-4">Generate UPI payment links for customers</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Customer Name</label>
                      <input
                        type="text"
                        value={upiPartyName}
                        onChange={(e) => setUpiPartyName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Your UPI ID</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="yourname@upi"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (upiPartyName && upiAmount && upiId) {
                          const link = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPartyName)}&am=${upiAmount}&cu=INR`
                          const newUpiLink = {
                            id: `upi_${Date.now()}`,
                            partyName: upiPartyName,
                            amount: parseFloat(upiAmount),
                            upiId,
                            link,
                            createdAt: new Date().toISOString()
                          }
                          setUpiLinks([...upiLinks, newUpiLink])
                          navigator.clipboard.writeText(link)
                          toast.success('UPI link generated and copied to clipboard!')
                          setUpiPartyName('')
                          setUpiAmount('')
                        }
                      }}
                      className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Generate UPI Link
                    </button>
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Recent Links ({upiLinks.length})</h3>
                      {upiLinks.map(link => (
                        <div key={link.id} className="p-3 border rounded mb-2">
                          <p className="font-semibold">{link.partyName} - ₹{link.amount}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.link}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(link.link)
                              toast.success('Link copied!')
                            }}
                            className="text-xs text-primary mt-1"
                          >
                            Copy Link
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ledger Report Panel */}
              {selectedModule === 'ledger' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">📊 Ledger Report</h2>
                  <p className="text-muted-foreground mb-4">View detailed ledger accounts</p>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm mb-2">Ledger reports are available in the Party Statement section.</p>
                    <p className="text-sm mb-4">To view a party ledger:</p>
                    <ol className="text-sm space-y-2 list-decimal list-inside">
                      <li>Go to Parties page</li>
                      <li>Click on any party</li>
                      <li>Select "View Statement" or "Ledger"</li>
                    </ol>
                    <button
                      onClick={() => {
                        window.location.href = '/parties'
                      }}
                      className="mt-4 w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Go to Parties
                    </button>
                  </div>
                </div>
              )}

              {/* Schemes Panel */}
              {selectedModule === 'schemes' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">🎁 Promotional Schemes</h2>
                  <p className="text-muted-foreground mb-4">Create promotional schemes for customers</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Scheme Name</label>
                      <input
                        type="text"
                        value={schemeName}
                        onChange={(e) => setSchemeName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="e.g., Buy 2 Get 1 Free"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={schemeDesc}
                        onChange={(e) => setSchemeDesc(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Scheme details"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Discount Type</label>
                        <select
                          value={schemeDiscountType}
                          onChange={(e) => setSchemeDiscountType(e.target.value as 'percentage' | 'amount')}
                          className="w-full p-2 border rounded"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="amount">Fixed Amount</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Discount Value</label>
                        <input
                          type="number"
                          value={schemeDiscountValue}
                          onChange={(e) => setSchemeDiscountValue(parseFloat(e.target.value))}
                          className="w-full p-2 border rounded"
                          placeholder="10"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (schemeName && schemeDesc) {
                          const newScheme = {
                            id: `scheme_${Date.now()}`,
                            name: schemeName,
                            description: schemeDesc,
                            discountType: schemeDiscountType,
                            discountValue: schemeDiscountValue,
                            validFrom: new Date().toISOString(),
                            validTo: new Date(Date.now() + 30*24*60*60*1000).toISOString()
                          }
                          setSchemes([...schemes, newScheme])
                          toast.success('Scheme created successfully!')
                          setSchemeName('')
                          setSchemeDesc('')
                          setSchemeDiscountValue(0)
                        }
                      }}
                      className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Create Scheme
                    </button>
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Active Schemes ({schemes.length})</h3>
                      {schemes.map(scheme => (
                        <div key={scheme.id} className="p-3 border rounded mb-2">
                          <h4 className="font-semibold">{scheme.name}</h4>
                          <p className="text-sm">{scheme.description}</p>
                          <p className="text-sm text-success">{scheme.discountValue}{scheme.discountType === 'percentage' ? '%' : '₹'} off</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Discount Management Panel */}
              {selectedModule === 'discounts' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">🏷️ Discount Management</h2>
                  <p className="text-muted-foreground mb-4">Manage various discount types</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Discount Code</label>
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        className="w-full p-2 border rounded"
                        placeholder="e.g., SAVE10"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'amount')}
                          className="w-full p-2 border rounded"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="amount">Fixed Amount</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Value</label>
                        <input
                          type="number"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(parseFloat(e.target.value))}
                          className="w-full p-2 border rounded"
                          placeholder="10"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (discountCode && discountValue > 0) {
                          const newDiscount = {
                            id: `discount_${Date.now()}`,
                            code: discountCode,
                            type: discountType,
                            value: discountValue,
                            validFrom: new Date().toISOString(),
                            validTo: new Date(Date.now() + 30*24*60*60*1000).toISOString()
                          }
                          setDiscounts([...discounts, newDiscount])
                          toast.success(`Discount code ${discountCode} created!`)
                          setDiscountCode('')
                          setDiscountValue(0)
                        }
                      }}
                      className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Create Discount
                    </button>
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Active Discounts ({discounts.length})</h3>
                      {discounts.map(discount => (
                        <div key={discount.id} className="p-3 border rounded mb-2 flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{discount.code}</h4>
                            <p className="text-sm text-success">{discount.value}{discount.type === 'percentage' ? '%' : '₹'} off</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(discount.code)
                              toast.success('Code copied!')
                            }}
                            className="text-xs text-primary"
                          >
                            Copy Code
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Multiple Locations Panel */}
              {selectedModule === 'location' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">📍 Multiple Locations</h2>
                  <p className="text-muted-foreground mb-4">Manage multiple business locations</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Location Name</label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="e.g., Main Branch"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <textarea
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Street address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">City</label>
                        <input
                          type="text"
                          value={locationCity}
                          onChange={(e) => setLocationCity(e.target.value)}
                          className="w-full p-2 border rounded"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">State</label>
                        <input
                          type="text"
                          value={locationState}
                          onChange={(e) => setLocationState(e.target.value)}
                          className="w-full p-2 border rounded"
                          placeholder="State"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Pincode</label>
                      <input
                        type="text"
                        value={locationPincode}
                        onChange={(e) => setLocationPincode(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (locationName && locationAddress && locationCity) {
                          const newLocation = {
                            id: `loc_${Date.now()}`,
                            name: locationName,
                            address: locationAddress,
                            city: locationCity,
                            state: locationState,
                            pincode: locationPincode,
                            isDefault: locations.length === 0
                          }
                          setLocations([...locations, newLocation])
                          toast.success('Location added successfully!')
                          setLocationName('')
                          setLocationAddress('')
                          setLocationCity('')
                          setLocationState('')
                          setLocationPincode('')
                        }
                      }}
                      className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Add Location
                    </button>
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Locations ({locations.length})</h3>
                      {locations.map(loc => (
                        <div key={loc.id} className="p-3 border rounded mb-2">
                          <h4 className="font-semibold">{loc.name} {loc.isDefault && <span className="text-xs text-primary">(Default)</span>}</h4>
                          <p className="text-sm text-muted-foreground">{loc.address}</p>
                          <p className="text-sm text-muted-foreground">{loc.city}, {loc.state} - {loc.pincode}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Staff Attendance Panel */}
              {selectedModule === 'attendance' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">📅 Staff Attendance</h2>
                  <p className="text-muted-foreground mb-4">Track employee attendance</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Staff Name</label>
                      <input
                        type="text"
                        value={attendanceStaffName}
                        onChange={(e) => setAttendanceStaffName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Employee name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={attendanceStatus}
                        onChange={(e) => setAttendanceStatus(e.target.value as any)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half-day">Half Day</option>
                        <option value="leave">Leave</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                      <textarea
                        value={attendanceNotes}
                        onChange={(e) => setAttendanceNotes(e.target.value)}
                        className="w-full p-2 border rounded"
                        rows={2}
                        placeholder="Additional notes..."
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (attendanceStaffName && attendanceDate) {
                          const newRecord = {
                            id: `att_${Date.now()}`,
                            staffName: attendanceStaffName,
                            date: attendanceDate,
                            status: attendanceStatus,
                            notes: attendanceNotes
                          }
                          setAttendanceRecords([...attendanceRecords, newRecord])
                          localStorage.setItem('attendance_records', JSON.stringify([...attendanceRecords, newRecord]))
                          toast.success('Attendance recorded!')
                          setAttendanceStaffName('')
                          setAttendanceNotes('')
                        }
                      }}
                      className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Mark Attendance
                    </button>
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Recent Records ({attendanceRecords.length})</h3>
                      {attendanceRecords.slice(-5).reverse().map(rec => (
                        <div key={rec.id} className="p-3 border rounded mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{rec.staffName}</h4>
                              <p className="text-sm text-muted-foreground">{new Date(rec.date).toLocaleDateString()}</p>
                              {rec.notes && <p className="text-xs text-muted-foreground mt-1">{rec.notes}</p>}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              rec.status === 'present' ? 'bg-green-100 text-green-700' :
                              rec.status === 'absent' ? 'bg-red-100 text-red-700' :
                              rec.status === 'half-day' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {rec.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Salary Management Panel */}
              {selectedModule === 'salary' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">💰 Salary Management</h2>
                  <p className="text-muted-foreground mb-4">Manage staff salaries and payroll</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Staff Name</label>
                      <input
                        type="text"
                        value={salaryStaffName}
                        onChange={(e) => setSalaryStaffName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Employee name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Month</label>
                      <input
                        type="month"
                        value={salaryMonth}
                        onChange={(e) => setSalaryMonth(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Basic Salary (₹)</label>
                      <input
                        type="number"
                        value={salaryBasic}
                        onChange={(e) => setSalaryBasic(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Allowances (₹)</label>
                      <input
                        type="number"
                        value={salaryAllowances}
                        onChange={(e) => setSalaryAllowances(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Deductions (₹)</label>
                      <input
                        type="number"
                        value={salaryDeductions}
                        onChange={(e) => setSalaryDeductions(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="0"
                      />
                    </div>
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm font-semibold">Net Salary: ₹{
                        (parseFloat(salaryBasic || '0') + parseFloat(salaryAllowances || '0') - parseFloat(salaryDeductions || '0')).toLocaleString()
                      }</p>
                    </div>
                    <button
                      onClick={() => {
                        if (salaryStaffName && salaryBasic) {
                          const netSalary = parseFloat(salaryBasic) + parseFloat(salaryAllowances || '0') - parseFloat(salaryDeductions || '0')
                          const newRecord = {
                            id: `sal_${Date.now()}`,
                            staffName: salaryStaffName,
                            month: salaryMonth,
                            basicSalary: parseFloat(salaryBasic),
                            allowances: parseFloat(salaryAllowances || '0'),
                            deductions: parseFloat(salaryDeductions || '0'),
                            netSalary,
                            status: 'pending' as const
                          }
                          setSalaryRecords([...salaryRecords, newRecord])
                          localStorage.setItem('salary_records', JSON.stringify([...salaryRecords, newRecord]))
                          toast.success('Salary record created!')
                          setSalaryStaffName('')
                          setSalaryBasic('')
                          setSalaryAllowances('')
                          setSalaryDeductions('')
                        }
                      }}
                      className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Create Salary Record
                    </button>
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Salary Records ({salaryRecords.length})</h3>
                      {salaryRecords.slice(-5).reverse().map(rec => (
                        <div key={rec.id} className="p-3 border rounded mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{rec.staffName}</h4>
                              <p className="text-sm text-muted-foreground">{new Date(rec.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                              <p className="text-xs text-muted-foreground mt-1">Basic: ₹{rec.basicSalary.toLocaleString()} + Allowances: ₹{rec.allowances.toLocaleString()} - Deductions: ₹{rec.deductions.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">₹{rec.netSalary.toLocaleString()}</p>
                              <span className={`px-2 py-1 text-xs rounded ${rec.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {rec.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Serial Number Tracking Panel */}
              {selectedModule === 'item-serial' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">🔢 Serial Number Tracking</h2>
                  <p className="text-muted-foreground mb-4">Track items by serial numbers</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Item Name</label>
                      <input
                        type="text"
                        value={serialItemName}
                        onChange={(e) => setSerialItemName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Product name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="SN123456789"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Purchase Date</label>
                        <input
                          type="date"
                          value={serialPurchaseDate}
                          onChange={(e) => setSerialPurchaseDate(e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Warranty Expiry</label>
                        <input
                          type="date"
                          value={serialWarrantyExpiry}
                          onChange={(e) => setSerialWarrantyExpiry(e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={serialStatus}
                        onChange={(e) => setSerialStatus(e.target.value as any)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="in-stock">In Stock</option>
                        <option value="sold">Sold</option>
                        <option value="defective">Defective</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (serialItemName && serialNumber) {
                          const newSerial = {
                            id: `serial_${Date.now()}`,
                            itemName: serialItemName,
                            serialNumber: serialNumber,
                            purchaseDate: serialPurchaseDate,
                            warrantyExpiry: serialWarrantyExpiry,
                            status: serialStatus
                          }
                          setSerialNumbers([...serialNumbers, newSerial])
                          localStorage.setItem('serial_numbers', JSON.stringify([...serialNumbers, newSerial]))
                          toast.success('Serial number added!')
                          setSerialItemName('')
                          setSerialNumber('')
                          setSerialWarrantyExpiry('')
                        }
                      }}
                      className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                    >
                      Add Serial Number
                    </button>
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Serial Numbers ({serialNumbers.length})</h3>
                      {serialNumbers.slice(-5).reverse().map(serial => (
                        <div key={serial.id} className="p-3 border rounded mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{serial.itemName}</h4>
                              <p className="text-sm font-mono text-muted-foreground">SN: {serial.serialNumber}</p>
                              <p className="text-xs text-muted-foreground">Purchased: {new Date(serial.purchaseDate).toLocaleDateString()}</p>
                              {serial.warrantyExpiry && (
                                <p className="text-xs text-muted-foreground">Warranty: {new Date(serial.warrantyExpiry).toLocaleDateString()}</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              serial.status === 'in-stock' ? 'bg-blue-100 text-blue-700' :
                              serial.status === 'sold' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {serial.status.toUpperCase().replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Online Store Panel */}
              {selectedModule === 'online-store' && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">🛍️ Online Store</h2>
                  <p className="text-muted-foreground mb-4">Your e-commerce website & storefront</p>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                      <h3 className="font-bold text-lg mb-2">🚀 Launch Your Online Store</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get a fully functional e-commerce website with your product catalog, payment gateway integration, and order management.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <p className="text-sm">Automatic product sync from your inventory</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <p className="text-sm">Built-in payment gateway (UPI, Cards, Wallets)</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <p className="text-sm">Mobile-responsive design</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <p className="text-sm">Real-time order notifications</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <p className="text-sm">Custom domain support</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="storeEnabled"
                        checked={onlineStoreEnabled}
                        onChange={(e) => {
                          setOnlineStoreEnabled(e.target.checked)
                          localStorage.setItem('online_store_enabled', e.target.checked.toString())
                          if (e.target.checked) {
                            const storeUrl = `https://${Math.random().toString(36).substring(7)}.mystore.com`
                            setOnlineStoreUrl(storeUrl)
                            localStorage.setItem('online_store_url', storeUrl)
                            toast.success('Online store enabled!')
                          } else {
                            toast.info('Online store disabled')
                          }
                        }}
                        className="w-5 h-5"
                      />
                      <label htmlFor="storeEnabled" className="font-medium cursor-pointer">
                        Enable Online Store
                      </label>
                    </div>
                    {onlineStoreEnabled && onlineStoreUrl && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm font-semibold mb-2">🎉 Your store is live!</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={onlineStoreUrl}
                            readOnly
                            className="flex-1 p-2 bg-white border rounded text-sm"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(onlineStoreUrl)
                              toast.success('Store URL copied!')
                            }}
                            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 text-sm"
                          >
                            Copy URL
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Share this URL with your customers to start selling online!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* E-Way Bill Modal - Production Style */}
      {showEwayBillModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={() => setShowEwayBillModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Purple Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileArrowUp size={24} weight="duotone" />
                Generate E-Way Bill
              </h2>
              <button onClick={() => setShowEwayBillModal(false)} className="p-2 hover:bg-white/20 rounded-lg text-white">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
              {/* Document Details */}
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-3">Document Details</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Document Type *</label>
                    <select
                      value={ewayDocType}
                      onChange={(e) => setEwayDocType(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="INV">Tax Invoice</option>
                      <option value="CHL">Challan</option>
                      <option value="BIL">Bill of Supply</option>
                      <option value="BOE">Bill of Entry</option>
                      <option value="OTH">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Document No *</label>
                    <input
                      type="text"
                      value={ewayDocNo}
                      onChange={(e) => setEwayDocNo(e.target.value)}
                      placeholder="INV-001"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Document Date *</label>
                    <input
                      type="date"
                      value={ewayDocDate}
                      onChange={(e) => setEwayDocDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Supply Type *</label>
                    <select
                      value={ewaySupplyType}
                      onChange={(e) => setEwaySupplyType(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="O">Outward</option>
                      <option value="I">Inward</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Select Customer (Bill To) */}
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-sm text-purple-700 mb-3">Select Customer (Bill To)</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={ewaySelectedCustomer ? getPartyName(ewaySelectedCustomer) : ewayCustomerSearch}
                    placeholder="Type to search customer by name or GSTIN..."
                    className="w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    onChange={(e) => {
                      setEwayCustomerSearch(e.target.value)
                      setEwaySelectedCustomer(null)
                    }}
                  />
                  {/* Customer Dropdown */}
                  {ewayCustomerSearch.trim().length > 0 && availableParties.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl z-[999] max-h-48 overflow-y-auto">
                      {availableParties
                        .filter(p => {
                          const gstin = p.gstin || p.gstDetails?.gstin || (p as any).gstNumber || (p as any).GSTIN || (p as any).gstNo
                          return getPartyName(p).toLowerCase().includes(ewayCustomerSearch.toLowerCase()) ||
                            (gstin && gstin.toLowerCase().includes(ewayCustomerSearch.toLowerCase()))
                        })
                        .slice(0, 6)
                        .map((party, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              // Fill To (Consignee) details - check all possible GSTIN field locations
                              const partyGstin = party.gstin || party.gstDetails?.gstin || (party as any).gstNumber || (party as any).GSTIN || (party as any).gstNo || ''
                              setEwayToGstin(partyGstin)
                              setEwayToName(getPartyName(party))
                              setEwayToAddr(party.billingAddress?.street || '')
                              setEwayToPlace(party.billingAddress?.city || '')
                              setEwayToPincode(party.billingAddress?.pincode || '')
                              setEwayToState(party.billingAddress?.state || party.state || '')
                              setEwayCustomerSearch('')
                              setEwaySelectedCustomer(party)
                              toast.success(`${getPartyName(party)} selected as consignee`)
                            }}
                          >
                            <p className="font-medium text-sm">{getPartyName(party)}</p>
                            <p className="text-xs text-gray-500">
                              {(() => {
                                const gstin = party.gstin || party.gstDetails?.gstin || (party as any).gstNumber || (party as any).GSTIN || (party as any).gstNo
                                return gstin ? <span>GSTIN: {gstin} • </span> : null
                              })()}
                              {party.billingAddress?.city || 'No city'}
                            </p>
                          </div>
                        ))
                      }
                      {availableParties.filter(p => {
                        const gstin = p.gstin || p.gstDetails?.gstin || (p as any).gstNumber || (p as any).GSTIN || (p as any).gstNo
                        return getPartyName(p).toLowerCase().includes(ewayCustomerSearch.toLowerCase()) ||
                          (gstin && gstin.toLowerCase().includes(ewayCustomerSearch.toLowerCase()))
                      }).length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500">No customers found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* From and To Section */}
              <div className="grid grid-cols-2 gap-4">
                {/* From (Consignor) */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-amber-700">From (Consignor)</h3>
                    <button
                      onClick={() => {
                        // Load company details from settings service
                        const company = getCompanySettings()
                        if (company && company.companyName) {
                          setEwayFromGstin(company.gstin || '')
                          setEwayFromName(company.companyName || '')
                          setEwayFromAddr(company.address || '')
                          setEwayFromPlace(company.city || '')
                          setEwayFromPincode(company.pincode || '')
                          setEwayFromState(company.state || '')
                        } else {
                          toast.error('Please set up company info in Settings first')
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      Load My Company
                    </button>
                  </div>
                  {/* White inner box */}
                  <div className="bg-white rounded-lg p-3 min-h-[80px]">
                    {ewayFromName ? (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm text-gray-900">{ewayFromName}</p>
                        <p className="text-xs text-blue-600">{ewayFromGstin || 'No GSTIN'}</p>
                        <p className="text-xs text-gray-500">-</p>
                        <button
                          onClick={() => {
                            setEwayFromGstin('')
                            setEwayFromName('')
                            setEwayFromAddr('')
                            setEwayFromPlace('')
                            setEwayFromPincode('')
                            setEwayFromState('')
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Click "Load My Company" above</p>
                    )}
                  </div>
                </div>

                {/* To (Consignee) */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-semibold text-sm text-green-700 mb-3">To (Consignee)</h3>
                  {/* White inner box */}
                  <div className="bg-white rounded-lg p-3 min-h-[80px]">
                    {ewayToName ? (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm text-gray-900">{ewayToName}</p>
                        <p className="text-xs text-purple-600">{ewayToGstin || 'URP'}</p>
                        <p className="text-xs text-gray-500">-</p>
                        <button
                          onClick={() => {
                            setEwayToGstin('')
                            setEwayToName('')
                            setEwayToAddr('')
                            setEwayToPlace('')
                            setEwayToPincode('')
                            setEwayToState('')
                            setEwaySelectedCustomer(null)
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Select customer from list above</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Transport Details */}
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-sm text-red-600 mb-3">Transport Details</h3>
                {/* Row 1: Mode, Distance, Vehicle No */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mode *</label>
                    <select
                      value={ewayTransMode}
                      onChange={(e) => setEwayTransMode(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="1">Road</option>
                      <option value="2">Rail</option>
                      <option value="3">Air</option>
                      <option value="4">Ship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Distance (KM) *</label>
                    <input
                      type="number"
                      value={ewayDistance}
                      onChange={(e) => setEwayDistance(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Vehicle No *</label>
                    <input
                      type="text"
                      value={ewayVehicleNo}
                      onChange={(e) => setEwayVehicleNo(e.target.value.toUpperCase())}
                      placeholder="MH12AB1234"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
                {/* Row 2: Transporter ID, Transporter Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Transporter ID (GSTIN)</label>
                    <input
                      type="text"
                      value={ewayTransId}
                      onChange={(e) => setEwayTransId(e.target.value.toUpperCase())}
                      placeholder="Enter GSTIN or leave blank for Self"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Leave blank if using own vehicle (Self Transport)</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Transporter Name</label>
                    <input
                      type="text"
                      value={ewayTransName}
                      onChange={(e) => setEwayTransName(e.target.value)}
                      placeholder="Self / Transport Co. Name"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Item Details */}
              <div className="bg-white border rounded-xl p-4 relative">
                <h3 className="font-semibold text-sm text-purple-700 mb-3">Item Details</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={ewayItemSearch}
                    onChange={(e) => setEwayItemSearch(e.target.value)}
                    placeholder="Search items by name or HSN code..."
                    className="w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  {/* Item Dropdown */}
                  {ewayItemSearch.trim().length > 0 && availableItems.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl z-[999] max-h-48 overflow-y-auto">
                      {availableItems
                        .filter(item =>
                          item.name.toLowerCase().includes(ewayItemSearch.toLowerCase()) ||
                          (item.hsnCode && item.hsnCode.toLowerCase().includes(ewayItemSearch.toLowerCase()))
                        )
                        .slice(0, 8)
                        .map((item, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              // Add item to ewayItems
                              const gstRate = item.tax?.gstRate || 0
                              const newItem = {
                                productName: item.name,
                                productDesc: item.description || '',
                                hsnCode: item.hsnCode || '',
                                quantity: 1,
                                unit: item.unit || 'NOS',
                                taxableAmount: item.sellingPrice || 0,
                                cgstRate: gstRate / 2,
                                sgstRate: gstRate / 2,
                                igstRate: 0,
                                cessRate: item.tax?.cessRate || 0
                              }
                              setEwayItems(prev => [...prev, newItem])
                              setEwayItemSearch('')
                              toast.success(`${item.name} added`)
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-gray-500">
                                  {item.hsnCode && <span>HSN: {item.hsnCode} • </span>}
                                  GST: {item.tax?.gstRate || 0}%
                                </p>
                              </div>
                              <p className="font-medium text-sm text-purple-600">₹{(item.sellingPrice || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        ))
                      }
                      {availableItems.filter(item =>
                        item.name.toLowerCase().includes(ewayItemSearch.toLowerCase()) ||
                        (item.hsnCode && item.hsnCode.toLowerCase().includes(ewayItemSearch.toLowerCase()))
                      ).length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500">No items found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Added Items List */}
                <div className="mt-3">
                  {ewayItems.length > 0 ? (
                    <div className="space-y-2">
                      {ewayItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{item.productName}</p>
                            <p className="text-xs text-gray-500">HSN: {item.hsnCode} | Qty: {item.quantity} {item.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">₹{item.taxableAmount.toLocaleString()}</p>
                            <button
                              onClick={() => setEwayItems(prev => prev.filter((_, i) => i !== idx))}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <p className="text-sm text-gray-500">No items added. Search and add items above.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowEwayBillModal(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Validate required fields per GST/NIC compliance
                  if (!ewayDocNo) {
                    toast.error('Please enter Document No')
                    return
                  }
                  if (!ewayFromName) {
                    toast.error('Please load your company details')
                    return
                  }
                  // MANDATORY: FROM GSTIN is required for Tax Invoice (URP → URP is not allowed)
                  if (!ewayFromGstin || ewayFromGstin.trim() === '') {
                    toast.error('Supplier GSTIN is mandatory for E-Way Bill generation')
                    return
                  }
                  // Validate GSTIN format (15 characters)
                  if (ewayFromGstin.length !== 15) {
                    toast.error('Invalid Supplier GSTIN format (must be 15 characters)')
                    return
                  }

                  // Calculate total value from items
                  const totalTaxable = ewayItems.reduce((sum, item) => sum + item.taxableAmount, 0)
                  const totalCgst = ewayItems.reduce((sum, item) => sum + (item.taxableAmount * item.cgstRate / 100), 0)
                  const totalSgst = ewayItems.reduce((sum, item) => sum + (item.taxableAmount * item.sgstRate / 100), 0)
                  const totalIgst = ewayItems.reduce((sum, item) => sum + (item.taxableAmount * item.igstRate / 100), 0)

                  // Generate E-Way Bill
                  const ewbNo = 'EWB' + Date.now().toString().slice(-10)
                  const ewbDate = new Date().toLocaleDateString()
                  const validUpto = new Date(Date.now() + 24*60*60*1000).toLocaleDateString()
                  const totalValue = totalTaxable + totalCgst + totalSgst + totalIgst || ewayTotalValue

                  const newBill = {
                    ewbNo,
                    docNo: ewayDocNo,
                    ewbDate,
                    validUpto,
                    fromGstin: ewayFromGstin,
                    toGstin: ewayToGstin,
                    totalValue,
                    status: 'active' as const
                  }
                  setEwayBillsList(prev => [newBill, ...prev])

                  // Generate NIC-Compliant E-Way Bill PDF
                  const generateNICEwayBillPDF = async () => {
                    const doc = new jsPDF()

                    // Document type and supply type labels
                    const docTypeLabels: Record<string, string> = { 'INV': 'Tax Invoice', 'CHL': 'Delivery Challan', 'BIL': 'Bill of Supply', 'BOE': 'Bill of Entry', 'OTH': 'Others' }
                    const supplyTypeLabels: Record<string, string> = { 'O': 'Outward', 'I': 'Inward' }
                    const subSupplyTypeLabels: Record<string, string> = { '1': 'Supply', '2': 'Import', '3': 'Export', '4': 'Job Work', '5': 'For Own Use', '6': 'Job Work Returns', '7': 'Sales Return', '8': 'Others', '9': 'SKD/CKD', '10': 'Line Sales', '11': 'Recipient Not Known', '12': 'Exhibition or Fairs' }
                    const transModeLabels: Record<string, string> = { '1': 'Road', '2': 'Rail', '3': 'Air', '4': 'Ship' }
                    const vehicleTypeLabels: Record<string, string> = { 'R': 'Regular', 'O': 'Over Dimensional Cargo' }

                    // Generate QR Code data (NIC format JSON)
                    const qrData = JSON.stringify({
                      ewbNo: ewbNo,
                      ewbDt: ewbDate,
                      status: 'ACT',
                      fromGstin: ewayFromGstin || '',
                      toGstin: ewayToGstin || '',
                      docNo: ewayDocNo,
                      docDt: ewayDocDate,
                      totValue: totalValue,
                      fromPlace: ewayFromPlace,
                      toPlace: ewayToPlace
                    })

                    // Generate QR code as data URL
                    let qrDataUrl = ''
                    try {
                      qrDataUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 })
                    } catch (err) {
                      console.error('QR Code generation failed:', err)
                    }

                    // ===== NIC HEADER =====
                    // Top border line
                    doc.setDrawColor(0, 0, 0)
                    doc.setLineWidth(0.5)
                    doc.line(10, 8, 200, 8)

                    // Government header
                    doc.setTextColor(0, 0, 0)
                    doc.setFontSize(12)
                    doc.setFont('helvetica', 'bold')
                    doc.text('GOVERNMENT OF INDIA', 105, 15, { align: 'center' })

                    doc.setFontSize(16)
                    doc.text('E-WAY BILL', 105, 23, { align: 'center' })

                    doc.setFontSize(8)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(80, 80, 80)
                    doc.text('Generated by National Informatics Centre', 105, 29, { align: 'center' })

                    // Bottom header line
                    doc.setDrawColor(0, 0, 0)
                    doc.setLineWidth(0.5)
                    doc.line(10, 32, 200, 32)

                    // ===== E-Way Bill Number and Dates Row =====
                    let yPos = 40

                    doc.setFillColor(245, 245, 245)
                    doc.rect(10, yPos - 5, 190, 18, 'F')
                    doc.setDrawColor(0, 0, 0)
                    doc.setLineWidth(0.3)
                    doc.rect(10, yPos - 5, 190, 18)

                    doc.setTextColor(0, 0, 0)
                    doc.setFontSize(9)
                    doc.setFont('helvetica', 'bold')
                    doc.text('E-Way Bill No:', 15, yPos + 2)
                    doc.setFont('helvetica', 'normal')
                    doc.text(ewbNo, 50, yPos + 2)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Generated Date:', 90, yPos + 2)
                    doc.setFont('helvetica', 'normal')
                    doc.text(ewbDate, 125, yPos + 2)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Valid Upto:', 155, yPos + 2)
                    doc.setFont('helvetica', 'normal')
                    doc.text(validUpto, 180, yPos + 2)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Mode:', 15, yPos + 9)
                    doc.setFont('helvetica', 'normal')
                    doc.text(transModeLabels[ewayTransMode] || 'Road', 30, yPos + 9)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Approx Distance:', 90, yPos + 9)
                    doc.setFont('helvetica', 'normal')
                    doc.text(`${ewayDistance || '0'} KM`, 125, yPos + 9)

                    // ===== PART-A: SUPPLY DETAILS =====
                    yPos = 60
                    doc.setFillColor(220, 220, 220)
                    doc.rect(10, yPos, 190, 8, 'F')
                    doc.setDrawColor(0, 0, 0)
                    doc.rect(10, yPos, 190, 8)

                    doc.setTextColor(0, 0, 0)
                    doc.setFontSize(10)
                    doc.setFont('helvetica', 'bold')
                    doc.text('PART-A', 15, yPos + 6)
                    doc.setFontSize(9)
                    doc.text('Supply Details', 105, yPos + 6, { align: 'center' })

                    yPos = 70

                    // Transaction Details Table
                    autoTable(doc, {
                      startY: yPos,
                      head: [['Transaction Type', 'Document Type', 'Document No', 'Document Date']],
                      body: [[
                        supplyTypeLabels[ewaySupplyType] || 'Outward',
                        docTypeLabels[ewayDocType] || 'Tax Invoice',
                        ewayDocNo,
                        ewayDocDate
                      ]],
                      theme: 'grid',
                      headStyles: {
                        fillColor: [240, 240, 240],
                        textColor: [0, 0, 0],
                        fontSize: 8,
                        fontStyle: 'bold',
                        halign: 'center'
                      },
                      bodyStyles: {
                        fontSize: 8,
                        halign: 'center',
                        textColor: [0, 0, 0]
                      },
                      styles: {
                        lineColor: [0, 0, 0],
                        lineWidth: 0.2
                      },
                      margin: { left: 10, right: 10 }
                    })

                    yPos = (doc as any).lastAutoTable?.finalY || yPos + 20

                    // FROM (Supplier) Details
                    autoTable(doc, {
                      startY: yPos,
                      head: [['FROM (Supplier / Consignor)', '']],
                      body: [
                        ['GSTIN', ewayFromGstin],
                        ['Legal Name', ewayFromName || '-'],
                        ['Address', ewayFromAddr || '-'],
                        ['Place', `${ewayFromPlace || '-'}, ${ewayFromState || '-'} - ${ewayFromPincode || ''}`]
                      ],
                      theme: 'grid',
                      headStyles: {
                        fillColor: [240, 240, 240],
                        textColor: [0, 0, 0],
                        fontSize: 8,
                        fontStyle: 'bold'
                      },
                      bodyStyles: {
                        fontSize: 8,
                        textColor: [0, 0, 0]
                      },
                      columnStyles: {
                        0: { cellWidth: 30, fontStyle: 'bold' },
                        1: { cellWidth: 160 }
                      },
                      styles: {
                        lineColor: [0, 0, 0],
                        lineWidth: 0.2
                      },
                      margin: { left: 10, right: 10 }
                    })

                    yPos = (doc as any).lastAutoTable?.finalY || yPos + 30

                    // TO (Recipient) Details
                    autoTable(doc, {
                      startY: yPos,
                      head: [['TO (Recipient / Consignee)', '']],
                      body: [
                        ['GSTIN', ewayToGstin || 'URP'],
                        ['Legal Name', ewayToName || '-'],
                        ['Address', ewayToAddr || '-'],
                        ['Place', `${ewayToPlace || '-'}, ${ewayToState || '-'} - ${ewayToPincode || ''}`]
                      ],
                      theme: 'grid',
                      headStyles: {
                        fillColor: [240, 240, 240],
                        textColor: [0, 0, 0],
                        fontSize: 8,
                        fontStyle: 'bold'
                      },
                      bodyStyles: {
                        fontSize: 8,
                        textColor: [0, 0, 0]
                      },
                      columnStyles: {
                        0: { cellWidth: 30, fontStyle: 'bold' },
                        1: { cellWidth: 160 }
                      },
                      styles: {
                        lineColor: [0, 0, 0],
                        lineWidth: 0.2
                      },
                      margin: { left: 10, right: 10 }
                    })

                    yPos = (doc as any).lastAutoTable?.finalY || yPos + 30

                    // Item Details Table
                    autoTable(doc, {
                      startY: yPos,
                      head: [['S.No', 'Product Name', 'Description', 'HSN Code', 'Quantity', 'Unit', 'Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)']],
                      body: ewayItems.length > 0 ? ewayItems.map((item, idx) => [
                        idx + 1,
                        item.productName,
                        item.productName,
                        item.hsnCode || '-',
                        item.quantity,
                        item.unit,
                        item.taxableAmount.toFixed(2),
                        (item.taxableAmount * item.cgstRate / 100).toFixed(2),
                        (item.taxableAmount * item.sgstRate / 100).toFixed(2),
                        (item.taxableAmount * item.igstRate / 100).toFixed(2)
                      ]) : [[1, '-', '-', '-', '-', '-', '0.00', '0.00', '0.00', '0.00']],
                      theme: 'grid',
                      headStyles: {
                        fillColor: [240, 240, 240],
                        textColor: [0, 0, 0],
                        fontSize: 7,
                        fontStyle: 'bold',
                        halign: 'center'
                      },
                      bodyStyles: {
                        fontSize: 7,
                        halign: 'center',
                        textColor: [0, 0, 0]
                      },
                      columnStyles: {
                        0: { cellWidth: 10 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 18 },
                        4: { cellWidth: 15 },
                        5: { cellWidth: 12 },
                        6: { cellWidth: 20 },
                        7: { cellWidth: 18 },
                        8: { cellWidth: 18 },
                        9: { cellWidth: 18 }
                      },
                      styles: {
                        lineColor: [0, 0, 0],
                        lineWidth: 0.2
                      },
                      margin: { left: 10, right: 10 }
                    })

                    yPos = (doc as any).lastAutoTable?.finalY || yPos + 25

                    // Totals Row
                    const itemsTotalValue = ewayItems.reduce((sum, item) => sum + item.taxableAmount, 0)
                    const itemsTotalCGST = ewayItems.reduce((sum, item) => sum + (item.taxableAmount * item.cgstRate / 100), 0)
                    const itemsTotalSGST = ewayItems.reduce((sum, item) => sum + (item.taxableAmount * item.sgstRate / 100), 0)
                    const itemsTotalIGST = ewayItems.reduce((sum, item) => sum + (item.taxableAmount * item.igstRate / 100), 0)

                    autoTable(doc, {
                      startY: yPos,
                      head: [['', '', '', '', '', 'Total',
                        (itemsTotalValue || totalValue).toFixed(2),
                        itemsTotalCGST.toFixed(2),
                        itemsTotalSGST.toFixed(2),
                        itemsTotalIGST.toFixed(2)
                      ]],
                      body: [],
                      theme: 'grid',
                      headStyles: {
                        fillColor: [245, 245, 245],
                        textColor: [0, 0, 0],
                        fontSize: 7,
                        fontStyle: 'bold',
                        halign: 'center'
                      },
                      columnStyles: {
                        0: { cellWidth: 10 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 18 },
                        4: { cellWidth: 15 },
                        5: { cellWidth: 12, halign: 'right' },
                        6: { cellWidth: 20 },
                        7: { cellWidth: 18 },
                        8: { cellWidth: 18 },
                        9: { cellWidth: 18 }
                      },
                      styles: {
                        lineColor: [0, 0, 0],
                        lineWidth: 0.2
                      },
                      margin: { left: 10, right: 10 }
                    })

                    yPos = (doc as any).lastAutoTable?.finalY || yPos + 10

                    // Total Invoice Value
                    doc.setFillColor(240, 240, 240)
                    doc.rect(10, yPos, 190, 10, 'F')
                    doc.setDrawColor(0, 0, 0)
                    doc.rect(10, yPos, 190, 10)

                    doc.setTextColor(0, 0, 0)
                    doc.setFontSize(9)
                    doc.setFont('helvetica', 'bold')
                    doc.text('Total Invoice Value:', 15, yPos + 7)
                    doc.text(`₹ ${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 195, yPos + 7, { align: 'right' })

                    yPos += 15

                    // ===== PART-B: TRANSPORT DETAILS =====
                    doc.setFillColor(220, 220, 220)
                    doc.rect(10, yPos, 190, 8, 'F')
                    doc.setDrawColor(0, 0, 0)
                    doc.rect(10, yPos, 190, 8)

                    doc.setTextColor(0, 0, 0)
                    doc.setFontSize(10)
                    doc.setFont('helvetica', 'bold')
                    doc.text('PART-B', 15, yPos + 6)
                    doc.setFontSize(9)
                    doc.text('Transport Details', 105, yPos + 6, { align: 'center' })

                    yPos += 10

                    autoTable(doc, {
                      startY: yPos,
                      body: [
                        ['Mode of Transport', transModeLabels[ewayTransMode] || 'Road', 'Vehicle Type', vehicleTypeLabels[ewayVehicleType] || 'Regular'],
                        ['Transporter ID', ewayTransId || '-', 'Transporter Name', ewayTransName || '-'],
                        ['Vehicle Number', ewayVehicleNo || '-', 'From Place', ewayFromPlace || '-'],
                        ['Transporter Doc No', ewayTransDocNo || '-', 'Transporter Doc Date', ewayTransDocDate || '-']
                      ],
                      theme: 'grid',
                      bodyStyles: {
                        fontSize: 8,
                        textColor: [0, 0, 0]
                      },
                      columnStyles: {
                        0: { cellWidth: 40, fontStyle: 'bold', fillColor: [245, 245, 245] },
                        1: { cellWidth: 55 },
                        2: { cellWidth: 40, fontStyle: 'bold', fillColor: [245, 245, 245] },
                        3: { cellWidth: 55 }
                      },
                      styles: {
                        lineColor: [0, 0, 0],
                        lineWidth: 0.2
                      },
                      margin: { left: 10, right: 10 }
                    })

                    yPos = (doc as any).lastAutoTable?.finalY || yPos + 35

                    // ===== QR CODE SECTION =====
                    if (qrDataUrl) {
                      doc.setDrawColor(0, 0, 0)
                      doc.setLineWidth(0.3)
                      doc.rect(10, yPos + 5, 40, 40)
                      doc.addImage(qrDataUrl, 'PNG', 12, yPos + 7, 36, 36)

                      doc.setFontSize(7)
                      doc.setFont('helvetica', 'normal')
                      doc.setTextColor(80, 80, 80)
                      doc.text('Scan to verify', 30, yPos + 48, { align: 'center' })
                    }

                    // E-Way Bill Status (NO IRN - IRN belongs to e-Invoice, not E-Way Bill)
                    doc.setFontSize(8)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)
                    doc.text('E-Way Bill Status:', 60, yPos + 15)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(0, 128, 0)
                    doc.text('ACTIVE', 100, yPos + 15)

                    doc.setTextColor(0, 0, 0)
                    doc.setFont('helvetica', 'bold')
                    doc.text('Generated On:', 60, yPos + 25)
                    doc.setFont('helvetica', 'normal')
                    doc.text(new Date().toLocaleString('en-IN'), 100, yPos + 25)

                    // ===== FOOTER =====
                    doc.setDrawColor(0, 0, 0)
                    doc.setLineWidth(0.3)
                    doc.line(10, 280, 200, 280)

                    doc.setTextColor(80, 80, 80)
                    doc.setFontSize(7)
                    doc.setFont('helvetica', 'normal')
                    doc.text('This is a system generated E-Way Bill.', 105, 285, { align: 'center' })

                    // Download PDF
                    doc.save(`EWayBill_${ewbNo}.pdf`)
                  }

                  // Execute the async PDF generation
                  generateNICEwayBillPDF()

                  toast.success('E-Way Bill generated and downloaded!')
                  setShowEwayBillModal(false)

                  // Reset form
                  setEwayDocNo('')
                  setEwayFromGstin('')
                  setEwayFromName('')
                  setEwayFromAddr('')
                  setEwayFromPlace('')
                  setEwayFromPincode('')
                  setEwayFromState('')
                  setEwayToGstin('')
                  setEwayToName('')
                  setEwayToAddr('')
                  setEwayToPlace('')
                  setEwayToPincode('')
                  setEwayToState('')
                  setEwayVehicleNo('')
                  setEwayTransId('')
                  setEwayTransName('')
                  setEwayDistance('')
                  setEwayItems([])
                  setEwayItemSearch('')
                  setEwayCustomerSearch('')
                  setEwaySelectedCustomer(null)
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 text-sm font-medium flex items-center gap-2"
              >
                <FileArrowUp size={18} />
                Generate E-Way Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default More

