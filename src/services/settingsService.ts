// Settings Service - App configuration and company settings
const LOCAL_STORAGE_KEY = 'thisai_crm_settings'

export interface CompanySettings {
  // Company Details
  companyName: string
  tradeName?: string
  gstin: string
  pan?: string
  cin?: string
  businessType?: 'proprietor' | 'partnership' | 'llp' | 'pvt_ltd' | 'public_ltd' | 'huf' | 'trust' | 'society' | 'other'

  // Contact Info
  email: string
  phone: string
  website?: string

  // Address
  address: string
  city: string
  state: string
  stateCode: string
  pincode: string
  country: string

  // Bank Details
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  branch?: string
  accountHolderName?: string

  // Signature & Branding
  signatureUrl?: string

  // Invoice Settings
  invoicePrefix: string
  invoiceStartNumber: number
  quotationPrefix: string
  showLogo: boolean
  logoUrl?: string

  // Tax Settings
  taxRegistrationType: 'regular' | 'composition' | 'unregistered'
  defaultTaxRate: number
  enableCess: boolean
  enableTCS: boolean
  enableTDS: boolean

  // E-Invoice Settings
  eInvoiceEnabled: boolean
  eInvoiceProvider?: 'NIC' | 'ClearTax' | 'MasterGST'
  eInvoiceApiKey?: string
  eInvoiceUsername?: string

  // Payment Settings
  upiId?: string
  paymentQRCode?: string
  paymentTermsDays: number

  // Recurring Invoice Settings
  recurringInvoiceEnabled: boolean

  // Reminder Settings
  reminderEnabled: boolean
  reminderDays: number[]
  reminderAutoSend: boolean

  // Currency & Format
  currency: string
  currencySymbol: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  numberFormat: 'indian' | 'international'

  // Misc
  termsAndConditions?: string
  notes?: string
}

export interface AppPreferences {
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'hi' | 'ta' | 'te'
  notifications: boolean
  emailNotifications: boolean
  whatsappNotifications: boolean

  // Defaults
  defaultPartyType: 'customer' | 'supplier'
  defaultPaymentMode: 'cash' | 'bank' | 'upi'

  // Features
  enableOfflineMode: boolean
  enableAutoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
}

// General Settings
export interface GeneralSettings {
  businessName: string
  financialYear: string
  currency: 'INR' | 'USD' | 'EUR'
  currencySymbol: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12' | '24'
  darkMode: boolean
}

// Transaction Settings
export interface TransactionSettings {
  autoGenerateInvoiceNumbers: boolean
  showTermsOnInvoice: boolean
  requireApproval: boolean
  invoicePrefix: string
  nextInvoiceNumber: number
  defaultPaymentTerms: 'due_on_receipt' | 'net_15' | 'net_30' | 'net_45' | 'net_60'
}

// Invoice Print Settings
export interface InvoicePrintSettings {
  template: 'classic' | 'modern' | 'minimal' | 'professional'
  showLogo: boolean
  showBankDetails: boolean
  showPaymentQR: boolean
  showSignature: boolean
  footerText: string
  paperSize: 'a4' | 'letter' | 'thermal'
}

// Tax Settings (expanded)
export interface TaxSettings {
  gstin: string
  registrationType: 'regular' | 'composition'
  enableGST0: boolean
  enableGST5: boolean
  enableGST12: boolean
  enableGST18: boolean
  enableGST28: boolean
  applyReverseCharge: boolean
  includeCess: boolean
  // Default Tax Mode (Vyapar Style)
  defaultTaxMode: 'inclusive' | 'exclusive' // Default for new items (selling)
  defaultPurchaseTaxMode: 'inclusive' | 'exclusive' // Default for new items (purchase)
}

// SMS Settings
export interface SMSSettings {
  smsCredits: number
  sendOnInvoiceCreation: boolean
  sendPaymentReminders: boolean
  sendDeliveryUpdates: boolean
  smsTemplate: string
}

// Reminder Settings
export interface ReminderSettings {
  sendOverdueReminders: boolean
  remindBeforeDays: number
  alertLowStock: boolean
  lowStockThreshold: number
  emailNotifications: boolean
  smsNotifications: boolean
  whatsappNotifications: boolean
}

