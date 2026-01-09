// SubscriptionSettings - Billing management and subscription upgrade
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Crown,
  Clock,
  CheckCircle,
  Warning,
  CreditCard,
  Receipt,
  Shield,
  Sparkle,
  X,
  CaretRight,
  Check,
  Info,
  WhatsappLogo,
  QrCode,
  Copy,
  CheckSquare
} from '@phosphor-icons/react'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import {
  activateSubscription,
  cancelSubscription,
  getBillingHistory,
  generateSubscriptionOrderData
} from '../services/subscriptionService'
import type { BillingRecord } from '../types'
import { BillingCycle } from '../types/enums'
import { SUBSCRIPTION_PRICING } from '../types'

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: any
  }
}

interface SubscriptionSettingsProps {
  onBack?: () => void  // Reserved for future use
}

// UPI/GPay Configuration - Update these with your actual details
const UPI_CONFIG = {
  upiId: 'your-business@upi', // Replace with your actual UPI ID
  merchantName: 'Anna ERP',
  whatsappNumber: '919876543210', // Replace with your WhatsApp number (with country code, no +)
}

const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({ onBack: _onBack }) => {
  const { subscription, subscriptionState, refreshSubscription, userData } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<BillingCycle>(BillingCycle.YEARLY)
  const [isProcessing, setIsProcessing] = useState(false)
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([])
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showGPaySection, setShowGPaySection] = useState(false)
  const [upiCopied, setUpiCopied] = useState(false)

  // Load billing history
  useEffect(() => {
    const loadBillingHistory = async () => {
      if (userData?.companyId) {
        const history = await getBillingHistory(userData.companyId, 10)
        setBillingHistory(history)
      }
    }
    loadBillingHistory()
  }, [userData?.companyId])

  // Calculate savings
  const monthlyCost = SUBSCRIPTION_PRICING.monthly
  const yearlyCost = SUBSCRIPTION_PRICING.yearly
  const yearlySavings = (monthlyCost * 12) - yearlyCost

  // Generate UPI payment link for QR code
  const getUpiPaymentLink = () => {
    const amount = selectedPlan === BillingCycle.MONTHLY ? monthlyCost : yearlyCost
    const planName = selectedPlan === BillingCycle.MONTHLY ? 'Monthly' : 'Yearly'
    const transactionNote = `Anna ERP ${planName} Subscription - ${userData?.companyName || 'Company'}`

    // UPI deep link format
    return `upi://pay?pa=${UPI_CONFIG.upiId}&pn=${encodeURIComponent(UPI_CONFIG.merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`
  }

  // Generate Google Chart API URL for QR code
  const getQrCodeUrl = () => {
    const upiLink = getUpiPaymentLink()
    // Using Google Charts API for QR generation (free and reliable)
    return `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(upiLink)}&choe=UTF-8`
  }

  // Copy UPI ID to clipboard
  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(UPI_CONFIG.upiId)
      setUpiCopied(true)
      toast.success('UPI ID copied to clipboard!')
      setTimeout(() => setUpiCopied(false), 3000)
    } catch {
      toast.error('Failed to copy UPI ID')
    }
  }

  // Open WhatsApp with pre-filled message
  const openWhatsAppForConfirmation = () => {
    const amount = selectedPlan === BillingCycle.MONTHLY ? monthlyCost : yearlyCost
    const planName = selectedPlan === BillingCycle.MONTHLY ? 'Monthly' : 'Yearly'
    const companyName = userData?.companyName || 'My Company'
    const companyId = userData?.companyId || 'N/A'
    const userEmail = userData?.email || 'N/A'

    const message = `Hi! I just paid for Anna ERP subscription.

*Payment Details:*
- Plan: ${planName} (₹${amount})
- Company: ${companyName}
- Company ID: ${companyId}
- Email: ${userEmail}

Please activate my subscription. I'm attaching the payment screenshot below.`

    const whatsappUrl = `https://wa.me/${UPI_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  // Load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  // Handle payment
  const handlePayment = async () => {
    if (!subscription || !userData) {
      toast.error('Please log in to continue')
      return
    }

    setIsProcessing(true)

    try {
      // Load Razorpay
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Failed to load payment gateway')
        setIsProcessing(false)
        return
      }

      // Generate order data
      const orderData = generateSubscriptionOrderData(subscription, selectedPlan)

      // Get Razorpay key from settings or environment
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || localStorage.getItem('razorpay_key_id')

      if (!razorpayKey) {
        toast.error('Payment gateway not configured. Please contact support.')
        setIsProcessing(false)
        return
      }

      // Configure Razorpay options
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Anna ERP',
        description: `${selectedPlan === BillingCycle.MONTHLY ? 'Monthly' : 'Yearly'} Subscription`,
        image: '/logo.png',
        prefill: {
          name: userData.displayName || '',
          email: userData.email || '',
          contact: ''
        },
        notes: orderData.notes,
        theme: {
          color: '#6366f1'
        },
        handler: async (response: any) => {
          try {
            // Activate subscription after successful payment
            await activateSubscription(
              subscription.id,
              selectedPlan,
              response.razorpay_payment_id,
              response.razorpay_order_id
            )

            // Refresh subscription state
            await refreshSubscription()

            toast.success('Payment successful! Your subscription is now active.')

            // Reload billing history
            const history = await getBillingHistory(userData.companyId!, 10)
            setBillingHistory(history)
          } catch (error: any) {
            console.error('Error activating subscription:', error)
            toast.error('Payment received but activation failed. Please contact support.')
          }
          setIsProcessing(false)
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
          }
        }
      }

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Payment failed')
      setIsProcessing(false)
    }
  }

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!subscription) return

    try {
      await cancelSubscription(subscription.id, cancelReason)
      await refreshSubscription()
      setShowCancelModal(false)
      toast.success('Subscription cancelled. You can still use the service until the end of your billing period.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel subscription')
    }
  }

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <div className={cn(
        "rounded-xl p-6 border",
        subscriptionState.isExpired
          ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-200"
          : subscriptionState.isTrialing
          ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
          : subscriptionState.isActive
          ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
          : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200"
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-xl",
            subscriptionState.isExpired ? "bg-red-100" :
            subscriptionState.isTrialing ? "bg-blue-100" :
            subscriptionState.isActive ? "bg-green-100" : "bg-slate-100"
          )}>
            {subscriptionState.isExpired ? (
              <Warning size={28} weight="duotone" className="text-red-600" />
            ) : subscriptionState.isTrialing ? (
              <Clock size={28} weight="duotone" className="text-blue-600" />
            ) : subscriptionState.isActive ? (
              <Crown size={28} weight="duotone" className="text-green-600" />
            ) : (
              <Crown size={28} weight="duotone" className="text-slate-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">
                {subscriptionState.isExpired
                  ? "Subscription Expired"
                  : subscriptionState.isTrialing
                  ? "Free Trial"
                  : subscriptionState.isActive
                  ? "Pro Plan"
                  : "No Active Plan"
                }
              </h3>
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                subscriptionState.isExpired ? "bg-red-200 text-red-800" :
                subscriptionState.isTrialing ? "bg-blue-200 text-blue-800" :
                subscriptionState.isActive ? "bg-green-200 text-green-800" : "bg-slate-200 text-slate-800"
              )}>
                {subscriptionState.isExpired ? "Expired" :
                 subscriptionState.isTrialing ? "Trial" :
                 subscriptionState.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {subscriptionState.isTrialing && (
              <p className="text-blue-700">
                {subscriptionState.daysRemaining} days remaining in your free trial.
                Trial ends on {formatDate(subscription?.trialEndDate)}.
              </p>
            )}

            {subscriptionState.isActive && subscription?.subscriptionEndDate && (
              <p className="text-green-700">
                Your subscription renews on {formatDate(subscription.subscriptionEndDate)}.
                {subscription.billingCycle === BillingCycle.MONTHLY ? ' (Monthly)' : ' (Yearly)'}
              </p>
            )}

            {subscriptionState.isExpired && (
              <p className="text-red-700">
                Your access is view-only. Upgrade to restore full access.
              </p>
            )}

            {/* Progress bar */}
            {(subscriptionState.isTrialing || subscriptionState.isActive) && subscriptionState.daysRemaining > 0 && (
              <div className="mt-3 max-w-md">
                <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      subscriptionState.daysRemaining <= 3 ? "bg-red-500" :
                      subscriptionState.isTrialing ? "bg-blue-500" : "bg-green-500"
                    )}
                    style={{
                      width: `${Math.max(5, (subscriptionState.daysRemaining / (subscriptionState.isTrialing ? 7 : 30)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      {(!subscriptionState.isActive || subscriptionState.isTrialing) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkle size={20} className="text-amber-500" weight="fill" />
            Choose Your Plan
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPlan(BillingCycle.MONTHLY)}
              className={cn(
                "relative p-5 rounded-xl border-2 cursor-pointer transition-all",
                selectedPlan === BillingCycle.MONTHLY
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              {selectedPlan === BillingCycle.MONTHLY && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check size={14} weight="bold" className="text-white" />
                </div>
              )}
              <h4 className="font-semibold text-lg">Monthly</h4>
              <div className="mt-2">
                <span className="text-3xl font-bold">{formatCurrency(monthlyCost)}</span>
                <span className="text-slate-500">/month</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Billed monthly</p>
            </motion.div>

            {/* Yearly Plan */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPlan(BillingCycle.YEARLY)}
              className={cn(
                "relative p-5 rounded-xl border-2 cursor-pointer transition-all",
                selectedPlan === BillingCycle.YEARLY
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="absolute -top-3 left-4 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                Save {formatCurrency(yearlySavings)}
              </div>
              {selectedPlan === BillingCycle.YEARLY && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check size={14} weight="bold" className="text-white" />
                </div>
              )}
              <h4 className="font-semibold text-lg">Yearly</h4>
              <div className="mt-2">
                <span className="text-3xl font-bold">{formatCurrency(yearlyCost)}</span>
                <span className="text-slate-500">/year</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {formatCurrency(Math.round(yearlyCost / 12))}/month, billed annually
              </p>
            </motion.div>
          </div>

          {/* Features list */}
          <div className="bg-slate-50 rounded-xl p-5 mt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Shield size={18} className="text-indigo-500" />
              Pro Plan Features
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "Unlimited invoices & quotations",
                "Advanced reports & analytics",
                "WhatsApp integration",
                "GST reports & compliance",
                "Multi-user access",
                "Priority email support",
                "Data export (Excel, PDF, Tally)",
                "Cloud backup & sync"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle size={16} className="text-green-500" weight="fill" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Payment button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard size={20} weight="fill" />
                Pay {formatCurrency(selectedPlan === BillingCycle.MONTHLY ? monthlyCost : yearlyCost)} - {selectedPlan === BillingCycle.MONTHLY ? 'Monthly' : 'Yearly'}
              </>
            )}
          </motion.button>

          <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1">
            <Shield size={14} />
            Secure payment via Razorpay. Cancel anytime.
          </p>

          {/* Divider with OR */}
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* GPay/UPI Payment Option */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowGPaySection(!showGPaySection)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <QrCode size={24} className="text-green-600" weight="duotone" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-800">Pay via GPay / UPI</p>
                  <p className="text-xs text-slate-500">Scan QR code with any UPI app</p>
                </div>
              </div>
              <CaretRight
                size={20}
                className={cn(
                  "text-slate-400 transition-transform",
                  showGPaySection && "rotate-90"
                )}
              />
            </button>

            {/* Expandable GPay Section */}
            {showGPaySection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-5 bg-white border-t border-slate-200"
              >
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* QR Code */}
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                      <img
                        src={getQrCodeUrl()}
                        alt="UPI QR Code"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <p className="text-sm text-slate-500 mt-2 text-center">
                      Scan with GPay, PhonePe, Paytm, etc.
                    </p>
                  </div>

                  {/* Payment Details */}
                  <div className="flex-1 space-y-4">
                    {/* Amount */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-700 mb-1">Amount to pay</p>
                      <p className="text-2xl font-bold text-green-800">
                        {formatCurrency(selectedPlan === BillingCycle.MONTHLY ? monthlyCost : yearlyCost)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {selectedPlan === BillingCycle.MONTHLY ? 'Monthly Plan' : 'Yearly Plan (Best Value!)'}
                      </p>
                    </div>

                    {/* UPI ID with Copy */}
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 font-medium">Or pay directly to UPI ID:</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 px-4 py-3 rounded-lg font-mono text-sm text-slate-800">
                          {UPI_CONFIG.upiId}
                        </div>
                        <button
                          onClick={copyUpiId}
                          className={cn(
                            "px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center gap-2",
                            upiCopied
                              ? "bg-green-500 text-white"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          )}
                        >
                          {upiCopied ? (
                            <>
                              <CheckSquare size={18} weight="fill" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={18} />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Important Note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        After payment, click the WhatsApp button below and send your payment screenshot for quick activation.
                      </p>
                    </div>

                    {/* WhatsApp Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openWhatsAppForConfirmation}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold shadow-lg transition-all"
                    >
                      <WhatsappLogo size={24} weight="fill" />
                      Paid? Send Screenshot to Activate
                    </motion.button>
                    <p className="text-center text-xs text-slate-500">
                      Activation within 1 hour during business hours
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Receipt size={20} className="text-slate-500" />
          Billing History
        </h3>

        {billingHistory.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl">
            <Receipt size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No billing history yet</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{formatDate(record.billingDate)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(record.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        record.status === 'paid' ? "bg-green-100 text-green-700" :
                        record.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                        record.status === 'failed' ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {record.invoiceUrl ? (
                        <a
                          href={record.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline text-sm"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Subscription (only for active subscriptions) */}
      {subscriptionState.isActive && !subscriptionState.isTrialing && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Warning size={20} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-800">Cancel Subscription</h4>
              <p className="text-sm text-red-700 mt-1">
                You can cancel your subscription anytime. You'll continue to have access until the end of your billing period.
              </p>
              <button
                onClick={() => setShowCancelModal(true)}
                className="mt-3 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cancel Subscription</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-slate-600 mb-4">
              Are you sure you want to cancel? You'll lose access to Pro features after your current billing period ends.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please tell us why you're cancelling (optional)"
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-medium hover:bg-slate-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
              >
                Confirm Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionSettings
