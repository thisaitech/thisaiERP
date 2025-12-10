// Payment Integration Utilities
// Handles UPI QR code generation, card terminal integration, and payment status tracking

/**
 * UPI Payment QR Code Generation
 */
export interface UPIPaymentDetails {
  merchantVPA: string // UPI ID (e.g., merchant@upi)
  merchantName: string
  amount: number
  currency?: string // Default: INR
  transactionNote?: string
  transactionRef?: string
}

/**
 * Generate UPI deep link for QR code
 * Format: upi://pay?pa=<VPA>&pn=<Name>&am=<Amount>&cu=<Currency>&tn=<Note>&tr=<Ref>
 */
export function generateUPILink(details: UPIPaymentDetails): string {
  const {
    merchantVPA,
    merchantName,
    amount,
    currency = 'INR',
    transactionNote = 'Payment',
    transactionRef
  } = details

  const params = new URLSearchParams({
    pa: merchantVPA,
    pn: merchantName,
    am: amount.toFixed(2),
    cu: currency,
    tn: transactionNote
  })

  if (transactionRef) {
    params.append('tr', transactionRef)
  }

  return `upi://pay?${params.toString()}`
}

/**
 * Card Terminal Integration
 */
export interface CardTerminalConfig {
  terminalType: 'pinelabs' | 'mswipe' | 'paytm' | 'phonepe' | 'other'
  apiKey?: string
  merchantId?: string
  terminalId?: string
  endpoint?: string
}

export interface CardPaymentRequest {
  amount: number
  currency?: string
  orderId: string
  customerName?: string
  customerPhone?: string
}

export interface CardPaymentResponse {
  success: boolean
  transactionId?: string
  status: 'pending' | 'success' | 'failed' | 'cancelled'
  message: string
  timestamp: string
  rawResponse?: any
}

/**
 * Simulated card terminal payment
 * In production, this would connect to actual terminal SDK/API
 */
export async function processCardPayment(
  request: CardPaymentRequest,
  config: CardTerminalConfig
): Promise<CardPaymentResponse> {
  console.log('🔄 Processing card payment:', request)
  console.log('🔧 Terminal config:', config.terminalType)

  // TODO: Replace with actual terminal SDK integration
  // Example integrations:
  // - Pine Labs: Use their SDK or API
  // - Mswipe: Serial port communication or API
  // - Paytm: Paytm for Business API
  // - PhonePe: PhonePe Switch or API

  // Simulated delay for terminal processing
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Simulated response
  const mockSuccess = Math.random() > 0.1 // 90% success rate for demo

  if (mockSuccess) {
    return {
      success: true,
      transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      status: 'success',
      message: 'Payment successful',
      timestamp: new Date().toISOString()
    }
  } else {
    return {
      success: false,
      status: 'failed',
      message: 'Payment declined by card issuer',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Pine Labs Terminal Integration
 * Documentation: https://www.pinelabs.com/developers
 */
export async function processPineLabsPayment(
  request: CardPaymentRequest,
  config: CardTerminalConfig
): Promise<CardPaymentResponse> {
  // TODO: Implement Pine Labs SDK integration
  // Steps:
  // 1. Initialize Pine Labs SDK with merchant credentials
  // 2. Create transaction request
  // 3. Send to terminal via Bluetooth/Serial
  // 4. Wait for response
  // 5. Return transaction status

  return processCardPayment(request, config)
}

/**
 * Mswipe Terminal Integration
 */
export async function processMswipePayment(
  request: CardPaymentRequest,
  config: CardTerminalConfig
): Promise<CardPaymentResponse> {
  // TODO: Implement Mswipe integration
  // Mswipe typically uses serial port or Bluetooth communication

  return processCardPayment(request, config)
}

/**
 * Paytm Terminal Integration
 * Documentation: https://business.paytm.com/docs
 */
export async function processPaytmPayment(
  request: CardPaymentRequest,
  config: CardTerminalConfig
): Promise<CardPaymentResponse> {
  // TODO: Implement Paytm for Business API
  // API endpoint: https://securegw.paytm.in/

  return processCardPayment(request, config)
}

/**
 * PhonePe Integration
 * Documentation: https://www.phonepe.com/business-solutions/payment-gateway/
 */
export async function processPhonePePayment(
  request: CardPaymentRequest,
  config: CardTerminalConfig
): Promise<CardPaymentResponse> {
  // TODO: Implement PhonePe Switch or Payment Gateway API

  return processCardPayment(request, config)
}

/**
 * Route payment to appropriate terminal based on config
 */
export async function initiateCardTerminalPayment(
  request: CardPaymentRequest,
  config: CardTerminalConfig
): Promise<CardPaymentResponse> {
  switch (config.terminalType) {
    case 'pinelabs':
      return processPineLabsPayment(request, config)
    case 'mswipe':
      return processMswipePayment(request, config)
    case 'paytm':
      return processPaytmPayment(request, config)
    case 'phonepe':
      return processPhonePePayment(request, config)
    default:
      return processCardPayment(request, config)
  }
}

/**
 * Payment Status Tracking
 */
export interface PaymentStatus {
  paymentId: string
  orderId: string
  method: 'cash' | 'card' | 'upi' | 'bank' | 'credit'
  amount: number
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled'
  transactionId?: string
  timestamp: string
  customerName?: string
  customerPhone?: string
}

/**
 * Save payment status to localStorage
 * In production, save to database
 */
export function savePaymentStatus(payment: PaymentStatus): void {
  try {
    const key = `payment_${payment.paymentId}`
    localStorage.setItem(key, JSON.stringify(payment))
    console.log('💾 Payment status saved:', payment.paymentId)
  } catch (error) {
    console.error('Error saving payment status:', error)
  }
}

/**
 * Get payment status from localStorage
 */
export function getPaymentStatus(paymentId: string): PaymentStatus | null {
  try {
    const key = `payment_${paymentId}`
    const stored = localStorage.getItem(key)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error retrieving payment status:', error)
    return null
  }
}

/**
 * Update payment status
 */
export function updatePaymentStatus(
  paymentId: string,
  updates: Partial<PaymentStatus>
): void {
  const existing = getPaymentStatus(paymentId)
  if (!existing) return

  const updated = {
    ...existing,
    ...updates,
    timestamp: new Date().toISOString()
  }

  savePaymentStatus(updated)
}

/**
 * Verify UPI payment status
 * In production, integrate with payment gateway to check actual status
 */
export async function verifyUPIPayment(
  transactionRef: string
): Promise<CardPaymentResponse> {
  console.log('🔍 Verifying UPI payment:', transactionRef)

  // TODO: Integrate with actual UPI payment verification API
  // Examples: Razorpay, PhonePe, Paytm, etc.

  await new Promise(resolve => setTimeout(resolve, 1500))

  // Simulated verification
  return {
    success: true,
    transactionId: transactionRef,
    status: 'success',
    message: 'UPI payment verified',
    timestamp: new Date().toISOString()
  }
}

/**
 * Generate payment reference ID
 */
export function generatePaymentRef(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 6).toUpperCase()
  return `PAY${timestamp}${random}`
}

/**
 * Format amount for display
 */
export function formatPaymentAmount(amount: number): string {
  return `₹${amount.toFixed(2)}`
}

/**
 * Payment method display names
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  bank: 'Bank Transfer',
  credit: 'Credit'
}

/**
 * Default card terminal configuration
 * User should configure this in settings
 */
export const DEFAULT_TERMINAL_CONFIG: CardTerminalConfig = {
  terminalType: 'other',
  merchantId: '',
  terminalId: '',
  apiKey: ''
}