// Party Settings
export interface PartySettings {
  requireGSTIN: boolean
  enableCreditLimit: boolean
  trackLedgerAutomatically: boolean
  defaultCreditPeriod: number
  partyCategories: string[]
}

// Item Settings
export interface ItemSettings {
  autoGenerateSKU: boolean
  trackInventory: boolean
  enableBarcode: boolean
  allowNegativeStock: boolean
  defaultTaxRate: number
  itemUnits: string[]
}

// Invoice Table Column Settings - Customizable Headers
export interface InvoiceTableColumnSettings {
  // Column Labels (customizable text)
  serialNoLabel: string
  itemNameLabel: string
  hsnCodeLabel: string
  descriptionLabel: string
  qtyLabel: string
  unitLabel: string
  taxModeLabel: string
  mrpLabel: string
  taxableLabel: string
  discountPercentLabel: string
  discountAmountLabel: string
  gstPercentLabel: string
  gstAmountLabel: string
  cgstLabel: string
  sgstLabel: string
  igstLabel: string
  totalLabel: string

  // Column Visibility (default on/off)
  showHsnCode: boolean
  showDescription: boolean
  showTaxMode: boolean
  showDiscount: boolean
  showGstBreakdown: boolean
}

// ========== OFFLINE & SYNC SETTINGS ==========

export interface OfflineSyncSettings {
  // Offline Mode
  offlineFirstMode: boolean // Save locally first, sync later
  enableOfflineMode: boolean // Allow offline usage

  // Sync Settings
  autoSync: boolean // Auto sync when online
  syncInterval: number // Sync interval in seconds (15, 30, 60, 300)
  syncOnlyOnWifi: boolean // Only sync on WiFi
  instantSync: boolean // Sync immediately when app is open

  // Cache Settings
  localCacheSize: number // Cache size in MB (100, 250, 500, 1000)
  cacheItems: boolean // Cache items for offline
  cacheParties: boolean // Cache parties for offline
  cacheInvoices: boolean // Cache recent invoices

  // Data Management
  lastSyncTime: string | null // ISO timestamp
  pendingSyncCount: number // Number of pending sync items
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline' | 'success'
  lastSyncError: string | null
}

/**
 * Get offline sync settings
 */
export function getOfflineSyncSettings(): OfflineSyncSettings {
  try {
    const stored = localStorage.getItem('offlineSyncSettings')
    if (stored) {
      return { ...getDefaultOfflineSyncSettings(), ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Error reading offline sync settings:', error)
  }
  return getDefaultOfflineSyncSettings()
}

/**
 * Save offline sync settings
 */
export function saveOfflineSyncSettings(settings: Partial<OfflineSyncSettings>): void {
  try {
    const current = getOfflineSyncSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem('offlineSyncSettings', JSON.stringify(updated))

    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('offline-settings-changed', { detail: updated }))
  } catch (error) {
    console.error('Error saving offline sync settings:', error)
  }
}

/**
 * Update sync status
 */
export function updateSyncStatus(status: OfflineSyncSettings['syncStatus'], error?: string): void {
  const settings = getOfflineSyncSettings()
  settings.syncStatus = status
  if (status === 'success') {
    settings.lastSyncTime = new Date().toISOString()
    settings.lastSyncError = null
  } else if (status === 'error' && error) {
    settings.lastSyncError = error
  }
  saveOfflineSyncSettings(settings)
}

/**
 * Get default offline sync settings
 */
function getDefaultOfflineSyncSettings(): OfflineSyncSettings {
  return {
    offlineFirstMode: true,
    enableOfflineMode: true,
    autoSync: true,
    syncInterval: 30,
    syncOnlyOnWifi: false,
    instantSync: true,
    localCacheSize: 250,
    cacheItems: true,
    cacheParties: true,
    cacheInvoices: true,
    lastSyncTime: null,
    pendingSyncCount: 0,
    syncStatus: 'idle',
    lastSyncError: null
  }
}

/**
 * Get company settings
 */
export function getCompanySettings(): CompanySettings {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.company || getDefaultCompanySettings()
    }
  } catch (error) {
    console.error('Error reading settings:', error)
  }
  return getDefaultCompanySettings()
}

/**
 * Get app preferences
 */
export function getAppPreferences(): AppPreferences {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.preferences || getDefaultAppPreferences()
    }
  } catch (error) {
    console.error('Error reading preferences:', error)
  }
  return getDefaultAppPreferences()
}

