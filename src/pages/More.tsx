import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
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
  const [discountValidTo, setDiscountValidTo] = useState('')

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
  const [pinPartySearch, setPinPartySearch] = useState('')
  const [pinSelectedParty, setPinSelectedParty] = useState<Party | null>(null)
  const [showPinPartyDropdown, setShowPinPartyDropdown] = useState(false)
  const [pinAmount, setPinAmount] = useState('')
  const [pinMode, setPinMode] = useState<'cash' | 'upi' | 'bank' | 'cheque' | 'card'>('cash')
  const [pinReference, setPinReference] = useState('')
  const [pinDate, setPinDate] = useState(new Date().toISOString().split('T')[0])
  const [pinNotes, setPinNotes] = useState('')

  // Legacy form states for Payment Out (kept for backward compatibility)
  const [poutPartySearch, setPoutPartySearch] = useState('')
  const [poutSelectedParty, setPoutSelectedParty] = useState<Party | null>(null)
  const [showPoutPartyDropdown, setShowPoutPartyDropdown] = useState(false)
  const [poutAmount, setPoutAmount] = useState('')
  const [poutMode, setPoutMode] = useState<'cash' | 'upi' | 'bank' | 'cheque' | 'card'>('cash')
  const [poutReference, setPoutReference] = useState('')
  const [poutDate, setPoutDate] = useState(new Date().toISOString().split('T')[0])
  const [poutNotes, setPoutNotes] = useState('')

  // Form states for Price List
  const [showPriceListModal, setShowPriceListModal] = useState(false)
  const [plName, setPlName] = useState('')
  const [plDiscount, setPlDiscount] = useState(0)
  const [plIsDefault, setPlIsDefault] = useState(false)

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

    const featureConfig = featureMap[moduleId]

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

  const handleCreatePurchaseOrder = async () => {
    if (!poSupplierName || poItems.length === 0) {
      toast.error('Please fill supplier name and add items')
      return
    }

    const subtotal = poItems.reduce((sum, item) => sum + (item.qty * item.rate), 0)
    const taxAmount = subtotal * 0.18

    const poData: any = {
      poNumber: generatePONumber(),
      poDate: new Date().toISOString().split('T')[0],
      supplierName: poSupplierName,
      items: poItems.map((item, i) => ({
        id: `item_${i}`,
        itemName: item.name,
        quantity: item.qty,
        unit: 'pcs',
        rate: item.rate,
        taxRate: 18,
        amount: item.qty * item.rate
      })),
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
      status: 'draft' as const
    }

    const result = await createPurchaseOrder(poData)
    if (result) {
      toast.success(`Purchase Order ${result.poNumber} created!`)
      setShowCreateModal(false)
      setPoSupplierName('')
      setPoItems([])
      loadPurchaseOrders()
    }
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
    <div className="min-h-screen p-4 sm:p-6 pb-20 lg:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.more.title}</h1>
            <p className="text-sm text-muted-foreground">{t.more.subtitle}</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions - Proforma Invoice & Delivery Challan at TOP */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{t.more.quickActions}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Proforma Invoice Card */}
          <div
            className={cn(
              "bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-5 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl",
              selectedModule === 'proforma' && "ring-4 ring-orange-300"
            )}
            onClick={() => handleModuleClick('proforma', t.more.proformaInvoice)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Receipt size={28} weight="duotone" />
                  <h3 className="text-lg font-bold">{t.more.proformaInvoice}</h3>
                </div>
                <p className="text-sm text-white/80 mb-4">{t.more.proformaInvoiceDesc}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleModuleClick('proforma', t.more.proformaInvoice)
                    if (hasFeature('performanceInvoice' as any)) {
                      setSelectedModule('proforma')
                      setShowCreateModal(true)
                    }
                  }}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg text-sm font-semibold hover:bg-white/90 flex items-center gap-2"
                >
                  <Plus size={16} weight="bold" /> {t.more.createNew}
                </button>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{proformaInvoices.length}</p>
                <p className="text-xs text-white/70">{t.more.totalCreated}</p>
              </div>
            </div>
          </div>

          {/* Delivery Challan Card */}
          <div
            className={cn(
              "bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl p-5 text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl",
              selectedModule === 'delivery-challan' && "ring-4 ring-cyan-300"
            )}
            onClick={() => handleModuleClick('delivery-challan', t.more.deliveryChallan)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Truck size={28} weight="duotone" />
                  <h3 className="text-lg font-bold">{t.more.deliveryChallan}</h3>
                </div>
                <p className="text-sm text-white/80 mb-4">{t.more.deliveryChallanDesc}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleModuleClick('delivery-challan', t.more.deliveryChallan)
                    if (hasFeature('deliveryChallan' as any)) {
                      setSelectedModule('delivery-challan')
                      setShowCreateModal(true)
                    }
                  }}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-white/90 flex items-center gap-2"
                >
                  <Plus size={16} weight="bold" /> {t.more.createNew}
                </button>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{deliveryChallans.length}</p>
                <p className="text-xs text-white/70">{t.more.totalCreated}</p>
              </div>
            </div>
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
                      onClick={() => toast.info('Generate E-Way bill...')}
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
                <div className="p-6 bg-primary/5 rounded-lg border border-primary/20 text-center">
                  <FileArrowUp size={48} weight="duotone" className="text-primary mx-auto mb-4" />
                  <h3 className="font-bold mb-2">Generate E-Way Bills</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate E-Way bills for goods transportation as per GST rules
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="p-3 bg-background rounded">
                      <p className="text-xs text-muted-foreground">{t.more.totalGenerated}</p>
                      <p className="text-xl font-bold">45</p>
                    </div>
                    <div className="p-3 bg-background rounded">
                      <p className="text-xs text-muted-foreground">{t.more.active}</p>
                      <p className="text-xl font-bold">12</p>
                    </div>
                  </div>
                </div>
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
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{t.more.allFeatures}</h2>

      {/* Features Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {modules.filter(m => m.id !== 'proforma' && m.id !== 'delivery-challan').map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleModuleClick(module.id, module.title)}
              className={cn(
                "bg-card rounded-lg shadow-lg border-2 p-4 lg:p-6 cursor-pointer transition-all hover:scale-105 relative",
                selectedModule === module.id ? "border-primary" : "border-border hover:border-primary/50"
              )}
            >
              {module.badge && (
                <span className={cn(
                  "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium",
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
                "w-12 h-12 lg:w-16 lg:h-16 rounded-lg flex items-center justify-center mb-3",
                module.color === 'primary' && "bg-primary/10",
                module.color === 'accent' && "bg-accent/10",
                module.color === 'success' && "bg-success/10",
                module.color === 'warning' && "bg-warning/10",
                module.color === 'destructive' && "bg-destructive/10"
              )}>
                <module.icon
                  size={24}
                  className={cn(
                    "lg:w-8 lg:h-8",
                    module.color === 'primary' && "text-primary",
                    module.color === 'accent' && "text-accent",
                    module.color === 'success' && "text-success",
                    module.color === 'warning' && "text-warning",
                    module.color === 'destructive' && "text-destructive"
                  )}
                  weight="duotone"
                />
              </div>
              <h3 className="font-bold text-sm lg:text-base mb-1">{module.title}</h3>
              <p className="text-xs lg:text-sm text-muted-foreground">{module.description}</p>
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
                className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-4 border-b border-border bg-gradient-to-r from-blue-600 to-cyan-500">
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
                
                <div className="p-6 space-y-5">
                  {/* Customer & Purpose */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="text-sm font-medium text-muted-foreground">{t.more.partyCustomer} *</label>
                      <input
                        type="text"
                        value={dcSelectedCustomer ? getPartyName(dcSelectedCustomer) : dcCustomerSearch}
                        onChange={e => {
                          setDcCustomerSearch(e.target.value)
                          setDcSelectedCustomer(null)
                          setShowDcCustomerDropdown(true)
                        }}
                        onFocus={() => setShowDcCustomerDropdown(true)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder={t.more.searchOrTypeParty}
                      />
                      {showDcCustomerDropdown && dcCustomerSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {availableParties
                            .filter(p => getPartyName(p).toLowerCase().includes(dcCustomerSearch.toLowerCase()))
                            .slice(0, 5)
                            .map(party => (
                              <div
                                key={party.id}
                                onClick={() => {
                                  setDcSelectedCustomer(party)
                                  setDcCustomerSearch('')
                                  setShowDcCustomerDropdown(false)
                                }}
                                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                              >
                                <p className="font-medium">{getPartyName(party)}</p>
                                <p className="text-xs text-muted-foreground">{party.phone}</p>
                              </div>
                            ))}
                        </div>
                      )}
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
                  <div className="relative">
                    <label className="text-sm font-medium text-muted-foreground">{t.more.addItems} *</label>
                    <input
                      type="text"
                      value={dcItemSearch}
                      onChange={e => {
                        setDcItemSearch(e.target.value)
                        setShowDcItemDropdown(true)
                      }}
                      onFocus={() => setShowDcItemDropdown(true)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      placeholder={t.more.searchItems}
                    />
                    {showDcItemDropdown && dcItemSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {availableItems
                          .filter(item => item.name.toLowerCase().includes(dcItemSearch.toLowerCase()))
                          .slice(0, 8)
                          .map(item => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setDcItems([...dcItems, {
                                  itemId: item.id,
                                  name: item.name,
                                  hsnCode: item.hsnCode,
                                  qty: 1,
                                  unit: item.unit || 'PCS',
                                  rate: item.sellingPrice || 0
                                }])
                                setDcItemSearch('')
                                setShowDcItemDropdown(false)
                              }}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between"
                            >
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">Stock: {item.stock} {item.unit}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
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
                    <div className="p-6 border-2 border-dashed rounded-lg text-center">
                      <Truck size={32} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Search and add items to deliver</p>
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
                className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Header with Proforma Badge */}
                <div className="p-4 border-b border-border bg-gradient-to-r from-red-500 to-orange-500">
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

                <div className="p-6 space-y-5">
                  {/* Customer Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="text-sm font-medium text-muted-foreground">{t.more.selectCustomer} *</label>
                      <input
                        type="text"
                        value={piSelectedCustomer ? getPartyName(piSelectedCustomer) : piCustomerSearch}
                        onChange={e => {
                          setPiCustomerSearch(e.target.value)
                          setPiSelectedCustomer(null)
                          setShowPiCustomerDropdown(true)
                        }}
                        onFocus={() => setShowPiCustomerDropdown(true)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder={t.more.searchCustomer}
                      />
                      {showPiCustomerDropdown && piCustomerSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {availableParties
                            .filter(p => (p.displayName || p.companyName || '').toLowerCase().includes(piCustomerSearch.toLowerCase()))
                            .slice(0, 5)
                            .map(party => (
                              <div
                                key={party.id}
                                onClick={() => {
                                  setPiSelectedCustomer(party)
                                  setPiCustomerSearch('')
                                  setShowPiCustomerDropdown(false)
                                }}
                                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                              >
                                <p className="font-medium">{getPartyName(party)}</p>
                                <p className="text-xs text-muted-foreground">{party.phone} • {party.billingAddress?.state}</p>
                              </div>
                            ))}
                          {availableParties.filter(p => (p.displayName || p.companyName || '').toLowerCase().includes(piCustomerSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">{t.more.noMatchNewCustomer}</p>
                          )}
                        </div>
                      )}
                      {piSelectedCustomer && (
                        <div className="mt-1 p-2 bg-success/10 rounded text-xs text-success">
                          ✓ {piSelectedCustomer.displayName || piSelectedCustomer.companyName} | {piSelectedCustomer.gstDetails?.gstin || t.more.noGstin} | {piSelectedCustomer.billingAddress?.state}
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
                  <div className="relative">
                    <label className="text-sm font-medium text-muted-foreground">{t.more.addItems} *</label>
                    <input
                      type="text"
                      value={piItemSearch}
                      onChange={e => {
                        setPiItemSearch(e.target.value)
                        setShowPiItemDropdown(true)
                      }}
                      onFocus={() => setShowPiItemDropdown(true)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      placeholder={t.more.searchItemsHsn}
                    />
                    {showPiItemDropdown && piItemSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {availableItems
                          .filter(item => 
                            item.name.toLowerCase().includes(piItemSearch.toLowerCase()) ||
                            (item.hsnCode && item.hsnCode.includes(piItemSearch))
                          )
                          .slice(0, 8)
                          .map(item => (
                            <div
                              key={item.id}
                              onClick={() => {
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
                                setShowPiItemDropdown(false)
                              }}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between"
                            >
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">HSN: {item.hsnCode || 'N/A'} • {item.unit}</p>
                              </div>
                              <p className="text-accent font-medium">₹{item.sellingPrice || item.mrp || 0}</p>
                            </div>
                          ))}
                      </div>
                    )}
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
                    <div className="p-6 border-2 border-dashed rounded-lg text-center">
                      <Receipt size={32} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Search and add items above</p>
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
              className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
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
                      const result = await createPurchaseOrder({
                        poNumber,
                        supplierName: poSelectedSupplier.companyName || '',
                        supplierId: poSelectedSupplier.id,
                        items: poItems.map(item => ({
                          itemId: item.itemId || '',
                          name: item.name,
                          quantity: item.qty,
                          rate: item.rate,
                          amount: item.qty * item.rate
                        })),
                        totalAmount: poItems.reduce((sum, item) => sum + (item.qty * item.rate), 0),
                        expectedDeliveryDate: poExpectedDate,
                        notes: poNotes,
                        status: 'pending'
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
              className="relative bg-card rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
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
    </div>
  )
}

export default More

