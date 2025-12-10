// Comprehensive Data Models for Invoice System

// ============================================
// PARTY (Customer/Supplier) TYPES
// ============================================

export interface Address {
  street: string
  area?: string
  city: string
  state: string
  pinCode: string
  country: string
}

export interface PartyContact {
  name: string
  designation?: string
  phone: string
  email: string
  isPrimary: boolean
}

export interface GSTDetails {
  gstin: string
  gstType: 'Regular' | 'Composition' | 'Unregistered'
  stateCode: string
  registrationDate?: string
}

export interface BankDetails {
  accountName: string
  accountNumber: string
  bankName: string
  branch: string
  ifscCode: string
  accountType: 'Savings' | 'Current'
}

export interface Party {
  id: string
  type: 'customer' | 'supplier' | 'both'

  // Basic Info
  companyName: string
  displayName: string
  contactPersonName?: string

  // Contact Details
  phone: string
  email: string
  website?: string
  contacts: PartyContact[]

  // Address
  billingAddress: Address
  shippingAddress?: Address
  sameAsShipping: boolean

  // GST & Tax
  gstDetails?: GSTDetails
  panNumber?: string
  tanNumber?: string

  // Bank Details
  bankDetails?: BankDetails

  // Business Details
  creditLimit?: number
  creditDays?: number
  paymentTerms?: string

  // Vehicle Information
  vehicleNo?: string

  // Metadata
  openingBalance: number
  currentBalance: number
  createdAt: string
  updatedAt: string
  createdBy: string
  notes?: string
  tags?: string[]
  isActive: boolean

  // Live Outstanding Balance (2025 Standard - Vyapar/Marg/Zoho style)
  // Outstanding = Opening Balance + Total Sales - Total Receipts - Credit Notes
  // Positive = they owe us (receivable for customer, payable for supplier)
  // Negative = we owe them (advance/credit)
  outstanding?: number
  outstandingFormatted?: string // e.g., "₹2,450" or "-₹1,200"
  outstandingColor?: 'green' | 'red' | 'grey' // green=receivable, red=payable, grey=settled
}

// ============================================
// ITEM/PRODUCT TYPES
// ============================================

export interface ItemTax {
  cgst: number
  sgst: number
  igst: number
  gstRate?: number
  cess?: number
}

export interface Item {
  id: string

  // Basic Info
  name: string
  description?: string
  itemCode: string
  hsnCode?: string
  sacCode?: string

  // Classification
  category: string
  subcategory?: string
  brand?: string

  // Pricing
  sellingPrice: number
  purchasePrice: number
  mrp?: number
  unit: 'NONE' | 'KGS' | 'PCS' | 'LTRS' | 'MTR' | 'SET' | 'BOX' | 'PACK'

  // Tax
  taxPreference: 'taxable' | 'non-taxable'
  tax: ItemTax

  // GST Tax Mode (Inclusive/Exclusive) - Separate for Selling & Purchase
  taxMode?: 'inclusive' | 'exclusive' // For selling price (default: 'inclusive')
  purchaseTaxMode?: 'inclusive' | 'exclusive' // For purchase price (default: 'inclusive')
  baseSellingPrice?: number // Auto-calculated base if selling is inclusive
  basePurchasePrice?: number // Auto-calculated base if purchase is inclusive

  // Inventory
  stock: number
  minStock: number
  maxStock: number
  reorderPoint: number

  // Multi-Unit Conversion
  hasMultiUnit?: boolean
  baseUnit?: string // e.g., 'Pcs' - smallest unit for stock tracking
  purchaseUnit?: string // e.g., 'Box' - unit for purchasing
  piecesPerPurchaseUnit?: number // e.g., 12 - how many pieces in one box
  sellingPricePerPiece?: number // Price per single piece
  purchasePricePerBox?: number // Price per box
  defaultSaleUnitId?: string // Default unit for sales ('Pcs' or 'Box')
  defaultPurchaseUnitId?: string // Default unit for purchases ('Box')
  stockBase?: number // Stock always in base units (pieces)

