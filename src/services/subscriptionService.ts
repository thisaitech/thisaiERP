// Subscription Service - Manages trial, subscriptions, and billing
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, limit } from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import {
  CompanySubscription,
  BillingRecord,
  SubscriptionState,
  SUBSCRIPTION_PRICING
} from '../types'
import { SubscriptionStatus, BillingCycle, PaymentProvider, PlanTypeEnum } from '../types/enums'

// ============================================
// SUBSCRIPTION HELPERS
// ============================================

// Calculate days remaining until a date
const calculateDaysRemaining = (endDateStr: string): number => {
  const endDate = new Date(endDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

// Add days to a date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Add months to a date
const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

// Format date to ISO string (date only)
const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

// ============================================
// SUBSCRIPTION CRUD OPERATIONS
// ============================================

// Get subscription for a company
export const getCompanySubscription = async (companyId: string): Promise<CompanySubscription | null> => {
  if (!db || !companyId) return null

  try {
    const subscriptionsRef = collection(db, COLLECTIONS.SUBSCRIPTIONS)
    const q = query(subscriptionsRef, where('companyId', '==', companyId), limit(1))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    return querySnapshot.docs[0].data() as CompanySubscription
  } catch (error) {
    console.error('Error getting subscription:', error)
    return null
  }
}

// Create a new trial subscription for a company
export const createTrialSubscription = async (companyId: string): Promise<CompanySubscription> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  const now = new Date()
  const trialEndDate = addDays(now, SUBSCRIPTION_PRICING.trialDays)
  const subscriptionId = `sub_${companyId}_${Date.now()}`

  const subscription: CompanySubscription = {
    id: subscriptionId,
    companyId,
    planType: PlanTypeEnum.SILVER,
    status: SubscriptionStatus.TRIALING,

    // Trial info
    trialStartDate: now.toISOString(),
    trialEndDate: trialEndDate.toISOString(),
    trialDays: SUBSCRIPTION_PRICING.trialDays,

    // Payment
    paymentProvider: PaymentProvider.RAZORPAY,

    // Pricing
    monthlyPrice: SUBSCRIPTION_PRICING.monthly,
    yearlyPrice: SUBSCRIPTION_PRICING.yearly,

    // Settings
    autoRenew: true,
    gracePeriodDays: SUBSCRIPTION_PRICING.gracePeriodDays,

    // Metadata
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  const subscriptionRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId)
  await setDoc(subscriptionRef, subscription)

  return subscription
}

// Get or create subscription (ensures every company has a subscription)
export const getOrCreateSubscription = async (companyId: string): Promise<CompanySubscription> => {
  const existing = await getCompanySubscription(companyId)
  if (existing) {
    return existing
  }
  return createTrialSubscription(companyId)
}

// Update subscription status based on dates
export const updateSubscriptionStatus = async (subscription: CompanySubscription): Promise<CompanySubscription> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  const now = new Date()
  let newStatus = subscription.status
  let endDate: Date

  // Determine the end date based on subscription status
  if (subscription.status === SubscriptionStatus.TRIALING) {
    endDate = new Date(subscription.trialEndDate)
  } else if (subscription.subscriptionEndDate) {
    endDate = new Date(subscription.subscriptionEndDate)
  } else {
    endDate = new Date(subscription.trialEndDate)
  }

  // Check if trial/subscription has expired
  if (now > endDate) {
    const gracePeriodEnd = addDays(endDate, subscription.gracePeriodDays)

    if (now <= gracePeriodEnd) {
      newStatus = SubscriptionStatus.GRACE_PERIOD
    } else {
      newStatus = SubscriptionStatus.EXPIRED
    }
  }

  // Only update if status changed
  if (newStatus !== subscription.status) {
    const subscriptionRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, subscription.id)
    await updateDoc(subscriptionRef, {
      status: newStatus,
      updatedAt: now.toISOString()
    })
    subscription.status = newStatus
    subscription.updatedAt = now.toISOString()
  }

  return subscription
}

// ============================================
// SUBSCRIPTION STATE HELPERS
// ============================================