/**
 * Save company settings
 */
export function saveCompanySettings(settings: Partial<CompanySettings>): void {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    const current = stored ? JSON.parse(stored) : {}

    current.company = {
      ...getDefaultCompanySettings(),
      ...current.company,
      ...settings
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current))
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

/**
 * Save app preferences
 */
export function saveAppPreferences(preferences: Partial<AppPreferences>): void {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    const current = stored ? JSON.parse(stored) : {}

    current.preferences = {
      ...getDefaultAppPreferences(),
      ...current.preferences,
      ...preferences
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current))
  } catch (error) {
    console.error('Error saving preferences:', error)
  }
}

/**
 * Default company settings
 */
function getDefaultCompanySettings(): CompanySettings {
  return {
    companyName: 'Your Company Name',
    gstin: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    stateCode: '33',
    pincode: '',
    country: 'India',

    invoicePrefix: 'INV',
    invoiceStartNumber: 1,
    quotationPrefix: 'QUO',
    showLogo: false,

    taxRegistrationType: 'regular',
    defaultTaxRate: 18,
    enableCess: false,
    enableTCS: false,
    enableTDS: false,

    eInvoiceEnabled: false,

    paymentTermsDays: 30,

    recurringInvoiceEnabled: false,

    reminderEnabled: false,
    reminderDays: [3, 7, 15, 30],
    reminderAutoSend: false,

    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'indian'
  }
}

/**
 * Default app preferences
 */
function getDefaultAppPreferences(): AppPreferences {
  return {
    theme: 'light',
    language: 'en',
    notifications: true,
    emailNotifications: false,
    whatsappNotifications: true,

    defaultPartyType: 'customer',
    defaultPaymentMode: 'cash',

    enableOfflineMode: true,
    enableAutoBackup: false,
    backupFrequency: 'weekly'
  }
}

// ========== GENERAL SETTINGS ==========

export function getGeneralSettings(): GeneralSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.general || getDefaultGeneralSettings()
    }
  } catch (error) {
    console.error('Error reading general settings:', error)
  }
  return getDefaultGeneralSettings()
}

export function saveGeneralSettings(settings: Partial<GeneralSettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.general = { ...getDefaultGeneralSettings(), ...current.general, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving general settings:', error)
  }
}

function getDefaultGeneralSettings(): GeneralSettings {
  return {
    businessName: 'Billing Pro',
    financialYear: '2023-2024',
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12',
    darkMode: false
  }
}

// ========== TRANSACTION SETTINGS ==========

export function getTransactionSettings(): TransactionSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.transaction || getDefaultTransactionSettings()
    }
  } catch (error) {
    console.error('Error reading transaction settings:', error)
  }
  return getDefaultTransactionSettings()
}

export function saveTransactionSettings(settings: Partial<TransactionSettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.transaction = { ...getDefaultTransactionSettings(), ...current.transaction, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving transaction settings:', error)
  }
}

function getDefaultTransactionSettings(): TransactionSettings {
  return {
    autoGenerateInvoiceNumbers: true,
    showTermsOnInvoice: true,
    requireApproval: false,
    invoicePrefix: 'INV',
    nextInvoiceNumber: 1001,
    defaultPaymentTerms: 'due_on_receipt'
  }
}

// ========== INVOICE PRINT SETTINGS ==========

export function getInvoicePrintSettings(): InvoicePrintSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.invoicePrint || getDefaultInvoicePrintSettings()
    }
  } catch (error) {
    console.error('Error reading invoice print settings:', error)
  }
  return getDefaultInvoicePrintSettings()
}

export function saveInvoicePrintSettings(settings: Partial<InvoicePrintSettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.invoicePrint = { ...getDefaultInvoicePrintSettings(), ...current.invoicePrint, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving invoice print settings:', error)
  }
}

function getDefaultInvoicePrintSettings(): InvoicePrintSettings {
  return {
    template: 'classic',
    showLogo: true,
    showBankDetails: true,
    showPaymentQR: true,
    showSignature: false,
    footerText: '',
    paperSize: 'a4'
  }
}

// ========== TAX SETTINGS ==========