  // Metadata
  barcode?: string
  sku?: string
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================
// INVOICE/BILL TYPES
// ============================================

export interface InvoiceItem {
  id: string
  itemId: string
  itemName: string
  description?: string
  hsnCode?: string

  // Quantity & Pricing
  quantity: number
  unit: string
  rate: number
  purchasePrice?: number  // For profit calculation

  // Discounts
  discountPercent: number
  discountAmount: number

  // Tax
  taxableAmount: number
  cgstPercent: number
  cgstAmount: number
  sgstPercent: number
  sgstAmount: number
  igstPercent: number
  igstAmount: number
  cessPercent?: number
  cessAmount?: number

  // Total
  totalAmount: number

  // Profit (for sales invoices)
  profitMargin?: number  // Selling price - Purchase price
  profitPercent?: number  // (Profit / Selling price) * 100
}

export interface TransportDetails {
  transporterName?: string
  transporterGSTIN?: string
  vehicleNumber?: string
  dispatchDocNo?: string
  dispatchedThrough?: string
  destination?: string
  billOfLading?: string
  deliveryNoteDate?: string
}

export interface PaymentInfo {
  mode: 'cash' | 'card' | 'upi' | 'bank' | 'cheque' | 'credit'
  status: 'paid' | 'partial' | 'unpaid'
  paidAmount: number
  dueAmount: number
  dueDate?: string
  transactionId?: string
  chequeNumber?: string
  chequeDate?: string
  bankReference?: string
}

export interface CreditNote {
  id: string
  creditNoteNumber: string
  creditNoteDate: string
  type: 'credit' | 'debit' // credit for sales returns, debit for purchase returns

  // Reference to original invoice
  originalInvoiceId: string
  originalInvoiceNumber: string

  // Party Details
  partyId: string
  partyName: string
  partyGSTIN?: string

  // Items being returned/adjusted
  items: InvoiceItem[]

  // Reason
  reason: 'return' | 'discount' | 'error_correction' | 'damage' | 'other'
  reasonDescription?: string

  // Amounts
  subtotal: number
  totalTaxAmount: number
  grandTotal: number

  // Adjustment
  adjustmentType: 'refund' | 'adjust_balance' | 'replace'
  refundAmount?: number
  refundMode?: 'cash' | 'bank' | 'upi' | 'card'
  refundReference?: string  // For bank refunds: bank account name/number

  // Status
  status: 'draft' | 'approved' | 'cancelled'

  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  notes?: string
}

export interface SalesReturn {
  id: string
  returnNumber: string
  returnDate: string

  // Reference to original sale invoice
  originalInvoiceId: string
  originalInvoiceNumber: string

  // Customer
  customerId: string
  customerName: string

  // Items being returned
  items: Array<{
    itemId: string
    itemName: string
    quantityReturned: number
    rate: number
    amount: number
  }>

  // Reason
  reason: 'defective' | 'wrong_item' | 'customer_request' | 'damaged' | 'other'
  reasonDescription?: string

  // Total
  totalAmount: number

  // Action taken
  action: 'refund' | 'replacement' | 'store_credit'
  refundAmount?: number

  // Status
  status: 'pending' | 'approved' | 'completed' | 'rejected'

  // Auto-generated credit note
  creditNoteId?: string

  // Metadata
  createdAt: string
  updatedAt: string
  approvedBy?: string
}

export interface Invoice {
  id: string
  type: 'sale' | 'credit'
  source?: 'pos' | 'invoice' | 'ai' // Track where invoice was created from

  // Invoice Details
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string

  // Party Details
  partyId: string
  partyName: string
  partyGSTIN?: string
  partyAddress: Address
  partyPhone: string
  partyEmail: string

  // Business Details (Self)
  businessName: string
  businessGSTIN?: string
  businessAddress: Address
  businessPhone: string
  businessEmail: string
  businessStateCode: string