// Get computed subscription state for UI
export const getSubscriptionState = (subscription: CompanySubscription | null): SubscriptionState => {
  if (!subscription) {
    return {
      isActive: false,
      isTrialing: false,
      isExpired: true,
      isGracePeriod: false,
      daysRemaining: 0,
      canEdit: false,
      showExpiryWarning: true,
      subscription: null
    }
  }

  const status = subscription.status
  const isTrialing = status === SubscriptionStatus.TRIALING
  const isActive = status === SubscriptionStatus.ACTIVE
  const isGracePeriod = status === SubscriptionStatus.GRACE_PERIOD
  const isExpired = status === SubscriptionStatus.EXPIRED || status === SubscriptionStatus.CANCELLED

  // Calculate days remaining
  let daysRemaining = 0
  if (isTrialing) {
    daysRemaining = calculateDaysRemaining(subscription.trialEndDate)
  } else if (subscription.subscriptionEndDate) {
    daysRemaining = calculateDaysRemaining(subscription.subscriptionEndDate)
  }

  // Can edit: only if not expired
  const canEdit = !isExpired

  // Show warning when less than 5 days remaining
  const showExpiryWarning = daysRemaining <= 5 && daysRemaining > 0

  return {
    isActive,
    isTrialing,
    isExpired,
    isGracePeriod,
    daysRemaining,
    canEdit,
    showExpiryWarning,
    subscription
  }
}

// ============================================
// PAYMENT & UPGRADE FUNCTIONS
// ============================================

// Activate subscription after payment
export const activateSubscription = async (
  subscriptionId: string,
  billingCycle: BillingCycle,
  razorpayPaymentId?: string,
  razorpayOrderId?: string
): Promise<CompanySubscription> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  const subscriptionRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId)
  const subscriptionDoc = await getDoc(subscriptionRef)

  if (!subscriptionDoc.exists()) {
    throw new Error('Subscription not found')
  }

  const subscription = subscriptionDoc.data() as CompanySubscription
  const now = new Date()

  // Calculate subscription period
  const subscriptionEndDate = billingCycle === BillingCycle.MONTHLY
    ? addMonths(now, 1)
    : addMonths(now, 12)

  const amount = billingCycle === BillingCycle.MONTHLY
    ? subscription.monthlyPrice
    : subscription.yearlyPrice

  // Update subscription
  const updatedData = {
    status: SubscriptionStatus.ACTIVE,
    billingCycle,
    subscriptionStartDate: now.toISOString(),
    subscriptionEndDate: subscriptionEndDate.toISOString(),
    nextBillingDate: subscriptionEndDate.toISOString(),
    lastPaymentDate: now.toISOString(),
    lastPaymentAmount: amount,
    updatedAt: now.toISOString()
  }

  await updateDoc(subscriptionRef, updatedData)

  // Create billing record
  await createBillingRecord({
    companyId: subscription.companyId,
    subscriptionId: subscription.id,
    amount,
    currency: 'INR',
    billingDate: now.toISOString(),
    dueDate: now.toISOString(),
    paidDate: now.toISOString(),
    status: 'paid',
    razorpayPaymentId,
    razorpayOrderId,
    paymentMethod: 'razorpay'
  })

  return { ...subscription, ...updatedData } as CompanySubscription
}

// Extend subscription (for renewals)
export const extendSubscription = async (
  subscriptionId: string,
  billingCycle: BillingCycle
): Promise<CompanySubscription> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  const subscriptionRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId)
  const subscriptionDoc = await getDoc(subscriptionRef)

  if (!subscriptionDoc.exists()) {
    throw new Error('Subscription not found')
  }

  const subscription = subscriptionDoc.data() as CompanySubscription
  const now = new Date()

  // Calculate new end date (from current end date or now, whichever is later)
  const currentEndDate = subscription.subscriptionEndDate
    ? new Date(subscription.subscriptionEndDate)
    : now
  const startDate = currentEndDate > now ? currentEndDate : now

  const newEndDate = billingCycle === BillingCycle.MONTHLY
    ? addMonths(startDate, 1)
    : addMonths(startDate, 12)

  const updatedData = {
    status: SubscriptionStatus.ACTIVE,
    subscriptionEndDate: newEndDate.toISOString(),
    nextBillingDate: newEndDate.toISOString(),
    updatedAt: now.toISOString()
  }

  await updateDoc(subscriptionRef, updatedData)

  return { ...subscription, ...updatedData } as CompanySubscription
}