export function getTaxSettings(): TaxSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    let taxSettings = getDefaultTaxSettings()

    if (stored) {
      const settings = JSON.parse(stored)
      taxSettings = { ...taxSettings, ...settings.tax }
    }

    // If GSTIN is not set in tax settings, try to get it from company settings
    if (!taxSettings.gstin) {
      const companySettings = getCompanySettings()
      if (companySettings.gstin) {
        taxSettings.gstin = companySettings.gstin
      }
    }

    return taxSettings
  } catch (error) {
    console.error('Error reading tax settings:', error)
  }
  return getDefaultTaxSettings()
}

export function saveTaxSettings(settings: Partial<TaxSettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.tax = { ...getDefaultTaxSettings(), ...current.tax, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving tax settings:', error)
  }
}

function getDefaultTaxSettings(): TaxSettings {
  return {
    gstin: '',
    registrationType: 'regular',
    enableGST0: true,
    enableGST5: true,
    enableGST12: true,
    enableGST18: true,
    enableGST28: true,
    applyReverseCharge: true,
    includeCess: false,
    defaultTaxMode: 'exclusive', // Default: GST added on top (like Vyapar)
    defaultPurchaseTaxMode: 'exclusive' // Default: GST added on top
  }
}

// ========== SMS SETTINGS ==========

export function getSMSSettings(): SMSSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.sms || getDefaultSMSSettings()
    }
  } catch (error) {
    console.error('Error reading SMS settings:', error)
  }
  return getDefaultSMSSettings()
}

export function saveSMSSettings(settings: Partial<SMSSettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.sms = { ...getDefaultSMSSettings(), ...current.sms, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving SMS settings:', error)
  }
}

function getDefaultSMSSettings(): SMSSettings {
  return {
    smsCredits: 450,
    sendOnInvoiceCreation: true,
    sendPaymentReminders: true,
    sendDeliveryUpdates: false,
    smsTemplate: 'Dear {customer}, Invoice {invoice_no} of Rs.{amount} has been generated. Pay via {link}. -Billing Pro'
  }
}

// ========== REMINDER SETTINGS ==========

export function getReminderSettings(): ReminderSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.reminder || getDefaultReminderSettings()
    }
  } catch (error) {
    console.error('Error reading reminder settings:', error)
  }
  return getDefaultReminderSettings()
}

export function saveReminderSettings(settings: Partial<ReminderSettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.reminder = { ...getDefaultReminderSettings(), ...current.reminder, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving reminder settings:', error)
  }
}

function getDefaultReminderSettings(): ReminderSettings {
  return {
    sendOverdueReminders: true,
    remindBeforeDays: 3,
    alertLowStock: true,
    lowStockThreshold: 10,
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: false
  }
}

// ========== PARTY SETTINGS ==========

export function getPartySettings(): PartySettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.party || getDefaultPartySettings()
    }
  } catch (error) {
    console.error('Error reading party settings:', error)
  }
  return getDefaultPartySettings()
}

export function savePartySettings(settings: Partial<PartySettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.party = { ...getDefaultPartySettings(), ...current.party, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving party settings:', error)
  }
}

function getDefaultPartySettings(): PartySettings {
  return {
    requireGSTIN: false, // GST is optional by default
    enableCreditLimit: false,
    trackLedgerAutomatically: true,
    defaultCreditPeriod: 30,
    partyCategories: ['Regular Customer', 'Wholesale', 'Retailer', 'Distributor']
  }
}

// ========== ITEM SETTINGS ==========

export function getItemSettings(): ItemSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.item || getDefaultItemSettings()
    }
  } catch (error) {
    console.error('Error reading item settings:', error)
  }
  return getDefaultItemSettings()
}

export function saveItemSettings(settings: Partial<ItemSettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.item = { ...getDefaultItemSettings(), ...current.item, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving item settings:', error)
  }
}

function getDefaultItemSettings(): ItemSettings {
  return {
    autoGenerateSKU: true,
    trackInventory: true,
    enableBarcode: false,
    allowNegativeStock: false,
    defaultTaxRate: 18,
    itemUnits: ['Pieces (PCS)', 'Box (BOX)', 'Carton (CTN)', 'Dozen (DZ)', 'Kg', 'Liter']
  }
}

// ========== INVOICE TABLE COLUMN SETTINGS ==========