  // Reference
  referenceNumber?: string
  referenceDate?: string
  buyerOrderNumber?: string
  buyerOrderDate?: string
  deliveryNoteNumber?: string

  // Items
  items: InvoiceItem[]

  // Amounts
  subtotal: number
  discountPercent: number
  discountAmount: number
  taxableAmount: number

  // Tax Breakdown
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  cessAmount: number
  totalTaxAmount: number

  // Additional Charges
  shippingCharges: number
  otherCharges: number
  roundOff: number

  // Total
  grandTotal: number

  // Profit (for sales invoices)
  totalProfit?: number  // Sum of all item profit margins
  totalProfitPercent?: number  // (Total Profit / Grand Total) * 100

  // Payment
  payment: PaymentInfo

  // Transport
  transport?: TransportDetails

  // Terms & Conditions
  termsOfDelivery?: string
  paymentTerms?: string
  notes?: string

  // Metadata
  status: 'draft' | 'approved' | 'sent' | 'paid' | 'cancelled'
  createdAt: string
  updatedAt: string
  createdBy: string

  // E-Invoice (if applicable)
  eInvoiceNumber?: string
  eInvoiceIRN?: string
  eInvoiceAckNo?: string
  eInvoiceAckDate?: string
  eInvoiceQRCode?: string

  // Marketplace/Channel Details (for GST Sales Register - Output Tax)
  // Used to calculate correct taxable value for marketplaces like Amazon, Flipkart, Meesho etc.
  platform?: 'amazon' | 'flipkart' | 'meesho' | 'shopify' | 'website' | 'offline' | 'other'
  platformName?: string // Custom platform name if 'other'
  orderId?: string // Marketplace order ID (e.g., AMZ2025-12345)

  // Deductions for taxable value calculation (GST Compliance)
  shippingChargedToCustomer?: number // Shipping charged separately to customer
  tcsCollected?: number // TCS (1%) collected by marketplace - deducted from settlement
  tdsDeducted?: number // TDS deducted by marketplace (if applicable)
  marketplaceFees?: number // Commission + other marketplace fees
  marketplaceCommissionPercent?: number // Commission percentage for reference

  // Settlement Details
  settlementAmount?: number // Actual amount received from marketplace
  settlementDate?: string
  settlementReference?: string

  // Place of Supply (for IGST determination)
  placeOfSupply?: string // State code or state name
  isInterState?: boolean // true = IGST, false = CGST+SGST

  // Reverse Charge (RCM)
  isReverseCharge?: boolean
  rcmAmount?: number
}

// ============================================
// RECEIPT SCANNER TYPES
// ============================================

export interface ScannedInvoiceData {
  // Vendor/Supplier Info
  vendor: {
    name: string
    address?: string
    city?: string
    state?: string
    pinCode?: string
    gstin?: string
    stateCode?: string
    phone?: string
    email?: string
  }

  // Buyer Info
  buyer?: {
    name: string
    address?: string
    city?: string
    state?: string
    pinCode?: string
    gstin?: string
    stateCode?: string
  }

  // Invoice Details
  invoiceNumber: string
  invoiceDate: string
  deliveryNoteNumber?: string
  referenceNumber?: string
  buyerOrderNumber?: string
  dispatchDocNumber?: string
  deliveryNoteDate?: string
  vehicleNumber?: string
  destination?: string

  // Items
  items: Array<{
    description: string
    hsnCode?: string
    quantity: number
    unit: string
    rate: number
    amount: number
  }>

  // Tax & Totals
  taxableValue: number
  cgstRate: number
  cgstAmount: number
  sgstRate: number
  sgstAmount: number
  igstRate?: number
  igstAmount?: number
  totalTaxAmount: number
  roundOff: number
  grandTotal: number

  // Payment
  paymentMode?: string
  termsOfPayment?: string
}

// ============================================
// SETTINGS TYPES
// ============================================

export interface BusinessSettings {
  // Company Info
  companyName: string
  displayName: string
  logo?: string

