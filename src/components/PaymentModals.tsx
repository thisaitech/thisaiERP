// Payment Modals Component
// UPI QR code display, card terminal status, and payment confirmation

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'react-qr-code'
import { X, CheckCircle, XCircle, Clock, CreditCard, QrCode, Warning } from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import {
  generateUPILink,
  initiateCardTerminalPayment,
  verifyUPIPayment,
  formatPaymentAmount,
  type UPIPaymentDetails,
  type CardPaymentRequest,
  type CardTerminalConfig,
  type CardPaymentResponse,
  DEFAULT_TERMINAL_CONFIG
} from '../utils/paymentIntegration'

interface UPIPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (transactionId: string) => void
  onCancel: () => void
  paymentDetails: UPIPaymentDetails
}

export function UPIPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  onCancel,
  paymentDetails
}: UPIPaymentModalProps) {
  const [status, setStatus] = useState<'showing' | 'verifying' | 'success' | 'failed'>('showing')
  const [upiLink, setUpiLink] = useState('')

  useEffect(() => {
    if (isOpen && paymentDetails) {
      try {
        console.log('Generating UPI link with details:', paymentDetails)
        const link = generateUPILink(paymentDetails)
        console.log('Generated UPI Link:', link)
        setUpiLink(link)
        setStatus('showing')
      } catch (error) {
        console.error('Error generating UPI link:', error)
        setStatus('failed')
      }
    }
  }, [isOpen, paymentDetails])

  // Return null if not open to prevent rendering issues
  if (!isOpen) return null

  // Safety check
  if (!paymentDetails) {
    console.error('UPI Payment Modal opened without payment details')
    return null
  }

  const handleVerifyPayment = async () => {
    setStatus('verifying')

    try {
      const result = await verifyUPIPayment(paymentDetails.transactionRef || '')

      if (result.success && result.status === 'success') {
        setStatus('success')
        setTimeout(() => {
          onSuccess(result.transactionId || '')
        }, 1500)
      } else {
        setStatus('failed')
      }
    } catch (error) {
      console.error('Payment verification error:', error)
      setStatus('failed')
    }
  }

  const handleCancel = () => {
    setStatus('showing')
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode size={24} weight="duotone" className="text-white" />
            <h3 className="font-bold text-lg text-white">UPI Payment</h3>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'showing' && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                {upiLink ? (
                  <div className="p-4 bg-white border-4 border-gray-200 rounded-2xl shadow-lg">
                    <QRCodeSVG
                      value={upiLink}
                      size={220}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-gray-100 border-4 border-gray-200 rounded-2xl">
                    <div className="w-[220px] h-[220px] flex items-center justify-center text-gray-500">
                      <Clock size={48} weight="duotone" className="animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Details */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-medium">Amount to Pay:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPaymentAmount(paymentDetails.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-medium">Pay to:</span>
                  <span className="text-sm font-semibold text-gray-900">{paymentDetails.merchantName}</span>
                </div>
                {paymentDetails.transactionNote && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">Note:</span>
                    <span className="text-sm text-gray-700">{paymentDetails.transactionNote}</span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">How to pay:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Open any UPI app (PhonePe, Google Pay, Paytm, etc.)</li>
                  <li>Scan the QR code above</li>
                  <li>Verify the amount and complete payment</li>
                  <li>Click "I've Paid" below after payment</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyPayment}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  I've Paid
                </button>
              </div>
            </div>
          )}

          {status === 'verifying' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="animate-spin">
                <Clock size={64} weight="duotone" className="text-blue-500" />
              </div>
              <p className="text-lg font-semibold text-gray-900">Verifying Payment...</p>
              <p className="text-sm text-gray-600">Please wait while we confirm your payment</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <CheckCircle size={64} weight="fill" className="text-green-500" />
              <p className="text-lg font-semibold text-gray-900">Payment Successful!</p>
              <p className="text-sm text-gray-600">Your payment has been confirmed</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <XCircle size={64} weight="fill" className="text-red-500" />
              <p className="text-lg font-semibold text-gray-900">Payment Not Found</p>
              <p className="text-sm text-gray-600 text-center">
                We couldn't verify your payment. Please try again or contact support.
              </p>
              <button
                onClick={() => setStatus('showing')}
                className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface CardPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (transactionId: string) => void
  onCancel: () => void
  paymentRequest: CardPaymentRequest
  terminalConfig?: CardTerminalConfig
}

export function CardPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  onCancel,
  paymentRequest,
  terminalConfig = DEFAULT_TERMINAL_CONFIG
}: CardPaymentModalProps) {
  const [status, setStatus] = useState<'initiating' | 'processing' | 'success' | 'failed' | 'cancelled'>('initiating')
  const [paymentResponse, setPaymentResponse] = useState<CardPaymentResponse | null>(null)

  useEffect(() => {
    if (isOpen && paymentRequest) {
      console.log('Initiating card payment with request:', paymentRequest)
      initiatePayment()
    }
  }, [isOpen])

  // Return null if not open
  if (!isOpen) return null

  // Safety check
  if (!paymentRequest) {
    console.error('Card Payment Modal opened without payment request')
    return null
  }

  const initiatePayment = async () => {
    setStatus('initiating')

    // Small delay to show initiating state
    await new Promise(resolve => setTimeout(resolve, 800))

    setStatus('processing')

    try {
      const result = await initiateCardTerminalPayment(paymentRequest, terminalConfig)
      setPaymentResponse(result)

      if (result.success && result.status === 'success') {
        setStatus('success')
        setTimeout(() => {
          onSuccess(result.transactionId || '')
        }, 2000)
      } else {
        setStatus('failed')
      }
    } catch (error) {
      console.error('Card payment error:', error)
      setStatus('failed')
      setPaymentResponse({
        success: false,
        status: 'failed',
        message: 'Payment processing error',
        timestamp: new Date().toISOString()
      })
    }
  }

  const handleCancel = () => {
    setStatus('cancelled')
    onCancel()
  }

  const handleRetry = () => {
    initiatePayment()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard size={24} weight="duotone" className="text-white" />
            <h3 className="font-bold text-lg text-white">Card Payment</h3>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/80 hover:text-white transition-colors"
            disabled={status === 'processing'}
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {(status === 'initiating' || status === 'processing') && (
            <div className="space-y-6">
              {/* Terminal Status */}
              <div className="py-8 flex flex-col items-center gap-4">
                <div className="animate-pulse">
                  <CreditCard size={64} weight="duotone" className="text-purple-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {status === 'initiating' ? 'Connecting to Terminal...' : 'Processing Payment...'}
                </p>
                <p className="text-sm text-gray-600 text-center">
                  {status === 'initiating'
                    ? 'Please wait while we connect to the payment terminal'
                    : 'Please insert, tap, or swipe your card on the terminal'
                  }
                </p>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-600 font-medium">Amount:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPaymentAmount(paymentRequest.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-medium">Terminal:</span>
                  <span className="text-sm font-semibold text-gray-900 uppercase">
                    {terminalConfig.terminalType}
                  </span>
                </div>
              </div>

              {/* Cancel Button (only during processing) */}
              {status === 'processing' && (
                <button
                  onClick={handleCancel}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel Payment
                </button>
              )}
            </div>
          )}

          {status === 'success' && paymentResponse && (
            <div className="py-8 flex flex-col items-center gap-4">
              <CheckCircle size={64} weight="fill" className="text-green-500" />
              <p className="text-lg font-semibold text-gray-900">Payment Successful!</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 w-full">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700 font-medium">Transaction ID:</span>
                    <span className="text-green-900 font-semibold">{paymentResponse.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700 font-medium">Amount:</span>
                    <span className="text-green-900 font-semibold">{formatPaymentAmount(paymentRequest.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700 font-medium">Status:</span>
                    <span className="text-green-900 font-semibold uppercase">{paymentResponse.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'failed' && paymentResponse && (
            <div className="space-y-6">
              <div className="py-8 flex flex-col items-center gap-4">
                <XCircle size={64} weight="fill" className="text-red-500" />
                <p className="text-lg font-semibold text-gray-900">Payment Failed</p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
                  <p className="text-sm text-red-800 text-center font-medium">
                    {paymentResponse.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRetry}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {status === 'cancelled' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <Warning size={64} weight="fill" className="text-yellow-500" />
              <p className="text-lg font-semibold text-gray-900">Payment Cancelled</p>
              <p className="text-sm text-gray-600">The payment was cancelled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
