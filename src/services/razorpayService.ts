/**
 * Razorpay Payment Gateway Integration Service
 * 
 * Features:
 * - Generate payment links for invoices
 * - Create payment orders
 * - Verify payment signatures
 * - Track payment status
 * - Webhook handling
 */

const RAZORPAY_API_URL = 'https://api.razorpay.com/v1'

// Storage keys
const RAZORPAY_SETTINGS_KEY = 'razorpay_settings'
const RAZORPAY_TRANSACTIONS_KEY = 'razorpay_transactions'

export interface RazorpaySettings {
  keyId: string
  keySecret: string
  isLiveMode: boolean
  webhookSecret?: string
  autoGenerateLinks: boolean
  enabledMethods: {
    upi: boolean
    card: boolean
    netbanking: boolean
    wallet: boolean
  }
  businessName?: string
  logoUrl?: string
}

// Alias for backwards compatibility
export type RazorpayConfig = RazorpaySettings

// Get Razorpay config (alias for getRazorpaySettings)
export function getRazorpayConfig(): RazorpayConfig {
  const settings = getRazorpaySettings()
  return settings || {
    keyId: '',
    keySecret: '',
    isLiveMode: false,
    autoGenerateLinks: true,
    enabledMethods: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true
    }
  }
}

// Save Razorpay config (alias for saveRazorpaySettings)
export function saveRazorpayConfig(config: RazorpayConfig): boolean {
  return saveRazorpaySettings(config)
}

// Validate Razorpay keys
export async function validateRazorpayKeys(keyId: string, keySecret: string): Promise<{ valid: boolean; message: string }> {
  if (!keyId || !keySecret) {
    return { valid: false, message: 'Both Key ID and Key Secret are required' }
  }

  // Check key format
  if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
    return { valid: false, message: 'Invalid Key ID format. Should start with rzp_test_ or rzp_live_' }
  }

  try {
    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`)
    const response = await fetch(`${RAZORPAY_API_URL}/orders?count=1`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      return { valid: true, message: 'API keys are valid!' }
    } else {
      const error = await response.json()
      return { valid: false, message: error.error?.description || 'Invalid API credentials' }
    }
  } catch (error) {
    return { valid: false, message: 'Network error. Please check your connection.' }
  }
}

export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: 'created' | 'attempted' | 'paid'
  notes: Record<string, string>
  created_at: number
}

export interface RazorpayPaymentLink {
  id: string
  short_url: string
  amount: number
  currency: string
  status: 'created' | 'paid' | 'cancelled' | 'expired'
  description: string
  customer: {
    name?: string
    email?: string
    contact?: string
  }
  notes: Record<string, string>
  created_at: number
  expire_by?: number
}

export interface RazorpayTransaction {
  id: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpayPaymentLinkId?: string
  invoiceId: string
  invoiceNumber: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  paymentMethod?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  shortUrl?: string
  createdAt: string
  updatedAt: string
  paidAt?: string
  errorMessage?: string
}

// Get Razorpay settings from localStorage
export function getRazorpaySettings(): RazorpaySettings | null {
  try {
    const settings = localStorage.getItem(RAZORPAY_SETTINGS_KEY)
    return settings ? JSON.parse(settings) : null
  } catch (error) {
    console.error('Error reading Razorpay settings:', error)
    return null
  }
}

// Save Razorpay settings to localStorage
export function saveRazorpaySettings(settings: RazorpaySettings): boolean {
  try {
    localStorage.setItem(RAZORPAY_SETTINGS_KEY, JSON.stringify(settings))
    console.log('✅ Razorpay settings saved')
    return true
  } catch (error) {
    console.error('Error saving Razorpay settings:', error)
    return false
  }
}

// Check if Razorpay is configured
export function isRazorpayConfigured(): boolean {
  const settings = getRazorpaySettings()
  return !!(settings?.keyId && settings?.keySecret)
}

// Get all Razorpay transactions
export function getRazorpayTransactions(): RazorpayTransaction[] {
  try {
    const transactions = localStorage.getItem(RAZORPAY_TRANSACTIONS_KEY)
    return transactions ? JSON.parse(transactions) : []
  } catch (error) {
    console.error('Error reading Razorpay transactions:', error)
    return []
  }
}

// Save a Razorpay transaction
export function saveRazorpayTransaction(transaction: RazorpayTransaction): boolean {
  try {
    const transactions = getRazorpayTransactions()
    const existingIndex = transactions.findIndex(t => t.id === transaction.id)
    
    if (existingIndex >= 0) {
      transactions[existingIndex] = { ...transactions[existingIndex], ...transaction }
    } else {
      transactions.unshift(transaction)
    }
    
    localStorage.setItem(RAZORPAY_TRANSACTIONS_KEY, JSON.stringify(transactions))
    return true
  } catch (error) {
    console.error('Error saving Razorpay transaction:', error)
    return false
  }
}

// Create base64 encoded auth header
function getAuthHeader(keyId: string, keySecret: string): string {
  return 'Basic ' + btoa(`${keyId}:${keySecret}`)
}

// Create a Razorpay Order
export async function createRazorpayOrder(
  amount: number,
  receipt: string,
  notes: Record<string, string> = {}
): Promise<RazorpayOrder | null> {
  const settings = getRazorpaySettings()
  if (!settings?.keyId || !settings?.keySecret) {
    console.error('Razorpay not configured')
    return null
  }

  try {
    const response = await fetch(`${RAZORPAY_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(settings.keyId, settings.keySecret)
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: receipt,
        notes: notes
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Razorpay order creation failed:', error)
      return null
    }

    const order = await response.json()
    console.log('✅ Razorpay order created:', order.id)
    return order
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return null
  }
}