  // Contact
  phone: string
  email: string
  website?: string

  // Address
  address: Address

  // GST & Tax
  gstin?: string
  stateCode: string
  panNumber?: string
  tanNumber?: string

  // Bank
  bankDetails?: BankDetails

  // Invoice Settings
  invoicePrefix: string
  invoiceStartNumber: number
  billPrefix: string
  billStartNumber: number

  // Tax Settings
  defaultTaxRate: number
  enableGST: boolean
  enableEInvoice: boolean

  // Other
  fiscalYearStart: string
  currency: string
  dateFormat: string
  timezone: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ============================================
// SUBSCRIPTION PLAN TYPES
// ============================================

export type PlanType = 'silver' | 'gold'

export interface PlanFeatures {
  // Core Features (Available in Silver Plan)
  basicInvoicing: boolean
  partyManagement: boolean
  inventoryBasic: boolean
  advancedReports: boolean
  exportToPDF: boolean
  exportToExcel: boolean
  whatsappIntegration: boolean
  paymentReminders: boolean
  gstReports: boolean
  cashFlowReports: boolean
  profitLossReports: boolean

  // Premium Features (Gold only - Others Section)
  onlineStore: boolean
  deliveryChallan: boolean
  purchaseOrders: boolean
  ewayBiller: boolean
  staffAttendance: boolean
  salaryManagement: boolean
  performanceInvoice: boolean
  multipleLocations: boolean
}

export interface SubscriptionPlan {
  type: PlanType
  name: string
  features: PlanFeatures
  price?: number
  description?: string
}

export const PLAN_CONFIG: Record<PlanType, SubscriptionPlan> = {
  silver: {
    type: 'silver',
    name: 'Silver Plan',
    description: 'Full-featured CRM with core business tools',
    features: {
      // All available in Silver
      basicInvoicing: true,
      partyManagement: true,
      inventoryBasic: true,
      advancedReports: true,
      exportToPDF: true,
      exportToExcel: true,
      whatsappIntegration: true,
      paymentReminders: true,
      gstReports: true,
      cashFlowReports: true,
      profitLossReports: true,

      // Locked in Silver (Others Section only)
      onlineStore: false,
      deliveryChallan: true,
      purchaseOrders: true,
      ewayBiller: false,
      staffAttendance: false,
      salaryManagement: false,
      performanceInvoice: true,
      multipleLocations: false,
    }
  },
  gold: {
    type: 'gold',
    name: 'Gold Plan',
    description: 'Complete enterprise solution with all premium features',
    features: {
      // All features available
      basicInvoicing: true,
      partyManagement: true,
      inventoryBasic: true,
      advancedReports: true,
      exportToPDF: true,
      exportToExcel: true,
      whatsappIntegration: true,
      paymentReminders: true,
      gstReports: true,
      cashFlowReports: true,
      profitLossReports: true,
      onlineStore: true,
      deliveryChallan: true,
      purchaseOrders: true,
      ewayBiller: true,
      staffAttendance: true,
      salaryManagement: true,
      performanceInvoice: true,
      multipleLocations: true,
    }
  }
}

// Extended types to resolve missing properties

export interface Invoice {
  id: string;
  type: 'sale' | 'credit';
  total: number;
  convertedFrom?: string;
  paidAmount?: number;
  paymentStatus?: string;
  paymentMode?: string;
  vehicleNo?: string;
  isReversed?: boolean;
  createdAt: string;
  updatedAt: string;
  // Other properties...
}

export interface InvoiceTab {
  id: string;
  type: 'sale' | 'credit';
  mode: 'invoice' | 'pos';
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerGST: string;
  customerState: string;
  invoiceItems: InvoiceItem[];
  paymentMode: string;
  invoiceDiscount: number;
  notes: string;
  customerSearch: string;
}

export interface CartItem {
  id: string;
  name: string;
  hsnCode?: string;
  discount?: number;
  // Other properties...
}
