import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, ArrowLeft, Receipt, WhatsappLogo } from '@phosphor-icons/react'
import { 
  getPaymentLinkStatus, 
  updateTransactionStatus,
  getRazorpayTransactions 
} from '../services/razorpayService'
import { toast } from 'sonner'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading')
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null)

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Get parameters from Razorpay callback
        const razorpayPaymentLinkId = searchParams.get('razorpay_payment_link_id')
        const razorpayPaymentId = searchParams.get('razorpay_payment_id')
        const razorpayPaymentLinkReferenceId = searchParams.get('razorpay_payment_link_reference_id')
        const razorpayPaymentLinkStatus = searchParams.get('razorpay_payment_link_status')
        const razorpaySignature = searchParams.get('razorpay_signature')

        console.log('Payment callback received:', {
          razorpayPaymentLinkId,
          razorpayPaymentId,
          razorpayPaymentLinkStatus
        })

        if (!razorpayPaymentLinkId) {
          // No payment link ID - might be direct visit
          setStatus('pending')
          return
        }

        // Fetch payment link details
        const paymentLink = await getPaymentLinkStatus(razorpayPaymentLinkId)
        
        if (paymentLink) {
          setPaymentDetails(paymentLink)
          
          // Find corresponding transaction
          const transactions = getRazorpayTransactions()
          const transaction = transactions.find(t => t.razorpayPaymentLinkId === razorpayPaymentLinkId)
          
          if (transaction) {
            setInvoiceDetails({
              invoiceId: transaction.invoiceId,
              invoiceNumber: transaction.invoiceNumber,
              customerName: transaction.customerName,
              amount: transaction.amount
            })
          }

          if (paymentLink.status === 'paid' || razorpayPaymentLinkStatus === 'paid') {
            // Update transaction status
            await updateTransactionStatus(
              razorpayPaymentLinkId, 
              'completed',
              razorpayPaymentId || undefined,
              'razorpay'
            )
            setStatus('success')
            toast.success('Payment successful!')
          } else if (paymentLink.status === 'cancelled' || paymentLink.status === 'expired') {
            await updateTransactionStatus(razorpayPaymentLinkId, 'failed')
            setStatus('failed')
          } else {
            setStatus('pending')
          }
        } else {
          setStatus('failed')
        }
      } catch (error) {
        console.error('Error processing payment:', error)
        setStatus('failed')
      }
    }

    processPayment()
  }, [searchParams])

  const formatAmount = (amount: number) => {
    if (!amount) return '₹0'
    // If amount is in paise (from Razorpay), convert to rupees
    const inRupees = amount > 1000 ? amount / 100 : amount
    return `₹${inRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
      >
        {/* Status Header */}
        <div className={`p-8 text-center ${
          status === 'success' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
          status === 'failed' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
          status === 'loading' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
          'bg-gradient-to-br from-amber-500 to-orange-600'
        }`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            {status === 'success' && <CheckCircle size={80} weight="fill" className="mx-auto text-white mb-4" />}
            {status === 'failed' && <XCircle size={80} weight="fill" className="mx-auto text-white mb-4" />}
            {status === 'loading' && (
              <div className="w-20 h-20 mx-auto mb-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {status === 'pending' && <Clock size={80} weight="fill" className="mx-auto text-white mb-4" />}
          </motion.div>
          
          <h1 className="text-2xl font-bold text-white mb-2">
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
            {status === 'loading' && 'Processing Payment...'}
            {status === 'pending' && 'Payment Pending'}
          </h1>
          
          <p className="text-white/80">
            {status === 'success' && 'Thank you for your payment'}
            {status === 'failed' && 'Something went wrong with your payment'}
            {status === 'loading' && 'Please wait while we verify your payment'}
            {status === 'pending' && 'Your payment is being processed'}
          </p>
        </div>

        {/* Payment Details */}
        <div className="p-6 space-y-4">
          {paymentDetails && (
            <>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-2xl font-bold text-primary">
                  {formatAmount(paymentDetails.amount)}
                </span>
              </div>

              {invoiceDetails && (
                <>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Invoice</span>
                    <span className="font-medium">{invoiceDetails.invoiceNumber}</span>
                  </div>
                  
                  {invoiceDetails.customerName && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium">{invoiceDetails.customerName}</span>
                    </div>
                  )}
                </>
              )}

              {paymentDetails.id && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-sm">{paymentDetails.id.slice(0, 16)}...</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="pt-4 space-y-3">
            <button
              onClick={() => navigate('/sales')}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Receipt size={20} />
              View Invoices
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>

            {status === 'success' && invoiceDetails?.customerName && (
              <button
                onClick={() => {
                  const message = encodeURIComponent(
                    `Hi ${invoiceDetails.customerName},\n\nThank you for your payment of ${formatAmount(paymentDetails.amount)} for Invoice ${invoiceDetails.invoiceNumber}.\n\nPayment received successfully! ✅\n\nTransaction ID: ${paymentDetails.id || 'N/A'}`
                  )
                  window.open(`https://wa.me/?text=${message}`, '_blank')
                }}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <WhatsappLogo size={20} weight="fill" />
                Share Receipt
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 text-center text-sm text-muted-foreground">
          Powered by <span className="font-semibold text-indigo-600">Razorpay</span> & <span className="font-semibold">Thisai CRM</span>
        </div>
      </motion.div>
    </div>
  )
}