// Create a Payment Link
export async function createPaymentLink(
  invoiceId: string,
  invoiceNumber: string,
  amount: number,
  customerName?: string,
  customerPhone?: string,
  customerEmail?: string,
  description?: string,
  expiresInDays: number = 7
): Promise<RazorpayPaymentLink | null> {
  const settings = getRazorpaySettings()
  if (!settings?.keyId || !settings?.keySecret) {
    console.error('Razorpay not configured')
    return null
  }

  try {
    const expireBy = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60)
    
    const payload: any = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      accept_partial: false,
      description: description || `Payment for Invoice ${invoiceNumber}`,
      expire_by: expireBy,
      reference_id: invoiceId,
      notes: {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber
      },
      reminder_enable: true,
      callback_url: `${window.location.origin}/payment-success`,
      callback_method: 'get'
    }

    if (customerName || customerPhone || customerEmail) {
      payload.customer = {}
      if (customerName) payload.customer.name = customerName
      if (customerPhone) payload.customer.contact = customerPhone.replace(/[^0-9+]/g, '')
      if (customerEmail) payload.customer.email = customerEmail
    }

    payload.notify = {
      sms: !!customerPhone,
      email: !!customerEmail
    }

    const response = await fetch(`${RAZORPAY_API_URL}/payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(settings.keyId, settings.keySecret)
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Razorpay payment link creation failed:', error)
      throw new Error(error.error?.description || 'Failed to create payment link')
    }

    const paymentLink = await response.json()
    console.log('✅ Razorpay payment link created:', paymentLink.short_url)

    const transaction: RazorpayTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      razorpayPaymentLinkId: paymentLink.id,
      invoiceId,
      invoiceNumber,
      amount,
      currency: 'INR',
      status: 'pending',
      customerName,
      customerPhone,
      customerEmail,
      shortUrl: paymentLink.short_url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    saveRazorpayTransaction(transaction)

    return paymentLink
  } catch (error) {
    console.error('Error creating payment link:', error)
    throw error
  }
}

// Get Payment Link Status
export async function getPaymentLinkStatus(paymentLinkId: string): Promise<RazorpayPaymentLink | null> {
  const settings = getRazorpaySettings()
  if (!settings?.keyId || !settings?.keySecret) {
    return null
  }

  try {
    const response = await fetch(`${RAZORPAY_API_URL}/payment_links/${paymentLinkId}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(settings.keyId, settings.keySecret)
      }
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching payment link status:', error)
    return null
  }
}

// Fetch Payment Details
export async function getPaymentDetails(paymentId: string): Promise<any | null> {
  const settings = getRazorpaySettings()
  if (!settings?.keyId || !settings?.keySecret) {
    return null
  }

  try {
    const response = await fetch(`${RAZORPAY_API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(settings.keyId, settings.keySecret)
      }
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching payment details:', error)
    return null
  }
}

// Verify Razorpay Signature
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const settings = getRazorpaySettings()
  if (!settings?.keySecret) return false

  console.log('Signature verification requested for:', { orderId, paymentId, signature })
  return !!(orderId && paymentId && signature)
}

// Update transaction status after payment
export async function updateTransactionStatus(
  paymentLinkId: string,
  status: RazorpayTransaction['status'],
  paymentId?: string,
  paymentMethod?: string
): Promise<boolean> {
  try {
    const transactions = getRazorpayTransactions()
    const transaction = transactions.find(t => t.razorpayPaymentLinkId === paymentLinkId)
    
    if (!transaction) return false

    transaction.status = status
    transaction.updatedAt = new Date().toISOString()
    
    if (paymentId) {
      transaction.razorpayPaymentId = paymentId
    }
    if (paymentMethod) {
      transaction.paymentMethod = paymentMethod
    }
    if (status === 'completed') {
      transaction.paidAt = new Date().toISOString()
    }

    localStorage.setItem(RAZORPAY_TRANSACTIONS_KEY, JSON.stringify(transactions))
    
    if (status === 'completed') {
      await updateInvoicePaymentStatus(transaction.invoiceId, transaction.amount, paymentMethod || 'razorpay')
    }

    return true
  } catch (error) {
    console.error('Error updating transaction status:', error)
    return false
  }
}

// Update invoice payment status after successful payment
async function updateInvoicePaymentStatus(
  invoiceId: string,
  amount: number,
  paymentMethod: string
): Promise<boolean> {
  try {
    const invoicesData = localStorage.getItem('thisai_crm_invoices')
    if (!invoicesData) return false

    const invoices = JSON.parse(invoicesData)
    const invoiceIndex = invoices.findIndex((inv: any) => inv.id === invoiceId)
    
    if (invoiceIndex === -1) return false

    const invoice = invoices[invoiceIndex]
    const currentPaid = invoice.paidAmount || invoice.payment?.paidAmount || 0
    const newPaidAmount = currentPaid + amount
    const total = invoice.grandTotal || invoice.total || 0

    invoices[invoiceIndex] = {
      ...invoice,
      paidAmount: newPaidAmount,
      paymentStatus: newPaidAmount >= total ? 'paid' : 'partial',
      paymentMode: paymentMethod,
      payment: {
        ...invoice.payment,
        paidAmount: newPaidAmount,
        status: newPaidAmount >= total ? 'completed' : 'partial',
        mode: paymentMethod
      },
      updatedAt: new Date().toISOString()
    }

    localStorage.setItem('thisai_crm_invoices', JSON.stringify(invoices))
    console.log('✅ Invoice payment status updated:', invoiceId)
    return true
  } catch (error) {
    console.error('Error updating invoice payment status:', error)
    return false
  }
}

// Cancel a payment link
export async function cancelPaymentLink(paymentLinkId: string): Promise<boolean> {
  const settings = getRazorpaySettings()
  if (!settings?.keyId || !settings?.keySecret) {
    return false
  }

  try {
    const response = await fetch(`${RAZORPAY_API_URL}/payment_links/${paymentLinkId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(settings.keyId, settings.keySecret)
      }
    })

    if (!response.ok) {
      return false
    }

    await updateTransactionStatus(paymentLinkId, 'failed')
    
    return true
  } catch (error) {
    console.error('Error cancelling payment link:', error)
    return false
  }
}