export function getInvoiceTableColumnSettings(): InvoiceTableColumnSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return settings.invoiceTableColumns || getDefaultInvoiceTableColumnSettings()
    }
  } catch (error) {
    console.error('Error reading invoice table column settings:', error)
  }
  return getDefaultInvoiceTableColumnSettings()
}

export function saveInvoiceTableColumnSettings(settings: Partial<InvoiceTableColumnSettings>): void {
  try {
    const stored = localStorage.getItem('appSettings')
    const current = stored ? JSON.parse(stored) : {}
    current.invoiceTableColumns = { ...getDefaultInvoiceTableColumnSettings(), ...current.invoiceTableColumns, ...settings }
    localStorage.setItem('appSettings', JSON.stringify(current))
  } catch (error) {
    console.error('Error saving invoice table column settings:', error)
  }
}

function getDefaultInvoiceTableColumnSettings(): InvoiceTableColumnSettings {
  return {
    // Column Labels (default text)
    serialNoLabel: '#',
    itemNameLabel: 'Item Name',
    hsnCodeLabel: 'HSN',
    descriptionLabel: 'Description',
    qtyLabel: 'Qty',
    unitLabel: 'Unit',
    taxModeLabel: 'Tax Mode',
    mrpLabel: 'MRP',
    taxableLabel: 'Taxable',
    discountPercentLabel: 'Disc %',
    discountAmountLabel: 'Disc ₹',
    gstPercentLabel: 'GST %',
    gstAmountLabel: 'GST ₹',
    cgstLabel: 'CGST%',
    sgstLabel: 'SGST%',
    igstLabel: 'IGST%',
    totalLabel: 'Total',

    // Column Visibility (default on/off)
    showHsnCode: false,
    showDescription: false,
    showTaxMode: true,
    showDiscount: true,
    showGstBreakdown: false
  }
}

/**
 * Export all data (backup)
 */
export async function exportAllData(): Promise<Blob> {
  const data = {
    settings: localStorage.getItem(LOCAL_STORAGE_KEY),
    invoices: localStorage.getItem('thisai_crm_invoices'),
    payments: localStorage.getItem('thisai_crm_payments'),
    parties: localStorage.getItem('thisai_crm_parties'),
    items: localStorage.getItem('thisai_crm_items'),
    ledger: localStorage.getItem('thisai_crm_ledger_entries'),
    quotations: localStorage.getItem('thisai_crm_quotations'),
    expenses: localStorage.getItem('thisai_crm_expenses'),
    bankAccounts: localStorage.getItem('thisai_crm_bank_accounts'),
    bankTransactions: localStorage.getItem('thisai_crm_bank_transactions'),
    recurringInvoices: localStorage.getItem('thisai_crm_recurring_invoices'),
    exportDate: new Date().toISOString()
  }

  const json = JSON.stringify(data, null, 2)
  // Use octet-stream to force download/save dialog in browsers instead of opening JSON inline
  return new Blob([json], { type: 'application/octet-stream' })
}

/**
 * Import all data (restore)
 */
export async function importAllData(file: File): Promise<boolean> {
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    // Validate data structure
    if (!data.exportDate) {
      throw new Error('Invalid backup file')
    }

    // Restore data
    if (data.settings) localStorage.setItem(LOCAL_STORAGE_KEY, data.settings)
    if (data.invoices) localStorage.setItem('thisai_crm_invoices', data.invoices)
    if (data.payments) localStorage.setItem('thisai_crm_payments', data.payments)
    if (data.parties) localStorage.setItem('thisai_crm_parties', data.parties)
    if (data.items) localStorage.setItem('thisai_crm_items', data.items)
    if (data.ledger) localStorage.setItem('thisai_crm_ledger_entries', data.ledger)
    if (data.quotations) localStorage.setItem('thisai_crm_quotations', data.quotations)
    if (data.expenses) localStorage.setItem('thisai_crm_expenses', data.expenses)
    if (data.bankAccounts) localStorage.setItem('thisai_crm_bank_accounts', data.bankAccounts)
    if (data.bankTransactions) localStorage.setItem('thisai_crm_bank_transactions', data.bankTransactions)
    if (data.recurringInvoices) localStorage.setItem('thisai_crm_recurring_invoices', data.recurringInvoices)

    return true
  } catch (error) {
    console.error('Error importing data:', error)
    return false
  }
}