// Cancel subscription
export const cancelSubscription = async (
  subscriptionId: string,
  reason?: string
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  const subscriptionRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId)
  const now = new Date()

  await updateDoc(subscriptionRef, {
    status: SubscriptionStatus.CANCELLED,
    autoRenew: false,
    cancelledAt: now.toISOString(),
    cancelReason: reason || 'User cancelled',
    updatedAt: now.toISOString()
  })
}

// ============================================
// BILLING RECORDS
// ============================================

// Create a billing record
export const createBillingRecord = async (data: Omit<BillingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillingRecord> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  const now = new Date()
  const billingId = `bill_${data.companyId}_${Date.now()}`

  const billingRecord: BillingRecord = {
    ...data,
    id: billingId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }

  const billingRef = doc(db, COLLECTIONS.BILLING_RECORDS, billingId)
  await setDoc(billingRef, billingRecord)

  return billingRecord
}

// Get billing history for a company
export const getBillingHistory = async (companyId: string, limitCount: number = 10): Promise<BillingRecord[]> => {
  if (!db || !companyId) return []

  try {
    const billingRef = collection(db, COLLECTIONS.BILLING_RECORDS)
    const q = query(
      billingRef,
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(doc => doc.data() as BillingRecord)
  } catch (error) {
    console.error('Error getting billing history:', error)
    return []
  }
}

// ============================================
// TRIAL HELPERS
// ============================================

// Check if trial has expired
export const isTrialExpired = (subscription: CompanySubscription): boolean => {
  if (subscription.status !== SubscriptionStatus.TRIALING) {
    return false
  }
  const trialEnd = new Date(subscription.trialEndDate)
  return new Date() > trialEnd
}

// Get trial days remaining
export const getTrialDaysRemaining = (subscription: CompanySubscription): number => {
  if (subscription.status !== SubscriptionStatus.TRIALING) {
    return 0
  }
  return calculateDaysRemaining(subscription.trialEndDate)
}

// Extend trial (admin function)
export const extendTrial = async (subscriptionId: string, additionalDays: number): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  const subscriptionRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId)
  const subscriptionDoc = await getDoc(subscriptionRef)

  if (!subscriptionDoc.exists()) {
    throw new Error('Subscription not found')
  }

  const subscription = subscriptionDoc.data() as CompanySubscription
  const currentEndDate = new Date(subscription.trialEndDate)
  const newEndDate = addDays(currentEndDate, additionalDays)

  await updateDoc(subscriptionRef, {
    trialEndDate: newEndDate.toISOString(),
    trialDays: subscription.trialDays + additionalDays,
    updatedAt: new Date().toISOString()
  })
}

// ============================================
// RAZORPAY INTEGRATION HELPERS
// ============================================

// Generate Razorpay order for subscription payment
export interface RazorpayOrderData {
  amount: number  // in paise
  currency: string
  receipt: string
  notes: {
    companyId: string
    subscriptionId: string
    billingCycle: BillingCycle
  }
}

export const generateSubscriptionOrderData = (
  subscription: CompanySubscription,
  billingCycle: BillingCycle
): RazorpayOrderData => {
  const amount = billingCycle === BillingCycle.MONTHLY
    ? subscription.monthlyPrice
    : subscription.yearlyPrice

  return {
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${subscription.id}_${Date.now()}`,
    notes: {
      companyId: subscription.companyId,
      subscriptionId: subscription.id,
      billingCycle
    }
  }
}

// Verify Razorpay payment signature (should be done on backend for security)
// This is a placeholder - actual verification should happen on server
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  // In production, this should be verified on the server using:
  // const generatedSignature = crypto.createHmac('sha256', razorpayKeySecret)
  //   .update(orderId + '|' + paymentId)
  //   .digest('hex')
  // return generatedSignature === signature

  console.warn('Payment signature verification should be done on server')
  return true // Placeholder - always returns true in client
}