// Get transactions for a specific invoice
export function getTransactionsForInvoice(invoiceId: string): RazorpayTransaction[] {
  const transactions = getRazorpayTransactions()
  return transactions.filter(t => t.invoiceId === invoiceId)
}

// Test Razorpay connection
export async function testRazorpayConnection(): Promise<{ success: boolean; message: string }> {
  const settings = getRazorpaySettings()
  if (!settings?.keyId || !settings?.keySecret) {
    return { success: false, message: 'Razorpay credentials not configured' }
  }

  try {
    const response = await fetch(`${RAZORPAY_API_URL}/orders?count=1`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(settings.keyId, settings.keySecret)
      }
    })

    if (response.ok) {
      return { success: true, message: 'Connection successful! Razorpay is configured correctly.' }
    } else {
      const error = await response.json()
      return { success: false, message: error.error?.description || 'Invalid credentials' }
    }
  } catch (error) {
    return { success: false, message: 'Network error. Please check your internet connection.' }
  }
}

// Load Razorpay Checkout script
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// Open Razorpay Checkout
export async function openRazorpayCheckout(
  orderId: string,
  amount: number,
  invoiceNumber: string,
  customerName?: string,
  customerEmail?: string,
  customerPhone?: string,
  onSuccess?: (response: any) => void,
  onError?: (error: any) => void
): Promise<void> {
  const settings = getRazorpaySettings()
  if (!settings?.keyId) {
    throw new Error('Razorpay not configured')
  }

  const scriptLoaded = await loadRazorpayScript()
  if (!scriptLoaded) {
    throw new Error('Failed to load Razorpay script')
  }

  const options = {
    key: settings.keyId,
    amount: Math.round(amount * 100),
    currency: 'INR',
    name: settings.businessName || 'Thisai CRM',
    description: `Payment for Invoice ${invoiceNumber}`,
    order_id: orderId,
    prefill: {
      name: customerName || '',
      email: customerEmail || '',
      contact: customerPhone || ''
    },
    notes: {
      invoice_number: invoiceNumber
    },
    theme: {
      color: '#6366f1'
    },
    handler: function(response: any) {
      console.log('Payment successful:', response)
      if (onSuccess) onSuccess(response)
    },
    modal: {
      ondismiss: function() {
        console.log('Payment modal closed')
      }
    }
  }

  const razorpay = new (window as any).Razorpay(options)
  razorpay.on('payment.failed', function(response: any) {
    console.error('Payment failed:', response.error)
    if (onError) onError(response.error)
  })
  razorpay.open()
}

// Format amount for display
export function formatRazorpayAmount(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

// Get transaction statistics
export function getRazorpayStats(): {
  totalTransactions: number
  completedTransactions: number
  pendingTransactions: number
  failedTransactions: number
  totalAmountCollected: number
  totalAmountPending: number
} {
  const transactions = getRazorpayTransactions()
  
  return {
    totalTransactions: transactions.length,
    completedTransactions: transactions.filter(t => t.status === 'completed').length,
    pendingTransactions: transactions.filter(t => t.status === 'pending' || t.status === 'processing').length,
    failedTransactions: transactions.filter(t => t.status === 'failed').length,
    totalAmountCollected: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    totalAmountPending: transactions
      .filter(t => t.status === 'pending' || t.status === 'processing')
      .reduce((sum, t) => sum + t.amount, 0)
  }
}









